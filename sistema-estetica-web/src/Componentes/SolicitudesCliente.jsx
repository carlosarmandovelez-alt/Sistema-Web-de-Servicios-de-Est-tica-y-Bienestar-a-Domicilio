import React, { useState, useEffect, useCallback } from 'react';
import {
  listarSolicitudesCliente,
  responderContrapropuesta,
  cancelarSolicitud,
} from '../Servicios/solicitudService';
import {
  EstadoSolicitudBadge,
  formatearFechaHora,
  formatearPrecio,
} from './solicitudComunes';

const FILTROS = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'sugerida', texto: 'Contrapropuestas' },
  { valor: 'aceptada', texto: 'Aceptadas' },
  { valor: 'completada', texto: 'Completadas' },
  { valor: 'cancelada', texto: 'Canceladas' },
  { valor: 'rechazada', texto: 'Rechazadas' },
];

export const SolicitudesCliente = ({ sesion, onCerrarSesion }) => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [accion, setAccion] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const cargarSolicitudes = useCallback(async () => {
    if (!sesion?.token) {
      setError('No se encontró una sesión activa válida.');
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const data = await listarSolicitudesCliente(sesion.token);
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.esErrorAutenticacion && onCerrarSesion) {
        onCerrarSesion();
      } else {
        setError(err.message || 'No fue posible cargar tus solicitudes.');
      }
    } finally {
      setCargando(false);
    }
  }, [sesion?.token, onCerrarSesion]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const abrirAccion = (tipo, solicitud) => {
    setAccion({ tipo, id: solicitud.id_solicitud });
    setMotivo('');
    setErrorFormulario(null);
    setExito(null);
  };

  const cerrarAccion = () => {
    setAccion(null);
    setMotivo('');
    setErrorFormulario(null);
  };

  const ejecutarAccion = async (event) => {
    event.preventDefault();
    if (!accion) return;

    setErrorFormulario(null);
    setExito(null);

    if (accion.tipo === 'cancelar' && !motivo.trim()) {
      setErrorFormulario('Debes indicar el motivo de la cancelación.');
      return;
    }

    setProcesando(true);

    try {
      let actualizada;

      if (accion.tipo === 'aceptar-contrapropuesta') {
        actualizada = await responderContrapropuesta(sesion.token, accion.id, { accion: 'aceptar' });
      } else if (accion.tipo === 'rechazar-contrapropuesta') {
        actualizada = await responderContrapropuesta(sesion.token, accion.id, {
          accion: 'rechazar',
          motivo: motivo.trim() || null,
        });
      } else if (accion.tipo === 'cancelar') {
        actualizada = await cancelarSolicitud(sesion.token, accion.id, motivo.trim());
      }

      setSolicitudes((prev) =>
        prev.map((s) => (s.id_solicitud === accion.id ? actualizada : s))
      );
      setExito(
        accion.tipo === 'aceptar-contrapropuesta'
          ? 'Reserva confirmada con el nuevo horario.'
          : accion.tipo === 'rechazar-contrapropuesta'
          ? 'La contrapropuesta fue rechazada.'
          : 'La solicitud fue cancelada.'
      );
      cerrarAccion();
    } catch (err) {
      if (err.esErrorAutenticacion && onCerrarSesion) {
        onCerrarSesion();
      } else {
        setErrorFormulario(err.message || 'No fue posible completar la acción.');
      }
    } finally {
      setProcesando(false);
    }
  };

  const solicitudesVisibles =
    filtro === 'todas' ? solicitudes : solicitudes.filter((s) => s.estado === filtro);

  const contarPorEstado = (estado) =>
    estado === 'todas' ? solicitudes.length : solicitudes.filter((s) => s.estado === estado).length;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Mis solicitudes</h2>
          <p className="text-muted small mb-0">
            Revisa el estado de tus solicitudes, responde las contrapropuestas del proveedor (HU-016) y cancela cuando
            corresponda (HU-017).
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cargarSolicitudes} disabled={cargando}>
          Actualizar
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={cargarSolicitudes}>
            Reintentar
          </button>
        </div>
      )}

      {exito && (
        <div className="alert alert-success alert-dismissible fade show" role="status">
          {exito}
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setExito(null)} />
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {FILTROS.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            className={`btn btn-sm ${filtro === opcion.valor ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => {
              setFiltro(opcion.valor);
              cerrarAccion();
            }}
          >
            {opcion.texto} ({contarPorEstado(opcion.valor)})
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-3 mb-0">Cargando tus solicitudes...</p>
        </div>
      ) : solicitudesVisibles.length === 0 ? (
        <div className="text-center py-5 border rounded bg-light">
          <p className="text-muted mb-1">No tienes solicitudes en este estado.</p>
          <p className="text-muted small mb-0">
            {solicitudes.length === 0
              ? 'Cuando solicites un servicio, podrás seguir aquí el estado de tu reserva.'
              : 'Prueba con otro filtro para ver tus solicitudes.'}
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {solicitudesVisibles.map((solicitud) => {
            const accionAbierta = accion?.id === solicitud.id_solicitud;
            const puedeCancelar = ['pendiente', 'sugerida', 'aceptada'].includes(solicitud.estado);

            return (
              <div key={solicitud.id_solicitud} className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                    <div>
                      <h3 className="h5 mb-1">{solicitud.nombre_servicio_snapshot}</h3>
                      <p className="text-muted small mb-0">
                        Solicitada el {formatearFechaHora(solicitud.fecha_creacion)}
                      </p>
                    </div>
                    <EstadoSolicitudBadge estado={solicitud.estado} />
                  </div>

                  <div className="row g-3 mt-1 small">
                    <div className="col-12 col-md-6">
                      <span className="text-muted d-block">Fecha y hora de la reserva</span>
                      <strong>{formatearFechaHora(solicitud.fecha_hora_solicitada)}</strong>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted d-block">Duración estimada</span>
                      <strong>{solicitud.duracion_snapshot_minutos} minutos</strong>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted d-block">Dirección de atención</span>
                      <strong>{solicitud.direccion_texto}</strong>
                      {solicitud.barrio_sector && (
                        <span className="text-muted d-block">Barrio / sector: {solicitud.barrio_sector}</span>
                      )}
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted d-block">Valor del servicio</span>
                      <strong>{formatearPrecio(solicitud.precio_snapshot)}</strong>
                    </div>
                  </div>

                  {solicitud.estado === 'sugerida' && solicitud.fecha_hora_propuesta && (
                    <div className="alert alert-info mt-3 mb-0">
                      <p className="small mb-2">
                        El proveedor propone un nuevo horario:{' '}
                        <strong>{formatearFechaHora(solicitud.fecha_hora_propuesta)}</strong>
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => abrirAccion('aceptar-contrapropuesta', solicitud)}
                          disabled={procesando}
                        >
                          Aceptar nuevo horario
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => abrirAccion('rechazar-contrapropuesta', solicitud)}
                          disabled={procesando}
                        >
                          Rechazar propuesta
                        </button>
                      </div>
                    </div>
                  )}

                  {solicitud.motivo_rechazo_cancelacion && (
                    <div className="alert alert-secondary py-2 px-3 mt-3 mb-0 small">
                      <strong>Motivo:</strong> {solicitud.motivo_rechazo_cancelacion}
                    </div>
                  )}

                  {solicitud.observaciones && (
                    <div className="mt-3 small">
                      <span className="text-muted d-block">Tus observaciones</span>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{solicitud.observaciones}</span>
                    </div>
                  )}

                  {puedeCancelar && (
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => abrirAccion('cancelar', solicitud)}
                        disabled={procesando}
                      >
                        Cancelar solicitud
                      </button>
                    </div>
                  )}

                  {accionAbierta && (
                    <form onSubmit={ejecutarAccion} className="border rounded bg-light p-3 mt-3">
                      {accion.tipo === 'aceptar-contrapropuesta' && (
                        <p className="mb-3 small">
                          ¿Confirmas la reserva para el <strong>{formatearFechaHora(solicitud.fecha_hora_propuesta)}</strong>?
                        </p>
                      )}

                      {accion.tipo === 'rechazar-contrapropuesta' && (
                        <div className="mb-3">
                          <label htmlFor={`motivo-${solicitud.id_solicitud}`} className="form-label small fw-semibold">
                            Motivo (opcional)
                          </label>
                          <textarea
                            id={`motivo-${solicitud.id_solicitud}`}
                            className="form-control form-control-sm"
                            rows={2}
                            maxLength={255}
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Cuéntanos por qué no aceptas el horario propuesto"
                            disabled={procesando}
                          />
                        </div>
                      )}

                      {accion.tipo === 'cancelar' && (
                        <div className="mb-3">
                          <label htmlFor={`motivo-${solicitud.id_solicitud}`} className="form-label small fw-semibold">
                            Motivo de la cancelación <span className="text-danger">*</span>
                          </label>
                          <textarea
                            id={`motivo-${solicitud.id_solicitud}`}
                            className="form-control form-control-sm"
                            rows={2}
                            maxLength={255}
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Indica el motivo de la cancelación"
                            disabled={procesando}
                            required
                          />
                        </div>
                      )}

                      {errorFormulario && (
                        <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
                          {errorFormulario}
                        </div>
                      )}

                      <div className="d-flex gap-2 justify-content-end">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={cerrarAccion}
                          disabled={procesando}
                        >
                          Volver
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={procesando}>
                          {procesando ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                              Procesando...
                            </>
                          ) : (
                            'Confirmar'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
