const API_URL = 'http://localhost:8080/api/disponibilidad';

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

export const listarDisponibilidad = (token) =>
  solicitar(token, API_URL, { method: 'GET' }, 'Error al consultar la disponibilidad');

export const crearDisponibilidad = (token, datos) =>
  solicitar(
    token,
    API_URL,
    { method: 'POST', body: JSON.stringify(datos) },
    'Error al registrar el horario de atención'
  );

export const eliminarDisponibilidad = (token, idDisponibilidad) =>
  solicitar(
    token,
    `${API_URL}/${idDisponibilidad}`,
    { method: 'DELETE' },
    'Error al eliminar el horario de atención'
  );

export const listarPeriodosNoDisponibles = (token) =>
  solicitar(
    token,
    `${API_URL}/periodos`,
    { method: 'GET' },
    'Error al consultar los periodos no disponibles'
  );

export const crearPeriodoNoDisponible = (token, datos) =>
  solicitar(
    token,
    `${API_URL}/periodos`,
    { method: 'POST', body: JSON.stringify(datos) },
    'Error al registrar el periodo no disponible'
  );

export const eliminarPeriodoNoDisponible = (token, idPeriodo) =>
  solicitar(
    token,
    `${API_URL}/periodos/${idPeriodo}`,
    { method: 'DELETE' },
    'Error al eliminar el periodo no disponible'
  );
