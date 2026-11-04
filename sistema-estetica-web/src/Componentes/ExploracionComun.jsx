import React from 'react';

/**
 * Elementos compartidos por las pantallas de exploración (HU-009) y de
 * perfil/detalle (HU-010). Se mantienen en un único módulo para no duplicar
 * tarjetas, formatos ni estados de carga/error.
 */

export const formatearPrecio = (precio) => {
  if (precio === null || precio === undefined || precio === '') return null;
  const numero = Number(precio);
  if (!Number.isFinite(numero)) return null;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
  }).format(numero);
};

export const formatearDuracion = (duracion) => {
  const minutos = Number(duracion);
  if (!Number.isFinite(minutos) || minutos <= 0) return null;
  return `${minutos} min`;
};

export const formatearDuracionDetallada = (duracion) => {
  const minutos = Number(duracion);
  if (!Number.isFinite(minutos) || minutos <= 0) return null;

  if (minutos < 60) {
    return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  const textoHoras = `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return resto === 0 ? textoHoras : `${textoHoras} y ${resto} minutos`;
};

export const obtenerIniciales = (nombre, apellido) => {
  const partes = [nombre, apellido].filter(Boolean);
  if (partes.length === 0) return 'P';
  return partes
    .map((parte) => String(parte).trim().charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const obtenerMensajeError = (err, fallback) => {
  if (err && typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return fallback;
};

export const esErrorNoEncontrado = (err) => err?.status === 404;

export const IndicadorCarga = ({ texto }) => (
  <div
    className="d-flex align-items-center gap-2 text-muted py-3"
    role="status"
    aria-live="polite"
  >
    <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
    <span>{texto}</span>
  </div>
);

export const AlertaError = ({
  mensaje,
  onReintentar,
  textoReintentar = 'Reintentar',
  children,
}) => (
  <div
    className="alert alert-danger d-flex flex-wrap justify-content-between align-items-center gap-2"
    role="alert"
  >
    <span>{mensaje}</span>
    <div className="d-flex flex-wrap align-items-center gap-2">
      {children}
      {onReintentar && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onReintentar}>
          {textoReintentar}
        </button>
      )}
    </div>
  </div>
);

export const EstadoVacio = ({ titulo, children }) => (
  <div className="text-center py-5 px-3 border rounded bg-light" role="status">
    <p className="fw-semibold mb-2">{titulo}</p>
    {children}
  </div>
);

export const BotonVolver = ({ onClick, children }) => (
  <button
    type="button"
    className="btn btn-link btn-sm p-0 text-decoration-none align-self-start"
    onClick={onClick}
  >
    <span aria-hidden="true">← </span>
    {children}
  </button>
);

export const TarjetaServicio = ({
  servicio,
  mostrarProveedor = true,
  onVerDetalle,
}) => {
  const precio = formatearPrecio(servicio?.precio);
  const duracion = formatearDuracion(servicio?.duracion_minutos);
  const nombre = servicio?.nombre || 'Servicio sin nombre';

  return (
    <article className="card h-100 shadow-sm border-0" aria-label={`Servicio ${nombre}`}>
      <div className="card-body d-flex flex-column">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <h4 className="h6 fw-semibold text-dark mb-0">{nombre}</h4>
          {servicio?.categoria && (
            <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">
              {servicio.categoria}
            </span>
          )}
        </div>

        {servicio?.descripcion && (
          <p className="small text-secondary mb-3" style={{ whiteSpace: 'pre-wrap' }}>
            {servicio.descripcion}
          </p>
        )}

        <dl className="row g-1 small mb-0 mt-auto">
          {duracion && (
            <>
              <dt className="col-5 text-muted fw-normal mb-0">Duración estimada</dt>
              <dd className="col-7 mb-0 text-dark">{duracion}</dd>
            </>
          )}
          {precio && (
            <>
              <dt className="col-5 text-muted fw-normal mb-0">Precio</dt>
              <dd className="col-7 mb-0 fw-semibold text-primary">{precio}</dd>
            </>
          )}
          {mostrarProveedor && servicio?.nombre_proveedor && (
            <>
              <dt className="col-5 text-muted fw-normal mb-0">Proveedor</dt>
              <dd className="col-7 mb-0 text-dark">{servicio.nombre_proveedor}</dd>
            </>
          )}
        </dl>

        {typeof onVerDetalle === 'function' && (
          <div className="pt-3 mt-3 border-top">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => onVerDetalle(servicio)}
              aria-label={`Ver detalle de ${nombre}`}
            >
              Ver detalle del servicio
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
