import React, { useEffect, useRef, useState } from 'react';
import { consultarServicioPorId } from '../Servicios/exploracionService';
import {
  AlertaError,
  BotonVolver,
  EstadoVacio,
  IndicadorCarga,
  esErrorNoEncontrado,
  formatearDuracionDetallada,
  formatearPrecio,
  obtenerMensajeError,
} from './ExploracionComun';

const ETIQUETAS_INSUMO = {
  producto: 'Producto',
  insumo: 'Insumo',
  equipo: 'Equipo',
};

const esVideoEmbebible = (url) =>
  typeof url === 'string' && /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

const ItemMultimedia = ({ item, nombreServicio, indice }) => {
  const [errorImagen, setErrorImagen] = useState(false);
  const url = item?.url_archivo;
  const tipo = item?.tipo_archivo;

  if (!url) return null;

  if (tipo === 'foto') {
    if (errorImagen) {
      return (
        <div
          className="border rounded bg-light d-flex align-items-center justify-content-center text-muted small p-4"
          style={{ minHeight: '160px' }}
          role="status"
        >
          No fue posible cargar esta imagen.
        </div>
      );
    }

    return (
      <img
        src={url}
        alt={`${nombreServicio} - imagen ${indice + 1}`}
        className="img-fluid rounded border"
        style={{ width: '100%', maxHeight: '320px', objectFit: 'cover' }}
        loading="lazy"
        onError={() => setErrorImagen(true)}
      />
    );
  }

  if (tipo === 'video') {
    return (
      <div>
        {esVideoEmbebible(url) ? (
          <div className="ratio ratio-16x9 bg-dark rounded overflow-hidden mb-2">
            <video
              controls
              preload="metadata"
              aria-label={`Video de ${nombreServicio}`}
            >
              <source src={url} />
              Tu navegador no puede reproducir este video.
            </video>
          </div>
        ) : null}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline-primary btn-sm"
        >
          Abrir video de referencia
        </a>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-outline-secondary btn-sm"
    >
      Abrir contenido multimedia
    </a>
  );
};

/**
 * DetalleServicio (HU-010)
 *
 * CA-04: nombre, categoría, descripción, precio, duración, multimedia e insumos.
 * CA-05: funcionamiento correcto cuando no hay multimedia ni insumos.
 * CA-07: estado específico cuando el servicio no existe.
 */
export const DetalleServicio = ({
  idServicio,
  idProveedor,
  onVolverProveedor,
  onVolverExploracion,
  onVerProveedor,
  puedeSolicitar = false,
  onSolicitarServicio,
}) => {
  const [estado, setEstado] = useState({
    cargando: true,
    data: null,
    error: null,
  });
  const [intento, setIntento] = useState(0);
  const solicitudRef = useRef(0);

  useEffect(() => {
    const controlador = new AbortController();
    const idSolicitud = solicitudRef.current + 1;
    solicitudRef.current = idSolicitud;
    let activo = true;

    if (idServicio === null || idServicio === undefined || idServicio === '') {
      setEstado({ cargando: false, data: null, error: null });
      return () => {
        activo = false;
        controlador.abort();
      };
    }

    setEstado({ cargando: true, data: null, error: null });

    const cargarDetalle = async () => {
      try {
        const data = await consultarServicioPorId(idServicio, {
          signal: controlador.signal,
        });
        if (!activo || idSolicitud !== solicitudRef.current) return;
        setEstado({ cargando: false, data: data || null, error: null });
      } catch (err) {
        if (
          !activo ||
          idSolicitud !== solicitudRef.current ||
          err?.name === 'AbortError'
        ) {
          return;
        }
        setEstado({ cargando: false, data: null, error: err });
      }
    };

    cargarDetalle();

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [idServicio, intento]);

  const servicio = estado.data;
  const idProveedorDestino = servicio?.id_proveedor ?? idProveedor;
  const nombreServicio = servicio?.nombre || 'Servicio sin nombre';

  const botonesVolver = (
    <div className="d-flex flex-wrap gap-3 mb-3">
      {onVolverProveedor && idProveedorDestino && (
        <BotonVolver onClick={onVolverProveedor}>
          Volver al perfil del proveedor
        </BotonVolver>
      )}
      {onVolverExploracion && (
        <BotonVolver onClick={onVolverExploracion}>Volver a la exploración</BotonVolver>
      )}
    </div>
  );

  if (estado.cargando) {
    return (
      <section aria-labelledby="detalle-servicio-cargando">
        {botonesVolver}
        <h2 id="detalle-servicio-cargando" className="h4 fw-semibold text-dark mb-3">
          Detalle del servicio
        </h2>
        <IndicadorCarga texto="Cargando detalle del servicio..." />
      </section>
    );
  }

  if (estado.error) {
    if (esErrorNoEncontrado(estado.error)) {
      return (
        <section aria-labelledby="detalle-servicio-no-encontrado">
          <EstadoVacio titulo="No se encontró el servicio solicitado.">
            <p className="small text-muted mb-3">
              Es posible que el servicio haya cambiado o que ya no esté disponible en el catálogo.
            </p>
            <div className="d-flex flex-wrap justify-content-center gap-2">
              {onVolverProveedor && idProveedorDestino && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onVolverProveedor}
                >
                  Volver al perfil del proveedor
                </button>
              )}
              {onVolverExploracion && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={onVolverExploracion}
                >
                  Volver a la exploración
                </button>
              )}
            </div>
          </EstadoVacio>
          <h2 id="detalle-servicio-no-encontrado" className="visually-hidden">
            Servicio no encontrado
          </h2>
        </section>
      );
    }

    return (
      <section aria-labelledby="detalle-servicio-error">
        {botonesVolver}
        <h2 id="detalle-servicio-error" className="h4 fw-semibold text-dark mb-3">
          Detalle del servicio
        </h2>
        <AlertaError
          mensaje={obtenerMensajeError(
            estado.error,
            'No fue posible cargar el detalle del servicio.'
          )}
          onReintentar={() => setIntento((valor) => valor + 1)}
        />
      </section>
    );
  }

  if (!servicio) {
    return (
      <section aria-labelledby="detalle-servicio-sin-datos">
        {botonesVolver}
        <EstadoVacio titulo="No se encontró el servicio solicitado.">
          <p className="small text-muted mb-0">
            No hay información disponible para mostrar.
          </p>
        </EstadoVacio>
        <h2 id="detalle-servicio-sin-datos" className="visually-hidden">
          Servicio no encontrado
        </h2>
      </section>
    );
  }

  const multimedia = (Array.isArray(servicio.multimedia) ? servicio.multimedia : []).filter(
    (item) => item && typeof item.url_archivo === 'string' && item.url_archivo.trim()
  );
  const insumos = Array.isArray(servicio.insumos) ? servicio.insumos : [];
  const precio = formatearPrecio(servicio.precio);
  const duracion = formatearDuracionDetallada(servicio.duracion_minutos);

  return (
    <section aria-labelledby="detalle-servicio-titulo">
      {botonesVolver}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
            <div>
              <h2 id="detalle-servicio-titulo" className="h3 fw-bold text-dark mb-2">
                {nombreServicio}
              </h2>
              {servicio.categoria && (
                <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                  {servicio.categoria}
                </span>
              )}
            </div>
            <div className="text-md-end">
              <p className="h4 fw-bold text-primary mb-1">
                {precio || 'Precio no disponible'}
              </p>
              <p className="small text-muted mb-0">
                Duración: {duracion || 'No disponible'}
              </p>
              {puedeSolicitar && typeof onSolicitarServicio === 'function' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm mt-3"
                  onClick={() => onSolicitarServicio(servicio.id, idProveedorDestino)}
                >
                  Solicitar este servicio
                </button>
              )}
            </div>
          </div>

          <hr className="my-3" />

          <h3 className="h6 fw-semibold text-dark">Descripción</h3>
          {servicio.descripcion ? (
            <p className="text-secondary mb-0" style={{ whiteSpace: 'pre-wrap' }}>
              {servicio.descripcion}
            </p>
          ) : (
            <p className="text-muted fst-italic mb-0">Sin descripción registrada.</p>
          )}
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <div>
            <h3 className="h6 fw-semibold text-dark mb-1">Proveedor</h3>
            <p className="mb-0 text-secondary">
              {servicio.nombre_proveedor || 'Proveedor no especificado'}
            </p>
          </div>
          {onVerProveedor && idProveedorDestino && (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm align-self-start align-self-sm-center"
              onClick={() => onVerProveedor(idProveedorDestino)}
            >
              Ver perfil del proveedor
            </button>
          )}
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h3 className="h5 fw-semibold text-dark mb-0">Fotografías y videos</h3>
            <span className="badge bg-light text-dark border">
              {multimedia.length} {multimedia.length === 1 ? 'elemento' : 'elementos'}
            </span>
          </div>

          {multimedia.length > 0 ? (
            <div className="row g-3">
              {multimedia.map((item, index) => (
                <div className="col-12 col-md-6" key={item.id ?? `${item.url_archivo}-${index}`}>
                  <ItemMultimedia
                    item={item}
                    nombreServicio={nombreServicio}
                    indice={index}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-info mb-0" role="status">
              Este servicio no tiene fotografías ni videos asociados.
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h3 className="h5 fw-semibold text-dark mb-0">
              Productos, insumos o equipos
            </h3>
            <span className="badge bg-light text-dark border">
              {insumos.length} {insumos.length === 1 ? 'elemento' : 'elementos'}
            </span>
          </div>

          {insumos.length > 0 ? (
            <>
              <ul className="list-group list-group-flush mb-2">
                {insumos.map((insumo, index) => (
                  <li
                    className="list-group-item d-flex justify-content-between align-items-center px-0"
                    key={insumo.id ?? `${insumo.nombre}-${index}`}
                  >
                    <span className="text-dark">{insumo.nombre || 'Elemento sin nombre'}</span>
                    <span className="badge bg-secondary-subtle text-secondary-emphasis">
                      {ETIQUETAS_INSUMO[insumo.tipo] || insumo.tipo || 'Elemento'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="small text-muted mb-0">
                Elementos utilizados durante la prestación del servicio.
              </p>
            </>
          ) : (
            <div className="alert alert-info mb-0" role="status">
              Este servicio no tiene productos, insumos o equipos asociados.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
