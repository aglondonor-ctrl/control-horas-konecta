"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Formularios from './Formularios'; // Importamos el componente limpio

export default function AdminPanelPage() {
  const router = useRouter();
  const [pestana, setPestana] = useState('empleados');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [empleados, setEmpleados] = useState([]);
  const [jefes, setJefes] = useState([]);
  const [festivos, setFestivos] = useState([]);

  const [empForm, setEmpForm] = useState({ cedula: '', nombre: '', correo: '', equipo: '', telefono: '', cargo: '', estado: 'activo', editando: false });
  const [jefeForm, setJefeForm] = useState({ cedula: '', nombre: '', correo: '', equipo: '', gerencia: '', editando: false });
  const [festivoForm, setFestivoForm] = useState({ id: null, fecha: '', descripcion: '', editando: false });

  useEffect(() => {
    // Guard: sin sesión activa el cliente usa la anon key y RLS bloquea las operaciones.
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      cargarTodosLosDatos();
    };
    verificarSesion();
  }, [router]);

  const cargarTodosLosDatos = async () => {
    const { data: emp } = await supabase.from('empleados').select('*').order('nombre');
    const { data: jf } = await supabase.from('jefes').select('*').order('nombre');
    const { data: fest } = await supabase.from('festivos').select('*').order('fecha');
    setEmpleados(emp || []);
    setJefes(jf || []);
    setFestivos(fest || []);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const mostrarAlerta = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

    const guardarEmpleado = async (e) => {
    e.preventDefault();
    if (empForm.editando) {
      await supabase.from('empleados').update({ nombre: empForm.nombre, correoelectronico: empForm.correo, equipo: empForm.equipo, telefono: empForm.telefono, cargo: empForm.cargo, estado: empForm.estado }).eq('cedula', empForm.cedula);
      mostrarAlerta('Empleado actualizado', 'exito');
    } else {
      // 1. Validar si ya existe en la tabla de negocio
      const { error: insertError } = await supabase.from('empleados').insert([{ cedula: empForm.cedula, nombre: empForm.nombre, correoelectronico: empForm.correo, equipo: empForm.equipo, telefono: empForm.telefono, cargo: empForm.cargo, estado: empForm.estado }]);
      if (insertError) {
        console.error('Error al insertar empleado:', insertError);
        if (insertError.code === '23505') return mostrarAlerta('La cédula ya existe', 'error');
        return mostrarAlerta(`Error: ${insertError.message}`, 'error');
      }

      // 2. Crear el usuario de acceso automático (Correo ficticio: cedula@konecta.local)
      // Guardamos la sesión del admin: signUp inicia sesión con el nuevo usuario y
      // reemplazaría la sesión actual. La restauramos justo después.
      const { data: { session: adminSession } } = await supabase.auth.getSession();

      await supabase.auth.signUp({
        email: `${empForm.cedula}@konecta.local`,
        password: empForm.cedula, // La contraseña por defecto es su misma cédula
        options: { data: { nombre: empForm.nombre, rol: 'empleado' } }
      });

      // Restauramos la sesión del admin para no perder el acceso
      if (adminSession) await supabase.auth.setSession(adminSession);

      mostrarAlerta('Empleado guardado y credenciales creadas', 'exito');
    }
    setEmpForm({ cedula: '', nombre: '', correo: '', equipo: '', telefono: '', cargo: '', estado: 'activo', editando: false });
    cargarTodosLosDatos();
  };


  const guardarJefe = async (e) => {
    e.preventDefault();
    const datos = { nombre: jefeForm.nombre, correo: jefeForm.correo, equipo: jefeForm.equipo, gerencia: jefeForm.gerencia };
    if (jefeForm.editando) {
      await supabase.from('jefes').update(datos).eq('cedula', jefeForm.cedula);
      mostrarAlerta('Jefe actualizado', 'exito');
    } else {
      const { error } = await supabase.from('jefes').insert([{ cedula: jefeForm.cedula, ...datos }]);
      if (error) {
        console.error('Error al insertar jefe:', error);
        if (error.code === '23505') return mostrarAlerta('La cédula o correo ya existen', 'error');
        return mostrarAlerta(`Error: ${error.message}`, 'error');
      }
      mostrarAlerta('Jefe guardado con éxito', 'exito');
    }
    setJefeForm({ cedula: '', nombre: '', correo: '', equipo: '', gerencia: '', editando: false });
    cargarTodosLosDatos();
  };

  const guardarFestivo = async (e) => {
    e.preventDefault();
    if (festivoForm.editando) {
      await supabase.from('festivos').update({ fecha: festivoForm.fecha, descripcion: festivoForm.descripcion }).eq('id', festivoForm.id);
      mostrarAlerta('Día festivo modificado', 'exito');
    } else {
      const { error } = await supabase.from('festivos').insert([{ fecha: festivoForm.fecha, descripcion: festivoForm.descripcion }]);
      if (error) {
        console.error('Error al insertar festivo:', error);
        if (error.code === '23505') return mostrarAlerta('Esta fecha ya está registrada', 'error');
        return mostrarAlerta(`Error: ${error.message}`, 'error');
      }
      mostrarAlerta('Día festivo guardado', 'exito');
    }
    setFestivoForm({ id: null, fecha: '', descripcion: '', editando: false });
    cargarTodosLosDatos();
  };

  const borrarRegistro = async (tabla, columnaId, id) => {
    if (confirm('¿Está seguro de eliminar este registro?')) {
      await supabase.from(tabla).delete().eq(columnaId, id);
      cargarTodosLosDatos();
      mostrarAlerta('Registro eliminado', 'exito');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center"><span className="text-2xl font-black text-blue-950">konecta</span><span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded ml-2 uppercase">SuperAdmin</span></div>
        <button onClick={cerrarSesion} className="bg-blue-950 text-white text-sm font-bold px-4 py-2 rounded hover:bg-blue-900 transition">Cerrar sesión</button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {mensaje.texto && <div className={`p-3 rounded-lg mb-6 text-sm font-medium border ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>{mensaje.texto}</div>}

        <div className="flex border-b border-gray-200 gap-4 mb-8">
          {['empleados', 'jefes', 'festivos'].map((t) => (
            <button key={t} onClick={() => setPestana(t)} className={`py-2 px-4 font-bold text-sm uppercase tracking-wide border-b-2 transition ${pestana === t ? 'border-blue-950 text-blue-950' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{t === 'festivos' ? '📅 Festivos' : t === 'jefes' ? '👔 Jefes' : '👥 Empleados'}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Formularios pestana={pestana} empForm={empForm} setEmpForm={setEmpForm} guardarEmpleado={guardarEmpleado} jefeForm={jefeForm} setJefeForm={setJefeForm} guardarJefe={guardarJefe} festivoForm={festivoForm} setFestivoForm={setFestivoForm} guardarFestivo={guardarFestivo} />

          <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm max-h-[600px] overflow-y-auto">
            {pestana === 'empleados' && (
              <div className="space-y-2">
                {empleados.map(emp => (
                  <div key={emp.cedula} className="flex justify-between items-center p-3 bg-gray-50 rounded border text-sm text-black">
                    <div><strong>{emp.nombre}</strong> <span className="text-xs text-gray-500">(CC: {emp.cedula})</span></div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${emp.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{emp.estado}</span>
                      <button onClick={() => setEmpForm({ ...emp, correo: emp.correoelectronico, editando: true })} className="text-yellow-600 font-bold text-xs">Editar</button>
                      <button onClick={() => borrarRegistro('empleados', 'cedula', emp.cedula)} className="text-red-500 font-bold text-xs">Borrar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pestana === 'jefes' && (
              <div className="space-y-2">
                {jefes.map(jf => (
                  <div key={jf.cedula} className="flex justify-between items-center p-3 bg-gray-50 rounded border text-sm text-black">
                    <div><strong>{jf.nombre}</strong> <span className="text-xs text-gray-400">({jf.correo})</span><div className="text-xs text-blue-900 font-medium">Líder: {jf.equipo}</div></div>
                    <div className="flex gap-3">
                      <button onClick={() => setJefeForm({ ...jf, editando: true })} className="text-yellow-600 font-bold text-xs">Editar</button>
                      <button onClick={() => borrarRegistro('jefes', 'cedula', jf.cedula)} className="text-red-500 font-bold text-xs">Borrar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pestana === 'festivos' && (
              <div className="space-y-2">
                {festivos.map(f => (
                  <div key={f.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border text-sm text-black">
                    <div><strong className="text-blue-950">{f.fecha}</strong> - {f.descripcion}</div>
                    <div className="flex gap-3">
                      <button onClick={() => setFestivoForm({ ...f, editando: true })} className="text-yellow-600 font-bold text-xs">Editar</button>
                      <button onClick={() => borrarRegistro('festivos', 'id', f.id)} className="text-red-500 font-bold text-xs">Borrar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
