import React, { useState } from 'react';
import { PerfilCliente } from './PerfilCliente';
import { SolicitudesCliente } from './SolicitudesCliente';
import { ExplorarServicios } from './ExplorarServicios';
import { CrearSolicitud } from './CrearSolicitud';

const TABS = [
  { valor: 'explorar', texto: 'Explorar servicios' },
  { valor: 'nueva', texto: 'Nueva solicitud' },
  { valor: 'solicitudes', texto: 'Mis solicitudes' },
  { valor: 'perfil', texto: 'Mi perfil' },
];

export const PanelCliente = ({ sesion, onCerrarSesion, onActualizarSesion }) => {
  const [vista, setVista] = useState('solicitudes');
  const [solicitudInicial, setSolicitudInicial] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cambiarVista = (nuevaVista) => {
    setVista(nuevaVista);
    if (nuevaVista === 'nueva') {
      setSolicitudInicial(null);
    }
  };

  const solicitarServicio = (servicio, proveedor) => {
    setSolicitudInicial({ ...servicio, nombre_proveedor: proveedor?.nombre || servicio.nombre_proveedor });
    setAviso(null);
    setVista('nueva');
  };

  const handleSolicitudCreada = (solicitud) => {
    setAviso(
      `Tu solicitud para "${solicitud.nombre_servicio_snapshot}" fue creada correctamente. Puedes seguir su estado en "Mis solicitudes".`
    );
    setSolicitudInicial(null);
    setVista('solicitudes');
  };

  return (
    <div className="container py-4" style={{ maxWidth: '1040px' }}>
      <header className="d-flex flex-wrap justify-content-between align-items-center pb-3 mb-3 border-bottom">
        <div>
          <h1 className="h4 mb-1 text-primary fw-bold">Bienestar en Casa</h1>
          <p className="text-muted small mb-0">Panel de Cliente</p>
        </div>
        <div className="d-flex align-items-center gap-3 mt-2 mt-sm-0">
          <span className="badge bg-light text-dark border py-2 px-3">
            Cliente: {sesion?.nombre || 'Usuario'}
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
              onClick={() => cambiarVista(tab.valor)}
            >
              {tab.texto}
            </button>
          </li>
        ))}
      </ul>

      {aviso && (
        <div className="alert alert-success alert-dismissible fade show" role="status">
          {aviso}
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setAviso(null)} />
        </div>
      )}

      {vista === 'explorar' && <ExplorarServicios onSolicitar={solicitarServicio} />}

      {vista === 'nueva' && (
        <CrearSolicitud
          sesion={sesion}
          servicioInicial={solicitudInicial}
          onCreada={handleSolicitudCreada}
          onCancelar={() => cambiarVista('explorar')}
        />
      )}

      {vista === 'solicitudes' && <SolicitudesCliente sesion={sesion} onCerrarSesion={onCerrarSesion} />}

      {vista === 'perfil' && (
        <PerfilCliente
          sesion={sesion}
          onCerrarSesion={onCerrarSesion}
          onActualizarSesion={onActualizarSesion}
          mostrarHeader={false}
        />
      )}
    </div>
  );
};
