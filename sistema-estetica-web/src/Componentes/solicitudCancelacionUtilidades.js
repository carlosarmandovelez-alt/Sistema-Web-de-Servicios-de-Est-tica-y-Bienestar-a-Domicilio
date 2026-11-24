/**
 * Utilidades de presentación y validación para HU-017.
 *
 * El backend es la autoridad final: estas funciones solo evitan mostrar
 * acciones no permitidas y mejoran la validación del formulario. La
 * autorización, el estado real y la obligatoriedad del motivo se vuelven a
 * comprobar en el servidor.
 */

export const MOTIVO_CANCELACION_MAX = 255;

const ESTADOS_CANCELABLES_CLIENTE = ['pendiente', 'sugerida', 'aceptada'];
const ESTADOS_CANCELABLES_PROVEEDOR = ['aceptada'];

const normalizarEstado = (estado) =>
  typeof estado === 'string' ? estado.trim().toLowerCase() : '';

/**
 * HU-017: el Cliente puede cancelar solicitudes Pendiente, Sugerida y
 * reservas Aceptada. Completada, Cancelada y Rechazada no se ofrecen.
 */
export const puedeCancelarComoCliente = (solicitud) =>
  ESTADOS_CANCELABLES_CLIENTE.includes(normalizarEstado(solicitud?.estado));

/**
 * HU-017: el Proveedor solo puede cancelar reservas Aceptada. Los criterios
 * no le atribuyen la cancelación de solicitudes Pendiente o Sugerida.
 */
export const puedeCancelarComoProveedor = (solicitud) =>
  ESTADOS_CANCELABLES_PROVEEDOR.includes(normalizarEstado(solicitud?.estado));

/**
 * Valida el motivo antes de llamar al backend.
 *
 * @returns {{valido: boolean, motivo: string, error: string|null}}
 */
export const validarMotivoCancelacion = (motivo) => {
  const texto = typeof motivo === 'string' ? motivo.trim() : '';

  if (!texto) {
    return {
      valido: false,
      motivo: '',
      error: 'El motivo de cancelación es obligatorio.',
    };
  }

  if (texto.length > MOTIVO_CANCELACION_MAX) {
    return {
      valido: false,
      motivo: texto,
      error: `El motivo de cancelación no puede superar los ${MOTIVO_CANCELACION_MAX} caracteres.`,
    };
  }

  return { valido: true, motivo: texto, error: null };
};

/**
 * Mensaje comprensible para los errores de la operación de cancelación.
 */
export const mensajeErrorCancelacion = (error, fallback) => {
  if (!error) return fallback;

  if (error.status === 404) {
    return 'La solicitud no existe o no está asociada a tu cuenta.';
  }

  if (error.status === 401 || error.status === 403 || error.esErrorAutenticacion) {
    return (
      error.message ||
      'Tu sesión ha expirado o no tienes permisos para cancelar esta solicitud.'
    );
  }

  return error.message || fallback;
};
