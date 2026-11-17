import React, { useState } from 'react';
import { cancelarSolicitud } from '../Servicios/solicitudService';
import { AlertaError, obtenerMensajeError } from './ExploracionComun';

const ESTADOS_CANCELABLES = ['pendiente', 'sugerida', 'aceptada'];

export const CancelarSolicitud = ({
  idSolicitud,
  estado,
  rol,
  token,
  onActualizada,
  onCerrarSesion,
}) => {
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  if (!ESTADOS_CANCELABLES.includes(estado)) return null;

  const cancelar = async () => {
    if (!motivo.trim()) {
      setError('El motivo de cancelación es obligatorio.');
      return;
    }

    setEnviando(true);
    setError(null);
    setExito(null);

    try {
      const actualizada = await cancelarSolicitud(
        token,
        rol,
        idSolicitud,
        motivo.trim()
      );

      if (!actualizada || typeof actualizada !== 'object') {
        throw new Error('El servidor no devolvió la solicitud actualizada.');
      }

      onActualizada(actualizada);
      setExito('La solicitud fue cancelada correctamente.');
      setMostrandoFormulario(false);
      setMotivo('');
    } catch (err) {
      setError(
        obtenerMensajeError(err, 'No fue posible cancelar la solicitud.')
      );
    } finally {
      setEnviando(false);
    }
  };

  const errorAutenticacion =
    error && /autorización|sesión|token/i.test(String(error));

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-body">
        <h3 className="h5 fw-semibold text-dark mb-2">
          Cancelar solicitud
        </h3>
        <p className="small text-muted mb-3">
          La cancelación es definitiva y requiere registrar un motivo.
        </p>

        {error && (
          <AlertaError mensaje={error}>
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
        )}

        {exito && (
          <div className="alert alert-success" role="status">
            {exito}
          </div>
        )}

        {!mostrandoFormulario ? (
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => {
              setMostrandoFormulario(true);
              setError(null);
              setExito(null);
            }}
            disabled={enviando}
          >
            Cancelar solicitud
          </button>
        ) : (
          <div className="border rounded p-3">
            <label
              htmlFor={`motivo-cancelacion-${rol}-${idSolicitud}`}
              className="form-label small fw-semibold"
            >
              Motivo de la cancelación
            </label>
            <textarea
              id={`motivo-cancelacion-${rol}-${idSolicitud}`}
              className="form-control"
              rows="3"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              maxLength="500"
              required
            />
            <div className="d-flex gap-2 mt-3">
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={cancelar}
                disabled={enviando}
              >
                {enviando ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setMostrandoFormulario(false)}
                disabled={enviando}
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
