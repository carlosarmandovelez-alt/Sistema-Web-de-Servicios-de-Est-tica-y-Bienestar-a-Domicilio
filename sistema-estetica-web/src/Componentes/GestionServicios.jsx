import React, { useCallback, useEffect, useState } from 'react';
import { CATEGORIAS_DEMO } from '../config/categorias';
import {
  actualizarServicio,
  cambiarEstadoServicio,
  consultarServicio,
  obtenerCategorias,
  obtenerMisServicios,
} from '../Servicios/servicioService';

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

export const GestionServicios = ({ sesion, onCerrarSesion }) => {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [servicioEditando, setServicioEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [procesandoEstadoId, setProcesandoEstadoId] = useState(null);
  const [categorias, setCategorias] = useState(CATEGORIAS_DEMO);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);

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

  const cargarServicios = useCallback(async () => {
    if (!sesion?.token) {
      setErrorGeneral('No hay una sesión activa. Inicia sesión nuevamente para gestionar tus servicios.');
      setCargando(false);
      return;
    }

    setCargando(true);
    setErrorGeneral(null);

    try {
      const data = await obtenerMisServicios(sesion.token);
      setServicios(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorGeneral(
        err.message ||
          'No fue posible consultar tus servicios. Verifica que el backend tenga disponible el listado del catálogo.'
      );
    } finally {
      setCargando(false);
    }
  }, [sesion?.token]);

  useEffect(() => {
    cargarServicios();
  }, [cargarServicios]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: null }));
    }
  };

  const iniciarEdicion = async (servicio) => {
    setErrorGeneral(null);
    setMensajeExito(null);

    try {
      const detalle = await consultarServicio(sesion.token, servicio.id);
      setServicioEditando(detalle);
      setForm({
        id_categoria: String(detalle.id_categoria ?? ''),
        nombre: detalle.nombre || '',
        descripcion: detalle.descripcion || '',
        duracion_minutos: String(detalle.duracion_minutos ?? ''),
        precio: String(detalle.precio ?? ''),
      });
      setErrores({});
    } catch (err) {
      if (err.esErrorAutenticacion) {
        setErrorGeneral(
          err.status === 403
            ? 'Acceso denegado: el servicio no pertenece a tu catálogo.'
            : err.message
        );
      } else {
        setErrorGeneral(err.message || 'No fue posible consultar el servicio.');
      }
    }
  };

  const cancelarEdicion = () => {
    setServicioEditando(null);
    setForm(FORM_INICIAL);
    setErrores({});
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
    setMensajeExito(null);

    if (!servicioEditando) return;

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
      const actualizado = await actualizarServicio(sesion.token, servicioEditando.id, payload);
      setServicios((prev) =>
        prev.map((servicio) => (servicio.id === actualizado.id ? actualizado : servicio))
      );
      setServicioEditando(null);
      setForm(FORM_INICIAL);
      setErrores({});
      setMensajeExito(`El servicio "${actualizado.nombre}" fue actualizado correctamente.`);
    } catch (err) {
      if (err.fieldErrors) {
        setErrores(err.fieldErrors);
        setErrorGeneral('Revisa y corrige los campos señalados.');
      } else if (err.esErrorAutenticacion) {
        setErrorGeneral(
          err.status === 403
            ? 'Acceso denegado: no puedes modificar un servicio que no pertenece a tu catálogo.'
            : err.message
        );
      } else {
        setErrorGeneral(err.message || 'No fue posible actualizar el servicio.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (servicio) => {
    const nuevoEstado = servicio.estado === 'activo' ? 'inactivo' : 'activo';
    setProcesandoEstadoId(servicio.id);
    setErrorGeneral(null);
    setMensajeExito(null);

    try {
      const actualizado = await cambiarEstadoServicio(sesion.token, servicio.id, nuevoEstado);
      setServicios((prev) =>
        prev.map((item) => (item.id === actualizado.id ? actualizado : item))
      );
      if (servicioEditando?.id === actualizado.id) {
        setServicioEditando(actualizado);
      }
      setMensajeExito(
        `El servicio "${actualizado.nombre}" ahora está ${actualizado.estado === 'activo' ? 'activo' : 'inactivo'}.`
      );
    } catch (err) {
      if (err.esErrorAutenticacion) {
        setErrorGeneral(
          err.status === 403
            ? 'Acceso denegado: no puedes cambiar el estado de un servicio ajeno.'
            : err.message
        );
      } else {
        setErrorGeneral(err.message || 'No fue posible cambiar el estado del servicio.');
      }
    } finally {
      setProcesandoEstadoId(null);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {errorGeneral && (
        <div className="alert alert-danger" role="alert" aria-live="assertive">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span>{errorGeneral}</span>
            {!sesion?.token || errorGeneral.toLowerCase().includes('sesión') ? (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={onCerrarSesion}>
                Cerrar sesión
              </button>
            ) : (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={cargarServicios}>
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}

      {mensajeExito && (
        <div className="alert alert-success alert-dismissible fade show" role="status" aria-live="polite">
          <span>{mensajeExito}</span>
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={() => setMensajeExito(null)}
          />
        </div>
      )}

      {servicioEditando && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom">
            <div>
              <h3 className="h5 mb-0 fw-semibold text-dark">
                Editar servicio #{servicioEditando.id}
              </h3>
              <small className="text-muted">{servicioEditando.nombre}</small>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={cancelarEdicion}
              disabled={guardando}
            >
              Cancelar edición
            </button>
          </div>

          <div className="card-body">
            <div className="alert alert-info py-2 px-3 small mb-4">
              Los cambios aplican a futuras consultas y solicitudes. Las solicitudes ya creadas conservan
              el nombre, precio y duración registrados originalmente.
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="edit-nombre" className="form-label small fw-semibold">
                  Nombre del servicio <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="edit-nombre"
                  name="nombre"
                  className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
                  value={form.nombre}
                  onChange={handleChange}
                  maxLength={150}
                  disabled={guardando}
                  required
                />
                {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="edit-categoria" className="form-label small fw-semibold">
                  Categoría <span className="text-danger">*</span>
                </label>
                <select
                  id="edit-categoria"
                  name="id_categoria"
                  className={`form-select ${errores.id_categoria ? 'is-invalid' : ''}`}
                  value={form.id_categoria}
                  onChange={handleChange}
                  disabled={guardando || cargandoCategorias}
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
                {errores.id_categoria && <div className="invalid-feedback">{errores.id_categoria}</div>}
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label htmlFor="edit-descripcion" className="form-label small fw-semibold mb-0">
                    Descripción <span className="text-danger">*</span>
                  </label>
                  <small className="text-muted">{form.descripcion.length}/2000</small>
                </div>
                <textarea
                  id="edit-descripcion"
                  name="descripcion"
                  rows={4}
                  className={`form-control mt-1 ${errores.descripcion ? 'is-invalid' : ''}`}
                  value={form.descripcion}
                  onChange={handleChange}
                  maxLength={2000}
                  disabled={guardando}
                  required
                />
                {errores.descripcion && <div className="invalid-feedback">{errores.descripcion}</div>}
              </div>

              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6">
                  <label htmlFor="edit-duracion" className="form-label small fw-semibold">
                    Duración estimada (minutos) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    id="edit-duracion"
                    name="duracion_minutos"
                    className={`form-control ${errores.duracion_minutos ? 'is-invalid' : ''}`}
                    value={form.duracion_minutos}
                    onChange={handleChange}
                    min={1}
                    max={65535}
                    step={1}
                    disabled={guardando}
                    required
                  />
                  {errores.duracion_minutos && (
                    <div className="invalid-feedback">{errores.duracion_minutos}</div>
                  )}
                </div>

                <div className="col-12 col-sm-6">
                  <label htmlFor="edit-precio" className="form-label small fw-semibold">
                    Precio <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">$</span>
                    <input
                      type="number"
                      id="edit-precio"
                      name="precio"
                      className={`form-control ${errores.precio ? 'is-invalid' : ''}`}
                      value={form.precio}
                      onChange={handleChange}
                      min="0.01"
                      step="0.01"
                      disabled={guardando}
                      required
                    />
                    {errores.precio && <div className="invalid-feedback">{errores.precio}</div>}
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={cancelarEdicion}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={guardando}>
                  {guardando ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom">
          <div>
            <h3 className="h5 mb-0 fw-semibold text-dark">Gestionar mis servicios</h3>
            <small className="text-muted">
              Consulta, edita y cambia el estado de los servicios de tu catálogo.
            </small>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={cargarServicios}
            disabled={cargando}
          >
            {cargando ? 'Actualizando...' : 'Actualizar catálogo'}
          </button>
        </div>

        <div className="card-body p-0">
          {cargando ? (
            <div className="text-center py-5" aria-live="polite">
              <div className="spinner-border text-primary" role="status" />
              <p className="text-muted mt-3 mb-0">Consultando tus servicios...</p>
            </div>
          ) : servicios.length === 0 ? (
            <div className="text-center py-5 px-3">
              <p className="text-muted mb-1">No tienes servicios registrados en tu catálogo.</p>
              <small className="text-muted">
                Cuando registres un servicio podrás editarlo y activarlo o desactivarlo desde aquí.
              </small>
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
                  {servicios.map((servicio) => (
                    <tr
                      key={servicio.id}
                      className={servicioEditando?.id === servicio.id ? 'table-primary' : ''}
                    >
                      <td className="text-muted">#{servicio.id}</td>
                      <td>
                        <strong className="text-dark d-block">{servicio.nombre}</strong>
                        {servicio.descripcion && (
                          <span className="text-muted d-block text-truncate" style={{ maxWidth: '320px' }}>
                            {servicio.descripcion}
                          </span>
                        )}
                      </td>
                      <td>{servicio.categoria}</td>
                      <td>{servicio.duracion_minutos} min</td>
                      <td>{formatearPrecio(servicio.precio)}</td>
                      <td>
                        <span
                          className={`badge ${
                            servicio.estado === 'activo' ? 'bg-success' : 'bg-secondary'
                          }`}
                        >
                          {servicio.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm" role="group">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => iniciarEdicion(servicio)}
                            disabled={guardando || procesandoEstadoId === servicio.id}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`btn ${
                              servicio.estado === 'activo' ? 'btn-outline-danger' : 'btn-outline-success'
                            }`}
                            onClick={() => handleCambiarEstado(servicio)}
                            disabled={guardando || procesandoEstadoId === servicio.id}
                          >
                            {procesandoEstadoId === servicio.id ? (
                              <span className="spinner-border spinner-border-sm" role="status" />
                            ) : servicio.estado === 'activo' ? (
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
