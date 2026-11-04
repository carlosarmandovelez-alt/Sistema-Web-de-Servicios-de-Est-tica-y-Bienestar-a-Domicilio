import React, { useCallback, useEffect, useState } from 'react';
import {
  consultarProveedor,
  consultarServicio,
  listarProveedores,
  listarServicios,
} from '../Servicios/exploracionService';
import { formatearPrecio } from './solicitudComunes';

const normalizar = (texto) => (texto || '').toString().trim().toLowerCase();

export const ExplorarServicios = ({ onSolicitar }) => {
  const [proveedores, setProveedores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [proveedorDetalle, setProveedorDetalle] = useState(null);
  const [detalleServicio, setDetalleServicio] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const [datosProveedores, datosServicios] = await Promise.all([listarProveedores(), listarServicios()]);
      setProveedores(Array.isArray(datosProveedores) ? datosProveedores : []);
      setServicios(Array.isArray(datosServicios) ? datosServicios : []);
    } catch (err) {
      setError(err.message || 'No fue posible consultar la oferta de servicios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const categorias = Array.from(new Set(servicios.map((servicio) => servicio.categoria).filter(Boolean))).sort();

  const criterio = normalizar(busqueda);
  const serviciosFiltrados = servicios.filter((servicio) => {
    const coincideCategoria = categoria === 'todas' || servicio.categoria === categoria;
    const coincideTexto =
      !criterio ||
      normalizar(servicio.nombre).includes(criterio) ||
      normalizar(servicio.descripcion).includes(criterio) ||
      normalizar(servicio.nombre_proveedor).includes(criterio);

    return coincideCategoria && coincideTexto;
  });

  const verProveedor = async (idProveedor) => {
    setCargandoDetalle(true);
    setErrorDetalle(null);

    try {
      const detalle = await consultarProveedor(idProveedor);
      setProveedorDetalle(detalle);
      setDetalleServicio(null);
    } catch (err) {
      setErrorDetalle(err.message || 'No fue posible consultar el perfil del proveedor.');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const verServicio = async (idServicio) => {
    setCargandoDetalle(true);
    setErrorDetalle(null);

    try {
      const detalle = await consultarServicio(idServicio);
      setDetalleServicio(detalle);
    } catch (err) {
      setErrorDetalle(err.message || 'No fue posible consultar el detalle del servicio.');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const solicitar = (servicio, proveedor) => {
    if (!onSolicitar) {
      return;
    }

    onSolicitar(servicio, proveedor);
  };

  if (cargando) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="text-muted mt-3 mb-0">Cargando proveedores y servicios...</p>
      </div>
    );
  }

  if (detalleServicio) {
    return (
      <div>
        <button type="button" className="btn btn-outline-secondary btn-sm mb-3" onClick={() => setDetalleServicio(null)}>
          Volver
        </button>

        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
              <div>
                <span className="badge text-bg-light border mb-2">{detalleServicio.categoria}</span>
                <h2 className="h4 mb-1">{detalleServicio.nombre}</h2>
                <p className="text-muted small mb-0">
                  Ofrecido por {detalleServicio.nombre_proveedor} · {detalleServicio.duracion_minutos} min
                </p>
              </div>
              <strong className="fs-5 text-primary">{formatearPrecio(detalleServicio.precio)}</strong>
            </div>

            {detalleServicio.descripcion && (
              <p className="mt-3 mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {detalleServicio.descripcion}
              </p>
            )}

            <div className="row g-4 mt-1">
              <div className="col-12 col-lg-6">
                <h3 className="h6 text-uppercase text-muted fw-bold">Fotografías y videos</h3>
                {(!detalleServicio.multimedia || detalleServicio.multimedia.length === 0) && (
                  <p className="text-muted small mb-0">Este servicio no tiene contenido multimedia registrado.</p>
                )}
                <div className="d-flex flex-wrap gap-2">
                  {(detalleServicio.multimedia || []).map((archivo) =>
                    archivo.tipo_archivo === 'foto' ? (
                      <a
                        key={archivo.id}
                        href={archivo.url_archivo}
                        target="_blank"
                        rel="noreferrer"
                        className="text-decoration-none"
                      >
                        <img
                          src={archivo.url_archivo}
                          alt={`Referencia de ${detalleServicio.nombre}`}
                          className="rounded border"
                          style={{ width: '120px', height: '90px', objectFit: 'cover' }}
                        />
                      </a>
                    ) : (
                      <a
                        key={archivo.id}
                        href={archivo.url_archivo}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline-secondary btn-sm"
                      >
                        Ver video
                      </a>
                    )
                  )}
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <h3 className="h6 text-uppercase text-muted fw-bold">Productos, insumos y equipos</h3>
                {(!detalleServicio.insumos || detalleServicio.insumos.length === 0) && (
                  <p className="text-muted small mb-0">Este servicio no tiene insumos o equipos registrados.</p>
                )}
                {detalleServicio.insumos && detalleServicio.insumos.length > 0 && (
                  <ul className="list-group list-group-flush">
                    {detalleServicio.insumos.map((elemento) => (
                      <li key={elemento.id} className="list-group-item px-0 py-2 small">
                        {elemento.nombre}{' '}
                        <span className="text-muted">({elemento.tipo === 'equipo' ? 'Equipo' : 'Insumo'})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="d-flex justify-content-end mt-4">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  solicitar(detalleServicio, {
                    id: detalleServicio.id_proveedor,
                    nombre: detalleServicio.nombre_proveedor,
                  })
                }
              >
                Solicitar este servicio
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (proveedorDetalle) {
    return (
      <div>
        <button type="button" className="btn btn-outline-secondary btn-sm mb-3" onClick={() => setProveedorDetalle(null)}>
          Volver a la exploración
        </button>

        {errorDetalle && (
          <div className="alert alert-danger py-2 px-3 small" role="alert">
            {errorDetalle}
          </div>
        )}

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h4 mb-1">
              {proveedorDetalle.nombre} {proveedorDetalle.apellido}
            </h2>
            <p className="text-muted small mb-0">Perfil del proveedor</p>
            {proveedorDetalle.perfil_profesional && (
              <p className="mt-3 mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {proveedorDetalle.perfil_profesional}
              </p>
            )}
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h3 className="h5 mb-0">Zonas generales de atención</h3>
          </div>
          <div className="card-body">
            {!proveedorDetalle.zonasAtencion || proveedorDetalle.zonasAtencion.length === 0 ? (
              <p className="text-muted small mb-0">Este proveedor no tiene zonas de atención registradas.</p>
            ) : (
              <div className="d-flex flex-wrap gap-2">
                {proveedorDetalle.zonasAtencion.map((zona, index) => (
                  <span key={`${zona.ciudad}-${index}`} className="badge text-bg-light border">
                    {zona.ciudad}
                    {zona.barrio_sector ? ` · ${zona.barrio_sector}` : ''}
                  </span>
                ))}
              </div>
            )}
            <p className="text-muted small mt-3 mb-0">
              Las zonas son información orientativa; no representan una validación automática de cobertura.
            </p>
          </div>
        </div>

        <h3 className="h5 mb-3">Catálogo disponible</h3>
        {!proveedorDetalle.catalogo || proveedorDetalle.catalogo.length === 0 ? (
          <div className="text-center py-4 border rounded bg-light">
            <p className="text-muted mb-0">Este proveedor no tiene servicios activos en este momento.</p>
          </div>
        ) : (
          <div className="row g-3">
            {proveedorDetalle.catalogo.map((servicio) => (
              <div key={servicio.id} className="col-12 col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-body d-flex flex-column">
                    <span className="badge text-bg-light border align-self-start mb-2">{servicio.categoria}</span>
                    <h4 className="h6 mb-1">{servicio.nombre}</h4>
                    <p className="text-muted small mb-2">
                      {servicio.duracion_minutos} min · {formatearPrecio(servicio.precio)}
                    </p>
                    {servicio.descripcion && (
                      <p className="small text-muted flex-grow-1" style={{ whiteSpace: 'pre-wrap' }}>
                        {servicio.descripcion}
                      </p>
                    )}
                    <div className="d-flex gap-2 mt-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => verServicio(servicio.id)}
                        disabled={cargandoDetalle}
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => solicitar(servicio, proveedorDetalle)}
                      >
                        Solicitar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Explorar proveedores y servicios</h2>
          <p className="text-muted small mb-0">
            Busca servicios por nombre o categoría y consulta el perfil de cada proveedor antes de solicitar (HU-009 y
            HU-010).
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cargar}>
          Actualizar
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 small" role="alert">
          {error}
        </div>
      )}

      {errorDetalle && (
        <div className="alert alert-danger py-2 px-3 small" role="alert">
          {errorDetalle}
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-6">
              <label htmlFor="busqueda" className="form-label small fw-semibold">
                Buscar por nombre
              </label>
              <input
                type="search"
                id="busqueda"
                className="form-control"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Ej: masaje relajante"
              />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="categoria" className="form-label small fw-semibold">
                Categoría
              </label>
              <select
                id="categoria"
                className="form-select"
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
              >
                <option value="todas">Todas las categorías</option>
                {categorias.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setBusqueda('');
                  setCategoria('todas');
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      <h3 className="h5 mb-3">Proveedores disponibles</h3>
      {proveedores.length === 0 ? (
        <div className="text-center py-4 border rounded bg-light mb-4">
          <p className="text-muted mb-0">No hay proveedores disponibles con servicios activos.</p>
        </div>
      ) : (
        <div className="row g-3 mb-4">
          {proveedores.map((proveedor) => (
            <div key={proveedor.id} className="col-12 col-md-6 col-xl-4">
              <div className="card shadow-sm h-100">
                <div className="card-body d-flex flex-column">
                  <h4 className="h6 mb-1">
                    {proveedor.nombre} {proveedor.apellido}
                  </h4>
                  <p className="small text-muted flex-grow-1 mb-3" style={{ whiteSpace: 'pre-wrap' }}>
                    {proveedor.perfil_profesional || 'Sin descripción profesional registrada.'}
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm align-self-start"
                    onClick={() => verProveedor(proveedor.id)}
                    disabled={cargandoDetalle}
                  >
                    Ver perfil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="h5 mb-3">Servicios disponibles</h3>
      {serviciosFiltrados.length === 0 ? (
        <div className="text-center py-5 border rounded bg-light">
          <p className="text-muted mb-1">No se encontraron servicios.</p>
          <p className="text-muted small mb-0">Prueba con otro nombre o categoría.</p>
        </div>
      ) : (
        <div className="row g-3">
          {serviciosFiltrados.map((servicio) => (
            <div key={servicio.id} className="col-12 col-md-6 col-xl-4">
              <div className="card shadow-sm h-100">
                <div className="card-body d-flex flex-column">
                  <span className="badge text-bg-light border align-self-start mb-2">{servicio.categoria}</span>
                  <h4 className="h6 mb-1">{servicio.nombre}</h4>
                  <p className="text-muted small mb-2">
                    {servicio.nombre_proveedor} · {servicio.duracion_minutos} min
                  </p>
                  {servicio.descripcion && (
                    <p className="small text-muted flex-grow-1" style={{ whiteSpace: 'pre-wrap' }}>
                      {servicio.descripcion}
                    </p>
                  )}
                  <p className="fw-bold text-primary mb-3">{formatearPrecio(servicio.precio)}</p>
                  <div className="d-flex gap-2 mt-auto">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => verServicio(servicio.id)}
                      disabled={cargandoDetalle}
                    >
                      Ver detalle
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        solicitar(servicio, {
                          id: servicio.id_proveedor,
                          nombre: servicio.nombre_proveedor,
                        })
                      }
                    >
                      Solicitar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
