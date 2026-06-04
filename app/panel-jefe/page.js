"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function PanelJefePage() {
  const router = useRouter();
  const [jefe, setJefe] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);

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

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-black">Cargando panel de control...</div>;
  }

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
            <p className="text-sm font-bold text-gray-900">{jefe.nombre}</p>
            <p className="text-xs text-blue-800 font-medium">Líder de {jefe.equipo}</p>
          </div>
          <button onClick={cerrarSesion} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-md border border-red-200 font-semibold hover:bg-red-100 transition">
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="max-w-5xl mx-auto p-6 md:p-8">
        <h2 className="text-xl font-bold mb-1 text-blue-950">Solicitudes del Equipo: {jefe.equipo}</h2>
        <p className="text-xs text-gray-500 mb-6">Revisa, aprueba o rechaza las horas extras reportadas por tus colaboradores activos.</p>

        <div className="space-y-4">
          {reportes.length === 0 ? (
            <p className="text-gray-400 text-center py-12 bg-white rounded-xl border italic">No hay registros de horas extras en tu equipo por el momento.</p>
          ) : (
            reportes.map((r) => (
              <div key={r.id} className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 text-base">Cédula: {r.cedula}</span>
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
                  <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded border border-gray-100 italic mt-2">
                    "{r.motivo}"
                  </p>
                </div>

                {/* ACCIONES DE APROBACIÓN */}
                {r.estado === 'pendiente' && (
                  <div className="flex gap-2 shrink-0 md:self-center">
                    <button 
                      onClick={() => gestionarEstado(r.id, 'rechazado')} 
                      className="px-4 py-2 border border-red-300 text-red-700 bg-red-50 rounded-md text-sm font-bold hover:bg-red-100 transition"
                    >
                      Rechazar
                    </button>
                    <button 
                      onClick={() => gestionarEstado(r.id, 'aprobado')} 
                      className="px-4 py-2 bg-green-700 text-white rounded-md text-sm font-bold hover:bg-green-800 transition shadow"
                    >
                      Aprobar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
