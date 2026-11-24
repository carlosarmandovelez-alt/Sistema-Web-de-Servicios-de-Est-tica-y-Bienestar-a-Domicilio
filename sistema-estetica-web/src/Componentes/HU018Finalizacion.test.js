import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MisSolicitudes } from './MisSolicitudes';
import { SolicitudesRecibidas } from './SolicitudesRecibidas';
import {
  completarServicio,
  consultarDetalleRecibida,
  consultarDetalleSolicitud,
  consultarMisSolicitudes,
  consultarSolicitudesRecibidas,
} from '../Servicios/solicitudService';
import { consultarProveedorPorId } from '../Servicios/exploracionService';

jest.mock('../Servicios/solicitudService');
jest.mock('../Servicios/exploracionService');

const SESION_PROVEEDOR = {
  token: 'token-proveedor',
  rol: 'proveedor',
  id: 5,
  nombre: 'Proveedor',
  email: 'proveedor@example.com',
};

const SESION_CLIENTE = {
  token: 'token-cliente',
  rol: 'cliente',
  id: 6,
  nombre: 'Cliente',
  email: 'cliente@example.com',
};

const SOLICITUD_ACEPTADA = {
  id_solicitud: 18,
  nombre_servicio_snapshot: 'Masaje relajante',
  precio_snapshot: 80000,
  duracion_snapshot_minutos: 60,
  fecha_hora_solicitada: '2026-12-07T10:00:00',
  fecha_hora_propuesta: '2026-12-07T10:00:00',
  direccion_texto: 'Calle 18 # 18-18',
  barrio_sector: 'Barrio Hu018',
  informacion_complementaria: 'Casa 4, timbre azul',
  observaciones: 'Observaciones históricas',
  estado: 'aceptada',
  motivo_rechazo_cancelacion: null,
  fecha_creacion: '2026-11-10T08:00:00',
  fecha_actualizacion: '2026-11-20T09:00:00',
  id_cliente: 6,
  id_proveedor: 5,
};

const renderizarProveedor = () =>
  render(<SolicitudesRecibidas sesion={SESION_PROVEEDOR} onCerrarSesion={jest.fn()} />);

const abrirDetalleProveedor = async (solicitud) => {
  consultarSolicitudesRecibidas.mockResolvedValue([solicitud]);
  consultarDetalleRecibida.mockResolvedValue(solicitud);

  renderizarProveedor();
  expect(
    await screen.findByRole('heading', { name: 'Solicitudes recibidas' })
  ).toBeInTheDocument();

  fireEvent.click(
    await screen.findByRole('button', {
      name: `Ver detalle de la solicitud recibida ${solicitud.id_solicitud}`,
    })
  );

  expect(
    await screen.findByRole('heading', {
      name: `Detalle de la solicitud #${solicitud.id_solicitud}`,
    })
  ).toBeInTheDocument();
};

const abrirDetalleCliente = async (solicitud) => {
  consultarMisSolicitudes.mockResolvedValue([solicitud]);
  consultarDetalleSolicitud.mockResolvedValue(solicitud);

  render(
    <MisSolicitudes
      sesion={SESION_CLIENTE}
      onExplorarServicios={jest.fn()}
      onCerrarSesion={jest.fn()}
    />
  );
  expect(
    await screen.findByRole('heading', { name: 'Mis solicitudes y reservas' })
  ).toBeInTheDocument();

  fireEvent.click(
    await screen.findByRole('button', {
      name: `Ver detalle de la solicitud ${solicitud.id_solicitud}`,
    })
  );

  expect(
    await screen.findByRole('heading', {
      name: `Detalle de la solicitud #${solicitud.id_solicitud}`,
    })
  ).toBeInTheDocument();
};

const confirmarFinalizacion = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Marcar como completada' }));
  expect(
    screen.getByText('¿Confirmas que el servicio ya fue prestado?')
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Confirmar finalización' })
  ).toBeInTheDocument();
};

beforeEach(() => {
  jest.clearAllMocks();
  completarServicio.mockReset();
  consultarProveedorPorId.mockResolvedValue({
    id: 5,
    nombre: 'Proveedor',
    apellido: 'Hu018',
  });
});

