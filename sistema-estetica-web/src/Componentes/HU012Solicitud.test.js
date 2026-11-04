import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SolicitudServicio } from './SolicitudServicio';
import {
  consultarProveedorPorId,
  consultarServicioPorId,
} from '../Servicios/exploracionService';
import { consultarPerfilCliente } from '../Servicios/clienteService';
import { crearSolicitud } from '../Servicios/solicitudService';

jest.mock('../Servicios/exploracionService');
jest.mock('../Servicios/clienteService');
jest.mock('../Servicios/solicitudService');

const SESION_CLIENTE = {
  token: 'token-cliente',
  rol: 'cliente',
  id: 2,
  nombre: 'Carlos',
  email: 'carlos@example.com',
};

const crearFechaFutura = () => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 7);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const FECHA = crearFechaFutura();
const [ANIO, MES, DIA] = FECHA.split('-');
const FECHA_TEXTO = `${DIA}/${MES}/${ANIO}`;

const SERVICIO = {
  id: 100,
  nombre: 'Limpieza facial profunda',
  categoria: 'Estética facial',
  descripcion: 'Limpieza facial con productos hipoalergénicos.',
  duracion_minutos: 90,
  precio: 120000,
  id_proveedor: 10,
  nombre_proveedor: 'Laura Gómez',
  multimedia: [],
  insumos: [],
};

const PROVEEDOR = {
  id: 10,
  nombre: 'Laura',
  apellido: 'Gómez',
  perfil_profesional: 'Especialista en estética facial.',
  zonasAtencion: [],
  catalogo: [SERVICIO],
};

const PERFIL_CLIENTE = {
  id: 2,
  nombre: 'Carlos',
  apellido: 'Cliente',
  email: 'carlos@example.com',
  telefono: '3001234567',
  direccionPrincipal: {
    ciudad: 'Bogotá',
    barrio_sector: 'Chapinero',
    informacion_complementaria: 'Calle 123 # 45-67',
    telefono: '3001234567',
  },
};

const SOLICITUD_CREADA = {
  id_solicitud: 501,
  nombre_servicio_snapshot: 'Limpieza facial profunda',
  precio_snapshot: 120000,
  duracion_snapshot_minutos: 90,
  fecha_hora_solicitada: `${FECHA}T10:00:00`,
  fecha_hora_propuesta: null,
  direccion_texto: 'Calle 100 # 20-30',
  barrio_sector: 'Usaquén',
  informacion_complementaria: 'Apto 301',
  observaciones: 'Tocar el timbre',
  estado: 'pendiente',
  motivo_rechazo_cancelacion: null,
  fecha_creacion: `${FECHA}T15:20:00`,
  fecha_actualizacion: `${FECHA}T15:20:00`,
  id_cliente: 2,
  id_proveedor: 10,
};

const renderizar = (props = {}) =>
  render(
    <SolicitudServicio
      idServicio={100}
      idProveedor={10}
      sesion={SESION_CLIENTE}
      onVolverDetalle={jest.fn()}
      onVolverExploracion={jest.fn()}
      {...props}
    />
  );

const esperarFormulario = async () => {
  expect(await screen.findByLabelText(/^Fecha/)).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Crear solicitud de servicio' })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Confirmar solicitud' })
  ).toBeInTheDocument();
};

const completarFormulario = () => {
  fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: FECHA } });
  fireEvent.change(screen.getByLabelText(/Hora de inicio/), {
    target: { value: '10:00' },
  });
  fireEvent.change(screen.getByLabelText(/Dirección de atención/), {
    target: { value: 'Calle 100 # 20-30' },
  });
  fireEvent.change(screen.getByLabelText(/Barrio o sector/), {
    target: { value: 'Usaquén' },
  });
  fireEvent.change(screen.getByLabelText(/Información complementaria/), {
    target: { value: 'Apto 301' },
  });
  fireEvent.change(screen.getByLabelText(/Observaciones/), {
    target: { value: 'Tocar el timbre' },
  });
};

const confirmar = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar solicitud' }));

beforeEach(() => {
  jest.clearAllMocks();
  consultarServicioPorId.mockResolvedValue(SERVICIO);
  consultarProveedorPorId.mockResolvedValue(PROVEEDOR);
  consultarPerfilCliente.mockResolvedValue(PERFIL_CLIENTE);
  crearSolicitud.mockResolvedValue(SOLICITUD_CREADA);
});

