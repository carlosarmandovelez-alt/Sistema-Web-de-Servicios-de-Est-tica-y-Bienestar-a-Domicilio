const API_URL = 'http://localhost:8080/api/exploracion';

const manejarErrorRespuesta = async (response, fallbackMensaje) => {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const error = new Error();
  error.status = response.status;
  error.message = data?.error || data?.message || data?.mensaje || fallbackMensaje;
  throw error;
};

const solicitar = async (url, fallbackMensaje) => {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    await manejarErrorRespuesta(response, fallbackMensaje);
  }

  return response.status === 204 ? null : await response.json();
};

export const listarProveedores = () =>
  solicitar(`${API_URL}/proveedores`, 'Error al consultar los proveedores disponibles');

export const listarServicios = () =>
  solicitar(`${API_URL}/servicios`, 'Error al consultar los servicios disponibles');

export const buscarServiciosPorNombre = (nombre) =>
  solicitar(
    `${API_URL}/servicios/buscar?nombre=${encodeURIComponent(nombre)}`,
    'Error al buscar servicios por nombre'
  );

export const buscarServiciosPorCategoria = (idCategoria) =>
  solicitar(
    `${API_URL}/servicios/categoria/${idCategoria}`,
    'Error al buscar servicios por categoría'
  );

export const consultarProveedor = (idProveedor) =>
  solicitar(`${API_URL}/proveedores/${idProveedor}`, 'Error al consultar el perfil del proveedor');

export const consultarServicio = (idServicio) =>
  solicitar(`${API_URL}/servicios/${idServicio}`, 'Error al consultar el detalle del servicio');
