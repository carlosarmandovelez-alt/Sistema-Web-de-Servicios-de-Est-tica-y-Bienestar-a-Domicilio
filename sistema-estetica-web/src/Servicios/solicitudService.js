const API_URL = 'http://localhost:8080/api/solicitudes';

/**
 * HU-012: creación de solicitudes de servicio.
 *
 * Contrato real del backend (verificado en `solicitudController` y
 * `crearSolicitudDTO`):
 *
 * POST /api/solicitudes
 * Authorization: Bearer <JWT del Cliente>
 * Body: {
 *   id_servicio: number,
 *   fecha_hora_solicitada: "AAAA-MM-DDTHH:mm:ss",
 *   direccion_texto: string,
 *   barrio_sector: string|null,
 *   informacion_complementaria: string|null,
 *   observaciones: string|null
 * }
 *
 * El backend obtiene el Cliente autenticado desde el JWT, deriva el Proveedor
 * del servicio y guarda la copia de nombre, precio y duración. El frontend no
 * envía id_cliente, id_proveedor, precio, duración, estado ni fechas de
 * auditoría.
 */

const manejarErrorRespuesta = async (response, fallbackMensaje) => {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const error = new Error();
  error.status = response.status;

  if (response.status === 401 || response.status === 403) {
    error.message =
      data?.error ||
      data?.message ||
      data?.mensaje ||
      'No tienes autorización o tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    error.esErrorAutenticacion = true;
    throw error;
  }

  // Los errores internos del servidor no se exponen al Cliente.
  if (response.status >= 500) {
    error.message = fallbackMensaje;
    throw error;
  }

  if (data && typeof data === 'object' && Object.keys(data).length > 0) {
    // Errores de validación por campo: { campo: "mensaje", ... }
    if (!data.error && !data.message && !data.mensaje) {
      error.fieldErrors = data;
      error.message = Object.values(data).filter(Boolean).join('. ');
      throw error;
    }

    error.message = data.error || data.message || data.mensaje || fallbackMensaje;
    throw error;
  }

  error.message = fallbackMensaje;
  throw error;
};

/**
 * Crea una solicitud de servicio para el Cliente autenticado.
 *
 * @param {string} token JWT del Cliente.
 * @param {{
 *   id_servicio: number,
 *   fecha_hora_solicitada: string,
 *   direccion_texto: string,
 *   barrio_sector: string|null,
 *   informacion_complementaria: string|null,
 *   observaciones: string|null
 * }} datos
 * @returns {Promise<Object>} solicitudResponseDTO confirmada por el backend.
 */
export const crearSolicitud = async (token, datos) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
    error.status = 401;
    error.esErrorAutenticacion = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(datos),
    });
  } catch {
    throw new Error(
      'No fue posible conectar con el servidor. Verifica tu conexión a internet.'
    );
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al crear la solicitud de servicio');
  }

  try {
    return await response.json();
  } catch {
    throw new Error('El servidor devolvió una respuesta no válida. Inténtalo de nuevo.');
  }
};
