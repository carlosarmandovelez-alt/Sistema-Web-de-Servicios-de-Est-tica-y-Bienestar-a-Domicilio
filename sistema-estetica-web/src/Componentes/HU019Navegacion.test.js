import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PerfilProveedor } from './PerfilProveedor';
import { consultarPerfilProveedor } from '../Servicios/proveedorService';
import { consultarAgenda } from '../Servicios/solicitudService';

jest.mock('../Servicios/proveedorService');
jest.mock('../Servicios/solicitudService');

const SESION_PROVEEDOR = {
  token: 'token-proveedor',
  rol: 'proveedor',
  id: 5,
  nombre: 'Proveedor',
  email: 'proveedor@example.com',
};

beforeEach(() => {
  jest.clearAllMocks();
  consultarPerfilProveedor.mockResolvedValue({
    nombre: 'Proveedor',
    apellido: 'Hu019',
    telefono: null,
    perfil_profesional: null,
    zonasAtencion: [],
    catalogo: [],
  });
  consultarAgenda.mockResolvedValue([]);
});

describe('HU-019: navegación del Proveedor', () => {
  test('incluye Mi agenda y la abre desde el panel del Proveedor', async () => {
    render(
      <PerfilProveedor
        sesion={SESION_PROVEEDOR}
        onCerrarSesion={jest.fn()}
        onActualizarSesion={jest.fn()}
      />
    );

    const tabAgenda = await screen.findByRole('tab', { name: 'Mi agenda' });
    expect(tabAgenda).toBeInTheDocument();

    fireEvent.click(tabAgenda);

    expect(
      await screen.findByRole('heading', { name: 'Mi agenda' })
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'No tienes reservas aceptadas para mostrar en tu agenda.'
      )
    ).toBeInTheDocument();
    expect(consultarAgenda).toHaveBeenCalledWith(
      'token-proveedor',
      expect.anything()
    );
  });
});
