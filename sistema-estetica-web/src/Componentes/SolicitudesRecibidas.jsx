import React, { useEffect, useMemo, useState } from 'react';
import {
  consultarDetalleRecibida,
  consultarSolicitudesRecibidas,
} from '../Servicios/solicitudService';
import {
  AlertaError,
  BotonVolver,
  EstadoVacio,
  IndicadorCarga,
  formatearDuracionDetallada,
  formatearPrecio,
  obtenerMensajeError,
} from './ExploracionComun';
import {
  formatearHora,
  formatearLocalDateTime,
  mapearEstadoSolicitud,
} from './solicitudUtilidades';
import {
  obtenerClaseEstadoSolicitud,
  obtenerDatosAtencion,
  obtenerMotivoSolicitud,
  ordenarSolicitudesPorCreacion,
} from './solicitudConsultaUtilidades';

/**
 * HU-014: consulta de solicitudes recibidas por el Proveedor.
 *
 * Endpoints reales:
 *   GET /api/solicitudes/recibidas
 *   GET /api/solicitudes/recibidas/{idSolicitud}
 *
 * El backend obtiene el Proveedor desde el JWT y valida la propiedad con
 * `buscarPorIdYProveedor`. El frontend nunca envía un id de Proveedor ni
 * permite seleccionarlo. La respuesta no incluye el nombre del Cliente; por
 * eso se muestra su identificador real como referencia, sin inventar nombres.
 */

const CLIENTE_NO_IDENTIFICADO = 'Cliente no identificado';

const obtenerEtiquetaCliente = (idCliente) => {
  if (idCliente === null || idCliente === undefined || idCliente === '') {
    return CLIENTE_NO_IDENTIFICADO;
  }
  return `Cliente #${idCliente}`;
};

const BadgeEstado = ({ estado, className = '' }) => (
  <span
    className={`badge ${obtenerClaseEstadoSolicitud(estado)} ${className}`.trim()}
    aria-label={`Estado actual: ${mapearEstadoSolicitud(estado)}`}
  >
    {mapearEstadoSolicitud(estado)}
  </span>
);

const AccesoRestringido = ({ sesion, onCerrarSesion }) => (
  <section aria-labelledby="recibidas-acceso-restringido">
    <EstadoVacio titulo="No puedes consultar solicitudes recibidas desde esta sesión.">
      <p className="small text-muted mb-3">
        {sesion?.token
          ? 'Esta sección está disponible únicamente para Proveedores autenticados.'
          : 'Inicia sesión con una cuenta de Proveedor para consultar las solicitudes recibidas.'}
      </p>
      {onCerrarSesion && sesion?.token && (
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={onCerrarSesion}>
          Cerrar sesión
        </button>
      )}
    </EstadoVacio>
    <h2 id="recibidas-acceso-restringido" className="visually-hidden">
      Acceso restringido
    </h2>
  </section>
);

