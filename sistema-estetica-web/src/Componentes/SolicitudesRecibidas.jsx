import React, { useEffect, useMemo, useState } from 'react';
import {
  aceptarSolicitud,
  cancelarSolicitudProveedor,
  completarServicio,
  consultarDetalleRecibida,
  consultarSolicitudesRecibidas,
  proponerHorario,
  rechazarSolicitud,
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
  construirFechaHoraSolicitada,
  esFechaHoraFutura,
  esFechaValida,
  esHoraEnFranjaMediaHora,
  esHoraValida,
  formatearHora,
  formatearLocalDateTime,
  mapearEstadoSolicitud,
  obtenerFechaHoyISO,
  parsearLocalDateTime,
} from './solicitudUtilidades';
import {
  obtenerClaseEstadoSolicitud,
  obtenerDatosAtencion,
  obtenerMotivoSolicitud,
  ordenarSolicitudesPorCreacion,
} from './solicitudConsultaUtilidades';
import {
  MOTIVO_CANCELACION_MAX,
  mensajeErrorCancelacion,
  puedeCancelarComoProveedor,
  validarMotivoCancelacion,
} from './solicitudCancelacionUtilidades';
import {
  mensajeErrorFinalizacion,
  puedeFinalizarReserva,
} from './solicitudFinalizacionUtilidades';

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

/**
 * HU-015: la respuesta del Proveedor solo está disponible para solicitudes
 * Pendientes. El backend vuelve a validar el estado; esto es solo la
 * presentación.
 */
const estaPendiente = (solicitud) =>
  typeof solicitud?.estado === 'string' &&
  solicitud.estado.trim().toLowerCase() === 'pendiente';

const mensajeDeErrorRespuesta = (error, fallback) => {
  if (!error) return fallback;

  if (error.status === 404) {
    return 'La solicitud no existe o no está dirigida a tu cuenta. Actualiza el listado.';
  }

  if (error.status === 401 || error.status === 403 || error.esErrorAutenticacion) {
    return (
      error.message ||
      'Tu sesión ha expirado o no tienes permisos para responder esta solicitud.'
    );
  }

  return error.message || fallback;
};

