const API_URL = 'http://localhost:8080/api/proveedores/servicios';
const API_CATEGORIAS_URL = 'http://localhost:8080/api/categorias';

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
  } catch {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, fallbackMensaje);
  }

  return await response.json();
};

export const obtenerCategorias = async () => {
  let response;
  try {
    response = await fetch(API_CATEGORIAS_URL);
  } catch {
    throw new Error('No fue posible conectar con el servidor para obtener las categorías.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al obtener las categorías');
  }

  return await response.json();
};

export const obtenerMisServicios = async (token) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/mis-servicios`,
    { method: 'GET' },
    'Error al consultar el catálogo de servicios'
  );
};

export const consultarServicio = async (token, idServicio) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}`,
    { method: 'GET' },
    'Error al consultar el servicio'
  );
};

export const actualizarServicio = async (token, idServicio, datos) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}`,
    { method: 'PUT', body: JSON.stringify(datos) },
    'Error al actualizar el servicio'
  );
};

export const cambiarEstadoServicio = async (token, idServicio, nuevoEstado) => {
  return await peticionAutenticada(
    token,
    `${API_URL}/${idServicio}/estado?estado=${encodeURIComponent(nuevoEstado)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ estado: nuevoEstado }),
    },
    'Error al cambiar el estado del servicio'
  );
};
