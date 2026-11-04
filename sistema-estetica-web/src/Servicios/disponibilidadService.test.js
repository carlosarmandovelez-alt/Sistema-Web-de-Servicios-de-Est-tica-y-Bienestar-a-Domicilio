import {
  consultarDisponibilidad,
  guardarDisponibilidad,
  consultarPeriodosNoDisponibles,
  registrarPeriodoNoDisponible,
} from './disponibilidadService';

const respuestaError = (status, body) => ({
  ok: false,
  status,
  json: async () => body,
});

const respuestaOk = (body) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

describe('disponibilidadService: contratos y errores de HU-011', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  test('consulta la disponibilidad con el JWT del Proveedor', async () => {
    const datos = [
      { id: 1, dia_semana: 'lunes', hora_inicio: '08:00', hora_fin: '17:00' },
    ];
    global.fetch = jest.fn().mockResolvedValue(respuestaOk(datos));

    const resultado = await consultarDisponibilidad('jwt-proveedor');

    expect(resultado).toEqual(datos);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/disponibilidad',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-proveedor' }),
      })
    );
  });

  test('envía la lista completa de horarios como reemplazo', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuestaOk([]));
    const horarios = [
      { dia_semana: 'lunes', hora_inicio: '08:00', hora_fin: '17:00' },
    ];

    await guardarDisponibilidad('jwt-proveedor', horarios);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/disponibilidad',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(horarios),
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-proveedor',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  test('consulta y registra periodos no disponibles', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuestaOk({ id: 1, fecha_inicio: '2026-11-10', fecha_fin: '2026-11-12', motivo: 'Viaje' })
    );
    const periodo = {
      fecha_inicio: '2026-11-10',
      fecha_fin: '2026-11-12',
      motivo: 'Viaje',
    };

    await registrarPeriodoNoDisponible('jwt-proveedor', periodo);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/disponibilidad/periodos-no-disponibles',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(periodo) })
    );

    global.fetch = jest.fn().mockResolvedValue(respuestaOk([]));
    await consultarPeriodosNoDisponibles('jwt-proveedor');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/disponibilidad/periodos-no-disponibles',
      expect.objectContaining({ method: 'GET' })
    );
  });

  test('marca el 401 como error de autenticación', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuestaError(401, { error: 'No autorizado' })
    );

    await expect(consultarDisponibilidad('jwt-invalido')).rejects.toMatchObject({
      status: 401,
      esErrorAutenticacion: true,
    });
  });

  test('conserva el mensaje de validación del backend en un 400', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuestaError(400, {
        error: 'La hora de inicio debe ser anterior a la hora de fin para el día lunes',
      })
    );

    await expect(
      guardarDisponibilidad('jwt-proveedor', [
        { dia_semana: 'lunes', hora_inicio: '17:00', hora_fin: '08:00' },
      ])
    ).rejects.toMatchObject({
      status: 400,
      message: 'La hora de inicio debe ser anterior a la hora de fin para el día lunes',
    });
  });

  test('expone el 404 para distinguir la falta de soporte del backend', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuestaError(404, { error: 'Not found' })
    );

    await expect(consultarPeriodosNoDisponibles('jwt-proveedor')).rejects.toMatchObject({
      status: 404,
    });
  });

  test('no expone detalles internos en un error 500', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuestaError(500, { error: 'Internal Server Error', stack: 'interno' })
    );

    await expect(consultarDisponibilidad('jwt-proveedor')).rejects.toMatchObject({
      status: 500,
      message: 'Error al consultar la disponibilidad',
    });
  });

  test('convierte un fallo de red en un mensaje comprensible', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(consultarDisponibilidad('jwt-proveedor')).rejects.toThrow(
      'No fue posible conectar con el servidor. Verifica tu conexión a internet.'
    );
  });

  test('rechaza la operación sin token sin llamar al backend', async () => {
    global.fetch = jest.fn();

    await expect(consultarDisponibilidad(null)).rejects.toMatchObject({
      status: 401,
      esErrorAutenticacion: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
