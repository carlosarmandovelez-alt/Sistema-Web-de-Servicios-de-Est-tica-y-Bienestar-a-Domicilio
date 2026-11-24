import {
  aceptarContrapropuesta,
  cancelarSolicitudCliente,
  cancelarSolicitudProveedor,
  consultarDetalleRecibida,
  consultarDetalleSolicitud,
  consultarMisSolicitudes,
  consultarSolicitudesRecibidas,
  crearSolicitud,
  rechazarContrapropuesta,
} from './solicitudService';

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

describe('HU-013: consultas de solicitudes del Cliente', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  test('consulta el listado propio con GET y el JWT de la sesión', async () => {
    const lista = [
      { id_solicitud: 4, estado: 'pendiente' },
      { id_solicitud: 5, estado: 'aceptada' },
    ];
    global.fetch = jest.fn().mockResolvedValue(respuesta(200, lista));

    await expect(consultarMisSolicitudes('token-cliente')).resolves.toEqual(lista);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/solicitudes/mis-solicitudes',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer token-cliente',
        },
      }
    );
  });

  test('consulta el detalle propio por identificador', async () => {
    const detalle = { id_solicitud: 4, estado: 'pendiente' };
    global.fetch = jest.fn().mockResolvedValue(respuesta(200, detalle));

    await expect(
      consultarDetalleSolicitud('token-cliente', 4)
    ).resolves.toEqual(detalle);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/solicitudes/mis-solicitudes/4',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer token-cliente',
        },
      }
    );
  });

  test('propaga el 404 de una solicitud inexistente o ajena', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(404, {
        error: 'La solicitud no existe o no tiene permiso para verla',
      })
    );

    await expect(
      consultarDetalleSolicitud('token-cliente', 999)
    ).rejects.toMatchObject({
      status: 404,
      message: 'La solicitud no existe o no tiene permiso para verla',
    });
  });

  test('marca el 403 como error de autenticación', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(403, {
        error: 'Acceso denegado: no tiene permisos para realizar esta operación',
      })
    );

    await expect(consultarMisSolicitudes('token-cliente')).rejects.toMatchObject({
      status: 403,
      esErrorAutenticacion: true,
    });
  });

  test('rechaza una respuesta de listado que no sea un arreglo', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuesta(200, { mensaje: 'ok' }));

    await expect(consultarMisSolicitudes('token-cliente')).rejects.toThrow(
      'El servidor devolvió una respuesta no válida. Inténtalo de nuevo.'
    );
  });

  test('propaga la cancelación de la petición', async () => {
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(
      consultarMisSolicitudes('token-cliente', { signal: new AbortController().signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  test('no llama al backend cuando no hay token', async () => {
    global.fetch = jest.fn();

    await expect(consultarMisSolicitudes(null)).rejects.toMatchObject({
      status: 401,
      esErrorAutenticacion: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('HU-014: consultas de solicitudes recibidas por el Proveedor', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  test('consulta las recibidas con GET y el JWT del Proveedor, sin enviar un id de Proveedor', async () => {
    const lista = [
      { id_solicitud: 4, id_proveedor: 5, estado: 'pendiente' },
      { id_solicitud: 5, id_proveedor: 5, estado: 'aceptada' },
    ];
    global.fetch = jest.fn().mockResolvedValue(respuesta(200, lista));

    await expect(consultarSolicitudesRecibidas('token-proveedor')).resolves.toEqual(
      lista
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/solicitudes/recibidas',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer token-proveedor',
        },
      }
    );
    const [, opciones] = global.fetch.mock.calls[0];
    expect(JSON.stringify(opciones)).not.toContain('id_proveedor');
  });

  test('consulta el detalle de una solicitud recibida por identificador', async () => {
    const detalle = { id_solicitud: 4, id_proveedor: 5, estado: 'pendiente' };
    global.fetch = jest.fn().mockResolvedValue(respuesta(200, detalle));

    await expect(
      consultarDetalleRecibida('token-proveedor', 4)
    ).resolves.toEqual(detalle);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/solicitudes/recibidas/4',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer token-proveedor',
        },
      }
    );
  });

  test('propaga el 404 de una solicitud ajena o inexistente', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(404, {
        error: 'La solicitud no existe o no está dirigida a usted',
      })
    );

    await expect(
      consultarDetalleRecibida('token-proveedor', 999)
    ).rejects.toMatchObject({
      status: 404,
      message: 'La solicitud no existe o no está dirigida a usted',
    });
  });

  test('marca el 403 como error de autenticación', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(403, {
        error: 'Acceso denegado: no tiene permisos para realizar esta operación',
      })
    );

    await expect(
      consultarSolicitudesRecibidas('token-proveedor')
    ).rejects.toMatchObject({
      status: 403,
      esErrorAutenticacion: true,
    });
  });

  test('rechaza una respuesta de listado que no sea un arreglo', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuesta(200, { mensaje: 'ok' }));

    await expect(
      consultarSolicitudesRecibidas('token-proveedor')
    ).rejects.toThrow(
      'El servidor devolvió una respuesta no válida. Inténtalo de nuevo.'
    );
  });

  test('propaga la cancelación de la petición', async () => {
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(
      consultarSolicitudesRecibidas('token-proveedor', {
        signal: new AbortController().signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  test('no llama al backend cuando no hay token de Proveedor', async () => {
    global.fetch = jest.fn();

    await expect(consultarSolicitudesRecibidas(null)).rejects.toMatchObject({
      status: 401,
      esErrorAutenticacion: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('HU-016: respuesta del Cliente a la contrapropuesta', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  test('acepta la contrapropuesta con PATCH autenticado del Cliente', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(200, { id_solicitud: 7, estado: 'aceptada' })
    );

    const data = await aceptarContrapropuesta('token-cliente', 7);

    expect(data).toEqual({ id_solicitud: 7, estado: 'aceptada' });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/solicitudes/mis-solicitudes/7/aceptar-propuesta',
      expect.objectContaining({
        method: 'PATCH',
        headers: { Authorization: 'Bearer token-cliente' },
      })
    );
  });

  test('rechaza la contrapropuesta con un cuerpo vacío cuando no hay motivo', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(200, { id_solicitud: 7, estado: 'cancelada' })
    );

    const data = await rechazarContrapropuesta('token-cliente', 7);

    expect(data).toEqual({ id_solicitud: 7, estado: 'cancelada' });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/solicitudes/mis-solicitudes/7/rechazar-propuesta',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-cliente',
        },
        body: '{}',
      })
    );
  });

  test('incluye el motivo cuando el Cliente lo envía', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(200, { id_solicitud: 7, estado: 'cancelada' })
    );

    await rechazarContrapropuesta('token-cliente', 7, 'Ya no lo necesito');

    const [, opciones] = global.fetch.mock.calls[0];
    expect(JSON.parse(opciones.body)).toEqual({ motivo_rechazo: 'Ya no lo necesito' });
  });

  test('no llama al backend sin token de Cliente', async () => {
    global.fetch = jest.fn();

    await expect(aceptarContrapropuesta(null, 7)).rejects.toMatchObject({
      status: 401,
      esErrorAutenticacion: true,
    });
    await expect(rechazarContrapropuesta(undefined, 7)).rejects.toMatchObject({
      status: 401,
      esErrorAutenticacion: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('propaga el error cuando el horario ya no está disponible', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(400, {
        error:
          'El horario solicitado no se encuentra dentro de la disponibilidad del proveedor',
      })
    );

    await expect(aceptarContrapropuesta('token-cliente', 7)).rejects.toMatchObject({
      status: 400,
      message:
        'El horario solicitado no se encuentra dentro de la disponibilidad del proveedor',
    });
  });
});

