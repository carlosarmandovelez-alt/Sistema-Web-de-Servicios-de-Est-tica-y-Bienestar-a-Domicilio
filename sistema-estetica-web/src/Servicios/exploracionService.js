const API_URL = 'http://localhost:8080/api/exploracion';

/**
 * Procesa la respuesta de error del backend y lanza una excepción estructurada.
 * Sigue el mismo patrón que clienteService.js, proveedorService.js y servicioService.js.
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

  // Los errores internos del servidor no se exponen al Cliente.
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

/**
 * Ejecuta una petición GET pública de exploración.
 * Las peticiones de búsqueda aceptan una señal para cancelar respuestas obsoletas.
 */
const peticionPublica = async (url, fallbackMensaje, signal) => {
  let response;
  try {
    response = await fetch(url, signal ? { signal } : undefined);
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw err;
    }
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
 * HU-009 CA-01: Consulta los proveedores disponibles.
 * El backend devuelve únicamente proveedores con al menos un servicio activo.
 * GET /api/exploracion/proveedores
 *
 * @returns {Promise<Array<{ id:number, nombre:string, apellido:string,
 *                            perfil_profesional:string|null }>>}
 */
export const obtenerProveedoresDisponibles = async ({ signal } = {}) => {
  return await peticionPublica(
    `${API_URL}/proveedores`,
    'Error al consultar los proveedores disponibles',
    signal
  );
};

/**
 * Lista los servicios activos registrados en el sistema.
 * GET /api/exploracion/servicios
 *
 * @returns {Promise<Array<Object>>} Lista completa de servicioListadoDTO
 */
export const obtenerServiciosDisponibles = async ({ signal } = {}) => {
  return await peticionPublica(
    `${API_URL}/servicios`,
    'Error al consultar los servicios disponibles',
    signal
  );
};

/**
 * HU-009 CA-02: Busca servicios activos por categoría.
 * GET /api/exploracion/servicios/categoria/{idCategoria}
 *
 * @param {number|string} idCategoria - ID real de la categoría (no el nombre)
 */
export const buscarServiciosPorCategoria = async (idCategoria, { signal } = {}) => {
  return await peticionPublica(
    `${API_URL}/servicios/categoria/${encodeURIComponent(idCategoria)}`,
    'Error al buscar los servicios de la categoría seleccionada',
    signal
  );
};

/**
 * HU-009 CA-03: Busca servicios activos por nombre o parte del nombre.
 * El backend aplica una comparación parcial e insensible a mayúsculas/minúsculas.
 * GET /api/exploracion/servicios/buscar?nombre=...
 *
 * @param {string} nombre - Criterio ya normalizado (sin espacios exteriores)
 */
export const buscarServiciosPorNombre = async (nombre, { signal } = {}) => {
  const criterio = typeof nombre === 'string' ? nombre.trim() : '';
  return await peticionPublica(
    `${API_URL}/servicios/buscar?nombre=${encodeURIComponent(criterio)}`,
    'Error al buscar los servicios por nombre',
    signal
  );
};

/**
 * Consulta el detalle público de un proveedor: perfil, zonas de atención y
 * catálogo de servicios activos. Corresponde a HU-010 y se reutiliza aquí para
 * ampliar la información de las tarjetas de proveedor de HU-009.
 * GET /api/exploracion/proveedores/{idProveedor}
 *
 * @param {number|string} idProveedor
 */
export const consultarProveedorPorId = async (idProveedor) => {
  return await peticionPublica(
    `${API_URL}/proveedores/${encodeURIComponent(idProveedor)}`,
    'Error al consultar la información del proveedor'
  );
};
