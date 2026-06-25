import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Crea las cuentas de acceso (auth.users) para los empleados que aún no las tengan.
// Usa el service_role key (solo servidor) para la Admin API de Supabase.
// Protegido: solo un administrador autenticado puede invocarlo.
export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return NextResponse.json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.' }, { status: 500 });
  }

  // 1. Validar el token de quien llama
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const clienteUsuario = createClient(url, anonKey);
  const { data: { user }, error: userErr } = await clienteUsuario.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

  // 2. Cliente con privilegios de administrador (omite RLS)
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 3. Verificar que el usuario sea administrador (lookup vía service_role para no chocar con RLS)
  const { data: jefe, error: jefeErr } = await admin
    .from('jefes').select('equipo, gerencia').ilike('correo', user.email).maybeSingle();
  const esAdmin = jefe && (
    (jefe.equipo || '').toLowerCase() === 'administración' ||
    (jefe.gerencia || '').toLowerCase() === 'general'
  );
  if (!esAdmin) {
    return NextResponse.json({
      error: 'Requiere permisos de administrador.',
      debug: { email: user.email, jefeEncontrado: jefe || null, errorConsulta: jefeErr?.message || null },
    }, { status: 403 });
  }

  // 4. Empleados de negocio
  const { data: empleados, error: empErr } = await admin.from('empleados').select('cedula, nombre');
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });

  // 5. Usuarios de auth ya existentes (paginado)
  const existentes = new Set();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    data.users.forEach(u => existentes.add((u.email || '').toLowerCase()));
    if (data.users.length < 1000) break;
  }

  // 6. Crear las cuentas faltantes
  const resultado = { creados: [], existentes: [], errores: [] };
  for (const emp of empleados) {
    const email = `${emp.cedula}@konecta.local`;
    if (existentes.has(email.toLowerCase())) { resultado.existentes.push(emp.cedula); continue; }

    const { error } = await admin.auth.admin.createUser({
      email,
      password: String(emp.cedula),
      email_confirm: true, // queda confirmado para poder iniciar sesión de inmediato
      user_metadata: { nombre: emp.nombre, rol: 'empleado' },
    });
    if (error) resultado.errores.push({ cedula: emp.cedula, error: error.message });
    else resultado.creados.push(emp.cedula);
  }

  return NextResponse.json(resultado);
}
