import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PerfilProveedorPublico } from './PerfilProveedorPublico';
import { DetalleServicio } from './DetalleServicio';
import { ExplorarServicios } from './ExplorarServicios';
import {
  obtenerProveedoresDisponibles,
  obtenerServiciosDisponibles,
  buscarServiciosPorNombre,
  buscarServiciosPorCategoria,
  consultarProveedorPorId,
  consultarServicioPorId,
} from '../Servicios/exploracionService';
import { obtenerCategorias } from '../Servicios/servicioService';

jest.mock('../Servicios/exploracionService');
jest.mock('../Servicios/servicioService', () => ({
  obtenerCategorias: jest.fn(),
}));

const CATEGORIAS = [
  { id_categoria: 1, nombre: 'Estética facial' },
  { id_categoria: 2, nombre: 'Masajes relajantes' },
];

const SERVICIO_RESUMEN = {
  id: 100,
  nombre: 'Limpieza facial profunda',
  categoria: 'Estética facial',
  descripcion: 'Limpieza facial con productos hipoalergénicos.',
  duracion_minutos: 90,
  precio: 85000,
  id_proveedor: 10,
  nombre_proveedor: 'Laura Gómez',
};

const SERVICIO_MASAJE = {
  id: 101,
  nombre: 'Masaje relajante',
  categoria: 'Masajes relajantes',
  descripcion: 'Masaje de relajación con aceites esenciales.',
  duracion_minutos: 60,
  precio: 70000,
  id_proveedor: 20,
  nombre_proveedor: 'Andrés Pérez',
};

const PROVEEDOR_COMPLETO = {
  id: 10,
  nombre: 'Laura',
  apellido: 'Gómez',
  perfil_profesional:
    'Especialista en estética facial y cuidado de la piel, con formación en tratamientos no invasivos.',
  zonasAtencion: [
    { ciudad: 'Bogotá', barrio_sector: 'Chapinero' },
    { ciudad: 'Bogotá', barrio_sector: 'Usaquén' },
    { ciudad: 'Medellín', barrio_sector: null },
  ],
  catalogo: [SERVICIO_RESUMEN],
};

const PROVEEDOR_SIN_ZONAS = {
  ...PROVEEDOR_COMPLETO,
  zonasAtencion: [],
};

const PROVEEDOR_SIN_CATALOGO = {
  ...PROVEEDOR_COMPLETO,
  catalogo: [],
};

const PROVEEDOR_DOS = {
  id: 20,
  nombre: 'Andrés',
  apellido: 'Pérez',
  perfil_profesional: 'Terapeuta de masajes relajantes.',
  zonasAtencion: [{ ciudad: 'Cali', barrio_sector: 'Granada' }],
  catalogo: [SERVICIO_MASAJE],
};

const SERVICIO_DETALLE = {
  ...SERVICIO_RESUMEN,
  descripcion:
    'Limpieza facial profunda con productos hipoalergénicos y masaje de drenaje.',
  multimedia: [
    {
      id: 1,
      tipo_archivo: 'foto',
      url_archivo: 'https://cdn.ejemplo.com/servicios/facial-1.jpg',
      orden: 0,
    },
    {
      id: 2,
      tipo_archivo: 'video',
      url_archivo: 'https://cdn.ejemplo.com/servicios/facial-1.mp4',
      orden: 1,
    },
  ],
  insumos: [
    { id: 1, nombre: 'Crema hidratante', tipo: 'producto' },
    { id: 2, nombre: 'Camilla portátil', tipo: 'equipo' },
  ],
};

const SERVICIO_SIN_COMPLEMENTOS = {
  ...SERVICIO_DETALLE,
  multimedia: [],
  insumos: [],
};

const crearPromesaDiferida = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((resolve, reject) => {
    resolver = resolve;
    rechazar = reject;
  });
  return { promesa, resolver, rechazar };
};

const errorNoEncontrado = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 404;
  return error;
};

