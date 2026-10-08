import React, { useState } from 'react';
import { registrarUsuario } from '../Servicios/authService';

export const Registro = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'cliente',
    telefono: '',
  });

  const [loading, setLoading] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
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
    setMensajeExito(null);
    setError(null);

    // Validar contraseña localmente antes de enviar al backend
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (formData.password.length < 8 || !passwordRegex.test(formData.password)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.');
      setLoading(false);
      return;
    }

    try {
      const respuesta = await registrarUsuario(formData);
      setMensajeExito(`¡Cuenta creada con éxito para ${respuesta.nombre}!`);
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        rol: 'cliente',
        telefono: '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '480px' }}>
      <div className="card shadow-sm p-4">
        <h3 className="text-center mb-4">Registro de Usuario</h3>

        {mensajeExito && <div className="alert alert-success">{mensajeExito}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Nombre *</label>
              <input
                type="text"
                className="form-control"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Apellido *</label>
              <input
                type="text"
                className="form-control"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={100}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Correo Electrónico *</label>
            <input
              type="email"
              className="form-control"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ejemplo@correo.com"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Contraseña *</label>
            <input
              type="password"
              className="form-control"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres (A-z, 0-9)"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Teléfono</label>
            <input
              type="tel"
              className="form-control"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Ej: 3001234567"
            />
          </div>

          <div className="mb-4">
            <label className="form-label">Rol / Tipo de Usuario *</label>
            <select
              className="form-select"
              name="rol"
              value={formData.rol}
              onChange={handleChange}
              required
            >
              <option value="cliente">Cliente</option>
              <option value="proveedor">Proveedor</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
};