import {
  consultarDisponibilidadProveedor,
  consultarProveedorPorId,
  consultarServicioPorId,
  obtenerProveedoresDisponibles,
} from './exploracionService';

const respuestaError = (status, body) => ({
  ok: false,
  status,
  json: async () => body,
});

describe('exploracionService: clasificación de errores de HU-010', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  test('propaga el 404 del proveedor con su estado y mensaje', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuestaError(404, { error: 'El proveedor no fue encontrado' })
    );

    await expect(consultarProveedorPorId(999)).rejects.toMatchObject({
      status: 404,
      message: 'El proveedor no fue encontrado',
    });
  });

  test('propaga el 404 del servicio con su estado y mensaje', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuestaError(404, { error: 'El servicio no fue encontrado' })
    );

    await expect(consultarServicioPorId(999)).rejects.toMatchObject({
      status: 404,
      message: 'El servicio no fue encontrado',
    });
  });

  test('no expone detalles internos en un error 500', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuestaError(500, { error: 'Internal Server Error', stack: 'detalle interno' })
    );

    await expect(consultarServicioPorId(1)).rejects.toMatchObject({
      status: 500,
      message: 'Error al consultar el detalle del servicio',
    });
  });

  test('marca los errores 401 como errores de autenticación', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuestaError(401, { error: 'No autorizado' })
    );

    await expect(obtenerProveedoresDisponibles()).rejects.toMatchObject({
      status: 401,
      esErrorAutenticacion: true,
    });
  });

  test('convierte un fallo de red en un mensaje comprensible', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(consultarProveedorPorId(1)).rejects.toThrow(
      'No fue posible conectar con el servidor. Verifica tu conexión a internet.'
    );
  });
});

describe('exploracionService: disponibilidad del Proveedor para HU-012', () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  test('consulta la disponibilidad con proveedor, fecha y servicio en la URL', async () => {
    const payload = {
      id_proveedor: 10,
      id_servicio: 100,
      duracion_minutos: 90,
      fecha: '2026-12-02',
      dia_semana: 'miercoles',
      atiende: true,
      motivo: null,
      horas_disponibles: ['10:00', '10:30'],
      horas_ocupadas: ['09:00'],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });

    await expect(
      consultarDisponibilidadProveedor(10, '2026-12-02', 100)
    ).resolves.toEqual(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/exploracion/proveedores/10/disponibilidad?fecha=2026-12-02&idServicio=100',
      undefined
    );
  });

  test('propaga el 404 del backend cuando el proveedor no existe', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      respuestaError(404, { error: 'El proveedor no fue encontrado' })
    );

    await expect(
      consultarDisponibilidadProveedor(999, '2026-12-02', 1)
    ).rejects.toMatchObject({
      status: 404,
      message: 'El proveedor no fue encontrado',
    });
  });
});
