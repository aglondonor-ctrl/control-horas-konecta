// Genera el archivo Excel "Carga de recargos administrativos" (Reporte Jarvis)
// a partir de las solicitudes APROBADAS del equipo del jefe.
//
// Reglas de clasificación de horas:
// - Día festivo  = domingo O fecha presente en la tabla `festivos`.
// - Franja diurna   = 06:00:00 a 18:59:59  (minutos [360, 1140))
// - Franja nocturna = 19:00:00 a 05:59:59  (resto del día)
//
//   | Tipo de día        | Diurna -> columna                         | Nocturna -> columna                         |
//   | Lunes a sábado     | Horas extra diurnas (I)                   | Horas extras nocturnas (J)                  |
//   | Domingo / festivo  | Horas festivas diurnas sin compensatorio  | Horas festivas nocturnas sin compensatorio  |
//   |                    | (F)                                       | (H)                                         |
//
// El resto de columnas de horas siempre van en 0.

const RECOMENDACION =
`Recomendacion:
- El formato de la fecha es AAAA-MM-DD.
- No uses formulas en ninguna celda.
- Solo se debe usar los tipos establecidos en el archivo.
- Campo Fecha inicio debe tener el formato año-mes-día y debe ser menor a la Fecha fin.
- Campo Fecha fin debe tener el formato año-mes-día y debe ser mayor a la Fecha inicio.
- El formato de hora es HH-MM-SS.
- Horas extras Ordinarias diurnas y nocturnas (lunes 00:00:00 hasta sábado 23:59:59) se excluyen los días feriados.
- Horas extras Festivas diurnas y nocturnas (Domingo o Festivo 00:00:00 hasta domingo o Festivo 23:59:59)
- Si las horas pasan de día, se deben agregar dos registros independientes.
`;

const ENCABEZADOS = [
  'Documento', 'Centro Costos', 'Horas Ordinarias', 'Recargo nocturno',
  'Horas festivas diurnas con compensatorio', 'Horas festivas diurnas sin compensatorio',
  'Horas festivas nocturnas con compensatorio', 'Horas festivas nocturnas sin compensatorio',
  'Horas extra diurnas', 'Horas extras nocturnas', 'Horas extras festivas diurnas',
  'Horas extras festivas nocturnas', 'Fecha entrada', 'Hora entrada', 'Fecha salida',
  'Hora salida', 'Motivo',
];

const horaAMinutos = (hora) => {
  if (!hora) return 0;
  const p = String(hora).split(':');
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
};

// ¿La fecha (YYYY-MM-DD) cae en domingo o es festivo?
const esFestivo = (fechaStr, festivosSet) => {
  const [y, mo, d] = fechaStr.split('-').map(Number);
  const dia = new Date(y, mo - 1, d).getDay(); // 0 = domingo
  return dia === 0 || festivosSet.has(fechaStr);
};

// Reparte la duración del turno entre franja diurna y nocturna (en horas)
const clasificarHoras = (inicioMin, finMin) => {
  const fin = finMin <= inicioMin ? finMin + 1440 : finMin; // cruza medianoche
  let diurnas = 0, nocturnas = 0;
  for (let t = inicioMin; t < fin; t++) {
    const m = ((t % 1440) + 1440) % 1440;
    if (m >= 360 && m < 1140) diurnas++; else nocturnas++;
  }
  return { diurnas: diurnas / 60, nocturnas: nocturnas / 60 };
};

const redondear = (n) => Math.round(n * 100) / 100;

const setCell = (ws, row, col, value, fmt) => {
  const cell = ws.getCell(row, col);
  cell.value = value;
  cell.numFmt = fmt;
};

export async function generarReporteJarvis(aprobadas, festivosSet, equipo) {
  if (!aprobadas || aprobadas.length === 0) {
    alert('No hay solicitudes aprobadas para exportar.');
    return;
  }

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja_1');

  // Fila 1: recomendaciones
  setCell(ws, 1, 1, RECOMENDACION, '@');

  // Fila 2: encabezados
  ENCABEZADOS.forEach((h, i) => setCell(ws, 2, i + 1, h, '@'));

  // Datos desde la fila 3
  let fila = 3;
  for (const r of aprobadas) {
    const { diurnas, nocturnas } = clasificarHoras(horaAMinutos(r.hora_inicio), horaAMinutos(r.hora_fin));
    const festivo = esFestivo(r.fecha, festivosSet);

    const [y, mo, d] = r.fecha.split('-').map(Number);
    const fechaCel = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0)); // mediodía UTC -> fecha estable
    const [hi, mi] = String(r.hora_inicio).split(':').map(Number);
    const [hf, mf] = String(r.hora_fin).split(':').map(Number);
    const horaEnt = new Date(Date.UTC(1899, 11, 30, hi || 0, mi || 0, 0));
    const horaSal = new Date(Date.UTC(1899, 11, 30, hf || 0, mf || 0, 0));

    setCell(ws, fila, 1, String(r.cedula), '@');           // A Documento
    setCell(ws, fila, 2, Number(r.CECO) || 0, '0');        // B Centro Costos
    setCell(ws, fila, 3, 0, '0.00');                       // C Horas Ordinarias
    setCell(ws, fila, 4, 0, '0.00');                       // D Recargo nocturno
    setCell(ws, fila, 5, 0, '0.00');                       // E festivas diurnas CON comp
    setCell(ws, fila, 6, festivo ? redondear(diurnas) : 0, '0.00');   // F festivas diurnas SIN comp
    setCell(ws, fila, 7, 0, '0.00');                       // G festivas nocturnas CON comp
    setCell(ws, fila, 8, festivo ? redondear(nocturnas) : 0, '0.00'); // H festivas nocturnas SIN comp
    setCell(ws, fila, 9, festivo ? 0 : redondear(diurnas), '0.00');   // I horas extra diurnas
    setCell(ws, fila, 10, festivo ? 0 : redondear(nocturnas), '0.00');// J horas extras nocturnas
    setCell(ws, fila, 11, 0, '0.00');                      // K extras festivas diurnas
    setCell(ws, fila, 12, 0, '0.00');                      // L extras festivas nocturnas
    setCell(ws, fila, 13, fechaCel, 'yyyy-mm-dd');         // M Fecha entrada
    setCell(ws, fila, 14, horaEnt, 'hh:mm:ss');            // N Hora entrada
    setCell(ws, fila, 15, fechaCel, 'yyyy-mm-dd');         // O Fecha salida
    setCell(ws, fila, 16, horaSal, 'hh:mm:ss');            // P Hora salida
    setCell(ws, fila, 17, r.motivo || '', '@');            // Q Motivo
    fila++;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte_jarvis_${equipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
