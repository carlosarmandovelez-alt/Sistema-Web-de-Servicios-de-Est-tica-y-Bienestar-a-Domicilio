import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GestionDisponibilidad } from './GestionDisponibilidad';
import { PerfilProveedor } from './PerfilProveedor';
import App from '../App';
import {
  consultarDisponibilidad,
  guardarDisponibilidad,
  consultarPeriodosNoDisponibles,
  registrarPeriodoNoDisponible,
} from '../Servicios/disponibilidadService';
import { consultarPerfilProveedor } from '../Servicios/proveedorService';
import { consultarPerfilCliente } from '../Servicios/clienteService';

jest.mock('../Servicios/disponibilidadService');
jest.mock('../Servicios/proveedorService', () => ({
  consultarPerfilProveedor: jest.fn(),
  actualizarPerfilProveedor: jest.fn(),
  actualizarZonasAtencion: jest.fn(),
}));
jest.mock('../Servicios/clienteService', () => ({
  consultarPerfilCliente: jest.fn(),
  actualizarDatosPersonales: jest.fn(),
  actualizarDireccionPrincipal: jest.fn(),
}));

const DISPONIBILIDAD = [
  { id: 1, dia_semana: 'lunes', hora_inicio: '08:00:00', hora_fin: '17:00:00' },
  { id: 2, dia_semana: 'miercoles', hora_inicio: '09:00', hora_fin: '18:00' },
  { id: 3, dia_semana: 'lunes', hora_inicio: '19:00', hora_fin: '21:00' },
];

const PERIODOS = [
  { id: 1, fecha_inicio: '2026-11-10', fecha_fin: '2026-11-12', motivo: 'Viaje' },
  { id: 2, fecha_inicio: '2026-12-01', fecha_fin: '2026-12-01', motivo: null },
];

const crearPromesaDiferida = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((resolve, reject) => {
    resolver = resolve;
    rechazar = reject;
  });
  return { promesa, resolver, rechazar };
};

const renderizar = (props = {}) =>
  render(
    <GestionDisponibilidad
      token="jwt-proveedor"
      onSesionExpirada={jest.fn()}
      onCerrarSesion={jest.fn()}
      {...props}
    />
  );

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  consultarDisponibilidad.mockResolvedValue(DISPONIBILIDAD);
  consultarPeriodosNoDisponibles.mockResolvedValue(PERIODOS);
  guardarDisponibilidad.mockImplementation(async (token, horarios) =>
    horarios.map((horario, indice) => ({ id: indice + 1, ...horario }))
  );
  registrarPeriodoNoDisponible.mockResolvedValue({
    id: 3,
    fecha_inicio: '2026-12-20',
    fecha_fin: '2026-12-22',
    motivo: 'Viaje',
  });
  consultarPerfilProveedor.mockResolvedValue({
    id: 1,
    nombre: 'Laura',
    apellido: 'Gómez',
    email: 'laura@test.com',
    telefono: null,
    perfil_profesional: 'Especialista en estética facial.',
    zonasAtencion: [],
  });
  consultarPerfilCliente.mockResolvedValue({
    id: 2,
    nombre: 'Carlos',
    apellido: 'Cliente',
    email: 'carlos@test.com',
    telefono: null,
    direccionPrincipal: null,
  });
});

