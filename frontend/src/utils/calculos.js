export function calcularMontoRegistro(reg) {
  // 1. Calcular horas totales trabajadas
  const [hI, mI] = reg.hora_inicio.split(':').map(Number);
  const [hF, mF] = reg.hora_fin.split(':').map(Number);
  let totalHoras = (hF + mF / 60) - (hI + mI / 60);
  if (totalHoras < 0) totalHoras += 24;

  // 2. Determinar tipo de día
  const dayOfWeek = new Date(reg.fecha + 'T12:00:00').getDay();
  let hBase = 0, hExtra = 0, hSab = 0, hDom = 0;

  // NUEVO: Si es Domingo (0) o el registro fue marcado manualmente como feriado
  if (dayOfWeek === 0 || reg.es_feriado) {
    hDom = totalHoras + (reg.de_corrido ? 1 : 0);
  } else if (dayOfWeek === 6) {
    hSab = totalHoras + (reg.de_corrido ? 1 : 0);
  } else if (reg.es_viernes_extra) {
    hExtra = totalHoras + (reg.de_corrido ? 1 : 0);
  } else {
    hBase = Math.min(totalHoras, 9);
    hExtra = Math.max(0, totalHoras - 9) + (reg.de_corrido ? 1 : 0);
  }

  // 3. Multiplicar por las tarifas HISTÓRICAS CONGELADAS de ese registro
  const montoBase = hBase * reg.tarifa_base_aplicada;
  const montoExtra = hExtra * reg.tarifa_extra_aplicada;
  const montoSab = hSab * reg.tarifa_sabado_aplicada;
  const montoDom = hDom * reg.tarifa_domingo_aplicada;
  
  const total = montoBase + montoExtra + montoSab + montoDom;

  return { total, hBase, hExtra, hSab, hDom, montoBase, montoExtra, montoSab, montoDom };
}