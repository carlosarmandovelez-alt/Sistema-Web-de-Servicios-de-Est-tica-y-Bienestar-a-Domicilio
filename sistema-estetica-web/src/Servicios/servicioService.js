const API_URL = 'http://localhost:8080/api/servicios';
const CATEGORIAS_URL = 'http://localhost:8080/api/categorias';

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

const solicitar = async (token, url, opciones, fallbackMensaje) => {
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
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opciones?.headers || {}),
      },
    });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, fallbackMensaje);
  }

  return response.status === 204 ? null : await response.json();
};

export const listarCategorias = (token) =>
  solicitar(token, CATEGORIAS_URL, { method: 'GET' }, 'Error al consultar las categorías');

export const listarMisServicios = (token) =>
  solicitar(
    token,
    `${API_URL}/mis-servicios`,
    { method: 'GET' },
    'Error al consultar tu catálogo de servicios'
  );

export const crearServicio = (token, datos) =>
  solicitar(
    token,
    API_URL,
    { method: 'POST', body: JSON.stringify(datos) },
    'Error al registrar el servicio'
  );

export const actualizarServicio = (token, idServicio, datos) =>
  solicitar(
    token,
    `${API_URL}/${idServicio}`,
    { method: 'PUT', body: JSON.stringify(datos) },
    'Error al actualizar el servicio'
  );

export const cambiarEstadoServicio = (token, idServicio, estado) =>
  solicitar(
    token,
    `${API_URL}/${idServicio}/estado`,
    { method: 'PATCH', body: JSON.stringify({ estado }) },
    'Error al cambiar el estado del servicio'
  );

export const listarMultimedia = (token, idServicio) =>
  solicitar(
    token,
    `${API_URL}/${idServicio}/multimedia`,
    { method: 'GET' },
    'Error al consultar el contenido multimedia'
  );

export const agregarMultimedia = (token, idServicio, datos) =>
  solicitar(
    token,
    `${API_URL}/${idServicio}/multimedia`,
    { method: 'POST', body: JSON.stringify(datos) },
    'Error al agregar el contenido multimedia'
  );

export const eliminarMultimedia = (token, idServicio, idMultimedia) =>
  solicitar(
    token,
    `${API_URL}/${idServicio}/multimedia/${idMultimedia}`,
    { method: 'DELETE' },
    'Error al eliminar el contenido multimedia'
  );

export const listarInsumos = (token, idServicio) =>
  solicitar(
    token,
    `${API_URL}/${idServicio}/insumos`,
    { method: 'GET' },
    'Error al consultar los insumos'
  );

export const agregarInsumo = (token, idServicio, datos) =>
  solicitar(
    token,
    `${API_URL}/${idServicio}/insumos`,
    { method: 'POST', body: JSON.stringify(datos) },
    'Error al agregar el insumo'
  );

export const eliminarInsumo = (token, idServicio, idInsumo) =>
  solicitar(
    token,
    `${API_URL}/${idServicio}/insumos/${idInsumo}`,
    { method: 'DELETE' },
    'Error al eliminar el insumo'
  );
