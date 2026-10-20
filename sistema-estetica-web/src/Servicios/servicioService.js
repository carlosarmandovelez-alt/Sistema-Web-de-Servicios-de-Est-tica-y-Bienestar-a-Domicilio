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
 * El proveedor se identifica a través del token JWT (Authentication.getName()).
 * No se envía id_proveedor en el cuerpo.
 *
 * Body: { id_categoria, nombre, descripcion, duracion_minutos, precio, estado? }
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
