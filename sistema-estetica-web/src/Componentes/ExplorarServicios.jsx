import React, { useEffect, useMemo, useRef, useState } from 'react';
import { obtenerCategorias } from '../Servicios/servicioService';
import {
  obtenerProveedoresDisponibles,
  obtenerServiciosDisponibles,
  buscarServiciosPorCategoria,
  buscarServiciosPorNombre,
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
import { SolicitudServicio } from './SolicitudServicio';

/**
 * ExplorarServicios (HU-009) con navegación de HU-010.
 *
 * Permite al Cliente:
 *   - Consultar proveedores y buscar servicios activos (HU-009).
 *   - Abrir el perfil público de un proveedor (HU-010).
 *   - Abrir el detalle de un servicio y regresar conservando la búsqueda.
 *
 * Todos los datos provienen de los endpoints públicos de /api/exploracion y
 * /api/categorias. No se generan proveedores, servicios ni categorías de ejemplo.
 */

const RETRASO_BUSQUEDA_MS = 350;

const TarjetaProveedor = ({ proveedor, onVerPerfil }) => {
  const nombreCompleto = [proveedor?.nombre, proveedor?.apellido].filter(Boolean).join(' ');

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
            <span className="badge bg-light text-dark border">Proveedor de servicios</span>
          </div>
        </div>

        {proveedor?.perfil_profesional ? (
          <p
            className="small text-secondary mb-3"
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
          <p className="small text-muted fst-italic mb-3">
            Este proveedor aún no ha registrado una descripción profesional.
          </p>
        )}

        <button
          type="button"
          className="btn btn-outline-primary btn-sm align-self-start mt-auto"
          onClick={() => onVerPerfil(proveedor.id)}
        >
          Ver perfil y catálogo
        </button>
      </div>
    </article>
  );
};

