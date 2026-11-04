import React, { useCallback, useEffect, useState } from 'react';
import { consultarProveedor, listarProveedores } from '../Servicios/exploracionService';
import { crearSolicitud } from '../Servicios/solicitudService';
import { formatearPrecio } from './solicitudComunes';

const FORMULARIO_INICIAL = {
  fecha: '',
  hora: '',
  direccion_texto: '',
  barrio_sector: '',
  informacion_complementaria: '',
  observaciones: '',
};

const fechaLocalHoy = () => {
  const ahora = new Date();
  const ajustada = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return ajustada.toISOString().slice(0, 10);
};

export const CrearSolicitud = ({ sesion, servicioInicial, onCreada, onCancelar }) => {
  const [proveedores, setProveedores] = useState([]);
  const [idProveedor, setIdProveedor] = useState(
    servicioInicial?.id_proveedor ? String(servicioInicial.id_proveedor) : ''
  );
  const [servicios, setServicios] = useState(servicioInicial ? [servicioInicial] : []);
  const [idServicio, setIdServicio] = useState(servicioInicial ? String(servicioInicial.id) : '');
  const [nombreProveedor, setNombreProveedor] = useState(servicioInicial?.nombre_proveedor || '');
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [solicitudCreada, setSolicitudCreada] = useState(null);

  const servicioSeleccionado = servicios.find((servicio) => String(servicio.id) === idServicio) || null;

  const cargarProveedores = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const data = await listarProveedores();
      setProveedores(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'No fue posible consultar los proveedores disponibles.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarProveedores();
  }, [cargarProveedores]);

  useEffect(() => {
    if (!idProveedor) {
      if (!servicioInicial) {
        setServicios([]);
        setIdServicio('');
      }
      return undefined;
    }

    let activo = true;
    setCargando(true);
    setError(null);

    consultarProveedor(idProveedor)
      .then((detalle) => {
        if (!activo) {
          return;
        }
        const catalogo = Array.isArray(detalle.catalogo) ? detalle.catalogo : [];
        setServicios(catalogo);
        setNombreProveedor(`${detalle.nombre || ''} ${detalle.apellido || ''}`.trim());
        setIdServicio((prev) => {
          if (prev && catalogo.some((servicio) => String(servicio.id) === prev)) {
            return prev;
          }
          return servicioInicial && String(servicioInicial.id_proveedor) === String(idProveedor)
            ? String(servicioInicial.id)
            : '';
        });
      })
      .catch((err) => {
        if (activo) {
          setError(err.message || 'No fue posible consultar el catálogo del proveedor.');
          setServicios([]);
          setIdServicio('');
        }
      })
      .finally(() => {
        if (activo) {
          setCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [idProveedor, servicioInicial]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  };

  const validar = () => {
    const validaciones = {};

    if (!idServicio) {
      validaciones.idServicio = 'Selecciona el servicio que deseas solicitar.';
    }

    if (!formulario.fecha) {
      validaciones.fecha = 'Indica la fecha del servicio.';
    }

    if (!formulario.hora) {
      validaciones.hora = 'Indica la hora del servicio.';
    }

    if (formulario.fecha && formulario.hora) {
      const fechaHora = new Date(`${formulario.fecha}T${formulario.hora}:00`);
      if (Number.isNaN(fechaHora.getTime())) {
        validaciones.fecha = 'La fecha y hora indicadas no son válidas.';
      } else if (fechaHora <= new Date()) {
        validaciones.hora = 'La fecha y hora deben ser posteriores al momento actual.';
      }
    }

    if (!formulario.direccion_texto.trim()) {
      validaciones.direccion_texto = 'La dirección de atención es obligatoria.';
    }

    return validaciones;
  };

  const enviar = async (event) => {
    event.preventDefault();
    const validaciones = validar();
    setErrores(validaciones);
    setError(null);

    if (Object.keys(validaciones).length > 0) {
      return;
    }

    setEnviando(true);

    try {
      const creada = await crearSolicitud(sesion.token, {
        id_servicio: Number(idServicio),
        fecha_hora_solicitada: `${formulario.fecha}T${formulario.hora}:00`,
        direccion_texto: formulario.direccion_texto.trim(),
        barrio_sector: formulario.barrio_sector.trim() || null,
        informacion_complementaria: formulario.informacion_complementaria.trim() || null,
        observaciones: formulario.observaciones.trim() || null,
      });

      setSolicitudCreada(creada);
      setFormulario(FORMULARIO_INICIAL);
    } catch (err) {
      setError(err.message || 'No fue posible crear la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  const reiniciar = () => {
    setSolicitudCreada(null);
    setErrores({});
    setError(null);
    if (!servicioInicial) {
      setIdProveedor('');
      setIdServicio('');
      setServicios([]);
    }
  };

  if (solicitudCreada) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <h2 className="h4 mb-3">Solicitud creada</h2>
          <p className="text-muted mb-4">
            Tu solicitud para <strong>{solicitudCreada.nombre_servicio_snapshot}</strong> quedó en estado{' '}
            <strong>{solicitudCreada.estado || 'pendiente'}</strong>. El proveedor podrá aceptarla, rechazarla o
            proponer otro horario.
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            {onCreada && (
              <button type="button" className="btn btn-primary" onClick={() => onCreada(solicitudCreada)}>
                Ver mis solicitudes
              </button>
            )}
            <button type="button" className="btn btn-outline-secondary" onClick={reiniciar}>
              Crear otra solicitud
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Nueva solicitud de servicio</h2>
          <p className="text-muted small mb-0">
            Selecciona un proveedor y su servicio, indica la fecha, la hora y el lugar de atención (HU-012).
          </p>
        </div>
        {onCancelar && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 small" role="alert">
          {error}
        </div>
      )}

      {!servicioInicial && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label htmlFor="proveedor" className="form-label small fw-semibold">
                  Proveedor <span className="text-danger">*</span>
                </label>
                <select
                  id="proveedor"
                  className="form-select"
                  value={idProveedor}
                  onChange={(event) => {
                    setIdProveedor(event.target.value);
                    setIdServicio('');
                  }}
                  disabled={cargando || enviando}
                >
                  <option value="">Selecciona un proveedor</option>
                  {proveedores.map((proveedor) => (
                    <option key={proveedor.id} value={proveedor.id}>
                      {proveedor.nombre} {proveedor.apellido}
                    </option>
                  ))}
                </select>
                {cargando && <small className="text-muted">Consultando proveedores...</small>}
                {!cargando && proveedores.length === 0 && (
                  <small className="text-muted">No hay proveedores disponibles con servicios activos.</small>
                )}
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="servicio" className="form-label small fw-semibold">
                  Servicio <span className="text-danger">*</span>
                </label>
                <select
                  id="servicio"
                  className="form-select"
                  value={idServicio}
                  onChange={(event) => setIdServicio(event.target.value)}
                  disabled={!idProveedor || cargando || enviando || servicios.length === 0}
                >
                  <option value="">Selecciona un servicio</option>
                  {servicios.map((servicio) => (
                    <option key={servicio.id} value={servicio.id}>
                      {servicio.nombre} · {formatearPrecio(servicio.precio)}
                    </option>
                  ))}
                </select>
                {errores.idServicio && <div className="text-danger small mt-1">{errores.idServicio}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {servicioInicial && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <span className="badge text-bg-light border mb-2">{servicioSeleccionado?.categoria || 'Servicio'}</span>
            <h3 className="h5 mb-1">{servicioSeleccionado?.nombre || 'Servicio seleccionado'}</h3>
            <p className="text-muted small mb-0">
              {nombreProveedor || 'Proveedor'} · {servicioSeleccionado?.duracion_minutos || 0} min ·{' '}
              {formatearPrecio(servicioSeleccionado?.precio || 0)}
            </p>
          </div>
        </div>
      )}

      {servicioSeleccionado && (
        <div className="alert alert-light border small" role="status">
          <strong>Resumen:</strong> {servicioSeleccionado.nombre} con {nombreProveedor || 'el proveedor'} ·{' '}
          {servicioSeleccionado.duracion_minutos} minutos · {formatearPrecio(servicioSeleccionado.precio)}
        </div>
      )}

      <form onSubmit={enviar} className="card shadow-sm" noValidate>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="fecha" className="form-label small fw-semibold">
                Fecha <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                id="fecha"
                name="fecha"
                min={fechaLocalHoy()}
                className={`form-control ${errores.fecha ? 'is-invalid' : ''}`}
                value={formulario.fecha}
                onChange={handleChange}
                disabled={enviando}
                required
              />
              {errores.fecha && <div className="invalid-feedback">{errores.fecha}</div>}
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="hora" className="form-label small fw-semibold">
                Hora <span className="text-danger">*</span>
              </label>
              <input
                type="time"
                id="hora"
                name="hora"
                className={`form-control ${errores.hora ? 'is-invalid' : ''}`}
                value={formulario.hora}
                onChange={handleChange}
                disabled={enviando}
                required
              />
              {errores.hora && <div className="invalid-feedback">{errores.hora}</div>}
            </div>

            <div className="col-12 col-md-8">
              <label htmlFor="direccion_texto" className="form-label small fw-semibold">
                Dirección de atención <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="direccion_texto"
                name="direccion_texto"
                className={`form-control ${errores.direccion_texto ? 'is-invalid' : ''}`}
                value={formulario.direccion_texto}
                onChange={handleChange}
                maxLength={255}
                placeholder="Ej: Calle 10 # 20-30, apartamento 201"
                disabled={enviando}
                required
              />
              {errores.direccion_texto && (
                <div className="invalid-feedback">{errores.direccion_texto}</div>
              )}
            </div>

            <div className="col-12 col-md-4">
              <label htmlFor="barrio_sector" className="form-label small fw-semibold">
                Barrio o sector
              </label>
              <input
                type="text"
                id="barrio_sector"
                name="barrio_sector"
                className="form-control"
                value={formulario.barrio_sector}
                onChange={handleChange}
                maxLength={150}
                placeholder="Ej: Centro"
                disabled={enviando}
              />
            </div>

            <div className="col-12">
              <label htmlFor="informacion_complementaria" className="form-label small fw-semibold">
                Información complementaria
              </label>
              <input
                type="text"
                id="informacion_complementaria"
                name="informacion_complementaria"
                className="form-control"
                value={formulario.informacion_complementaria}
                onChange={handleChange}
                maxLength={255}
                placeholder="Ej: Timbre azul, segundo piso"
                disabled={enviando}
              />
            </div>

            <div className="col-12">
              <label htmlFor="observaciones" className="form-label small fw-semibold">
                Observaciones
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                className="form-control"
                rows={3}
                maxLength={2000}
                value={formulario.observaciones}
                onChange={handleChange}
                placeholder="Cuéntale al proveedor cualquier detalle adicional sobre el servicio."
                disabled={enviando}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            {onCancelar && (
              <button type="button" className="btn btn-outline-secondary" onClick={onCancelar} disabled={enviando}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={enviando || !idServicio}>
              {enviando ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Enviando...
                </>
              ) : (
                'Crear solicitud'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
