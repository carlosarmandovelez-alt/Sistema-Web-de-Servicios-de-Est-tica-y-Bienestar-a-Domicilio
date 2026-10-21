const API_URL = 'http://localhost:8080/api/servicios';
const API_CATEGORIAS_URL = 'http://localhost:8080/api/categorias';

/**
 * Procesa la respuesta de error del backend y lanza una excepción estructurada.
 * Sigue el mismo patrón que proveedorService.js.
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

  if (data && typeof data === 'object') {
    // Si el backend devuelve un mapa de validaciones por campo: { campo: "mensaje", ... }
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
 * Obtiene la lista de categorías registradas en el backend.
 * GET /api/categorias
 *
 * @returns {Promise<Array<{ id_categoria: number, nombre: string }>>}
 */
export const obtenerCategorias = async () => {
  let response;
  try {
    response = await fetch(API_CATEGORIAS_URL);
  } catch (err) {
    throw new Error('No fue posible conectar con el servidor para obtener las categorías.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al obtener las categorías');
  }

  return await response.json();
};

/**
 * Obtiene el catálogo de servicios propio del proveedor autenticado.
 * GET /api/servicios/mis-servicios
 *
 * @param {string} token - JWT del proveedor autenticado
 * @returns {Promise<Array<Object>>} Lista de servicioResponseDTO
 */
export const obtenerMisServicios = async (token) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
    error.esErrorAutenticacion = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${API_URL}/mis-servicios`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al consultar el catálogo de servicios');
  }

  return await response.json();
};

/**
 * Registra un nuevo servicio en el catálogo del proveedor autenticado.
 * POST /api/servicios
 *
 * @param {string} token - JWT del proveedor autenticado
 * @param {{ id_categoria: number, nombre: string, descripcion: string,
 *           duracion_minutos: number, precio: string|number, estado?: string }} datos - Datos del servicio
 * @returns {Promise<Object>} servicioResponseDTO devuelto por el servidor
 */
export const registrarServicio = async (token, datos) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
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
  } catch (err) {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al registrar el servicio');
  }

  return await response.json();
};

/**
 * HU-007 CA-01: Consulta la información detallada de un servicio propio.
 * GET /api/servicios/{id}
 *
 * @param {string} token - JWT del proveedor autenticado
 * @param {number|string} idServicio - ID del servicio
 * @returns {Promise<Object>} servicioResponseDTO
 */
export const consultarServicio = async (token, idServicio) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
    error.esErrorAutenticacion = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${API_URL}/${idServicio}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al consultar el servicio');
  }

  return await response.json();
};

/**
 * HU-007 CA-02: Actualiza la información de un servicio propio.
 * PUT /api/servicios/{id}
 *
 * @param {string} token - JWT del proveedor autenticado
 * @param {number|string} idServicio - ID del servicio a actualizar
 * @param {{ id_categoria: number, nombre: string, descripcion: string,
 *           duracion_minutos: number, precio: string|number, estado?: string }} datos - Datos actualizados
 * @returns {Promise<Object>} servicioResponseDTO
 */
export const actualizarServicio = async (token, idServicio, datos) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
    error.esErrorAutenticacion = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${API_URL}/${idServicio}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(datos),
    });
  } catch (err) {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al actualizar el servicio');
  }

  return await response.json();
};

/**
 * HU-007 CA-03 y CA-04: Cambia entre Activo e Inactivo el estado de un servicio propio.
 * PATCH /api/servicios/{id}/estado
 *
 * @param {string} token - JWT del proveedor autenticado
 * @param {number|string} idServicio - ID del servicio
 * @param {string} nuevoEstado - "activo" | "inactivo"
 * @returns {Promise<Object>} servicioResponseDTO
 */
export const cambiarEstadoServicio = async (token, idServicio, nuevoEstado) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
    error.esErrorAutenticacion = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${API_URL}/${idServicio}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
  } catch (err) {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al cambiar el estado del servicio');
  }

  return await response.json();
};

// ============================================================
// HU-008: Información complementaria del servicio
// ============================================================

/**
 * Ejecuta una petición autenticada y procesa la respuesta del backend.
 * Para DELETE (204) devuelve null; para el resto, el JSON recibido.
 */
const peticionAutenticada = async (token, url, opciones = {}, fallbackMensaje) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
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
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, fallbackMensaje);
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
};

/**
 * HU-008 CA-01 y CA-02: Lista las fotografías y videos asociados a un servicio propio.
 * GET /api/servicios/{idServicio}/multimedia
 */
export const listarMultimedia = async (token, idServicio) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}/multimedia`,
    { method: 'GET' },
    'Error al consultar la multimedia del servicio'
  );
};

/**
 * HU-008 CA-01 o CA-02: Asocia una fotografía o video a un servicio propio.
 * POST /api/servicios/{idServicio}/multimedia
 *
 * @param {{ tipo_archivo: 'foto'|'video', url_archivo: string, orden?: number|null }} datos
 */
export const agregarMultimedia = async (token, idServicio, datos) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}/multimedia`,
    { method: 'POST', body: JSON.stringify(datos) },
    'Error al asociar la fotografía o video'
  );
};

/**
 * HU-008 CA-01 o CA-02: Actualiza una fotografía o video de un servicio propio.
 * PUT /api/servicios/{idServicio}/multimedia/{idMultimedia}
 */
export const actualizarMultimedia = async (token, idServicio, idMultimedia, datos) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}/multimedia/${idMultimedia}`,
    { method: 'PUT', body: JSON.stringify(datos) },
    'Error al actualizar la fotografía o video'
  );
};

/**
 * HU-008 CA-01 o CA-02: Elimina una fotografía o video de un servicio propio.
 * DELETE /api/servicios/{idServicio}/multimedia/{idMultimedia}
 */
export const eliminarMultimedia = async (token, idServicio, idMultimedia) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}/multimedia/${idMultimedia}`,
    { method: 'DELETE' },
    'Error al eliminar la fotografía o video'
  );
};

/**
 * HU-008 CA-03: Lista los productos, insumos y equipos de un servicio propio.
 * GET /api/servicios/{idServicio}/insumos
 */
export const listarInsumos = async (token, idServicio) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}/insumos`,
    { method: 'GET' },
    'Error al consultar los productos, insumos o equipos del servicio'
  );
};

/**
 * HU-008 CA-03: Registra un producto, insumo o equipo en un servicio propio.
 * POST /api/servicios/{idServicio}/insumos
 *
 * @param {{ nombre: string, tipo: 'producto'|'insumo'|'equipo' }} datos
 */
export const agregarInsumo = async (token, idServicio, datos) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}/insumos`,
    { method: 'POST', body: JSON.stringify(datos) },
    'Error al registrar el producto, insumo o equipo'
  );
};

/**
 * HU-008 CA-03: Actualiza un producto, insumo o equipo de un servicio propio.
 * PUT /api/servicios/{idServicio}/insumos/{idInsumo}
 */
export const actualizarInsumo = async (token, idServicio, idInsumo, datos) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}/insumos/${idInsumo}`,
    { method: 'PUT', body: JSON.stringify(datos) },
    'Error al actualizar el producto, insumo o equipo'
  );
};

/**
 * HU-008 CA-03: Elimina un producto, insumo o equipo de un servicio propio.
 * DELETE /api/servicios/{idServicio}/insumos/{idInsumo}
 */
export const eliminarInsumo = async (token, idServicio, idInsumo) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}/insumos/${idInsumo}`,
    { method: 'DELETE' },
    'Error al eliminar el producto, insumo o equipo'
  );
};
