import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('HU-006: Control de acceso por rol en App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('Usuario sin sesión ve la vista de Login', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByText(/Registrar Servicio/i)).not.toBeInTheDocument();
  });

  test('Usuario con rol cliente no tiene acceso al formulario ni pestañas de proveedor', () => {
    const sesionCliente = {
      token: 'jwt-cliente-token',
      rol: 'cliente',
      id: 2,
      nombre: 'Carlos Cliente',
      email: 'carlos@test.com',
    };
    localStorage.setItem('sesion', JSON.stringify(sesionCliente));

    render(<App />);

    // No debe mostrar la pestaña ni el formulario de registrar servicio
    expect(screen.queryByText('Registrar Servicio')).not.toBeInTheDocument();
    expect(screen.queryByText('Registrar nuevo servicio')).not.toBeInTheDocument();
    expect(screen.queryByText('Mi Perfil Profesional y Zonas de Atención')).not.toBeInTheDocument();
  });
});

