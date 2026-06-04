"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Formularios from './Formularios'; // Importamos el componente limpio

export default function AdminPanelPage() {
  const [pestana, setPestana] = useState('empleados');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [empleados, setEmpleados] = useState([]);
  const [jefes, setJefes] = useState([]);
  const [festivos, setFestivos] = useState([]);

  const [empForm, setEmpForm] = useState({ cedula: '', nombre: '', estado: 'activo', editando: false });
  const [jefeForm, setJefeForm] = useState({ cedula: '', nombre: '', correo: '', equipo: '', gerencia: '', editando: false });
  const [festivoForm, setFestivoForm] = useState({ id: null, fecha: '', descripcion: '', editando: false });

  useEffect(() => { cargarTodosLosDatos(); }, []);

  const cargarTodosLosDatos = async () => {
    const { data: emp } = await supabase.from('empleados').select('*').order('nombre');
    const { data: jf } = await supabase.from('jefes').select('*').order('nombre');
    const { data: fest } = await supabase.from('festivos').select('*').order('fecha');
    setEmpleados(emp || []);
    setJefes(jf || []);
    setFestivos(fest || []);
  };

  const mostrarAlerta = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

  const guardarEmpleado = async (e) => {
    e.preventDefault();
    if (empForm.editando) {
      await supabase.from('empleados').update({ nombre: empForm.nombre, estado: empForm.estado }).eq('cedula', empForm.cedula);
      mostrarAlerta('Empleado actualizado', 'exito');
    } else {
      const { error } = await supabase.from('empleados').insert([{ cedula: empForm.cedula, nombre: empForm.nombre, estado: empForm.estado }]);
      if (error) return mostrarAlerta('La cédula ya existe', 'error');
      mostrarAlerta('Empleado guardado', 'exito');
    }
    setEmpForm({ cedula: '', nombre: '', estado: 'activo', editando: false });
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
      if (error) return mostrarAlerta('La cédula o correo ya existen', 'error');
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
      if (error) return mostrarAlerta('Esta fecha ya está registrada', 'error');
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
                      <button onClick={() => setEmpForm({ ...emp, editando: true })} className="text-yellow-600 font-bold text-xs">Editar</button>
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
