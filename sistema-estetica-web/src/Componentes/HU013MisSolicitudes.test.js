import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MisSolicitudes } from './MisSolicitudes';
import {
  consultarDetalleSolicitud,
  consultarMisSolicitudes,
} from '../Servicios/solicitudService';
import { consultarProveedorPorId } from '../Servicios/exploracionService';

jest.mock('../Servicios/solicitudService');
jest.mock('../Servicios/exploracionService');

const SESION_CLIENTE = {
  token: 'token-cliente',
  rol: 'cliente',
  id: 6,
  nombre: 'Cliente',
  email: 'cliente@example.com',
};

const PROVEEDOR_CINCO = {
  id: 5,
  nombre: 'Proveedor',
  apellido: 'Cinco',
};

const PROVEEDOR_DIEZ = {
  id: 10,
  nombre: 'Proveedor',
  apellido: 'Diez',
};

const SOLICITUD_A = {
  id_solicitud: 4,
  nombre_servicio_snapshot: 'Limpieza facial profunda',
  precio_snapshot: 150000.5,
  duracion_snapshot_minutos: 90,
  fecha_hora_solicitada: '2026-11-12T10:00:00',
  fecha_hora_propuesta: null,
  direccion_texto: 'Calle 1 # 2-3',
  barrio_sector: 'Barrio Prueba HU012',
  informacion_complementaria: 'Casa 4, timbre azul',
  observaciones: 'Solicitud controlada de prueba',
  estado: 'pendiente',
  motivo_rechazo_cancelacion: null,
  fecha_creacion: '2026-11-04T10:00:00',
  fecha_actualizacion: '2026-11-04T10:05:00',
  id_cliente: 6,
  id_proveedor: 5,
};

const SOLICITUD_B = {
  id_solicitud: 5,
  nombre_servicio_snapshot: 'Masaje relajante',
  precio_snapshot: 70000,
  duracion_snapshot_minutos: 30,
  fecha_hora_solicitada: '2026-11-13T16:00:00',
  fecha_hora_propuesta: null,
  direccion_texto: 'Calle 9 # 9-9',
  barrio_sector: 'Barrio Intento',
  informacion_complementaria: null,
  observaciones: null,
  estado: 'aceptada',
  motivo_rechazo_cancelacion: null,
  fecha_creacion: '2026-11-04T11:00:00',
  fecha_actualizacion: '2026-11-04T11:10:00',
  id_cliente: 6,
  id_proveedor: 10,
};

const SOLICITUD_C = {
  id_solicitud: 6,
  nombre_servicio_snapshot: 'Manicura y pedicura',
  precio_snapshot: 90000,
  duracion_snapshot_minutos: 60,
  fecha_hora_solicitada: '2026-11-14T12:00:00',
  fecha_hora_propuesta: null,
  direccion_texto: 'Calle 7 # 7-7',
  barrio_sector: 'Barrio Centro',
  informacion_complementaria: null,
  observaciones: null,
  estado: 'rechazada',
  motivo_rechazo_cancelacion: 'No hay cobertura para la fecha',
  fecha_creacion: '2026-11-04T12:00:00',
  fecha_actualizacion: '2026-11-04T12:15:00',
  id_cliente: 6,
  id_proveedor: 5,
};

const renderizar = (props = {}) =>
  render(
    <MisSolicitudes
      sesion={SESION_CLIENTE}
      onExplorarServicios={jest.fn()}
      onCerrarSesion={jest.fn()}
      {...props}
    />
  );

const esperarListado = async () => {
  expect(
    await screen.findByRole('heading', { name: 'Mis solicitudes y reservas' })
  ).toBeInTheDocument();
};