describe('HU-018: finalización en la vista del Proveedor', () => {
  test('muestra la acción únicamente para una reserva Aceptada', async () => {
    await abrirDetalleProveedor(SOLICITUD_ACEPTADA);

    expect(
      screen.getByRole('button', { name: 'Marcar como completada' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar reserva' })
    ).toBeInTheDocument();
  });

  test.each(['pendiente', 'sugerida', 'rechazada', 'cancelada', 'completada'])(
    'no muestra la acción para una reserva en estado %s',
    async (estado) => {
      await abrirDetalleProveedor({ ...SOLICITUD_ACEPTADA, estado });

      expect(
        screen.queryByRole('button', { name: 'Marcar como completada' })
      ).not.toBeInTheDocument();
    }
  );

  test('muestra una confirmación clara antes de llamar al backend', async () => {
    await abrirDetalleProveedor(SOLICITUD_ACEPTADA);
    await confirmarFinalizacion();

    expect(completarServicio).not.toHaveBeenCalled();
    expect(
      screen.getByText(/La reserva pasará de Aceptada a Completada/i)
    ).toBeInTheDocument();
  });

  test('permite volver sin finalizar la reserva', async () => {
    await abrirDetalleProveedor(SOLICITUD_ACEPTADA);
    await confirmarFinalizacion();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(completarServicio).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Marcar como completada' })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('¿Confirmas que el servicio ya fue prestado?')
    ).not.toBeInTheDocument();
  });

  test('finaliza la reserva, actualiza el estado y conserva los datos históricos', async () => {
    const completada = {
      ...SOLICITUD_ACEPTADA,
      estado: 'completada',
      fecha_actualizacion: '2026-11-24T10:00:00',
    };
    completarServicio.mockResolvedValue(completada);

    await abrirDetalleProveedor(SOLICITUD_ACEPTADA);
    await confirmarFinalizacion();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirmar finalización' })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() =>
      expect(completarServicio).toHaveBeenCalledWith('token-proveedor', 18)
    );

    expect(
      await screen.findByText(
        'Servicio finalizado. La reserva quedó en estado Completada.'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText('Completada').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: 'Marcar como completada' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancelar reserva' })
    ).not.toBeInTheDocument();

    expect(screen.getByText('Masaje relajante')).toBeInTheDocument();
    expect(screen.getByText('Calle 18 # 18-18')).toBeInTheDocument();
    expect(screen.getByText('Barrio Hu018')).toBeInTheDocument();
    expect(screen.getAllByText('10/11/2026 08:00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('24/11/2026 10:00').length).toBeGreaterThan(0);
  });

  test('actualiza el listado de solicitudes recibidas tras finalizar', async () => {
    completarServicio.mockResolvedValue({
      ...SOLICITUD_ACEPTADA,
      estado: 'completada',
      fecha_actualizacion: '2026-11-24T10:00:00',
    });

    await abrirDetalleProveedor(SOLICITUD_ACEPTADA);
    await confirmarFinalizacion();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirmar finalización' })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() =>
      expect(screen.getAllByText('Completada').length).toBeGreaterThan(0)
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Volver a solicitudes recibidas/ })
    );

    expect(
      await screen.findByRole('article', {
        name: /Solicitud recibida 18: Masaje relajante\. Estado Completada/,
      })
    ).toBeInTheDocument();
  });

  test('deshabilita la confirmación y evita envíos duplicados mientras finaliza', async () => {    let resolver;
    completarServicio.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );

    await abrirDetalleProveedor(SOLICITUD_ACEPTADA);
    await confirmarFinalizacion();

    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar finalización' })
    );

    const botonEnCurso = screen.getByRole('button', { name: /Finalizando/ });
    expect(botonEnCurso).toBeDisabled();

    fireEvent.click(botonEnCurso);
    expect(completarServicio).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolver({
        ...SOLICITUD_ACEPTADA,
        estado: 'completada',
        fecha_actualizacion: '2026-11-24T10:00:00',
      });
    });

    await waitFor(() =>
      expect(screen.getAllByText('Completada').length).toBeGreaterThan(0)
    );
  });

  test('muestra el error del backend y conserva la reserva como Aceptada', async () => {
    completarServicio.mockRejectedValue(
      Object.assign(
        new Error('Solo se pueden completar reservas que estén en estado Aceptada'),
        { status: 400 }
      )
    );

    await abrirDetalleProveedor(SOLICITUD_ACEPTADA);
    await confirmarFinalizacion();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirmar finalización' })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Solo se pueden completar reservas que estén en estado Aceptada'
    );
    expect(screen.getAllByText('Aceptada').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: 'Confirmar finalización' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Marcar como completada' })
    ).not.toBeInTheDocument();
  });

  test('informa cuando la reserva ya no existe o es de otro Proveedor', async () => {
    completarServicio.mockRejectedValue(
      Object.assign(new Error('No encontrada'), { status: 404 })
    );

    await abrirDetalleProveedor(SOLICITUD_ACEPTADA);
    await confirmarFinalizacion();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirmar finalización' })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no existe o no está asociada a tu cuenta/i
    );
    expect(
      screen.getByRole('button', { name: 'Confirmar finalización' })
    ).toBeInTheDocument();
  });

  test('refresca el detalle cuando el backend rechaza por un estado desactualizado', async () => {
    completarServicio.mockRejectedValue(
      Object.assign(new Error('La solicitud ya se encuentra cancelada'), {
        status: 400,
      })
    );

    await abrirDetalleProveedor(SOLICITUD_ACEPTADA);

    // La siguiente consulta de detalle ya observa el estado real, cancelado.
    consultarDetalleRecibida.mockResolvedValueOnce({
      ...SOLICITUD_ACEPTADA,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: 'Cancelada por el Cliente',
      fecha_actualizacion: '2026-11-24T10:05:00',
    });

    await confirmarFinalizacion();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirmar finalización' })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      await screen.findByText('La solicitud ya se encuentra cancelada')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText('Cancelada').length).toBeGreaterThan(0)
    );
    expect(
      screen.queryByRole('button', { name: 'Confirmar finalización' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Marcar como completada' })
    ).not.toBeInTheDocument();
  });
});

describe('HU-018: consulta de la reserva completada por el Cliente', () => {
  test('muestra el estado Completada y las fechas principales', async () => {
    const completada = {
      ...SOLICITUD_ACEPTADA,
      estado: 'completada',
      fecha_actualizacion: '2026-11-24T10:00:00',
    };

    await abrirDetalleCliente(completada);

    expect(screen.getAllByText('Completada').length).toBeGreaterThan(0);
    expect(screen.getByText('Fecha de creación')).toBeInTheDocument();
    expect(screen.getByText('10/11/2026 08:00')).toBeInTheDocument();
    expect(
      screen.getByText('Fecha de última actualización')
    ).toBeInTheDocument();
    expect(screen.getByText('24/11/2026 10:00')).toBeInTheDocument();
    expect(
      screen.queryByText('Historial de estados')
    ).not.toBeInTheDocument();
  });
});
