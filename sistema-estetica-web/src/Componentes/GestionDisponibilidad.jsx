import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  consultarDisponibilidad,
  guardarDisponibilidad as guardarDisponibilidadServicio,
  consultarPeriodosNoDisponibles,
  registrarPeriodoNoDisponible,
} from '../Servicios/disponibilidadService';

/**
 * GestionDisponibilidad (HU-011)
 *
 * Permite al Proveedor autenticado:
 *   - CA-01/CA-02: consultar y reemplazar sus horarios habituales, validando
 *     que la hora inicial sea estrictamente anterior a la hora final.
 *   - CA-03/CA-04: consultar y registrar periodos no disponibles, validando
 *     que la fecha inicial no sea posterior a la fecha final.
 *
 * El backend identifica al Proveedor desde el JWT; el componente nunca envía
 * un identificador de Proveedor.
 */

const DIAS = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

const normalizarHora = (hora) => (typeof hora === 'string' ? hora.slice(0, 5) : '');

const normalizarDisponibilidad = (item) => ({
  id: item?.id ?? null,
  dia_semana: typeof item?.dia_semana === 'string' ? item.dia_semana : '',
  hora_inicio: normalizarHora(item?.hora_inicio),
  hora_fin: normalizarHora(item?.hora_fin),
});

const normalizarPeriodo = (item) => ({
  id: item?.id ?? null,
  fecha_inicio: typeof item?.fecha_inicio === 'string' ? item.fecha_inicio : '',
  fecha_fin: typeof item?.fecha_fin === 'string' ? item.fecha_fin : '',
  motivo: typeof item?.motivo === 'string' ? item.motivo : '',
});

const formatearFecha = (fecha) => {
  if (typeof fecha !== 'string') return '';
  const partes = fecha.split('-');
  if (partes.length !== 3) return fecha;
  const [anio, mes, dia] = partes;
  if (!anio || !mes || !dia) return fecha;
  return `${dia}/${mes}/${anio}`;
};

const formatearRangoFechas = (inicio, fin) => {
  if (!inicio && !fin) return 'Fechas no disponibles';
  if (inicio === fin || !fin) return formatearFecha(inicio);
  if (!inicio) return formatearFecha(fin);
  return `${formatearFecha(inicio)} – ${formatearFecha(fin)}`;
};

