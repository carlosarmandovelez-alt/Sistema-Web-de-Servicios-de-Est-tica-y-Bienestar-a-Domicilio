import {
  formatearFecha,
  formatearFechaHora,
  formatearHora,
  mismaFechaLocal,
  parsearLocalDateTime,
  sumarMinutos,
} from './solicitudUtilidades';

/**
 * Utilidades de presentación para HU-013.
 *
 * El backend devuelve los estados en minúsculas y un único campo
 * `motivo_rechazo_cancelacion`. El estado actual es el que determina si ese
 * motivo debe presentarse como motivo de rechazo o de cancelación.
 */

const CLASES_ESTADO = {
  pendiente: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
  sugerida: 'bg-info-subtle text-info-emphasis border border-info-subtle',
  aceptada: 'bg-primary-subtle text-primary-emphasis border border-primary-subtle',
  completada: 'bg-success-subtle text-success-emphasis border border-success-subtle',
  cancelada: 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle',
  rechazada: 'bg-danger-subtle text-danger-emphasis border border-danger-subtle',
};

/**
 * Clases Bootstrap para diferenciar visualmente el estado real del backend.
 */
export const obtenerClaseEstadoSolicitud = (estado) => {
  const clave = typeof estado === 'string' ? estado.trim().toLowerCase() : '';
  return CLASES_ESTADO[clave] || 'bg-light text-dark border';
};

/**
 * Ordena las solicitudes de la más reciente a la más antigua según la fecha de
 * creación registrada por el servidor. Si no hay fecha, usa la fecha de
 * atención y, como último criterio, el identificador.
 */
export const ordenarSolicitudesPorCreacion = (solicitudes) => {
  const lista = Array.isArray(solicitudes) ? [...solicitudes] : [];

  return lista.sort((primera, segunda) => {
    const fechaPrimera =
      parsearLocalDateTime(primera?.fecha_creacion) ||
      parsearLocalDateTime(primera?.fecha_hora_solicitada);
    const fechaSegunda =
      parsearLocalDateTime(segunda?.fecha_creacion) ||
      parsearLocalDateTime(segunda?.fecha_hora_solicitada);

    if (fechaPrimera && fechaSegunda) {
      const diferencia = fechaSegunda.getTime() - fechaPrimera.getTime();
      if (diferencia !== 0) return diferencia;
    } else if (fechaPrimera) {
      return -1;
    } else if (fechaSegunda) {
      return 1;
    }

    return Number(segunda?.id_solicitud || 0) - Number(primera?.id_solicitud || 0);
  });
};

/**
 * Calcula la hora final con la duración conservada en la solicitud, no con la
 * duración actual del catálogo.
 */
export const calcularFinSolicitud = (solicitud) => {
  const inicio = parsearLocalDateTime(solicitud?.fecha_hora_solicitada);
  const duracion = Number(solicitud?.duracion_snapshot_minutos);
  if (!inicio || !Number.isFinite(duracion) || duracion <= 0) return null;
  return sumarMinutos(inicio, duracion);
};

/**
 * Datos listos para presentar la fecha y el periodo de atención.
 */
export const obtenerDatosAtencion = (solicitud) => {
  const inicio = parsearLocalDateTime(solicitud?.fecha_hora_solicitada);
  const fin = calcularFinSolicitud(solicitud);

  if (!inicio) {
    return {
      inicio: null,
      fin: null,
      fechaTexto: '',
      inicioTexto: '',
      finTexto: '',
      rangoHorario: '',
    };
  }

  const mismoDia = fin ? mismaFechaLocal(inicio, fin) : false;
  const finTexto = fin
    ? mismoDia
      ? formatearHora(fin)
      : `${formatearHora(fin)} del ${formatearFecha(fin)}`
    : '';

  return {
    inicio,
    fin,
    fechaTexto: formatearFecha(inicio),
    inicioTexto: formatearFechaHora(inicio),
    finTexto,
    rangoHorario: fin
      ? `${formatearHora(inicio)} – ${finTexto}`
      : formatearHora(inicio),
  };
};

/**
 * Devuelve el motivo contextualizado únicamente cuando el estado actual es
 * `rechazada` o `cancelada`. Para otros estados no se muestra el campo, aunque
 * contenga algún valor, porque no corresponde a ese estado.
 *
 * @returns {{tipo:'rechazo'|'cancelacion', etiqueta:string, motivo:string}|null}
 */
export const obtenerMotivoSolicitud = (solicitud) => {
  const estado = typeof solicitud?.estado === 'string'
    ? solicitud.estado.trim().toLowerCase()
    : '';
  const motivo =
    typeof solicitud?.motivo_rechazo_cancelacion === 'string'
      ? solicitud.motivo_rechazo_cancelacion.trim()
      : '';

  if (estado === 'rechazada') {
    return {
      tipo: 'rechazo',
      etiqueta: 'Motivo de rechazo',
      motivo,
    };
  }

  if (estado === 'cancelada') {
    return {
      tipo: 'cancelacion',
      etiqueta: 'Motivo de cancelación',
      motivo,
    };
  }

  return null;
};
