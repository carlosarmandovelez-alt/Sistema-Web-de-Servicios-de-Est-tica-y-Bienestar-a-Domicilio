import React, { useState } from 'react';
import { PerfilProveedor } from './PerfilProveedor';
import { SolicitudesProveedor } from './SolicitudesProveedor';
import { AgendaProveedor } from './AgendaProveedor';

const TABS = [
  { valor: 'solicitudes', texto: 'Solicitudes recibidas' },
  { valor: 'agenda', texto: 'Mi agenda' },
  { valor: 'perfil', texto: 'Mi perfil' },
];

export const PanelProveedor = ({ sesion, onCerrarSesion, onActualizarSesion }) => {
  const [vista, setVista] = useState('solicitudes');

  return (
    <div className="container py-4" style={{ maxWidth: '1040px' }}>
      <header className="d-flex flex-wrap justify-content-between align-items-center pb-3 mb-3 border-bottom">
        <div>
          <h1 className="h4 mb-1 text-primary fw-bold">Bienestar en Casa</h1>
          <p className="text-muted small mb-0">Panel de Proveedor</p>
        </div>
        <div className="d-flex align-items-center gap-3 mt-2 mt-sm-0">
          <span className="badge bg-light text-dark border py-2 px-3">
            Proveedor: {sesion?.nombre || 'Profesional'}
          </span>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <ul className="nav nav-tabs mb-4">
        {TABS.map((tab) => (
          <li className="nav-item" key={tab.valor}>
            <button
              type="button"
              className={`nav-link ${vista === tab.valor ? 'active' : ''}`}
              onClick={() => setVista(tab.valor)}
            >
              {tab.texto}
            </button>
          </li>
        ))}
      </ul>

      {vista === 'solicitudes' && <SolicitudesProveedor sesion={sesion} onCerrarSesion={onCerrarSesion} />}

      {vista === 'agenda' && <AgendaProveedor sesion={sesion} onCerrarSesion={onCerrarSesion} />}

      {vista === 'perfil' && (
        <PerfilProveedor
          sesion={sesion}
          onCerrarSesion={onCerrarSesion}
          onActualizarSesion={onActualizarSesion}
          mostrarHeader={false}
        />
      )}
    </div>
  );
};
