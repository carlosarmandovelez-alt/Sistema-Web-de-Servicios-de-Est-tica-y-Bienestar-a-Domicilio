import React, { useState } from 'react';
import {
  solicitarRecuperacion,
  validarOtp,
  restablecerPassword,
} from '../Servicios/authService';

export const RecuperarPassword = ({ onVolverALogin }) => {
  // Pasos: 1 = solicitar recuperación, 2 = validar OTP, 3 = restablecer contraseña, 4 = éxito
  const [paso, setPaso] = useState(1);

  // Estados del formulario
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  // Visibilidad de contraseñas
  const [mostrarNuevaPassword, setMostrarNuevaPassword] = useState(false);
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);

  // Estados de interfaz y retroalimentación
  const [loading, setLoading] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [error, setError] = useState(null);
  const [codigoExpirado, setCodigoExpirado] = useState(false);

  // Validaciones de contraseña en tiempo real acordes al backend:
  // @Size(min = 8) y @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$")
  const tieneMinimo8 = nuevaPassword.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(nuevaPassword);
  const tieneMinuscula = /[a-z]/.test(nuevaPassword);
  const tieneNumero = /\d/.test(nuevaPassword);
  const coincidenPasswords =
    nuevaPassword.length > 0 &&
    confirmarPassword.length > 0 &&
    nuevaPassword === confirmarPassword;
  const passwordValida =
    tieneMinimo8 && tieneMayuscula && tieneMinuscula && tieneNumero;

  // PASO 1: Enviar solicitud de recuperación
  const handleSolicitar = async (e) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);

    const emailLimpio = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailLimpio || !emailRegex.test(emailLimpio)) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await solicitarRecuperacion({ email: emailLimpio });
      // Mensaje neutral que no revela si el correo está registrado
      setMensajeExito(
        res?.mensaje ||
          'Si existe una cuenta asociada a este correo, recibirás instrucciones para recuperar tu contraseña.'
      );
      setPaso(2);
    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar la solicitud. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // PASO 2: Validar código OTP recibido por correo
  const handleValidarOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setCodigoExpirado(false);

    const codigoLimpio = codigo.trim();
    if (!codigoLimpio || codigoLimpio.length !== 6 || !/^\d{6}$/.test(codigoLimpio)) {
      setError('El código OTP debe tener exactamente 6 dígitos numéricos.');
      return;
    }

    setLoading(true);
    try {
      await validarOtp({ email: email.trim(), codigo: codigoLimpio });
      setError(null);
      setMensajeExito(null);
      setPaso(3);
    } catch (err) {
      const mensaje = err.message || '';
      const mensajeMin = mensaje.toLowerCase();
      if (mensajeMin.includes('inválido')) {
        setError(mensaje || 'El código es inválido o ha expirado.');
      } else if (mensajeMin.includes('expirado') || mensajeMin.includes('expiró')) {
        setCodigoExpirado(true);
        setError('El código ha expirado. Por seguridad, solicita uno nuevo.');
      } else {
        setError(mensaje || 'El código es inválido o ha expirado.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reenviar / solicitar nuevo código (invalida el OTP anterior en backend)
  const handleReenviarCodigo = async () => {
    setError(null);
    setCodigoExpirado(false);
    setMensajeExito(null);
    setCodigo('');
    setLoading(true);

    try {
      const res = await solicitarRecuperacion({ email: email.trim() });
      setMensajeExito(
        res?.mensaje ||
          'Se ha generado un nuevo código de recuperación si el correo está registrado.'
      );
    } catch (err) {
      setError(err.message || 'No fue posible enviar un nuevo código. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // PASO 3: Restablecer contraseña con el OTP validado
  const handleRestablecer = async (e) => {
    e.preventDefault();
    setError(null);

    if (!passwordValida) {
      setError('La nueva contraseña no cumple con todos los requisitos de seguridad.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden. Por favor, verifícalas.');
      return;
    }

    setLoading(true);
    try {
      await restablecerPassword({
        email: email.trim(),
        codigo: codigo.trim(),
        nuevaPassword,
      });

      // Limpiar estados sensibles inmediatamente
      setNuevaPassword('');
      setConfirmarPassword('');
      setCodigo('');
      setMensajeExito('Tu contraseña ha sido restablecida exitosamente.');
      setPaso(4);
    } catch (err) {
      const mensaje = err.message || '';
      if (mensaje.toLowerCase().includes('expirado') || mensaje.toLowerCase().includes('inválido')) {
        setError(
          'El código de validación ya no es válido o ha expirado. Por favor, inicia una nueva solicitud.'
        );
        setCodigoExpirado(true);
      } else {
        setError(mensaje || 'Error al restablecer la contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  const reiniciarFlujo = () => {
    setPaso(1);
    setCodigo('');
    setNuevaPassword('');
    setConfirmarPassword('');
    setError(null);
    setMensajeExito(null);
    setCodigoExpirado(false);
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '480px' }}>
      <div className="card shadow-sm p-4">
        <h3 className="text-center mb-3">Recuperar contraseña</h3>

        {/* Alertas accesibles */}
        {mensajeExito && (
          <div className="alert alert-success" role="alert" aria-live="polite">
            {mensajeExito}
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {/* PASO 1: Solicitud de recuperación mediante correo */}
        {paso === 1 && (
          <>
            <p className="text-muted small text-center mb-4">
              Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un código de
              validación de 6 dígitos para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSolicitar} noValidate>
              <div className="mb-3">
                <label htmlFor="recuperar-email" className="form-label">
                  Correo Electrónico *
                </label>
                <input
                  id="recuperar-email"
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 mb-3"
                disabled={loading}
              >
                {loading ? 'Enviando instrucciones...' : 'Enviar instrucciones'}
              </button>
            </form>
          </>
        )}

        {/* PASO 2: Validación del código OTP */}
        {paso === 2 && (
          <>
            <p className="text-muted small text-center mb-4">
              Ingresa el código de 6 dígitos que enviamos a <strong>{email}</strong>. El código es
              válido por 15 minutos.
            </p>

            <form onSubmit={handleValidarOtp} noValidate>
              <div className="mb-3">
                <label htmlFor="recuperar-codigo" className="form-label">
                  Código de Verificación (OTP) *
                </label>
                <input
                  id="recuperar-codigo"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="form-control text-center fs-4 tracking-widest"
                  style={{ letterSpacing: '0.3rem' }}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  autoComplete="one-time-code"
                  disabled={loading}
                />
                <div className="form-text text-center">
                  Introduce el código numérico de 6 dígitos.
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 mb-2"
                disabled={loading || codigo.length !== 6}
              >
                {loading ? 'Validando código...' : 'Validar código'}
              </button>

              <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-link p-0 small text-decoration-none"
                  onClick={handleReenviarCodigo}
                  disabled={loading}
                >
                  ¿No recibiste el código? Solicitar uno nuevo
                </button>
                <button
                  type="button"
                  className="btn btn-link p-0 small text-secondary text-decoration-none"
                  onClick={reiniciarFlujo}
                  disabled={loading}
                >
                  Cambiar correo
                </button>
              </div>
            </form>
          </>
        )}

        {/* PASO 3: Restablecer contraseña */}
        {paso === 3 && (
          <>
            <p className="text-muted small text-center mb-4">
              Ingresa y confirma tu nueva contraseña. Cumple con los requisitos de seguridad
              indicados.
            </p>

            <form onSubmit={handleRestablecer} noValidate>
              {/* Nueva contraseña */}
              <div className="mb-3">
                <label htmlFor="nueva-password" className="form-label">
                  Nueva contraseña *
                </label>
                <div className="input-group">
                  <input
                    id="nueva-password"
                    type={mostrarNuevaPassword ? 'text' : 'password'}
                    className="form-control"
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setMostrarNuevaPassword(!mostrarNuevaPassword)}
                    aria-label={mostrarNuevaPassword ? 'Ocultar nueva contraseña' : 'Ver nueva contraseña'}
                  >
                    {mostrarNuevaPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div className="mb-3">
                <label htmlFor="confirmar-password" className="form-label">
                  Confirmar nueva contraseña *
                </label>
                <div className="input-group">
                  <input
                    id="confirmar-password"
                    type={mostrarConfirmarPassword ? 'text' : 'password'}
                    className="form-control"
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)}
                    aria-label={mostrarConfirmarPassword ? 'Ocultar confirmación' : 'Ver confirmación'}
                  >
                    {mostrarConfirmarPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>

              {/* Indicador de requisitos en tiempo real */}
              <div className="card bg-light p-3 mb-3 border-0">
                <div className="small fw-bold mb-2">Requisitos de la contraseña:</div>
                <ul className="list-unstyled mb-0 small">
                  <li className={tieneMinimo8 ? 'text-success' : 'text-muted'}>
                    {tieneMinimo8 ? '✔' : '○'} Al menos 8 caracteres
                  </li>
                  <li className={tieneMayuscula ? 'text-success' : 'text-muted'}>
                    {tieneMayuscula ? '✔' : '○'} Al menos una letra mayúscula
                  </li>
                  <li className={tieneMinuscula ? 'text-success' : 'text-muted'}>
                    {tieneMinuscula ? '✔' : '○'} Al menos una letra minúscula
                  </li>
                  <li className={tieneNumero ? 'text-success' : 'text-muted'}>
                    {tieneNumero ? '✔' : '○'} Al menos un número
                  </li>
                  {confirmarPassword.length > 0 && (
                    <li className={coincidenPasswords ? 'text-success' : 'text-danger'}>
                      {coincidenPasswords ? '✔ Las contraseñas coinciden' : '✕ Las contraseñas no coinciden'}
                    </li>
                  )}
                </ul>
              </div>

              {codigoExpirado && (
                <div className="text-center mb-3">
                  <button
                    type="button"
                    className="btn btn-outline-warning w-100"
                    onClick={reiniciarFlujo}
                  >
                    Iniciar nueva solicitud de recuperación
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-100 mb-3"
                disabled={loading || !passwordValida || !coincidenPasswords}
              >
                {loading ? 'Restableciendo contraseña...' : 'Restablecer contraseña'}
              </button>
            </form>
          </>
        )}

        {/* PASO 4: Éxito confirmado por el backend */}
        {paso === 4 && (
          <div className="text-center py-3">
            <div className="mb-3 text-success fs-1">✔</div>
            <h5 className="mb-3">¡Contraseña actualizada con éxito!</h5>
            <p className="text-muted small mb-4">
              Tu contraseña ha sido restablecida de forma segura. Ya puedes iniciar sesión con tus
              nuevas credenciales.
            </p>
            <button
              type="button"
              className="btn btn-success w-100"
              onClick={onVolverALogin}
            >
              Iniciar sesión ahora
            </button>
          </div>
        )}

        {/* Enlace para volver al login (visible en pasos 1, 2 y 3) */}
        {paso !== 4 && (
          <div className="text-center mt-3 pt-3 border-top">
            <button
              type="button"
              className="btn btn-link p-0 align-baseline text-decoration-none"
              onClick={onVolverALogin}
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};