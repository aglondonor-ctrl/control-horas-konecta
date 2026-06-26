"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { generarReporteJarvis } from '@/lib/reporteJarvis';

export default function PanelJefePage() {
  const router = useRouter();
  const [jefe, setJefe] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [festivos, setFestivos] = useState(new Set());
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState('solicitudes');
  const [rango, setRango] = useState({ desde: '', hasta: '' });

  useEffect(() => {
    const verificarSesionYDatos = async () => {
      // 1. Validar si hay un usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 2. Traer la información del perfil del jefe usando su correo
      const { data: jefeData, error } = await supabase
        .from('jefes')
        .select('*')
        .eq('correo', user.email)
        .single();

      if (error || !jefeData) {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      setJefe(jefeData);

      // 3. Traer únicamente las horas extras del equipo de este jefe
      const { data: horasData } = await supabase
        .from('horas_extras')
        .select('*')
        .eq('equipo', jefeData.equipo)
        .order('created_at', { ascending: false });

      setReportes(horasData || []);

      // 4. Cargar festivos para clasificar el reporte Jarvis
      const { data: festData } = await supabase.from('festivos').select('fecha');
      setFestivos(new Set((festData || []).map(f => f.fecha)));

      setCargando(false);
    };

    verificarSesionYDatos();
  }, [router]);

  // Actualizar el estado de la hora extra (Aprobar / Rechazar)
  const gestionarEstado = async (id, nuevoEstado) => {
    const { error } = await supabase
      .from('horas_extras')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (!error) {
      // Refrescar la lista local filtrada
      setReportes(reportes.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));
    } else {
      alert("Error al actualizar el estado");
    }
  };

  const generarReporte = () => {
    if (reportes.length === 0) return alert('No hay registros para exportar.');
    const encabezados = ['Cedula', 'Nombre', 'Equipo', 'CECO', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Motivo', 'Estado'];
    const filas = reportes.map(r => [
      r.cedula, r.nombre, r.equipo, r.CECO, r.fecha, r.hora_inicio, r.hora_fin,
      `"${(r.motivo || '').replace(/"/g, '""')}"`, r.estado
    ].join(','));
    const csv = '﻿' + [encabezados.join(','), ...filas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `horas_extras_${jefe?.equipo}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Aprobadas dentro del rango de fechas elegido (fecha en formato YYYY-MM-DD se compara como texto)
  const aprobadasEnRango = () => reportes.filter(r =>
    r.estado === 'aprobado' &&
    (!rango.desde || r.fecha >= rango.desde) &&
    (!rango.hasta || r.fecha <= rango.hasta)
  );

  const exportarJarvis = () => {
    if (rango.desde && rango.hasta && rango.desde > rango.hasta) {
      return alert('La fecha "Desde" no puede ser mayor que la fecha "Hasta".');
    }
    generarReporteJarvis(aprobadasEnRango(), festivos, jefe?.equipo);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (cargando || !jefe) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-black">Cargando panel de control...</div>;
  }

  const pendientes = reportes.filter(r => r.estado === 'pendiente');
  const historico = reportes.filter(r => r.estado !== 'pendiente');

  const TarjetaReporte = ({ r, conAcciones }) => (
    <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-900 text-base">{r.nombre}</span>
          <span className="text-sm text-gray-500">CC: {r.cedula}</span>
          <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
            r.estado === 'pendiente' ? 'bg-amber-100 text-amber-800' :
            r.estado === 'aprobado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {r.estado}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Fecha del turno: <span className="font-semibold text-gray-800">{r.fecha}</span> | Horario: <span className="font-semibold text-gray-800">{r.hora_inicio} a {r.hora_fin}</span>
        </p>
        <p className="text-sm text-gray-600">CECO: <span className="font-semibold text-gray-800">{r.CECO}</span></p>
        <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded border border-gray-100 italic mt-2">
          "{r.motivo}"
        </p>
      </div>

      {conAcciones && r.estado === 'pendiente' && (
        <div className="flex gap-2 shrink-0 md:self-center">
          <button onClick={() => gestionarEstado(r.id, 'rechazado')} className="px-4 py-2 border border-red-300 text-red-700 bg-red-50 rounded-md text-sm font-bold hover:bg-red-100 transition">
            Rechazar
          </button>
          <button onClick={() => gestionarEstado(r.id, 'aprobado')} className="px-4 py-2 bg-green-700 text-white rounded-md text-sm font-bold hover:bg-green-800 transition shadow">
            Aprobar
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* NAVBAR */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <span className="text-xl font-black text-blue-950">konecta</span>
          <span className="text-md font-light text-gray-500 ml-2">Panel de Aprobaciones</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">{jefe?.nombre}</p>
            <p className="text-xs text-blue-800 font-medium">Líder de {jefe?.equipo}</p>
          </div>
          <button onClick={cerrarSesion} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-md border border-red-200 font-semibold hover:bg-red-100 transition">
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="max-w-5xl mx-auto p-6 md:p-8">
        {/* MENÚ DE VISTAS */}
        <div className="flex border-b border-gray-200 gap-4 mb-8">
          {[['solicitudes', '📋 Gestionar Solicitudes'], ['historico', '📚 Histórico'], ['reporte', '📊 Generar Reporte'], ['jarvis', '📤 Exportar Reporte Jarvis']].map(([key, label]) => (
            <button key={key} onClick={() => setVista(key)} className={`py-2 px-4 font-bold text-sm uppercase tracking-wide border-b-2 transition ${vista === key ? 'border-blue-950 text-blue-950' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* VISTA: GESTIONAR SOLICITUDES (solo pendientes) */}
        {vista === 'solicitudes' && (
          <>
            <h2 className="text-xl font-bold mb-1 text-blue-950">Solicitudes Pendientes: {jefe?.equipo}</h2>
            <p className="text-xs text-gray-500 mb-6">Aprueba o rechaza las horas extras pendientes de tu equipo.</p>
            <div className="space-y-4">
              {pendientes.length === 0 ? (
                <p className="text-gray-400 text-center py-12 bg-white rounded-xl border italic">No hay solicitudes pendientes por el momento.</p>
              ) : (
                pendientes.map((r) => <TarjetaReporte key={r.id} r={r} conAcciones={true} />)
              )}
            </div>
          </>
        )}

        {/* VISTA: HISTÓRICO (todos los estados) */}
        {vista === 'historico' && (
          <>
            <h2 className="text-xl font-bold mb-1 text-blue-950">Histórico del Equipo: {jefe?.equipo}</h2>
            <p className="text-xs text-gray-500 mb-6">Horas extras ya gestionadas (aprobadas o rechazadas).</p>
            <div className="space-y-4">
              {historico.length === 0 ? (
                <p className="text-gray-400 text-center py-12 bg-white rounded-xl border italic">No hay registros gestionados todavía.</p>
              ) : (
                historico.map((r) => <TarjetaReporte key={r.id} r={r} conAcciones={false} />)
              )}
            </div>
          </>
        )}

        {/* VISTA: GENERAR REPORTE */}
        {vista === 'reporte' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-xl font-bold mb-1 text-blue-950">Generar Reporte: {jefe?.equipo}</h2>
            <p className="text-xs text-gray-500 mb-6">Descarga un archivo CSV con todas las horas extras de tu equipo.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                ['Total', reportes.length, 'text-blue-950'],
                ['Pendientes', reportes.filter(r => r.estado === 'pendiente').length, 'text-amber-600'],
                ['Aprobadas', reportes.filter(r => r.estado === 'aprobado').length, 'text-green-700'],
                ['Rechazadas', reportes.filter(r => r.estado === 'rechazado').length, 'text-red-600'],
              ].map(([etiqueta, valor, color]) => (
                <div key={etiqueta} className="bg-gray-50 rounded-lg border p-4 text-center">
                  <p className={`text-2xl font-black ${color}`}>{valor}</p>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{etiqueta}</p>
                </div>
              ))}
            </div>

            <button onClick={generarReporte} className="bg-blue-950 text-white px-6 py-2.5 rounded-md font-bold hover:bg-blue-900 transition shadow">
              ⬇ Descargar CSV
            </button>
          </div>
        )}

        {/* VISTA: EXPORTAR REPORTE JARVIS */}
        {vista === 'jarvis' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-xl font-bold mb-1 text-blue-950">Exportar Reporte Jarvis: {jefe?.equipo}</h2>
            <p className="text-xs text-gray-500 mb-6">
              Genera el Excel de carga de recargos administrativos con las solicitudes <strong>aprobadas</strong> de tu equipo,
              clasificando las horas según día (lunes-sábado / domingo-festivo) y franja (diurna 06:00-18:59 / nocturna 19:00-05:59).
              Filtra por rango de fechas (opcional); si lo dejas vacío exporta todas las aprobadas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 max-w-md">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Desde</label>
                <input type="date" value={rango.desde} onChange={e => setRango({ ...rango, desde: e.target.value })} className="w-full border p-2 rounded text-black bg-gray-50 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Hasta</label>
                <input type="date" value={rango.hasta} onChange={e => setRango({ ...rango, hasta: e.target.value })} className="w-full border p-2 rounded text-black bg-gray-50 text-sm" />
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gray-50 rounded-lg border p-4 text-center w-48">
                <p className="text-2xl font-black text-green-700">{aprobadasEnRango().length}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Aprobadas a exportar</p>
              </div>
              {(rango.desde || rango.hasta) && (
                <button onClick={() => setRango({ desde: '', hasta: '' })} className="text-xs text-blue-700 font-semibold hover:underline">Limpiar rango</button>
              )}
            </div>

            <button onClick={exportarJarvis} className="bg-blue-950 text-white px-6 py-2.5 rounded-md font-bold hover:bg-blue-900 transition shadow">
              ⬇ Descargar Excel Jarvis
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
