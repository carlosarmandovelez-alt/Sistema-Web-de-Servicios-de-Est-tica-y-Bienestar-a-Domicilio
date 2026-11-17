import React, { useEffect, useMemo, useRef, useState } from 'react';
import { consultarPerfilCliente } from '../Servicios/clienteService';
import {
  consultarProveedorPorId,
  consultarServicioPorId,
} from '../Servicios/exploracionService';
import { crearSolicitud } from '../Servicios/solicitudService';
import {
  AlertaError,
  BotonVolver,
  EstadoVacio,
  IndicadorCarga,
  esErrorNoEncontrado,
  formatearDuracionDetallada,
  formatearPrecio,
  obtenerMensajeError,
} from './ExploracionComun';
import {
  construirFechaHoraSolicitada,
  describirHoraFin,
  esFechaHoraFutura,
  esFechaValida,
  esHoraValida,
  formatearFechaHora,
  formatearLocalDateTime,
  mapearEstadoSolicitud,
  obtenerFechaHoyISO,
  parsearFechaHoraLocal,
  parsearLocalDateTime,
  sumarMinutos,
} from './solicitudUtilidades';

/**
 * HU-012: Creación de una solicitud de servicio.
 *
 * El flujo se inicia desde el detalle de un servicio de HU-010 y conserva el
 * Proveedor y el servicio ya seleccionados. El backend es la autoridad final:
 * obtiene el Cliente del JWT, deriva el Proveedor del servicio, valida la
 * disponibilidad, asigna el estado "pendiente", registra las fechas de
 * auditoría y guarda la copia de nombre, precio y duración.
 */

const FORMULARIO_INICIAL = {
  fecha: '',
  hora: '',
  direccion_texto: '',
  barrio_sector: '',
  informacion_complementaria: '',
  observaciones: '',
};

const ETIQUETAS_CAMPO = {
  fecha: 'Fecha',
  hora: 'Hora',
  direccion_texto: 'Dirección de atención',
  barrio_sector: 'Barrio o sector',
  informacion_complementaria: 'Información complementaria',
  observaciones: 'Observaciones',
};

const MAPA_CAMPOS_BACKEND = {
  fecha_hora_solicitada: 'hora',
  direccion_texto: 'direccion_texto',
  barrio_sector: 'barrio_sector',
  informacion_complementaria: 'informacion_complementaria',
  observaciones: 'observaciones',
};

const mensajePareceDeHorario = (mensaje) =>
  typeof mensaje === 'string' &&
  /(horario|periodo no disponible|no está disponible en la fecha|disponibilidad del proveedor)/i.test(
    mensaje
  );

const AccesoRestringido = ({ sesion, onVolverDetalle, onVolverExploracion }) => {
  const motivo = sesion?.token
    ? 'Esta funcionalidad está disponible únicamente para Clientes autenticados. Tu sesión no tiene el rol Cliente.'
    : 'Inicia sesión con una cuenta de Cliente para crear una solicitud de servicio.';

  return (
    <section aria-labelledby="solicitud-acceso-restringido">
      {onVolverDetalle && (
        <div className="mb-3">
          <BotonVolver onClick={onVolverDetalle}>Volver al detalle del servicio</BotonVolver>
        </div>
      )}
      <EstadoVacio titulo="No puedes crear solicitudes de servicio.">
        <p className="small text-muted mb-3">{motivo}</p>
        {onVolverExploracion && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onVolverExploracion}>
            Volver a la exploración
          </button>
        )}
      </EstadoVacio>
      <h2 id="solicitud-acceso-restringido" className="visually-hidden">
        Acceso restringido
      </h2>
    </section>
  );
};

