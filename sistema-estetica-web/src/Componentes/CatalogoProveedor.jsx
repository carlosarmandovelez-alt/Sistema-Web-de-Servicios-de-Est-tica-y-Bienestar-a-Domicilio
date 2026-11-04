import React, { useCallback, useEffect, useState } from 'react';
import {
  actualizarServicio,
  agregarInsumo,
  agregarMultimedia,
  cambiarEstadoServicio,
  crearServicio,
  eliminarInsumo,
  eliminarMultimedia,
  listarCategorias,
  listarInsumos,
  listarMisServicios,
  listarMultimedia,
} from '../Servicios/servicioService';
import { formatearPrecio } from './solicitudComunes';

const FORMULARIO_INICIAL = {
  id_categoria: '',
  nombre: '',
  descripcion: '',
  duracion_minutos: '',
  precio: '',
};

const validarServicio = (datos) => {
  const errores = {};

  if (!datos.id_categoria) {
    errores.id_categoria = 'Selecciona una categoría.';
  }

  if (!datos.nombre || !datos.nombre.trim()) {
    errores.nombre = 'El nombre del servicio es obligatorio.';
  }

  const duracion = Number(datos.duracion_minutos);
  if (!datos.duracion_minutos || Number.isNaN(duracion) || duracion <= 0) {
    errores.duracion_minutos = 'Indica una duración mayor a 0 minutos.';
  }

  const precio = Number(datos.precio);
  if (datos.precio === '' || Number.isNaN(precio) || precio <= 0) {
    errores.precio = 'Indica un precio mayor a 0.';
  }

  return errores;
};

