import React, { useState, useEffect, useCallback } from 'react';
import {
  registrarServicio,
  obtenerCategorias,
  obtenerMisServicios,
  consultarServicio,
  actualizarServicio,
  cambiarEstadoServicio,
} from '../Servicios/servicioService';
import { CATEGORIAS_PMV } from '../config/categorias';

/**
 * RegistrarServicio (Gestión integral del Catálogo de Servicios - HU-006 y HU-007)
 *
 * Permite al proveedor autenticado:
 *   - HU-006: Registrar nuevos servicios en su catálogo.
 *   - HU-007 CA-01: Consultar la información registrada de sus servicios.
 *   - HU-007 CA-02: Actualizar información de sus servicios propios.
 *   - HU-007 CA-03: Desactivar un servicio (cambio a 'inactivo').
 *   - HU-007 CA-04: Activar un servicio (cambio a 'activo').
 *   - HU-007 CA-05 y CA-06: Manejo de restricciones de propiedad y autenticación.
 *
 * Props:
 *   - token {string}       JWT del proveedor autenticado
 *   - onSesionExpirada {Function}  Callback para manejar sesión vencida / 401
 *   - onCerrarSesion {Function}    Callback para cerrar sesión
 *   - onGestionarInformacionComplementaria {Function}  Abre la gestión de la HU-008
 *                                                      para el servicio seleccionado
 */
