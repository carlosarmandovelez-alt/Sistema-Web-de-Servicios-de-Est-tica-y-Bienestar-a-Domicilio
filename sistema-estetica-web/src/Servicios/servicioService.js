const API_URL = 'http://localhost:8080/api/categorias';

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
    error.esErrorAutenticacion = true;
    error.message =
      data?.error ||
      data?.message ||
      'No tienes autorización o tu sesión ha expirado.';
    throw error;
  }

  if (response.status >= 500) {
    error.message = fallbackMensaje;
    throw error;
  }

  error.message =
    (data && (data.error || data.message || data.mensaje)) || fallbackMensaje;
  throw error;
};

export const obtenerCategorias = async () => {
  let response;
  try {
    response = await fetch(API_URL);
  } catch {
    throw new Error('No fue posible conectar con el servidor.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al consultar las categorías');
  }

  try {
    return await response.json();
  } catch {
    throw new Error('El servidor devolvió una respuesta no válida.');
  }
};