const PanelSolicitudesRecibidas = ({ sesion, onCerrarSesion }) => {
  const [vista, setVista] = useState({ tipo: 'lista' });
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState(null);
  const [intentoLista, setIntentoLista] = useState(0);

  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState(null);
  const [intentoDetalle, setIntentoDetalle] = useState(0);

  const irAlInicio = () => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } catch {
        // Algunos entornos de prueba no aceptan opciones en scrollTo.
      }
    }
  };

  // HU-014 CA-01: el backend determina el Proveedor desde el JWT. No se envía
  // ningún id de Proveedor ni se permite seleccionarlo desde el navegador.
  useEffect(() => {
    let activo = true;
    const controlador = new AbortController();

    setCargandoLista(true);
    setErrorLista(null);

    const cargarLista = async () => {
      try {
        const data = await consultarSolicitudesRecibidas(sesion.token, {
          signal: controlador.signal,
        });

        if (!activo) return;

        setSolicitudes(Array.isArray(data) ? data.filter(Boolean) : []);
      } catch (error) {
        if (!activo || error?.name === 'AbortError') return;
        setSolicitudes([]);
        setErrorLista(error);
      } finally {
        if (activo) setCargandoLista(false);
      }
    };

    cargarLista();

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [sesion.token, intentoLista]);

  // HU-014 CA-02, CA-03, CA-04 y CA-05: se limpia el detalle anterior antes de
  // consultar otro identificador para no mezclar información de solicitudes.
  useEffect(() => {
    if (vista.tipo !== 'detalle') return undefined;

    let activo = true;
    const controlador = new AbortController();

    setDetalle(null);
    setErrorDetalle(null);
    setCargandoDetalle(true);

    const cargarDetalle = async () => {
      try {
        const data = await consultarDetalleRecibida(
          sesion.token,
          vista.idSolicitud,
          { signal: controlador.signal }
        );

        if (!activo) return;
        setDetalle(data);
      } catch (error) {
        if (!activo || error?.name === 'AbortError') return;
        setErrorDetalle(error);
      } finally {
        if (activo) setCargandoDetalle(false);
      }
    };

    cargarDetalle();

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [vista, sesion.token, intentoDetalle]);

  const solicitudesOrdenadas = useMemo(
    () => ordenarSolicitudesPorCreacion(solicitudes),
    [solicitudes]
  );

  const verDetalle = (idSolicitud) => {
    setCargandoDetalle(true);
    setVista({ tipo: 'detalle', idSolicitud });
    setDetalle(null);
    setErrorDetalle(null);
    irAlInicio();
  };

  const volverAlListado = () => {
    setVista({ tipo: 'lista' });
    setDetalle(null);
    setErrorDetalle(null);
    setCargandoDetalle(false);
    irAlInicio();
  };

  const reintentarLista = () => {
    setCargandoLista(true);
    setErrorLista(null);
    setIntentoLista((valor) => valor + 1);
  };

  const reintentarDetalle = () => {
    setCargandoDetalle(true);
    setErrorDetalle(null);
    setIntentoDetalle((valor) => valor + 1);
  };

  // ─── Detalle de una solicitud recibida ─────────────────────────────────────
  if (vista.tipo === 'detalle') {
    const botonVolver = (
      <div className="mb-3">
        <BotonVolver onClick={volverAlListado}>Volver a solicitudes recibidas</BotonVolver>
      </div>
    );

    if (cargandoDetalle && !detalle && !errorDetalle) {
      return (
        <section aria-labelledby="recibida-detalle-cargando">
          {botonVolver}
          <h2 id="recibida-detalle-cargando" className="h4 fw-semibold text-dark mb-3">
            Detalle de la solicitud
          </h2>
          <IndicadorCarga texto="Consultando el detalle de la solicitud recibida..." />
        </section>
      );
    }

    if (errorDetalle) {
      const noEncontrada = errorDetalle.status === 404;
      const errorAutenticacion =
        errorDetalle.status === 401 ||
        errorDetalle.status === 403 ||
        errorDetalle.esErrorAutenticacion;

      if (noEncontrada) {
        return (
          <section aria-labelledby="recibida-detalle-no-encontrada">
            {botonVolver}
            <EstadoVacio titulo="No se encontró la solicitud o no está dirigida a tu cuenta.">
              <p className="small text-muted mb-3">
                Es posible que la solicitud no exista o que pertenezca a otro Proveedor. Por
                seguridad, no se muestra información de solicitudes ajenas.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={volverAlListado}>
                Volver a solicitudes recibidas
              </button>
            </EstadoVacio>
            <h2 id="recibida-detalle-no-encontrada" className="visually-hidden">
              Solicitud no disponible
            </h2>
          </section>
        );
      }

      return (
        <section aria-labelledby="recibida-detalle-error">
          {botonVolver}
          <h2 id="recibida-detalle-error" className="h4 fw-semibold text-dark mb-3">
            Detalle de la solicitud
          </h2>
          <AlertaError
            mensaje={
              errorAutenticacion
                ? 'No tienes autorización para consultar esta solicitud. Tu sesión puede haber expirado.'
                : obtenerMensajeError(
                    errorDetalle,
                    'No fue posible consultar el detalle de la solicitud recibida.'
                  )
            }
            onReintentar={reintentarDetalle}
          >
            {errorAutenticacion && onCerrarSesion && (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={onCerrarSesion}>
                Cerrar sesión
              </button>
            )}
          </AlertaError>
        </section>
      );
    }

    if (!detalle) {
      return (
        <section aria-labelledby="recibida-detalle-sin-datos">
          {botonVolver}
          <EstadoVacio titulo="No se encontró la solicitud.">
            <p className="small text-muted mb-0">
              No hay información disponible para mostrar.
            </p>
          </EstadoVacio>
          <h2 id="recibida-detalle-sin-datos" className="visually-hidden">
            Solicitud no encontrada
          </h2>
        </section>
      );
    }

    const atencion = obtenerDatosAtencion(detalle);
    const precio = formatearPrecio(detalle.precio_snapshot);
    const duracion = formatearDuracionDetallada(detalle.duracion_snapshot_minutos);
    const motivo = obtenerMotivoSolicitud(detalle);
    const etiquetaCliente = obtenerEtiquetaCliente(detalle.id_cliente);

    return (
      <section aria-labelledby="recibida-detalle-titulo">
        {botonVolver}

        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
          <div>
            <h2 id="recibida-detalle-titulo" className="h3 fw-bold text-dark mb-1">
              Detalle de la solicitud #{detalle.id_solicitud}
            </h2>
            <p className="text-muted mb-0">
              Información de atención, condiciones conservadas y estado actual.
            </p>
          </div>
          <BadgeEstado estado={detalle.estado} className="fs-6" />
        </div>

        {motivo &&
          (motivo.motivo ? (
            <div
              className={`alert ${
                motivo.tipo === 'rechazo' ? 'alert-danger' : 'alert-secondary'
              }`}
              role="alert"
            >
              <p className="fw-semibold mb-1">{motivo.etiqueta}</p>
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {motivo.motivo}
              </p>
            </div>
          ) : (
            <p className="small text-muted mb-3">
              No se registró un{' '}
              {motivo.tipo === 'rechazo'
                ? 'motivo de rechazo'
                : 'motivo de cancelación'}
              .
            </p>
          ))}

        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h3 className="h5 fw-semibold text-dark mb-3">Información general</h3>
            <dl className="row g-2 small mb-0">
              <dt className="col-12 col-sm-4 text-muted fw-normal">Estado actual</dt>
              <dd className="col-12 col-sm-8 mb-2">
                <BadgeEstado estado={detalle.estado} />
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Cliente</dt>
              <dd className="col-12 col-sm-8 mb-2 text-dark">{etiquetaCliente}</dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Fecha de atención</dt>
              <dd className="col-12 col-sm-8 mb-2 text-dark">
                {atencion.fechaTexto || 'No informada'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Hora de inicio</dt>
              <dd className="col-12 col-sm-8 mb-2 text-dark">
                {atencion.inicio ? formatearHora(atencion.inicio) : 'No informada'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">
                Hora de finalización
              </dt>
              <dd className="col-12 col-sm-8 mb-0 text-dark">
                {atencion.finTexto || 'No disponible'}
              </dd>
            </dl>
          </div>
        </div>

        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h3 className="h5 fw-semibold text-dark mb-3">Lugar de atención</h3>
            <dl className="row g-2 small mb-0">
              <dt className="col-12 col-sm-4 text-muted fw-normal">Dirección</dt>
              <dd className="col-12 col-sm-8 mb-2 text-dark">
                {detalle.direccion_texto || 'No informada'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Barrio o sector</dt>
              <dd className="col-12 col-sm-8 mb-2 text-dark">
                {detalle.barrio_sector || 'No informado'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">
                Información complementaria
              </dt>
              <dd
                className="col-12 col-sm-8 mb-2 text-dark"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {detalle.informacion_complementaria ||
                  'No se proporcionó información complementaria.'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Observaciones</dt>
              <dd
                className="col-12 col-sm-8 mb-0 text-dark"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {detalle.observaciones || 'Sin observaciones registradas.'}
              </dd>
            </dl>
          </div>
        </div>

        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h3 className="h5 fw-semibold text-dark mb-3">
              Condiciones conservadas del servicio
            </h3>
            <dl className="row g-2 small mb-0">
              <dt className="col-12 col-sm-4 text-muted fw-normal">
                Nombre del servicio
              </dt>
              <dd className="col-12 col-sm-8 mb-2 text-dark">
                {detalle.nombre_servicio_snapshot || 'Servicio no informado'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Precio</dt>
              <dd className="col-12 col-sm-8 mb-2 fw-semibold text-primary">
                {precio || 'No disponible'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Duración</dt>
              <dd className="col-12 col-sm-8 mb-0 text-dark">
                {duracion || 'No disponible'}
              </dd>
            </dl>
            <p className="small text-muted mt-3 mb-0">
              Estos son los valores conservados al momento de crear la solicitud. No se
              sustituyen por los valores actuales del catálogo del Proveedor.
            </p>
          </div>
        </div>

        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h3 className="h5 fw-semibold text-dark mb-3">Fechas de seguimiento</h3>
            <dl className="row g-2 small mb-0">
              <dt className="col-12 col-sm-4 text-muted fw-normal">Fecha de creación</dt>
              <dd className="col-12 col-sm-8 mb-2 text-dark">
                {formatearLocalDateTime(detalle.fecha_creacion) || 'No informada'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">
                Fecha de última actualización
              </dt>
              <dd className="col-12 col-sm-8 mb-0 text-dark">
                {formatearLocalDateTime(detalle.fecha_actualizacion) || 'No informada'}
              </dd>
            </dl>
            <p className="small text-muted mt-3 mb-0">
              Se muestra el estado actual y las fechas principales. No se presenta un historial
              detallado de cambios de estado.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ─── Listado de solicitudes recibidas ──────────────────────────────────────
  const total = solicitudesOrdenadas.length;
  const errorAutenticacionLista =
    errorLista?.status === 401 ||
    errorLista?.status === 403 ||
    errorLista?.esErrorAutenticacion;

  return (
    <section aria-labelledby="recibidas-titulo">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h2 id="recibidas-titulo" className="h3 fw-bold text-dark mb-1">
            Solicitudes recibidas
          </h2>
          <p className="text-muted mb-0">
            Consulta las solicitudes que los Clientes han dirigido a tus servicios, su estado
            actual y la información de atención proporcionada.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {!cargandoLista && !errorLista && (
            <span className="badge bg-light text-dark border">
              {total} {total === 1 ? 'solicitud' : 'solicitudes'}
            </span>
          )}
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={reintentarLista}
            disabled={cargandoLista}
          >
            Actualizar
          </button>
        </div>
      </div>

      {cargandoLista && (
        <IndicadorCarga
          texto={
            total > 0
              ? 'Actualizando las solicitudes recibidas...'
              : 'Consultando las solicitudes recibidas...'
          }
        />
      )}

      {errorLista && (
        <AlertaError
          mensaje={
            errorAutenticacionLista
              ? 'No tienes autorización para consultar las solicitudes recibidas. Tu sesión puede haber expirado.'
              : obtenerMensajeError(
                  errorLista,
                  'No fue posible consultar las solicitudes recibidas.'
                )
          }
          onReintentar={reintentarLista}
        >
          {errorAutenticacionLista && onCerrarSesion && (
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={onCerrarSesion}>
              Cerrar sesión
            </button>
          )}
        </AlertaError>
      )}

      {!cargandoLista && !errorLista && total === 0 && (
        <EstadoVacio titulo="Todavía no has recibido solicitudes.">
          <p className="small text-muted mb-0">
            Cuando un Cliente solicite uno de tus servicios, la solicitud aparecerá aquí con su
            estado y la información de atención.
          </p>
        </EstadoVacio>
      )}

      {!errorLista && total > 0 && (
        <>
          <p className="small text-muted mb-3">
            Ordenadas por fecha de creación, de la más reciente a la más antigua.
          </p>
          <div className="row g-3">
            {solicitudesOrdenadas.map((solicitud) => {
              const atencion = obtenerDatosAtencion(solicitud);
              const precio = formatearPrecio(solicitud.precio_snapshot);
              const nombreServicio =
                solicitud.nombre_servicio_snapshot || 'Servicio no informado';
              const estado = mapearEstadoSolicitud(solicitud.estado);
              const etiquetaCliente = obtenerEtiquetaCliente(solicitud.id_cliente);

              return (
                <div className="col-12" key={solicitud.id_solicitud}>
                  <article
                    className="card shadow-sm border-0"
                    aria-label={`Solicitud recibida ${solicitud.id_solicitud}: ${nombreServicio}. Estado ${estado}`}
                  >
                    <div className="card-body">
                      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                        <div>
                          <p className="small text-muted mb-1">
                            Solicitud #{solicitud.id_solicitud}
                          </p>
                          <h3 className="h5 fw-semibold text-dark mb-1">{nombreServicio}</h3>
                          <p className="small text-secondary mb-0">{etiquetaCliente}</p>
                        </div>
                        <BadgeEstado estado={solicitud.estado} />
                      </div>

                      <dl className="row g-2 small mb-0">
                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Fecha de atención
                        </dt>
                        <dd className="col-7 col-sm-3 mb-0 text-dark">
                          {atencion.fechaTexto || 'No informada'}
                        </dd>

                        <dt className="col-5 col-sm-3 text-muted fw-normal">Horario</dt>
                        <dd className="col-7 col-sm-3 mb-0 text-dark">
                          {atencion.rangoHorario || 'No informado'}
                        </dd>

                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Precio conservado
                        </dt>
                        <dd className="col-7 col-sm-3 mb-0 fw-semibold text-primary">
                          {precio || 'No disponible'}
                        </dd>

                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Fecha de creación
                        </dt>
                        <dd className="col-7 col-sm-3 mb-0 text-dark">
                          {formatearLocalDateTime(solicitud.fecha_creacion) || 'No informada'}
                        </dd>
                      </dl>

                      <div className="pt-3 mt-3 border-top">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => verDetalle(solicitud.id_solicitud)}
                          aria-label={`Ver detalle de la solicitud recibida ${solicitud.id_solicitud}`}
                        >
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

/**
 * La comprobación de rol es una defensa adicional de la interfaz. La
 * autorización definitiva la realiza Spring Security y el backend a partir
 * del JWT del Proveedor.
 */
export const SolicitudesRecibidas = ({ sesion, onCerrarSesion }) => {
  if (!sesion?.token || sesion?.rol !== 'proveedor') {
    return <AccesoRestringido sesion={sesion} onCerrarSesion={onCerrarSesion} />;
  }

  return (
    <PanelSolicitudesRecibidas
      sesion={sesion}
      onCerrarSesion={onCerrarSesion}
    />
  );
};
