import React, { useEffect, useMemo, useRef, useState } from 'react';
import { consultarProveedorPorId } from '../Servicios/exploracionService';
import {
  AlertaError,
  BotonVolver,
  EstadoVacio,
  IndicadorCarga,
  TarjetaServicio,
  esErrorNoEncontrado,
  obtenerIniciales,
  obtenerMensajeError,
} from './ExploracionComun';

const NOTA_ZONAS =
  'Las zonas de atención son orientativas. Consulta directamente con el proveedor la disponibilidad para tu ubicación.';

const agruparZonasPorCiudad = (zonas) => {
  const grupos = new Map();

  zonas.forEach((zona) => {
    const ciudad =
      typeof zona?.ciudad === 'string' && zona.ciudad.trim()
        ? zona.ciudad.trim()
        : 'Ciudad no especificada';
    const sector =
      typeof zona?.barrio_sector === 'string' && zona.barrio_sector.trim()
        ? zona.barrio_sector.trim()
        : null;

    if (!grupos.has(ciudad)) {
      grupos.set(ciudad, { sectores: [], cubreTodaLaCiudad: false });
    }
    if (sector) {
      grupos.get(ciudad).sectores.push(sector);
    } else {
      grupos.get(ciudad).cubreTodaLaCiudad = true;
    }
  });

  return Array.from(grupos.entries()).map(([ciudad, datos]) => ({
    ciudad,
    ...datos,
  }));
};

/**
 * PerfilProveedorPublico (HU-010)
 *
 * CA-01: información profesional, zonas y catálogo.
 * CA-02: estado específico cuando no hay zonas registradas.
 * CA-03: zonas presentadas únicamente como información orientativa.
 * CA-06: estado específico cuando el proveedor no existe.
 */