export const RegistrarServicio = ({
  token,
  onSesionExpirada,
  onCerrarSesion,
  onGestionarInformacionComplementaria,
}) => {
  const estadoInicial = {
    id_categoria: '',
    nombre: '',
    descripcion: '',
    duracion_minutos: '',
    precio: '',
    estado: 'activo',
  };

  const [form, setForm] = useState(estadoInicial);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [servicioRegistrado, setServicioRegistrado] = useState(null);

  // Modo edición (HU-007)
  const [servicioEditando, setServicioEditando] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [procesandoEstadoId, setProcesandoEstadoId] = useState(null);

  // Categorías (dinámicas desde backend con fallback a CATEGORIAS_PMV)
  const [categorias, setCategorias] = useState(CATEGORIAS_PMV);

  // Catálogo propio del proveedor
  const [misServicios, setMisServicios] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);

  // ─── Carga inicial de datos ────────────────────────────────────────────────
  const cargarCategoriasServidor = useCallback(async () => {
    try {
      const data = await obtenerCategorias();
      if (Array.isArray(data) && data.length > 0) {
        setCategorias(
          data.map((c) => ({
            id: c.id_categoria,
            nombre: c.nombre,
          }))
        );
      }
    } catch {
      // Fallback a las categorías verificadas del PMV
      setCategorias(CATEGORIAS_PMV);
    }
  }, []);

  const cargarMisServicios = useCallback(async () => {
    if (!token) return;
    setCargandoCatalogo(true);
    try {
      const data = await obtenerMisServicios(token);
      if (Array.isArray(data)) {
        setMisServicios(data);
      }
    } catch (err) {
      if (err.esErrorAutenticacion && onSesionExpirada) {
        onSesionExpirada(err.message);
      }
    } finally {
      setCargandoCatalogo(false);
    }
  }, [token, onSesionExpirada]);

  useEffect(() => {
    cargarCategoriasServidor();
    cargarMisServicios();
  }, [cargarCategoriasServidor, cargarMisServicios]);

  // ─── Utilidades del formulario ─────────────────────────────────────────────

  const limpiarFormulario = () => {
    setForm(estadoInicial);
    setErrores({});
    setErrorGeneral(null);
    setServicioEditando(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: null }));
    }
  };

  // ─── HU-007 CA-01: Consultar servicio y cargarlo en modo edición ───────────
  const iniciarEdicion = async (servicio) => {
    setErrorGeneral(null);
    setMensajeExito(null);
    setServicioRegistrado(null);
    setCargandoDetalle(true);

    try {
      // Consultar la información registrada en el backend
      const datosFrescos = await consultarServicio(token, servicio.id);
      setServicioEditando(datosFrescos);
      setForm({
        id_categoria: String(datosFrescos.id_categoria),
        nombre: datosFrescos.nombre || '',
        descripcion: datosFrescos.descripcion || '',
        duracion_minutos: String(datosFrescos.duracion_minutos || ''),
        precio: String(datosFrescos.precio || ''),
        estado: datosFrescos.estado || 'activo',
      });
      setErrores({});
      if (typeof window.scrollTo === 'function') {
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          // Ignorar en entornos de test como jsdom
        }
      }
    } catch (err) {
      if (err.esErrorAutenticacion) {
        if (err.status === 403) {
          setErrorGeneral(
            'Acceso denegado: no tienes permiso para consultar este servicio porque no pertenece a tu catálogo.'
          );
        } else if (err.status === 401 && onSesionExpirada) {
          onSesionExpirada(err.message);
        } else {
          setErrorGeneral(err.message);
        }
      } else {
        setErrorGeneral(err.message || 'No fue posible consultar los datos del servicio.');
      }
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cancelarEdicion = () => {
    limpiarFormulario();
  };

  // ─── HU-007 CA-03 y CA-04: Cambio rápido de estado Activo/Inactivo ───────────
  const handleCambiarEstado = async (idServicio, estadoActual) => {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    setProcesandoEstadoId(idServicio);
    setErrorGeneral(null);
    setMensajeExito(null);

    try {
      const servicioActualizado = await cambiarEstadoServicio(token, idServicio, nuevoEstado);
      setMensajeExito(
        `✓ El estado del servicio "${servicioActualizado.nombre}" ahora es ${servicioActualizado.estado}.`
      );
      // Actualizar la lista en memoria
      setMisServicios((prev) =>
        prev.map((s) => (s.id === idServicio ? servicioActualizado : s))
      );
      // Si el servicio editando es el mismo, sincronizarlo
      if (servicioEditando && servicioEditando.id === idServicio) {
        setServicioEditando(servicioActualizado);
        setForm((f) => ({ ...f, estado: servicioActualizado.estado }));
      }
    } catch (err) {
      if (err.esErrorAutenticacion) {
        if (err.status === 403) {
          setErrorGeneral(
            'Acceso denegado: no tienes permiso para cambiar el estado de este servicio porque no pertenece a tu catálogo.'
          );
        } else if (err.status === 401 && onSesionExpirada) {
          onSesionExpirada(err.message);
        } else {
          setErrorGeneral(err.message);
        }
      } else {
        setErrorGeneral(err.message || 'No fue posible cambiar el estado del servicio.');
      }
    } finally {
      setProcesandoEstadoId(null);
    }
  };

  // ─── Validación del frontend ────────────────────────────────────────────────
  const validar = () => {
    const nuevosErrores = {};

    // Nombre
    const nombreTrim = (form.nombre || '').trim();
    if (!nombreTrim) {
      nuevosErrores.nombre = 'El nombre del servicio es obligatorio';
    } else if (nombreTrim.length > 150) {
      nuevosErrores.nombre = 'El nombre no puede superar los 150 caracteres';
    }

    // Categoría
    if (!form.id_categoria) {
      nuevosErrores.id_categoria = 'La categoría es obligatoria';
    } else {
      const esValida = categorias.some((c) => String(c.id) === String(form.id_categoria));
      if (!esValida) {
        nuevosErrores.id_categoria = 'Selecciona una categoría válida';
      }
    }

    // Descripción
    const descripcionTrim = (form.descripcion || '').trim();
    if (!descripcionTrim) {
      nuevosErrores.descripcion = 'La descripción del servicio es obligatoria';
    } else if (descripcionTrim.length > 2000) {
      nuevosErrores.descripcion = 'La descripción no puede superar los 2000 caracteres';
    }

    // Duración
    const duracionStr = String(form.duracion_minutos || '').trim();
    if (!duracionStr) {
      nuevosErrores.duracion_minutos = 'La duración estimada es obligatoria';
    } else {
      const duracionNum = Number(duracionStr);
      if (!Number.isInteger(duracionNum) || duracionNum < 1) {
        nuevosErrores.duracion_minutos = 'La duración debe ser un número entero mayor a 0';
      } else if (duracionNum > 65535) {
        nuevosErrores.duracion_minutos = 'La duración no puede superar los 65535 minutos';
      }
    }

    // Precio
    const precioStr = String(form.precio || '').trim();
    if (!precioStr) {
      nuevosErrores.precio = 'El precio es obligatorio';
    } else {
      const precioNum = parseFloat(precioStr);
      if (isNaN(precioNum) || precioNum <= 0) {
        nuevosErrores.precio = 'El precio debe ser mayor a 0';
      } else {
        const regexPrecio = /^\d{1,8}(\.\d{1,2})?$/;
        if (!regexPrecio.test(precioStr)) {
          nuevosErrores.precio = 'El precio debe tener máximo 8 dígitos enteros y 2 decimales';
        }
      }
    }

    // Estado
    if (form.estado && !['activo', 'inactivo'].includes(form.estado)) {
      nuevosErrores.estado = 'El estado debe ser activo o inactivo';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // ─── Envío del formulario (Creación HU-006 / Actualización HU-007) ───────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorGeneral(null);
    setMensajeExito(null);
    setServicioRegistrado(null);

    if (!validar()) {
      setErrorGeneral('Por favor, completa todos los campos obligatorios correctamente.');
      return;
    }

    setGuardando(true);

    const payload = {
      id_categoria: parseInt(form.id_categoria, 10),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      duracion_minutos: parseInt(form.duracion_minutos, 10),
      precio: parseFloat(parseFloat(form.precio).toFixed(2)),
      estado: form.estado || 'activo',
    };

    try {
      if (servicioEditando) {
        // HU-007 CA-02: Actualizar servicio existente
        const resultado = await actualizarServicio(token, servicioEditando.id, payload);
        setMensajeExito(`✓ Servicio #${resultado.id} ("${resultado.nombre}") actualizado exitosamente.`);
        setServicioEditando(null);
        limpiarFormulario();
        cargarMisServicios();
      } else {
        // HU-006: Registrar nuevo servicio
        const resultado = await registrarServicio(token, payload);
        setServicioRegistrado(resultado);
        limpiarFormulario();
        cargarMisServicios();
      }
    } catch (err) {
      if (err.fieldErrors) {
        setErrores(err.fieldErrors);
        setErrorGeneral('Por favor revisa y corrige los campos señalados.');
      } else if (err.esErrorAutenticacion) {
        if (err.status === 401 && onSesionExpirada) {
          onSesionExpirada(err.message);
        } else if (err.status === 403) {
          setErrorGeneral(
            servicioEditando
              ? 'Acceso denegado: no tienes permiso para gestionar este servicio. Solo el proveedor propietario puede realizar esta acción.'
              : 'Acceso denegado: no tienes permiso para registrar servicios. Solo los proveedores autenticados pueden realizar esta acción.'
          );
        } else {
          setErrorGeneral(err.message);
        }
      } else {
        setErrorGeneral(err.message || 'No fue posible guardar la información del servicio.');
      }
    } finally {
      setGuardando(false);
    }
  };

  // ─── Ayuda de presentación ─────────────────────────────────────────────────

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'No disponible';
    try {
      return new Date(fechaStr).toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return fechaStr;
    }
  };

  const formatearPrecio = (precio) => {
    if (precio === null || precio === undefined) return 'No disponible';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
    }).format(precio);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="d-flex flex-column gap-4">
      {/* ── Formulario de Registro / Edición ── */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
          <div>
            <h3 className="h5 mb-0 fw-semibold text-dark">
              {servicioEditando
                ? `Editar servicio: #${servicioEditando.id} - ${servicioEditando.nombre}`
                : 'Registrar nuevo servicio'}
            </h3>
            <small className="text-muted">
              {servicioEditando
                ? 'Modifica la información permitida del servicio y guarda los cambios'
                : 'Completa todos los campos para agregar un servicio a tu catálogo'}
            </small>
          </div>
          {servicioEditando && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={cancelarEdicion}
              disabled={guardando}
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="card-body">
          {cargandoDetalle && (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
              <span className="ms-2 text-muted small">Cargando información del servicio...</span>
            </div>
          )}

          {/* ── Alerta de éxito de actualización ── */}
          {mensajeExito && (
            <div className="alert alert-success alert-dismissible fade show mb-4" role="alert" aria-live="polite">
              <span>{mensajeExito}</span>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={() => setMensajeExito(null)}
              />
            </div>
          )}

          {/* ── Confirmación de registro exitoso (HU-006) ── */}
          {servicioRegistrado && (
            <div
              className="alert alert-success mb-4"
              role="alert"
              aria-live="polite"
            >
              <h4 className="alert-heading h6 fw-bold mb-2">
                ✓ Servicio registrado exitosamente
              </h4>
              <dl className="mb-3 row g-1 small">
                {servicioRegistrado.id && (
                  <>
                    <dt className="col-sm-4 text-muted">ID del servicio</dt>
                    <dd className="col-sm-8 mb-0">#{servicioRegistrado.id}</dd>
                  </>
                )}
                {servicioRegistrado.nombre && (
                  <>
                    <dt className="col-sm-4 text-muted">Nombre</dt>
                    <dd className="col-sm-8 mb-0">{servicioRegistrado.nombre}</dd>
                  </>
                )}
                {servicioRegistrado.categoria && (
                  <>
                    <dt className="col-sm-4 text-muted">Categoría</dt>
                    <dd className="col-sm-8 mb-0">{servicioRegistrado.categoria}</dd>
                  </>
                )}
                {servicioRegistrado.descripcion && (
                  <>
                    <dt className="col-sm-4 text-muted">Descripción</dt>
                    <dd className="col-sm-8 mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                      {servicioRegistrado.descripcion}
                    </dd>
                  </>
                )}
                {servicioRegistrado.duracion_minutos != null && (
                  <>
                    <dt className="col-sm-4 text-muted">Duración</dt>
                    <dd className="col-sm-8 mb-0">{servicioRegistrado.duracion_minutos} min</dd>
                  </>
                )}
                {servicioRegistrado.precio != null && (
                  <>
                    <dt className="col-sm-4 text-muted">Precio</dt>
                    <dd className="col-sm-8 mb-0">{formatearPrecio(servicioRegistrado.precio)}</dd>
                  </>
                )}
                {servicioRegistrado.estado && (
                  <>
                    <dt className="col-sm-4 text-muted">Estado</dt>
                    <dd className="col-sm-8 mb-0">
                      <span
                        className={`badge ${
                          servicioRegistrado.estado === 'activo'
                            ? 'bg-success'
                            : 'bg-secondary'
                        }`}
                      >
                        {servicioRegistrado.estado}
                      </span>
                    </dd>
                  </>
                )}
                {servicioRegistrado.fecha_creacion && (
                  <>
                    <dt className="col-sm-4 text-muted">Fecha de creación</dt>
                    <dd className="col-sm-8 mb-0">
                      {formatearFecha(servicioRegistrado.fecha_creacion)}
                    </dd>
                  </>
                )}
              </dl>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => setServicioRegistrado(null)}
                >
                  Registrar otro servicio
                </button>
              </div>
            </div>
          )}

          {/* ── Alerta de error general ── */}
          {errorGeneral && (
            <div className="alert alert-danger mb-3" role="alert" aria-live="assertive">
              {errorGeneral}
              {errorGeneral.includes('sesión') && (
                <div className="mt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger me-2"
                    onClick={onCerrarSesion}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Formulario ── */}
          {!servicioRegistrado && (
            <form onSubmit={handleSubmit} noValidate>
              {/* Nombre */}
              <div className="mb-3">
                <label htmlFor="srv-nombre" className="form-label small fw-semibold">
                  Nombre del servicio <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="srv-nombre"
                  name="nombre"
                  className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
                  value={form.nombre}
                  onChange={handleChange}
                  maxLength={150}
                  disabled={guardando}
                  required
                  aria-required="true"
                  aria-describedby={errores.nombre ? 'srv-nombre-error' : undefined}
                />
                <div className="d-flex justify-content-between">
                  {errores.nombre ? (
                    <div id="srv-nombre-error" className="invalid-feedback d-block">
                      {errores.nombre}
                    </div>
                  ) : (
                    <small className="text-muted">Máximo 150 caracteres</small>
                  )}
                  <small className="text-muted ms-auto">
                    {(form.nombre || '').length}/150
                  </small>
                </div>
              </div>

              {/* Categoría */}
              <div className="mb-3">
                <label htmlFor="srv-categoria" className="form-label small fw-semibold">
                  Categoría <span className="text-danger">*</span>
                </label>
                <select
                  id="srv-categoria"
                  name="id_categoria"
                  className={`form-select ${errores.id_categoria ? 'is-invalid' : ''}`}
                  value={form.id_categoria}
                  onChange={handleChange}
                  disabled={guardando}
                  required
                  aria-required="true"
                  aria-describedby={errores.id_categoria ? 'srv-categoria-error' : undefined}
                >
                  <option value="">-- Selecciona una categoría --</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
                {errores.id_categoria ? (
                  <div id="srv-categoria-error" className="invalid-feedback">
                    {errores.id_categoria}
                  </div>
                ) : (
                  <small className="text-muted">
                    Categorías de estética, bienestar y relajación autorizadas para el PMV
                  </small>
                )}
              </div>

              {/* Descripción */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label htmlFor="srv-descripcion" className="form-label small fw-semibold mb-0">
                    Descripción <span className="text-danger">*</span>
                  </label>
                  <small className="text-muted">{(form.descripcion || '').length}/2000</small>
                </div>
                <textarea
                  id="srv-descripcion"
                  name="descripcion"
                  rows={4}
                  className={`form-control mt-1 ${errores.descripcion ? 'is-invalid' : ''}`}
                  value={form.descripcion}
                  onChange={handleChange}
                  maxLength={2000}
                  disabled={guardando}
                  required
                  aria-required="true"
                  aria-describedby={errores.descripcion ? 'srv-descripcion-error' : undefined}
                  placeholder="Describe el servicio: qué incluye, beneficios, condiciones, etc."
                />
                {errores.descripcion ? (
                  <div id="srv-descripcion-error" className="invalid-feedback">
                    {errores.descripcion}
                  </div>
                ) : (
                  <small className="text-muted">
                    Obligatoria. Máximo 2000 caracteres.
                  </small>
                )}
              </div>

              {/* Duración, Precio y Estado en fila */}
              <div className="row g-3 mb-3">
                {/* Duración */}
                <div className="col-12 col-sm-4">
                  <label htmlFor="srv-duracion" className="form-label small fw-semibold">
                    Duración estimada (minutos) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    id="srv-duracion"
                    name="duracion_minutos"
                    className={`form-control ${errores.duracion_minutos ? 'is-invalid' : ''}`}
                    value={form.duracion_minutos}
                    onChange={handleChange}
                    min={1}
                    max={65535}
                    step={1}
                    disabled={guardando}
                    required
                    aria-required="true"
                    aria-describedby={
                      errores.duracion_minutos ? 'srv-duracion-error' : undefined
                    }
                    placeholder="Ej: 60"
                  />
                  {errores.duracion_minutos ? (
                    <div id="srv-duracion-error" className="invalid-feedback">
                      {errores.duracion_minutos}
                    </div>
                  ) : (
                    <small className="text-muted">Mínimo 1 minuto</small>
                  )}
                </div>

                {/* Precio */}
                <div className="col-12 col-sm-4">
                  <label htmlFor="srv-precio" className="form-label small fw-semibold">
                    Precio <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">$</span>
                    <input
                      type="number"
                      id="srv-precio"
                      name="precio"
                      className={`form-control ${errores.precio ? 'is-invalid' : ''}`}
                      value={form.precio}
                      onChange={handleChange}
                      min="0.01"
                      step="0.01"
                      disabled={guardando}
                      required
                      aria-required="true"
                      aria-describedby={errores.precio ? 'srv-precio-error' : undefined}
                      placeholder="Ej: 75000.00"
                    />
                  </div>
                  {errores.precio ? (
                    <div id="srv-precio-error" className="invalid-feedback d-block">
                      {errores.precio}
                    </div>
                  ) : (
                    <small className="text-muted">Máx. 8 enteros y 2 decimales</small>
                  )}
                </div>

                {/* Estado */}
                <div className="col-12 col-sm-4">
                  <label htmlFor="srv-estado" className="form-label small fw-semibold">
                    Estado inicial <span className="text-danger">*</span>
                  </label>
                  <select
                    id="srv-estado"
                    name="estado"
                    className="form-select"
                    value={form.estado}
                    onChange={handleChange}
                    disabled={guardando}
                  >
                    <option value="activo">Activo (visible en solicitudes)</option>
                    <option value="inactivo">Inactivo (no disponible)</option>
                  </select>
                  <small className="text-muted">Disponibilidad para clientes</small>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="d-flex justify-content-end gap-2">
                {servicioEditando ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cancelarEdicion}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={guardando}
                    >
                      {guardando ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          Guardando cambios...
                        </>
                      ) : (
                        'Guardar cambios'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={limpiarFormulario}
                      disabled={guardando}
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={guardando}
                    >
                      {guardando ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          Guardando...
                        </>
                      ) : (
                        'Registrar servicio'
                      )}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Mi Catálogo de Servicios Registrados (Consulta, Edición y Cambio de Estado) */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom">
          <div>
            <h4 className="h6 mb-0 fw-semibold text-dark">Mi Catálogo de Servicios Registrados</h4>
            <small className="text-muted">
              Consulta, actualiza y gestiona la disponibilidad (Activo / Inactivo) de tus servicios
            </small>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={cargarMisServicios}
            disabled={cargandoCatalogo}
          >
            {cargandoCatalogo ? 'Actualizando...' : 'Actualizar catálogo'}
          </button>
        </div>

        <div className="card-body p-0">
          {cargandoCatalogo && misServicios.length === 0 ? (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
              <span className="ms-2 text-muted small">Cargando catálogo...</span>
            </div>
          ) : misServicios.length === 0 ? (
            <div className="p-4 text-center text-muted small">
              Aún no tienes servicios registrados en tu catálogo. Completa el formulario superior para agregar uno.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Servicio</th>
                    <th>Categoría</th>
                    <th>Duración</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {misServicios.map((srv) => (
                    <tr key={srv.id} className={servicioEditando?.id === srv.id ? 'table-primary' : ''}>
                      <td className="text-muted">#{srv.id}</td>
                      <td>
                        <strong className="text-dark d-block">{srv.nombre}</strong>
                        {srv.descripcion && (
                          <div className="text-muted text-truncate" style={{ maxWidth: '280px' }}>
                            {srv.descripcion}
                          </div>
                        )}
                      </td>
                      <td>{srv.categoria}</td>
                      <td>{srv.duracion_minutos} min</td>
                      <td>{formatearPrecio(srv.precio)}</td>
                      <td>
                        <span
                          className={`badge ${
                            srv.estado === 'activo' ? 'bg-success' : 'bg-secondary'
                          }`}
                        >
                          {srv.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm" role="group">
                          {/* Botón Editar / Consultar */}
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => iniciarEdicion(srv)}
                            disabled={guardando || procesandoEstadoId === srv.id}
                            title="Editar información del servicio"
                          >
                            Editar
                          </button>
                          {/* HU-008: Gestionar fotografías, videos, productos e insumos */}
                          {onGestionarInformacionComplementaria && (
                            <button
                              type="button"
                              className="btn btn-outline-info"
                              onClick={() => onGestionarInformacionComplementaria(srv)}
                              disabled={guardando || procesandoEstadoId === srv.id}
                              title="Asociar fotografías, videos, productos, insumos o equipos"
                            >
                              Info. complementaria
                            </button>
                          )}
                          {/* Botón Activar / Desactivar (CA-03 y CA-04) */}
                          <button
                            type="button"
                            className={`btn ${
                              srv.estado === 'activo'
                                ? 'btn-outline-danger'
                                : 'btn-outline-success'
                            }`}
                            onClick={() => handleCambiarEstado(srv.id, srv.estado)}
                            disabled={guardando || procesandoEstadoId === srv.id}
                            title={
                              srv.estado === 'activo'
                                ? 'Desactivar servicio (no disponible para clientes)'
                                : 'Activar servicio (disponible para clientes)'
                            }
                          >
                            {procesandoEstadoId === srv.id ? (
                              <span className="spinner-border spinner-border-sm" role="status" />
                            ) : srv.estado === 'activo' ? (
                              'Desactivar'
                            ) : (
                              'Activar'
                            )}
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
    </div>
  );
};
