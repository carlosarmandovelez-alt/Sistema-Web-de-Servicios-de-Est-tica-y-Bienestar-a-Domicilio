import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MisSolicitudes } from './MisSolicitudes';
import { SolicitudesRecibidas } from './SolicitudesRecibidas';
import {
  cancelarSolicitudCliente,
  cancelarSolicitudProveedor,
  consultarDetalleRecibida,
  consultarDetalleSolicitud,
  consultarMisSolicitudes,
  consultarSolicitudesRecibidas,
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

const SESION_PROVEEDOR = {
  token: 'token-proveedor',
  rol: 'proveedor',
  id: 5,
  nombre: 'Proveedor',
  email: 'proveedor@example.com',
};

const SOLICITUD_BASE = {
  id_solicitud: 17,
  nombre_servicio_snapshot: 'Masaje relajante',
  precio_snapshot: 80000,
  duracion_snapshot_minutos: 60,
  fecha_hora_solicitada: '2026-12-05T10:00:00',
  fecha_hora_propuesta: null,
  direccion_texto: 'Calle 17 # 17-17',
  barrio_sector: 'Barrio Hu017',
  informacion_complementaria: null,
  observaciones: null,
  estado: 'pendiente',
  motivo_rechazo_cancelacion: null,
  fecha_creacion: '2026-11-20T08:00:00',
  fecha_actualizacion: '2026-11-20T09:00:00',
  id_cliente: 6,
  id_proveedor: 5,
};

const renderizarCliente = () =>
  render(
    <MisSolicitudes
      sesion={SESION_CLIENTE}
      onExplorarServicios={jest.fn()}
      onCerrarSesion={jest.fn()}
    />
  );

const renderizarProveedor = () =>
  render(<SolicitudesRecibidas sesion={SESION_PROVEEDOR} onCerrarSesion={jest.fn()} />);

const abrirDetalleCliente = async (solicitud) => {
  consultarMisSolicitudes.mockResolvedValue([solicitud]);
  consultarDetalleSolicitud.mockResolvedValue(solicitud);

  renderizarCliente();
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

const escribirMotivoYConfirmar = async (motivo) => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(/Motivo de cancelación/), {
      target: { value: motivo },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  cancelarSolicitudCliente.mockReset();
  cancelarSolicitudProveedor.mockReset();
  consultarProveedorPorId.mockResolvedValue({
    id: 5,
    nombre: 'Proveedor',
    apellido: 'Hu017',
  });
});

describe('HU-017: cancelación en la vista del Cliente', () => {
  test('muestra la acción para una solicitud Pendiente propia', async () => {
    await abrirDetalleCliente(SOLICITUD_BASE);

    expect(
      screen.getByRole('button', { name: 'Cancelar solicitud' })
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Motivo de cancelación/)
    ).not.toBeInTheDocument();
  });

  test('no muestra la acción para una solicitud Completada', async () => {
    await abrirDetalleCliente({ ...SOLICITUD_BASE, estado: 'completada' });

    expect(
      screen.queryByRole('button', { name: 'Cancelar solicitud' })
    ).not.toBeInTheDocument();
  });

  test('no muestra la acción para una solicitud Cancelada', async () => {
    await abrirDetalleCliente({
      ...SOLICITUD_BASE,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: 'Cancelada antes',
    });

    expect(
      screen.queryByRole('button', { name: 'Cancelar solicitud' })
    ).not.toBeInTheDocument();
  });

  test('no muestra la acción para una solicitud Rechazada', async () => {
    await abrirDetalleCliente({
      ...SOLICITUD_BASE,
      estado: 'rechazada',
      motivo_rechazo_cancelacion: 'No hay cobertura',
    });

    expect(
      screen.queryByRole('button', { name: 'Cancelar solicitud' })
    ).not.toBeInTheDocument();
  });

  test('valida que el motivo no esté vacío antes de llamar al backend', async () => {
    await abrirDetalleCliente(SOLICITUD_BASE);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));

    expect(
      await screen.findByText('El motivo de cancelación es obligatorio.')
    ).toBeInTheDocument();
    expect(cancelarSolicitudCliente).not.toHaveBeenCalled();
  });

  test('valida que el motivo no contenga solo espacios', async () => {
    await abrirDetalleCliente(SOLICITUD_BASE);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
    await escribirMotivoYConfirmar('     ');

    expect(
      await screen.findByText('El motivo de cancelación es obligatorio.')
    ).toBeInTheDocument();
    expect(cancelarSolicitudCliente).not.toHaveBeenCalled();
  });

  test('cancela una solicitud Pendiente, actualiza el estado y muestra el motivo', async () => {
    const cancelada = {
      ...SOLICITUD_BASE,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: 'Ya no lo necesito',
      fecha_actualizacion: '2026-11-23T10:00:00',
    };
    cancelarSolicitudCliente.mockResolvedValue(cancelada);

    await abrirDetalleCliente(SOLICITUD_BASE);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
    await escribirMotivoYConfirmar('  Ya no lo necesito  ');

    await waitFor(() =>
      expect(cancelarSolicitudCliente).toHaveBeenCalledWith(
        'token-cliente',
        17,
        'Ya no lo necesito'
      )
    );

    expect(
      await screen.findByText(
        'Solicitud cancelada. El motivo quedó registrado.'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText('Cancelada').length).toBeGreaterThan(0);
    expect(screen.getByText('Motivo de cancelación')).toBeInTheDocument();
    expect(screen.getByText('Ya no lo necesito')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancelar solicitud' })
    ).not.toBeInTheDocument();
  });

  test('cancela una solicitud Aceptada y conserva visible la información histórica', async () => {
    const aceptada = { ...SOLICITUD_BASE, estado: 'aceptada' };
    cancelarSolicitudCliente.mockResolvedValue({
      ...aceptada,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: 'Emergencia',
      fecha_actualizacion: '2026-11-23T10:05:00',
    });

    await abrirDetalleCliente(aceptada);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
    await escribirMotivoYConfirmar('Emergencia');

    await waitFor(() =>
      expect(cancelarSolicitudCliente).toHaveBeenCalledWith(
        'token-cliente',
        17,
        'Emergencia'
      )
    );
    expect(
      await screen.findByText('Motivo de cancelación')
    ).toBeInTheDocument();
    expect(screen.getByText('Masaje relajante')).toBeInTheDocument();
    expect(screen.getByText('Calle 17 # 17-17')).toBeInTheDocument();
  });

  test('puede cancelar una solicitud Sugerida sin confundirla con la contrapropuesta', async () => {
    const sugerida = {
      ...SOLICITUD_BASE,
      estado: 'sugerida',
      fecha_hora_propuesta: '2026-12-06T15:30:00',
    };
    cancelarSolicitudCliente.mockResolvedValue({
      ...sugerida,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: 'Ya no quiero el cambio de horario',
      fecha_actualizacion: '2026-11-23T10:10:00',
    });

    await abrirDetalleCliente(sugerida);

    expect(
      screen.getByRole('button', { name: 'Aceptar horario propuesto' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar solicitud' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
    await escribirMotivoYConfirmar('Ya no quiero el cambio de horario');

    await waitFor(() =>
      expect(cancelarSolicitudCliente).toHaveBeenCalledWith(
        'token-cliente',
        17,
        'Ya no quiero el cambio de horario'
      )
    );
    expect(screen.getAllByText('Cancelada').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: 'Aceptar horario propuesto' })
    ).not.toBeInTheDocument();
  });

  test('muestra el error del backend y conserva la solicitud sin cancelar', async () => {
    cancelarSolicitudCliente.mockRejectedValue(
      Object.assign(new Error('La solicitud ya se encuentra cancelada'), {
        status: 400,
      })
    );

    await abrirDetalleCliente(SOLICITUD_BASE);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
    await escribirMotivoYConfirmar('Motivo');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La solicitud ya se encuentra cancelada'
    );
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: 'Confirmar cancelación' })
    ).toBeInTheDocument();
  });

  test('deshabilita la confirmación mientras la cancelación está en curso', async () => {
    let resolver;
    cancelarSolicitudCliente.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );

    await abrirDetalleCliente(SOLICITUD_BASE);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
    await escribirMotivoYConfirmar('Motivo');

    expect(
      screen.getByRole('button', { name: /Cancelando/ })
    ).toBeDisabled();

    resolver({
      ...SOLICITUD_BASE,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: 'Motivo',
    });

    await waitFor(() =>
      expect(screen.getAllByText('Cancelada').length).toBeGreaterThan(0)
    );
    expect(cancelarSolicitudCliente).toHaveBeenCalledTimes(1);
  });
});

