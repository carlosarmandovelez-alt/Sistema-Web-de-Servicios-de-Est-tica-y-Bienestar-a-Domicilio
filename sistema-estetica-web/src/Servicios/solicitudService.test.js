import { crearSolicitud } from './solicitudService';

const respuesta = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const DATOS = {
  id_servicio: 100,
  fecha_hora_solicitada: '2026-11-12T13:00:00',
  direccion_texto: 'Calle 100 # 20-30',
  barrio_sector: 'Usaquén',
  informacion_complementaria: 'Apto 301',
  observaciones: 'Tocar el timbre',
};

describe('HU-012: solicitudService', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  test('envía el JWT y únicamente los campos del DTO real', async () => {
    const solicitudCreada = { id_solicitud: 501, estado: 'pendiente' };
    global.fetch = jest.fn().mockResolvedValue(respuesta(201, solicitudCreada));

    await expect(crearSolicitud('token-cliente', DATOS)).resolves.toEqual(
      solicitudCreada
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/solicitudes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-cliente',
        },
        body: JSON.stringify(DATOS),
      }
    );
  });

  test('propaga los errores de validación por campo del backend', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(400, {
        fecha_hora_solicitada: 'La fecha y hora solicitada es obligatoria',
        direccion_texto: 'La dirección de atención es obligatoria',
      })
    );

    await expect(crearSolicitud('token-cliente', DATOS)).rejects.toMatchObject({
      status: 400,
      fieldErrors: {
        fecha_hora_solicitada: 'La fecha y hora solicitada es obligatoria',
        direccion_texto: 'La dirección de atención es obligatoria',
      },
    });
  });

  test('conserva el mensaje de disponibilidad del backend', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(400, {
        error:
          'El horario solicitado no se encuentra dentro de la disponibilidad del proveedor',
      })
    );

    await expect(crearSolicitud('token-cliente', DATOS)).rejects.toMatchObject({
      status: 400,
      message:
        'El horario solicitado no se encuentra dentro de la disponibilidad del proveedor',
    });
  });

  test('marca el 403 como error de autenticación, igual que hace el backend', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(403, {
        error: 'Acceso denegado: no tiene permisos para realizar esta operación',
      })
    );

    await expect(crearSolicitud('token-cliente', DATOS)).rejects.toMatchObject({
      status: 403,
      esErrorAutenticacion: true,
    });
  });

  test('no expone detalles internos en un error 500', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(500, { error: 'Internal Server Error', stack: 'detalle interno' })
    );

    await expect(crearSolicitud('token-cliente', DATOS)).rejects.toMatchObject({
      status: 500,
      message: 'Error al crear la solicitud de servicio',
    });
  });

  test('convierte un fallo de red en un mensaje comprensible', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(crearSolicitud('token-cliente', DATOS)).rejects.toThrow(
      'No fue posible conectar con el servidor. Verifica tu conexión a internet.'
    );
  });

  test('no llama al backend cuando no hay token', async () => {
    global.fetch = jest.fn();

    await expect(crearSolicitud(null, DATOS)).rejects.toMatchObject({
      status: 401,
      esErrorAutenticacion: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
