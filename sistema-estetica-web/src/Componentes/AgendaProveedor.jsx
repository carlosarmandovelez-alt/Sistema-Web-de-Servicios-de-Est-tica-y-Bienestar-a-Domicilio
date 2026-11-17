import React, { useEffect, useMemo, useState } from 'react';
import { consultarAgendaProveedor } from '../Servicios/solicitudService';
import {
  AlertaError,
  EstadoVacio,
  IndicadorCarga,
  obtenerMensajeError,
} from './ExploracionComun';
import {
  formatearLocalDateTime,
  parsearLocalDateTime,
} from './solicitudUtilidades';

const formatearDia = (fecha) => {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;

  const texto = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(fecha);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const obtenerHora = (valor, fecha) => {
  if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(fecha);
  }
  return formatearLocalDateTime(valor) || 'No informada';
};

export const AgendaProveedor = ({ token, onCerrarSesion }) => {
  const [agenda, setAgenda] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    let activo = true;

    setCargando(true);
    setError(null);

    const cargar = async () => {
      try {
        const data = await consultarAgendaProveedor(token, {
          signal: controlador.signal,
        });
        if (!activo) return;
        setAgenda(data);
      } catch (err) {
        if (!activo || err?.name === 'AbortError') return;
        setAgenda([]);
        setError(err);
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [token, intento]);

  const grupos = useMemo(() => {
    const mapa = new Map();

    agenda.forEach((reserva) => {
      const inicio = parsearLocalDateTime(reserva.fecha_hora_inicio);
      const clave = inicio
        ? `${inicio.getFullYear()}-${inicio.getMonth()}-${inicio.getDate()}`
        : 'sin-fecha';

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          fecha: inicio,
          reservas: [],
        });
      }

      mapa.get(clave).reservas.push({
        ...reserva,
        inicio,
        fin: parsearLocalDateTime(reserva.fecha_hora_fin),
      });
    });

    return Array.from(mapa.values()).sort((a, b) => {
      if (a.fecha && b.fecha) return a.fecha - b.fecha;
      if (a.fecha) return -1;
      if (b.fecha) return 1;
      return a.clave.localeCompare(b.clave);
    });
  }, [agenda]);

  const errorAutenticacion =
    error?.status === 401 ||
    error?.status === 403 ||
    error?.esErrorAutenticacion;

  if (cargando && agenda.length === 0) {
    return <IndicadorCarga texto="Consultando tu agenda de reservas..." />;
  }

  if (error) {
    return (
      <AlertaError
        mensaje={
          errorAutenticacion
            ? 'No tienes autorización para consultar la agenda. Tu sesión puede haber expirado.'
            : obtenerMensajeError(error, 'No fue posible consultar la agenda.')
        }
        onReintentar={() => setIntento((valor) => valor + 1)}
      >
        {errorAutenticacion && onCerrarSesion && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={onCerrarSesion}
          >
            Cerrar sesión
          </button>
        )}
      </AlertaError>
    );
  }

  if (agenda.length === 0) {
    return (
      <EstadoVacio titulo="Tu agenda está vacía">
        <p className="small text-muted mb-0">
          Cuando tengas reservas aceptadas, aparecerán aquí ordenadas por fecha.
        </p>
      </EstadoVacio>
    );
  }

  return (
    <section aria-labelledby="agenda-titulo">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h3 id="agenda-titulo" className="h4 fw-bold text-dark mb-1">
            Agenda de reservas
          </h3>
          <p className="text-muted mb-0">
            Reservas aceptadas ordenadas por fecha de atención.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => setIntento((valor) => valor + 1)}
          disabled={cargando}
        >
          Actualizar
        </button>
      </div>

      {grupos.map((grupo) => (
        <section key={grupo.clave} className="mb-4">
          <h4 className="h6 fw-semibold text-secondary border-bottom pb-2 mb-3">
            {formatearDia(grupo.fecha) || 'Fecha no informada'}
          </h4>

          <div className="row g-3">
            {grupo.reservas.map((reserva) => (
              <div
                className="col-12 col-lg-6"
                key={reserva.id_solicitud ?? `${grupo.clave}-${reserva.nombre_servicio}`}
              >
                <article className="card h-100 shadow-sm border-0">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <h5 className="h6 fw-semibold text-dark mb-0">
                        {reserva.nombre_servicio || 'Servicio no informado'}
                      </h5>
                      <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                        {obtenerHora(reserva.fecha_hora_inicio, reserva.inicio)}
                        {reserva.fin
                          ? ` – ${obtenerHora(reserva.fecha_hora_fin, reserva.fin)}`
                          : ''}
                      </span>
                    </div>

                    <dl className="row g-1 small mb-0">
                      <dt className="col-4 text-muted fw-normal">Cliente</dt>
                      <dd className="col-8 mb-1 text-dark">
                        {reserva.nombre_cliente || 'No informado'}
                      </dd>

                      <dt className="col-4 text-muted fw-normal">Dirección</dt>
                      <dd className="col-8 mb-1 text-dark">
                        {reserva.direccion_texto || 'No informada'}
                      </dd>

                      <dt className="col-4 text-muted fw-normal">Barrio</dt>
                      <dd className="col-8 mb-0 text-dark">
                        {reserva.barrio_sector || 'No informado'}
                      </dd>
                    </dl>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
};
