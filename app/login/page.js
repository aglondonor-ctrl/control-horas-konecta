"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation'; // Controla el redireccionamiento

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    setCargando(true);

    // 1. Autenticar credenciales en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: correo,
      password: password,
    });

    if (authError) {
      setMensaje({ texto: 'Credenciales incorrectas: ' + authError.message, tipo: 'error' });
      setCargando(false);
      return;
    }

    // 2. Verificar si el correo autenticado pertenece a la tabla de jefes
    const { data: jefeData, error: jefeError } = await supabase
      .from('jefes') // Validamos contra tu nueva estructura maestro
      .select('*')
      .eq('correo', correo)
      .single();

    if (jefeError || !jefeData) {
      // Si se logueó pero no está registrado como jefe en el negocio, cerramos sesión por seguridad
      await supabase.auth.signOut();
      setMensaje({ texto: 'Acceso denegado. Este usuario no está registrado como Jefe Aprobador.', tipo: 'error' });
      setCargando(false);
      return;
    }

    // 3. Si todo es correcto, guardamos la sesión y redirigimos al panel de aprobación
    setMensaje({ texto: '¡Ingreso exitoso! Redirigiendo...', tipo: 'exito' });
    
    setTimeout(() => {
      router.push('/panel-jefe'); // Dirección de la futura pantalla de aprobación
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-gray-800">
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 w-full max-w-md">
        
        {/* Encabezado Identidad Konecta */}
        <div className="text-center mb-6">
          <span className="text-3xl font-black tracking-tight text-blue-950">konecta</span>
          <h1 className="text-xl font-bold text-gray-700 mt-2">Portal Jefes Aprobadores</h1>
          <p className="text-xs text-gray-400 mt-1">Ingresa con tu correo corporativo asignado.</p>
        </div>

        {mensaje.texto && (
          <div className={`p-3 rounded mb-4 text-sm font-medium ${
            mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Correo Electrónico</label>
            <input 
              type="email" 
              value={correo} 
              onChange={(e) => setCorreo(e.target.value)} 
              required 
              className="mt-1 block w-full border border-gray-300 rounded-md p-2.5 bg-gray-50 focus:bg-white text-black text-sm" 
              placeholder="ejemplo@konecta.com" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="mt-1 block w-full border border-gray-300 rounded-md p-2.5 bg-gray-50 focus:bg-white text-black text-sm" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            className={`w-full bg-blue-950 text-white p-2.5 rounded-md font-bold tracking-wide transition shadow ${
              cargando ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-900'
            }`}
          >
            {cargando ? 'Autenticando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
