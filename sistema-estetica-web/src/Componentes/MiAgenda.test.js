import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MiAgenda } from './MiAgenda';
import { consultarAgenda } from '../Servicios/solicitudService';

jest.mock('../Servicios/solicitudService');

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

const RESERVA_A = {
  id_solicitud: 19,
  nombre_servicio: 'Masaje relajante histórico',
  fecha_hora_inicio: '2026-12-07T10:30:00',
  fecha_hora_fin: '2026-12-07T12:00:00',
  duracion_snapshot_minutos: 90,
  nombre_cliente: 'Ana Pérez',
  direccion_texto: 'Calle 19 # 19-19',
  barrio_sector: 'Barrio Hu019',
};

const RESERVA_B = {
  id_solicitud: 20,
  nombre_servicio: 'Limpieza facial',
  fecha_hora_inicio: '2026-12-08T09:00:00',
  fecha_hora_fin: '2026-12-08T10:00:00',
  duracion_snapshot_minutos: 60,
  nombre_cliente: 'Carlos Ruiz',
  direccion_texto: 'Carrera 8 # 8-08',
  barrio_sector: 'Centro',
};

const renderizar = (props = {}) =>
  render(
    <MiAgenda
      sesion={SESION_PROVEEDOR}
      onCerrarSesion={jest.fn()}
      {...props}
    />
  );

beforeEach(() => {
  jest.clearAllMocks();
  consultarAgenda.mockReset();
  consultarAgenda.mockResolvedValue([RESERVA_A]);
});

describe('HU-019: agenda del Proveedor', () => {
  test('muestra el estado de carga mientras consulta', async () => {
    consultarAgenda.mockReturnValue(new Promise(() => {}));
    renderizar();

    expect(
      screen.getByText('Consultando tu agenda de reservas aceptadas...')
    ).toBeInTheDocument();
  });

  test('muestra las reservas aceptadas con periodo, servicio y dirección', async () => {
    consultarAgenda.mockResolvedValue([RESERVA_A, RESERVA_B]);
    renderizar();

    expect(
      await screen.findByRole('heading', { name: 'Mi agenda' })
    ).toBeInTheDocument();

    expect(
      await screen.findByRole('article', {
        name: /Reserva 19: Masaje relajante histórico/,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /Reserva 20: Limpieza facial/ })
    ).toBeInTheDocument();
    expect(screen.getAllByText('10:30 – 12:00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('09:00 – 10:00').length).toBeGreaterThan(0);
    expect(screen.getByText('1 hora y 30 minutos')).toBeInTheDocument();
    expect(screen.getByText('1 hora')).toBeInTheDocument();
    expect(screen.getByText('Calle 19 # 19-19')).toBeInTheDocument();
    expect(screen.getByText('Carrera 8 # 8-08')).toBeInTheDocument();
    expect(screen.getByText(/Ana Pérez/)).toBeInTheDocument();
    expect(screen.getByText(/Carlos Ruiz/)).toBeInTheDocument();
    expect(screen.getAllByText('Aceptada').length).toBeGreaterThan(0);
    expect(screen.getByText('2 reservas')).toBeInTheDocument();
  });

  test('representa un periodo que termina al día siguiente', async () => {
    consultarAgenda.mockResolvedValue([
      {
        ...RESERVA_A,
        fecha_hora_inicio: '2026-12-07T23:30:00',
        fecha_hora_fin: '2026-12-08T01:00:00',
      },
    ]);
    renderizar();

    expect(
      await screen.findByText('23:30 del 07/12/2026 – 01:00 del 08/12/2026')
    ).toBeInTheDocument();
    expect(screen.getByText('01:00 del 08/12/2026')).toBeInTheDocument();
  });

  test('muestra el mensaje de agenda vacía sin tratarlo como error', async () => {
    consultarAgenda.mockResolvedValue([]);
    renderizar();

    expect(
      await screen.findByText(
        'No tienes reservas aceptadas para mostrar en tu agenda.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('0 reservas')).not.toBeInTheDocument();
  });

  test('muestra el error y permite reintentar', async () => {
    consultarAgenda
      .mockRejectedValueOnce(
        Object.assign(new Error('No fue posible conectar con el servidor'), {
          status: 500,
        })
      )
      .mockResolvedValueOnce([RESERVA_A]);

    renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible conectar con el servidor'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('article', { name: /Reserva 19/ })
    ).toBeInTheDocument();
    expect(consultarAgenda).toHaveBeenCalledTimes(2);
  });

  test('vuelve a consultar al pulsar Actualizar', async () => {
    renderizar();
    await screen.findByRole('article', { name: /Reserva 19/ });

    consultarAgenda.mockResolvedValue([RESERVA_B]);
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(
      await screen.findByRole('article', { name: /Reserva 20/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('article', { name: /Reserva 19/ })
    ).not.toBeInTheDocument();
    expect(consultarAgenda).toHaveBeenCalledTimes(2);
  });

  test('restringe la agenda a usuarios con rol Proveedor', async () => {
    renderizar({ sesion: SESION_CLIENTE });

    expect(
      screen.getByText('No puedes consultar la agenda desde esta sesión.')
    ).toBeInTheDocument();
    expect(consultarAgenda).not.toHaveBeenCalled();
  });

  test('no ofrece acciones de otras historias', async () => {
    renderizar();
    await screen.findByRole('article', { name: /Reserva 19/ });

    ['Aceptar solicitud', 'Rechazar solicitud', 'Proponer otro horario', 'Cancelar reserva', 'Marcar como completada'].forEach(
      (nombre) => {
        expect(
          screen.queryByRole('button', { name: nombre })
        ).not.toBeInTheDocument();
      }
    );
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
  });

  test('vuelve a consultar al cambiar el token de la sesión', async () => {
    const { rerender } = render(
      <MiAgenda sesion={SESION_PROVEEDOR} onCerrarSesion={jest.fn()} />
    );
    await screen.findByRole('article', { name: /Reserva 19/ });

    consultarAgenda.mockResolvedValue([RESERVA_B]);
    rerender(
      <MiAgenda
        sesion={{ ...SESION_PROVEEDOR, token: 'token-proveedor-2' }}
        onCerrarSesion={jest.fn()}
      />
    );

    await waitFor(() =>
      expect(consultarAgenda).toHaveBeenLastCalledWith(
        'token-proveedor-2',
        expect.anything()
      )
    );
    expect(
      await screen.findByRole('article', { name: /Reserva 20/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('article', { name: /Reserva 19/ })
    ).not.toBeInTheDocument();
  });
});