const ConfirmacionSolicitud = ({
  solicitud,
  onVolverDetalle,
  onVolverExploracion,
  onCrearOtra,
  onVerMisSolicitudes,
}) => {
  const inicio = parsearLocalDateTime(solicitud?.fecha_hora_solicitada);
  const duracion = Number(solicitud?.duracion_snapshot_minutos);
  const fin = inicio && Number.isFinite(duracion) ? sumarMinutos(inicio, duracion) : null;
  const precio = formatearPrecio(solicitud?.precio_snapshot);
  const duracionTexto = formatearDuracionDetallada(duracion);

  return (
    <section aria-labelledby="solicitud-confirmada-titulo">
      {onVolverDetalle && (
        <div className="mb-3">
          <BotonVolver onClick={onVolverDetalle}>Volver al detalle del servicio</BotonVolver>
        </div>
      )}

      <div className="alert alert-success" role="status" aria-live="polite">
        <h2 id="solicitud-confirmada-titulo" className="h4 fw-bold mb-2">
          ¡Solicitud creada correctamente!
        </h2>
        <p className="mb-0">
          El sistema registró tu solicitud y le asignó el estado{' '}
          <strong>{mapearEstadoSolicitud(solicitud?.estado)}</strong>.
        </p>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
            <div>
              <h3 className="h5 fw-semibold text-dark mb-1">
                Solicitud #{solicitud?.id_solicitud ?? 'sin número'}
              </h3>
              <p className="small text-muted mb-0">
                Fecha de creación: {formatearLocalDateTime(solicitud?.fecha_creacion) || 'No informada'}
              </p>
              <p className="small text-muted mb-0">
                Última actualización:{' '}
                {formatearLocalDateTime(solicitud?.fecha_actualizacion) || 'No informada'}
              </p>
            </div>
            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle fs-6">
              {mapearEstadoSolicitud(solicitud?.estado)}
            </span>
          </div>

          <dl className="row g-2 small mb-0">
            <dt className="col-12 col-sm-4 text-muted fw-normal">Servicio conservado</dt>
            <dd className="col-12 col-sm-8 mb-2 text-dark">
              {solicitud?.nombre_servicio_snapshot || 'No informado'}
            </dd>

            <dt className="col-12 col-sm-4 text-muted fw-normal">Precio conservado</dt>
            <dd className="col-12 col-sm-8 mb-2 fw-semibold text-primary">
              {precio || 'No disponible'}
            </dd>

            <dt className="col-12 col-sm-4 text-muted fw-normal">Duración conservada</dt>
            <dd className="col-12 col-sm-8 mb-2 text-dark">
              {duracionTexto || 'No disponible'}
            </dd>

            <dt className="col-12 col-sm-4 text-muted fw-normal">Inicio solicitado</dt>
            <dd className="col-12 col-sm-8 mb-2 text-dark">
              {formatearLocalDateTime(solicitud?.fecha_hora_solicitada) || 'No informado'}
            </dd>

            <dt className="col-12 col-sm-4 text-muted fw-normal">
              Hora de finalización estimada
            </dt>
            <dd className="col-12 col-sm-8 mb-2 text-dark">
              {fin ? formatearFechaHora(fin) : 'No disponible'}
            </dd>

            <dt className="col-12 col-sm-4 text-muted fw-normal">Dirección de atención</dt>
            <dd className="col-12 col-sm-8 mb-2 text-dark">
              {solicitud?.direccion_texto || 'No informada'}
            </dd>

            <dt className="col-12 col-sm-4 text-muted fw-normal">Barrio o sector</dt>
            <dd className="col-12 col-sm-8 mb-2 text-dark">
              {solicitud?.barrio_sector || 'No informado'}
            </dd>

            {solicitud?.informacion_complementaria && (
              <>
                <dt className="col-12 col-sm-4 text-muted fw-normal">
                  Información complementaria
                </dt>
                <dd className="col-12 col-sm-8 mb-2 text-dark">
                  {solicitud.informacion_complementaria}
                </dd>
              </>
            )}

            {solicitud?.observaciones && (
              <>
                <dt className="col-12 col-sm-4 text-muted fw-normal">Observaciones</dt>
                <dd className="col-12 col-sm-8 mb-0 text-dark">{solicitud.observaciones}</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      <div className="alert alert-info" role="note">
        El sistema conserva el nombre, el precio y la duración que tenía el servicio al momento
        de crear la solicitud. Si el Proveedor modifica posteriormente su catálogo, estos valores
        permanecerán sin cambios.
      </div>

      <div className="d-flex flex-wrap gap-2">
        {onVerMisSolicitudes && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onVerMisSolicitudes}
          >
            Ver mis solicitudes
          </button>
        )}
        {onVolverExploracion && (
          <button
            type="button"
            className={onVerMisSolicitudes ? 'btn btn-outline-primary' : 'btn btn-primary'}
            onClick={onVolverExploracion}
          >
            Volver a la exploración
          </button>
        )}
        <button type="button" className="btn btn-outline-secondary" onClick={onCrearOtra}>
          Crear otra solicitud
        </button>
      </div>
    </section>
  );
};

