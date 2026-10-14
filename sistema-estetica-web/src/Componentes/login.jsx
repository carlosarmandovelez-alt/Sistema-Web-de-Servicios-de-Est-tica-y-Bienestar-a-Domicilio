import React, { useState } from 'react';
import { loginUsuario } from '../Servicios/authService';

export const Login = ({ onLoginExitoso, onIrARegistro, onOlvidarPassword }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const respuesta = await loginUsuario(formData);
      if (onLoginExitoso) {
        onLoginExitoso(respuesta);
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '440px' }}>
      <div className="card shadow-sm p-4">
        <h3 className="text-center mb-4">Iniciar Sesión</h3>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="login-email" className="form-label">
              Correo Electrónico *
            </label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ejemplo@correo.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="login-password" className="form-label mb-0">
                Contraseña *
              </label>
              {onOlvidarPassword && (
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none small"
                  onClick={onOlvidarPassword}
                  style={{ fontSize: '0.875rem' }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <input
              id="login-password"
              type="password"
              className="form-control"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 mb-3"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="text-center mt-3 pt-3 border-top">
          <p className="mb-0 text-muted small">
            ¿No tienes cuenta?{' '}
            <button
              type="button"
              className="btn btn-link p-0 align-baseline"
              onClick={onIrARegistro}
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

