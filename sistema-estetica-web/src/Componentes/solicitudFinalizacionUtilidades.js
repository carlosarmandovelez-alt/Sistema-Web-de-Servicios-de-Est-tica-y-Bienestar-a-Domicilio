/**
 * Utilidades de presentación y mensajes para HU-018.
 *
 * La autorización y la transición real las valida el backend. Estas funciones
 * solo controlan la visibilidad y los mensajes de la interfaz.
 */

const normalizarEstado = (estado) =>
  typeof estado === 'string' ? estado.trim().toLowerCase() : '';

/**
 * HU-018: solo una reserva Aceptada puede marcarse como Completada.
 */
export const puedeFinalizarReserva = (solicitud) =>
  normalizarEstado(solicitud?.estado) === 'aceptada';

/**
 * Mensaje comprensible para los errores de finalización.
 */
export const mensajeErrorFinalizacion = (error, fallback) => {
  if (!error) return fallback;

  if (error.status === 404) {
    return 'La reserva no existe o no está asociada a tu cuenta. Actualiza el listado.';
  }

  if (error.status === 401 || error.status === 403 || error.esErrorAutenticacion) {
    return (
      error.message ||
      'Tu sesión ha expirado o no tienes permisos para finalizar esta reserva.'
    );
  }

  return error.message || fallback;
};