const ordenarPeriodos = (periodos) =>
  [...periodos].sort((a, b) => {
    const comparacionInicio = String(a.fecha_inicio).localeCompare(String(b.fecha_inicio));
    if (comparacionInicio !== 0) return comparacionInicio;
    const comparacionFin = String(a.fecha_fin).localeCompare(String(b.fecha_fin));
    if (comparacionFin !== 0) return comparacionFin;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

const MENSAJE_NO_DISPONIBLE =
  'La gestión de disponibilidad aún no está disponible en el servidor actual. No se ha guardado ni modificado ningún dato.';

export const GestionDisponibilidad = ({
  token,
  onSesionExpirada,
  onCerrarSesion,
}) => {
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);
  const [errorAutenticacion, setErrorAutenticacion] = useState(null);
  const [errorOperacion, setErrorOperacion] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [erroresSeccion, setErroresSeccion] = useState({
    disponibilidad: null,
    periodos: null,
  });
  const [noDisponible, setNoDisponible] = useState({
    disponibilidad: false,
    periodos: false,
  });

  const [disponibilidad, setDisponibilidad] = useState([]);
  const [periodos, setPeriodos] = useState([]);

  const [editandoDisponibilidad, setEditandoDisponibilidad] = useState(false);
  const [filas, setFilas] = useState([]);
  const [erroresFilas, setErroresFilas] = useState({});
  const [errorValidacionDisponibilidad, setErrorValidacionDisponibilidad] = useState(null);
  const [guardandoDisponibilidad, setGuardandoDisponibilidad] = useState(false);

  const [formPeriodo, setFormPeriodo] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
  });
  const [erroresPeriodo, setErroresPeriodo] = useState({});
  const [guardandoPeriodo, setGuardandoPeriodo] = useState(false);

  const filaKeyRef = useRef(0);
  const callbacksRef = useRef({ onSesionExpirada, onCerrarSesion });

  useEffect(() => {
    callbacksRef.current = { onSesionExpirada, onCerrarSesion };
  }, [onSesionExpirada, onCerrarSesion]);

  const crearFila = useCallback((datos = {}) => {
    filaKeyRef.current += 1;
    return {
      key: `fila-${filaKeyRef.current}`,
      dia_semana: datos.dia_semana || '',
      hora_inicio: normalizarHora(datos.hora_inicio),
      hora_fin: normalizarHora(datos.hora_fin),
    };
  }, []);

  const notificarSesionExpirada = useCallback((mensaje) => {
    const texto =
      mensaje || 'Tu sesión ha expirado. Inicia sesión nuevamente para gestionar tu disponibilidad.';
    setErrorAutenticacion(texto);
    if (callbacksRef.current.onSesionExpirada) {
      callbacksRef.current.onSesionExpirada(texto);
    }
  }, []);

  // Carga inicial y recargas explícitas.
  useEffect(() => {
    if (!token) {
      setCargando(false);
      setErrorAutenticacion('No se encontró una sesión activa válida.');
      return () => {};
    }

    const controlador = new AbortController();
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      setErrorAutenticacion(null);
      setErrorOperacion(null);
      setMensajeExito(null);
      setErroresSeccion({ disponibilidad: null, periodos: null });
      setNoDisponible({ disponibilidad: false, periodos: false });
      setEditandoDisponibilidad(false);

      const [resultadoDisponibilidad, resultadoPeriodos] = await Promise.allSettled([
        consultarDisponibilidad(token, { signal: controlador.signal }),
        consultarPeriodosNoDisponibles(token, { signal: controlador.signal }),
      ]);

      if (!activo) return;

      let sinSoporteDisponibilidad = false;
      let sinSoportePeriodos = false;
      let mensajeAutenticacion = null;
      const nuevosErrores = { disponibilidad: null, periodos: null };

      if (resultadoDisponibilidad.status === 'fulfilled') {
        const lista = Array.isArray(resultadoDisponibilidad.value)
          ? resultadoDisponibilidad.value.map(normalizarDisponibilidad)
          : [];
        setDisponibilidad(lista);
        setFilas(lista.length > 0 ? lista.map((item) => crearFila(item)) : [crearFila()]);
      } else {
        const error = resultadoDisponibilidad.reason;
        if (error?.status === 404) {
          sinSoporteDisponibilidad = true;
          setDisponibilidad([]);
          setFilas([crearFila()]);
        } else if (error?.status === 401) {
          mensajeAutenticacion =
            error.message || 'Tu sesión ha expirado. Inicia sesión nuevamente.';
        } else if (error?.status === 403) {
          nuevosErrores.disponibilidad =
            'No tienes autorización para consultar la disponibilidad de este proveedor.';
        } else if (error?.name !== 'AbortError') {
          nuevosErrores.disponibilidad =
            error?.message || 'No fue posible consultar la disponibilidad.';
        }
      }

      if (resultadoPeriodos.status === 'fulfilled') {
        const lista = Array.isArray(resultadoPeriodos.value)
          ? resultadoPeriodos.value.map(normalizarPeriodo)
          : [];
        setPeriodos(ordenarPeriodos(lista));
      } else {
        const error = resultadoPeriodos.reason;
        if (error?.status === 404) {
          sinSoportePeriodos = true;
          setPeriodos([]);
        } else if (error?.status === 401) {
          mensajeAutenticacion =
            error.message || 'Tu sesión ha expirado. Inicia sesión nuevamente.';
        } else if (error?.status === 403) {
          nuevosErrores.periodos =
            'No tienes autorización para consultar los periodos no disponibles de este proveedor.';
        } else if (error?.name !== 'AbortError') {
          nuevosErrores.periodos =
            error?.message || 'No fue posible consultar los periodos no disponibles.';
        }
      }

      setNoDisponible({
        disponibilidad: sinSoporteDisponibilidad,
        periodos: sinSoportePeriodos,
      });
      setErroresSeccion(nuevosErrores);

      if (mensajeAutenticacion) {
        notificarSesionExpirada(mensajeAutenticacion);
      }

      setCargando(false);
    };

    cargar().catch((error) => {
      if (!activo || error?.name === 'AbortError') return;
      setErrorOperacion(
        error?.message || 'No fue posible cargar la configuración de disponibilidad.'
      );
      setCargando(false);
    });

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [token, recarga, crearFila, notificarSesionExpirada]);

  const rangosPorDia = useMemo(
    () =>
      DIAS.map((dia) => ({
        ...dia,
        rangos: disponibilidad
          .filter((item) => item.dia_semana === dia.value)
          .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
      })),
    [disponibilidad]
  );

  const periodosOrdenados = useMemo(() => ordenarPeriodos(periodos), [periodos]);
  const sinSoporteTotal =
    !cargando && noDisponible.disponibilidad && noDisponible.periodos;

  const manejarErrorOperacion = (error, fallback, seccion = 'disponibilidad') => {
    if (error?.status === 401) {
      notificarSesionExpirada(error.message);
      return;
    }

    if (error?.status === 403) {
      setErrorOperacion(
        'No tienes autorización para realizar esta operación sobre tu disponibilidad.'
      );
      return;
    }

    if (error?.status === 404) {
      setNoDisponible((previo) => ({ ...previo, [seccion]: true }));
      setErrorOperacion(
        seccion === 'periodos'
          ? 'La gestión de periodos no disponibles no está disponible en el servidor actual.'
          : MENSAJE_NO_DISPONIBLE
      );
      return;
    }

    setErrorOperacion(error?.message || fallback);
  };

  const abrirEditorDisponibilidad = () => {
    setErrorOperacion(null);
    setMensajeExito(null);
    setErroresFilas({});
    setErrorValidacionDisponibilidad(null);
    setFilas(
      disponibilidad.length > 0
        ? disponibilidad.map((item) => crearFila(item))
        : [crearFila()]
    );
    setEditandoDisponibilidad(true);
  };

  const cancelarEditorDisponibilidad = () => {
    setEditandoDisponibilidad(false);
    setErroresFilas({});
    setErrorValidacionDisponibilidad(null);
    setFilas(
      disponibilidad.length > 0
        ? disponibilidad.map((item) => crearFila(item))
        : [crearFila()]
    );
  };

  const actualizarFila = (indice, campo, valor) => {
    setFilas((previas) =>
      previas.map((fila, posicion) =>
        posicion === indice ? { ...fila, [campo]: valor } : fila
      )
    );
    setErroresFilas((previos) => {
      if (!previos[indice]?.[campo]) return previos;
      const siguientes = { ...previos };
      const erroresFila = { ...siguientes[indice] };
      delete erroresFila[campo];
      if (Object.keys(erroresFila).length === 0) delete siguientes[indice];
      else siguientes[indice] = erroresFila;
      return siguientes;
    });
    setErrorValidacionDisponibilidad(null);
  };

  const agregarFila = () => {
    setFilas((previas) => [...previas, crearFila()]);
    setErroresFilas({});
    setErrorValidacionDisponibilidad(null);
  };

  const quitarFila = (indice) => {
    setFilas((previas) => previas.filter((_, posicion) => posicion !== indice));
    setErroresFilas({});
    setErrorValidacionDisponibilidad(null);
  };

  const validarDisponibilidad = () => {
    if (filas.length === 0) {
      setErrorValidacionDisponibilidad('Agrega al menos un horario de atención.');
      return false;
    }

    const nuevosErrores = {};
    filas.forEach((fila, indice) => {
      const erroresFila = {};
      if (!fila.dia_semana) {
        erroresFila.dia_semana = 'Selecciona un día de la semana.';
      }
      if (!fila.hora_inicio) {
        erroresFila.hora_inicio = 'La hora inicial es obligatoria.';
      }
      if (!fila.hora_fin) {
        erroresFila.hora_fin = 'La hora final es obligatoria.';
      }
      if (
        fila.hora_inicio &&
        fila.hora_fin &&
        fila.hora_inicio >= fila.hora_fin
      ) {
        erroresFila.hora_fin = 'La hora inicial debe ser anterior a la hora final.';
      }
      if (Object.keys(erroresFila).length > 0) {
        nuevosErrores[indice] = erroresFila;
      }
    });

    setErroresFilas(nuevosErrores);
    const valido = Object.keys(nuevosErrores).length === 0;
    setErrorValidacionDisponibilidad(
      valido
        ? null
        : 'Revisa los horarios señalados. La hora inicial debe ser anterior a la hora final.'
    );
    return valido;
  };

  const handleGuardarDisponibilidad = async (event) => {
    event.preventDefault();
    if (guardandoDisponibilidad) return;

    setMensajeExito(null);
    setErrorOperacion(null);
    if (!validarDisponibilidad()) return;

    const payload = filas.map((fila) => ({
      dia_semana: fila.dia_semana,
      hora_inicio: fila.hora_inicio,
      hora_fin: fila.hora_fin,
    }));

    setGuardandoDisponibilidad(true);

    try {
      const respuesta = await guardarDisponibilidadServicio(token, payload);
      if (!Array.isArray(respuesta)) {
        throw new Error('El servidor no confirmó la disponibilidad guardada.');
      }

      const lista = respuesta.map(normalizarDisponibilidad);
      setDisponibilidad(lista);
      setFilas(lista.length > 0 ? lista.map((item) => crearFila(item)) : [crearFila()]);
      setErroresFilas({});
      setErrorValidacionDisponibilidad(null);
      setEditandoDisponibilidad(false);
      setMensajeExito('Disponibilidad guardada correctamente.');
    } catch (error) {
      manejarErrorOperacion(error, 'No fue posible guardar la disponibilidad.');
    } finally {
      setGuardandoDisponibilidad(false);
    }
  };

  const actualizarFormPeriodo = (campo, valor) => {
    setFormPeriodo((previo) => ({ ...previo, [campo]: valor }));
    setErroresPeriodo((previos) => {
      if (!previos[campo]) return previos;
      const siguientes = { ...previos };
      delete siguientes[campo];
      return siguientes;
    });
    setErrorOperacion(null);
  };

  const validarPeriodo = () => {
    const errores = {};
    if (!formPeriodo.fecha_inicio) {
      errores.fecha_inicio = 'La fecha de inicio es obligatoria.';
    }
    if (!formPeriodo.fecha_fin) {
      errores.fecha_fin = 'La fecha de fin es obligatoria.';
    }
    if (
      formPeriodo.fecha_inicio &&
      formPeriodo.fecha_fin &&
      formPeriodo.fecha_inicio > formPeriodo.fecha_fin
    ) {
      errores.fecha_fin = 'La fecha de inicio no puede ser posterior a la fecha de fin.';
    }
    if (formPeriodo.motivo.trim().length > 255) {
      errores.motivo = 'El motivo no puede superar los 255 caracteres.';
    }

    setErroresPeriodo(errores);
    return Object.keys(errores).length === 0;
  };

  const handleRegistrarPeriodo = async (event) => {
    event.preventDefault();
    if (guardandoPeriodo) return;

    setMensajeExito(null);
    setErrorOperacion(null);
    if (!validarPeriodo()) return;

    const payload = {
      fecha_inicio: formPeriodo.fecha_inicio,
      fecha_fin: formPeriodo.fecha_fin,
      motivo: formPeriodo.motivo.trim() || null,
    };

    setGuardandoPeriodo(true);

    try {
      const respuesta = await registrarPeriodoNoDisponible(token, payload);
      if (!respuesta || typeof respuesta !== 'object') {
        throw new Error('El servidor no confirmó el periodo no disponible.');
      }

      const guardado = normalizarPeriodo(respuesta);
      setPeriodos((previos) =>
        ordenarPeriodos([
          ...previos.filter((periodo) => periodo.id !== guardado.id),
          guardado,
        ])
      );
      setFormPeriodo({ fecha_inicio: '', fecha_fin: '', motivo: '' });
      setErroresPeriodo({});
      setMensajeExito('Periodo no disponible registrado correctamente.');
    } catch (error) {
      manejarErrorOperacion(
        error,
        'No fue posible registrar el periodo no disponible.',
        'periodos'
      );
    } finally {
      setGuardandoPeriodo(false);
    }
  };

  const recargar = () => setRecarga((valor) => valor + 1);

  const renderAlertaSesion = errorAutenticacion ? (
    <div className="alert alert-danger" role="alert">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span>{errorAutenticacion}</span>
        {onCerrarSesion && (
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  ) : null;

  if (cargando) {
    return (
      <section aria-labelledby="disponibilidad-titulo">
        <div className="mb-4">
          <h2 id="disponibilidad-titulo" className="h4 fw-semibold text-dark mb-1">
            Gestión de disponibilidad
          </h2>
          <p className="text-muted small mb-0">
            Configura tus horarios habituales y los periodos en los que no podrás atender.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 text-muted py-4" role="status" aria-live="polite">
          <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
          <span>Cargando disponibilidad...</span>
        </div>
      </section>
    );
  }

  if (errorAutenticacion) {
    return (
      <section aria-labelledby="disponibilidad-titulo">
        <div className="mb-4">
          <h2 id="disponibilidad-titulo" className="h4 fw-semibold text-dark mb-1">
            Gestión de disponibilidad
          </h2>
          <p className="text-muted small mb-0">
            Configura tus horarios habituales y los periodos en los que no podrás atender.
          </p>
        </div>
        {renderAlertaSesion}
      </section>
    );
  }

  if (sinSoporteTotal) {
    return (
      <section aria-labelledby="disponibilidad-titulo">
        <div className="mb-4">
          <h2 id="disponibilidad-titulo" className="h4 fw-semibold text-dark mb-1">
            Gestión de disponibilidad
          </h2>
          <p className="text-muted small mb-0">
            Configura tus horarios habituales y los periodos en los que no podrás atender.
          </p>
        </div>
        <div className="alert alert-info" role="status">
          <h3 className="h6 fw-semibold">Función aún no disponible</h3>
          <p className="mb-2">{MENSAJE_NO_DISPONIBLE}</p>
          <p className="small mb-3">
            Cuando el servidor habilite la gestión de disponibilidad, podrás configurar aquí tus
            horarios habituales y tus periodos no disponibles.
          </p>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={recargar}>
            Volver a comprobar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="disponibilidad-titulo">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h2 id="disponibilidad-titulo" className="h4 fw-semibold text-dark mb-1">
            Gestión de disponibilidad
          </h2>
          <p className="text-muted small mb-0">
            Los horarios habituales indican cuándo atiendes normalmente. Los periodos no
            disponibles son excepciones en las que no podrás prestar servicios.
          </p>
        </div>
      </div>

      {mensajeExito && (
        <div className="alert alert-success alert-dismissible fade show" role="status" aria-live="polite">
          <div className="d-flex justify-content-between align-items-center gap-2">
            <span>{mensajeExito}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar mensaje"
              onClick={() => setMensajeExito(null)}
            />
          </div>
        </div>
      )}

      {errorOperacion && (
        <div className="alert alert-danger" role="alert">
          {errorOperacion}
        </div>
      )}

      <div className="d-flex flex-column gap-4">
        {/* Disponibilidad habitual */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h3 className="h5 fw-semibold text-dark mb-0">Horarios habituales</h3>
              <small className="text-muted">
                Días y rangos en los que prestas servicios; se validan al recibir solicitudes
              </small>
            </div>
            {!noDisponible.disponibilidad && !erroresSeccion.disponibilidad &&
              !editandoDisponibilidad && (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={abrirEditorDisponibilidad}
                  disabled={guardandoDisponibilidad}
                >
                  {disponibilidad.length > 0 ? 'Editar horarios' : 'Configurar horarios'}
                </button>
              )}
          </div>

          <div className="card-body">
            {noDisponible.disponibilidad ? (
              <div className="alert alert-warning mb-0" role="status">
                La gestión de horarios no está disponible en el servidor actual.
              </div>
            ) : erroresSeccion.disponibilidad ? (
              <div className="alert alert-danger mb-0" role="alert">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <span>{erroresSeccion.disponibilidad}</span>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={recargar}>
                    Reintentar
                  </button>
                </div>
              </div>
            ) : editandoDisponibilidad ? (
              <form onSubmit={handleGuardarDisponibilidad} noValidate>
                <p className="small text-muted">
                  Puedes registrar varios rangos para el mismo día. Al guardar, esta lista
                  reemplazará toda la disponibilidad anterior.
                </p>

                {errorValidacionDisponibilidad && (
                  <div className="alert alert-danger py-2" role="alert">
                    {errorValidacionDisponibilidad}
                  </div>
                )}

                {filas.map((fila, indice) => {
                  const erroresFila = erroresFilas[indice] || {};
                  return (
                    <div
                      className="border rounded p-3 mb-3 bg-light"
                      key={fila.key}
                      role="group"
                      aria-label={`Horario ${indice + 1}`}
                    >
                      <div className="row g-2 align-items-end">
                        <div className="col-12 col-md-4">
                          <label htmlFor={`dia-${fila.key}`} className="form-label small fw-semibold">
                            Día <span className="text-danger">*</span>
                          </label>
                          <select
                            id={`dia-${fila.key}`}
                            className={`form-select ${erroresFila.dia_semana ? 'is-invalid' : ''}`}
                            value={fila.dia_semana}
                            onChange={(event) =>
                              actualizarFila(indice, 'dia_semana', event.target.value)
                            }
                            disabled={guardandoDisponibilidad}
                            aria-invalid={Boolean(erroresFila.dia_semana)}
                          >
                            <option value="">Selecciona un día</option>
                            {DIAS.map((dia) => (
                              <option key={dia.value} value={dia.value}>
                                {dia.label}
                              </option>
                            ))}
                          </select>
                          {erroresFila.dia_semana && (
                            <div className="invalid-feedback d-block">{erroresFila.dia_semana}</div>
                          )}
                        </div>

                        <div className="col-6 col-md-3">
                          <label
                            htmlFor={`inicio-${fila.key}`}
                            className="form-label small fw-semibold"
                          >
                            Hora inicial <span className="text-danger">*</span>
                          </label>
                          <input
                            id={`inicio-${fila.key}`}
                            type="time"
                            className={`form-control ${
                              erroresFila.hora_inicio ? 'is-invalid' : ''
                            }`}
                            value={fila.hora_inicio}
                            onChange={(event) =>
                              actualizarFila(indice, 'hora_inicio', event.target.value)
                            }
                            disabled={guardandoDisponibilidad}
                            aria-invalid={Boolean(erroresFila.hora_inicio)}
                            required
                          />
                          {erroresFila.hora_inicio && (
                            <div className="invalid-feedback d-block">
                              {erroresFila.hora_inicio}
                            </div>
                          )}
                        </div>

                        <div className="col-6 col-md-3">
                          <label
                            htmlFor={`fin-${fila.key}`}
                            className="form-label small fw-semibold"
                          >
                            Hora final <span className="text-danger">*</span>
                          </label>
                          <input
                            id={`fin-${fila.key}`}
                            type="time"
                            className={`form-control ${erroresFila.hora_fin ? 'is-invalid' : ''}`}
                            value={fila.hora_fin}
                            onChange={(event) =>
                              actualizarFila(indice, 'hora_fin', event.target.value)
                            }
                            disabled={guardandoDisponibilidad}
                            aria-invalid={Boolean(erroresFila.hora_fin)}
                            required
                          />
                          {erroresFila.hora_fin && (
                            <div className="invalid-feedback d-block">{erroresFila.hora_fin}</div>
                          )}
                        </div>

                        <div className="col-12 col-md-2 d-grid">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => quitarFila(indice)}
                            disabled={filas.length === 1 || guardandoDisponibilidad}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={agregarFila}
                    disabled={guardandoDisponibilidad}
                  >
                    + Agregar otro horario
                  </button>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cancelarEditorDisponibilidad}
                      disabled={guardandoDisponibilidad}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={guardandoDisponibilidad}
                    >
                      {guardandoDisponibilidad ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          Guardando...
                        </>
                      ) : (
                        'Guardar disponibilidad'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : disponibilidad.length === 0 ? (
              <div className="text-center py-4 px-3 border rounded bg-light" role="status">
                <p className="text-muted mb-2">
                  Aún no has configurado tus horarios habituales de atención.
                </p>
                <p className="small text-muted mb-0">
                  Configura al menos un día y un rango de horas para informar cuándo puedes
                  prestar servicios.
                </p>
              </div>
            ) : (
              <ul className="list-group list-group-flush">
                {rangosPorDia.map((dia) => (
                  <li
                    className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-1 px-0"
                    key={dia.value}
                  >
                    <span className="fw-semibold text-dark">{dia.label}</span>
                    {dia.rangos.length > 0 ? (
                      <span className="text-secondary text-sm-end">
                        {dia.rangos
                          .map((rango) => `${rango.hora_inicio} – ${rango.hora_fin}`)
                          .join(' / ')}
                      </span>
                    ) : (
                      <span className="text-muted fst-italic">No configurado</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Periodos no disponibles */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3">
            <h3 className="h5 fw-semibold text-dark mb-0">Periodos no disponibles</h3>
            <small className="text-muted">
              Fechas o rangos en los que no podrás atender; se consideran al validar nuevas
              solicitudes
            </small>
          </div>
          <div className="card-body">
            {noDisponible.periodos ? (
              <div className="alert alert-warning mb-0" role="status">
                La gestión de periodos no disponibles no está disponible en el servidor actual.
              </div>
            ) : erroresSeccion.periodos ? (
              <div className="alert alert-danger mb-0" role="alert">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <span>{erroresSeccion.periodos}</span>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={recargar}>
                    Reintentar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {periodosOrdenados.length === 0 ? (
                  <div className="alert alert-info" role="status">
                    No tienes periodos no disponibles registrados.
                  </div>
                ) : (
                  <ul className="list-group list-group-flush mb-4">
                    {periodosOrdenados.map((periodo) => (
                      <li
                        className="list-group-item px-0 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-1"
                        key={periodo.id ?? `${periodo.fecha_inicio}-${periodo.fecha_fin}`}
                      >
                        <div>
                          <div className="fw-semibold text-dark">
                            {formatearRangoFechas(periodo.fecha_inicio, periodo.fecha_fin)}
                          </div>
                          {periodo.motivo && (
                            <div className="small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                              {periodo.motivo}
                            </div>
                          )}
                        </div>
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle align-self-start align-self-sm-center">
                          No disponible
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={handleRegistrarPeriodo} noValidate>
                  <h4 className="h6 fw-semibold text-dark mb-3">Registrar periodo no disponible</h4>
                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <label htmlFor="periodo-inicio" className="form-label small fw-semibold">
                        Fecha inicial <span className="text-danger">*</span>
                      </label>
                      <input
                        id="periodo-inicio"
                        type="date"
                        className={`form-control ${
                          erroresPeriodo.fecha_inicio ? 'is-invalid' : ''
                        }`}
                        value={formPeriodo.fecha_inicio}
                        onChange={(event) =>
                          actualizarFormPeriodo('fecha_inicio', event.target.value)
                        }
                        disabled={guardandoPeriodo}
                        aria-invalid={Boolean(erroresPeriodo.fecha_inicio)}
                        required
                      />
                      {erroresPeriodo.fecha_inicio && (
                        <div className="invalid-feedback d-block">
                          {erroresPeriodo.fecha_inicio}
                        </div>
                      )}
                    </div>

                    <div className="col-12 col-md-4">
                      <label htmlFor="periodo-fin" className="form-label small fw-semibold">
                        Fecha final <span className="text-danger">*</span>
                      </label>
                      <input
                        id="periodo-fin"
                        type="date"
                        className={`form-control ${erroresPeriodo.fecha_fin ? 'is-invalid' : ''}`}
                        value={formPeriodo.fecha_fin}
                        onChange={(event) =>
                          actualizarFormPeriodo('fecha_fin', event.target.value)
                        }
                        disabled={guardandoPeriodo}
                        aria-invalid={Boolean(erroresPeriodo.fecha_fin)}
                        required
                      />
                      {erroresPeriodo.fecha_fin && (
                        <div className="invalid-feedback d-block">{erroresPeriodo.fecha_fin}</div>
                      )}
                    </div>

                    <div className="col-12 col-md-4">
                      <label htmlFor="periodo-motivo" className="form-label small fw-semibold">
                        Motivo (Opcional)
                      </label>
                      <input
                        id="periodo-motivo"
                        type="text"
                        className={`form-control ${erroresPeriodo.motivo ? 'is-invalid' : ''}`}
                        value={formPeriodo.motivo}
                        onChange={(event) => actualizarFormPeriodo('motivo', event.target.value)}
                        maxLength={255}
                        placeholder="Ej: Viaje, descanso, compromiso personal..."
                        disabled={guardandoPeriodo}
                        aria-invalid={Boolean(erroresPeriodo.motivo)}
                      />
                      {erroresPeriodo.motivo && (
                        <div className="invalid-feedback d-block">{erroresPeriodo.motivo}</div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 pt-3 border-top">
                    <small className="text-muted">
                      Para un solo día, usa la misma fecha en ambos campos.
                    </small>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={guardandoPeriodo}
                    >
                      {guardandoPeriodo ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          Guardando...
                        </>
                      ) : (
                        'Registrar periodo'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
