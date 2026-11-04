import React, { useEffect, useMemo, useState } from 'react';
import {
  consultarDetalleSolicitud,
  consultarMisSolicitudes,
} from '../Servicios/solicitudService';
import { consultarProveedorPorId } from '../Servicios/exploracionService';
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
 * HU-013: consulta de solicitudes y reservas del Cliente.
 *
 * El backend expone:
 *   GET /api/solicitudes/mis-solicitudes
 *   GET /api/solicitudes/mis-solicitudes/{idSolicitud}
 *
 * El Cliente se obtiene del JWT. El frontend nunca envía un id_cliente; el
 * backend valida la propiedad con `buscarPorIdYCliente` y responde 404 cuando
 * la solicitud no existe o pertenece a otro Cliente.
 */

const NOMBRE_PROVEEDOR_FALLBACK = 'Proveedor no disponible';

const formatearNombreProveedor = (proveedor) =>
  [proveedor?.nombre, proveedor?.apellido]
    .filter(Boolean)
    .map((parte) => String(parte).trim())
    .filter(Boolean)
    .join(' ');

const BadgeEstado = ({ estado, className = '' }) => (
  <span
    className={`badge ${obtenerClaseEstadoSolicitud(estado)} ${className}`.trim()}
    aria-label={`Estado actual: ${mapearEstadoSolicitud(estado)}`}
  >
    {mapearEstadoSolicitud(estado)}
  </span>
);

const AccesoRestringido = ({ sesion, onExplorarServicios }) => (
  <section aria-labelledby="mis-solicitudes-acceso-restringido">
    <EstadoVacio titulo="No puedes consultar solicitudes desde esta sesión.">
      <p className="small text-muted mb-3">
        {sesion?.token
          ? 'Esta sección está disponible únicamente para Clientes autenticados.'
          : 'Inicia sesión con una cuenta de Cliente para consultar tus solicitudes y reservas.'}
      </p>
      {onExplorarServicios && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onExplorarServicios}>
          Volver a la exploración
        </button>
      )}
    </EstadoVacio>
    <h2 id="mis-solicitudes-acceso-restringido" className="visually-hidden">
      Acceso restringido
    </h2>
  </section>
);

