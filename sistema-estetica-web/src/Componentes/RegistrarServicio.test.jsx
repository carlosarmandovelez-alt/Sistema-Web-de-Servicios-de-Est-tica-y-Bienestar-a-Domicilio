import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegistrarServicio } from './RegistrarServicio';
import * as servicioService from '../Servicios/servicioService';
import { CATEGORIAS_PMV } from '../config/categorias';

// Mock del servicio HTTP
jest.mock('../Servicios/servicioService');

describe('HU-006: Componente RegistrarServicio con mejoras aplicadas', () => {
  const mockToken = 'jwt-fake-token-proveedor';
  const mockOnSesionExpirada = jest.fn();
  const mockOnCerrarSesion = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    servicioService.obtenerCategorias.mockResolvedValue(
      CATEGORIAS_PMV.map((c) => ({ id_categoria: c.id, nombre: c.nombre }))
    );
    servicioService.obtenerMisServicios.mockResolvedValue([]);
  });

  const renderRegistrarServicio = async () => {
    const utils = render(
      <RegistrarServicio
        token={mockToken}
        onSesionExpirada={mockOnSesionExpirada}
        onCerrarSesion={mockOnCerrarSesion}
      />
    );
    await waitFor(() => {
      expect(screen.getByText('Registrar nuevo servicio')).toBeInTheDocument();
    });
    return utils;
  };

  // 1. Renderizado correcto del formulario
  test('1. Renderiza correctamente el formulario y todos sus campos', async () => {
    await renderRegistrarServicio();

    expect(screen.getByText('Registrar nuevo servicio')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre del servicio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Categoría/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descripción/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duración estimada \(minutos\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Precio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado inicial/i)).toBeInTheDocument();

    // Sección del catálogo propio
    expect(screen.getByText('Mi Catálogo de Servicios Registrados')).toBeInTheDocument();

    // Botones
    expect(screen.getByRole('button', { name: /Registrar servicio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Limpiar/i })).toBeInTheDocument();
  });

  // 2. Selector que muestra las categorías permitidas
  test('2. Selector muestra exactamente las 12 categorías del PMV más la opción por defecto', async () => {
    await renderRegistrarServicio();

    const selectCategoria = screen.getByLabelText(/Categoría/i);
    const opciones = selectCategoria.querySelectorAll('option');

    // 1 opción placeholder + 12 categorías
    expect(opciones).toHaveLength(13);
    expect(opciones[0].textContent).toMatch(/Selecciona una categoría/i);
    expect(opciones[0].value).toBe('');
  });

  // 3. Correspondencia entre cada nombre visible y su ID real verificado
  test('3. Correspondencia exacta entre nombre visible e ID verificado en la BD', async () => {
    await renderRegistrarServicio();

    CATEGORIAS_PMV.forEach((cat) => {
      const option = screen.getByRole('option', { name: cat.nombre });
      expect(option).toBeInTheDocument();
      expect(option.value).toBe(String(cat.id));
    });
  });

  // 4. Ausencia de categorías adicionales no permitidas
  test('4. No contiene categorías ajenas a las 12 del PMV', async () => {
    await renderRegistrarServicio();

    const selectCategoria = screen.getByLabelText(/Categoría/i);
    const opciones = Array.from(selectCategoria.querySelectorAll('option'))
      .slice(1) // Ignorar placeholder
      .map((opt) => opt.textContent);

    const nombresPMV = CATEGORIAS_PMV.map((c) => c.nombre);
    expect(opciones).toEqual(nombresPMV);
    expect(opciones).not.toContain('Cirugía plástica');
    expect(opciones).not.toContain('Medicina estética');
  });

  // 5. Mensajes cuando faltan datos obligatorios
  test('5. Muestra mensajes de error cuando se intenta enviar formulario vacío', async () => {
    await renderRegistrarServicio();

    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));

    expect(
      screen.getByText('Por favor, completa todos los campos obligatorios correctamente.')
    ).toBeInTheDocument();
    expect(screen.getByText('El nombre del servicio es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La categoría es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('La descripción del servicio es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('La duración estimada es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('El precio es obligatorio')).toBeInTheDocument();

    expect(servicioService.registrarServicio).not.toHaveBeenCalled();
  });

  // 6. Validación de duración
  test('6. Valida duración: rechaza 0, negativos, decimales y valores > 65535', async () => {
    await renderRegistrarServicio();

    const duracionInput = screen.getByLabelText(/Duración estimada \(minutos\)/i);

    // Duración 0
    fireEvent.change(duracionInput, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));
    expect(
      screen.getByText('La duración debe ser un número entero mayor a 0')
    ).toBeInTheDocument();

    // Duración decimal
    fireEvent.change(duracionInput, { target: { value: '45.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));
    expect(
      screen.getByText('La duración debe ser un número entero mayor a 0')
    ).toBeInTheDocument();

    // Duración superior al rango de SMALLINT UNSIGNED (> 65535)
    fireEvent.change(duracionInput, { target: { value: '70000' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));
    expect(
      screen.getByText('La duración no puede superar los 65535 minutos')
    ).toBeInTheDocument();
  });

  // 7. Validación de precio
  test('7. Valida precio: rechaza <= 0 y más de 2 decimales', async () => {
    await renderRegistrarServicio();

    const precioInput = screen.getByLabelText(/Precio/i);

    // Precio 0
    fireEvent.change(precioInput, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));
    expect(screen.getByText('El precio debe ser mayor a 0')).toBeInTheDocument();

    // Más de 2 decimales
    fireEvent.change(precioInput, { target: { value: '50000.555' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));
    expect(
      screen.getByText('El precio debe tener máximo 8 dígitos enteros y 2 decimales')
    ).toBeInTheDocument();
  });

  // 8. Registro exitoso y visualización de los datos devueltos por el servidor
  test('8. Registro exitoso muestra el resumen devuelto por el backend y limpia el formulario', async () => {
    const respuestaMock = {
      id: 42,
      id_categoria: 1,
      categoria: 'Estética facial',
      nombre: 'Limpieza Facial Profunda',
      descripcion: 'Tratamiento facial con exfoliación y mascarilla hidratante',
      duracion_minutos: 60,
      precio: 85000.0,
      estado: 'activo',
      fecha_creacion: '2026-10-20T10:00:00',
      fecha_actualizacion: '2026-10-20T10:00:00',
      id_proveedor: 10,
    };

    servicioService.registrarServicio.mockResolvedValueOnce(respuestaMock);

    await renderRegistrarServicio();

    fireEvent.change(screen.getByLabelText(/Nombre del servicio/i), {
      target: { value: 'Limpieza Facial Profunda' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/i), {
      target: { value: 'Tratamiento facial con exfoliación y mascarilla hidratante' },
    });
    fireEvent.change(screen.getByLabelText(/Duración estimada \(minutos\)/i), {
      target: { value: '60' },
    });
    fireEvent.change(screen.getByLabelText(/Precio/i), {
      target: { value: '85000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));

    await waitFor(() => {
      expect(screen.getByText(/✓ Servicio registrado exitosamente/i)).toBeInTheDocument();
    });

    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getAllByText('Limpieza Facial Profunda').length).toBeGreaterThan(0);
    expect(screen.getByText('Estética facial')).toBeInTheDocument();
    expect(screen.getByText('60 min')).toBeInTheDocument();
    expect(screen.getByText('activo')).toBeInTheDocument();

    // Permite registrar otro servicio
    const btnOtro = screen.getByRole('button', { name: /Registrar otro servicio/i });
    fireEvent.click(btnOtro);

    // Formulario vuelve a estar visible y limpio
    expect(screen.getByLabelText(/Nombre del servicio/i)).toHaveValue('');
  });

  // 9. Error 400 con errores por campo
  test('9. Muestra errores por campo cuando el backend responde 400 con fieldErrors', async () => {
    const errorConCampos = new Error();
    errorConCampos.status = 400;
    errorConCampos.fieldErrors = {
      nombre: 'Ya existe un servicio con este nombre en tu catálogo',
    };
    servicioService.registrarServicio.mockRejectedValueOnce(errorConCampos);

    await renderRegistrarServicio();

    fireEvent.change(screen.getByLabelText(/Nombre del servicio/i), {
      target: { value: 'Masaje Relajante' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/i), {
      target: { value: 'Masaje con aceites esenciales' },
    });
    fireEvent.change(screen.getByLabelText(/Duración estimada \(minutos\)/i), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText(/Precio/i), {
      target: { value: '70000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Ya existe un servicio con este nombre en tu catálogo')
      ).toBeInTheDocument();
    });

    // Conserva los valores introducidos
    expect(screen.getByLabelText(/Nombre del servicio/i)).toHaveValue('Masaje Relajante');
    expect(screen.getByLabelText(/Precio/i)).toHaveValue(70000);
  });

  // 10. Error de categoría inexistente devuelto por el backend
  test('10. Maneja error cuando el backend rechaza la categoría', async () => {
    const errorCategoria = new Error();
    errorCategoria.status = 400;
    errorCategoria.fieldErrors = {
      id_categoria: 'La categoría especificada no existe en la base de datos',
    };
    servicioService.registrarServicio.mockRejectedValueOnce(errorCategoria);

    await renderRegistrarServicio();

    fireEvent.change(screen.getByLabelText(/Nombre del servicio/i), {
      target: { value: 'Corte de Cabello' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/i), {
      target: { value: 'Corte y peinado' },
    });
    fireEvent.change(screen.getByLabelText(/Duración estimada \(minutos\)/i), {
      target: { value: '30' },
    });
    fireEvent.change(screen.getByLabelText(/Precio/i), {
      target: { value: '35000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));

    await waitFor(() => {
      expect(
        screen.getByText('La categoría especificada no existe en la base de datos')
      ).toBeInTheDocument();
    });
  });

  // 11. Error 403 por rol no autorizado
  test('11. Muestra mensaje de acceso denegado cuando el servidor responde 403', async () => {
    const error403 = new Error('Acceso denegado');
    error403.status = 403;
    error403.esErrorAutenticacion = true;
    servicioService.registrarServicio.mockRejectedValueOnce(error403);

    await renderRegistrarServicio();

    fireEvent.change(screen.getByLabelText(/Nombre del servicio/i), {
      target: { value: 'Servicio Prueba' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/i), {
      target: { value: 'Descripción de prueba' },
    });
    fireEvent.change(screen.getByLabelText(/Duración estimada \(minutos\)/i), {
      target: { value: '45' },
    });
    fireEvent.change(screen.getByLabelText(/Precio/i), {
      target: { value: '50000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Acceso denegado: no tienes permiso para registrar servicios\. Solo los proveedores autenticados pueden realizar esta acción\./i
        )
      ).toBeInTheDocument();
    });
  });

  // 12. Error 401 por sesión vencida
  test('12. Llama a onSesionExpirada cuando el servidor responde 401', async () => {
    const error401 = new Error('Tu sesión ha expirado');
    error401.status = 401;
    error401.esErrorAutenticacion = true;
    servicioService.registrarServicio.mockRejectedValueOnce(error401);

    await renderRegistrarServicio();

    fireEvent.change(screen.getByLabelText(/Nombre del servicio/i), {
      target: { value: 'Servicio Prueba' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/i), {
      target: { value: 'Descripción de prueba' },
    });
    fireEvent.change(screen.getByLabelText(/Duración estimada \(minutos\)/i), {
      target: { value: '45' },
    });
    fireEvent.change(screen.getByLabelText(/Precio/i), {
      target: { value: '50000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));

    await waitFor(() => {
      expect(mockOnSesionExpirada).toHaveBeenCalledWith('Tu sesión ha expirado');
    });
  });

  // 13. Error de red
  test('13. Muestra mensaje amigable ante fallo de conexión de red', async () => {
    servicioService.registrarServicio.mockRejectedValueOnce(
      new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.')
    );

    await renderRegistrarServicio();

    fireEvent.change(screen.getByLabelText(/Nombre del servicio/i), {
      target: { value: 'Servicio Prueba' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/i), {
      target: { value: 'Descripción de prueba' },
    });
    fireEvent.change(screen.getByLabelText(/Duración estimada \(minutos\)/i), {
      target: { value: '45' },
    });
    fireEvent.change(screen.getByLabelText(/Precio/i), {
      target: { value: '50000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));

    await waitFor(() => {
      expect(
        screen.getByText('No fue posible conectar con el servidor. Verifica tu conexión a internet.')
      ).toBeInTheDocument();
    });
  });

  // 14. Conservación de los valores introducidos cuando falla el registro
  test('14. Conserva todos los campos introducidos si el registro falla', async () => {
    servicioService.registrarServicio.mockRejectedValueOnce(new Error('Fallo inesperado'));

    await renderRegistrarServicio();

    fireEvent.change(screen.getByLabelText(/Nombre del servicio/i), {
      target: { value: 'Pedicura Spa' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/i), {
      target: { value: 'Pedicura con sales relajantes' },
    });
    fireEvent.change(screen.getByLabelText(/Duración estimada \(minutos\)/i), {
      target: { value: '45' },
    });
    fireEvent.change(screen.getByLabelText(/Precio/i), {
      target: { value: '40000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));

    await waitFor(() => {
      expect(screen.getByText('Fallo inesperado')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Nombre del servicio/i)).toHaveValue('Pedicura Spa');
    expect(screen.getByLabelText(/Categoría/i)).toHaveValue('4');
    expect(screen.getByLabelText(/Descripción/i)).toHaveValue('Pedicura con sales relajantes');
    expect(screen.getByLabelText(/Duración estimada \(minutos\)/i)).toHaveValue(45);
    expect(screen.getByLabelText(/Precio/i)).toHaveValue(40000);
  });

  // 15. Deshabilita el botón mientras la petición está en curso
  test('15. Deshabilita el botón de guardar mientras la solicitud está en curso', async () => {
    let resolverPromesa;
    const promesaPendiente = new Promise((resolve) => {
      resolverPromesa = resolve;
    });
    servicioService.registrarServicio.mockReturnValueOnce(promesaPendiente);

    await renderRegistrarServicio();

    fireEvent.change(screen.getByLabelText(/Nombre del servicio/i), {
      target: { value: 'Aromaterapia Relax' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: '11' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/i), {
      target: { value: 'Sesión relajante con aceites puros' },
    });
    fireEvent.change(screen.getByLabelText(/Duración estimada \(minutos\)/i), {
      target: { value: '60' },
    });
    fireEvent.change(screen.getByLabelText(/Precio/i), {
      target: { value: '95000' },
    });

    const botonGuardar = screen.getByRole('button', { name: /Registrar servicio/i });
    fireEvent.click(botonGuardar);

    expect(screen.getByRole('button', { name: /Guardando\.\.\./i })).toBeDisabled();

    // Resolver la promesa
    resolverPromesa({
      id: 99,
      nombre: 'Aromaterapia Relax',
      id_categoria: 11,
      categoria: 'Aromaterapia',
      duracion_minutos: 60,
      precio: 95000,
      estado: 'activo',
    });

    await waitFor(() => {
      expect(screen.getByText(/✓ Servicio registrado exitosamente/i)).toBeInTheDocument();
    });
  });

  // 16. Limpieza manual del formulario con el botón "Limpiar"
  test('16. El botón Limpiar resetea todos los campos del formulario', async () => {
    await renderRegistrarServicio();

    fireEvent.change(screen.getByLabelText(/Nombre del servicio/i), {
      target: { value: 'Prueba Limpiar' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/i), {
      target: { value: 'Alguna descripción' },
    });
    fireEvent.change(screen.getByLabelText(/Duración estimada \(minutos\)/i), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByLabelText(/Precio/i), {
      target: { value: '60000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Limpiar/i }));

    expect(screen.getByLabelText(/Nombre del servicio/i)).toHaveValue('');
    expect(screen.getByLabelText(/Categoría/i)).toHaveValue('');
    expect(screen.getByLabelText(/Descripción/i)).toHaveValue('');
    expect(screen.getByLabelText(/Duración estimada \(minutos\)/i)).toHaveValue(null);
    expect(screen.getByLabelText(/Precio/i)).toHaveValue(null);
  });

  // 17. Permite seleccionar estado 'inactivo' y lo envía en el payload
  test('17. Permite seleccionar estado inactivo y lo envía al backend', async () => {
    servicioService.registrarServicio.mockResolvedValueOnce({
      id: 50,
      nombre: 'Servicio Pausado',
      id_categoria: 6,
      categoria: 'Maquillaje',
      duracion_minutos: 45,
      precio: 60000,
      estado: 'inactivo',
    });

    await renderRegistrarServicio();

    fireEvent.change(screen.getByLabelText(/Nombre del servicio/i), {
      target: { value: 'Servicio Pausado' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: '6' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/i), {
      target: { value: 'Maquillaje profesional para eventos' },
    });
    fireEvent.change(screen.getByLabelText(/Duración estimada \(minutos\)/i), {
      target: { value: '45' },
    });
    fireEvent.change(screen.getByLabelText(/Precio/i), {
      target: { value: '60000' },
    });
    fireEvent.change(screen.getByLabelText(/Estado inicial/i), {
      target: { value: 'inactivo' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar servicio/i }));

    await waitFor(() => {
      expect(servicioService.registrarServicio).toHaveBeenCalledWith(
        mockToken,
        expect.objectContaining({
          estado: 'inactivo',
        })
      );
    });
  });

  // 18. Muestra los servicios del catálogo propio obtenidos del backend
  test('18. Despliega la tabla del catálogo propio con los servicios existentes', async () => {
    const serviciosMock = [
      {
        id: 1,
        nombre: 'Limpieza Facial',
        categoria: 'Estética facial',
        duracion_minutos: 60,
        precio: 80000,
        estado: 'activo',
      },
      {
        id: 2,
        nombre: 'Masaje Descontracturante',
        categoria: 'Masajes no médicos',
        duracion_minutos: 45,
        precio: 90000,
        estado: 'inactivo',
      },
    ];

    servicioService.obtenerMisServicios.mockResolvedValueOnce(serviciosMock);

    await renderRegistrarServicio();

    await waitFor(() => {
      expect(screen.getByText('Limpieza Facial')).toBeInTheDocument();
      expect(screen.getByText('Masaje Descontracturante')).toBeInTheDocument();
      expect(screen.getByText(/80\.000/)).toBeInTheDocument();
    });
  });
});
