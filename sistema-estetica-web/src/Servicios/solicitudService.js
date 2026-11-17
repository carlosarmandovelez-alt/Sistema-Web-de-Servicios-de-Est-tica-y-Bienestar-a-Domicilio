const API_URL = 'http://localhost:8080/api/solicitudes';

/**
 * Contratos reales del backend para solicitudes.
 *
 * HU-012:
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
 * HU-013:
 * GET /api/solicitudes/mis-solicitudes
 * GET /api/solicitudes/mis-solicitudes/{idSolicitud}
 * Authorization: Bearer <JWT del Cliente>
 *
 * HU-014:
 * GET /api/solicitudes/recibidas
 * GET /api/solicitudes/recibidas/{idSolicitud}
 * Authorization: Bearer <JWT del Proveedor>
 *
 * El backend obtiene el usuario autenticado desde el JWT. El frontend nunca
 * envía un id_cliente ni un id_proveedor para autorizar la consulta: la
 * validación de propiedad la realiza el backend.
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

/**
 * Petición GET autenticada para los endpoints de consulta de HU-013.
 * Mantiene el mismo tratamiento de errores que el resto de servicios del
 * proyecto y propaga AbortError para cancelar respuestas obsoletas.
 */
const peticionGetAutenticada = async (token, url, opciones, fallbackMensaje) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
    error.status = 401;
    error.esErrorAutenticacion = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      ...(opciones?.signal ? { signal: opciones.signal } : {}),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error(
      'No fue posible conectar con el servidor. Verifica tu conexión a internet.'
    );
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, fallbackMensaje);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('El servidor devolvió una respuesta no válida. Inténtalo de nuevo.');
  }
};

/**
 * HU-013 CA-01: consulta las solicitudes y reservas del Cliente autenticado.
 * El backend determina el Cliente desde el JWT; no se envía ningún id.
 *
 * @param {string} token JWT del Cliente.
 * @param {{ signal?: AbortSignal }} opciones
 * @returns {Promise<Array<Object>>} Lista de solicitudResponseDTO.
 */
export const consultarMisSolicitudes = async (token, { signal } = {}) => {
  const data = await peticionGetAutenticada(
    token,
    `${API_URL}/mis-solicitudes`,
    { signal },
    'Error al consultar tus solicitudes y reservas'
  );

  if (!Array.isArray(data)) {
    throw new Error('El servidor devolvió una respuesta no válida. Inténtalo de nuevo.');
  }

  return data;
};

/**
 * HU-013 CA-02: consulta el detalle de una solicitud propia.
 * El backend valida con `buscarPorIdYCliente` que la solicitud pertenezca al
 * Cliente autenticado. Si no existe o es de otro Cliente, responde 404 con el
 * mensaje "La solicitud no existe o no tiene permiso para verla".
 *
 * @param {string} token JWT del Cliente.
 * @param {number|string} idSolicitud
 * @param {{ signal?: AbortSignal }} opciones
 * @returns {Promise<Object>} solicitudResponseDTO.
 */
export const consultarDetalleSolicitud = async (
  token,
  idSolicitud,
  { signal } = {}
) => {
  const data = await peticionGetAutenticada(
    token,
    `${API_URL}/mis-solicitudes/${encodeURIComponent(idSolicitud)}`,
    { signal },
    'Error al consultar el detalle de la solicitud'
  );

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('El servidor devolvió una respuesta no válida. Inténtalo de nuevo.');
  }

  return data;
};

/**
 * HU-014 CA-01: consulta las solicitudes recibidas por el Proveedor
 * autenticado. El backend determina el Proveedor desde el JWT; no se envía
 * ningún id de Proveedor.
 *
 * @param {string} token JWT del Proveedor.
 * @param {{ signal?: AbortSignal }} opciones
 * @returns {Promise<Array<Object>>} Lista de solicitudResponseDTO.
 */
export const consultarSolicitudesRecibidas = async (token, { signal } = {}) => {
  const data = await peticionGetAutenticada(
    token,
    `${API_URL}/recibidas`,
    { signal },
    'Error al consultar las solicitudes recibidas'
  );

  if (!Array.isArray(data)) {
    throw new Error('El servidor devolvió una respuesta no válida. Inténtalo de nuevo.');
  }

  return data;
};

/**
 * HU-014 CA-02, CA-03, CA-04 y CA-05: consulta el detalle de una solicitud
 * recibida por el Proveedor autenticado. El backend valida con
 * `buscarPorIdYProveedor` que la solicitud esté dirigida a él. Si no existe o
 * pertenece a otro Proveedor, responde 404 con el mensaje
 * "La solicitud no existe o no está dirigida a usted".
 *
 * @param {string} token JWT del Proveedor.
 * @param {number|string} idSolicitud
 * @param {{ signal?: AbortSignal }} opciones
 * @returns {Promise<Object>} solicitudResponseDTO.
 */
export const consultarDetalleRecibida = async (
  token,
  idSolicitud,
  { signal } = {}
) => {
  const data = await peticionGetAutenticada(
    token,
    `${API_URL}/recibidas/${encodeURIComponent(idSolicitud)}`,
    { signal },
    'Error al consultar el detalle de la solicitud recibida'
  );

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('El servidor devolvió una respuesta no válida. Inténtalo de nuevo.');
  }

  return data;
};
