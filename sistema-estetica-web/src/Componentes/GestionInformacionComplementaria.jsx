import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  obtenerMisServicios,
  listarMultimedia,
  agregarMultimedia,
  actualizarMultimedia,
  eliminarMultimedia,
  listarInsumos,
  agregarInsumo,
  actualizarInsumo,
  eliminarInsumo,
} from '../Servicios/servicioService';

/**
 * GestionInformacionComplementaria (HU-008)
 *
 * Permite al Proveedor autenticado asociar a cada servicio de su catálogo:
 *   - CA-01: fotografías de referencia.
 *   - CA-02: videos de referencia.
 *   - CA-03: productos, insumos o equipos utilizados en la prestación.
 *
 * El backend valida la propiedad del servicio antes de cada operación, por lo
 * que un proveedor no puede modificar el catálogo de otro (CA-04), y exige
 * autenticación (CA-05).
 *
 * Props:
 *   - token {string}                 JWT del proveedor autenticado.
 *   - servicioInicial {number|object} Servicio preseleccionado (opcional).
 *   - onSesionExpirada {Function}    Callback para 401 / sesión vencida.
 *   - onCerrarSesion {Function}      Callback para cerrar sesión.
 */

const TIPOS_MULTIMEDIA = [
  { valor: 'foto', etiqueta: 'Fotografía' },
  { valor: 'video', etiqueta: 'Video' },
];

const TIPOS_INSUMO = [
  { valor: 'producto', etiqueta: 'Producto' },
  { valor: 'insumo', etiqueta: 'Insumo' },
  { valor: 'equipo', etiqueta: 'Equipo' },
];

const FORM_MULTIMEDIA_INICIAL = {
  tipo_archivo: 'foto',
  url_archivo: '',
  orden: '',
};

const FORM_INSUMO_INICIAL = {
  nombre: '',
  tipo: 'producto',
};

const etiquetaTipo = (tipo) =>
  [...TIPOS_MULTIMEDIA, ...TIPOS_INSUMO].find((t) => t.valor === tipo)?.etiqueta || tipo;