describe('HU-011: consulta de disponibilidad', () => {
  test('muestra los horarios agrupados por día y los periodos registrados', async () => {
    renderizar();

    expect(
      await screen.findByText('08:00 – 17:00 / 19:00 – 21:00')
    ).toBeInTheDocument();
    expect(screen.getByText('09:00 – 18:00')).toBeInTheDocument();
    expect(screen.getAllByText('No configurado').length).toBeGreaterThan(0);
    expect(screen.getByText('10/11/2026 – 12/11/2026')).toBeInTheDocument();
    expect(screen.getByText('01/12/2026')).toBeInTheDocument();
    expect(screen.getByText('Viaje')).toBeInTheDocument();
    expect(consultarDisponibilidad).toHaveBeenCalledWith(
      'jwt-proveedor',
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  test('muestra estados vacíos cuando no hay horarios ni periodos', async () => {
    consultarDisponibilidad.mockResolvedValue([]);
    consultarPeriodosNoDisponibles.mockResolvedValue([]);

    renderizar();

    expect(
      await screen.findByText(
        'Aún no has configurado tus horarios habituales de atención.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('No tienes periodos no disponibles registrados.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configurar horarios' })).toBeInTheDocument();
  });

  test('muestra un indicador de carga mientras consulta la configuración', async () => {
    const disponibilidad = crearPromesaDiferida();
    const periodos = crearPromesaDiferida();
    consultarDisponibilidad.mockImplementation(() => disponibilidad.promesa);
    consultarPeriodosNoDisponibles.mockImplementation(() => periodos.promesa);

    renderizar();

    expect(screen.getByText('Cargando disponibilidad...')).toBeInTheDocument();

    await act(async () => {
      disponibilidad.resolver(DISPONIBILIDAD);
      periodos.resolver(PERIODOS);
    });

    expect(
      await screen.findByText('08:00 – 17:00 / 19:00 – 21:00')
    ).toBeInTheDocument();
  });

  test('informa cuando el backend no expone los endpoints de disponibilidad', async () => {
    const noEncontrado = Object.assign(new Error('Not found'), { status: 404 });
    consultarDisponibilidad.mockRejectedValue(noEncontrado);
    consultarPeriodosNoDisponibles.mockRejectedValue(noEncontrado);

    renderizar();

    expect(await screen.findByText('Función aún no disponible')).toBeInTheDocument();
    expect(
      screen.getByText(/No se ha guardado ni modificado ningún dato/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Guardar disponibilidad' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Configurar horarios' })
    ).not.toBeInTheDocument();
  });

  test('notifica la sesión expirada y no muestra formularios', async () => {
    const errorAuth = Object.assign(new Error('Sesión expirada'), { status: 401 });
    consultarDisponibilidad.mockRejectedValue(errorAuth);
    consultarPeriodosNoDisponibles.mockRejectedValue(errorAuth);
    const onSesionExpirada = jest.fn();

    renderizar({ onSesionExpirada });

    expect(await screen.findByText('Sesión expirada')).toBeInTheDocument();
    expect(onSesionExpirada).toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Guardar disponibilidad' })
    ).not.toBeInTheDocument();
  });
});

describe('HU-011: configuración de horarios', () => {
  test('rechaza una hora inicial igual a la hora final sin llamar al backend', async () => {
    renderizar();
    await screen.findByText('08:00 – 17:00 / 19:00 – 21:00');

    fireEvent.click(screen.getByRole('button', { name: 'Editar horarios' }));
    fireEvent.change(screen.getAllByLabelText(/Hora final/i)[0], {
      target: { value: '08:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar disponibilidad' }));

    expect(
      await screen.findByText('La hora inicial debe ser anterior a la hora final.')
    ).toBeInTheDocument();
    expect(guardarDisponibilidad).not.toHaveBeenCalled();
  });

  test('rechaza una hora inicial posterior a la hora final', async () => {
    renderizar();
    await screen.findByText('08:00 – 17:00 / 19:00 – 21:00');

    fireEvent.click(screen.getByRole('button', { name: 'Editar horarios' }));
    fireEvent.change(screen.getAllByLabelText(/Hora inicial/i)[0], {
      target: { value: '18:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar disponibilidad' }));

    expect(
      await screen.findByText('La hora inicial debe ser anterior a la hora final.')
    ).toBeInTheDocument();
    expect(guardarDisponibilidad).not.toHaveBeenCalled();
  });

  test('guarda varios días y rangos válidos y actualiza la vista', async () => {
    renderizar();
    await screen.findByText('08:00 – 17:00 / 19:00 – 21:00');

    fireEvent.click(screen.getByRole('button', { name: 'Editar horarios' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar otro horario' }));

    const dias = screen.getAllByLabelText(/^Día/i);
    const horasIniciales = screen.getAllByLabelText(/Hora inicial/i);
    const horasFinales = screen.getAllByLabelText(/Hora final/i);
    fireEvent.change(dias[dias.length - 1], { target: { value: 'martes' } });
    fireEvent.change(horasIniciales[horasIniciales.length - 1], {
      target: { value: '10:00' },
    });
    fireEvent.change(horasFinales[horasFinales.length - 1], {
      target: { value: '14:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar disponibilidad' }));

    await waitFor(() => expect(guardarDisponibilidad).toHaveBeenCalledTimes(1));
    expect(guardarDisponibilidad).toHaveBeenCalledWith(
      'jwt-proveedor',
      expect.arrayContaining([
        expect.objectContaining({
          dia_semana: 'martes',
          hora_inicio: '10:00',
          hora_fin: '14:00',
        }),
      ])
    );
    expect(await screen.findByText('Disponibilidad guardada correctamente.')).toBeInTheDocument();
    expect(screen.getByText('10:00 – 14:00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar disponibilidad' })).not.toBeInTheDocument();
  });

  test('conserva los valores del formulario si falla el guardado', async () => {
    guardarDisponibilidad.mockRejectedValue(
      new Error('La hora de inicio debe ser anterior a la hora de fin para el día lunes')
    );

    renderizar();
    await screen.findByText('08:00 – 17:00 / 19:00 – 21:00');

    fireEvent.click(screen.getByRole('button', { name: 'Editar horarios' }));
    fireEvent.change(screen.getAllByLabelText(/Hora inicial/i)[0], {
      target: { value: '08:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar disponibilidad' }));

    expect(
      await screen.findByText(/La hora de inicio debe ser anterior a la hora de fin/i)
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Hora inicial/i)[0]).toHaveValue('08:30');
    expect(screen.getByRole('button', { name: 'Guardar disponibilidad' })).toBeInTheDocument();
  });

  test('deshabilita el botón de guardado mientras la operación está en curso', async () => {
    const diferida = crearPromesaDiferida();
    guardarDisponibilidad.mockImplementation(() => diferida.promesa);

    renderizar();
    await screen.findByText('08:00 – 17:00 / 19:00 – 21:00');

    fireEvent.click(screen.getByRole('button', { name: 'Editar horarios' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar disponibilidad' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Guardando\.\.\./i })).toBeDisabled()
    );
    fireEvent.click(screen.getByRole('button', { name: /Guardando\.\.\./i }));
    expect(guardarDisponibilidad).toHaveBeenCalledTimes(1);

    await act(async () => {
      diferida.resolver(DISPONIBILIDAD);
    });
  });
});

describe('HU-011: periodos no disponibles', () => {
  test('rechaza una fecha inicial posterior a la fecha final', async () => {
    renderizar();
    await screen.findByText('10/11/2026 – 12/11/2026');

    fireEvent.change(screen.getByLabelText(/Fecha inicial/i), {
      target: { value: '2026-11-12' },
    });
    fireEvent.change(screen.getByLabelText(/Fecha final/i), {
      target: { value: '2026-11-10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar periodo' }));

    expect(
      await screen.findByText('La fecha de inicio no puede ser posterior a la fecha de fin.')
    ).toBeInTheDocument();
    expect(registrarPeriodoNoDisponible).not.toHaveBeenCalled();
  });

  test('acepta una fecha única y muestra el periodo confirmado', async () => {
    registrarPeriodoNoDisponible.mockResolvedValue({
      id: 3,
      fecha_inicio: '2026-12-15',
      fecha_fin: '2026-12-15',
      motivo: null,
    });

    renderizar();
    await screen.findByText('10/11/2026 – 12/11/2026');

    fireEvent.change(screen.getByLabelText(/Fecha inicial/i), {
      target: { value: '2026-12-15' },
    });
    fireEvent.change(screen.getByLabelText(/Fecha final/i), {
      target: { value: '2026-12-15' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar periodo' }));

    await waitFor(() => expect(registrarPeriodoNoDisponible).toHaveBeenCalledTimes(1));
    expect(registrarPeriodoNoDisponible).toHaveBeenCalledWith('jwt-proveedor', {
      fecha_inicio: '2026-12-15',
      fecha_fin: '2026-12-15',
      motivo: null,
    });
    expect(
      await screen.findByText('Periodo no disponible registrado correctamente.')
    ).toBeInTheDocument();
    expect(screen.getByText('15/12/2026')).toBeInTheDocument();
  });

  test('registra un periodo de varios días con motivo', async () => {
    renderizar();
    await screen.findByText('10/11/2026 – 12/11/2026');

    fireEvent.change(screen.getByLabelText(/Fecha inicial/i), {
      target: { value: '2026-12-20' },
    });
    fireEvent.change(screen.getByLabelText(/Fecha final/i), {
      target: { value: '2026-12-22' },
    });
    fireEvent.change(screen.getByLabelText(/Motivo/i), {
      target: { value: '  Viaje  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar periodo' }));

    await waitFor(() => expect(registrarPeriodoNoDisponible).toHaveBeenCalledTimes(1));
    expect(registrarPeriodoNoDisponible).toHaveBeenCalledWith('jwt-proveedor', {
      fecha_inicio: '2026-12-20',
      fecha_fin: '2026-12-22',
      motivo: 'Viaje',
    });
    expect(await screen.findByText('20/12/2026 – 22/12/2026')).toBeInTheDocument();
  });

  test('conserva los valores del periodo si falla el registro', async () => {
    registrarPeriodoNoDisponible.mockRejectedValue(
      new Error('No fue posible registrar el periodo no disponible.')
    );

    renderizar();
    await screen.findByText('10/11/2026 – 12/11/2026');

    fireEvent.change(screen.getByLabelText(/Fecha inicial/i), {
      target: { value: '2026-12-20' },
    });
    fireEvent.change(screen.getByLabelText(/Fecha final/i), {
      target: { value: '2026-12-22' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar periodo' }));

    expect(
      await screen.findByText('No fue posible registrar el periodo no disponible.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha inicial/i)).toHaveValue('2026-12-20');
    expect(screen.getByLabelText(/Fecha final/i)).toHaveValue('2026-12-22');
  });
});

describe('HU-011: integración y protección de acceso', () => {
  test('el panel del Proveedor muestra la pestaña Disponibilidad sin perder las anteriores', async () => {
    render(
      <PerfilProveedor
        sesion={{ token: 'jwt-proveedor', rol: 'proveedor', id: 1, nombre: 'Laura' }}
        onCerrarSesion={jest.fn()}
        onActualizarSesion={jest.fn()}
      />
    );

    expect(await screen.findByText('Mi Perfil Profesional')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Registrar Servicio' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Información Complementaria' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Disponibilidad' }));

    expect(await screen.findByText('08:00 – 17:00 / 19:00 – 21:00')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Gestión de disponibilidad/i })
    ).toBeInTheDocument();
  });

  test('un Cliente no tiene acceso a la gestión de disponibilidad', async () => {
    localStorage.setItem(
      'sesion',
      JSON.stringify({ token: 'jwt-cliente', rol: 'cliente', id: 2, nombre: 'Carlos' })
    );

    render(<App />);

    expect(await screen.findByText('Panel de Cliente')).toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: 'Disponibilidad' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Gestión de disponibilidad')).not.toBeInTheDocument();
  });
});