export const PerfilProveedorPublico = ({
  idProveedor,
  onVolverExploracion,
  onVerDetalleServicio,
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

    if (
      idProveedor === null ||
      idProveedor === undefined ||
      idProveedor === ''
    ) {
      setEstado({ cargando: false, data: null, error: null });
      return () => {
        activo = false;
        controlador.abort();
      };
    }

    setEstado({ cargando: true, data: null, error: null });

    const cargarPerfil = async () => {
      try {
        const data = await consultarProveedorPorId(idProveedor, {
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

    cargarPerfil();

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [idProveedor, intento]);

  const zonas = useMemo(
    () =>
      Array.isArray(estado.data?.zonasAtencion) ? estado.data.zonasAtencion : [],
    [estado.data]
  );
  const catalogo = Array.isArray(estado.data?.catalogo) ? estado.data.catalogo : [];
  const zonasPorCiudad = useMemo(() => agruparZonasPorCiudad(zonas), [zonas]);

  const nombreCompleto = [estado.data?.nombre, estado.data?.apellido]
    .filter(Boolean)
    .join(' ');

  const encabezadoVolver = onVolverExploracion ? (
    <div className="mb-3">
      <BotonVolver onClick={onVolverExploracion}>Volver a la exploración</BotonVolver>
    </div>
  ) : null;

  if (estado.cargando) {
    return (
      <section aria-labelledby="perfil-proveedor-cargando">
        {encabezadoVolver}
        <h2 id="perfil-proveedor-cargando" className="h4 fw-semibold text-dark mb-3">
          Perfil del proveedor
        </h2>
        <IndicadorCarga texto="Cargando información del proveedor..." />
      </section>
    );
  }

  if (estado.error) {
    if (esErrorNoEncontrado(estado.error)) {
      return (
        <section aria-labelledby="perfil-proveedor-no-encontrado">
          <EstadoVacio titulo="No se encontró el proveedor solicitado.">
            <p className="small text-muted mb-3">
              Es posible que el enlace haya cambiado o que el proveedor ya no esté disponible.
            </p>
            {onVolverExploracion && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onVolverExploracion}
              >
                Volver a la exploración
              </button>
            )}
          </EstadoVacio>
          <h2 id="perfil-proveedor-no-encontrado" className="visually-hidden">
            Proveedor no encontrado
          </h2>
        </section>
      );
    }

    return (
      <section aria-labelledby="perfil-proveedor-error">
        {encabezadoVolver}
        <h2 id="perfil-proveedor-error" className="h4 fw-semibold text-dark mb-3">
          Perfil del proveedor
        </h2>
        <AlertaError
          mensaje={obtenerMensajeError(
            estado.error,
            'No fue posible cargar la información del proveedor.'
          )}
          onReintentar={() => setIntento((valor) => valor + 1)}
        />
      </section>
    );
  }

  if (!estado.data) {
    return (
      <section aria-labelledby="perfil-proveedor-sin-datos">
        {encabezadoVolver}
        <EstadoVacio titulo="No se encontró el proveedor solicitado.">
          <p className="small text-muted mb-0">
            No hay información disponible para mostrar.
          </p>
        </EstadoVacio>
        <h2 id="perfil-proveedor-sin-datos" className="visually-hidden">
          Proveedor no encontrado
        </h2>
      </section>
    );
  }

  const proveedor = estado.data;

  return (
    <section aria-labelledby="perfil-proveedor-titulo">
      {encabezadoVolver}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4 d-flex flex-column flex-sm-row align-items-sm-center gap-3">
          <span
            className="rounded-circle bg-primary-subtle text-primary-emphasis d-inline-flex align-items-center justify-content-center fw-bold flex-shrink-0"
            style={{ width: '4rem', height: '4rem', fontSize: '1.25rem' }}
            aria-hidden="true"
          >
            {obtenerIniciales(proveedor.nombre, proveedor.apellido)}
          </span>
          <div className="text-center text-sm-start">
            <h2 id="perfil-proveedor-titulo" className="h4 fw-bold text-dark mb-1">
              {nombreCompleto || 'Proveedor'}
            </h2>
            <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">
              Proveedor de servicios
            </span>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h3 className="h5 fw-semibold text-dark mb-3">Información profesional</h3>
          {proveedor.perfil_profesional ? (
            <p className="text-secondary mb-0" style={{ whiteSpace: 'pre-wrap' }}>
              {proveedor.perfil_profesional}
            </p>
          ) : (
            <p className="text-muted fst-italic mb-0">
              Este proveedor aún no ha registrado una descripción profesional.
            </p>
          )}
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h3 className="h5 fw-semibold text-dark mb-0">Zonas generales de atención</h3>
            <span className="badge bg-light text-dark border">
              {zonas.length} {zonas.length === 1 ? 'zona' : 'zonas'}
            </span>
          </div>

          {zonas.length > 0 ? (
            <div className="row g-3">
              {zonasPorCiudad.map(({ ciudad, sectores, cubreTodaLaCiudad }) => (
                <div className="col-12 col-md-6" key={ciudad}>
                  <div className="border rounded p-3 h-100 bg-light">
                    <h4 className="h6 fw-semibold text-dark mb-2">{ciudad}</h4>
                    {cubreTodaLaCiudad && (
                      <p className="small text-muted mb-1">
                        Toda la ciudad o sector general
                      </p>
                    )}
                    {sectores.length > 0 && (
                      <ul className="list-unstyled small mb-0">
                        {sectores.map((sector, index) => (
                          <li key={`${ciudad}-${sector}-${index}`} className="mb-1">
                            <span className="text-primary me-1" aria-hidden="true">
                              •
                            </span>
                            {sector}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-info mb-0" role="status">
              Este proveedor aún no tiene zonas generales de atención registradas.
            </div>
          )}

          <p className="small text-muted mt-3 mb-0">
            <strong>Información orientativa:</strong> {NOTA_ZONAS}
          </p>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h3 className="h5 fw-semibold text-dark mb-0">Catálogo de servicios</h3>
            <span className="badge bg-light text-dark border">
              {catalogo.length} {catalogo.length === 1 ? 'servicio' : 'servicios'}
            </span>
          </div>

          {catalogo.length > 0 ? (
            <div className="row g-4">
              {catalogo.map((servicio) => (
                <div className="col-12 col-md-6" key={servicio.id}>
                  <TarjetaServicio
                    servicio={servicio}
                    mostrarProveedor={false}
                    onVerDetalle={onVerDetalleServicio}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-info mb-0" role="status">
              Este proveedor todavía no tiene servicios disponibles en su catálogo.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
