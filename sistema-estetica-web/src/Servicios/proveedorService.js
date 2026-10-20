const API_URL = 'http://localhost:8080/api/proveedores';

/**
 * Procesa la respuesta de error del backend y lanza una excepción estructurada.
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
 * Consulta el perfil completo del proveedor autenticado (incluye sus zonas de atención).
 * GET /api/proveedores/perfil
 */
export const consultarPerfilProveedor = async (token) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
    error.esErrorAutenticacion = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${API_URL}/perfil`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al consultar el perfil del proveedor');
  }

  return await response.json();
};

/**
 * Actualiza los datos profesionales del proveedor autenticado.
 * PUT /api/proveedores/perfil
 * Body: { nombre, apellido, telefono, perfil_profesional }
 */
export const actualizarPerfilProveedor = async (token, datosPerfil) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
    error.esErrorAutenticacion = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${API_URL}/perfil`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(datosPerfil),
    });
  } catch (err) {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al actualizar el perfil profesional');
  }

  return await response.json();
};

/**
 * Actualiza la lista de zonas de atención del proveedor autenticado.
 * PUT /api/proveedores/zonas
 * Body: [ { ciudad, barrio_sector }, ... ]
 */
export const actualizarZonasAtencion = async (token, zonas) => {
  if (!token) {
    const error = new Error('No hay una sesión activa con token');
    error.esErrorAutenticacion = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${API_URL}/zonas`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(zonas),
    });
  } catch (err) {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, 'Error al actualizar las zonas de atención');
  }

  return await response.json();
};