describe('HU-012: formulario de creación de solicitud', () => {
  test('muestra las condiciones reales del servicio y precarga la dirección principal', async () => {
    renderizar();
    await esperarFormulario();

    expect(screen.getAllByText('Limpieza facial profunda').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Estética facial').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/120\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 hora y 30 minutos/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Laura Gómez').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Dirección de atención/)).toHaveValue(
      'Calle 123 # 45-67'
    );
    expect(screen.getByLabelText(/Barrio o sector/)).toHaveValue('Chapinero');
  });

  test('rechaza el envío cuando falta información obligatoria e identifica los campos', async () => {
    renderizar();
    await esperarFormulario();

    fireEvent.change(screen.getByLabelText(/Dirección de atención/), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText(/Barrio o sector/), {
      target: { value: '' },
    });
    confirmar();

    expect(
      await screen.findByText(
        /Completa la información pendiente: Fecha, Hora, Dirección de atención, Barrio o sector/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText('La fecha es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('La hora es obligatoria')).toBeInTheDocument();
    expect(
      screen.getByText('La dirección de atención es obligatoria')
    ).toBeInTheDocument();
    expect(screen.getByText('El barrio o sector es obligatorio')).toBeInTheDocument();
    expect(crearSolicitud).not.toHaveBeenCalled();
  });

  test('envía exactamente el DTO de HU-012 y muestra la confirmación del backend', async () => {
    renderizar();
    await esperarFormulario();
    completarFormulario();
    confirmar();

    await waitFor(() => expect(crearSolicitud).toHaveBeenCalledTimes(1));

    expect(crearSolicitud).toHaveBeenCalledWith('token-cliente', {
      id_servicio: 100,
      fecha_hora_solicitada: `${FECHA}T10:00:00`,
      direccion_texto: 'Calle 100 # 20-30',
      barrio_sector: 'Usaquén',
      informacion_complementaria: 'Apto 301',
      observaciones: 'Tocar el timbre',
    });

    const [, payload] = crearSolicitud.mock.calls[0];
    expect(Object.keys(payload).sort()).toEqual(
      [
        'barrio_sector',
        'direccion_texto',
        'fecha_hora_solicitada',
        'id_servicio',
        'informacion_complementaria',
        'observaciones',
      ].sort()
    );
    expect(payload).not.toHaveProperty('id_cliente');
    expect(payload).not.toHaveProperty('id_proveedor');
    expect(payload).not.toHaveProperty('precio');
    expect(payload).not.toHaveProperty('duracion_minutos');
    expect(payload).not.toHaveProperty('estado');
    expect(payload).not.toHaveProperty('fecha_creacion');

    expect(
      await screen.findByRole('heading', { name: '¡Solicitud creada correctamente!' })
    ).toBeInTheDocument();
    expect(screen.getByText('Solicitud #501')).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(screen.getByText(/Fecha de creación:/)).toBeInTheDocument();
    expect(screen.getByText(/Última actualización:/)).toBeInTheDocument();
    expect(screen.getAllByText('Limpieza facial profunda').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/120\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 hora y 30 minutos/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(`${FECHA_TEXTO} 11:30`)
    ).toBeInTheDocument();
    expect(screen.getByText(/nombre, el precio y la duración/i)).toBeInTheDocument();
  });

  test('informa el horario no disponible, conserva los datos y no muestra confirmación', async () => {
    crearSolicitud.mockRejectedValue(
      Object.assign(
        new Error(
          'El horario solicitado no se encuentra dentro de la disponibilidad del proveedor'
        ),
        { status: 400 }
      )
    );

    renderizar();
    await esperarFormulario();
    completarFormulario();
    confirmar();

    expect(
      await screen.findByText('El horario solicitado no se encuentra disponible.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '¡Solicitud creada correctamente!' })
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección de atención/)).toHaveValue(
      'Calle 100 # 20-30'
    );
    expect(screen.getByLabelText(/Barrio o sector/)).toHaveValue('Usaquén');
  });

  test('informa también los periodos no disponibles indicados por el backend', async () => {
    crearSolicitud.mockRejectedValue(
      Object.assign(
        new Error(
          'El proveedor no está disponible en la fecha seleccionada (periodo no disponible)'
        ),
        { status: 400 }
      )
    );

    renderizar();
    await esperarFormulario();
    completarFormulario();
    confirmar();

    expect(
      await screen.findByText('El horario solicitado no se encuentra disponible.')
    ).toBeInTheDocument();
    expect(screen.getByText(/periodo no disponible/i)).toBeInTheDocument();
    expect(crearSolicitud).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText(/Dirección de atención/)
    ).toHaveValue('Calle 100 # 20-30');
  });

  test('impide que el servicio pertenezca a un proveedor distinto al seleccionado', async () => {
    renderizar({ idProveedor: 99 });

    expect(
      await screen.findByText('El servicio no pertenece al proveedor seleccionado.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Confirmar solicitud' })
    ).not.toBeInTheDocument();
    expect(crearSolicitud).not.toHaveBeenCalled();
  });

  test('vuelve a consultar las condiciones antes de confirmar y avisa si cambiaron', async () => {
    consultarServicioPorId
      .mockResolvedValueOnce(SERVICIO)
      .mockResolvedValueOnce({
        ...SERVICIO,
        nombre: 'Limpieza facial premium',
        precio: 150000,
        duracion_minutos: 120,
      });

    renderizar();
    await esperarFormulario();
    completarFormulario();
    confirmar();

    expect(
      await screen.findByText(/Las condiciones del servicio cambiaron/i)
    ).toBeInTheDocument();
    expect(crearSolicitud).not.toHaveBeenCalled();
    expect(screen.getAllByText('Limpieza facial premium').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/150\.000/).length).toBeGreaterThan(0);
  });

  test('rechaza el envío si el servicio dejó de estar en el catálogo activo', async () => {
    consultarProveedorPorId.mockResolvedValue({
      ...PROVEEDOR,
      catalogo: [],
    });

    renderizar();
    await esperarFormulario();
    completarFormulario();
    confirmar();

    expect(
      await screen.findByText(/ya no se encuentra disponible en el catálogo del proveedor/i)
    ).toBeInTheDocument();
    expect(crearSolicitud).not.toHaveBeenCalled();
  });

  test('mapea los errores de validación por campo devueltos por el backend', async () => {
    crearSolicitud.mockRejectedValue({
      status: 400,
      fieldErrors: {
        direccion_texto: 'La dirección de atención es obligatoria',
        barrio_sector: 'El barrio o sector no puede superar los 150 caracteres',
      },
    });

    renderizar();
    await esperarFormulario();
    completarFormulario();
    confirmar();

    expect(
      await screen.findByText(/El servidor rechazó la solicitud/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText('La dirección de atención es obligatoria')
    ).toBeInTheDocument();
    expect(
      screen.getByText('El barrio o sector no puede superar los 150 caracteres')
    ).toBeInTheDocument();
  });

  test('informa el error de sesión sin simular la creación', async () => {
    crearSolicitud.mockRejectedValue(
      Object.assign(new Error('Acceso denegado: no tiene permisos para realizar esta operación'), {
        status: 403,
        esErrorAutenticacion: true,
      })
    );

    renderizar();
    await esperarFormulario();
    completarFormulario();
    confirmar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Acceso denegado: no tiene permisos para realizar esta operación'
    );
    expect(
      screen.queryByRole('heading', { name: '¡Solicitud creada correctamente!' })
    ).not.toBeInTheDocument();
  });

  test('evita envíos duplicados mientras la primera solicitud está en curso', async () => {
    let resolver;
    crearSolicitud.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );

    renderizar();
    await esperarFormulario();
    completarFormulario();

    const boton = screen.getByRole('button', { name: 'Confirmar solicitud' });
    fireEvent.click(boton);
    fireEvent.click(boton);

    await waitFor(() => expect(crearSolicitud).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolver(SOLICITUD_CREADA);
    });
  });

  test('restaura la dirección principal registrada cuando el Cliente la necesita', async () => {
    renderizar();
    await esperarFormulario();

    fireEvent.change(screen.getByLabelText(/Dirección de atención/), {
      target: { value: 'Otra dirección temporal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Usar estos datos' }));

    expect(screen.getByLabelText(/Dirección de atención/)).toHaveValue(
      'Calle 123 # 45-67'
    );
    expect(screen.getByLabelText(/Barrio o sector/)).toHaveValue('Chapinero');
  });

  test('muestra un estado específico cuando el servicio no existe', async () => {
    consultarServicioPorId.mockRejectedValue(
      Object.assign(new Error('El servicio no fue encontrado'), { status: 404 })
    );

    renderizar();

    expect(
      await screen.findByText('No se encontró el servicio solicitado.')
    ).toBeInTheDocument();
    expect(crearSolicitud).not.toHaveBeenCalled();
  });

  test('restringe la funcionalidad a usuarios con rol Cliente', async () => {
    renderizar({ sesion: { token: 'token-proveedor', rol: 'proveedor' } });

    expect(
      screen.getByText('No puedes crear solicitudes de servicio.')
    ).toBeInTheDocument();
    expect(consultarServicioPorId).not.toHaveBeenCalled();
    expect(consultarPerfilCliente).not.toHaveBeenCalled();
    expect(crearSolicitud).not.toHaveBeenCalled();
  });

  test('ofrece ir a Mis solicitudes después de crear, sin duplicar la creación', async () => {
    const onVerMisSolicitudes = jest.fn();

    renderizar({ onVerMisSolicitudes });
    await esperarFormulario();
    completarFormulario();
    confirmar();

    const boton = await screen.findByRole('button', {
      name: 'Ver mis solicitudes',
    });
    fireEvent.click(boton);

    expect(onVerMisSolicitudes).toHaveBeenCalledTimes(1);
    expect(crearSolicitud).toHaveBeenCalledTimes(1);
  });
});
