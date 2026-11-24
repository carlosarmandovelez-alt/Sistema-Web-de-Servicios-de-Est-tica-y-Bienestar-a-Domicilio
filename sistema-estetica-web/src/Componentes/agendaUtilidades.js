import {
  formatearFecha,
  formatearHora,
  mismaFechaLocal,
  parsearLocalDateTime,
  sumarMinutos,
} from './solicitudUtilidades';

/**
 * Utilidades de presentación de HU-019.
 *
 * La agenda usa la duración histórica conservada en la solicitud. La hora de
 * finalización que entrega el backend ya se calcula con ese valor; si por
 * compatibilidad no llegara, se calcula aquí sin consultar el catálogo.
 */

export const obtenerFinAgenda = (reserva) => {
  const fin = parsearLocalDateTime(reserva?.fecha_hora_fin);
  if (fin) return fin;

  const inicio = parsearLocalDateTime(reserva?.fecha_hora_inicio);
  const duracion = Number(reserva?.duracion_snapshot_minutos);
  if (!inicio || !Number.isFinite(duracion) || duracion < 0) return null;

  return sumarMinutos(inicio, duracion);
};

/**
 * Devuelve la duración histórica. Si una versión anterior del backend no
 * envía `duracion_snapshot_minutos`, se deriva del periodo ya calculado por
 * el backend; nunca se consulta el catálogo actual.
 */
export const obtenerDuracionAgenda = (reserva) => {
  const duracion = Number(reserva?.duracion_snapshot_minutos);
  if (Number.isFinite(duracion) && duracion > 0) return duracion;

  const inicio = parsearLocalDateTime(reserva?.fecha_hora_inicio);
  const fin = parsearLocalDateTime(reserva?.fecha_hora_fin);
  if (!inicio || !fin) return null;

  const minutos = Math.round((fin.getTime() - inicio.getTime()) / 60000);
  return minutos > 0 ? minutos : null;
};

/**
 * Devuelve un intervalo comprensible. Si el fin cae en otro día, incluye
 * ambas fechas para no perder el cambio de jornada.
 */
export const describirPeriodoAgenda = (reserva) => {
  const inicio = parsearLocalDateTime(reserva?.fecha_hora_inicio);
  const fin = obtenerFinAgenda(reserva);

  if (!inicio) return '';
  if (!fin) return formatearHora(inicio);

  if (mismaFechaLocal(inicio, fin)) {
    return `${formatearHora(inicio)} – ${formatearHora(fin)}`;
  }

  return `${formatearHora(inicio)} del ${formatearFecha(inicio)} – ${formatearHora(
    fin
  )} del ${formatearFecha(fin)}`;
};
