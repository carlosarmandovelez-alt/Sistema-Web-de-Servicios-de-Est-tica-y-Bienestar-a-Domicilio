import React, { useState, useEffect, useCallback } from 'react';
import {
  registrarServicio,
  obtenerCategorias,
  obtenerMisServicios,
} from '../Servicios/servicioService';
import { CATEGORIAS_PMV } from '../config/categorias';

/**
 * RegistrarServicio
 *
 * Formulario para que un Proveedor autenticado registre un nuevo servicio
 * en su catálogo y consulte sus servicios registrados.
 *
 * Props:
 *   - token {string}       JWT del proveedor autenticado
 *   - onSesionExpirada {Function}  Callback para manejar sesión vencida / 401
 *   - onCerrarSesion {Function}    Callback para cerrar sesión
 */
export const RegistrarServicio = ({ token, onSesionExpirada, onCerrarSesion }) => {
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
  const [guardando, setGuardando] = useState(false);
  const [servicioRegistrado, setServicioRegistrado] = useState(null);

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
      // Si el backend no responde, se mantiene el fallback verificado CATEGORIAS_PMV
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
    } catch {
      // Silencioso o no crítico para el render del formulario
    } finally {
      setCargandoCatalogo(false);
    }
  }, [token]);

  useEffect(() => {
    cargarCategoriasServidor();
    cargarMisServicios();
  }, [cargarCategoriasServidor, cargarMisServicios]);

  // ─── Utilidades ────────────────────────────────────────────────────────────

  const limpiarFormulario = () => {
    setForm(estadoInicial);
    setErrores({});
    setErrorGeneral(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: null }));
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

  // ─── Envío del formulario ───────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorGeneral(null);
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
      const resultado = await registrarServicio(token, payload);
      setServicioRegistrado(resultado);
      limpiarFormulario();
      // Recargar catálogo actualizado
      cargarMisServicios();
    } catch (err) {
      if (err.fieldErrors) {
        setErrores(err.fieldErrors);
        setErrorGeneral('Por favor revisa y corrige los campos señalados.');
      } else if (err.esErrorAutenticacion) {
        if (err.status === 401 && onSesionExpirada) {
          onSesionExpirada(err.message);
        } else if (err.status === 403) {
          setErrorGeneral(
            'Acceso denegado: no tienes permiso para registrar servicios. Solo los proveedores autenticados pueden realizar esta acción.'
          );
        } else {
          setErrorGeneral(err.message);
        }
      } else {
        setErrorGeneral(err.message || 'No fue posible registrar el servicio. Inténtalo de nuevo.');
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
      <div className="card shadow-sm">
        <div className="card-header bg-white py-3">
          <h3 className="h5 mb-0 fw-semibold text-dark">Registrar nuevo servicio</h3>
          <small className="text-muted">
            Completa todos los campos para agregar un servicio a tu catálogo
          </small>
        </div>

        <div className="card-body">
          {/* ── Confirmación de registro exitoso ── */}
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
                    <option value="activo">Activo (visible)</option>
                    <option value="inactivo">Inactivo (oculto)</option>
                  </select>
                  <small className="text-muted">Visibilidad en catálogo</small>
                </div>
              </div>

              {/* Botón de envío */}
              <div className="d-flex justify-content-end gap-2">
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
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── SECCIÓN CATÁLOGO: Mis servicios registrados ── */}
      <div className="card shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <div>
            <h4 className="h6 mb-0 fw-semibold text-dark">Mi Catálogo de Servicios Registrados</h4>
            <small className="text-muted">
              Servicios que tienes incorporados en tu oferta profesional
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
                  </tr>
                </thead>
                <tbody>
                  {misServicios.map((srv) => (
                    <tr key={srv.id}>
                      <td className="text-muted">#{srv.id}</td>
                      <td>
                        <strong className="text-dark">{srv.nombre}</strong>
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
                          {srv.estado}
                        </span>
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