const PanelMisSolicitudes = ({ sesion, onExplorarServicios, onCerrarSesion }) => {
  const [vista, setVista] = useState({ tipo: 'lista' });
  const [solicitudes, setSolicitudes] = useState([]);
  const [nombresProveedores, setNombresProveedores] = useState({});
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState(null);
  const [intentoLista, setIntentoLista] = useState(0);

  const [detalle, setDetalle] = useState(null);
  const [nombreProveedorDetalle, setNombreProveedorDetalle] = useState(null);
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

  // HU-013 CA-01: lista propia. Los nombres de Proveedor no vienen en el DTO
  // de la solicitud; se resuelven con el endpoint público de HU-010 y, si no
  // están disponibles, se muestra un texto de respaldo sin inventar datos.
  useEffect(() => {
    let activo = true;
    const controlador = new AbortController();

    setCargandoLista(true);
    setErrorLista(null);

    const cargarLista = async () => {
      try {
        const data = await consultarMisSolicitudes(sesion.token, {
          signal: controlador.signal,
        });

        if (!activo) return;

        const lista = Array.isArray(data) ? data.filter(Boolean) : [];
        const idsProveedores = [
          ...new Set(
            lista
              .map((solicitud) => solicitud?.id_proveedor)
              .filter(
                (id) => id !== null && id !== undefined && id !== ''
              )
          ),
        ];

        const mapaProveedores = {};
        if (idsProveedores.length > 0) {
          const resultados = await Promise.allSettled(
            idsProveedores.map((idProveedor) =>
              consultarProveedorPorId(idProveedor, {
                signal: controlador.signal,
              })
            )
          );

          if (!activo) return;

          resultados.forEach((resultado, indice) => {
            if (resultado.status === 'fulfilled') {
              const nombre = formatearNombreProveedor(resultado.value);
              if (nombre) {
                mapaProveedores[String(idsProveedores[indice])] = nombre;
              }
            }
          });
        }

        setSolicitudes(lista);
        setNombresProveedores(mapaProveedores);
      } catch (error) {
        if (!activo || error?.name === 'AbortError') return;
        setSolicitudes([]);
        setNombresProveedores({});
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

  // HU-013 CA-02, CA-03, CA-04 y CA-06: detalle propio. Antes de consultar se
  // limpia el detalle anterior para no mostrar información de otro registro.
  useEffect(() => {
    if (vista.tipo !== 'detalle') return undefined;

    let activo = true;
    const controlador = new AbortController();

    setDetalle(null);
    setNombreProveedorDetalle(null);
    setErrorDetalle(null);
    setCargandoDetalle(true);

    const cargarDetalle = async () => {
      try {
        const data = await consultarDetalleSolicitud(
          sesion.token,
          vista.idSolicitud,
          { signal: controlador.signal }
        );

        if (!activo) return;

        let nombreProveedor = '';
        if (data?.id_proveedor !== null && data?.id_proveedor !== undefined) {
          try {
            const proveedor = await consultarProveedorPorId(data.id_proveedor, {
              signal: controlador.signal,
            });
            nombreProveedor = formatearNombreProveedor(proveedor);
          } catch (errorProveedor) {
            if (errorProveedor?.name === 'AbortError') return;
            // El nombre es información complementaria; si falla, se muestra
            // el texto de respaldo sin impedir la consulta del detalle.
          }
        }

        if (!activo) return;

        setNombreProveedorDetalle(nombreProveedor || null);
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
    setNombreProveedorDetalle(null);
    setErrorDetalle(null);
    irAlInicio();
  };

  const volverAlListado = () => {
    setVista({ tipo: 'lista' });
    setDetalle(null);
    setNombreProveedorDetalle(null);
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

  // ─── Detalle de la solicitud ───────────────────────────────────────────────
  if (vista.tipo === 'detalle') {
    const botonVolver = (
      <div className="mb-3">
        <BotonVolver onClick={volverAlListado}>Volver a mis solicitudes</BotonVolver>
      </div>
    );

    if (cargandoDetalle && !detalle && !errorDetalle) {
      return (
        <section aria-labelledby="detalle-solicitud-cargando">
          {botonVolver}
          <h2 id="detalle-solicitud-cargando" className="h4 fw-semibold text-dark mb-3">
            Detalle de la solicitud
          </h2>
          <IndicadorCarga texto="Consultando el detalle de tu solicitud..." />
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
          <section aria-labelledby="detalle-solicitud-no-encontrada">
            {botonVolver}
            <EstadoVacio titulo="No se encontró la solicitud o no tienes permiso para consultarla.">
              <p className="small text-muted mb-3">
                Es posible que la solicitud no exista, haya cambiado o pertenezca a otro Cliente.
                Por seguridad, no se muestra información de registros ajenos.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={volverAlListado}>
                Volver a mis solicitudes
              </button>
            </EstadoVacio>
            <h2 id="detalle-solicitud-no-encontrada" className="visually-hidden">
              Solicitud no disponible
            </h2>
          </section>
        );
      }

      return (
        <section aria-labelledby="detalle-solicitud-error">
          {botonVolver}
          <h2 id="detalle-solicitud-error" className="h4 fw-semibold text-dark mb-3">
            Detalle de la solicitud
          </h2>
          <AlertaError
            mensaje={
              errorAutenticacion
                ? 'No tienes autorización para consultar esta solicitud. Tu sesión puede haber expirado.'
                : obtenerMensajeError(
                    errorDetalle,
                    'No fue posible consultar el detalle de la solicitud.'
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
        <section aria-labelledby="detalle-solicitud-sin-datos">
          {botonVolver}
          <EstadoVacio titulo="No se encontró la solicitud.">
            <p className="small text-muted mb-0">
              No hay información disponible para mostrar.
            </p>
          </EstadoVacio>
          <h2 id="detalle-solicitud-sin-datos" className="visually-hidden">
            Solicitud no encontrada
          </h2>
        </section>
      );
    }

    const atencion = obtenerDatosAtencion(detalle);
    const precio = formatearPrecio(detalle.precio_snapshot);
    const duracion = formatearDuracionDetallada(detalle.duracion_snapshot_minutos);
    const motivo = obtenerMotivoSolicitud(detalle);
    const nombreProveedor =
      nombreProveedorDetalle || NOMBRE_PROVEEDOR_FALLBACK;

    return (
      <section aria-labelledby="detalle-solicitud-titulo">
        {botonVolver}

        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
          <div>
            <h2 id="detalle-solicitud-titulo" className="h3 fw-bold text-dark mb-1">
              Detalle de la solicitud #{detalle.id_solicitud}
            </h2>
            <p className="text-muted mb-0">
              Estado actual, condiciones conservadas y fechas de seguimiento.
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
            <h3 className="h5 fw-semibold text-dark mb-3">Servicio y atención</h3>
            <dl className="row g-2 small mb-0">
              <dt className="col-12 col-sm-4 text-muted fw-normal">Estado actual</dt>
              <dd className="col-12 col-sm-8 mb-2">
                <BadgeEstado estado={detalle.estado} />
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Servicio solicitado</dt>
              <dd className="col-12 col-sm-8 mb-2 text-dark">
                {detalle.nombre_servicio_snapshot || 'Servicio no informado'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Proveedor</dt>
              <dd className="col-12 col-sm-8 mb-2 text-dark">{nombreProveedor}</dd>

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
              <dd className="col-12 col-sm-8 mb-2 text-dark">
                {atencion.finTexto || 'No disponible'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Precio conservado</dt>
              <dd className="col-12 col-sm-8 mb-2 fw-semibold text-primary">
                {precio || 'No disponible'}
              </dd>

              <dt className="col-12 col-sm-4 text-muted fw-normal">Duración conservada</dt>
              <dd className="col-12 col-sm-8 mb-0 text-dark">
                {duracion || 'No disponible'}
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

              {detalle.informacion_complementaria && (
                <>
                  <dt className="col-12 col-sm-4 text-muted fw-normal">
                    Información complementaria
                  </dt>
                  <dd className="col-12 col-sm-8 mb-2 text-dark">
                    {detalle.informacion_complementaria}
                  </dd>
                </>
              )}

              {detalle.observaciones && (
                <>
                  <dt className="col-12 col-sm-4 text-muted fw-normal">Observaciones</dt>
                  <dd
                    className="col-12 col-sm-8 mb-0 text-dark"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {detalle.observaciones}
                  </dd>
                </>
              )}
            </dl>
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

        <div className="alert alert-info" role="note">
          El nombre, el precio y la duración mostrados corresponden a la copia conservada en la
          solicitud. No se sustituyen por los valores actuales del catálogo del Proveedor.
        </div>
      </section>
    );
  }

  // ─── Listado de solicitudes ────────────────────────────────────────────────
  const total = solicitudesOrdenadas.length;
  const errorAutenticacionLista =
    errorLista?.status === 401 ||
    errorLista?.status === 403 ||
    errorLista?.esErrorAutenticacion;

  return (
    <section aria-labelledby="mis-solicitudes-titulo">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h2 id="mis-solicitudes-titulo" className="h3 fw-bold text-dark mb-1">
            Mis solicitudes y reservas
          </h2>
          <p className="text-muted mb-0">
            Consulta el estado actual, las fechas principales y las condiciones conservadas de
            los servicios que has solicitado.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {!cargandoLista && !errorLista && (
            <span className="badge bg-light text-dark border">
              {total} {total === 1 ? 'registro' : 'registros'}
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
              ? 'Actualizando tus solicitudes...'
              : 'Consultando tus solicitudes y reservas...'
          }
        />
      )}

      {errorLista && (
        <AlertaError
          mensaje={
            errorAutenticacionLista
              ? 'No tienes autorización para consultar tus solicitudes. Tu sesión puede haber expirado.'
              : obtenerMensajeError(
                  errorLista,
                  'No fue posible consultar tus solicitudes y reservas.'
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
        <EstadoVacio titulo="Todavía no tienes solicitudes ni reservas registradas.">
          <p className="small text-muted mb-3">
            Cuando solicites un servicio, podrás consultarlo aquí junto con su estado y sus
            fechas principales.
          </p>
          {onExplorarServicios && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onExplorarServicios}>
              Explorar servicios
            </button>
          )}
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
              const nombreProveedor =
                nombresProveedores[String(solicitud.id_proveedor)] ||
                NOMBRE_PROVEEDOR_FALLBACK;
              const nombreServicio =
                solicitud.nombre_servicio_snapshot || 'Servicio no informado';
              const estado = mapearEstadoSolicitud(solicitud.estado);

              return (
                <div className="col-12" key={solicitud.id_solicitud}>
                  <article
                    className="card shadow-sm border-0"
                    aria-label={`Solicitud ${solicitud.id_solicitud}: ${nombreServicio}. Estado ${estado}`}
                  >
                    <div className="card-body">
                      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                        <div>
                          <p className="small text-muted mb-1">
                            Solicitud #{solicitud.id_solicitud}
                          </p>
                          <h3 className="h5 fw-semibold text-dark mb-1">{nombreServicio}</h3>
                          <p className="small text-secondary mb-0">
                            Proveedor: {nombreProveedor}
                          </p>
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
                          aria-label={`Ver detalle de la solicitud ${solicitud.id_solicitud}`}
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
 * del JWT.
 */
export const MisSolicitudes = ({
  sesion,
  onExplorarServicios,
  onCerrarSesion,
}) => {
  if (!sesion?.token || sesion?.rol !== 'cliente') {
    return (
      <AccesoRestringido
        sesion={sesion}
        onExplorarServicios={onExplorarServicios}
      />
    );
  }

  return (
    <PanelMisSolicitudes
      sesion={sesion}
      onExplorarServicios={onExplorarServicios}
      onCerrarSesion={onCerrarSesion}
    />
  );
};
