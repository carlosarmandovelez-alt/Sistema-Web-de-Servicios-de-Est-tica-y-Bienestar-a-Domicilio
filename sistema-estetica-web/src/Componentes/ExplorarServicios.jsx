import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIAS_PMV } from '../config/categorias';
import { obtenerCategorias } from '../Servicios/servicioService';
import {
  buscarServiciosPorCategoria,
  buscarServiciosPorNombre,
  obtenerProveedoresDisponibles,
  obtenerServiciosDisponibles,
} from '../Servicios/exploracionService';
import {
  AlertaError,
  EstadoVacio,
  IndicadorCarga,
  TarjetaServicio,
  obtenerIniciales,
} from './ExploracionComun';
import { PerfilProveedorPublico } from './PerfilProveedorPublico';
import { DetalleServicio } from './DetalleServicio';

const RETRASO_BUSQUEDA_MS = 350;

const TarjetaProveedor = ({ proveedor, onVerPerfil }) => {
  const nombreCompleto = [proveedor?.nombre, proveedor?.apellido]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className="card h-100 shadow-sm border-0"
      aria-label={`Proveedor ${nombreCompleto || 'sin nombre'}`}
    >
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-center gap-3 mb-3">
          <span
            className="rounded-circle bg-primary-subtle text-primary-emphasis d-inline-flex align-items-center justify-content-center fw-bold flex-shrink-0"
            style={{ width: '3rem', height: '3rem' }}
            aria-hidden="true"
          >
            {obtenerIniciales(proveedor?.nombre, proveedor?.apellido)}
          </span>
          <div>
            <h4 className="h6 fw-semibold text-dark mb-1">
              {nombreCompleto || 'Proveedor'}
            </h4>
            <span className="badge bg-light text-dark border">
              Proveedor de servicios
            </span>
          </div>
        </div>

        {proveedor?.perfil_profesional ? (
          <p
            className="small text-secondary mb-0"
            style={{
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {proveedor.perfil_profesional}
          </p>
        ) : (
          <p className="small text-muted fst-italic mb-0">
            Este proveedor aún no ha registrado una descripción profesional.
          </p>
        )}

        {typeof onVerPerfil === 'function' && (
          <button
            type="button"
            className="btn btn-outline-primary btn-sm align-self-start mt-3"
            onClick={() => onVerPerfil(proveedor.id)}
          >
            Ver perfil y catálogo
          </button>
        )}
      </div>
    </article>
  );
};

export const ExplorarServicios = () => {
  const [proveedores, setProveedores] = useState([]);
  const [cargandoProveedores, setCargandoProveedores] = useState(true);
  const [errorProveedores, setErrorProveedores] = useState(null);
  const [recargaProveedores, setRecargaProveedores] = useState(0);

  const [categorias, setCategorias] = useState(CATEGORIAS_PMV);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);

  const [servicios, setServicios] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [errorServicios, setErrorServicios] = useState(null);
  const [recargaServicios, setRecargaServicios] = useState(0);

  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [criterioBusqueda, setCriterioBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

  const solicitudServiciosRef = useRef(0);
  const [vista, setVista] = useState({ tipo: 'exploracion' });

  const irAlInicio = () => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } catch {
        /* algunos navegadores simulados no aceptan opciones */
      }
    }
  };

  const abrirPerfilProveedor = (idProveedor) => {
    setVista({ tipo: 'proveedor', idProveedor });
    irAlInicio();
  };

  const abrirDetalleServicio = (idServicio, idProveedorServicio) => {
    setVista({
      tipo: 'servicio',
      idServicio,
      idProveedor: idProveedorServicio ?? null,
    });
    irAlInicio();
  };

  const volverAExploracion = () => {
    setVista({ tipo: 'exploracion' });
    irAlInicio();
  };

  const volverAProveedor = () => {
    if (vista.idProveedor) {
      setVista({ tipo: 'proveedor', idProveedor: vista.idProveedor });
      irAlInicio();
    } else {
      volverAExploracion();
    }
  };

  const abrirServicioDesdePerfil = (servicio) => {
    abrirDetalleServicio(servicio.id, vista.idProveedor ?? servicio.id_proveedor);
  };

  const categoriaActual = useMemo(
    () =>
      categorias.find(
        (categoria) =>
          String(categoria.id_categoria ?? categoria.id) ===
          String(categoriaSeleccionada)
      ) || null,
    [categorias, categoriaSeleccionada]
  );

  const hayCriterios = Boolean(criterioBusqueda || categoriaActual);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setCriterioBusqueda(textoBusqueda.trim());
    }, RETRASO_BUSQUEDA_MS);

    return () => clearTimeout(temporizador);
  }, [textoBusqueda]);

  useEffect(() => {
    let cancelado = false;
    setCargandoCategorias(true);

    const cargarCategorias = async () => {
      try {
        const data = await obtenerCategorias();
        if (cancelado) return;

        const lista = Array.isArray(data)
          ? data.filter(
              (categoria) =>
                categoria &&
                (categoria.id_categoria ?? categoria.id) != null &&
                typeof categoria.nombre === 'string' &&
                categoria.nombre.trim()
            )
          : [];

        if (lista.length > 0) {
          setCategorias(lista);
        }
      } catch {
        if (!cancelado) {
          setCategorias(CATEGORIAS_PMV);
        }
      } finally {
        if (!cancelado) setCargandoCategorias(false);
      }
    };

    cargarCategorias();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargandoProveedores(true);
    setErrorProveedores(null);

    const cargarProveedores = async () => {
      try {
        const data = await obtenerProveedoresDisponibles();
        if (cancelado) return;
        setProveedores(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelado) return;
        setProveedores([]);
        setErrorProveedores(
          err?.message ||
            'No fue posible consultar los proveedores disponibles.'
        );
      } finally {
        if (!cancelado) setCargandoProveedores(false);
      }
    };

    cargarProveedores();
    return () => {
      cancelado = true;
    };
  }, [recargaProveedores]);

  useEffect(() => {
    const controlador = new AbortController();
    const idSolicitud = solicitudServiciosRef.current + 1;
    solicitudServiciosRef.current = idSolicitud;
    let activo = true;

    const cargarServicios = async () => {
      setCargandoServicios(true);
      setErrorServicios(null);

      try {
        const opciones = { signal: controlador.signal };
        const nombre = criterioBusqueda.trim();
        const idCategoria =
          categoriaActual?.id_categoria ?? categoriaActual?.id ?? null;
        let data;

        if (nombre && idCategoria !== null) {
          const coincidencias = await buscarServiciosPorNombre(
            nombre,
            opciones
          );
          data = (Array.isArray(coincidencias) ? coincidencias : []).filter(
            (servicio) =>
              servicio && servicio.categoria === categoriaActual.nombre
          );
        } else if (nombre) {
          data = await buscarServiciosPorNombre(nombre, opciones);
        } else if (idCategoria !== null) {
          data = await buscarServiciosPorCategoria(idCategoria, opciones);
        } else {
          data = await obtenerServiciosDisponibles(opciones);
        }

        if (!activo || idSolicitud !== solicitudServiciosRef.current) return;
        setServicios(Array.isArray(data) ? data : []);
      } catch (err) {
        if (
          !activo ||
          idSolicitud !== solicitudServiciosRef.current ||
          err?.name === 'AbortError'
        ) {
          return;
        }
        setServicios([]);
        setErrorServicios(
          err?.message || 'No fue posible cargar los servicios disponibles.'
        );
      } finally {
        if (activo && idSolicitud === solicitudServiciosRef.current) {
          setCargandoServicios(false);
        }
      }
    };

    cargarServicios();
    return () => {
      activo = false;
      controlador.abort();
    };
  }, [criterioBusqueda, categoriaActual, recargaServicios]);

  const handleSubmitBusqueda = (event) => {
    event.preventDefault();
    const criterio = textoBusqueda.trim();
    if (criterio === criterioBusqueda) {
      setRecargaServicios((valor) => valor + 1);
    } else {
      setCriterioBusqueda(criterio);
    }
  };

  const handleCambioCategoria = (event) => {
    setCategoriaSeleccionada(event.target.value);
    setCriterioBusqueda(textoBusqueda.trim());
  };

  const limpiarFiltros = () => {
    setTextoBusqueda('');
    setCriterioBusqueda('');
    setCategoriaSeleccionada('');
  };

  if (vista.tipo === 'proveedor') {
    return (
      <PerfilProveedorPublico
        idProveedor={vista.idProveedor}
        onVolverExploracion={volverAExploracion}
        onVerDetalleServicio={abrirServicioDesdePerfil}
      />
    );
  }

  if (vista.tipo === 'servicio') {
    return (
      <DetalleServicio
        idServicio={vista.idServicio}
        idProveedor={vista.idProveedor}
        onVolverProveedor={vista.idProveedor ? volverAProveedor : null}
        onVolverExploracion={volverAExploracion}
        onVerProveedor={abrirPerfilProveedor}
        puedeSolicitar={false}
      />
    );
  }

  return (
    <section aria-labelledby="exploracion-titulo">
      <div className="rounded-3 border bg-primary-subtle text-primary-emphasis p-3 p-md-4 mb-4">
        <h3 id="exploracion-titulo" className="h4 fw-bold mb-2">
          Explora servicios y proveedores
        </h3>
        <p className="mb-0 small">
          Consulta los profesionales disponibles y busca servicios activos por
          nombre o categoría antes de solicitar una cita a domicilio.
        </p>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <form
            className="row g-3 align-items-end"
            onSubmit={handleSubmitBusqueda}
            role="search"
          >
            <div className="col-12 col-lg-5">
              <label
                htmlFor="explorar-nombre"
                className="form-label small fw-semibold"
              >
                Buscar servicio por nombre
              </label>
              <input
                type="search"
                id="explorar-nombre"
                className="form-control"
                value={textoBusqueda}
                onChange={(event) => setTextoBusqueda(event.target.value)}
                placeholder="Ej: masaje, facial, manicura..."
                autoComplete="off"
              />
            </div>

            <div className="col-12 col-md-6 col-lg-4">
              <label
                htmlFor="explorar-categoria"
                className="form-label small fw-semibold"
              >
                Categoría
              </label>
              <select
                id="explorar-categoria"
                className="form-select"
                value={categoriaSeleccionada}
                onChange={handleCambioCategoria}
                disabled={cargandoCategorias}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((categoria) => {
                  const id = categoria.id_categoria ?? categoria.id;
                  return (
                    <option key={id} value={id}>
                      {categoria.nombre}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-3 d-flex gap-2">
              <button type="submit" className="btn btn-primary flex-grow-1">
                Buscar
              </button>
              {hayCriterios && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={limpiarFiltros}
                >
                  Limpiar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <section className="mb-5" aria-labelledby="proveedores-titulo">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 id="proveedores-titulo" className="h5 fw-bold mb-0">
            Proveedores disponibles
          </h3>
          {!cargandoProveedores && !errorProveedores && (
            <span className="badge bg-light text-dark border">
              {proveedores.length}{' '}
              {proveedores.length === 1 ? 'proveedor' : 'proveedores'}
            </span>
          )}
        </div>

        {cargandoProveedores ? (
          <IndicadorCarga texto="Consultando proveedores disponibles..." />
        ) : errorProveedores ? (
          <AlertaError
            mensaje={errorProveedores}
            onReintentar={() => setRecargaProveedores((valor) => valor + 1)}
          />
        ) : proveedores.length === 0 ? (
          <EstadoVacio titulo="No hay proveedores disponibles">
            <p className="small text-muted mb-0">
              Aún no existen proveedores con servicios activos para mostrar.
            </p>
          </EstadoVacio>
        ) : (
          <div className="row g-3">
            {proveedores.map((proveedor) => (
              <div className="col-12 col-md-6" key={proveedor.id}>
                <TarjetaProveedor
                  proveedor={proveedor}
                  onVerPerfil={abrirPerfilProveedor}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="servicios-titulo">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h3 id="servicios-titulo" className="h5 fw-bold mb-0">
            Servicios activos
          </h3>
          <span className="small text-muted">
            {categoriaActual
              ? `Categoría: ${categoriaActual.nombre}`
              : 'Todas las categorías'}
            {criterioBusqueda ? ` · Búsqueda: “${criterioBusqueda}”` : ''}
          </span>
        </div>

        {cargandoServicios ? (
          <IndicadorCarga texto="Buscando servicios..." />
        ) : errorServicios ? (
          <AlertaError
            mensaje={errorServicios}
            onReintentar={() => setRecargaServicios((valor) => valor + 1)}
          />
        ) : servicios.length === 0 ? (
          <EstadoVacio titulo="No se encontraron servicios">
            <p className="small text-muted mb-3">
              {hayCriterios
                ? 'Prueba con otro nombre o categoría.'
                : 'Aún no hay servicios activos disponibles.'}
            </p>
            {hayCriterios && (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={limpiarFiltros}
              >
                Ver todos los servicios
              </button>
            )}
          </EstadoVacio>
        ) : (
          <>
            <p className="small text-muted mb-3" role="status">
              {servicios.length}{' '}
              {servicios.length === 1
                ? 'servicio encontrado'
                : 'servicios encontrados'}
            </p>
            <div className="row g-3">
              {servicios.map((servicio) => (
                <div className="col-12 col-md-6 col-xl-4" key={servicio.id}>
                  <TarjetaServicio
                    servicio={servicio}
                    onVerDetalle={() =>
                      abrirDetalleServicio(
                        servicio.id,
                        servicio.id_proveedor ?? null
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  );
};
