import React, { useCallback, useEffect, useState } from 'react';
import {
  crearDisponibilidad,
  crearPeriodoNoDisponible,
  eliminarDisponibilidad,
  eliminarPeriodoNoDisponible,
  listarDisponibilidad,
  listarPeriodosNoDisponibles,
} from '../Servicios/disponibilidadService';

const DIAS = [
  { valor: 'lunes', texto: 'Lunes' },
  { valor: 'martes', texto: 'Martes' },
  { valor: 'miercoles', texto: 'Miércoles' },
  { valor: 'jueves', texto: 'Jueves' },
  { valor: 'viernes', texto: 'Viernes' },
  { valor: 'sabado', texto: 'Sábado' },
  { valor: 'domingo', texto: 'Domingo' },
];

const etiquetaDia = (valor) => DIAS.find((dia) => dia.valor === valor)?.texto || valor;

const esErrorDeBackendPendiente = (err) => err?.status === 404 || err?.status === 405 || err?.status === 501;

export const DisponibilidadProveedor = ({ sesion }) => {
  const [franjas, setFranjas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [modoLocal, setModoLocal] = useState(false);
  const [formFranja, setFormFranja] = useState({
    dia_semana: 'lunes',
    hora_inicio: '08:00',
    hora_fin: '12:00',
  });
  const [formPeriodo, setFormPeriodo] = useState({ fecha_inicio: '', fecha_fin: '' });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const [datosFranjas, datosPeriodos] = await Promise.all([
        listarDisponibilidad(sesion.token),
        listarPeriodosNoDisponibles(sesion.token),
      ]);
      setFranjas(Array.isArray(datosFranjas) ? datosFranjas : []);
      setPeriodos(Array.isArray(datosPeriodos) ? datosPeriodos : []);
      setModoLocal(false);
    } catch (err) {
      if (esErrorDeBackendPendiente(err)) {
        setModoLocal(true);
        setFranjas([]);
        setPeriodos([]);
      } else {
        setError(err.message || 'No fue posible consultar la disponibilidad.');
      }
    } finally {
      setCargando(false);
    }
  }, [sesion.token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregarFranja = async (event) => {
    event.preventDefault();
    setError(null);
    setExito(null);

    if (!formFranja.hora_inicio || !formFranja.hora_fin) {
      setError('Indica la hora inicial y la hora final.');
      return;
    }

    if (formFranja.hora_inicio >= formFranja.hora_fin) {
      setError('La hora inicial debe ser anterior a la hora final.');
      return;
    }

    const duplicada = franjas.some(
      (franja) =>
        franja.dia_semana === formFranja.dia_semana &&
        franja.hora_inicio === formFranja.hora_inicio &&
        franja.hora_fin === formFranja.hora_fin
    );

    if (duplicada) {
      setError('Ya existe una franja con ese día y horario.');
      return;
    }

    setGuardando(true);

    try {
      if (modoLocal) {
        setFranjas((prev) => [
          ...prev,
          {
            id_disponibilidad: `local-${Date.now()}`,
            dia_semana: formFranja.dia_semana,
            hora_inicio: formFranja.hora_inicio,
            hora_fin: formFranja.hora_fin,
          },
        ]);
      } else {
        const creada = await crearDisponibilidad(sesion.token, {
          dia_semana: formFranja.dia_semana,
          hora_inicio: formFranja.hora_inicio,
          hora_fin: formFranja.hora_fin,
        });
        setFranjas((prev) => [...prev, creada]);
      }

      setExito('Horario de atención agregado.');
    } catch (err) {
      setError(err.message || 'No fue posible registrar el horario de atención.');
    } finally {
      setGuardando(false);
    }
  };

  const quitarFranja = async (franja) => {
    setError(null);
    setExito(null);
    setGuardando(true);

    try {
      if (!modoLocal) {
        await eliminarDisponibilidad(sesion.token, franja.id_disponibilidad);
      }
      setFranjas((prev) => prev.filter((item) => item.id_disponibilidad !== franja.id_disponibilidad));
      setExito('Horario de atención eliminado.');
    } catch (err) {
      setError(err.message || 'No fue posible eliminar el horario de atención.');
    } finally {
      setGuardando(false);
    }
  };

  const agregarPeriodo = async (event) => {
    event.preventDefault();
    setError(null);
    setExito(null);

    if (!formPeriodo.fecha_inicio || !formPeriodo.fecha_fin) {
      setError('Indica la fecha de inicio y la fecha de fin del periodo.');
      return;
    }

    if (formPeriodo.fecha_inicio > formPeriodo.fecha_fin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    setGuardando(true);

    try {
      if (modoLocal) {
        setPeriodos((prev) => [
          ...prev,
          {
            id_periodo: `local-${Date.now()}`,
            fecha_inicio: formPeriodo.fecha_inicio,
            fecha_fin: formPeriodo.fecha_fin,
          },
        ]);
      } else {
        const creado = await crearPeriodoNoDisponible(sesion.token, {
          fecha_inicio: formPeriodo.fecha_inicio,
          fecha_fin: formPeriodo.fecha_fin,
        });
        setPeriodos((prev) => [...prev, creado]);
      }

      setFormPeriodo({ fecha_inicio: '', fecha_fin: '' });
      setExito('Periodo no disponible registrado.');
    } catch (err) {
      setError(err.message || 'No fue posible registrar el periodo no disponible.');
    } finally {
      setGuardando(false);
    }
  };

  const quitarPeriodo = async (periodo) => {
    setError(null);
    setExito(null);
    setGuardando(true);

    try {
      if (!modoLocal) {
        await eliminarPeriodoNoDisponible(sesion.token, periodo.id_periodo);
      }
      setPeriodos((prev) => prev.filter((item) => item.id_periodo !== periodo.id_periodo));
      setExito('Periodo no disponible eliminado.');
    } catch (err) {
      setError(err.message || 'No fue posible eliminar el periodo no disponible.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Mi disponibilidad</h2>
          <p className="text-muted small mb-0">
            Configura tus días y horarios de atención y registra los periodos en los que no podrás prestar servicios
            (HU-011).
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cargar} disabled={cargando}>
          Actualizar
        </button>
      </div>

      {modoLocal && (
        <div className="alert alert-info py-2 px-3 small" role="status">
          El backend aún no expone <code>/api/disponibilidad</code>. Puedes probar la pantalla: los cambios se
          mantienen solo mientras permanezcas en esta vista.
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 px-3 small" role="alert">
          {error}
        </div>
      )}

      {exito && (
        <div className="alert alert-success alert-dismissible fade show py-2 px-3 small" role="status">
          {exito}
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setExito(null)} />
        </div>
      )}

      {cargando ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-3 mb-0">Consultando tu disponibilidad...</p>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white py-3">
                <h3 className="h5 mb-0">Días y horarios de atención</h3>
              </div>
              <div className="card-body">
                <form onSubmit={agregarFranja} className="row g-2 align-items-end mb-4">
                  <div className="col-12 col-sm-4">
                    <label htmlFor="dia_semana" className="form-label small fw-semibold">
                      Día
                    </label>
                    <select
                      id="dia_semana"
                      className="form-select form-select-sm"
                      value={formFranja.dia_semana}
                      onChange={(event) =>
                        setFormFranja((prev) => ({ ...prev, dia_semana: event.target.value }))
                      }
                      disabled={guardando}
                    >
                      {DIAS.map((dia) => (
                        <option key={dia.valor} value={dia.valor}>
                          {dia.texto}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-6 col-sm-3">
                    <label htmlFor="hora_inicio" className="form-label small fw-semibold">
                      Desde
                    </label>
                    <input
                      type="time"
                      id="hora_inicio"
                      className="form-control form-control-sm"
                      value={formFranja.hora_inicio}
                      onChange={(event) =>
                        setFormFranja((prev) => ({ ...prev, hora_inicio: event.target.value }))
                      }
                      disabled={guardando}
                    />
                  </div>

                  <div className="col-6 col-sm-3">
                    <label htmlFor="hora_fin" className="form-label small fw-semibold">
                      Hasta
                    </label>
                    <input
                      type="time"
                      id="hora_fin"
                      className="form-control form-control-sm"
                      value={formFranja.hora_fin}
                      onChange={(event) =>
                        setFormFranja((prev) => ({ ...prev, hora_fin: event.target.value }))
                      }
                      disabled={guardando}
                    />
                  </div>

                  <div className="col-12 col-sm-2">
                    <button type="submit" className="btn btn-primary btn-sm w-100" disabled={guardando}>
                      Agregar
                    </button>
                  </div>
                </form>

                {franjas.length === 0 ? (
                  <p className="text-muted small mb-0">Aún no has registrado horarios de atención.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {franjas.map((franja) => (
                      <li
                        key={franja.id_disponibilidad}
                        className="list-group-item d-flex justify-content-between align-items-center px-0"
                      >
                        <span className="small">
                          <strong>{etiquetaDia(franja.dia_semana)}</strong>: {franja.hora_inicio} -{' '}
                          {franja.hora_fin}
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => quitarFranja(franja)}
                          disabled={guardando}
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white py-3">
                <h3 className="h5 mb-0">Periodos no disponibles</h3>
              </div>
              <div className="card-body">
                <form onSubmit={agregarPeriodo} className="row g-2 align-items-end mb-4">
                  <div className="col-6">
                    <label htmlFor="fecha_inicio" className="form-label small fw-semibold">
                      Desde
                    </label>
                    <input
                      type="date"
                      id="fecha_inicio"
                      className="form-control form-control-sm"
                      value={formPeriodo.fecha_inicio}
                      onChange={(event) =>
                        setFormPeriodo((prev) => ({ ...prev, fecha_inicio: event.target.value }))
                      }
                      disabled={guardando}
                    />
                  </div>

                  <div className="col-6">
                    <label htmlFor="fecha_fin" className="form-label small fw-semibold">
                      Hasta
                    </label>
                    <input
                      type="date"
                      id="fecha_fin"
                      className="form-control form-control-sm"
                      value={formPeriodo.fecha_fin}
                      onChange={(event) =>
                        setFormPeriodo((prev) => ({ ...prev, fecha_fin: event.target.value }))
                      }
                      disabled={guardando}
                    />
                  </div>

                  <div className="col-12">
                    <button type="submit" className="btn btn-primary btn-sm w-100" disabled={guardando}>
                      Registrar periodo
                    </button>
                  </div>
                </form>

                {periodos.length === 0 ? (
                  <p className="text-muted small mb-0">No hay periodos no disponibles registrados.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {periodos.map((periodo) => (
                      <li
                        key={periodo.id_periodo}
                        className="list-group-item d-flex justify-content-between align-items-center px-0"
                      >
                        <span className="small">
                          {periodo.fecha_inicio} al {periodo.fecha_fin}
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => quitarPeriodo(periodo)}
                          disabled={guardando}
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