export const CatalogoProveedor = ({ sesion }) => {
  const [servicios, setServicios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formEdicion, setFormEdicion] = useState(FORMULARIO_INICIAL);
  const [erroresEdicion, setErroresEdicion] = useState({});
  const [procesandoEstado, setProcesandoEstado] = useState(false);
  const [complementario, setComplementario] = useState(null);
  const [multimedia, setMultimedia] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [cargandoComplementario, setCargandoComplementario] = useState(false);
  const [errorComplementario, setErrorComplementario] = useState(null);
  const [formMultimedia, setFormMultimedia] = useState({ tipo_archivo: 'foto', url_archivo: '', orden: '1' });
  const [formInsumo, setFormInsumo] = useState({ nombre: '', tipo: 'insumo' });
  const [procesandoComplementario, setProcesandoComplementario] = useState(false);

  const cargarServicios = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const [serviciosData, categoriasData] = await Promise.all([
        listarMisServicios(sesion.token),
        listarCategorias(sesion.token),
      ]);

      const listaCategorias = Array.isArray(categoriasData) ? categoriasData : [];
      setCategorias(listaCategorias);
      setServicios(Array.isArray(serviciosData) ? serviciosData : []);
      setFormulario((prev) => ({
        ...prev,
        id_categoria:
          prev.id_categoria ||
          (listaCategorias[0] ? String(listaCategorias[0].id_categoria) : ''),
      }));
    } catch (err) {
      setError(err.message || 'No fue posible cargar tu catálogo de servicios.');
    } finally {
      setCargando(false);
    }
  }, [sesion.token]);

  useEffect(() => {
    cargarServicios();
  }, [cargarServicios]);

  const handleChangeFormulario = (event) => {
    const { name, value } = event.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleChangeEdicion = (event) => {
    const { name, value } = event.target;
    setFormEdicion((prev) => ({ ...prev, [name]: value }));
    setErroresEdicion((prev) => ({ ...prev, [name]: undefined }));
  };

  const crear = async (event) => {
    event.preventDefault();
    const validaciones = validarServicio(formulario);
    setErrores(validaciones);

    if (Object.keys(validaciones).length > 0) {
      return;
    }

    setGuardando(true);
    setError(null);
    setExito(null);

    try {
      const creado = await crearServicio(sesion.token, {
        id_categoria: Number(formulario.id_categoria),
        nombre: formulario.nombre.trim(),
        descripcion: formulario.descripcion.trim(),
        duracion_minutos: Number(formulario.duracion_minutos),
        precio: Number(formulario.precio),
      });

      setServicios((prev) => [creado, ...prev]);
      setFormulario(FORMULARIO_INICIAL);
      setMostrarFormulario(false);
      setExito('Servicio registrado correctamente en tu catálogo.');
    } catch (err) {
      setError(err.message || 'No fue posible registrar el servicio.');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (servicio) => {
    setEditandoId(servicio.id);
    setFormEdicion({
      id_categoria: String(servicio.id_categoria ?? ''),
      nombre: servicio.nombre || '',
      descripcion: servicio.descripcion || '',
      duracion_minutos: String(servicio.duracion_minutos ?? ''),
      precio: String(servicio.precio ?? ''),
    });
    setErroresEdicion({});
    setComplementario(null);
  };

  const guardarEdicion = async (event, servicio) => {
    event.preventDefault();
    const validaciones = validarServicio(formEdicion);
    setErroresEdicion(validaciones);

    if (Object.keys(validaciones).length > 0) {
      return;
    }

    setGuardando(true);
    setError(null);
    setExito(null);

    try {
      const actualizado = await actualizarServicio(sesion.token, servicio.id, {
        id_categoria: Number(formEdicion.id_categoria),
        nombre: formEdicion.nombre.trim(),
        descripcion: formEdicion.descripcion.trim(),
        duracion_minutos: Number(formEdicion.duracion_minutos),
        precio: Number(formEdicion.precio),
      });

      setServicios((prev) =>
        prev.map((item) =>
          item.id === servicio.id
            ? {
                ...item,
                ...actualizado,
                id: item.id,
                id_proveedor: item.id_proveedor,
                nombre_proveedor: item.nombre_proveedor,
              }
            : item
        )
      );
      setEditandoId(null);
      setExito('Servicio actualizado correctamente.');
    } catch (err) {
      setError(err.message || 'No fue posible actualizar el servicio.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (servicio) => {
    const nuevoEstado = servicio.estado === 'inactivo' ? 'activo' : 'inactivo';
    setProcesandoEstado(true);
    setError(null);
    setExito(null);

    try {
      await cambiarEstadoServicio(sesion.token, servicio.id, nuevoEstado);
      setServicios((prev) =>
        prev.map((item) => (item.id === servicio.id ? { ...item, estado: nuevoEstado } : item))
      );
      setExito(`El servicio quedó ${nuevoEstado === 'activo' ? 'activo' : 'inactivo'}.`);
    } catch (err) {
      setError(err.message || 'No fue posible cambiar el estado del servicio.');
    } finally {
      setProcesandoEstado(false);
    }
  };

  const abrirComplementario = async (servicio) => {
    setComplementario(servicio);
    setErrorComplementario(null);
    setMultimedia([]);
    setInsumos([]);
    setCargandoComplementario(true);

    try {
      const [contenido, elementos] = await Promise.all([
        listarMultimedia(sesion.token, servicio.id),
        listarInsumos(sesion.token, servicio.id),
      ]);
      setMultimedia(Array.isArray(contenido) ? contenido : []);
      setInsumos(Array.isArray(elementos) ? elementos : []);
    } catch (err) {
      setErrorComplementario(
        err.message || 'No fue posible consultar la información complementaria del servicio.'
      );
    } finally {
      setCargandoComplementario(false);
    }
  };

  const agregarArchivo = async (event) => {
    event.preventDefault();
    if (!complementario) {
      return;
    }

    if (!formMultimedia.url_archivo.trim()) {
      setErrorComplementario('Indica la URL del archivo.');
      return;
    }

    setProcesandoComplementario(true);
    setErrorComplementario(null);

    try {
      const creado = await agregarMultimedia(sesion.token, complementario.id, {
        tipo_archivo: formMultimedia.tipo_archivo,
        url_archivo: formMultimedia.url_archivo.trim(),
        orden: Number(formMultimedia.orden) || 1,
      });
      setMultimedia((prev) => [...prev, creado]);
      setFormMultimedia({ tipo_archivo: 'foto', url_archivo: '', orden: '1' });
    } catch (err) {
      setErrorComplementario(err.message || 'No fue posible agregar el archivo.');
    } finally {
      setProcesandoComplementario(false);
    }
  };

  const quitarArchivo = async (idMultimedia) => {
    if (!complementario) {
      return;
    }

    setProcesandoComplementario(true);
    setErrorComplementario(null);

    try {
      await eliminarMultimedia(sesion.token, complementario.id, idMultimedia);
      setMultimedia((prev) => prev.filter((item) => item.id !== idMultimedia));
    } catch (err) {
      setErrorComplementario(err.message || 'No fue posible eliminar el archivo.');
    } finally {
      setProcesandoComplementario(false);
    }
  };

  const agregarElemento = async (event) => {
    event.preventDefault();
    if (!complementario) {
      return;
    }

    if (!formInsumo.nombre.trim()) {
      setErrorComplementario('Indica el nombre del producto, insumo o equipo.');
      return;
    }

    setProcesandoComplementario(true);
    setErrorComplementario(null);

    try {
      const creado = await agregarInsumo(sesion.token, complementario.id, {
        nombre: formInsumo.nombre.trim(),
        tipo: formInsumo.tipo,
      });
      setInsumos((prev) => [...prev, creado]);
      setFormInsumo({ nombre: '', tipo: 'insumo' });
    } catch (err) {
      setErrorComplementario(err.message || 'No fue posible agregar el elemento.');
    } finally {
      setProcesandoComplementario(false);
    }
  };

  const quitarElemento = async (idInsumo) => {
    if (!complementario) {
      return;
    }

    setProcesandoComplementario(true);
    setErrorComplementario(null);

    try {
      await eliminarInsumo(sesion.token, complementario.id, idInsumo);
      setInsumos((prev) => prev.filter((item) => item.id !== idInsumo));
    } catch (err) {
      setErrorComplementario(err.message || 'No fue posible eliminar el elemento.');
    } finally {
      setProcesandoComplementario(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Mi catálogo de servicios</h2>
          <p className="text-muted small mb-0">
            Registra, actualiza y administra el estado de tus servicios, además de su contenido multimedia e insumos
            (HU-006, HU-007 y HU-008).
          </p>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cargarServicios} disabled={cargando}>
            Actualizar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setMostrarFormulario((prev) => !prev);
              setErrores({});
            }}
          >
            {mostrarFormulario ? 'Cerrar formulario' : 'Nuevo servicio'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {exito && (
        <div className="alert alert-success alert-dismissible fade show" role="status">
          {exito}
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setExito(null)} />
        </div>
      )}

      {mostrarFormulario && (
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h3 className="h5 mb-0">Registrar un nuevo servicio</h3>
          </div>
          <div className="card-body">
            <form onSubmit={crear} className="row g-3" noValidate>
              <div className="col-12 col-md-6">
                <label htmlFor="id_categoria" className="form-label small fw-semibold">
                  Categoría <span className="text-danger">*</span>
                </label>
                <select
                  id="id_categoria"
                  name="id_categoria"
                  className={`form-select ${errores.id_categoria ? 'is-invalid' : ''}`}
                  value={formulario.id_categoria}
                  onChange={handleChangeFormulario}
                  disabled={guardando}
                  required
                >
                  {categorias.map((categoria) => (
                    <option key={categoria.id_categoria} value={categoria.id_categoria}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
                {errores.id_categoria && <div className="invalid-feedback">{errores.id_categoria}</div>}
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="nombre" className="form-label small fw-semibold">
                  Nombre del servicio <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
                  value={formulario.nombre}
                  onChange={handleChangeFormulario}
                  maxLength={150}
                  disabled={guardando}
                  required
                />
                {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
              </div>

              <div className="col-12">
                <label htmlFor="descripcion" className="form-label small fw-semibold">
                  Descripción
                </label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  className="form-control"
                  rows={3}
                  maxLength={2000}
                  value={formulario.descripcion}
                  onChange={handleChangeFormulario}
                  disabled={guardando}
                  placeholder="Describe el servicio, lo que incluye y a quién está dirigido."
                />
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="duracion_minutos" className="form-label small fw-semibold">
                  Duración (minutos) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  id="duracion_minutos"
                  name="duracion_minutos"
                  min="1"
                  step="1"
                  className={`form-control ${errores.duracion_minutos ? 'is-invalid' : ''}`}
                  value={formulario.duracion_minutos}
                  onChange={handleChangeFormulario}
                  disabled={guardando}
                  required
                />
                {errores.duracion_minutos && (
                  <div className="invalid-feedback">{errores.duracion_minutos}</div>
                )}
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="precio" className="form-label small fw-semibold">
                  Precio <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  id="precio"
                  name="precio"
                  min="0.01"
                  step="0.01"
                  className={`form-control ${errores.precio ? 'is-invalid' : ''}`}
                  value={formulario.precio}
                  onChange={handleChangeFormulario}
                  disabled={guardando}
                  required
                />
                {errores.precio && <div className="invalid-feedback">{errores.precio}</div>}
              </div>

              <div className="col-12 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setMostrarFormulario(false);
                    setFormulario(FORMULARIO_INICIAL);
                    setErrores({});
                  }}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Registrar servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-3 mb-0">Cargando tu catálogo...</p>
        </div>
      ) : servicios.length === 0 ? (
        <div className="text-center py-5 border rounded bg-light">
          <p className="text-muted mb-1">Aún no tienes servicios registrados.</p>
          <p className="text-muted small mb-0">Usa el botón "Nuevo servicio" para agregar el primero.</p>
        </div>
      ) : (
        <div className="row g-3">
          {servicios.map((servicio) => (
            <div key={servicio.id} className="col-12 col-lg-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  {editandoId === servicio.id ? (
                    <form onSubmit={(event) => guardarEdicion(event, servicio)} className="row g-3" noValidate>
                      <div className="col-12">
                        <label htmlFor={`categoria-${servicio.id}`} className="form-label small fw-semibold">
                          Categoría
                        </label>
                        <select
                          id={`categoria-${servicio.id}`}
                          name="id_categoria"
                          className={`form-select ${erroresEdicion.id_categoria ? 'is-invalid' : ''}`}
                          value={formEdicion.id_categoria}
                          onChange={handleChangeEdicion}
                          disabled={guardando}
                        >
                          <option value="">Selecciona una categoría</option>
                          {categorias.map((categoria) => (
                            <option key={categoria.id_categoria} value={categoria.id_categoria}>
                              {categoria.nombre}
                            </option>
                          ))}
                        </select>
                        {erroresEdicion.id_categoria && (
                          <div className="invalid-feedback">{erroresEdicion.id_categoria}</div>
                        )}
                      </div>

                      <div className="col-12">
                        <label htmlFor={`nombre-${servicio.id}`} className="form-label small fw-semibold">
                          Nombre
                        </label>
                        <input
                          type="text"
                          id={`nombre-${servicio.id}`}
                          name="nombre"
                          className={`form-control ${erroresEdicion.nombre ? 'is-invalid' : ''}`}
                          value={formEdicion.nombre}
                          onChange={handleChangeEdicion}
                          maxLength={150}
                          disabled={guardando}
                        />
                        {erroresEdicion.nombre && <div className="invalid-feedback">{erroresEdicion.nombre}</div>}
                      </div>

                      <div className="col-12">
                        <label htmlFor={`descripcion-${servicio.id}`} className="form-label small fw-semibold">
                          Descripción
                        </label>
                        <textarea
                          id={`descripcion-${servicio.id}`}
                          name="descripcion"
                          className="form-control"
                          rows={3}
                          maxLength={2000}
                          value={formEdicion.descripcion}
                          onChange={handleChangeEdicion}
                          disabled={guardando}
                        />
                      </div>

                      <div className="col-6">
                        <label htmlFor={`duracion-${servicio.id}`} className="form-label small fw-semibold">
                          Duración (min)
                        </label>
                        <input
                          type="number"
                          id={`duracion-${servicio.id}`}
                          name="duracion_minutos"
                          min="1"
                          className={`form-control ${erroresEdicion.duracion_minutos ? 'is-invalid' : ''}`}
                          value={formEdicion.duracion_minutos}
                          onChange={handleChangeEdicion}
                          disabled={guardando}
                        />
                        {erroresEdicion.duracion_minutos && (
                          <div className="invalid-feedback">{erroresEdicion.duracion_minutos}</div>
                        )}
                      </div>

                      <div className="col-6">
                        <label htmlFor={`precio-${servicio.id}`} className="form-label small fw-semibold">
                          Precio
                        </label>
                        <input
                          type="number"
                          id={`precio-${servicio.id}`}
                          name="precio"
                          min="0.01"
                          step="0.01"
                          className={`form-control ${erroresEdicion.precio ? 'is-invalid' : ''}`}
                          value={formEdicion.precio}
                          onChange={handleChangeEdicion}
                          disabled={guardando}
                        />
                        {erroresEdicion.precio && <div className="invalid-feedback">{erroresEdicion.precio}</div>}
                      </div>

                      <div className="col-12 d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setEditandoId(null)}
                          disabled={guardando}
                        >
                          Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={guardando}>
                          {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                        <div>
                          <span className="badge text-bg-light border mb-2">{servicio.categoria}</span>
                          <h3 className="h5 mb-1">{servicio.nombre}</h3>
                          <p className="text-muted small mb-0">
                            {servicio.duracion_minutos} min · {formatearPrecio(servicio.precio)}
                          </p>
                        </div>
                        <span
                          className={`badge ${
                            servicio.estado === 'inactivo' ? 'text-bg-secondary' : 'text-bg-success'
                          }`}
                        >
                          {servicio.estado === 'inactivo' ? 'Inactivo' : 'Activo'}
                        </span>
                      </div>

                      {servicio.descripcion && (
                        <p className="small text-muted mt-3 mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                          {servicio.descripcion}
                        </p>
                      )}

                      <div className="d-flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => iniciarEdicion(servicio)}
                          disabled={guardando}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => cambiarEstado(servicio)}
                          disabled={procesandoEstado}
                        >
                          {servicio.estado === 'inactivo' ? 'Activar' : 'Desactivar'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm"
                          onClick={() => abrirComplementario(servicio)}
                        >
                          Fotos e insumos
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {complementario && (
        <div className="card shadow-sm mt-4">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <div>
              <h3 className="h5 mb-0">Información complementaria</h3>
              <small className="text-muted">{complementario.nombre}</small>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar"
              onClick={() => setComplementario(null)}
            />
          </div>
          <div className="card-body">
            {errorComplementario && (
              <div className="alert alert-warning py-2 px-3 small" role="alert">
                {errorComplementario}
              </div>
            )}

            {cargandoComplementario ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status" />
                <p className="text-muted mt-3 mb-0">Consultando información complementaria...</p>
              </div>
            ) : (
              <div className="row g-4">
                <div className="col-12 col-lg-6">
                  <h4 className="h6 fw-bold">Fotografías y videos</h4>
                  <form onSubmit={agregarArchivo} className="row g-2 align-items-end mb-3">
                    <div className="col-12 col-sm-4">
                      <label htmlFor="tipo_archivo" className="form-label small fw-semibold">
                        Tipo
                      </label>
                      <select
                        id="tipo_archivo"
                        className="form-select form-select-sm"
                        value={formMultimedia.tipo_archivo}
                        onChange={(event) =>
                          setFormMultimedia((prev) => ({ ...prev, tipo_archivo: event.target.value }))
                        }
                        disabled={procesandoComplementario}
                      >
                        <option value="foto">Fotografía</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div className="col-12 col-sm-8">
                      <label htmlFor="url_archivo" className="form-label small fw-semibold">
                        URL del archivo
                      </label>
                      <input
                        type="url"
                        id="url_archivo"
                        className="form-control form-control-sm"
                        value={formMultimedia.url_archivo}
                        onChange={(event) =>
                          setFormMultimedia((prev) => ({ ...prev, url_archivo: event.target.value }))
                        }
                        placeholder="https://..."
                        disabled={procesandoComplementario}
                      />
                    </div>
                    <div className="col-12 d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={procesandoComplementario}>
                        Agregar archivo
                      </button>
                    </div>
                  </form>

                  {multimedia.length === 0 ? (
                    <p className="text-muted small mb-0">No hay fotografías ni videos asociados.</p>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {multimedia.map((archivo) => (
                        <li
                          key={archivo.id}
                          className="list-group-item d-flex justify-content-between align-items-center px-0"
                        >
                          <span className="small text-truncate me-2">
                            {archivo.tipo_archivo === 'foto' ? 'Fotografía' : 'Video'}: {archivo.url_archivo}
                          </span>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => quitarArchivo(archivo.id)}
                            disabled={procesandoComplementario}
                          >
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="col-12 col-lg-6">
                  <h4 className="h6 fw-bold">Productos, insumos y equipos</h4>
                  <form onSubmit={agregarElemento} className="row g-2 align-items-end mb-3">
                    <div className="col-12 col-sm-7">
                      <label htmlFor="nombre_insumo" className="form-label small fw-semibold">
                        Nombre
                      </label>
                      <input
                        type="text"
                        id="nombre_insumo"
                        className="form-control form-control-sm"
                        value={formInsumo.nombre}
                        onChange={(event) => setFormInsumo((prev) => ({ ...prev, nombre: event.target.value }))}
                        placeholder="Ej: Aceite de almendras"
                        maxLength={150}
                        disabled={procesandoComplementario}
                      />
                    </div>
                    <div className="col-12 col-sm-5">
                      <label htmlFor="tipo_insumo" className="form-label small fw-semibold">
                        Tipo
                      </label>
                      <select
                        id="tipo_insumo"
                        className="form-select form-select-sm"
                        value={formInsumo.tipo}
                        onChange={(event) => setFormInsumo((prev) => ({ ...prev, tipo: event.target.value }))}
                        disabled={procesandoComplementario}
                      >
                        <option value="insumo">Insumo</option>
                        <option value="equipo">Equipo</option>
                      </select>
                    </div>
                    <div className="col-12 d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={procesandoComplementario}>
                        Agregar elemento
                      </button>
                    </div>
                  </form>

                  {insumos.length === 0 ? (
                    <p className="text-muted small mb-0">No hay productos, insumos o equipos asociados.</p>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {insumos.map((elemento) => (
                        <li
                          key={elemento.id}
                          className="list-group-item d-flex justify-content-between align-items-center px-0"
                        >
                          <span className="small">
                            {elemento.nombre}{' '}
                            <span className="text-muted">
                              ({elemento.tipo === 'equipo' ? 'Equipo' : 'Insumo'})
                            </span>
                          </span>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => quitarElemento(elemento.id)}
                            disabled={procesandoComplementario}
                          >
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
