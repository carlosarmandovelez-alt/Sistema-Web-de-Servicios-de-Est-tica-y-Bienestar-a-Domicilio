import React, { useEffect, useMemo, useRef, useState } from 'react';
import { consultarPerfilCliente } from '../Servicios/clienteService';
import {
  consultarDisponibilidadProveedor,
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
  esHoraEnFranjaMediaHora,
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
  /(horario|periodo no disponible|no está disponible en la fecha|disponibilidad del proveedor|media hora)/i.test(
    mensaje
  );

const MENSAJES_SIN_DISPONIBILIDAD = {
  SERVICIO_NO_DISPONIBLE: 'El servicio seleccionado ya no está disponible.',
  PERIODO_NO_DISPONIBLE:
    'El Proveedor no atiende en la fecha seleccionada por un periodo de excepción.',
  SIN_DISPONIBILIDAD_DIA: 'El Proveedor no atiende ese día de la semana.',
  SIN_HORARIOS_SUFICIENTES:
    'La duración del servicio no cabe en el horario de atención de ese día.',
  SIN_HORARIOS_LIBRES:
    'Todas las horas de ese día están ocupadas por otras solicitudes.',
};

const MENSAJE_SIN_DISPONIBILIDAD_GENERAL =
  'No hay horarios disponibles para este Proveedor en la fecha seleccionada. Intenta elegir otra fecha.';

const obtenerMensajeSinDisponibilidad = (motivo) =>
  MENSAJES_SIN_DISPONIBILIDAD[motivo] || MENSAJE_SIN_DISPONIBILIDAD_GENERAL;

const identificadorHora = (hora) =>
  `solicitud-hora-${String(hora).replace(/\D/g, '')}`;

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

  // HU-012: disponibilidad real del Proveedor para la fecha elegida.
  const [disponibilidad, setDisponibilidad] = useState({
    cargando: false,
    datos: null,
    error: null,
  });
  const [intentoDisponibilidad, setIntentoDisponibilidad] = useState(0);

  // NUEVO: Estado para guardar los días de la semana que tienen disponibilidad
  const [diasDisponibles, setDiasDisponibles] = useState({
    cargando: false,
    dias: [],
    error: null
  });

  const formularioRef = useRef(formulario);
  useEffect(() => {
    formularioRef.current = formulario;
  }, [formulario]);

  const fechaMinima = useMemo(() => obtenerFechaHoyISO(), []);

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

  // EFECTO MEJORADO: Consultar disponibilidad de los próximos 14 días
  useEffect(() => {
    if (!servicio || !servicio.id_proveedor) return;

    let activo = true;
    setDiasDisponibles({ cargando: true, dias: [], error: null });

    const consultarSemana = async () => {
      const diasEncontrados = [];
      const hoy = new Date();
      
      const promesas = [];
      // Ampliamos a 14 días para cubrir dos semanas completas
      for (let i = 1; i <= 14; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + i);
        const fechaStr = fecha.toISOString().split('T')[0]; 
        
        promesas.push(
          consultarDisponibilidadProveedor(servicio.id_proveedor, fechaStr, servicio.id)
            .then(res => ({ fecha, res }))
            .catch(() => ({ fecha, res: null })) 
        );
      }

      try {
        const resultados = await Promise.all(promesas);
        
        if (!activo) return;

        resultados.forEach(({ fecha, res }) => {
          // Si el backend dice que hay horas disponibles, guardamos el nombre del día
          if (res && Array.isArray(res.horas_disponibles) && res.horas_disponibles.length > 0) {
            const nombreDia = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
            const diaCapitalizado = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
            if (!diasEncontrados.includes(diaCapitalizado)) {
              diasEncontrados.push(diaCapitalizado);
            }
          }
        });

        // Ordenamos los días para que salgan de Lunes a Domingo y no en el orden en que se encontraron
        const ordenDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
        diasEncontrados.sort((a, b) => ordenDias.indexOf(a) - ordenDias.indexOf(b));

        setDiasDisponibles({ cargando: false, dias: diasEncontrados, error: null });
      } catch (error) {
        if (activo) {
          setDiasDisponibles({ cargando: false, dias: [], error: 'No se pudo consultar la disponibilidad semanal.' });
        }
      }
    };

    consultarSemana();

    return () => {
      activo = false;
    };
  }, [servicio]);

  useEffect(() => {
    if (!servicio || !esFechaValida(formulario.fecha)) {
      setDisponibilidad({ cargando: false, datos: null, error: null });
      return undefined;
    }

    let activo = true;
    const controlador = new AbortController();
    const horaActual = formularioRef.current.hora;

    setDisponibilidad((previo) => ({ ...previo, cargando: true, error: null }));

    const cargar = async () => {
      try {
        const datos = await consultarDisponibilidadProveedor(
          servicio.id_proveedor,
          formulario.fecha,
          servicio.id,
          { signal: controlador.signal }
        );

        if (!activo) return;

        setDisponibilidad({ cargando: false, datos, error: null });

        const disponibles = Array.isArray(datos?.horas_disponibles)
          ? datos.horas_disponibles
          : [];

        if (horaActual && !disponibles.includes(horaActual)) {
          setFormulario((previo) => ({ ...previo, hora: '' }));
          setErrores((previos) =>
            previos.hora ? { ...previos, hora: undefined } : previos
          );
        }
      } catch (error) {
        if (!activo || error?.name === 'AbortError') return;
        setDisponibilidad({ cargando: false, datos: null, error });
        setFormulario((previo) => (previo.hora ? { ...previo, hora: '' } : previo));
        setErrores((previos) =>
          previos.hora ? { ...previos, hora: undefined } : previos
        );
      }
    };

    cargar();

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [servicio, formulario.fecha, intentoDisponibilidad]);

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
    setFormulario((previo) => ({
      ...previo,
      [name]: value,
      ...(name === 'fecha' ? { hora: '' } : {}),
    }));
    if (errores[name]) {
      setErrores((previo) => ({ ...previo, [name]: undefined }));
    }
    if (name === 'fecha' && errores.hora) {
      setErrores((previo) => ({ ...previo, hora: undefined }));
    }
    if (name === 'fecha' || name === 'hora') {
      setErrorHorario(null);
    }
  };

  const seleccionarHora = (hora) => {
    setFormulario((previo) => ({ ...previo, hora }));
    if (errores.hora) {
      setErrores((previo) => ({ ...previo, hora: undefined }));
    }
    setErrorHorario(null);
  };

  const reintentarDisponibilidad = () => {
    setIntentoDisponibilidad((valor) => valor + 1);
  };

  const horasDisponibles = Array.isArray(disponibilidad.datos?.horas_disponibles)
    ? disponibilidad.datos.horas_disponibles
    : [];
  const horasOcupadas = Array.isArray(disponibilidad.datos?.horas_ocupadas)
    ? disponibilidad.datos.horas_ocupadas
    : [];
  const mensajeSinHorarios = disponibilidad.datos
    ? obtenerMensajeSinDisponibilidad(disponibilidad.datos.motivo)
    : MENSAJE_SIN_DISPONIBILIDAD_GENERAL;

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
    } else if (!esHoraEnFranjaMediaHora(formulario.hora)) {
      nuevosErrores.hora =
        'La hora de inicio debe ser en punto o a la media hora (:00 o :30)';
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
              Selecciona la fecha y la hora de inicio en tu hora local. Las horas que verás
              corresponden a la disponibilidad real del Proveedor para ese día.
            </p>

            {/* NUEVO MENSAJE DE DÍAS DISPONIBLES */}
            {diasDisponibles.cargando && (
              <div className="d-flex align-items-center gap-2 text-muted mb-3" role="status">
                <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
                <span className="small">Consultando los días de atención del Proveedor...</span>
              </div>
            )}

            {!diasDisponibles.cargando && diasDisponibles.dias.length > 0 && (
              <div className="alert alert-primary py-2 mb-3" role="status">
                <span className="fw-semibold">Días de atención del Proveedor: </span>
                {diasDisponibles.dias.join(', ')}.
                <span className="small d-block mt-1 text-muted">
                  Selecciona una fecha que coincida con estos días para ver los horarios disponibles.
                </span>
              </div>
            )}

            {!diasDisponibles.cargando && diasDisponibles.dias.length === 0 && !diasDisponibles.error && (
              <div className="alert alert-warning py-2 mb-3" role="status">
                El Proveedor no tiene horarios disponibles en los próximos 7 días.
              </div>
            )}

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
            </div>

            <div className="mt-3">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <span className="form-label small fw-semibold mb-0">
                  Hora de inicio <span className="text-danger">*</span>
                </span>
                {esFechaValida(formulario.fecha) && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={reintentarDisponibilidad}
                    disabled={enviando || disponibilidad.cargando}
                  >
                    Actualizar horarios
                  </button>
                )}
              </div>

              {!esFechaValida(formulario.fecha) && (
                <p className="small text-muted mb-0" id="ayuda-solicitud-hora">
                  Selecciona una fecha para consultar los horarios disponibles del Proveedor.
                </p>
              )}

              {esFechaValida(formulario.fecha) && disponibilidad.cargando && (
                <div
                  className="d-flex align-items-center gap-2 text-muted"
                  role="status"
                  aria-live="polite"
                >
                  <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
                  <span>Consultando la disponibilidad del Proveedor...</span>
                </div>
              )}

              {esFechaValida(formulario.fecha) &&
                !disponibilidad.cargando &&
                disponibilidad.error && (
                  <div className="alert alert-warning mb-0" role="alert">
                    <p className="mb-2">
                      No fue posible consultar la disponibilidad del Proveedor.
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={reintentarDisponibilidad}
                      disabled={enviando}
                    >
                      Reintentar
                    </button>
                  </div>
                )}

              {esFechaValida(formulario.fecha) &&
                !disponibilidad.cargando &&
                !disponibilidad.error &&
                disponibilidad.datos && (
                  <>
                    {horasDisponibles.length > 0 ? (
                      <div
                        id="solicitud-hora"
                        role="radiogroup"
                        aria-label="Horarios disponibles"
                        aria-invalid={!!errores.hora}
                        aria-describedby={
                          errores.hora ? 'error-solicitud-hora' : 'ayuda-solicitud-hora'
                        }
                      >
                        <div className="d-flex flex-wrap gap-2">
                          {horasDisponibles.map((hora) => {
                            const id = identificadorHora(hora);
                            return (
                              <div key={hora}>
                                <input
                                  type="radio"
                                  className="btn-check"
                                  name="hora"
                                  id={id}
                                  value={hora}
                                  checked={formulario.hora === hora}
                                  onChange={() => seleccionarHora(hora)}
                                  disabled={enviando}
                                />
                                <label className="btn btn-outline-primary btn-sm" htmlFor={id}>
                                  {hora}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                        <div id="ayuda-solicitud-hora" className="form-text">
                          Horas de inicio en punto o a la media hora, según la disponibilidad del
                          Proveedor.
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-warning mb-0" role="status">
                        <p className="fw-semibold mb-1">
                          {disponibilidad.datos?.motivo === 'SIN_DISPONIBILIDAD_DIA' 
                            ? 'El proveedor no atiende este día' 
                            : 'No hay horarios disponibles'}
                        </p>
                        <p className="small mb-2">{mensajeSinHorarios}</p>
                      </div>
                    )}

                    {horasOcupadas.length > 0 && (
                      <div className="mt-3">
                        <p className="small text-muted mb-2">
                          Horas no disponibles (otras solicitudes):
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                          {horasOcupadas.map((hora) => (
                            <span
                              key={hora}
                              className="btn btn-outline-secondary btn-sm disabled"
                              aria-disabled="true"
                            >
                              {hora}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

              {errores.hora && (
                <div id="error-solicitud-hora" className="invalid-feedback d-block mt-2">
                  {errores.hora}
                </div>
              )}
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