const FormularioSolicitud = ({
  idServicio,
  idProveedor,
  sesion,
  onVolverDetalle,
  onVolverExploracion,
  onVerMisSolicitudes,
}) => {
  const [estado, setEstado] = useState({
    cargando: true,
    servicio: null,
    perfil: null,
    errorCarga: null,
    errorProveedor: null,
    avisoPerfil: null,
  });
  const [intento, setIntento] = useState(0);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [errorHorario, setErrorHorario] = useState(null);
  const [advertencia, setAdvertencia] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [solicitudCreada, setSolicitudCreada] = useState(null);
  const enviandoRef = useRef(false);

  const fechaMinima = useMemo(() => obtenerFechaHoyISO(), []);

  // Carga el servicio real y, como apoyo opcional, la dirección principal del
  // Cliente registrada en HU-004. El servicio es obligatorio; el perfil no
  // bloquea el formulario salvo que la sesión ya no sea válida.
  useEffect(() => {
    const controlador = new AbortController();
    let activo = true;

    if (idServicio === null || idServicio === undefined || idServicio === '') {
      setEstado({
        cargando: false,
        servicio: null,
        perfil: null,
        errorCarga: new Error('No se seleccionó un servicio válido.'),
        errorProveedor: null,
        avisoPerfil: null,
      });
      return () => {
        activo = false;
        controlador.abort();
      };
    }

    setEstado((previo) => ({
      ...previo,
      cargando: true,
      errorCarga: null,
      errorProveedor: null,
      avisoPerfil: null,
    }));

    const cargar = async () => {
      const [resultadoServicio, resultadoPerfil] = await Promise.allSettled([
        consultarServicioPorId(idServicio, { signal: controlador.signal }),
        consultarPerfilCliente(sesion.token),
      ]);

      if (!activo) return;

      if (resultadoServicio.status === 'rejected') {
        const error = resultadoServicio.reason;
        if (error?.name === 'AbortError') return;
        setEstado({
          cargando: false,
          servicio: null,
          perfil: null,
          errorCarga: error,
          errorProveedor: null,
          avisoPerfil: null,
        });
        return;
      }

      const servicio = resultadoServicio.value;
      if (!servicio || servicio.id === null || servicio.id === undefined) {
        setEstado({
          cargando: false,
          servicio: null,
          perfil: null,
          errorCarga: new Error('No se encontró la información del servicio.'),
          errorProveedor: null,
          avisoPerfil: null,
        });
        return;
      }

      if (idProveedor !== null && idProveedor !== undefined && idProveedor !== '') {
        const esperado = Number(idProveedor);
        if (
          !Number.isFinite(esperado) ||
          Number(servicio.id_proveedor) !== esperado
        ) {
          setEstado({
            cargando: false,
            servicio,
            perfil: null,
            errorCarga: null,
            errorProveedor:
              'El servicio seleccionado no pertenece al proveedor desde el que se inició la solicitud.',
            avisoPerfil: null,
          });
          return;
        }
      }

      let perfil = null;
      let avisoPerfil = null;

      if (resultadoPerfil.status === 'rejected') {
        const errorPerfil = resultadoPerfil.reason;
        if (errorPerfil?.esErrorAutenticacion) {
          setEstado({
            cargando: false,
            servicio,
            perfil: null,
            errorCarga: errorPerfil,
            errorProveedor: null,
            avisoPerfil: null,
          });
          return;
        }
        avisoPerfil =
          'No fue posible precargar tu dirección principal. Puedes escribir los datos del lugar de atención manualmente.';
      } else {
        perfil = resultadoPerfil.value || null;
      }

      setEstado({
        cargando: false,
        servicio,
        perfil,
        errorCarga: null,
        errorProveedor: null,
        avisoPerfil,
      });

      const direccionPrincipal = perfil?.direccionPrincipal;
      setFormulario((previo) => {
        if (previo.direccion_texto || previo.barrio_sector) return previo;
        return {
          ...previo,
          direccion_texto: direccionPrincipal?.informacion_complementaria || '',
          barrio_sector: direccionPrincipal?.barrio_sector || '',
        };
      });
    };

    cargar();

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [idServicio, idProveedor, sesion.token, intento]);

  const servicio = estado.servicio;
  const duracion = Number(servicio?.duracion_minutos);
  const precio = formatearPrecio(servicio?.precio);
  const duracionTexto = formatearDuracionDetallada(duracion);
  const direccionPrincipal = estado.perfil?.direccionPrincipal || null;

  const horaFin = useMemo(() => {
    if (!esFechaValida(formulario.fecha) || !esHoraValida(formulario.hora)) return null;
    return describirHoraFin(formulario.fecha, formulario.hora, duracion);
  }, [formulario.fecha, formulario.hora, duracion]);

  const inicioResumen =
    esFechaValida(formulario.fecha) && esHoraValida(formulario.hora)
      ? formatearFechaHora(parsearFechaHoraLocal(formulario.fecha, formulario.hora))
      : 'Por definir';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormulario((previo) => ({ ...previo, [name]: value }));
    if (errores[name]) {
      setErrores((previo) => ({ ...previo, [name]: undefined }));
    }
    if (name === 'fecha' || name === 'hora') {
      setErrorHorario(null);
    }
  };

  const usarDireccionPrincipal = () => {
    if (!direccionPrincipal) return;
    setFormulario((previo) => ({
      ...previo,
      direccion_texto: direccionPrincipal.informacion_complementaria || '',
      barrio_sector: direccionPrincipal.barrio_sector || '',
    }));
    setErrores((previo) => ({
      ...previo,
      direccion_texto: undefined,
      barrio_sector: undefined,
    }));
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formulario.fecha) {
      nuevosErrores.fecha = 'La fecha es obligatoria';
    } else if (!esFechaValida(formulario.fecha)) {
      nuevosErrores.fecha = 'La fecha no es válida';
    }

    if (!formulario.hora) {
      nuevosErrores.hora = 'La hora es obligatoria';
    } else if (!esHoraValida(formulario.hora)) {
      nuevosErrores.hora = 'La hora no es válida';
    }

    if (
      !nuevosErrores.fecha &&
      !nuevosErrores.hora &&
      !esFechaHoraFutura(formulario.fecha, formulario.hora)
    ) {
      nuevosErrores.hora =
        'La fecha y hora deben ser posteriores al momento actual';
    }

    const direccion = formulario.direccion_texto.trim();
    if (!direccion) {
      nuevosErrores.direccion_texto = 'La dirección de atención es obligatoria';
    } else if (direccion.length > 255) {
      nuevosErrores.direccion_texto = 'La dirección no puede superar los 255 caracteres';
    }

    // HU-012 exige el barrio o sector. El DTO del backend lo acepta opcional,
    // pero la historia de usuario lo establece como información requerida.
    const barrio = formulario.barrio_sector.trim();
    if (!barrio) {
      nuevosErrores.barrio_sector = 'El barrio o sector es obligatorio';
    } else if (barrio.length > 150) {
      nuevosErrores.barrio_sector = 'El barrio o sector no puede superar los 150 caracteres';
    }

    if (formulario.informacion_complementaria.trim().length > 255) {
      nuevosErrores.informacion_complementaria =
        'La información complementaria no puede superar los 255 caracteres';
    }

    if (formulario.observaciones.trim().length > 500) {
      nuevosErrores.observaciones = 'Las observaciones no pueden superar los 500 caracteres';
    }

    setErrores(nuevosErrores);

    const camposPendientes = Object.keys(nuevosErrores)
      .filter((campo) => nuevosErrores[campo])
      .map((campo) => ETIQUETAS_CAMPO[campo] || campo);

    if (camposPendientes.length > 0) {
      setErrorGeneral(
        `Completa la información pendiente: ${camposPendientes.join(', ')}.`
      );
      const primerCampo = [
        'fecha',
        'hora',
        'direccion_texto',
        'barrio_sector',
        'informacion_complementaria',
        'observaciones',
      ].find((campo) => nuevosErrores[campo]);
      if (primerCampo && typeof document !== 'undefined') {
        document.getElementById(`solicitud-${primerCampo}`)?.focus();
      }
    }

    return camposPendientes.length === 0;
  };

  const manejarErrorEnvio = (error) => {
    if (error?.fieldErrors) {
      const erroresMapeados = {};
      const mensajesGenerales = [];

      Object.entries(error.fieldErrors).forEach(([campo, mensaje]) => {
        const destino = MAPA_CAMPOS_BACKEND[campo];
        if (destino) {
          erroresMapeados[destino] = String(mensaje);
        } else {
          mensajesGenerales.push(String(mensaje));
        }
      });

      setErrores((previo) => ({ ...previo, ...erroresMapeados }));
      setErrorGeneral(
        mensajesGenerales.length > 0
          ? `El servidor rechazó la solicitud: ${mensajesGenerales.join('. ')}`
          : 'El servidor rechazó la solicitud. Revisa los campos señalados.'
      );
      return;
    }

    const mensaje = obtenerMensajeError(
      error,
      'No fue posible crear la solicitud. Inténtalo de nuevo.'
    );

    if (error?.status === 401 || error?.status === 403 || error?.esErrorAutenticacion) {
      setErrorGeneral(mensaje);
      return;
    }

    if (error?.status === 404) {
      setErrorGeneral(
        `${mensaje} Vuelve a la exploración y selecciona un servicio disponible.`
      );
      return;
    }

    if (error?.status === 400 && mensajePareceDeHorario(mensaje)) {
      setErrorHorario({
        titulo: 'El horario solicitado no se encuentra disponible.',
        detalle:
          mensaje ===
          'El horario solicitado no se encuentra dentro de la disponibilidad del proveedor'
            ? 'El Proveedor no atiende en ese día u horario. Puedes corregir la fecha u hora e intentarlo de nuevo.'
            : mensaje,
      });
      setErrores((previo) => ({
        ...previo,
        hora: 'El horario solicitado no se encuentra disponible',
      }));
      return;
    }

    if (error?.status === 400 && /servicio no se encuentra disponible/i.test(mensaje)) {
      setErrorGeneral(
        'El servicio seleccionado ya no se encuentra disponible. Vuelve a la exploración para elegir otro servicio.'
      );
      return;
    }

    setErrorGeneral(mensaje);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (enviandoRef.current) return;

    setErrorGeneral(null);
    setErrorHorario(null);
    setAdvertencia(null);

    if (!servicio) {
      setErrorGeneral('No hay un servicio seleccionado para crear la solicitud.');
      return;
    }

    if (!validarFormulario()) return;

    const fechaHoraSolicitada = construirFechaHoraSolicitada(
      formulario.fecha,
      formulario.hora
    );

    if (!fechaHoraSolicitada) {
      setErrorGeneral('La fecha u hora seleccionada no es válida.');
      return;
    }

    const payload = {
      id_servicio: Number(servicio.id),
      fecha_hora_solicitada: fechaHoraSolicitada,
      direccion_texto: formulario.direccion_texto.trim(),
      barrio_sector: formulario.barrio_sector.trim(),
      informacion_complementaria:
        formulario.informacion_complementaria.trim() || null,
      observaciones: formulario.observaciones.trim() || null,
    };

    if (!Number.isFinite(payload.id_servicio)) {
      setErrorGeneral('No fue posible identificar el servicio seleccionado.');
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);

    try {
      // Antes de confirmar se vuelven a consultar las condiciones vigentes y
      // se comprueba que el servicio siga perteneciendo al Proveedor y a su
      // catálogo activo. El backend conserva la copia definitiva al guardar.
      let servicioActual;
      try {
        servicioActual = await consultarServicioPorId(payload.id_servicio);
      } catch (errorServicio) {
        if (esErrorNoEncontrado(errorServicio)) {
          setErrorGeneral(
            'El servicio seleccionado ya no existe. Vuelve a la exploración y elige un servicio disponible.'
          );
        } else {
          setErrorGeneral(
            obtenerMensajeError(
              errorServicio,
              'No fue posible verificar las condiciones actuales del servicio. Inténtalo de nuevo.'
            )
          );
        }
        return;
      }

      if (!servicioActual || servicioActual.id === null || servicioActual.id === undefined) {
        setErrorGeneral('No fue posible verificar el servicio seleccionado. Inténtalo de nuevo.');
        return;
      }

      if (Number(servicioActual.id_proveedor) !== Number(servicio.id_proveedor)) {
        setErrorGeneral(
          'El servicio seleccionado no pertenece al proveedor desde el que se inició la solicitud.'
        );
        return;
      }

      let proveedorActual;
      try {
        proveedorActual = await consultarProveedorPorId(servicioActual.id_proveedor);
      } catch (errorProveedor) {
        if (esErrorNoEncontrado(errorProveedor)) {
          setErrorGeneral(
            'El proveedor del servicio ya no existe o no está disponible. Vuelve a la exploración.'
          );
        } else {
          setErrorGeneral(
            obtenerMensajeError(
              errorProveedor,
              'No fue posible verificar el proveedor del servicio. Inténtalo de nuevo.'
            )
          );
        }
        return;
      }

      const catalogo = Array.isArray(proveedorActual?.catalogo)
        ? proveedorActual.catalogo
        : [];
      const sigueEnCatalogo = catalogo.some(
        (item) => Number(item?.id) === Number(servicioActual.id)
      );

      if (!sigueEnCatalogo) {
        setErrorGeneral(
          'El servicio seleccionado ya no se encuentra disponible en el catálogo del proveedor. Vuelve a la exploración para elegir otro servicio.'
        );
        return;
      }

      const condicionesCambiaron =
        String(servicioActual.nombre ?? '') !== String(servicio.nombre ?? '') ||
        Number(servicioActual.precio) !== Number(servicio.precio) ||
        Number(servicioActual.duracion_minutos) !== Number(servicio.duracion_minutos);

      setEstado((previo) => ({ ...previo, servicio: servicioActual }));

      if (condicionesCambiaron) {
        setAdvertencia(
          'Las condiciones del servicio cambiaron mientras completabas la solicitud. Revisa el resumen actualizado y confirma nuevamente para guardar los valores vigentes.'
        );
        return;
      }

      const respuesta = await crearSolicitud(sesion.token, payload);

      if (!respuesta || respuesta.id_solicitud === null || respuesta.id_solicitud === undefined) {
        throw new Error(
          'El servidor no confirmó el número de la solicitud. Inténtalo de nuevo.'
        );
      }

      setSolicitudCreada(respuesta);
    } catch (error) {
      manejarErrorEnvio(error);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const crearOtraSolicitud = () => {
    setSolicitudCreada(null);
    setFormulario(FORMULARIO_INICIAL);
    setErrores({});
    setErrorGeneral(null);
    setErrorHorario(null);
    setAdvertencia(null);
    setEstado((previo) => ({ ...previo, cargando: true }));
    setIntento((valor) => valor + 1);
  };

  if (solicitudCreada) {
    return (
      <ConfirmacionSolicitud
        solicitud={solicitudCreada}
        onVolverDetalle={onVolverDetalle}
        onVolverExploracion={onVolverExploracion}
        onCrearOtra={crearOtraSolicitud}
        onVerMisSolicitudes={onVerMisSolicitudes}
      />
    );
  }

  if (estado.cargando) {
    return (
      <section aria-labelledby="solicitud-cargando">
        {onVolverDetalle && (
          <div className="mb-3">
            <BotonVolver onClick={onVolverDetalle}>Volver al detalle del servicio</BotonVolver>
          </div>
        )}
        <h2 id="solicitud-cargando" className="h4 fw-semibold text-dark mb-3">
          Crear solicitud de servicio
        </h2>
        <IndicadorCarga texto="Consultando las condiciones vigentes del servicio..." />
      </section>
    );
  }

  if (estado.errorProveedor) {
    return (
      <section aria-labelledby="solicitud-proveedor-error">
        {onVolverDetalle && (
          <div className="mb-3">
            <BotonVolver onClick={onVolverDetalle}>Volver al detalle del servicio</BotonVolver>
          </div>
        )}
        <EstadoVacio titulo="El servicio no pertenece al proveedor seleccionado.">
          <p className="small text-muted mb-3">{estado.errorProveedor}</p>
          {onVolverExploracion && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onVolverExploracion}>
              Volver a la exploración
            </button>
          )}
        </EstadoVacio>
        <h2 id="solicitud-proveedor-error" className="visually-hidden">
          Servicio no válido para el proveedor
        </h2>
      </section>
    );
  }

  if (estado.errorCarga) {
    if (esErrorNoEncontrado(estado.errorCarga)) {
      return (
        <section aria-labelledby="solicitud-servicio-no-encontrado">
          {onVolverDetalle && (
            <div className="mb-3">
              <BotonVolver onClick={onVolverDetalle}>Volver al detalle del servicio</BotonVolver>
            </div>
          )}
          <EstadoVacio titulo="No se encontró el servicio solicitado.">
            <p className="small text-muted mb-3">
              Es posible que el servicio haya cambiado o que ya no esté disponible en el catálogo.
            </p>
            {onVolverExploracion && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onVolverExploracion}
              >
                Volver a la exploración
              </button>
            )}
          </EstadoVacio>
          <h2 id="solicitud-servicio-no-encontrado" className="visually-hidden">
            Servicio no encontrado
          </h2>
        </section>
      );
    }

    return (
      <section aria-labelledby="solicitud-error-carga">
        {onVolverDetalle && (
          <div className="mb-3">
            <BotonVolver onClick={onVolverDetalle}>Volver al detalle del servicio</BotonVolver>
          </div>
        )}
        <h2 id="solicitud-error-carga" className="h4 fw-semibold text-dark mb-3">
          Crear solicitud de servicio
        </h2>
        <AlertaError
          mensaje={obtenerMensajeError(
            estado.errorCarga,
            'No fue posible cargar la información necesaria para la solicitud.'
          )}
          onReintentar={() => setIntento((valor) => valor + 1)}
        />
      </section>
    );
  }

  if (!servicio) {
    return (
      <section aria-labelledby="solicitud-sin-servicio">
        {onVolverDetalle && (
          <div className="mb-3">
            <BotonVolver onClick={onVolverDetalle}>Volver al detalle del servicio</BotonVolver>
          </div>
        )}
        <EstadoVacio titulo="No se encontró el servicio solicitado.">
          <p className="small text-muted mb-0">
            No hay información disponible para crear la solicitud.
          </p>
        </EstadoVacio>
        <h2 id="solicitud-sin-servicio" className="visually-hidden">
          Servicio no encontrado
        </h2>
      </section>
    );
  }

  return (
    <section aria-labelledby="solicitud-titulo">
      {onVolverDetalle && (
        <div className="mb-3">
          <BotonVolver onClick={onVolverDetalle}>Volver al detalle del servicio</BotonVolver>
        </div>
      )}

      <div className="mb-4">
        <h2 id="solicitud-titulo" className="h3 fw-bold text-dark mb-2">
          Crear solicitud de servicio
        </h2>
        <p className="text-muted mb-0">
          Revisa las condiciones del servicio, indica cuándo y dónde deseas la atención y confirma
          la solicitud. La disponibilidad del Proveedor se valida en el servidor al confirmar.
        </p>
      </div>

      {errorGeneral && (
        <div className="alert alert-danger" role="alert" aria-live="assertive">
          {errorGeneral}
        </div>
      )}

      {advertencia && (
        <div className="alert alert-warning" role="alert" aria-live="polite">
          {advertencia}
        </div>
      )}

      {errorHorario && (
        <div className="alert alert-warning" role="alert" aria-live="assertive">
          <p className="fw-semibold mb-1">{errorHorario.titulo}</p>
          {errorHorario.detalle && <p className="mb-1 small">{errorHorario.detalle}</p>}
          <p className="mb-0 small">
            Tus datos se conservan. Corrige la fecha u hora e inténtalo de nuevo; también puedes
            elegir otro servicio desde la exploración.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
              <div>
                <h3 className="h5 fw-semibold text-dark mb-1">Servicio solicitado</h3>
                <p className="small text-muted mb-0">
                  Condiciones vigentes consultadas al servidor.
                </p>
              </div>
              {servicio.categoria && (
                <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                  {servicio.categoria}
                </span>
              )}
            </div>

            <h4 className="h5 fw-bold text-dark mb-1">
              {servicio.nombre || 'Servicio sin nombre'}
            </h4>
            <p className="text-secondary mb-3">
              Proveedor: {servicio.nombre_proveedor || 'No especificado'}
            </p>

            <dl className="row g-2 small mb-0">
              <dt className="col-5 col-sm-4 text-muted fw-normal">Precio vigente</dt>
              <dd className="col-7 col-sm-8 mb-0 fw-semibold text-primary">
                {precio || 'No disponible'}
              </dd>

              <dt className="col-5 col-sm-4 text-muted fw-normal">Duración vigente</dt>
              <dd className="col-7 col-sm-8 mb-0 text-dark">
                {duracionTexto || 'No disponible'}
              </dd>
            </dl>
          </div>
        </div>

        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h3 className="h5 fw-semibold text-dark mb-1">Fecha y hora de la atención</h3>
            <p className="small text-muted mb-3">
              Selecciona la fecha y la hora de inicio en tu hora local. El sistema comprobará que
              el Proveedor tenga disponibilidad registrada para ese momento.
            </p>

            <div className="row g-3">
              <div className="col-12 col-sm-6">
                <label htmlFor="solicitud-fecha" className="form-label small fw-semibold">
                  Fecha <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  id="solicitud-fecha"
                  name="fecha"
                  className={`form-control ${errores.fecha ? 'is-invalid' : ''}`}
                  value={formulario.fecha}
                  onChange={handleChange}
                  min={fechaMinima}
                  required
                  disabled={enviando}
                  aria-invalid={!!errores.fecha}
                  aria-describedby={errores.fecha ? 'error-solicitud-fecha' : undefined}
                />
                {errores.fecha && (
                  <div id="error-solicitud-fecha" className="invalid-feedback d-block">
                    {errores.fecha}
                  </div>
                )}
              </div>

              <div className="col-12 col-sm-6">
                <label htmlFor="solicitud-hora" className="form-label small fw-semibold">
                  Hora de inicio <span className="text-danger">*</span>
                </label>
                <input
                  type="time"
                  id="solicitud-hora"
                  name="hora"
                  className={`form-control ${errores.hora ? 'is-invalid' : ''}`}
                  value={formulario.hora}
                  onChange={handleChange}
                  step="60"
                  required
                  disabled={enviando}
                  aria-invalid={!!errores.hora}
                  aria-describedby={errores.hora ? 'error-solicitud-hora' : 'ayuda-solicitud-hora'}
                />
                {errores.hora ? (
                  <div id="error-solicitud-hora" className="invalid-feedback d-block">
                    {errores.hora}
                  </div>
                ) : (
                  <div id="ayuda-solicitud-hora" className="form-text">
                    La solicitud debe quedar en el futuro.
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded bg-light p-3 mt-3" role="status" aria-live="polite">
              <p className="small text-muted mb-1">Hora de finalización estimada</p>
              <p className="h5 fw-semibold text-dark mb-1">{horaFin || 'Por calcular'}</p>
              <p className="small text-muted mb-0">
                Calculada con la duración vigente del servicio
                {duracionTexto ? ` (${duracionTexto})` : ''}. La hora final no se envía al
                servidor; se muestra a partir de la duración conservada.
              </p>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h3 className="h5 fw-semibold text-dark mb-1">Lugar de atención</h3>
            <p className="small text-muted mb-3">
              Indica la dirección y el barrio o sector donde se prestará el servicio. Esta
              información se conserva tal como la proporcionas; no se calculan distancias ni
              coberturas automáticamente.
            </p>

            {estado.avisoPerfil && (
              <div className="alert alert-warning py-2" role="status">
                {estado.avisoPerfil}
              </div>
            )}

            {direccionPrincipal ? (
              <div className="border rounded bg-light p-3 mb-3">
                <p className="small fw-semibold text-dark mb-1">
                  Dirección principal registrada en tu perfil
                </p>
                <p className="small text-secondary mb-1">
                  {[direccionPrincipal.ciudad, direccionPrincipal.barrio_sector]
                    .filter(Boolean)
                    .join(' · ') || 'Sin ciudad o barrio informados'}
                </p>
                {direccionPrincipal.informacion_complementaria && (
                  <p className="small text-secondary mb-2">
                    {direccionPrincipal.informacion_complementaria}
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={usarDireccionPrincipal}
                  disabled={enviando}
                >
                  Usar estos datos
                </button>
              </div>
            ) : (
              <div className="alert alert-info py-2" role="status">
                No tienes una dirección principal registrada. Ingresa manualmente la dirección de
                atención y el barrio o sector.
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="solicitud-direccion_texto" className="form-label small fw-semibold">
                Dirección de atención <span className="text-danger">*</span>
              </label>
              <textarea
                id="solicitud-direccion_texto"
                name="direccion_texto"
                rows="2"
                className={`form-control ${errores.direccion_texto ? 'is-invalid' : ''}`}
                value={formulario.direccion_texto}
                onChange={handleChange}
                placeholder="Ej: Calle 123 # 45-67, Torre 2, Apto 501"
                required
                maxLength={255}
                disabled={enviando}
                aria-invalid={!!errores.direccion_texto}
                aria-describedby={
                  errores.direccion_texto
                    ? 'error-solicitud-direccion'
                    : 'ayuda-solicitud-direccion'
                }
              />
              {errores.direccion_texto ? (
                <div id="error-solicitud-direccion" className="invalid-feedback d-block">
                  {errores.direccion_texto}
                </div>
              ) : (
                <div id="ayuda-solicitud-direccion" className="form-text">
                  Incluye calle, carrera, número y referencias del lugar.
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="solicitud-barrio_sector" className="form-label small fw-semibold">
                Barrio o sector <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="solicitud-barrio_sector"
                name="barrio_sector"
                className={`form-control ${errores.barrio_sector ? 'is-invalid' : ''}`}
                value={formulario.barrio_sector}
                onChange={handleChange}
                placeholder="Ej: Chapinero, El Poblado, Granada..."
                required
                maxLength={150}
                disabled={enviando}
                aria-invalid={!!errores.barrio_sector}
                aria-describedby={
                  errores.barrio_sector
                    ? 'error-solicitud-barrio'
                    : 'ayuda-solicitud-barrio'
                }
              />
              {errores.barrio_sector ? (
                <div id="error-solicitud-barrio" className="invalid-feedback d-block">
                  {errores.barrio_sector}
                </div>
              ) : (
                <div id="ayuda-solicitud-barrio" className="form-text">
                  Barrio o sector del lugar donde se prestará el servicio.
                </div>
              )}
            </div>

            <div className="mb-3">
              <label
                htmlFor="solicitud-informacion_complementaria"
                className="form-label small fw-semibold"
              >
                Información complementaria (opcional)
              </label>
              <textarea
                id="solicitud-informacion_complementaria"
                name="informacion_complementaria"
                rows="2"
                className={`form-control ${
                  errores.informacion_complementaria ? 'is-invalid' : ''
                }`}
                value={formulario.informacion_complementaria}
                onChange={handleChange}
                placeholder="Ej: Torre, apartamento, indicaciones de acceso..."
                maxLength={255}
                disabled={enviando}
                aria-invalid={!!errores.informacion_complementaria}
                aria-describedby={
                  errores.informacion_complementaria
                    ? 'error-solicitud-info'
                    : 'ayuda-solicitud-info'
                }
              />
              {errores.informacion_complementaria ? (
                <div id="error-solicitud-info" className="invalid-feedback d-block">
                  {errores.informacion_complementaria}
                </div>
              ) : (
                <div id="ayuda-solicitud-info" className="form-text">
                  Detalles útiles para llegar o acceder al lugar.
                </div>
              )}
            </div>

            <div className="mb-0">
              <label htmlFor="solicitud-observaciones" className="form-label small fw-semibold">
                Observaciones (opcional)
              </label>
              <textarea
                id="solicitud-observaciones"
                name="observaciones"
                rows="2"
                className={`form-control ${errores.observaciones ? 'is-invalid' : ''}`}
                value={formulario.observaciones}
                onChange={handleChange}
                placeholder="Ej: Preferencias o indicaciones para el Proveedor..."
                maxLength={500}
                disabled={enviando}
                aria-invalid={!!errores.observaciones}
                aria-describedby={
                  errores.observaciones
                    ? 'error-solicitud-observaciones'
                    : 'ayuda-solicitud-observaciones'
                }
              />
              {errores.observaciones ? (
                <div id="error-solicitud-observaciones" className="invalid-feedback d-block">
                  {errores.observaciones}
                </div>
              ) : (
                <div id="ayuda-solicitud-observaciones" className="form-text">
                  Comentarios adicionales para la atención.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h3 className="h5 fw-semibold text-dark mb-1">Resumen de la solicitud</h3>
            <p className="small text-muted mb-3">
              Revisa la información antes de confirmar. El estado inicial será “Pendiente”.
            </p>

            <dl className="row g-2 small mb-0">
              <dt className="col-5 col-sm-4 text-muted fw-normal">Proveedor</dt>
              <dd className="col-7 col-sm-8 mb-2 text-dark">
                {servicio.nombre_proveedor || 'No especificado'}
              </dd>

              <dt className="col-5 col-sm-4 text-muted fw-normal">Servicio</dt>
              <dd className="col-7 col-sm-8 mb-2 text-dark">
                {servicio.nombre || 'No especificado'}
              </dd>

              <dt className="col-5 col-sm-4 text-muted fw-normal">Categoría</dt>
              <dd className="col-7 col-sm-8 mb-2 text-dark">
                {servicio.categoria || 'No especificada'}
              </dd>

              <dt className="col-5 col-sm-4 text-muted fw-normal">Precio vigente</dt>
              <dd className="col-7 col-sm-8 mb-2 fw-semibold text-primary">
                {precio || 'No disponible'}
              </dd>

              <dt className="col-5 col-sm-4 text-muted fw-normal">Duración vigente</dt>
              <dd className="col-7 col-sm-8 mb-2 text-dark">
                {duracionTexto || 'No disponible'}
              </dd>

              <dt className="col-5 col-sm-4 text-muted fw-normal">Inicio</dt>
              <dd className="col-7 col-sm-8 mb-2 text-dark">{inicioResumen}</dd>

              <dt className="col-5 col-sm-4 text-muted fw-normal">Hora de finalización</dt>
              <dd className="col-7 col-sm-8 mb-2 text-dark">{horaFin || 'Por calcular'}</dd>

              <dt className="col-5 col-sm-4 text-muted fw-normal">Dirección</dt>
              <dd className="col-7 col-sm-8 mb-2 text-dark">
                {formulario.direccion_texto.trim() || 'Por completar'}
              </dd>

              <dt className="col-5 col-sm-4 text-muted fw-normal">Barrio o sector</dt>
              <dd className="col-7 col-sm-8 mb-2 text-dark">
                {formulario.barrio_sector.trim() || 'Por completar'}
              </dd>

              {formulario.informacion_complementaria.trim() && (
                <>
                  <dt className="col-5 col-sm-4 text-muted fw-normal">Información complementaria</dt>
                  <dd className="col-7 col-sm-8 mb-2 text-dark">
                    {formulario.informacion_complementaria.trim()}
                  </dd>
                </>
              )}

              {formulario.observaciones.trim() && (
                <>
                  <dt className="col-5 col-sm-4 text-muted fw-normal">Observaciones</dt>
                  <dd className="col-7 col-sm-8 mb-0 text-dark">
                    {formulario.observaciones.trim()}
                  </dd>
                </>
              )}
            </dl>

            <div className="alert alert-info mt-3 mb-3" role="note">
              Al confirmar, el sistema guardará una copia del nombre, el precio y la duración
              vigentes del servicio. Esos valores no cambiarán aunque el Proveedor modifique su
              catálogo después.
            </div>

            <div className="d-flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary" disabled={enviando}>
                {enviando ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Creando solicitud...
                  </>
                ) : (
                  'Confirmar solicitud'
                )}
              </button>
              {onVolverDetalle && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onVolverDetalle}
                  disabled={enviando}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </section>
  );
};

/**
 * Punto de entrada de HU-012. La comprobación de rol es una defensa adicional
 * de la interfaz; la autorización definitiva la realiza Spring Security y el
 * backend a partir del JWT.
 */
export const SolicitudServicio = ({
  idServicio,
  idProveedor,
  sesion,
  onVolverDetalle,
  onVolverExploracion,
  onVerMisSolicitudes,
}) => {
  if (!sesion?.token || sesion?.rol !== 'cliente') {
    return (
      <AccesoRestringido
        sesion={sesion}
        onVolverDetalle={onVolverDetalle}
        onVolverExploracion={onVolverExploracion}
      />
    );
  }

  return (
    <FormularioSolicitud
      idServicio={idServicio}
      idProveedor={idProveedor}
      sesion={sesion}
      onVolverDetalle={onVolverDetalle}
      onVolverExploracion={onVolverExploracion}
      onVerMisSolicitudes={onVerMisSolicitudes}
    />
  );
};
