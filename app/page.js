"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function HorasExtrasPage() {
  const router = useRouter();
  const [registros, setRegistros] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [fechaMaxima, setFechaMaxima] = useState('');
  const [formData, setFormData] = useState({
    cedula: '',
    equipo: '',
    CECO: '5712200100',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    motivo: ''
  });

  const equiposDisponibles = ["IVR", "TechBridge", "KCRM y CRM Banco", "IVR Bancolombia"];

  // 1. Obtener fecha actual en formato YYYY-MM-DD para bloquear fechas futuras
    useEffect(() => {
    const verificarUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login'); // Si no está logueado, va al login único
        return;
      }

      // Si el correo termina en .local extraemos la cédula automáticamente
      if (user.email.endsWith('@konecta.local')) {
        const cedulaCalculada = user.email.split('@')[0];
        setFormData(prev => ({ ...prev, cedula: cedulaCalculada }));
        fetchRegistros(cedulaCalculada);
      }
    };

    const hoy = new Date().toISOString().split('T');
    setFechaMaxima(hoy[0]);
    verificarUsuario();
  }, [router]);


  const fetchRegistros = async (cedula) => {
    if (!cedula) return;
    const { data, error } = await supabase
      .from('horas_extras')
      .select('*')
      .eq('cedula', cedula) // Solo los registros del propio empleado
      .order('created_at', { ascending: false });

    if (!error) setRegistros(data || []);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });

    // Validación extra en el cliente por si manipulan el HTML
    if (formData.fecha > fechaMaxima) {
      setMensaje({ texto: 'No es posible registrar horas extras en fechas futuras.', tipo: 'error' });
      return;
    }

    const { error } = await supabase.from('horas_extras').insert([formData]);

    if (error) {
      setMensaje({ texto: 'Error al guardar: ' + error.message, tipo: 'error' });
    } else {
      setMensaje({ texto: '¡Hora extra reportada con éxito!', tipo: 'exito' });
      setFormData({ ...formData, fecha: '', hora_inicio: '', hora_fin: '', motivo: '' });
      fetchRegistros(formData.cedula);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      
      {/* HEADER CORPORATIVO (Estilo Konecta) */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 md:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo y Título */}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tight text-blue-950">konecta</span>
            <span className="text-xl font-light text-blue-900 ml-1">Horas Extras</span>
          </div>

          {/* Buscador placeholder (Futura funcionalidad) */}
          <div className="relative w-full md:w-80">
            <input 
              type="text" 
              placeholder="Buscar en Horas Extras..." 
              disabled
              className="w-full border border-gray-300 rounded-lg py-1.5 px-3 bg-gray-50 text-sm cursor-not-allowed"
            />
          </div>

          {/* Menú de navegación idéntico al de la imagen */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-gray-600">
            <span className="cursor-pointer hover:text-blue-950 transition">Modelo Operativo</span>
            <span className="cursor-pointer hover:text-blue-950 transition">Reporting</span>
            <span className="text-blue-950 font-bold border-b-2 border-blue-950 pb-1">WFM</span>
            <span className="cursor-pointer hover:text-blue-950 transition">Gestión Humana</span>
            <button onClick={cerrarSesion} className="bg-blue-950 text-white text-sm font-bold px-4 py-1.5 rounded hover:bg-blue-900 transition">Cerrar sesión</button>
          </nav>
        </div>
      </header>

      {/* RUTA DE NAVEGACIÓN (Breadcrumb) */}
      <div className="bg-gray-100 px-4 md:px-8 py-2 border-b border-gray-200">
        <div className="max-w-6xl mx-auto text-xs text-gray-500 flex items-center gap-1">
          <span>🏠</span>
          <span>&gt;</span>
          <span className="text-gray-700 font-medium">Inicio</span>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario de Reporte */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h1 className="text-xl font-bold mb-1 text-blue-950">Reportar Hora Extra</h1>
          <p className="text-xs text-gray-500 mb-6">Ingresa los datos del turno extra realizado.</p>

          {mensaje.texto && (
            <div className={`p-3 rounded mb-4 text-sm font-medium ${
              mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {mensaje.texto}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Cédula de Ciudadanía</label>
              <input type="text" name="cedula" value={formData.cedula} readOnly disabled required className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-100 text-black cursor-not-allowed opacity-70" placeholder="Ej: 10203040" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Equipo de Trabajo</label>
              <select name="equipo" value={formData.equipo} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-50 focus:bg-white text-black">
                <option value="">-- Selecciona un equipo --</option>
                {equiposDisponibles.map((eq) => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">CECO</label>
              <input type="text" name="CECO" value={formData.CECO} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-50 focus:bg-white text-black" placeholder="Ej: 5712200100" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Fecha del Turno</label>
              <input 
                type="date" 
                name="fecha" 
                max={fechaMaxima} // Restringe la selección en el calendario nativo
                value={formData.fecha} 
                onChange={handleChange} 
                required 
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-50 focus:bg-white text-black" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Hora Inicio</label>
                <input type="time" name="hora_inicio" value={formData.hora_inicio} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-50 focus:bg-white text-black" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Hora Fin</label>
                <input type="time" name="hora_fin" value={formData.hora_fin} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-50 focus:bg-white text-black" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Motivo / Tarea Realizada</label>
              <textarea name="motivo" value={formData.motivo} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-50 focus:bg-white text-black" rows="3" placeholder="Describe brevemente la justificación..."></textarea>
            </div>

            <button type="submit" className="w-full bg-blue-950 text-white p-2.5 rounded-md font-bold tracking-wide hover:bg-blue-900 transition shadow">
              Enviar Reporte
            </button>
          </form>
        </div>

        {/* Historial de Reportes */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-1 text-blue-950">Historial de Reportes</h2>
          <p className="text-xs text-gray-500 mb-6">Lista global de horas extras registradas en el sistema.</p>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {registros.length === 0 ? (
              <p className="text-gray-400 text-center py-8 italic">No hay horas extras registradas todavía.</p>
            ) : (
              registros.map((r) => (
                <div key={r.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900">CC: {r.cedula}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-950 rounded text-xs font-semibold border border-blue-200">{r.equipo}</span>
                      <span className="text-gray-500 text-sm">| {r.fecha}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Horario cumplido: <span className="font-medium text-gray-800">{r.hora_inicio}</span> a <span className="font-medium text-gray-800">{r.hora_fin}</span>
                    </p>
                    <p className="text-sm mt-2 text-gray-700 bg-white p-2 rounded border border-gray-100 italic">
                      "{r.motivo}"
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
                      {r.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