const mismaFechaHora = (primera, segunda) => {
  const inicio = parsearLocalDateTime(primera);
  const inicioSegundo = parsearLocalDateTime(segunda);
  return Boolean(inicio && inicioSegundo && inicio.getTime() === inicioSegundo.getTime());
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

  // HU-015: estado de la respuesta del Proveedor (aceptar, rechazar, proponer).
  const [respuesta, setRespuesta] = useState({ tipo: null });
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState(null);
  const [propuestaFecha, setPropuestaFecha] = useState('');
  const [propuestaHora, setPropuestaHora] = useState('');
  const [errorPropuesta, setErrorPropuesta] = useState(null);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [mensajeAccion, setMensajeAccion] = useState(null);
  const fechaMinimaPropuesta = useMemo(() => obtenerFechaHoyISO(), []);

  // HU-017: cancelación de una reserva Aceptada por el Proveedor.
  const [cancelacion, setCancelacion] = useState({ tipo: null });
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [errorMotivoCancelacion, setErrorMotivoCancelacion] = useState(null);
  const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);
  const [mensajeCancelacion, setMensajeCancelacion] = useState(null);

  // HU-018: finalización de una reserva Aceptada por el Proveedor.
  const [finalizacion, setFinalizacion] = useState({ tipo: null });
  const [procesandoFinalizacion, setProcesandoFinalizacion] = useState(false);
  const [mensajeFinalizacion, setMensajeFinalizacion] = useState(null);

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

  const reiniciarRespuesta = () => {
    setRespuesta({ tipo: null });
    setMotivoRechazo('');
    setErrorMotivo(null);
    setPropuestaFecha('');
    setPropuestaHora('');
    setErrorPropuesta(null);
    setMensajeAccion(null);
    setProcesandoAccion(false);
    setCancelacion({ tipo: null });
    setMotivoCancelacion('');
    setErrorMotivoCancelacion(null);
    setMensajeCancelacion(null);
    setProcesandoCancelacion(false);
    setFinalizacion({ tipo: null });
    setMensajeFinalizacion(null);
    setProcesandoFinalizacion(false);
  };

  const verDetalle = (idSolicitud) => {
    setCargandoDetalle(true);
    setVista({ tipo: 'detalle', idSolicitud });
    setDetalle(null);
    setErrorDetalle(null);
    reiniciarRespuesta();
    irAlInicio();
  };

  const volverAlListado = () => {
    setVista({ tipo: 'lista' });
    setDetalle(null);
    setErrorDetalle(null);
    setCargandoDetalle(false);
    reiniciarRespuesta();
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

  // ─── HU-015: acciones del Proveedor ────────────────────────────────────────

  const cerrarFormularioRespuesta = () => {
    if (procesandoAccion) return;
    setRespuesta({ tipo: null });
    setErrorMotivo(null);
    setErrorPropuesta(null);
  };

  const aplicarSolicitudActualizada = (actualizada) => {
    setDetalle(actualizada);
    setSolicitudes((previas) =>
      previas.map((solicitud) =>
        Number(solicitud.id_solicitud) === Number(actualizada.id_solicitud)
          ? { ...solicitud, ...actualizada }
          : solicitud
      )
    );
  };

  const ejecutarRespuesta = async (operacion, mensajeExito) => {
    if (procesandoAccion) return;

    setProcesandoAccion(true);
    setMensajeAccion(null);

    try {
      const actualizada = await operacion();

      if (
        !actualizada ||
        actualizada.id_solicitud === null ||
        actualizada.id_solicitud === undefined
      ) {
        throw new Error('El servidor no confirmó la actualización de la solicitud.');
      }

      aplicarSolicitudActualizada(actualizada);
      setRespuesta({ tipo: null });
      setMotivoRechazo('');
      setPropuestaFecha('');
      setPropuestaHora('');
      setErrorMotivo(null);
      setErrorPropuesta(null);
      setMensajeAccion({ tipo: 'exito', texto: mensajeExito });
    } catch (error) {
      setMensajeAccion({
        tipo: 'error',
        texto: mensajeDeErrorRespuesta(
          error,
          'No fue posible completar la operación sobre la solicitud.'
        ),
      });
    } finally {
      setProcesandoAccion(false);
    }
  };

  const confirmarAceptacion = () => {
    if (!detalle || procesandoAccion) return;
    ejecutarRespuesta(
      () => aceptarSolicitud(sesion.token, detalle.id_solicitud),
      'Solicitud aceptada. La reserva quedó confirmada en tu agenda.'
    );
  };

  const enviarRechazo = (event) => {
    event.preventDefault();
    if (!detalle || procesandoAccion) return;

    const motivo = motivoRechazo.trim();
    if (!motivo) {
      setErrorMotivo('El motivo del rechazo es obligatorio.');
      return;
    }

    setErrorMotivo(null);
    ejecutarRespuesta(
      () => rechazarSolicitud(sesion.token, detalle.id_solicitud, motivo),
      'Solicitud rechazada. El motivo quedó registrado.'
    );
  };

  const enviarPropuesta = (event) => {
    event.preventDefault();
    if (!detalle || procesandoAccion) return;

    if (!esFechaValida(propuestaFecha)) {
      setErrorPropuesta('Selecciona una fecha válida.');
      return;
    }
    if (!esHoraValida(propuestaHora)) {
      setErrorPropuesta('Selecciona una hora válida.');
      return;
    }
    if (!esHoraEnFranjaMediaHora(propuestaHora)) {
      setErrorPropuesta('La hora debe ser en punto o a la media hora (:00 o :30).');
      return;
    }
    if (!esFechaHoraFutura(propuestaFecha, propuestaHora)) {
      setErrorPropuesta('La fecha y hora propuestas deben ser futuras.');
      return;
    }

    const fechaHoraPropuesta = construirFechaHoraSolicitada(propuestaFecha, propuestaHora);
    if (!fechaHoraPropuesta) {
      setErrorPropuesta('La fecha u hora propuesta no es válida.');
      return;
    }
    if (mismaFechaHora(fechaHoraPropuesta, detalle.fecha_hora_solicitada)) {
      setErrorPropuesta(
        'La nueva fecha y hora debe ser diferente a la solicitada por el Cliente.'
      );
      return;
    }

    setErrorPropuesta(null);
    ejecutarRespuesta(
      () => proponerHorario(sesion.token, detalle.id_solicitud, fechaHoraPropuesta),
      'Contrapropuesta enviada. La solicitud quedó en estado Sugerida.'
    );
  };

  // ─── HU-017: cancelación por el Proveedor ──────────────────────────────────

  const cerrarCancelacion = () => {
    if (procesandoCancelacion) return;
    setCancelacion({ tipo: null });
    setErrorMotivoCancelacion(null);
  };

  const iniciarCancelacion = () => {
    if (
      procesandoCancelacion ||
      procesandoFinalizacion ||
      finalizacion.tipo === 'confirmar'
    ) {
      return;
    }
    setMensajeCancelacion(null);
    setErrorMotivoCancelacion(null);
    setCancelacion({ tipo: 'confirmar' });
  };

  const ejecutarCancelacion = async () => {
    if (!detalle || procesandoCancelacion) return;

    const validacion = validarMotivoCancelacion(motivoCancelacion);
    if (!validacion.valido) {
      setErrorMotivoCancelacion(validacion.error);
      return;
    }

    setProcesandoCancelacion(true);
    setMensajeCancelacion(null);

    try {
      const actualizada = await cancelarSolicitudProveedor(
        sesion.token,
        detalle.id_solicitud,
        validacion.motivo
      );

      if (
        !actualizada ||
        actualizada.id_solicitud === null ||
        actualizada.id_solicitud === undefined
      ) {
        throw new Error('El servidor no confirmó la cancelación de la reserva.');
      }

      aplicarSolicitudActualizada(actualizada);
      setCancelacion({ tipo: null });
      setMotivoCancelacion('');
      setErrorMotivoCancelacion(null);
      setMensajeCancelacion({
        tipo: 'exito',
        texto: 'Reserva cancelada. El motivo quedó registrado y el horario fue liberado.',
      });
    } catch (error) {
      setMensajeCancelacion({
        tipo: 'error',
        texto: mensajeErrorCancelacion(
          error,
          'No fue posible cancelar la reserva.'
        ),
      });
    } finally {
      setProcesandoCancelacion(false);
    }
  };

  // ─── HU-018: finalización por el Proveedor ─────────────────────────────────

  const cerrarFinalizacion = () => {
    if (procesandoFinalizacion) return;
    setFinalizacion({ tipo: null });
  };

  const iniciarFinalizacion = () => {
    if (
      procesandoFinalizacion ||
      procesandoCancelacion ||
      cancelacion.tipo === 'confirmar'
    ) {
      return;
    }
    setMensajeFinalizacion(null);
    setFinalizacion({ tipo: 'confirmar' });
  };

  const ejecutarFinalizacion = async () => {
    if (!detalle || procesandoFinalizacion) return;

    setProcesandoFinalizacion(true);
    setMensajeFinalizacion(null);

    try {
      const actualizada = await completarServicio(
        sesion.token,
        detalle.id_solicitud
      );

      if (
        !actualizada ||
        actualizada.id_solicitud === null ||
        actualizada.id_solicitud === undefined
      ) {
        throw new Error('El servidor no confirmó la finalización del servicio.');
      }

      aplicarSolicitudActualizada(actualizada);
      setFinalizacion({ tipo: null });
      setMensajeFinalizacion({
        tipo: 'exito',
        texto: 'Servicio finalizado. La reserva quedó en estado Completada.',
      });
    } catch (error) {
      setMensajeFinalizacion({
        tipo: 'error',
        texto: mensajeErrorFinalizacion(
          error,
          'No fue posible finalizar el servicio.'
        ),
      });

      // Si el backend rechazó la transición, la copia local puede estar
      // desactualizada. Se vuelve a consultar el detalle para reflejar el
      // estado real sin inventar una transición exitosa.
      if (error?.status === 400 || error?.status === 404) {
        setIntentoDetalle((valor) => valor + 1);
      }
    } finally {
      setProcesandoFinalizacion(false);
    }
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

        {mensajeAccion && (
          <div
            className={`alert ${
              mensajeAccion.tipo === 'exito' ? 'alert-success' : 'alert-danger'
            }`}
            role={mensajeAccion.tipo === 'exito' ? 'status' : 'alert'}
            aria-live="polite"
          >
            {mensajeAccion.texto}
          </div>
        )}

        {mensajeCancelacion && (
          <div
            className={`alert ${
              mensajeCancelacion.tipo === 'exito' ? 'alert-success' : 'alert-danger'
            }`}
            role={mensajeCancelacion.tipo === 'exito' ? 'status' : 'alert'}
            aria-live="polite"
          >
            {mensajeCancelacion.texto}
          </div>
        )}

        {mensajeFinalizacion && (
          <div
            className={`alert ${
              mensajeFinalizacion.tipo === 'exito' ? 'alert-success' : 'alert-danger'
            }`}
            role={mensajeFinalizacion.tipo === 'exito' ? 'status' : 'alert'}
            aria-live="polite"
          >
            {mensajeFinalizacion.texto}
          </div>
        )}

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

        {estaPendiente(detalle) && (
          <div
            className="card shadow-sm border-0 mb-4"
            aria-labelledby="responder-solicitud-titulo"
          >
            <div className="card-body">
              <h3
                id="responder-solicitud-titulo"
                className="h5 fw-semibold text-dark mb-1"
              >
                Responder a la solicitud
              </h3>
              <p className="small text-muted mb-3">
                Puedes aceptar la reserva, rechazarla con un motivo o proponer otro horario.
                El servidor validará tu disponibilidad y que no exista otra reserva aceptada en
                el mismo periodo.
              </p>

              {respuesta.tipo === null && (
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => {
                      setMensajeAccion(null);
                      setRespuesta({ tipo: 'aceptar' });
                    }}
                  >
                    Aceptar solicitud
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => {
                      setMensajeAccion(null);
                      setErrorMotivo(null);
                      setRespuesta({ tipo: 'rechazar' });
                    }}
                  >
                    Rechazar solicitud
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => {
                      setMensajeAccion(null);
                      setErrorPropuesta(null);
                      setPropuestaFecha('');
                      setPropuestaHora('');
                      setRespuesta({ tipo: 'proponer' });
                    }}
                  >
                    Proponer otro horario
                  </button>
                </div>
              )}

              {respuesta.tipo === 'aceptar' && (
                <div
                  className="border rounded bg-light p-3"
                  role="group"
                  aria-label="Confirmar aceptación de la solicitud"
                >
                  <p className="fw-semibold mb-1">
                    ¿Confirmas la aceptación de esta solicitud?
                  </p>
                  <p className="small text-muted mb-3">
                    Se comprobará nuevamente que el horario esté dentro de tu disponibilidad y
                    que no se cruce con otra reserva aceptada.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={confirmarAceptacion}
                      disabled={procesandoAccion}
                    >
                      {procesandoAccion ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          Aceptando...
                        </>
                      ) : (
                        'Confirmar aceptación'
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cerrarFormularioRespuesta}
                      disabled={procesandoAccion}
                    >
                      Volver
                    </button>
                  </div>
                </div>
              )}

              {respuesta.tipo === 'rechazar' && (
                <form onSubmit={enviarRechazo} noValidate>
                  <label
                    htmlFor="motivo-rechazo"
                    className="form-label small fw-semibold"
                  >
                    Motivo del rechazo <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="motivo-rechazo"
                    name="motivo_rechazo"
                    rows="3"
                    maxLength={255}
                    className={`form-control ${errorMotivo ? 'is-invalid' : ''}`}
                    value={motivoRechazo}
                    onChange={(event) => {
                      setMotivoRechazo(event.target.value);
                      if (errorMotivo) setErrorMotivo(null);
                    }}
                    disabled={procesandoAccion}
                    aria-invalid={Boolean(errorMotivo)}
                    aria-describedby={errorMotivo ? 'error-motivo-rechazo' : undefined}
                    placeholder="Explica al Cliente por qué no puedes atender esta solicitud"
                    required
                  />
                  {errorMotivo && (
                    <div id="error-motivo-rechazo" className="invalid-feedback d-block">
                      {errorMotivo}
                    </div>
                  )}
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <button
                      type="submit"
                      className="btn btn-danger btn-sm"
                      disabled={procesandoAccion}
                    >
                      {procesandoAccion ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          Rechazando...
                        </>
                      ) : (
                        'Confirmar rechazo'
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cerrarFormularioRespuesta}
                      disabled={procesandoAccion}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {respuesta.tipo === 'proponer' && (
                <form onSubmit={enviarPropuesta} noValidate>
                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label
                        htmlFor="propuesta-fecha"
                        className="form-label small fw-semibold"
                      >
                        Nueva fecha <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        id="propuesta-fecha"
                        name="propuesta_fecha"
                        className={`form-control ${errorPropuesta ? 'is-invalid' : ''}`}
                        value={propuestaFecha}
                        min={fechaMinimaPropuesta}
                        onChange={(event) => {
                          setPropuestaFecha(event.target.value);
                          if (errorPropuesta) setErrorPropuesta(null);
                        }}
                        disabled={procesandoAccion}
                        aria-invalid={Boolean(errorPropuesta)}
                        required
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label
                        htmlFor="propuesta-hora"
                        className="form-label small fw-semibold"
                      >
                        Nueva hora de inicio <span className="text-danger">*</span>
                      </label>
                      <input
                        type="time"
                        id="propuesta-hora"
                        name="propuesta_hora"
                        className={`form-control ${errorPropuesta ? 'is-invalid' : ''}`}
                        value={propuestaHora}
                        step="1800"
                        onChange={(event) => {
                          setPropuestaHora(event.target.value);
                          if (errorPropuesta) setErrorPropuesta(null);
                        }}
                        disabled={procesandoAccion}
                        aria-invalid={Boolean(errorPropuesta)}
                        required
                      />
                    </div>
                  </div>
                  {errorPropuesta && (
                    <div className="invalid-feedback d-block">{errorPropuesta}</div>
                  )}
                  <p className="form-text">
                    El horario debe estar dentro de tu disponibilidad, en punto o a la media
                    hora, y ser distinto al solicitado por el Cliente.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={procesandoAccion}
                    >
                      {procesandoAccion ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          Enviando...
                        </>
                      ) : (
                        'Enviar contrapropuesta'
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cerrarFormularioRespuesta}
                      disabled={procesandoAccion}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {puedeFinalizarReserva(detalle) && (
          <div
            className="card shadow-sm border-0 mb-4"
            aria-labelledby="finalizar-servicio-titulo"
          >
            <div className="card-body">
              <h3
                id="finalizar-servicio-titulo"
                className="h5 fw-semibold text-dark mb-1"
              >
                Finalizar servicio
              </h3>
              <p className="small text-muted mb-3">
                Marca la reserva como Completada después de prestar el servicio.
                La operación conserva el historial y no se puede deshacer.
              </p>

              {finalizacion.tipo === null && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={iniciarFinalizacion}
                  disabled={
                    procesandoFinalizacion ||
                    procesandoCancelacion ||
                    cancelacion.tipo === 'confirmar'
                  }
                >
                  Marcar como completada
                </button>
              )}

              {finalizacion.tipo === 'confirmar' && (
                <div
                  className="border rounded bg-light p-3"
                  role="group"
                  aria-label="Confirmar finalización del servicio"
                >
                  <p className="fw-semibold mb-1">
                    ¿Confirmas que el servicio ya fue prestado?
                  </p>
                  <p className="small text-muted mb-3">
                    La reserva pasará de Aceptada a Completada y se actualizará
                    la fecha de última modificación. Esta acción no se puede
                    deshacer.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={ejecutarFinalizacion}
                      disabled={procesandoFinalizacion}
                    >
                      {procesandoFinalizacion ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          Finalizando...
                        </>
                      ) : (
                        'Confirmar finalización'
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cerrarFinalizacion}
                      disabled={procesandoFinalizacion}
                    >
                      Volver
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {puedeCancelarComoProveedor(detalle) && (
          <div
            className="card shadow-sm border-0 mb-4"
            aria-labelledby="cancelar-reserva-titulo"
          >
            <div className="card-body">
              <h3
                id="cancelar-reserva-titulo"
                className="h5 fw-semibold text-dark mb-1"
              >
                Cancelar reserva
              </h3>
              <p className="small text-muted mb-3">
                Esta reserva está Aceptada. Si la cancelas, quedará Cancelada, el
                horario dejará de estar ocupado y se conservará la información
                histórica. El motivo es obligatorio.
              </p>

              {cancelacion.tipo === null && (
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={iniciarCancelacion}
                  disabled={
                    procesandoCancelacion ||
                    procesandoFinalizacion ||
                    finalizacion.tipo === 'confirmar'
                  }
                >
                  Cancelar reserva
                </button>
              )}

              {cancelacion.tipo === 'confirmar' && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    ejecutarCancelacion();
                  }}
                  noValidate
                >
                  <label
                    htmlFor="motivo-cancelacion-proveedor"
                    className="form-label small fw-semibold"
                  >
                    Motivo de cancelación <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="motivo-cancelacion-proveedor"
                    name="motivo_cancelacion"
                    rows="3"
                    maxLength={MOTIVO_CANCELACION_MAX}
                    className={`form-control ${
                      errorMotivoCancelacion ? 'is-invalid' : ''
                    }`}
                    value={motivoCancelacion}
                    onChange={(event) => {
                      setMotivoCancelacion(event.target.value);
                      if (errorMotivoCancelacion) setErrorMotivoCancelacion(null);
                    }}
                    disabled={procesandoCancelacion}
                    aria-invalid={Boolean(errorMotivoCancelacion)}
                    aria-describedby={
                      errorMotivoCancelacion
                        ? 'error-motivo-cancelacion-proveedor'
                        : undefined
                    }
                    placeholder="Explica al Cliente por qué cancelas la reserva"
                    required
                  />
                  {errorMotivoCancelacion && (
                    <div
                      id="error-motivo-cancelacion-proveedor"
                      className="invalid-feedback d-block"
                    >
                      {errorMotivoCancelacion}
                    </div>
                  )}
                  <p className="form-text">
                    El motivo es obligatorio y no puede superar los{' '}
                    {MOTIVO_CANCELACION_MAX} caracteres.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="btn btn-danger btn-sm"
                      disabled={procesandoCancelacion}
                    >
                      {procesandoCancelacion ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          Cancelando...
                        </>
                      ) : (
                        'Confirmar cancelación'
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cerrarCancelacion}
                      disabled={procesandoCancelacion}
                    >
                      Volver
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

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

              {detalle.fecha_hora_propuesta && (
                <>
                  <dt className="col-12 col-sm-4 text-muted fw-normal">
                    Nueva fecha propuesta
                  </dt>
                  <dd className="col-12 col-sm-8 mb-0 text-dark">
                    {formatearLocalDateTime(detalle.fecha_hora_propuesta) || 'No informada'}
                  </dd>
                </>
              )}
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

                      {String(solicitud.estado).toLowerCase() === 'cancelada' && (
                        <div className="alert alert-secondary py-2 px-3 mt-3 mb-0 small" role="note">
                          <p className="fw-semibold mb-1">Motivo de cancelación</p>
                          <p className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>
                            {solicitud.motivo_rechazo_cancelacion ||
                              'No se registró un motivo de cancelación.'}
                          </p>
                          <p className="mb-0 text-muted">
                            Última actualización:{' '}
                            {formatearLocalDateTime(solicitud.fecha_actualizacion) ||
                              'No informada'}
                          </p>
                        </div>
                      )}

                      {solicitud.fecha_hora_propuesta && (
                        <p className="small text-info-emphasis mt-2 mb-0">
                          Nueva fecha propuesta:{' '}
                          {formatearLocalDateTime(solicitud.fecha_hora_propuesta) ||
                            'No informada'}
                        </p>
                      )}

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