describe('HU-017: cancelación de solicitud o reserva', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  test('el Cliente cancela con PATCH autenticado y envía el motivo', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(200, {
        id_solicitud: 17,
        estado: 'cancelada',
        motivo_rechazo_cancelacion: 'Ya no lo necesito',
      })
    );

    const data = await cancelarSolicitudCliente(
      'token-cliente',
      17,
      'Ya no lo necesito'
    );

    expect(data).toEqual({
      id_solicitud: 17,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: 'Ya no lo necesito',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/solicitudes/mis-solicitudes/17/cancelar',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-cliente',
        },
        body: JSON.stringify({ motivo_rechazo: 'Ya no lo necesito' }),
      })
    );
  });

  test('el Proveedor cancela una reserva con PATCH autenticado', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(200, {
        id_solicitud: 17,
        estado: 'cancelada',
        motivo_rechazo_cancelacion: 'No podré asistir',
      })
    );

    const data = await cancelarSolicitudProveedor(
      'token-proveedor',
      17,
      'No podré asistir'
    );

    expect(data.estado).toBe('cancelada');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/solicitudes/recibidas/17/cancelar',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-proveedor',
        },
        body: JSON.stringify({ motivo_rechazo: 'No podré asistir' }),
      })
    );
  });

  test('propaga el mensaje del backend cuando el estado no permite cancelar', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuesta(400, { error: 'La solicitud ya se encuentra cancelada' })
    );

    await expect(
      cancelarSolicitudCliente('token-cliente', 17, 'Motivo nuevo')
    ).rejects.toMatchObject({
      status: 400,
      message: 'La solicitud ya se encuentra cancelada',
    });
  });

  test('no llama al backend sin token para cancelar', async () => {
    global.fetch = jest.fn();

    await expect(
      cancelarSolicitudCliente(null, 17, 'Motivo')
    ).rejects.toMatchObject({
      status: 401,
      esErrorAutenticacion: true,
    });
    await expect(
      cancelarSolicitudProveedor(undefined, 17, 'Motivo')
    ).rejects.toMatchObject({
      status: 401,
      esErrorAutenticacion: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
