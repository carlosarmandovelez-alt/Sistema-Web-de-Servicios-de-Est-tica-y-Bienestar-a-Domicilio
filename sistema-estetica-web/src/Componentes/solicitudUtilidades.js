/**
 * Utilidades locales para HU-012.
 *
 * El backend recibe `fecha_hora_solicitada` como LocalDateTime (por ejemplo
 * "2026-11-12T13:00:00") y el proyecto trabaja con la hora local del navegador.
 * Por eso todas las conversiones se hacen leyendo los componentes de fecha y
 * hora por separado: nunca se usa `toISOString()` ni se convierte a UTC, para
 * evitar desplazamientos involuntarios del día o de la hora.
 */

const PAD = (valor) => String(valor).padStart(2, '0');

const expresionFecha = /^(\d{4})-(\d{2})-(\d{2})$/;
const expresionHora = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const expresionFechaHora = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

/**
 * Indica si el valor tiene forma AAAA-MM-DD y representa una fecha real.
 */
export const esFechaValida = (valor) => {
  if (typeof valor !== 'string') return false;
  const coincidencia = expresionFecha.exec(valor);
  if (!coincidencia) return false;

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;

  const fecha = new Date(anio, mes - 1, dia);
  return (
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia
  );
};

/**
 * Indica si el valor tiene forma HH:mm o HH:mm:ss dentro de un día.
 */
export const esHoraValida = (valor) =>
  typeof valor === 'string' && expresionHora.test(valor.trim());

/**
 * Normaliza la hora al formato que espera el backend (HH:mm:ss).
 */
export const normalizarHora = (hora) => {
  if (!esHoraValida(hora)) return null;
  const valor = hora.trim();
  return valor.length === 5 ? `${valor}:00` : valor;
};

/**
 * Construye el valor exacto que espera el DTO `crearSolicitudDTO`:
 * una cadena ISO local sin zona horaria ("AAAA-MM-DDTHH:mm:ss").
 *
 * @returns {string|null} null cuando la fecha u hora no son válidas.
 */
export const construirFechaHoraSolicitada = (fecha, hora) => {
  if (!esFechaValida(fecha)) return null;
  const horaNormalizada = normalizarHora(hora);
  if (!horaNormalizada) return null;
  return `${fecha}T${horaNormalizada}`;
};

/**
 * Crea una fecha local a partir de los valores de los controles del formulario.
 * Se usa para mostrar el resumen y calcular la hora de finalización.
 */
export const parsearFechaHoraLocal = (fecha, hora) => {
  if (!esFechaValida(fecha) || !esHoraValida(hora)) return null;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [horas, minutos, segundos = '0'] = hora.trim().split(':');
  const fechaLocal = new Date(
    anio,
    mes - 1,
    dia,
    Number(horas),
    Number(minutos),
    Number(segundos)
  );

  if (
    fechaLocal.getFullYear() !== anio ||
    fechaLocal.getMonth() !== mes - 1 ||
    fechaLocal.getDate() !== dia ||
    fechaLocal.getHours() !== Number(horas) ||
    fechaLocal.getMinutes() !== Number(minutos)
  ) {
    return null;
  }

  return fechaLocal;
};

/**
 * Convierte un LocalDateTime devuelto por el backend a una fecha local,
 * sin interpretarlo como UTC.
 */
export const parsearLocalDateTime = (valor) => {
  if (typeof valor !== 'string') return null;
  const coincidencia = expresionFechaHora.exec(valor.trim());
  if (!coincidencia) return null;

  const [, anio, mes, dia, horas, minutos, segundos = '0'] = coincidencia;
  return parsearFechaHoraLocal(
    `${anio}-${mes}-${dia}`,
    `${horas}:${minutos}:${segundos}`
  );
};

/**
 * Suma minutos a una fecha local.
 */
export const sumarMinutos = (fecha, minutos) => {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
  const cantidad = Number(minutos);
  if (!Number.isFinite(cantidad) || cantidad <= 0) return null;
  return new Date(fecha.getTime() + cantidad * 60 * 1000);
};

/**
 * CA-10: hora de finalización = hora de inicio + duración conservada.
 */
export const calcularHoraFin = (fecha, hora, duracionMinutos) => {
  const inicio = parsearFechaHoraLocal(fecha, hora);
  return inicio ? sumarMinutos(inicio, duracionMinutos) : null;
};

export const formatearHora = (fecha) => {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '';
  return `${PAD(fecha.getHours())}:${PAD(fecha.getMinutes())}`;
};

export const formatearFecha = (fecha) => {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '';
  return `${PAD(fecha.getDate())}/${PAD(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
};

export const formatearFechaHora = (fecha) => {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '';
  return `${formatearFecha(fecha)} ${formatearHora(fecha)}`;
};

export const formatearLocalDateTime = (valor) =>
  formatearFechaHora(parsearLocalDateTime(valor));

/**
 * Misma fecha (año, mes y día) en hora local.
 */
export const mismaFechaLocal = (primera, segunda) =>
  primera instanceof Date &&
  segunda instanceof Date &&
  primera.getFullYear() === segunda.getFullYear() &&
  primera.getMonth() === segunda.getMonth() &&
  primera.getDate() === segunda.getDate();

/**
 * Fecha de hoy en formato AAAA-MM-DD, según la zona local del navegador.
 */
export const obtenerFechaHoyISO = (ahora = new Date()) =>
  `${ahora.getFullYear()}-${PAD(ahora.getMonth() + 1)}-${PAD(ahora.getDate())}`;

/**
 * Verifica la misma regla del backend (@Future): la fecha y hora deben ser
 * estrictamente posteriores al momento actual.
 */
export const esFechaHoraFutura = (fecha, hora, ahora = new Date()) => {
  const inicio = parsearFechaHoraLocal(fecha, hora);
  return Boolean(inicio && inicio.getTime() > ahora.getTime());
};

/**
 * Texto de la hora de finalización, indicando el cambio de día cuando ocurre.
 */
export const describirHoraFin = (fecha, hora, duracionMinutos) => {
  const inicio = parsearFechaHoraLocal(fecha, hora);
  const fin = calcularHoraFin(fecha, hora, duracionMinutos);
  if (!inicio || !fin) return '';

  return mismaFechaLocal(inicio, fin)
    ? formatearHora(fin)
    : `${formatearHora(fin)} del ${formatearFecha(fin)}`;
};

const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente',
  sugerida: 'Sugerida',
  aceptada: 'Aceptada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  rechazada: 'Rechazada',
};

/**
 * Los estados del backend llegan en minúsculas; la interfaz los muestra con
 * la primera letra en mayúscula.
 */
export const mapearEstadoSolicitud = (estado) => {
  const clave = typeof estado === 'string' ? estado.trim().toLowerCase() : '';
  if (ETIQUETAS_ESTADO[clave]) return ETIQUETAS_ESTADO[clave];
  if (!clave) return 'No informado';
  return clave.charAt(0).toUpperCase() + clave.slice(1);
};