describe('HU-017: cancelación en la vista del Proveedor', () => {
  test('muestra la acción para una reserva Aceptada', async () => {
    await abrirDetalleProveedor({ ...SOLICITUD_BASE, estado: 'aceptada' });

    expect(
      screen.getByRole('button', { name: 'Cancelar reserva' })
    ).toBeInTheDocument();
  });

  test('no muestra la acción para solicitudes Pendiente o Sugerida', async () => {
    await abrirDetalleProveedor(SOLICITUD_BASE);
    expect(
      screen.queryByRole('button', { name: 'Cancelar reserva' })
    ).not.toBeInTheDocument();
  });

  test('no muestra la acción para una reserva Completada', async () => {
    await abrirDetalleProveedor({ ...SOLICITUD_BASE, estado: 'completada' });

    expect(
      screen.queryByRole('button', { name: 'Cancelar reserva' })
    ).not.toBeInTheDocument();
  });

  test('no muestra la acción para una reserva ya Cancelada', async () => {
    await abrirDetalleProveedor({
      ...SOLICITUD_BASE,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: 'Cancelada antes',
    });

    expect(
      screen.queryByRole('button', { name: 'Cancelar reserva' })
    ).not.toBeInTheDocument();
  });

  test('valida el motivo obligatorio antes de llamar al backend', async () => {
    await abrirDetalleProveedor({ ...SOLICITUD_BASE, estado: 'aceptada' });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));

    expect(
      await screen.findByText('El motivo de cancelación es obligatorio.')
    ).toBeInTheDocument();
    expect(cancelarSolicitudProveedor).not.toHaveBeenCalled();
  });

  test('cancela una reserva Aceptada y muestra el estado y el motivo', async () => {
    const aceptada = { ...SOLICITUD_BASE, estado: 'aceptada' };
    cancelarSolicitudProveedor.mockResolvedValue({
      ...aceptada,
      estado: 'cancelada',
      motivo_rechazo_cancelacion: 'No podré asistir por enfermedad',
      fecha_actualizacion: '2026-11-23T11:00:00',
    });

    await abrirDetalleProveedor(aceptada);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    await escribirMotivoYConfirmar('No podré asistir por enfermedad');

    await waitFor(() =>
      expect(cancelarSolicitudProveedor).toHaveBeenCalledWith(
        'token-proveedor',
        17,
        'No podré asistir por enfermedad'
      )
    );

    expect(
      await screen.findByText(
        'Reserva cancelada. El motivo quedó registrado y el horario fue liberado.'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText('Cancelada').length).toBeGreaterThan(0);
    expect(screen.getByText('Motivo de cancelación')).toBeInTheDocument();
    expect(
      screen.getByText('No podré asistir por enfermedad')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancelar reserva' })
    ).not.toBeInTheDocument();
  });

  test('muestra el error del backend y conserva la reserva Aceptada', async () => {
    cancelarSolicitudProveedor.mockRejectedValue(
      Object.assign(new Error('No se puede cancelar una reserva que ya fue completada'), {
        status: 400,
      })
    );

    await abrirDetalleProveedor({ ...SOLICITUD_BASE, estado: 'aceptada' });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    await escribirMotivoYConfirmar('Motivo');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se puede cancelar una reserva que ya fue completada'
    );
    expect(screen.getAllByText('Aceptada').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: 'Confirmar cancelación' })
    ).toBeInTheDocument();
  });
});
