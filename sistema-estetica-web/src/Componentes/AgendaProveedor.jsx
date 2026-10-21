import React, { useState, useEffect, useCallback } from 'react';
import { consultarAgenda } from '../Servicios/solicitudService';
import { formatearHora } from './solicitudComunes';

const agruparPorDia = (reservas) => {
  const grupos = [];

  reservas.forEach((reserva) => {
    const fecha = new Date(reserva.fecha_hora_inicio);
    const clave = Number.isNaN(fecha.getTime())
      ? 'Sin fecha'
      : fecha.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let grupo = grupos.find((g) => g.clave === clave);
    if (!grupo) {
      grupo = { clave, items: [] };
      grupos.push(grupo);
    }
    grupo.items.push(reserva);
  });

  return grupos;
};

export const AgendaProveedor = ({ sesion, onCerrarSesion }) => {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const cargarAgenda = useCallback(
    async (filtros = {}) => {
      if (!sesion?.token) {
        setError('No se encontró una sesión activa válida.');
        setCargando(false);
        return;
      }

      if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
        setError('La fecha inicial no puede ser posterior a la fecha final.');
        return;
      }

      setCargando(true);
      setError(null);

      try {
        const data = await consultarAgenda(sesion.token, filtros);
        setReservas(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.esErrorAutenticacion && onCerrarSesion) {
          onCerrarSesion();
        } else {
          setError(err.message || 'No fue posible consultar la agenda.');
        }
      } finally {
        setCargando(false);
      }
    },
    [sesion?.token, onCerrarSesion]
  );

  useEffect(() => {
    cargarAgenda();
  }, [cargarAgenda]);

  const aplicarFiltros = (event) => {
    event.preventDefault();
    cargarAgenda({ desde: desde || undefined, hasta: hasta || undefined });
  };

  const limpiarFiltros = () => {
    setDesde('');
    setHasta('');
    cargarAgenda();
  };

  const grupos = agruparPorDia(reservas);

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Mi agenda</h2>
          <p className="text-muted small mb-0">
            Reservas aceptadas en orden cronológico para organizar tus servicios (HU-019).
          </p>
        </div>
        <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle py-2 px-3">
          {reservas.length} {reservas.length === 1 ? 'reserva aceptada' : 'reservas aceptadas'}
        </span>
      </div>

      <form className="card card-body shadow-sm mb-4" onSubmit={aplicarFiltros}>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4">
            <label htmlFor="agenda-desde" className="form-label small fw-semibold">
              Desde
            </label>
            <input
              type="datetime-local"
              id="agenda-desde"
              className="form-control form-control-sm"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <label htmlFor="agenda-hasta" className="form-label small fw-semibold">
              Hasta
            </label>
            <input
              type="datetime-local"
              id="agenda-hasta"
              className="form-control form-control-sm"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4 d-flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={cargando}>
              Filtrar
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={limpiarFiltros} disabled={cargando}>
              Limpiar
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => cargarAgenda({ desde: desde || undefined, hasta: hasta || undefined })}
              disabled={cargando}
            >
              Actualizar
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => cargarAgenda()}>
            Reintentar
          </button>
        </div>
      )}

      {cargando ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-3 mb-0">Consultando tu agenda...</p>
        </div>
      ) : reservas.length === 0 ? (
        <div className="text-center py-5 border rounded bg-light">
          <p className="text-muted mb-1">No tienes reservas aceptadas en este periodo.</p>
          <p className="text-muted small mb-0">
            Las reservas aparecerán aquí cuando aceptes solicitudes o el cliente acepte tu contrapropuesta.
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-4">
          {grupos.map((grupo) => (
            <div key={grupo.clave}>
              <h3 className="h6 text-uppercase text-muted fw-bold border-bottom pb-2 mb-3">{grupo.clave}</h3>
              <div className="d-flex flex-column gap-2">
                {grupo.items.map((reserva) => (
                  <div key={reserva.id_solicitud} className="card shadow-sm">
                    <div className="card-body py-3">
                      <div className="row g-3 align-items-center">
                        <div className="col-12 col-md-3">
                          <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">
                            {formatearHora(reserva.fecha_hora_inicio)} - {formatearHora(reserva.fecha_hora_fin)}
                          </span>
                          <div className="small text-muted mt-1">{reserva.duracion_minutos} minutos</div>
                        </div>
                        <div className="col-12 col-md-5">
                          <div className="fw-semibold">{reserva.nombre_servicio}</div>
                          <div className="small text-muted">
                            Cliente: {reserva.nombre_cliente} {reserva.apellido_cliente || ''}
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="small">
                            <span className="text-muted">Dirección: </span>
                            {reserva.direccion_texto}
                          </div>
                          {reserva.barrio_sector && (
                            <div className="small text-muted">Barrio / sector: {reserva.barrio_sector}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
