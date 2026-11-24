import React, { useEffect, useState } from 'react';
import { consultarAgenda } from '../Servicios/solicitudService';
import {
  AlertaError,
  EstadoVacio,
  IndicadorCarga,
  formatearDuracionDetallada,
  obtenerMensajeError,
} from './ExploracionComun';
import {
  formatearFecha,
  formatearHora,
  mismaFechaLocal,
  parsearLocalDateTime,
} from './solicitudUtilidades';
import {
  describirPeriodoAgenda,
  obtenerDuracionAgenda,
  obtenerFinAgenda,
} from './agendaUtilidades';

/**
 * HU-019: agenda cronológica de reservas Aceptadas del Proveedor.
 *
 * El backend filtra por el Proveedor autenticado y por estado `aceptada`, y
 * ordena por fecha y hora de inicio. Esta vista es exclusivamente de consulta:
 * no acepta, rechaza, propone, cancela ni completa reservas.
 */

const AccesoRestringido = ({ sesion, onCerrarSesion }) => (
  <section aria-labelledby="mi-agenda-acceso-restringido">
    <EstadoVacio titulo="No puedes consultar la agenda desde esta sesión.">
      <p className="small text-muted mb-3">
        {sesion?.token
          ? 'Esta sección está disponible únicamente para Proveedores autenticados.'
          : 'Inicia sesión con una cuenta de Proveedor para consultar tu agenda.'}
      </p>
      {onCerrarSesion && sesion?.token && (
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={onCerrarSesion}>
          Cerrar sesión
        </button>
      )}
    </EstadoVacio>
    <h2 id="mi-agenda-acceso-restringido" className="visually-hidden">
      Acceso restringido
    </h2>
  </section>
);