const ordenarMultimedia = (lista) =>
  [...lista].sort((a, b) => {
    const ordenA = Number(a.orden) || 0;
    const ordenB = Number(b.orden) || 0;
    if (ordenA !== ordenB) return ordenA - ordenB;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

export const GestionInformacionComplementaria = ({
  token,
  servicioInicial,
  onSesionExpirada,
  onCerrarSesion,
}) => {
  // Callback en ref para no recrear los efectos cuando el padre usa funciones inline
  const onSesionExpiradaRef = useRef(onSesionExpirada);
  useEffect(() => {
    onSesionExpiradaRef.current = onSesionExpirada;
  }, [onSesionExpirada]);

  const [servicios, setServicios] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [idServicio, setIdServicio] = useState('');

  const [multimedia, setMultimedia] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [cargandoContenido, setCargandoContenido] = useState(false);

  const [formMultimedia, setFormMultimedia] = useState(FORM_MULTIMEDIA_INICIAL);
  const [erroresMultimedia, setErroresMultimedia] = useState({});
  const [editandoMultimedia, setEditandoMultimedia] = useState(null);

  const [formInsumo, setFormInsumo] = useState(FORM_INSUMO_INICIAL);
  const [erroresInsumo, setErroresInsumo] = useState({});
  const [editandoInsumo, setEditandoInsumo] = useState(null);

  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [errorGeneral, setErrorGeneral] = useState(null);

  const idServicioInicial =
    servicioInicial && typeof servicioInicial === 'object'
      ? servicioInicial.id
      : servicioInicial;

  const mostrarError = useCallback((err, mensaje403) => {
    if (err?.esErrorAutenticacion) {
      if (err.status === 401) {
        if (onSesionExpiradaRef.current) {
          onSesionExpiradaRef.current(
            err.message ||
              'Tu sesión ha expirado. Inicia sesión nuevamente para gestionar la información complementaria.'
          );
        }
        return;
      }
      if (err.status === 403) {
        setErrorGeneral(
          mensaje403 ||
            'Acceso denegado: el servicio no pertenece a tu catálogo o no tienes permisos para gestionarlo.'
        );
        return;
      }
    }

    setErrorGeneral(
      err?.message ||
        'No fue posible completar la operación con la información complementaria del servicio.'
    );
  }, []);

  // ─── Carga del catálogo propio ─────────────────────────────────────────────
  const cargarServicios = useCallback(async () => {
    if (!token) {
      setErrorGeneral('No se encontró una sesión activa válida.');
      setCargandoServicios(false);
      return;
    }

    setCargandoServicios(true);
    try {
      const data = await obtenerMisServicios(token);
      const lista = Array.isArray(data) ? data : [];
      setServicios(lista);
      if (lista.length === 0) {
        setIdServicio('');
      }
    } catch (err) {
      mostrarError(
        err,
        'Acceso denegado: no tienes permiso para consultar el catálogo de servicios.'
      );
    } finally {
      setCargandoServicios(false);
    }
  }, [token, mostrarError]);

  useEffect(() => {
    cargarServicios();
  }, [cargarServicios]);

  // Preselección cuando el proveedor llega desde "Mi catálogo"
  useEffect(() => {
    if (idServicioInicial) {
      setIdServicio(String(idServicioInicial));
    }
  }, [idServicioInicial]);

  // ─── Carga de la información complementaria del servicio seleccionado ─────
  const cargarContenido = useCallback(async () => {
    if (!token || !idServicio) {
      setMultimedia([]);
      setInsumos([]);
      return;
    }

    setCargandoContenido(true);
    setErrorGeneral(null);
    try {
      const [datosMultimedia, datosInsumos] = await Promise.all([
        listarMultimedia(token, idServicio),
        listarInsumos(token, idServicio),
      ]);
      setMultimedia(ordenarMultimedia(Array.isArray(datosMultimedia) ? datosMultimedia : []));
      setInsumos(Array.isArray(datosInsumos) ? datosInsumos : []);
    } catch (err) {
      setMultimedia([]);
      setInsumos([]);
      mostrarError(
        err,
        'Acceso denegado: este servicio no pertenece a tu catálogo, por lo que no puedes consultar su información complementaria.'
      );
    } finally {
      setCargandoContenido(false);
    }
  }, [token, idServicio, mostrarError]);

  useEffect(() => {
    if (idServicio) {
      cargarContenido();
    } else {
      setMultimedia([]);
      setInsumos([]);
    }
  }, [idServicio, cargarContenido]);

  const servicioSeleccionado = servicios.find(
    (s) => String(s.id) === String(idServicio)
  );

  // ─── Cambio de servicio ────────────────────────────────────────────────────
  const reiniciarFormularios = () => {
    setFormMultimedia(FORM_MULTIMEDIA_INICIAL);
    setErroresMultimedia({});
    setEditandoMultimedia(null);
    setFormInsumo(FORM_INSUMO_INICIAL);
    setErroresInsumo({});
    setEditandoInsumo(null);
  };

  const handleSeleccionServicio = (e) => {
    setIdServicio(e.target.value);
    setMensajeExito(null);
    setErrorGeneral(null);
    reiniciarFormularios();
  };

  // ─── Formulario de multimedia ─────────────────────────────────────────────
  const handleChangeMultimedia = (e) => {
    const { name, value } = e.target;
    setFormMultimedia((prev) => ({ ...prev, [name]: value }));
    if (erroresMultimedia[name]) {
      setErroresMultimedia((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validarMultimedia = () => {
    const nuevosErrores = {};
    const url = (formMultimedia.url_archivo || '').trim();

    if (!url) {
      nuevosErrores.url_archivo = 'La URL de la fotografía o video es obligatoria';
    } else if (url.length > 500) {
      nuevosErrores.url_archivo = 'La URL no puede superar los 500 caracteres';
    } else if (!/^https?:\/\/\S+$/i.test(url)) {
      nuevosErrores.url_archivo =
        'La URL debe iniciar con http:// o https:// y no contener espacios';
    }

    if (!['foto', 'video'].includes(formMultimedia.tipo_archivo)) {
      nuevosErrores.tipo_archivo = 'Selecciona Fotografía o Video';
    }

    if (String(formMultimedia.orden).trim() !== '') {
      const ordenNum = Number(formMultimedia.orden);
      if (!Number.isInteger(ordenNum) || ordenNum < 0 || ordenNum > 65535) {
        nuevosErrores.orden = 'El orden debe ser un entero entre 0 y 65535';
      }
    }

    setErroresMultimedia(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const guardarMultimedia = async (e) => {
    e.preventDefault();
    if (!idServicio) {
      setErrorGeneral('Selecciona el servicio al que deseas asociar la fotografía o video.');
      return;
    }
    if (!validarMultimedia()) {
      setErrorGeneral('Por favor, revisa los datos de la fotografía o video.');
      return;
    }

    setGuardando(true);
    setErrorGeneral(null);
    setMensajeExito(null);

    const payload = {
      tipo_archivo: formMultimedia.tipo_archivo,
      url_archivo: formMultimedia.url_archivo.trim(),
      orden: String(formMultimedia.orden).trim() === ''
        ? null
        : Number(formMultimedia.orden),
    };

    try {
      if (editandoMultimedia) {
        const actualizado = await actualizarMultimedia(
          token,
          idServicio,
          editandoMultimedia.id,
          payload
        );
        setMultimedia((prev) =>
          ordenarMultimedia(
            prev.map((item) => (item.id === actualizado.id ? actualizado : item))
          )
        );
        setMensajeExito(
          `✓ ${etiquetaTipo(actualizado.tipo_archivo)} actualizada correctamente.`
        );
      } else {
        const creado = await agregarMultimedia(token, idServicio, payload);
        setMultimedia((prev) => ordenarMultimedia([...prev, creado]));
        setMensajeExito(`✓ ${etiquetaTipo(creado.tipo_archivo)} asociada al servicio.`);
      }

      setFormMultimedia(FORM_MULTIMEDIA_INICIAL);
      setErroresMultimedia({});
      setEditandoMultimedia(null);
    } catch (err) {
      if (err?.fieldErrors) {
        setErroresMultimedia(err.fieldErrors);
        setErrorGeneral('Por favor, revisa los datos de la fotografía o video.');
      } else {
        mostrarError(
          err,
          'Acceso denegado: no puedes asociar multimedia a un servicio que no pertenece a tu catálogo.'
        );
      }
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicionMultimedia = (item) => {
    setEditandoMultimedia(item);
    setFormMultimedia({
      tipo_archivo: item.tipo_archivo,
      url_archivo: item.url_archivo || '',
      orden: item.orden ?? '',
    });
    setErroresMultimedia({});
    setMensajeExito(null);
    setErrorGeneral(null);
    document.getElementById('hu008-multimedia-form')?.scrollIntoView?.({ behavior: 'smooth' });
  };

  const cancelarEdicionMultimedia = () => {
    setEditandoMultimedia(null);
    setFormMultimedia(FORM_MULTIMEDIA_INICIAL);
    setErroresMultimedia({});
  };

  const handleEliminarMultimedia = async (item) => {
    if (!window.confirm(`¿Eliminar esta ${etiquetaTipo(item.tipo_archivo).toLowerCase()} del servicio?`)) {
      return;
    }

    setGuardando(true);
    setErrorGeneral(null);
    setMensajeExito(null);
    try {
      await eliminarMultimedia(token, idServicio, item.id);
      setMultimedia((prev) => prev.filter((elemento) => elemento.id !== item.id));
      setMensajeExito('✓ La multimedia fue eliminada del servicio.');
      if (editandoMultimedia?.id === item.id) {
        cancelarEdicionMultimedia();
      }
    } catch (err) {
      mostrarError(
        err,
        'Acceso denegado: no puedes eliminar multimedia de un servicio que no pertenece a tu catálogo.'
      );
    } finally {
      setGuardando(false);
    }
  };

  // ─── Formulario de productos, insumos o equipos ────────────────────────────
  const handleChangeInsumo = (e) => {
    const { name, value } = e.target;
    setFormInsumo((prev) => ({ ...prev, [name]: value }));
    if (erroresInsumo[name]) {
      setErroresInsumo((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validarInsumo = () => {
    const nuevosErrores = {};
    const nombre = (formInsumo.nombre || '').trim();

    if (!nombre) {
      nuevosErrores.nombre = 'El nombre del producto, insumo o equipo es obligatorio';
    } else if (nombre.length > 150) {
      nuevosErrores.nombre = 'El nombre no puede superar los 150 caracteres';
    }

    if (!['producto', 'insumo', 'equipo'].includes(formInsumo.tipo)) {
      nuevosErrores.tipo = 'Selecciona Producto, Insumo o Equipo';
    }

    setErroresInsumo(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const guardarInsumo = async (e) => {
    e.preventDefault();
    if (!idServicio) {
      setErrorGeneral('Selecciona el servicio al que deseas asociar el elemento.');
      return;
    }
    if (!validarInsumo()) {
      setErrorGeneral('Por favor, revisa los datos del producto, insumo o equipo.');
      return;
    }

    setGuardando(true);
    setErrorGeneral(null);
    setMensajeExito(null);

    const payload = {
      nombre: formInsumo.nombre.trim(),
      tipo: formInsumo.tipo,
    };

    try {
      if (editandoInsumo) {
        const actualizado = await actualizarInsumo(
          token,
          idServicio,
          editandoInsumo.id,
          payload
        );
        setInsumos((prev) =>
          prev.map((item) => (item.id === actualizado.id ? actualizado : item))
        );
        setMensajeExito('✓ El producto, insumo o equipo fue actualizado correctamente.');
      } else {
        const creado = await agregarInsumo(token, idServicio, payload);
        setInsumos((prev) => [...prev, creado]);
        setMensajeExito('✓ Producto, insumo o equipo asociado al servicio.');
      }

      setFormInsumo(FORM_INSUMO_INICIAL);
      setErroresInsumo({});
      setEditandoInsumo(null);
    } catch (err) {
      if (err?.fieldErrors) {
        setErroresInsumo(err.fieldErrors);
        setErrorGeneral('Por favor, revisa los datos del producto, insumo o equipo.');
      } else {
        mostrarError(
          err,
          'Acceso denegado: no puedes asociar productos, insumos o equipos a un servicio que no pertenece a tu catálogo.'
        );
      }
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicionInsumo = (item) => {
    setEditandoInsumo(item);
    setFormInsumo({ nombre: item.nombre || '', tipo: item.tipo || 'producto' });
    setErroresInsumo({});
    setMensajeExito(null);
    setErrorGeneral(null);
    document.getElementById('hu008-insumo-form')?.scrollIntoView?.({ behavior: 'smooth' });
  };

  const cancelarEdicionInsumo = () => {
    setEditandoInsumo(null);
    setFormInsumo(FORM_INSUMO_INICIAL);
    setErroresInsumo({});
  };

  const handleEliminarInsumo = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}" de este servicio?`)) {
      return;
    }

    setGuardando(true);
    setErrorGeneral(null);
    setMensajeExito(null);
    try {
      await eliminarInsumo(token, idServicio, item.id);
      setInsumos((prev) => prev.filter((elemento) => elemento.id !== item.id));
      setMensajeExito('✓ El producto, insumo o equipo fue eliminado del servicio.');
      if (editandoInsumo?.id === item.id) {
        cancelarEdicionInsumo();
      }
    } catch (err) {
      mostrarError(
        err,
        'Acceso denegado: no puedes eliminar productos, insumos o equipos de un servicio que no pertenece a tu catálogo.'
      );
    } finally {
      setGuardando(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="d-flex flex-column gap-4">
      {/* Selección del servicio */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 border-bottom">
          <h3 className="h5 mb-0 fw-semibold text-dark">
            Información complementaria del servicio
          </h3>
          <small className="text-muted">
            Asocia fotografías, videos, productos, insumos o equipos para dar a los clientes una
            referencia más completa de tu servicio.
          </small>
        </div>

        <div className="card-body">
          {cargandoServicios ? (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
              <span className="ms-2 text-muted small">Cargando tu catálogo...</span>
            </div>
          ) : servicios.length === 0 ? (
            <div className="alert alert-info mb-0" role="status">
              Aún no tienes servicios registrados. Crea un servicio en la pestaña
              &quot;Registrar Servicio&quot; para poder asociarle información complementaria.
            </div>
          ) : (
            <div className="row g-3 align-items-end">
              <div className="col-12 col-lg-8">
                <label htmlFor="hu008-servicio" className="form-label small fw-semibold">
                  Servicio de tu catálogo <span className="text-danger">*</span>
                </label>
                <select
                  id="hu008-servicio"
                  className="form-select"
                  value={idServicio}
                  onChange={handleSeleccionServicio}
                  disabled={guardando}
                >
                  <option value="">-- Selecciona un servicio --</option>
                  {servicios.map((servicio) => (
                    <option key={servicio.id} value={servicio.id}>
                      #{servicio.id} · {servicio.nombre} ({servicio.estado})
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  Solo puedes gestionar la información de los servicios de tu propio catálogo.
                </small>
              </div>
              <div className="col-12 col-lg-4">
                <button
                  type="button"
                  className="btn btn-outline-primary w-100"
                  onClick={cargarContenido}
                  disabled={!idServicio || cargandoContenido}
                >
                  {cargandoContenido ? 'Actualizando...' : 'Actualizar información'}
                </button>
              </div>
            </div>
          )}

          {errorGeneral && (
            <div className="alert alert-danger mt-3 mb-0" role="alert" aria-live="assertive">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <span>{errorGeneral}</span>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Cerrar"
                  onClick={() => setErrorGeneral(null)}
                />
              </div>
              {errorGeneral.toLowerCase().includes('sesión') && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger mt-2"
                  onClick={onCerrarSesion}
                >
                  Cerrar sesión
                </button>
              )}
            </div>
          )}

          {mensajeExito && (
            <div className="alert alert-success mt-3 mb-0" role="status" aria-live="polite">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <span>{mensajeExito}</span>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Cerrar"
                  onClick={() => setMensajeExito(null)}
                />
              </div>
            </div>
          )}

          {servicioSeleccionado && (
            <div className="alert alert-light border mt-3 mb-0 small" role="status">
              <strong>Servicio seleccionado:</strong> {servicioSeleccionado.nombre} ·{' '}
              {servicioSeleccionado.categoria} · {servicioSeleccionado.duracion_minutos} min
            </div>
          )}
        </div>
      </div>

      {!idServicio ? (
        <div className="alert alert-secondary mb-0" role="status">
          Selecciona un servicio para consultar y gestionar sus fotografías, videos, productos,
          insumos o equipos.
        </div>
      ) : (
        <>
          {/* CA-01 y CA-02: fotografías y videos */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom">
              <div>
                <h4 className="h6 mb-0 fw-semibold text-dark">
                  Fotografías y videos{' '}
                  <span className="badge bg-secondary ms-1">{multimedia.length}</span>
                </h4>
                <small className="text-muted">
                  Agrega una o más referencias visuales del servicio (URL de la imagen o video).
                </small>
              </div>
              {cargandoContenido && (
                <span className="text-muted small">
                  <span className="spinner-border spinner-border-sm me-1" role="status" />
                  Cargando...
                </span>
              )}
            </div>

            <div className="card-body">
              <form
                id="hu008-multimedia-form"
                aria-label="Asociar fotografía o video"
                onSubmit={guardarMultimedia}
                noValidate
              >
                <div className="row g-2 align-items-start">
                  <div className="col-12 col-sm-3">
                    <label htmlFor="hu008-multimedia-tipo" className="form-label small fw-semibold">
                      Tipo <span className="text-danger">*</span>
                    </label>
                    <select
                      id="hu008-multimedia-tipo"
                      name="tipo_archivo"
                      className={`form-select ${erroresMultimedia.tipo_archivo ? 'is-invalid' : ''}`}
                      value={formMultimedia.tipo_archivo}
                      onChange={handleChangeMultimedia}
                      disabled={guardando}
                    >
                      {TIPOS_MULTIMEDIA.map((tipo) => (
                        <option key={tipo.valor} value={tipo.valor}>
                          {tipo.etiqueta}
                        </option>
                      ))}
                    </select>
                    {erroresMultimedia.tipo_archivo && (
                      <div className="invalid-feedback d-block">
                        {erroresMultimedia.tipo_archivo}
                      </div>
                    )}
                  </div>

                  <div className="col-12 col-sm-5">
                    <label htmlFor="hu008-multimedia-url" className="form-label small fw-semibold">
                      URL de la fotografía o video <span className="text-danger">*</span>
                    </label>
                    <input
                      type="url"
                      id="hu008-multimedia-url"
                      name="url_archivo"
                      className={`form-control ${erroresMultimedia.url_archivo ? 'is-invalid' : ''}`}
                      value={formMultimedia.url_archivo}
                      onChange={handleChangeMultimedia}
                      maxLength={500}
                      placeholder="https://cdn.ejemplo.com/servicio/foto.jpg"
                      disabled={guardando}
                    />
                    {erroresMultimedia.url_archivo ? (
                      <div className="invalid-feedback d-block">
                        {erroresMultimedia.url_archivo}
                      </div>
                    ) : (
                      <small className="text-muted">Debe iniciar con http:// o https://</small>
                    )}
                  </div>

                  <div className="col-6 col-sm-2">
                    <label htmlFor="hu008-multimedia-orden" className="form-label small fw-semibold">
                      Orden
                    </label>
                    <input
                      type="number"
                      id="hu008-multimedia-orden"
                      name="orden"
                      className={`form-control ${erroresMultimedia.orden ? 'is-invalid' : ''}`}
                      value={formMultimedia.orden}
                      onChange={handleChangeMultimedia}
                      min={0}
                      max={65535}
                      step={1}
                      placeholder="Auto"
                      disabled={guardando}
                    />
                    {erroresMultimedia.orden && (
                      <div className="invalid-feedback d-block">{erroresMultimedia.orden}</div>
                    )}
                  </div>

                  <div className="col-6 col-sm-2 d-flex align-items-end gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={guardando}
                    >
                      {guardando ? 'Guardando...' : editandoMultimedia ? 'Guardar' : 'Agregar'}
                    </button>
                  </div>
                </div>

                {editandoMultimedia && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cancelarEdicionMultimedia}
                      disabled={guardando}
                    >
                      Cancelar edición
                    </button>
                  </div>
                )}
              </form>

              <hr />

              {multimedia.length === 0 ? (
                <p className="text-muted small mb-0">
                  Este servicio aún no tiene fotografías ni videos asociados.
                </p>
              ) : (
                <div className="row g-2">
                  {multimedia.map((item) => (
                    <div className="col-12 col-md-6" key={item.id}>
                      <div
                        className="border rounded p-2 h-100 d-flex gap-2"
                        role="group"
                        aria-label={`${etiquetaTipo(item.tipo_archivo)} de referencia ${item.id}`}
                      >
                        {item.tipo_archivo === 'foto' ? (
                          <img
                            src={item.url_archivo}
                            alt={`Fotografía de referencia ${item.orden ?? ''}`}
                            loading="lazy"
                            className="rounded border"
                            style={{ width: '92px', height: '92px', objectFit: 'cover', flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            className="rounded border bg-dark text-white d-flex align-items-center justify-content-center"
                            style={{ width: '92px', height: '92px', flexShrink: 0 }}
                            aria-hidden="true"
                          >
                            <span style={{ fontSize: '1.8rem' }}>▶</span>
                          </div>
                        )}

                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex justify-content-between align-items-center gap-1">
                            <span
                              className={`badge ${
                                item.tipo_archivo === 'foto' ? 'bg-primary' : 'bg-dark'
                              }`}
                            >
                              {etiquetaTipo(item.tipo_archivo)}
                            </span>
                            <small className="text-muted">Orden {item.orden}</small>
                          </div>
                          <div
                            className="small text-truncate mt-1"
                            title={item.url_archivo}
                          >
                            {item.url_archivo}
                          </div>
                          <div className="d-flex flex-wrap gap-1 mt-2">
                            <a
                              href={item.url_archivo}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline-secondary btn-sm"
                            >
                              Abrir
                            </a>
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => iniciarEdicionMultimedia(item)}
                              disabled={guardando}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleEliminarMultimedia(item)}
                              disabled={guardando}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CA-03: productos, insumos o equipos */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3 border-bottom">
              <h4 className="h6 mb-0 fw-semibold text-dark">
                Productos, insumos o equipos{' '}
                <span className="badge bg-secondary ms-1">{insumos.length}</span>
              </h4>
              <small className="text-muted">
                Registra los elementos empleados en la prestación del servicio para que los
                clientes conozcan con qué trabajas.
              </small>
            </div>

            <div className="card-body">
              <form
                id="hu008-insumo-form"
                aria-label="Registrar producto, insumo o equipo"
                onSubmit={guardarInsumo}
                noValidate
              >
                <div className="row g-2 align-items-start">
                  <div className="col-12 col-sm-6">
                    <label htmlFor="hu008-insumo-nombre" className="form-label small fw-semibold">
                      Nombre <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="hu008-insumo-nombre"
                      name="nombre"
                      className={`form-control ${erroresInsumo.nombre ? 'is-invalid' : ''}`}
                      value={formInsumo.nombre}
                      onChange={handleChangeInsumo}
                      maxLength={150}
                      placeholder="Ej: Aceite esencial de lavanda"
                      disabled={guardando}
                    />
                    {erroresInsumo.nombre ? (
                      <div className="invalid-feedback d-block">{erroresInsumo.nombre}</div>
                    ) : (
                      <small className="text-muted">Máximo 150 caracteres</small>
                    )}
                  </div>

                  <div className="col-12 col-sm-3">
                    <label htmlFor="hu008-insumo-tipo" className="form-label small fw-semibold">
                      Tipo <span className="text-danger">*</span>
                    </label>
                    <select
                      id="hu008-insumo-tipo"
                      name="tipo"
                      className={`form-select ${erroresInsumo.tipo ? 'is-invalid' : ''}`}
                      value={formInsumo.tipo}
                      onChange={handleChangeInsumo}
                      disabled={guardando}
                    >
                      {TIPOS_INSUMO.map((tipo) => (
                        <option key={tipo.valor} value={tipo.valor}>
                          {tipo.etiqueta}
                        </option>
                      ))}
                    </select>
                    {erroresInsumo.tipo && (
                      <div className="invalid-feedback d-block">{erroresInsumo.tipo}</div>
                    )}
                  </div>

                  <div className="col-12 col-sm-3 d-flex align-items-end gap-2">
                    <button type="submit" className="btn btn-primary w-100" disabled={guardando}>
                      {guardando ? 'Guardando...' : editandoInsumo ? 'Guardar' : 'Agregar'}
                    </button>
                  </div>
                </div>

                {editandoInsumo && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cancelarEdicionInsumo}
                      disabled={guardando}
                    >
                      Cancelar edición
                    </button>
                  </div>
                )}
              </form>

              <hr />

              {insumos.length === 0 ? (
                <p className="text-muted small mb-0">
                  Este servicio aún no tiene productos, insumos ni equipos registrados.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insumos.map((item) => (
                        <tr key={item.id}>
                          <td className="fw-semibold text-dark">{item.nombre}</td>
                          <td>
                            <span className="badge bg-info text-dark">
                              {etiquetaTipo(item.tipo)}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm" role="group">
                              <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => iniciarEdicionInsumo(item)}
                                disabled={guardando}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => handleEliminarInsumo(item)}
                                disabled={guardando}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GestionInformacionComplementaria;