beforeEach(() => {
  jest.clearAllMocks();

  obtenerCategorias.mockResolvedValue(CATEGORIAS);
  obtenerProveedoresDisponibles.mockResolvedValue([PROVEEDOR_COMPLETO]);
  obtenerServiciosDisponibles.mockResolvedValue([SERVICIO_RESUMEN]);
  buscarServiciosPorNombre.mockResolvedValue([SERVICIO_RESUMEN]);
  buscarServiciosPorCategoria.mockResolvedValue([SERVICIO_RESUMEN]);
  consultarProveedorPorId.mockResolvedValue(PROVEEDOR_COMPLETO);
  consultarServicioPorId.mockResolvedValue(SERVICIO_DETALLE);
});

describe('HU-010: perfil público del proveedor', () => {
  test('muestra información profesional, zonas orientativas y catálogo', async () => {
    render(
      <PerfilProveedorPublico
        idProveedor={10}
        onVolverExploracion={jest.fn()}
        onVerDetalleServicio={jest.fn()}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Laura Gómez' })).toBeInTheDocument();
    expect(
      screen.getByText(/Especialista en estética facial y cuidado de la piel/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Zonas generales de atención' })
    ).toBeInTheDocument();
    expect(screen.getByText('Bogotá')).toBeInTheDocument();
    expect(screen.getByText('Chapinero')).toBeInTheDocument();
    expect(screen.getByText('Usaquén')).toBeInTheDocument();
    expect(screen.getByText('Medellín')).toBeInTheDocument();
    expect(screen.getByText('Toda la ciudad o sector general')).toBeInTheDocument();
    expect(
      screen.getByText(/Las zonas de atención son orientativas/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Catálogo de servicios' })).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /Servicio Limpieza facial profunda/i })
    ).toBeInTheDocument();
    expect(consultarProveedorPorId).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  test('muestra el mensaje de zonas no registradas y conserva el catálogo', async () => {
    consultarProveedorPorId.mockResolvedValue(PROVEEDOR_SIN_ZONAS);

    render(
      <PerfilProveedorPublico
        idProveedor={10}
        onVolverExploracion={jest.fn()}
        onVerDetalleServicio={jest.fn()}
      />
    );

    expect(
      await screen.findByText(
        'Este proveedor aún no tiene zonas generales de atención registradas.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Las zonas de atención son orientativas/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /Servicio Limpieza facial profunda/i })
    ).toBeInTheDocument();
  });

  test('muestra un estado informativo cuando el catálogo está vacío', async () => {
    consultarProveedorPorId.mockResolvedValue(PROVEEDOR_SIN_CATALOGO);

    render(
      <PerfilProveedorPublico
        idProveedor={10}
        onVolverExploracion={jest.fn()}
        onVerDetalleServicio={jest.fn()}
      />
    );

    expect(
      await screen.findByText(
        'Este proveedor todavía no tiene servicios disponibles en su catálogo.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Chapinero')).toBeInTheDocument();
  });

  test('muestra un indicador de carga mientras consulta el perfil', async () => {
    const diferida = crearPromesaDiferida();
    consultarProveedorPorId.mockImplementation(() => diferida.promesa);

    render(
      <PerfilProveedorPublico
        idProveedor={10}
        onVolverExploracion={jest.fn()}
        onVerDetalleServicio={jest.fn()}
      />
    );

    expect(screen.getByText('Cargando información del proveedor...')).toBeInTheDocument();

    await act(async () => {
      diferida.resolver(PROVEEDOR_COMPLETO);
    });

    expect(await screen.findByRole('heading', { name: 'Laura Gómez' })).toBeInTheDocument();
  });

  test('informa cuando el proveedor no existe y permite volver a exploración', async () => {
    consultarProveedorPorId.mockRejectedValue(
      errorNoEncontrado('El proveedor no fue encontrado')
    );
    const onVolverExploracion = jest.fn();

    render(
      <PerfilProveedorPublico
        idProveedor={999}
        onVolverExploracion={onVolverExploracion}
        onVerDetalleServicio={jest.fn()}
      />
    );

    expect(
      await screen.findByText('No se encontró el proveedor solicitado.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Laura Gómez' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la exploración' }));
    expect(onVolverExploracion).toHaveBeenCalledTimes(1);
  });

  test('distingue un error de conexión y permite reintentar el perfil', async () => {
    consultarProveedorPorId
      .mockRejectedValueOnce(
        new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.')
      )
      .mockResolvedValueOnce(PROVEEDOR_COMPLETO);

    render(
      <PerfilProveedorPublico
        idProveedor={10}
        onVolverExploracion={jest.fn()}
        onVerDetalleServicio={jest.fn()}
      />
    );

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/No fue posible conectar con el servidor/i);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Laura Gómez' })).toBeInTheDocument();
  });

  test('descarta la respuesta obsoleta al consultar otro proveedor', async () => {
    const primera = crearPromesaDiferida();
    const segunda = crearPromesaDiferida();
    consultarProveedorPorId
      .mockImplementationOnce(() => primera.promesa)
      .mockImplementationOnce(() => segunda.promesa);

    const { rerender } = render(
      <PerfilProveedorPublico
        idProveedor={10}
        onVolverExploracion={jest.fn()}
        onVerDetalleServicio={jest.fn()}
      />
    );

    await waitFor(() => expect(consultarProveedorPorId).toHaveBeenCalledTimes(1));

    rerender(
      <PerfilProveedorPublico
        idProveedor={20}
        onVolverExploracion={jest.fn()}
        onVerDetalleServicio={jest.fn()}
      />
    );
    await waitFor(() => expect(consultarProveedorPorId).toHaveBeenCalledTimes(2));

    await act(async () => {
      segunda.resolver(PROVEEDOR_DOS);
    });
    expect(await screen.findByRole('heading', { name: 'Andrés Pérez' })).toBeInTheDocument();

    await act(async () => {
      primera.resolver(PROVEEDOR_COMPLETO);
    });

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Laura Gómez' })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('heading', { name: 'Andrés Pérez' })).toBeInTheDocument();
  });

  test('invoca el detalle del servicio seleccionado desde el catálogo', async () => {
    const onVerDetalleServicio = jest.fn();

    render(
      <PerfilProveedorPublico
        idProveedor={10}
        onVolverExploracion={jest.fn()}
        onVerDetalleServicio={onVerDetalleServicio}
      />
    );

    const tarjeta = await screen.findByRole('article', {
      name: /Servicio Limpieza facial profunda/i,
    });
    fireEvent.click(
      within(tarjeta).getByRole('button', {
        name: 'Ver detalle de Limpieza facial profunda',
      })
    );

    expect(onVerDetalleServicio).toHaveBeenCalledWith(
      expect.objectContaining({ id: 100 })
    );
  });
});

describe('HU-010: detalle del servicio', () => {
  test('muestra nombre, categoría, descripción, precio, duración, multimedia e insumos', async () => {
    render(
      <DetalleServicio
        idServicio={100}
        idProveedor={10}
        onVolverProveedor={jest.fn()}
        onVolverExploracion={jest.fn()}
        onVerProveedor={jest.fn()}
      />
    );

    expect(
      await screen.findByRole('heading', { name: 'Limpieza facial profunda' })
    ).toBeInTheDocument();
    expect(screen.getByText('Estética facial')).toBeInTheDocument();
    expect(
      screen.getByText(/Limpieza facial profunda con productos hipoalergénicos/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(screen.getByText('Duración: 1 hora y 30 minutos')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Limpieza facial profunda - imagen 1' })
    ).toBeInTheDocument();
    expect(screen.getByText('Abrir video de referencia')).toBeInTheDocument();
    expect(screen.getByText('Crema hidratante')).toBeInTheDocument();
    expect(screen.getByText('Producto')).toBeInTheDocument();
    expect(screen.getByText('Camilla portátil')).toBeInTheDocument();
    expect(screen.getByText('Equipo')).toBeInTheDocument();
  });

  test('funciona sin multimedia ni insumos y muestra mensajes discretos', async () => {
    consultarServicioPorId.mockResolvedValue(SERVICIO_SIN_COMPLEMENTOS);

    render(
      <DetalleServicio
        idServicio={100}
        idProveedor={10}
        onVolverProveedor={jest.fn()}
        onVolverExploracion={jest.fn()}
        onVerProveedor={jest.fn()}
      />
    );

    expect(
      await screen.findByRole('heading', { name: 'Limpieza facial profunda' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Este servicio no tiene fotografías ni videos asociados.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Este servicio no tiene productos, insumos o equipos asociados.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('evita un error visible cuando una imagen no puede cargarse', async () => {
    render(
      <DetalleServicio
        idServicio={100}
        idProveedor={10}
        onVolverProveedor={jest.fn()}
        onVolverExploracion={jest.fn()}
        onVerProveedor={jest.fn()}
      />
    );

    const imagen = await screen.findByRole('img', {
      name: 'Limpieza facial profunda - imagen 1',
    });
    fireEvent.error(imagen);

    expect(await screen.findByText('No fue posible cargar esta imagen.')).toBeInTheDocument();
  });

  test('muestra un indicador de carga mientras consulta el detalle', async () => {
    const diferida = crearPromesaDiferida();
    consultarServicioPorId.mockImplementation(() => diferida.promesa);

    render(
      <DetalleServicio
        idServicio={100}
        idProveedor={10}
        onVolverProveedor={jest.fn()}
        onVolverExploracion={jest.fn()}
        onVerProveedor={jest.fn()}
      />
    );

    expect(screen.getByText('Cargando detalle del servicio...')).toBeInTheDocument();

    await act(async () => {
      diferida.resolver(SERVICIO_DETALLE);
    });

    expect(
      await screen.findByRole('heading', { name: 'Limpieza facial profunda' })
    ).toBeInTheDocument();
  });

  test('informa cuando el servicio no existe y permite regresar', async () => {
    consultarServicioPorId.mockRejectedValue(
      errorNoEncontrado('El servicio no fue encontrado')
    );
    const onVolverProveedor = jest.fn();
    const onVolverExploracion = jest.fn();

    render(
      <DetalleServicio
        idServicio={999}
        idProveedor={10}
        onVolverProveedor={onVolverProveedor}
        onVolverExploracion={onVolverExploracion}
        onVerProveedor={jest.fn()}
      />
    );

    expect(
      await screen.findByText('No se encontró el servicio solicitado.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Limpieza facial profunda' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver al perfil del proveedor' }));
    expect(onVolverProveedor).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la exploración' }));
    expect(onVolverExploracion).toHaveBeenCalledTimes(1);
  });

  test('distingue un error de conexión y permite reintentar el detalle', async () => {
    consultarServicioPorId
      .mockRejectedValueOnce(new Error('No fue posible conectar con el servidor.'))
      .mockResolvedValueOnce(SERVICIO_DETALLE);

    render(
      <DetalleServicio
        idServicio={100}
        idProveedor={10}
        onVolverProveedor={jest.fn()}
        onVolverExploracion={jest.fn()}
        onVerProveedor={jest.fn()}
      />
    );

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/No fue posible conectar con el servidor/i);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('heading', { name: 'Limpieza facial profunda' })
    ).toBeInTheDocument();
  });

  test('descarta la respuesta obsoleta al consultar otro servicio', async () => {
    const primera = crearPromesaDiferida();
    const segunda = crearPromesaDiferida();
    consultarServicioPorId
      .mockImplementationOnce(() => primera.promesa)
      .mockImplementationOnce(() => segunda.promesa);

    const { rerender } = render(
      <DetalleServicio
        idServicio={100}
        idProveedor={10}
        onVolverProveedor={jest.fn()}
        onVolverExploracion={jest.fn()}
        onVerProveedor={jest.fn()}
      />
    );

    await waitFor(() => expect(consultarServicioPorId).toHaveBeenCalledTimes(1));

    rerender(
      <DetalleServicio
        idServicio={101}
        idProveedor={20}
        onVolverProveedor={jest.fn()}
        onVolverExploracion={jest.fn()}
        onVerProveedor={jest.fn()}
      />
    );
    await waitFor(() => expect(consultarServicioPorId).toHaveBeenCalledTimes(2));

    await act(async () => {
      segunda.resolver({
        ...SERVICIO_MASAJE,
        multimedia: [],
        insumos: [],
      });
    });
    expect(
      await screen.findByRole('heading', { name: 'Masaje relajante' })
    ).toBeInTheDocument();

    await act(async () => {
      primera.resolver(SERVICIO_DETALLE);
    });

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Limpieza facial profunda' })
      ).not.toBeInTheDocument()
    );
    expect(
      screen.getByRole('heading', { name: 'Masaje relajante' })
    ).toBeInTheDocument();
  });
});

describe('HU-010: navegación integrada con la exploración de HU-009', () => {
  test('permite explorar, ver perfil, abrir detalle y regresar conservando la búsqueda', async () => {
    render(<ExplorarServicios />);

    await screen.findByRole('article', { name: /Proveedor Laura Gómez/i });
    await screen.findByRole('article', { name: /Servicio Limpieza facial profunda/i });

    fireEvent.change(screen.getByLabelText(/Buscar servicio por nombre/i), {
      target: { value: 'facial' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() =>
      expect(buscarServiciosPorNombre).toHaveBeenCalledWith(
        'facial',
        expect.objectContaining({ signal: expect.anything() })
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver perfil y catálogo' }));
    expect(await screen.findByRole('heading', { name: 'Laura Gómez' })).toBeInTheDocument();
    expect(screen.getByText('Chapinero')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Ver detalle de Limpieza facial profunda' })
    );
    expect(
      await screen.findByRole('heading', { name: 'Limpieza facial profunda' })
    ).toBeInTheDocument();
    expect(consultarServicioPorId).toHaveBeenCalledWith(
      100,
      expect.objectContaining({ signal: expect.anything() })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Volver al perfil del proveedor' }));
    expect(await screen.findByRole('heading', { name: 'Laura Gómez' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la exploración' }));
    expect(await screen.findByLabelText(/Buscar servicio por nombre/i)).toHaveValue('facial');
    expect(screen.getByText(/Nombre: “facial”/)).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /Proveedor Laura Gómez/i })
    ).toBeInTheDocument();
  });

  test('abre el detalle directamente desde la exploración y permite ir al perfil', async () => {
    render(<ExplorarServicios />);

    const tarjeta = await screen.findByRole('article', {
      name: /Servicio Limpieza facial profunda/i,
    });
    fireEvent.click(
      within(tarjeta).getByRole('button', {
        name: 'Ver detalle de Limpieza facial profunda',
      })
    );

    expect(
      await screen.findByRole('heading', { name: 'Limpieza facial profunda' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver perfil del proveedor' }));
    expect(await screen.findByRole('heading', { name: 'Laura Gómez' })).toBeInTheDocument();
  });

  test('HU-009 sigue mostrando el estado sin coincidencias y los proveedores', async () => {
    buscarServiciosPorNombre.mockResolvedValue([]);

    render(<ExplorarServicios />);
    await screen.findByRole('article', { name: /Proveedor Laura Gómez/i });

    fireEvent.change(screen.getByLabelText(/Buscar servicio por nombre/i), {
      target: { value: 'zzz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(
      await screen.findByText('No se encontraron servicios con los criterios seleccionados.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /Proveedor Laura Gómez/i })
    ).toBeInTheDocument();
  });
});
