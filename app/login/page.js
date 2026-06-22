"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginUnicoPage() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState(''); // Puede ser Cédula o Correo
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    setCargando(true);

    // 1. Normalizar las credenciales según lo ingresado
    let emailFinal = identificador;
    
    // Si el usuario ingresó solo números, asumimos que es un empleado usando su cédula
    const esCedula = /^\d+$/.test(identificador);
    if (esCedula) {
      emailFinal = `${identificador}@konecta.local`;
    }

    // 2. Autenticar en Supabase
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: emailFinal,
      password: password,
    });

    if (authError) {
      setMensaje({ texto: 'Credenciales incorrectas. Verifica los datos.', tipo: 'error' });
      setCargando(false);
      return;
    }

    // 3. ENRUTAMIENTO INTELIGENTE SEGÚN EL ROL
    if (esCedula) {
      // Validar primero si el empleado está activo en el negocio
      const { data: emp } = await supabase.from('empleados').select('estado').eq('cedula', identificador).single();
      if (!emp || emp.estado !== 'activo') {
        await supabase.auth.signOut();
        setMensaje({ texto: 'Acceso denegado. El empleado se encuentra inactivo.', tipo: 'error' });
        setCargando(false);
        return;
      }
      
      // Es empleado activo -> Va al formulario de reporte (Ruta raíz o una específica)
      setMensaje({ texto: '¡Ingreso exitoso colaborador! Redirigiendo...', tipo: 'exito' });
      setTimeout(() => router.push('/'), 1500);

    } else {
      // Si ingresó con correo, verificamos en la tabla de jefes su rol exacto
      const { data: jefeData } = await supabase.from('jefes').select('*').eq('correo', identificador).single();

      if (!jefeData) {
        await supabase.auth.signOut();
        setMensaje({ texto: 'Usuario no registrado en la base de datos corporativa.', tipo: 'error' });
        setCargando(false);
        return;
      }

      // Si el equipo o gerencia dice Administración, es el SuperAdmin
      if (jefeData.equipo.toLowerCase() === 'administración' || jefeData.gerencia.toLowerCase() === 'general') {
        setMensaje({ texto: '¡Bienvenido Administrador! Redirigiendo...', tipo: 'exito' });
        setTimeout(() => router.push('/admin'), 1500);
      } else {
        // Es un jefe aprobador estándar
        setMensaje({ texto: '¡Bienvenido Líder! Redirigiendo al panel...', tipo: 'exito' });
        setTimeout(() => router.push('/panel-jefe'), 1500);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-gray-800">
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 w-full max-w-md">
        
        <div className="text-center mb-6">
          <span className="text-3xl font-black tracking-tight text-blue-950">konecta</span>
          <h1 className="text-xl font-bold text-gray-700 mt-2">Portal Único de Accesos</h1>
          <p className="text-xs text-gray-400 mt-1">Empleados: Ingresen Cédula en ambos campos.<br/>Jefes: Ingresen correo corporativo.</p>
        </div>

        {mensaje.texto && (
          <div className={`p-3 rounded mb-4 text-sm font-medium border ${
            mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}>{mensaje.texto}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600">Usuario (Cédula o Correo)</label>
            <input 
              type="text" 
              value={identificador} 
              onChange={(e) => setIdentificador(e.target.value)} 
              required 
              className="mt-1 block w-full border border-gray-300 rounded-md p-2.5 bg-gray-50 text-black text-sm" 
              placeholder="Ej: 10203040 o usuario@konecta.com" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-600">Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="mt-1 block w-full border border-gray-300 rounded-md p-2.5 bg-gray-50 text-black text-sm" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            className={`w-full bg-blue-950 text-white p-2.5 rounded-md font-bold transition shadow ${cargando ? 'opacity-50' : 'hover:bg-blue-900'}`}
          >
            {cargando ? 'Validando perfil...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
