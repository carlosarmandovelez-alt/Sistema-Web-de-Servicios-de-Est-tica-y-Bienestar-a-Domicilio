const API_URL = 'http://localhost:8080/api/disponibilidad';

/**
 * HU-011: contratos de disponibilidad definidos por el backend.
 *
 * GET  /api/disponibilidad
 * POST /api/disponibilidad                         (reemplaza la lista completa)
 * GET  /api/disponibilidad/periodos-no-disponibles
 * POST /api/disponibilidad/periodos-no-disponibles
 *
 * Todos los endpoints exigen el JWT del Proveedor autenticado. El backend
 * obtiene el proveedor desde el token; el frontend nunca envía un ID de
 * proveedor.
 */

const manejarErrorRespuesta = async (response, fallbackMensaje) => {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const error = new Error();

  if (response.status === 401 || response.status === 403) {
    error.status = response.status;
    error.message =
      data?.error ||
      data?.message ||
      'No tienes autorización o tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    error.esErrorAutenticacion = true;
    throw error;
  }

  error.status = response.status;

  if (response.status >= 500) {
    error.message = fallbackMensaje;
    throw error;
  }

  if (data && typeof data === 'object') {
    if (!data.error && !data.message && !data.mensaje && Object.keys(data).length > 0) {
      error.fieldErrors = data;
      error.message = Object.values(data).join('. ');
      throw error;
    }

    error.message = data.error || data.message || data.mensaje || fallbackMensaje;
  } else {
    error.message = fallbackMensaje;
  }

  throw error;
};

const peticionAutenticada = async (token, url, opciones = {}, fallbackMensaje) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
    error.status = 401;
    error.esErrorAutenticacion = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(url, {
      ...opciones,
      headers: {
        ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...(opciones.headers || {}),
      },
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
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
 * Consulta los horarios habituales del proveedor autenticado.
 * @returns {Promise<Array<{id:number, dia_semana:string, hora_inicio:string, hora_fin:string}>>}
 */
export const consultarDisponibilidad = async (token, { signal } = {}) => {
  return await peticionAutenticada(
    token,
    API_URL,
    { method: 'GET', signal },
    'Error al consultar la disponibilidad'
  );
};

/**
 * Guarda la disponibilidad completa del proveedor autenticado.
 * El backend reemplaza los horarios anteriores por la lista enviada.
 *
 * @param {Array<{dia_semana:string, hora_inicio:string, hora_fin:string}>} horarios
 */
export const guardarDisponibilidad = async (token, horarios) => {
  return await peticionAutenticada(
    token,
    API_URL,
    {
      method: 'POST',
      body: JSON.stringify(horarios),
    },
    'Error al guardar la disponibilidad'
  );
};

/**
 * Consulta los periodos no disponibles del proveedor autenticado.
 * @returns {Promise<Array<{id:number, fecha_inicio:string, fecha_fin:string, motivo:string|null}>>}
 */
export const consultarPeriodosNoDisponibles = async (token, { signal } = {}) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/periodos-no-disponibles`,
    { method: 'GET', signal },
    'Error al consultar los periodos no disponibles'
  );
};

/**
 * Registra un periodo no disponible para el proveedor autenticado.
 *
 * @param {{fecha_inicio:string, fecha_fin:string, motivo:string|null}} periodo
 */
export const registrarPeriodoNoDisponible = async (token, periodo) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/periodos-no-disponibles`,
    {
      method: 'POST',
      body: JSON.stringify(periodo),
    },
    'Error al registrar el periodo no disponible'
  );
};
