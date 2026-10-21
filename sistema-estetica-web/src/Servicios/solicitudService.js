const API_URL = 'http://localhost:8080/api/solicitudes';

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

export const listarSolicitudesCliente = (token) =>
  solicitar(token, `${API_URL}/mis-solicitudes`, { method: 'GET' }, 'Error al consultar tus solicitudes');

export const listarSolicitudesProveedor = (token) =>
  solicitar(token, `${API_URL}/recibidas`, { method: 'GET' }, 'Error al consultar las solicitudes recibidas');

export const consultarSolicitud = (token, idSolicitud) =>
  solicitar(token, `${API_URL}/${idSolicitud}`, { method: 'GET' }, 'Error al consultar la solicitud');

export const responderSolicitud = (token, idSolicitud, datos) =>
  solicitar(
    token,
    `${API_URL}/${idSolicitud}/responder`,
    { method: 'PUT', body: JSON.stringify(datos) },
    'Error al responder la solicitud'
  );

export const responderContrapropuesta = (token, idSolicitud, datos) =>
  solicitar(
    token,
    `${API_URL}/${idSolicitud}/responder-contrapropuesta`,
    { method: 'PUT', body: JSON.stringify(datos) },
    'Error al responder la contrapropuesta'
  );

export const cancelarSolicitud = (token, idSolicitud, motivo) =>
  solicitar(
    token,
    `${API_URL}/${idSolicitud}/cancelar`,
    { method: 'PUT', body: JSON.stringify({ motivo }) },
    'Error al cancelar la solicitud'
  );

export const completarSolicitud = (token, idSolicitud) =>
  solicitar(
    token,
    `${API_URL}/${idSolicitud}/completar`,
    { method: 'PUT' },
    'Error al completar la reserva'
  );

export const consultarAgenda = (token, { desde, hasta } = {}) => {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const query = params.toString();

  return solicitar(
    token,
    `${API_URL}/agenda${query ? `?${query}` : ''}`,
    { method: 'GET' },
    'Error al consultar la agenda'
  );
};
