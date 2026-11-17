import React, { useEffect, useState } from 'react';
import { CATEGORIAS_DEMO } from '../config/categorias';
import { obtenerCategorias, registrarServicio } from '../Servicios/servicioService';

const FORM_INICIAL = {
  id_categoria: '',
  nombre: '',
  descripcion: '',
  duracion_minutos: '',
  precio: '',
};

const formatearPrecio = (precio) => {
  if (precio === null || precio === undefined) return 'No disponible';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
  }).format(precio);
};

const formatearFecha = (fecha) => {
  if (!fecha) return 'No disponible';
  try {
    return new Date(fecha).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return fecha;
  }
};

export const RegistrarServicio = ({ sesion, onCerrarSesion }) => {
  const [form, setForm] = useState(FORM_INICIAL);
  const [categorias, setCategorias] = useState(CATEGORIAS_DEMO);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [registrado, setRegistrado] = useState(null);

  useEffect(() => {
    let activo = true;

    obtenerCategorias()
      .then((data) => {
        if (!activo) return;
        if (Array.isArray(data) && data.length > 0) {
          setCategorias(
            data.map((categoria) => ({
              id: categoria.id_categoria ?? categoria.id,
              nombre: categoria.nombre,
            }))
          );
        }
      })
      .catch(() => {
        if (activo) setCategorias(CATEGORIAS_DEMO);
      })
      .finally(() => {
        if (activo) setCargandoCategorias(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validar = () => {
    const nuevosErrores = {};
    const nombre = form.nombre.trim();
    const descripcion = form.descripcion.trim();
    const duracion = Number(form.duracion_minutos);
    const precioNormalizado = String(form.precio).trim().replace(',', '.');
    const precio = Number(precioNormalizado);

    if (!form.id_categoria) {
      nuevosErrores.id_categoria = 'La categoría es obligatoria';
    } else if (!categorias.some((categoria) => String(categoria.id) === String(form.id_categoria))) {
      nuevosErrores.id_categoria = 'Selecciona una categoría válida';
    }

    if (!nombre) {
      nuevosErrores.nombre = 'El nombre del servicio es obligatorio';
    } else if (nombre.length > 150) {
      nuevosErrores.nombre = 'El nombre no puede superar los 150 caracteres';
    }

    if (!descripcion) {
      nuevosErrores.descripcion = 'La descripción del servicio es obligatoria';
    } else if (descripcion.length > 2000) {
      nuevosErrores.descripcion = 'La descripción no puede superar los 2000 caracteres';
    }

    if (!String(form.duracion_minutos).trim()) {
      nuevosErrores.duracion_minutos = 'La duración estimada es obligatoria';
    } else if (!Number.isInteger(duracion) || duracion < 1) {
      nuevosErrores.duracion_minutos = 'La duración debe ser un número entero mayor a 0';
    } else if (duracion > 65535) {
      nuevosErrores.duracion_minutos = 'La duración no puede superar los 65535 minutos';
    }

    if (!precioNormalizado) {
      nuevosErrores.precio = 'El precio es obligatorio';
    } else if (!/^\d{1,8}(\.\d{1,2})?$/.test(precioNormalizado) || !Number.isFinite(precio) || precio <= 0) {
      nuevosErrores.precio = 'Ingresa un precio mayor a 0 con máximo 8 enteros y 2 decimales';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorGeneral(null);

    if (!sesion?.token) {
      setErrorGeneral('No hay una sesión activa. Inicia sesión nuevamente para registrar servicios.');
      return;
    }

    if (!validar()) {
      setErrorGeneral('Revisa y corrige los campos señalados.');
      return;
    }

    setGuardando(true);

    const payload = {
      id_categoria: Number(form.id_categoria),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      duracion_minutos: Number(form.duracion_minutos),
      precio: Number(String(form.precio).trim().replace(',', '.')),
    };

    try {
      const servicio = await registrarServicio(sesion.token, payload);
      setRegistrado(servicio);
      setForm(FORM_INICIAL);
      setErrores({});
    } catch (err) {
      if (err.fieldErrors) {
        setErrores(err.fieldErrors);
        setErrorGeneral('Revisa y corrige los campos señalados.');
      } else if (err.esErrorAutenticacion) {
        setErrorGeneral(
          err.message ||
            'Tu sesión ha expirado o no tienes permisos de proveedor para registrar servicios.'
        );
      } else {
        setErrorGeneral(err.message || 'No fue posible registrar el servicio.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const registrarOtro = () => {
    setRegistrado(null);
    setErrorGeneral(null);
    setErrores({});
    setForm(FORM_INICIAL);
  };

  if (registrado) {
    return (
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 border-bottom">
          <h3 className="h5 mb-0 fw-semibold text-dark">Servicio registrado</h3>
          <small className="text-muted">El servicio ya hace parte de tu catálogo.</small>
        </div>
        <div className="card-body">
          <div className="alert alert-success" role="status" aria-live="polite">
            <h4 className="alert-heading h6 fw-bold mb-3">Servicio creado correctamente</h4>
            <dl className="row g-2 mb-0 small">
              <dt className="col-sm-4 text-muted">ID</dt>
              <dd className="col-sm-8 mb-0">#{registrado.id}</dd>

              <dt className="col-sm-4 text-muted">Nombre</dt>
              <dd className="col-sm-8 mb-0">{registrado.nombre}</dd>

              <dt className="col-sm-4 text-muted">Categoría</dt>
              <dd className="col-sm-8 mb-0">{registrado.categoria}</dd>

              <dt className="col-sm-4 text-muted">Descripción</dt>
              <dd className="col-sm-8 mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {registrado.descripcion || 'Sin descripción'}
              </dd>

              <dt className="col-sm-4 text-muted">Duración</dt>
              <dd className="col-sm-8 mb-0">{registrado.duracion_minutos} minutos</dd>

              <dt className="col-sm-4 text-muted">Precio</dt>
              <dd className="col-sm-8 mb-0">{formatearPrecio(registrado.precio)}</dd>

              <dt className="col-sm-4 text-muted">Estado inicial</dt>
              <dd className="col-sm-8 mb-0">
                <span className="badge bg-success text-uppercase">{registrado.estado || 'activo'}</span>
              </dd>

              <dt className="col-sm-4 text-muted">Fecha de creación</dt>
              <dd className="col-sm-8 mb-0">{formatearFecha(registrado.fecha_creacion)}</dd>
            </dl>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={registrarOtro}>
              Registrar otro servicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white py-3 border-bottom">
        <h3 className="h5 mb-0 fw-semibold text-dark">Registrar nuevo servicio</h3>
        <small className="text-muted">
          Completa la información para incorporar el servicio a tu catálogo.
        </small>
      </div>

      <div className="card-body">
        <div className="alert alert-info py-2 px-3 small mb-4">
          El servicio se crea en estado <strong>Activo</strong> y queda disponible para nuevas solicitudes.
        </div>

        {errorGeneral && (
          <div className="alert alert-danger" role="alert" aria-live="assertive">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span>{errorGeneral}</span>
              {sesion?.token && errorGeneral.toLowerCase().includes('sesión') && (
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={onCerrarSesion}>
                  Cerrar sesión
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
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
              placeholder="Ej: Manicura semipermanente"
              required
            />
            <div className="d-flex justify-content-between">
              {errores.nombre ? (
                <div className="invalid-feedback d-block">{errores.nombre}</div>
              ) : (
                <small className="text-muted">Máximo 150 caracteres</small>
              )}
              <small className="text-muted">{form.nombre.length}/150</small>
            </div>
          </div>

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
              disabled={guardando || cargandoCategorias}
              required
            >
              <option value="">{cargandoCategorias ? 'Cargando categorías...' : 'Selecciona una categoría'}</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
            {errores.id_categoria ? (
              <div className="invalid-feedback">{errores.id_categoria}</div>
            ) : (
              <small className="text-muted">Categorías de estética, bienestar y relajación.</small>
            )}
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <label htmlFor="srv-descripcion" className="form-label small fw-semibold mb-0">
                Descripción <span className="text-danger">*</span>
              </label>
              <small className="text-muted">{form.descripcion.length}/2000</small>
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
              placeholder="Describe qué incluye el servicio, beneficios y condiciones."
              required
            />
            {errores.descripcion && <div className="invalid-feedback">{errores.descripcion}</div>}
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6">
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
                placeholder="Ej: 60"
                required
              />
              {errores.duracion_minutos ? (
                <div className="invalid-feedback">{errores.duracion_minutos}</div>
              ) : (
                <small className="text-muted">Mínimo 1 minuto.</small>
              )}
            </div>

            <div className="col-12 col-sm-6">
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
                  placeholder="Ej: 75000.00"
                  required
                />
                {errores.precio && <div className="invalid-feedback">{errores.precio}</div>}
              </div>
              <small className="text-muted">Máximo 8 enteros y 2 decimales.</small>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setForm(FORM_INICIAL);
                setErrores({});
                setErrorGeneral(null);
              }}
              disabled={guardando}
            >
              Limpiar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={guardando || cargandoCategorias}>
              {guardando ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  Guardando...
                </>
              ) : (
                'Registrar servicio'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