export const ExplorarServicios = ({ sesion }) => {
  // Proveedores disponibles (HU-009 CA-01)
  const [proveedores, setProveedores] = useState([]);
  const [cargandoProveedores, setCargandoProveedores] = useState(true);
  const [errorProveedores, setErrorProveedores] = useState(null);
  const [recargaProveedores, setRecargaProveedores] = useState(0);

  // Categorías reales para el filtro (HU-009 CA-02)
  const [categorias, setCategorias] = useState([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [errorCategorias, setErrorCategorias] = useState(null);
  const [recargaCategorias, setRecargaCategorias] = useState(0);

  // Servicios activos y criterios de búsqueda (HU-009 CA-02, CA-03, CA-04)
  const [servicios, setServicios] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [errorServicios, setErrorServicios] = useState(null);
  const [recargaServicios, setRecargaServicios] = useState(0);

  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [criterioBusqueda, setCriterioBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

  // Navegación interna de HU-010. Al cambiar de vista, el estado de búsqueda
  // permanece en este componente para recuperarlo al regresar.
  const [vista, setVista] = useState({ tipo: 'exploracion' });

  const solicitudServiciosRef = useRef(0);

  const categoriaActual = useMemo(
    () =>
      categorias.find(
        (categoria) => String(categoria.id_categoria) === String(categoriaSeleccionada)
      ) || null,
    [categorias, categoriaSeleccionada]
  );

  const hayCriterios = Boolean(criterioBusqueda || categoriaActual);

  const irAlInicio = () => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } catch {
        // En entornos de prueba algunos navegadores simulados no aceptan opciones.
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

  // HU-012: inicia la creación de la solicitud conservando el servicio y el
  // Proveedor que el Cliente ya seleccionó en HU-010.
  const abrirSolicitudServicio = (idServicioSeleccionado, idProveedorServicio) => {
    setVista({
      tipo: 'solicitud',
      idServicio: idServicioSeleccionado,
      idProveedor: idProveedorServicio ?? null,
    });
    irAlInicio();
  };

  const volverADetalleDesdeSolicitud = () => {
    setVista({
      tipo: 'servicio',
      idServicio: vista.idServicio,
      idProveedor: vista.idProveedor ?? null,
    });
    irAlInicio();
  };

  const abrirServicioDesdePerfil = (servicio) => {
    abrirDetalleServicio(servicio.id, vista.idProveedor ?? servicio.id_proveedor);
  };

  // Aplica un pequeño retraso para no lanzar una petición por cada tecla.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setCriterioBusqueda(textoBusqueda.trim());
    }, RETRASO_BUSQUEDA_MS);

    return () => clearTimeout(temporizador);
  }, [textoBusqueda]);

  // Categorías desde el endpoint real /api/categorias.
  useEffect(() => {
    let cancelado = false;
    setCargandoCategorias(true);
    setErrorCategorias(null);

    const cargarCategorias = async () => {
      try {
        const data = await obtenerCategorias();
        if (cancelado) return;

        const lista = Array.isArray(data)
          ? data.filter(
              (categoria) =>
                categoria &&
                categoria.id_categoria !== null &&
                categoria.id_categoria !== undefined &&
                typeof categoria.nombre === 'string' &&
                categoria.nombre.trim()
            )
          : [];

        setCategorias(lista);
        if (lista.length === 0) {
          setErrorCategorias('No hay categorías disponibles en este momento.');
        }
      } catch (err) {
        if (cancelado) return;
        setCategorias([]);
        setErrorCategorias(
          err?.message || 'No fue posible cargar las categorías disponibles.'
        );
      } finally {
        if (!cancelado) setCargandoCategorias(false);
      }
    };

    cargarCategorias();
    return () => {
      cancelado = true;
    };
  }, [recargaCategorias]);

  // Si las categorías se recargan y la seleccionada deja de existir, se limpia.
  useEffect(() => {
    if (!cargandoCategorias && categoriaSeleccionada && !categoriaActual) {
      setCategoriaSeleccionada('');
    }
  }, [cargandoCategorias, categoriaSeleccionada, categoriaActual]);

  // Proveedores disponibles (HU-009 CA-01).
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
          err?.message || 'No fue posible consultar los proveedores disponibles.'
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

  // Servicios según los criterios activos. Se cancelan y descartan respuestas obsoletas.
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
        const idCategoria = categoriaActual ? categoriaActual.id_categoria : null;
        let data;

        if (nombre && idCategoria !== null) {
          // El backend no expone un endpoint combinado. Se usa la búsqueda real
          // por nombre y se filtra por categoría sobre la respuesta completa
          // (sin paginación) para no inventar parámetros de consulta.
          const coincidencias = await buscarServiciosPorNombre(nombre, opciones);
          data = (Array.isArray(coincidencias) ? coincidencias : []).filter(
            (servicio) => servicio && servicio.categoria === categoriaActual.nombre
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

  // ─── Acciones de búsqueda ──────────────────────────────────────────────────

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
    // Aplica de inmediato el texto ya escrito, sin esperar el retraso.
    setCriterioBusqueda(textoBusqueda.trim());
  };

  const limpiarFiltros = () => {
    setTextoBusqueda('');
    setCriterioBusqueda('');
    setCategoriaSeleccionada('');
  };

  const quitarFiltroNombre = () => {
    setTextoBusqueda('');
    setCriterioBusqueda('');
  };

  const reintentarServicios = () => setRecargaServicios((valor) => valor + 1);

  // ─── Vistas de HU-010 ──────────────────────────────────────────────────────

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
        puedeSolicitar={Boolean(sesion?.token && sesion?.rol === 'cliente')}
        onSolicitarServicio={abrirSolicitudServicio}
      />
    );
  }

  if (vista.tipo === 'solicitud') {
    return (
      <SolicitudServicio
        idServicio={vista.idServicio}
        idProveedor={vista.idProveedor}
        sesion={sesion}
        onVolverDetalle={volverADetalleDesdeSolicitud}
        onVolverExploracion={volverAExploracion}
      />
    );
  }

  // ─── Vista de exploración (HU-009) ─────────────────────────────────────────

  return (
    <section aria-labelledby="exploracion-titulo">
      <div className="rounded-3 border bg-primary-subtle text-primary-emphasis p-3 p-md-4 mb-4">
        <h3 id="exploracion-titulo" className="h4 fw-bold mb-2">
          Explora servicios y proveedores
        </h3>
        <p className="mb-0 small">
          Busca por nombre o categoría, conoce a los profesionales disponibles y consulta el
          detalle de sus servicios antes de solicitar. Las zonas de atención son información
          orientativa.
        </p>
      </div>

      {/* Búsqueda y filtros */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={handleSubmitBusqueda} role="search">
            <div className="col-12 col-lg-5">
              <label htmlFor="explorar-nombre" className="form-label small fw-semibold">
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
                aria-describedby="explorar-nombre-ayuda"
              />
              <div id="explorar-nombre-ayuda" className="form-text">
                Puedes escribir una parte del nombre. Se ignoran los espacios al inicio y al final.
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-4">
              <label htmlFor="explorar-categoria" className="form-label small fw-semibold">
                Filtrar por categoría
              </label>
              <select
                id="explorar-categoria"
                className="form-select"
                value={categoriaSeleccionada}
                onChange={handleCambioCategoria}
                disabled={cargandoCategorias || Boolean(errorCategorias) || categorias.length === 0}
                aria-describedby={errorCategorias ? 'explorar-categoria-error' : undefined}
              >
                <option value="">
                  {cargandoCategorias
                    ? 'Cargando categorías...'
                    : errorCategorias || categorias.length === 0
                      ? 'Categorías no disponibles'
                      : 'Todas las categorías'}
                </option>
                {categorias.map((categoria) => (
                  <option key={categoria.id_categoria} value={categoria.id_categoria}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-lg-3 d-grid">
              <button type="submit" className="btn btn-primary">
                Buscar
              </button>
            </div>
          </form>

          {errorCategorias && (
            <div
              id="explorar-categoria-error"
              className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 mb-0"
              role="alert"
            >
              <span>
                {errorCategorias} Puedes buscar por nombre o reintentar la carga de categorías.
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                onClick={() => setRecargaCategorias((valor) => valor + 1)}
              >
                Reintentar categorías
              </button>
            </div>
          )}

          {hayCriterios && (
            <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
              <span className="small text-muted">Criterios activos:</span>

              {criterioBusqueda && (
                <span className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle d-inline-flex align-items-center gap-2">
                  Nombre: “{criterioBusqueda}”
                  <button
                    type="button"
                    className="btn-close btn-close-sm"
                    style={{ fontSize: '0.6rem' }}
                    aria-label="Quitar filtro de nombre"
                    onClick={quitarFiltroNombre}
                  />
                </span>
              )}

              {categoriaActual && (
                <span className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle d-inline-flex align-items-center gap-2">
                  Categoría: {categoriaActual.nombre}
                  <button
                    type="button"
                    className="btn-close btn-close-sm"
                    style={{ fontSize: '0.6rem' }}
                    aria-label="Quitar filtro de categoría"
                    onClick={() => setCategoriaSeleccionada('')}
                  />
                </span>
              )}

              <button type="button" className="btn btn-link btn-sm p-0" onClick={limpiarFiltros}>
                Limpiar búsqueda y filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resultados de servicios */}
      <div className="mb-5" aria-busy={cargandoServicios}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h3 className="h5 fw-semibold text-dark mb-1">
              {hayCriterios ? 'Resultados de la búsqueda' : 'Servicios disponibles'}
            </h3>
            <p className="small text-muted mb-0">Se muestran únicamente servicios activos.</p>
          </div>
          {!cargandoServicios && !errorServicios && (
            <span className="badge bg-light text-dark border">
              {servicios.length} {servicios.length === 1 ? 'servicio' : 'servicios'}
            </span>
          )}
        </div>

        {cargandoServicios && (
          <IndicadorCarga
            texto={servicios.length > 0 ? 'Actualizando resultados...' : 'Cargando servicios...'}
          />
        )}

        {errorServicios && (
          <AlertaError mensaje={errorServicios} onReintentar={reintentarServicios} />
        )}

        {!errorServicios && (
          <div className="row g-4">
            {servicios.map((servicio) => (
              <div className="col-12 col-md-6 col-xl-4" key={servicio.id}>
                <TarjetaServicio
                  servicio={servicio}
                  onVerDetalle={(servicioSeleccionado) =>
                    abrirDetalleServicio(
                      servicioSeleccionado.id,
                      servicioSeleccionado.id_proveedor
                    )
                  }
                />
              </div>
            ))}
          </div>
        )}

        {!cargandoServicios && !errorServicios && servicios.length === 0 && (
          <EstadoVacio
            titulo={
              hayCriterios
                ? 'No se encontraron servicios con los criterios seleccionados.'
                : 'No hay servicios activos disponibles en este momento.'
            }
          >
            <p className="small text-muted mb-3">
              {hayCriterios
                ? 'Puedes modificar el nombre, elegir otra categoría o limpiar los filtros para volver a explorar la oferta.'
                : 'Intenta recargar la información o vuelve a consultar más tarde.'}
            </p>
            <div className="d-flex flex-wrap justify-content-center gap-2">
              {hayCriterios ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={limpiarFiltros}>
                  Limpiar búsqueda y filtros
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={reintentarServicios}>
                  Recargar servicios
                </button>
              )}
            </div>
          </EstadoVacio>
        )}
      </div>

      {/* Proveedores disponibles */}
      <div aria-busy={cargandoProveedores}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h3 className="h5 fw-semibold text-dark mb-1">Proveedores disponibles</h3>
            <p className="small text-muted mb-0">
              Profesionales con al menos un servicio activo registrado.
            </p>
          </div>
          {!cargandoProveedores && !errorProveedores && (
            <span className="badge bg-light text-dark border">
              {proveedores.length} {proveedores.length === 1 ? 'proveedor' : 'proveedores'}
            </span>
          )}
        </div>

        {cargandoProveedores && <IndicadorCarga texto="Cargando proveedores..." />}

        {errorProveedores && (
          <AlertaError
            mensaje={errorProveedores}
            onReintentar={() => setRecargaProveedores((valor) => valor + 1)}
          />
        )}

        {!cargandoProveedores && !errorProveedores && proveedores.length > 0 && (
          <div className="row g-4">
            {proveedores.map((proveedor) => (
              <div className="col-12 col-lg-6" key={proveedor.id}>
                <TarjetaProveedor proveedor={proveedor} onVerPerfil={abrirPerfilProveedor} />
              </div>
            ))}
          </div>
        )}

        {!cargandoProveedores && !errorProveedores && proveedores.length === 0 && (
          <EstadoVacio titulo="No hay proveedores disponibles en este momento.">
            <p className="small text-muted mb-3">
              Los proveedores aparecerán aquí cuando tengan servicios activos registrados.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setRecargaProveedores((valor) => valor + 1)}
            >
              Recargar proveedores
            </button>
          </EstadoVacio>
        )}
      </div>
    </section>
  );
};