const PanelAgenda = ({ sesion, onCerrarSesion }) => {
  const [agenda, setAgenda] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    const controlador = new AbortController();

    setCargando(true);
    setError(null);
    setAgenda([]);

    const cargarAgenda = async () => {
      try {
        const data = await consultarAgenda(sesion.token, {
          signal: controlador.signal,
        });

        if (!activo) return;

        setAgenda(Array.isArray(data) ? data.filter(Boolean) : []);
      } catch (errorConsulta) {
        if (!activo || errorConsulta?.name === 'AbortError') return;
        setAgenda([]);
        setError(errorConsulta);
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarAgenda();

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [sesion.token, intento]);

  const reintentar = () => {
    setCargando(true);
    setError(null);
    setIntento((valor) => valor + 1);
  };

  const total = agenda.length;
  const errorAutenticacion =
    error?.status === 401 ||
    error?.status === 403 ||
    error?.esErrorAutenticacion;

  return (
    <section aria-labelledby="mi-agenda-titulo" aria-busy={cargando}>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h2 id="mi-agenda-titulo" className="h3 fw-bold text-dark mb-1">
            Mi agenda
          </h2>
          <p className="text-muted mb-0">
            Consulta cronológica de tus reservas aceptadas, con el periodo
            comprometido y la dirección de atención.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {!cargando && !error && total > 0 && (
            <span className="badge bg-light text-dark border">
              {total} {total === 1 ? 'reserva' : 'reservas'}
            </span>
          )}
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={reintentar}
            disabled={cargando}
          >
            Actualizar
          </button>
        </div>
      </div>

      {cargando && (
        <IndicadorCarga
          texto={
            total > 0
              ? 'Actualizando tu agenda...'
              : 'Consultando tu agenda de reservas aceptadas...'
          }
        />
      )}

      {!cargando && error && (
        <AlertaError
          mensaje={
            errorAutenticacion
              ? 'No tienes autorización para consultar la agenda. Tu sesión puede haber expirado.'
              : obtenerMensajeError(
                  error,
                  'No fue posible consultar tu agenda. Verifica tu conexión e inténtalo de nuevo.'
                )
          }
          onReintentar={reintentar}
        >
          {errorAutenticacion && onCerrarSesion && (
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={onCerrarSesion}>
              Cerrar sesión
            </button>
          )}
        </AlertaError>
      )}

      {!cargando && !error && total === 0 && (
        <EstadoVacio titulo="No tienes reservas aceptadas para mostrar en tu agenda.">
          <p className="small text-muted mb-0">
            Cuando una solicitud quede Aceptada, aparecerá aquí ordenada por fecha
            y hora de inicio. La disponibilidad habitual se gestiona en la sección
            Disponibilidad.
          </p>
        </EstadoVacio>
      )}

      {!cargando && !error && total > 0 && (
        <>
          <p className="small text-muted mb-3">
            Ordenadas por fecha y hora de inicio, de la más próxima a la más lejana.
          </p>
          <div className="row g-3">
            {agenda.map((reserva) => {
              const inicio = parsearLocalDateTime(reserva.fecha_hora_inicio);
              const fin = obtenerFinAgenda(reserva);
              const periodo = describirPeriodoAgenda(reserva);
              const duracion = formatearDuracionDetallada(
                obtenerDuracionAgenda(reserva)
              );
              const nombreServicio =
                reserva.nombre_servicio || 'Servicio no informado';
              const nombreCliente =
                reserva.nombre_cliente || 'Cliente no informado';

              return (
                <div className="col-12" key={reserva.id_solicitud}>
                  <article
                    className="card shadow-sm border-0 border-start border-4 border-primary"
                    aria-label={`Reserva ${reserva.id_solicitud}: ${nombreServicio}. ${periodo || 'Horario no informado'}`}
                  >
                    <div className="card-body">
                      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                        <div>
                          <p className="small text-muted mb-1">
                            Reserva #{reserva.id_solicitud}
                          </p>
                          <h3 className="h5 fw-semibold text-dark mb-1">
                            {nombreServicio}
                          </h3>
                          <p className="small text-secondary mb-0">
                            Cliente: {nombreCliente}
                          </p>
                        </div>
                        <span
                          className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle"
                          aria-label="Estado actual: Aceptada"
                        >
                          Aceptada
                        </span>
                      </div>

                      <p className="fs-5 fw-semibold text-primary mt-3 mb-3">
                        {periodo || 'Horario no informado'}
                      </p>

                      <dl className="row g-2 small mb-0">
                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Fecha de atención
                        </dt>
                        <dd className="col-7 col-sm-9 mb-0 text-dark">
                          {inicio ? formatearFecha(inicio) : 'No informada'}
                        </dd>

                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Hora de inicio
                        </dt>
                        <dd className="col-7 col-sm-9 mb-0 text-dark">
                          {inicio ? formatearHora(inicio) : 'No informada'}
                        </dd>

                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Hora de finalización
                        </dt>
                        <dd className="col-7 col-sm-9 mb-0 text-dark">
                          {fin ? formatearHora(fin) : 'No disponible'}
                          {fin && inicio && !mismaFechaLocal(inicio, fin)
                            ? ` del ${formatearFecha(fin)}`
                            : ''}
                        </dd>

                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Duración histórica
                        </dt>
                        <dd className="col-7 col-sm-9 mb-0 text-dark">
                          {duracion || 'No disponible'}
                        </dd>

                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Dirección de atención
                        </dt>
                        <dd className="col-7 col-sm-9 mb-0 text-dark">
                          {reserva.direccion_texto || 'No informada'}
                        </dd>

                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Barrio o sector
                        </dt>
                        <dd className="col-7 col-sm-9 mb-0 text-dark">
                          {reserva.barrio_sector || 'No informado'}
                        </dd>
                      </dl>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

/**
 * La comprobación de rol es una defensa adicional. La autorización definitiva
 * la realiza Spring Security y el backend a partir del JWT.
 */
export const MiAgenda = ({ sesion, onCerrarSesion }) => {
  if (!sesion?.token || sesion?.rol !== 'proveedor') {
    return <AccesoRestringido sesion={sesion} onCerrarSesion={onCerrarSesion} />;
  }

  return <PanelAgenda sesion={sesion} onCerrarSesion={onCerrarSesion} />;
};