const abrirDetalle = async (idSolicitud) => {
  const boton = await screen.findByRole('button', {
    name: `Ver detalle de la solicitud ${idSolicitud}`,
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
  consultarMisSolicitudes.mockResolvedValue([SOLICITUD_A]);
  consultarDetalleSolicitud.mockResolvedValue(SOLICITUD_A);
  consultarProveedorPorId.mockImplementation((id) => {
    if (Number(id) === 5) return Promise.resolve(PROVEEDOR_CINCO);
    if (Number(id) === 10) return Promise.resolve(PROVEEDOR_DIEZ);
    return Promise.resolve({ id, nombre: 'Proveedor', apellido: String(id) });
  });
});

describe('HU-013: listado de solicitudes y reservas', () => {
  test('muestra únicamente los registros propios con estado, proveedor, fecha y precio', async () => {
    consultarMisSolicitudes.mockResolvedValue([SOLICITUD_A, SOLICITUD_B, SOLICITUD_C]);

    renderizar();
    await esperarListado();

    expect(
      await screen.findByRole('article', { name: /Solicitud 4:/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Solicitud 5:/i })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Solicitud 6:/i })).toBeInTheDocument();

    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Aceptada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rechazada').length).toBeGreaterThan(0);

    expect(screen.getAllByText(/Proveedor: Proveedor Cinco/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Proveedor: Proveedor Diez/)).toBeInTheDocument();
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
    expect(screen.getByText('12/11/2026')).toBeInTheDocument();
    expect(screen.getByText('10:00 – 11:30')).toBeInTheDocument();
    expect(screen.getByText('04/11/2026 10:00')).toBeInTheDocument();
    expect(screen.getByText(/3 registros/)).toBeInTheDocument();

    // Ordenadas por fecha de creación: la más reciente (id 6) primero.
    const articulos = screen.getAllByRole('article');
    expect(within(articulos[0]).getByText(/Solicitud #6/)).toBeInTheDocument();

    expect(consultarMisSolicitudes).toHaveBeenCalledWith(
      'token-cliente',
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(consultarProveedorPorId).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(consultarProveedorPorId).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  test('muestra el estado vacío cuando el Cliente no tiene registros', async () => {
    const onExplorarServicios = jest.fn();
    consultarMisSolicitudes.mockResolvedValue([]);

    renderizar({ onExplorarServicios });
    await esperarListado();

    expect(
      await screen.findByText('Todavía no tienes solicitudes ni reservas registradas.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/No fue posible consultar tus solicitudes/i)
    ).not.toBeInTheDocument();
    expect(consultarProveedorPorId).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Explorar servicios' }));
    expect(onExplorarServicios).toHaveBeenCalledTimes(1);
  });

  test('distingue un error técnico del estado vacío y permite reintentar', async () => {
    consultarMisSolicitudes
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
      screen.queryByText('Todavía no tienes solicitudes ni reservas registradas.')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('article', { name: /Solicitud 4:/i })
    ).toBeInTheDocument();
  });

  test('maneja un error de sesión en el listado sin mostrar datos', async () => {
    const onCerrarSesion = jest.fn();
    consultarMisSolicitudes.mockRejectedValue(
      Object.assign(new Error('Acceso denegado'), {
        status: 403,
        esErrorAutenticacion: true,
      })
    );

    renderizar({ onCerrarSesion });
    await esperarListado();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /No tienes autorización para consultar tus solicitudes/i
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onCerrarSesion).toHaveBeenCalledTimes(1);
  });

  test('conserva el listado si falla la consulta del nombre del Proveedor', async () => {
    consultarProveedorPorId.mockRejectedValue(new Error('Proveedor no disponible'));

    renderizar();
    await esperarListado();

    expect(
      await screen.findByRole('article', { name: /Solicitud 4:/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Proveedor: Proveedor no disponible/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('HU-013: detalle de la solicitud', () => {
  test('muestra estado, fechas principales, snapshots y lugar de atención', async () => {
    renderizar();
    await esperarListado();
    await abrirDetalle(4);

    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(screen.getByText('Estado actual')).toBeInTheDocument();
    expect(screen.getByText('Limpieza facial profunda')).toBeInTheDocument();
    expect(screen.getByText('Proveedor Cinco')).toBeInTheDocument();
    expect(screen.getByText('12/11/2026')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:30')).toBeInTheDocument();
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
    expect(screen.getByText('1 hora y 30 minutos')).toBeInTheDocument();
    expect(screen.getByText('Calle 1 # 2-3')).toBeInTheDocument();
    expect(screen.getByText('Barrio Prueba HU012')).toBeInTheDocument();
    expect(screen.getByText('Casa 4, timbre azul')).toBeInTheDocument();
    expect(screen.getByText('Solicitud controlada de prueba')).toBeInTheDocument();
    expect(screen.getByText('Fecha de creación')).toBeInTheDocument();
    expect(screen.getByText('04/11/2026 10:00')).toBeInTheDocument();
    expect(screen.getByText('Fecha de última actualización')).toBeInTheDocument();
    expect(screen.getByText('04/11/2026 10:05')).toBeInTheDocument();
    expect(screen.queryByText('Motivo de rechazo')).not.toBeInTheDocument();
    expect(screen.queryByText('Motivo de cancelación')).not.toBeInTheDocument();

    expect(consultarDetalleSolicitud).toHaveBeenCalledWith(
      'token-cliente',
      4,
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  test('muestra el motivo de rechazo con su etiqueta correcta', async () => {
    consultarDetalleSolicitud.mockResolvedValue({
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
    consultarDetalleSolicitud.mockResolvedValue({
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
    consultarDetalleSolicitud.mockResolvedValue({
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
    consultarDetalleSolicitud.mockResolvedValue({
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

  test('funciona cuando los campos opcionales del detalle son nulos', async () => {
    consultarDetalleSolicitud.mockResolvedValue({
      ...SOLICITUD_A,
      informacion_complementaria: null,
      observaciones: null,
    });

    renderizar();
    await esperarListado();
    await abrirDetalle(4);

    expect(screen.queryByText('Información complementaria')).not.toBeInTheDocument();
    expect(screen.queryByText('Observaciones')).not.toBeInTheDocument();
    expect(screen.getByText('Calle 1 # 2-3')).toBeInTheDocument();
    expect(screen.getByText('Barrio Prueba HU012')).toBeInTheDocument();
  });

  test('deniega el detalle de una solicitud ajena o inexistente sin mostrar datos', async () => {
    consultarDetalleSolicitud.mockRejectedValue(
      Object.assign(
        new Error('La solicitud no existe o no tiene permiso para verla'),
        { status: 404 }
      )
    );

    renderizar();
    await esperarListado();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Ver detalle de la solicitud 4',
      })
    );

    expect(
      await screen.findByText(
        'No se encontró la solicitud o no tienes permiso para consultarla.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Limpieza facial profunda')).not.toBeInTheDocument();
    expect(screen.queryByText('Calle 1 # 2-3')).not.toBeInTheDocument();
  });

  test('maneja un error de autorización en el detalle sin mantener datos', async () => {
    const onCerrarSesion = jest.fn();
    consultarDetalleSolicitud.mockRejectedValue(
      Object.assign(new Error('Acceso denegado'), {
        status: 403,
        esErrorAutenticacion: true,
      })
    );

    renderizar({ onCerrarSesion });
    await esperarListado();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Ver detalle de la solicitud 4',
      })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /No tienes autorización para consultar esta solicitud/i
    );
    expect(screen.queryByText('Limpieza facial profunda')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onCerrarSesion).toHaveBeenCalledTimes(1);
  });

  test('no mezcla datos al navegar entre dos detalles', async () => {
    consultarMisSolicitudes.mockResolvedValue([SOLICITUD_A, SOLICITUD_B]);
    consultarDetalleSolicitud.mockImplementation((token, idSolicitud) =>
      Promise.resolve(Number(idSolicitud) === 4 ? SOLICITUD_A : SOLICITUD_B)
    );

    renderizar();
    await esperarListado();
    await abrirDetalle(4);

    expect(screen.getByText('Calle 1 # 2-3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Volver a mis solicitudes/ }));

    await screen.findByRole('button', { name: 'Ver detalle de la solicitud 5' });
    await abrirDetalle(5);

    expect(screen.getByText('Calle 9 # 9-9')).toBeInTheDocument();
    expect(screen.getByText('Barrio Intento')).toBeInTheDocument();
    expect(screen.queryByText('Calle 1 # 2-3')).not.toBeInTheDocument();
    expect(screen.queryByText('Barrio Prueba HU012')).not.toBeInTheDocument();
    expect(consultarDetalleSolicitud).toHaveBeenCalledTimes(2);
  });

  test('restringe la sección a usuarios con rol Cliente', async () => {
    renderizar({ sesion: { token: 'token-proveedor', rol: 'proveedor' } });

    expect(
      screen.getByText('No puedes consultar solicitudes desde esta sesión.')
    ).toBeInTheDocument();
    expect(consultarMisSolicitudes).not.toHaveBeenCalled();
    expect(consultarDetalleSolicitud).not.toHaveBeenCalled();
  });

  test('mantiene el detalle mientras se actualiza el nombre del Proveedor', async () => {
    consultarDetalleSolicitud.mockResolvedValue(SOLICITUD_A);
    consultarProveedorPorId.mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => resolve(PROVEEDOR_CINCO), 20);
      })
    );

    renderizar();
    await esperarListado();
    await abrirDetalle(4);

    expect(await screen.findByText('Proveedor Cinco')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
