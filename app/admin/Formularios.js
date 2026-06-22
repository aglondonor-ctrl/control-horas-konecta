    export default function Formularios({ pestana, empForm, setEmpForm, guardarEmpleado, jefeForm, setJefeForm, guardarJefe, festivoForm, setFestivoForm, guardarFestivo }) {
  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm h-fit">
      {pestana === 'empleados' && (
        <form onSubmit={guardarEmpleado} className="space-y-4">
          <h3 className="text-lg font-bold text-blue-950">{empForm.editando ? 'Editar Empleado' : 'Añadir Empleado'}</h3>
          <input type="text" disabled={empForm.editando} value={empForm.cedula} onChange={e => setEmpForm({...empForm, cedula: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50 disabled:opacity-50" placeholder="Cédula" />
          <input type="text" value={empForm.nombre} onChange={e => setEmpForm({...empForm, nombre: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50" placeholder="Nombre completo" />
          <input type="email" value={empForm.correo} onChange={e => setEmpForm({...empForm, correo: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50" placeholder="Correo electrónico" />
          <select value={empForm.equipo} onChange={e => setEmpForm({...empForm, equipo: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50">
            <option value="">-- Selecciona un equipo --</option>
            <option value="IVR">IVR</option>
            <option value="TechBridge">TechBridge</option>
            <option value="KCRM y CRM Banco">KCRM y CRM Banco</option>
            <option value="IVR Bancolombia">IVR Bancolombia</option>
          </select>
          <input type="tel" value={empForm.telefono} onChange={e => setEmpForm({...empForm, telefono: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50" placeholder="Teléfono" />
          <input type="text" value={empForm.cargo} onChange={e => setEmpForm({...empForm, cargo: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50" placeholder="Cargo" />
          <select value={empForm.estado} onChange={e => setEmpForm({...empForm, estado: e.target.value})} className="w-full border p-2 rounded text-black bg-gray-50">
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <button type="submit" className="w-full bg-blue-950 text-white p-2 rounded font-bold">{empForm.editando ? 'Actualizar' : 'Guardar'}</button>
        </form>
      )}

      {pestana === 'jefes' && (
        <form onSubmit={guardarJefe} className="space-y-4">
          <h3 className="text-lg font-bold text-blue-950">{jefeForm.editando ? 'Editar Jefe' : 'Añadir Jefe'}</h3>
          <input type="text" disabled={jefeForm.editando} value={jefeForm.cedula} onChange={e => setJefeForm({...jefeForm, cedula: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50 disabled:opacity-50" placeholder="Cédula" />
          <input type="text" value={jefeForm.nombre} onChange={e => setJefeForm({...jefeForm, nombre: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50" placeholder="Nombre completo" />
          <input type="email" value={jefeForm.correo} onChange={e => setJefeForm({...jefeForm, correo: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50" placeholder="Correo electrónico" />
          <input type="text" value={jefeForm.equipo} onChange={e => setJefeForm({...jefeForm, equipo: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50" placeholder="Equipo (ej: Soporte)" />
          <input type="text" value={jefeForm.gerencia} onChange={e => setJefeForm({...jefeForm, gerencia: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50" placeholder="Gerencia" />
          <button type="submit" className="w-full bg-blue-950 text-white p-2 rounded font-bold">{jefeForm.editando ? 'Actualizar' : 'Guardar'}</button>
        </form>
      )}

      {pestana === 'festivos' && (
        <form onSubmit={guardarFestivo} className="space-y-4">
          <h3 className="text-lg font-bold text-blue-950">{festivoForm.editando ? 'Editar Festivo' : 'Añadir Festivo'}</h3>
          <input type="date" value={festivoForm.fecha} onChange={e => setFestivoForm({...festivoForm, fecha: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50" />
          <input type="text" value={festivoForm.descripcion} onChange={e => setFestivoForm({...festivoForm, descripcion: e.target.value})} required className="w-full border p-2 rounded text-black bg-gray-50" placeholder="Descripción" />
          <button type="submit" className="w-full bg-blue-950 text-white p-2 rounded font-bold">{festivoForm.editando ? 'Actualizar' : 'Guardar'}</button>
        </form>
      )}
    </div>
  );
}
