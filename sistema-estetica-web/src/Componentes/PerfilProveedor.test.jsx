import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerfilProveedor } from './PerfilProveedor';
import * as proveedorService from '../Servicios/proveedorService';

jest.mock('../Servicios/proveedorService');
// Mock RegistrarServicio para aislar la prueba de navegación del panel
jest.mock('./RegistrarServicio', () => ({
  RegistrarServicio: () => <div data-testid="mock-registrar-servicio">Vista Registrar Servicio</div>,
}));

describe('HU-006: Acceso y pestañas en PerfilProveedor', () => {
  const mockSesion = {
    token: 'jwt-proveedor-token',
    rol: 'proveedor',
    id: 1,
    nombre: 'Laura',
    email: 'laura@test.com',
  };

  const mockPerfil = {
    id: 1,
    nombre: 'Laura',
    apellido: 'Gómez',
    email: 'laura@test.com',
    telefono: '3001234567',
    perfil_profesional: 'Especialista en estética facial y corporal',
    zonas_atencion: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    proveedorService.consultarPerfilProveedor.mockResolvedValue(mockPerfil);
  });

  test('Muestra las pestañas de navegación: Mi Perfil Profesional y Registrar Servicio', async () => {
    render(<PerfilProveedor sesion={mockSesion} onCerrarSesion={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Mi Perfil Profesional/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Registrar Servicio/i })).toBeInTheDocument();
    });
  });

  test('Al hacer clic en la pestaña "Registrar Servicio", muestra el formulario', async () => {
    render(<PerfilProveedor sesion={mockSesion} onCerrarSesion={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Registrar Servicio/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Registrar Servicio/i }));

    expect(screen.getByTestId('mock-registrar-servicio')).toBeInTheDocument();
    expect(screen.queryByText(/Mi Perfil Profesional y Zonas de Atención/i)).toBeInTheDocument();
  });

  test('Permite alternar nuevamente a la pestaña "Mi Perfil Profesional"', async () => {
    render(<PerfilProveedor sesion={mockSesion} onCerrarSesion={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Registrar Servicio/i })).toBeInTheDocument();
    });

    // Ir a servicios
    fireEvent.click(screen.getByRole('tab', { name: /Registrar Servicio/i }));
    expect(screen.getByTestId('mock-registrar-servicio')).toBeInTheDocument();

    // Regresar a perfil
    fireEvent.click(screen.getByRole('tab', { name: /Mi Perfil Profesional/i }));
    expect(screen.queryByTestId('mock-registrar-servicio')).not.toBeInTheDocument();
    expect(screen.getByText('Perfil Profesional')).toBeInTheDocument();
  });
});

