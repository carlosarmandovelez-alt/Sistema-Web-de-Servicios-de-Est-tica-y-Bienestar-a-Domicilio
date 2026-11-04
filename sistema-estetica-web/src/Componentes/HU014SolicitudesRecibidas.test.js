import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SolicitudesRecibidas } from './SolicitudesRecibidas';
import {
  consultarDetalleRecibida,
  consultarSolicitudesRecibidas,
} from '../Servicios/solicitudService';

jest.mock('../Servicios/solicitudService');

const SESION_PROVEEDOR = {
  token: 'token-proveedor',
  rol: 'proveedor',
  id: 5,
  nombre: 'Proveedor',
  email: 'proveedor@example.com',
};

const SOLICITUD_A = {
  id_solicitud: 4,
  nombre_servicio_snapshot: 'Servicio HU012 20261104201849',
  precio_snapshot: 150000.5,
  duracion_snapshot_minutos: 90,
  fecha_hora_solicitada: '2026-11-05T13:00:00',
  fecha_hora_propuesta: null,
  direccion_texto: 'Calle 1 # 2-3',
  barrio_sector: 'Barrio Prueba HU012',
  informacion_complementaria: 'Casa 4, timbre azul',
  observaciones: 'Solicitud controlada de prueba HU-012',
  estado: 'pendiente',
  motivo_rechazo_cancelacion: null,
  fecha_creacion: '2026-11-04T15:18:50',
  fecha_actualizacion: '2026-11-04T15:18:50',
  id_cliente: 6,
  id_proveedor: 5,
};

const SOLICITUD_B = {
  id_solicitud: 5,
  nombre_servicio_snapshot: 'Servicio HU012 modificado 20261104201849',
  precio_snapshot: 999999.99,
  duracion_snapshot_minutos: 30,
  fecha_hora_solicitada: '2026-11-05T15:00:00',
  fecha_hora_propuesta: null,
  direccion_texto: 'Calle 9 # 9-9',
  barrio_sector: 'Barrio Intento',
  informacion_complementaria: null,
  observaciones: null,
  estado: 'pendiente',
  motivo_rechazo_cancelacion: null,
  fecha_creacion: '2026-11-04T15:18:50',
  fecha_actualizacion: '2026-11-04T15:18:50',
  id_cliente: 6,
  id_proveedor: 5,
};

const SOLICITUD_C = {
  id_solicitud: 6,
  nombre_servicio_snapshot: 'Servicio HU012 modificado 20261104201849',
  precio_snapshot: 999999.99,
  duracion_snapshot_minutos: 30,
  fecha_hora_solicitada: '2026-11-12T16:00:00',
  fecha_hora_propuesta: null,
  direccion_texto: 'Calle 1 # 2-3, Casa 4',
  barrio_sector: 'Barrio Prueba HU012',
  informacion_complementaria: null,
  observaciones: null,
  estado: 'pendiente',
  motivo_rechazo_cancelacion: null,
  fecha_creacion: '2026-11-04T15:19:49',
  fecha_actualizacion: '2026-11-04T15:19:49',
  id_cliente: 6,
  id_proveedor: 5,
};

const renderizar = (props = {}) =>
  render(
    <SolicitudesRecibidas
      sesion={SESION_PROVEEDOR}
      onCerrarSesion={jest.fn()}
      {...props}
    />
  );

const esperarListado = async () => {
  expect(
    await screen.findByRole('heading', { name: 'Solicitudes recibidas' })
  ).toBeInTheDocument();
};

const abrirDetalle = async (idSolicitud) => {
  const boton = await screen.findByRole('button', {
    name: `Ver detalle de la solicitud recibida ${idSolicitud}`,
  });
  fireEvent.click(boton);
  expect(
    await screen.findByRole('heading', {
      name: `Detalle de la solicitud #${idSolicitud}`,
    })
  ).toBeInTheDocument();
};

beforeEach(() => {
  jest.clearAllMocks();
  consultarSolicitudesRecibidas.mockResolvedValue([SOLICITUD_A]);
  consultarDetalleRecibida.mockResolvedValue(SOLICITUD_A);
});

describe('HU-014: listado de solicitudes recibidas', () => {
  test('muestra las solicitudes recibidas con servicio, cliente, fecha, precio y estado', async () => {
    consultarSolicitudesRecibidas.mockResolvedValue([
      SOLICITUD_A,
      SOLICITUD_B,
      SOLICITUD_C,
    ]);

    renderizar();
    await esperarListado();

    expect(
      await screen.findByRole('article', { name: /Solicitud recibida 4:/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Solicitud recibida 5:/i })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Solicitud recibida 6:/i })).toBeInTheDocument();

    // El DTO no incluye nombre del Cliente; se muestra el identificador real.
    expect(screen.getAllByText('Cliente #6').length).toBe(3);
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('05/11/2026').length).toBeGreaterThan(0);
    expect(screen.getByText('13:00 – 14:30')).toBeInTheDocument();
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
    expect(screen.getByText('04/11/2026 15:19')).toBeInTheDocument();
    expect(screen.getByText(/3 solicitudes/)).toBeInTheDocument();

    // Ordenadas por fecha de creación: la más reciente (id 6) primero.
    const articulos = screen.getAllByRole('article');
    expect(within(articulos[0]).getByText(/Solicitud #6/)).toBeInTheDocument();

    expect(consultarSolicitudesRecibidas).toHaveBeenCalledWith(
      'token-proveedor',
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  test('muestra los diferentes estados reales del backend en el listado', async () => {
    consultarSolicitudesRecibidas.mockResolvedValue([
      { ...SOLICITUD_A, estado: 'pendiente' },
      { ...SOLICITUD_B, id_solicitud: 5, estado: 'aceptada' },
      {
        ...SOLICITUD_C,
        id_solicitud: 6,
        estado: 'rechazada',
        motivo_rechazo_cancelacion: 'No hay cobertura',
      },
      { ...SOLICITUD_A, id_solicitud: 7, estado: 'cancelada' },
    ]);

    renderizar();
    await esperarListado();

    expect(await screen.findByRole('article', { name: /Solicitud recibida 4:/i })).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Aceptada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rechazada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cancelada').length).toBeGreaterThan(0);
  });

  test('muestra el estado vacío cuando el Proveedor no ha recibido solicitudes', async () => {
    consultarSolicitudesRecibidas.mockResolvedValue([]);

    renderizar();
    await esperarListado();

    expect(
      await screen.findByText('Todavía no has recibido solicitudes.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/No fue posible consultar las solicitudes/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  test('distingue un error técnico del estado vacío y permite reintentar', async () => {
    consultarSolicitudesRecibidas
      .mockRejectedValueOnce(
        new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.')
      )
      .mockResolvedValueOnce([SOLICITUD_A]);

    renderizar();
    await esperarListado();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /No fue posible conectar con el servidor/i
    );
    expect(
      screen.queryByText('Todavía no has recibido solicitudes.')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('article', { name: /Solicitud recibida 4:/i })
    ).toBeInTheDocument();
  });

  test('maneja un error de sesión en el listado sin mostrar datos', async () => {
    const onCerrarSesion = jest.fn();
    consultarSolicitudesRecibidas.mockRejectedValue(
      Object.assign(new Error('Acceso denegado'), {
        status: 403,
        esErrorAutenticacion: true,
      })
    );

    renderizar({ onCerrarSesion });
    await esperarListado();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /No tienes autorización para consultar las solicitudes recibidas/i
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onCerrarSesion).toHaveBeenCalledTimes(1);
  });

  test('restringe la funcionalidad a usuarios con rol Proveedor', async () => {
    renderizar({ sesion: { token: 'token-cliente', rol: 'cliente' } });

    expect(
      screen.getByText('No puedes consultar solicitudes recibidas desde esta sesión.')
    ).toBeInTheDocument();
    expect(consultarSolicitudesRecibidas).not.toHaveBeenCalled();
    expect(consultarDetalleRecibida).not.toHaveBeenCalled();
  });

  test('no consulta el backend cuando no hay sesión autenticada', async () => {
    renderizar({ sesion: null });

    expect(
      screen.getByText('No puedes consultar solicitudes recibidas desde esta sesión.')
    ).toBeInTheDocument();
    expect(consultarSolicitudesRecibidas).not.toHaveBeenCalled();
    expect(consultarDetalleRecibida).not.toHaveBeenCalled();
  });
});

describe('HU-014: detalle de una solicitud recibida', () => {
  test('muestra información general, atención y condiciones históricas', async () => {
    renderizar();
    await esperarListado();
    await abrirDetalle(4);

    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(screen.getByText('Estado actual')).toBeInTheDocument();
    expect(screen.getByText('Cliente #6')).toBeInTheDocument();
    expect(screen.getByText('05/11/2026')).toBeInTheDocument();
    expect(screen.getByText('13:00')).toBeInTheDocument();
    expect(screen.getByText('14:30')).toBeInTheDocument();
    expect(screen.getByText('Calle 1 # 2-3')).toBeInTheDocument();
    expect(screen.getByText('Barrio Prueba HU012')).toBeInTheDocument();
    expect(screen.getByText('Casa 4, timbre azul')).toBeInTheDocument();
    expect(screen.getByText('Solicitud controlada de prueba HU-012')).toBeInTheDocument();
    expect(screen.getByText('Condiciones conservadas del servicio')).toBeInTheDocument();
    expect(screen.getByText('Servicio HU012 20261104201849')).toBeInTheDocument();
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
    expect(screen.getByText('1 hora y 30 minutos')).toBeInTheDocument();
    expect(screen.getByText('Fecha de creación')).toBeInTheDocument();
    expect(screen.getByText('Fecha de última actualización')).toBeInTheDocument();
    expect(screen.getAllByText('04/11/2026 15:18').length).toBeGreaterThan(0);
    expect(screen.queryByText('Motivo de rechazo')).not.toBeInTheDocument();
    expect(screen.queryByText('Motivo de cancelación')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Aceptar|Rechazar|Cancelar solicitud|Reprogramar/i })
    ).not.toBeInTheDocument();

    expect(consultarDetalleRecibida).toHaveBeenCalledWith(
      'token-proveedor',
      4,
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  test('indica cuando no se proporcionó información complementaria ni observaciones', async () => {
    consultarSolicitudesRecibidas.mockResolvedValue([SOLICITUD_B]);
    consultarDetalleRecibida.mockResolvedValue(SOLICITUD_B);

    renderizar();
    await esperarListado();
    await abrirDetalle(5);

    expect(
      screen.getByText('No se proporcionó información complementaria.')
    ).toBeInTheDocument();
    expect(screen.getByText('Sin observaciones registradas.')).toBeInTheDocument();
    expect(screen.getByText('Calle 9 # 9-9')).toBeInTheDocument();
    expect(screen.getByText('Barrio Intento')).toBeInTheDocument();
  });

  test('muestra el motivo de rechazo con su etiqueta correcta', async () => {
    consultarDetalleRecibida.mockResolvedValue({
      ...SOLICITUD_A,
      estado: 'rechazada',
      motivo_rechazo_cancelacion: 'No hay cobertura para la fecha',
    });

    renderizar();
    await esperarListado();
    await abrirDetalle(4);

    expect(screen.getByText('Motivo de rechazo')).toBeInTheDocument();
    expect(screen.getByText('No hay cobertura para la fecha')).toBeInTheDocument();
    expect(screen.queryByText('Motivo de cancelación')).not.toBeInTheDocument();
    expect(screen.getAllByText('Rechazada').length).toBeGreaterThan(0);
  });

  test('muestra el motivo de cancelación con su etiqueta correcta', async () => {
    consultarDetalleRecibida.mockResolvedValue({
      ...SOLICITUD_A,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: 'Cancelada por el Cliente',
    });

    renderizar();
    await esperarListado();
    await abrirDetalle(4);

    expect(screen.getByText('Motivo de cancelación')).toBeInTheDocument();
    expect(screen.getByText('Cancelada por el Cliente')).toBeInTheDocument();
    expect(screen.queryByText('Motivo de rechazo')).not.toBeInTheDocument();
    expect(screen.getAllByText('Cancelada').length).toBeGreaterThan(0);
  });

  test('no inventa un motivo cuando la solicitud rechazada no lo tiene', async () => {
    consultarDetalleRecibida.mockResolvedValue({
      ...SOLICITUD_A,
      estado: 'rechazada',
      motivo_rechazo_cancelacion: null,
    });

    renderizar();
    await esperarListado();
    await abrirDetalle(4);

    expect(screen.getByText('No se registró un motivo de rechazo.')).toBeInTheDocument();
    expect(screen.queryByText('Motivo de rechazo')).not.toBeInTheDocument();
    expect(screen.queryByText('Motivo de cancelación')).not.toBeInTheDocument();
  });

  test('no inventa un motivo cuando la solicitud cancelada no lo tiene', async () => {
    consultarDetalleRecibida.mockResolvedValue({
      ...SOLICITUD_A,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: '   ',
    });

    renderizar();
    await esperarListado();
    await abrirDetalle(4);

    expect(
      screen.getByText('No se registró un motivo de cancelación.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Motivo de rechazo')).not.toBeInTheDocument();
    expect(screen.queryByText('Motivo de cancelación')).not.toBeInTheDocument();
  });

  test('deniega una solicitud dirigida a otro Proveedor sin mostrar datos', async () => {
    consultarDetalleRecibida.mockRejectedValue(
      Object.assign(
        new Error('La solicitud no existe o no está dirigida a usted'),
        { status: 404 }
      )
    );

    renderizar();
    await esperarListado();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Ver detalle de la solicitud recibida 4',
      })
    );

    expect(
      await screen.findByText(
        'No se encontró la solicitud o no está dirigida a tu cuenta.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Calle 1 # 2-3')).not.toBeInTheDocument();
    expect(screen.queryByText('Servicio HU012 20261104201849')).not.toBeInTheDocument();
  });

  test('maneja un error de autorización en el detalle sin mantener datos', async () => {
    const onCerrarSesion = jest.fn();
    consultarDetalleRecibida.mockRejectedValue(
      Object.assign(new Error('Acceso denegado'), {
        status: 403,
        esErrorAutenticacion: true,
      })
    );

    renderizar({ onCerrarSesion });
    await esperarListado();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Ver detalle de la solicitud recibida 4',
      })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /No tienes autorización para consultar esta solicitud/i
    );
    expect(screen.queryByText('Calle 1 # 2-3')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onCerrarSesion).toHaveBeenCalledTimes(1);
  });

  test('no mezcla datos al navegar entre dos solicitudes recibidas', async () => {
    consultarSolicitudesRecibidas.mockResolvedValue([SOLICITUD_A, SOLICITUD_B]);
    consultarDetalleRecibida.mockImplementation((token, idSolicitud) =>
      Promise.resolve(Number(idSolicitud) === 4 ? SOLICITUD_A : SOLICITUD_B)
    );

    renderizar();
    await esperarListado();
    await abrirDetalle(4);

    expect(screen.getByText('Calle 1 # 2-3')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /Volver a solicitudes recibidas/ })
    );

    await screen.findByRole('button', {
      name: 'Ver detalle de la solicitud recibida 5',
    });
    await abrirDetalle(5);

    expect(screen.getByText('Calle 9 # 9-9')).toBeInTheDocument();
    expect(screen.getByText('Barrio Intento')).toBeInTheDocument();
    expect(screen.queryByText('Calle 1 # 2-3')).not.toBeInTheDocument();
    expect(screen.queryByText('Barrio Prueba HU012')).not.toBeInTheDocument();
    expect(consultarDetalleRecibida).toHaveBeenCalledTimes(2);
  });

  test('no consulta el detalle si el listado está vacío', async () => {
    consultarSolicitudesRecibidas.mockResolvedValue([]);

    renderizar();
    await esperarListado();

    expect(
      await screen.findByText('Todavía no has recibido solicitudes.')
    ).toBeInTheDocument();
    expect(consultarDetalleRecibida).not.toHaveBeenCalled();
  });
});
