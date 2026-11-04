import React, { useState, useEffect, useCallback } from 'react';
import {
  consultarPerfilCliente,
  actualizarDatosPersonales,
  actualizarDireccionPrincipal,
} from '../Servicios/clienteService';

export const PerfilCliente = ({ sesion, onCerrarSesion, onActualizarSesion }) => {
  // Estado general del perfil cargado desde el backend
  const [perfil, setPerfil] = useState(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Estados de edición para Datos Personales
  const [editandoPersonales, setEditandoPersonales] = useState(false);
  const [guardandoPersonales, setGuardandoPersonales] = useState(false);
  const [formPersonales, setFormPersonales] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
  });
  const [erroresPersonales, setErroresPersonales] = useState({});

  // Estados de edición para Dirección Principal
  const [editandoDireccion, setEditandoDireccion] = useState(false);
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);
  const [formDireccion, setFormDireccion] = useState({
    ciudad: '',
    barrio_sector: '',
    informacion_complementaria: '',
    telefono: '',
  });
  const [erroresDireccion, setErroresDireccion] = useState({});

  // Función para cargar o recargar el perfil desde el backend
  const cargarPerfil = useCallback(async () => {
    if (!sesion?.token) {
      setErrorGeneral('No se encontró una sesión activa válida.');
      setCargandoInicial(false);
      return;
    }

    setCargandoInicial(true);
    setErrorGeneral(null);

    try {
      const data = await consultarPerfilCliente(sesion.token);
      setPerfil(data);

      // Sincronizar formularios locales con la información confirmada por el backend
      setFormPersonales({
        nombre: data.nombre || '',
        apellido: data.apellido || '',
        telefono: data.telefono || '',
      });

      if (data.direccionPrincipal) {
        setFormDireccion({
          ciudad: data.direccionPrincipal.ciudad || '',
          barrio_sector: data.direccionPrincipal.barrio_sector || '',
          informacion_complementaria: data.direccionPrincipal.informacion_complementaria || '',
          telefono: data.direccionPrincipal.telefono || '',
        });
      } else {
        setFormDireccion({
          ciudad: '',
          barrio_sector: '',
          informacion_complementaria: '',
          telefono: '',
        });
      }
    } catch (err) {
      if (err.esErrorAutenticacion && onCerrarSesion) {
        setErrorGeneral(err.message || 'Tu sesión ha expirado. Por favor ingresa de nuevo.');
      } else {
        setErrorGeneral(err.message || 'Error al obtener la información del perfil.');
      }
    } finally {
      setCargandoInicial(false);
    }
  }, [sesion?.token, onCerrarSesion]);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  // Manejo de cambios en formulario de datos personales
  const handleChangePersonales = (e) => {
    const { name, value } = e.target;
    setFormPersonales((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error del campo modificado
    if (erroresPersonales[name]) {
      setErroresPersonales((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Manejo de cambios en formulario de dirección
  const handleChangeDireccion = (e) => {
    const { name, value } = e.target;
    setFormDireccion((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error del campo modificado
    if (erroresDireccion[name]) {
      setErroresDireccion((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Validaciones del frontend para datos personales
  const validarFormPersonales = () => {
    const nuevosErrores = {};
    const nombreTrim = (formPersonales.nombre || '').trim();
    const apellidoTrim = (formPersonales.apellido || '').trim();
    const telefonoTrim = (formPersonales.telefono || '').trim();

    if (!nombreTrim) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    } else if (nombreTrim.length < 2 || nombreTrim.length > 100) {
      nuevosErrores.nombre = 'El nombre debe tener entre 2 y 100 caracteres';
    }

    if (!apellidoTrim) {
      nuevosErrores.apellido = 'El apellido es obligatorio';
    } else if (apellidoTrim.length < 2 || apellidoTrim.length > 100) {
      nuevosErrores.apellido = 'El apellido debe tener entre 2 y 100 caracteres';
    }

    // Teléfono: opcional, pero si se escribe debe tener entre 7 y 10 dígitos numéricos
    if (telefonoTrim) {
      const regexTelefono = /^[0-9]{7,10}$/;
      if (!regexTelefono.test(telefonoTrim)) {
        nuevosErrores.telefono = 'El teléfono debe tener entre 7 y 10 dígitos numéricos';
      }
    }

    setErroresPersonales(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Validaciones del frontend para dirección principal 
  const validarFormDireccion = () => {
    const nuevosErrores = {};
    const ciudadTrim = (formDireccion.ciudad || '').trim();
    const barrioTrim = (formDireccion.barrio_sector || '').trim();
    const infoCompTrim = (formDireccion.informacion_complementaria || '').trim();
    const telDireccionTrim = (formDireccion.telefono || '').trim();

    if (!ciudadTrim) {
      nuevosErrores.ciudad = 'La ciudad es obligatoria';
    } else if (ciudadTrim.length > 100) {
      nuevosErrores.ciudad = 'La ciudad no puede superar los 100 caracteres';
    }

    if (barrioTrim && barrioTrim.length > 150) {
      nuevosErrores.barrio_sector = 'El barrio o sector no puede superar los 150 caracteres';
    }

    if (infoCompTrim && infoCompTrim.length > 255) {
      nuevosErrores.informacion_complementaria = 'La información complementaria no puede superar los 255 caracteres';
    }

    if (!telDireccionTrim) {
      nuevosErrores.telefono = 'El teléfono de la dirección es obligatorio';
    } else if (telDireccionTrim.length > 20) {
      nuevosErrores.telefono = 'El teléfono no puede superar los 20 caracteres';
    }

    setErroresDireccion(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Iniciar edición de datos personales
  const iniciarEdicionPersonales = () => {
    setFormPersonales({
      nombre: perfil?.nombre || '',
      apellido: perfil?.apellido || '',
      telefono: perfil?.telefono || '',
    });
    setErroresPersonales({});
    setMensajeExito(null);
    setErrorGeneral(null);
    setEditandoPersonales(true);
  };

  // Cancelar edición de datos personales (restaura estado anterior)
  const cancelarEdicionPersonales = () => {
    setFormPersonales({
      nombre: perfil?.nombre || '',
      apellido: perfil?.apellido || '',
      telefono: perfil?.telefono || '',
    });
    setErroresPersonales({});
    setEditandoPersonales(false);
  };

  // Iniciar edición de dirección
  const iniciarEdicionDireccion = () => {
    if (perfil?.direccionPrincipal) {
      setFormDireccion({
        ciudad: perfil.direccionPrincipal.ciudad || '',
        barrio_sector: perfil.direccionPrincipal.barrio_sector || '',
        informacion_complementaria: perfil.direccionPrincipal.informacion_complementaria || '',
        telefono: perfil.direccionPrincipal.telefono || '',
      });
    } else {
      setFormDireccion({
        ciudad: '',
        barrio_sector: '',
        informacion_complementaria: '',
        telefono: '',
      });
    }
    setErroresDireccion({});
    setMensajeExito(null);
    setErrorGeneral(null);
    setEditandoDireccion(true);
  };

  // Cancelar edición de dirección (restaura estado anterior)
  const cancelarEdicionDireccion = () => {
    if (perfil?.direccionPrincipal) {
      setFormDireccion({
        ciudad: perfil.direccionPrincipal.ciudad || '',
        barrio_sector: perfil.direccionPrincipal.barrio_sector || '',
        informacion_complementaria: perfil.direccionPrincipal.informacion_complementaria || '',
        telefono: perfil.direccionPrincipal.telefono || '',
      });
    } else {
      setFormDireccion({
        ciudad: '',
        barrio_sector: '',
        informacion_complementaria: '',
        telefono: '',
      });
    }
    setErroresDireccion({});
    setEditandoDireccion(false);
  };

  // Enviar actualización de datos personales al backend
  const handleSubmitPersonales = async (e) => {
    e.preventDefault();
    setMensajeExito(null);
    setErrorGeneral(null);

    if (!validarFormPersonales()) {
      return;
    }

    setGuardandoPersonales(true);

    const payload = {
      nombre: formPersonales.nombre.trim(),
      apellido: formPersonales.apellido.trim(),
      telefono: formPersonales.telefono ? formPersonales.telefono.trim() : null,
    };

    try {
      const perfilActualizado = await actualizarDatosPersonales(sesion.token, payload);
      setPerfil(perfilActualizado);
      setEditandoPersonales(false);
      setMensajeExito('Datos personales actualizados correctamente.');

      // Notificar a App si cambió el nombre para actualizar la bienvenida del cliente
      if (onActualizarSesion && perfilActualizado.nombre) {
        onActualizarSesion({
          ...sesion,
          nombre: perfilActualizado.nombre,
        });
      }
    } catch (err) {
      if (err.fieldErrors) {
        setErroresPersonales(err.fieldErrors);
        setErrorGeneral('Por favor revisa y corrige los campos señalados.');
      } else if (err.esErrorAutenticacion && onCerrarSesion) {
        setErrorGeneral(err.message);
      } else {
        setErrorGeneral(err.message || 'No fue posible guardar los cambios personales.');
      }
    } finally {
      setGuardandoPersonales(false);
    }
  };

  // Enviar actualización de dirección principal al backend
  const handleSubmitDireccion = async (e) => {
    e.preventDefault();
    setMensajeExito(null);
    setErrorGeneral(null);

    if (!validarFormDireccion()) {
      return;
    }

    setGuardandoDireccion(true);

    const payload = {
      ciudad: formDireccion.ciudad.trim(),
      barrio_sector: formDireccion.barrio_sector ? formDireccion.barrio_sector.trim() : null,
      informacion_complementaria: formDireccion.informacion_complementaria
        ? formDireccion.informacion_complementaria.trim()
        : null,
      telefono: formDireccion.telefono.trim(),
    };

    try {
      const perfilActualizado = await actualizarDireccionPrincipal(sesion.token, payload);
      setPerfil(perfilActualizado);
      setEditandoDireccion(false);
      setMensajeExito('Dirección principal actualizada correctamente.');
    } catch (err) {
      if (err.fieldErrors) {
        setErroresDireccion(err.fieldErrors);
        setErrorGeneral('Por favor revisa y corrige los campos señalados.');
      } else if (err.esErrorAutenticacion && onCerrarSesion) {
        setErrorGeneral(err.message);
      } else {
        setErrorGeneral(err.message || 'No fue posible guardar la dirección principal.');
      }
    } finally {
      setGuardandoDireccion(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: '900px' }}>
      {/* Encabezado y barra superior */}
      <header className="d-flex flex-wrap justify-content-between align-items-center pb-3 mb-4 border-bottom">
        <div>
          <h2 className="h4 mb-1 text-primary fw-bold">Bienestar en Casa</h2>
          <p className="text-muted small mb-0">Mi Perfil de Cliente</p>
        </div>
        <div className="d-flex align-items-center gap-3 mt-2 mt-sm-0">
          <span className="badge bg-light text-dark border py-2 px-3">
            Cliente: {perfil?.nombre || sesion?.nombre || 'Usuario'}
          </span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={onCerrarSesion}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Alerta general de error */}
      {errorGeneral && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert" aria-live="assertive">
          <div className="d-flex align-items-center justify-content-between">
            <span>{errorGeneral}</span>
            {!cargandoInicial && !perfil && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger ms-3"
                onClick={cargarPerfil}
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Alerta general de éxito */}
      {mensajeExito && (
        <div className="alert alert-success alert-dismissible fade show mb-4" role="alert" aria-live="polite">
          <div className="d-flex justify-content-between align-items-center">
            <span>{mensajeExito}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar"
              onClick={() => setMensajeExito(null)}
            />
          </div>
        </div>
      )}

      {/* Estado de carga inicial */}
      {cargandoInicial ? (
        <div className="text-center py-5" aria-live="polite">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando información del perfil...</span>
          </div>
          <p className="text-muted mt-3">Consultando información del perfil...</p>
        </div>
      ) : (
        <div className="row g-4">
          {/* SECCIÓN 1: DATOS PERSONALES */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h3 className="h5 mb-0 fw-semibold text-dark">Datos Personales</h3>
                {!editandoPersonales && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={iniciarEdicionPersonales}
                  >
                    Editar datos
                  </button>
                )}
              </div>

              <div className="card-body">
                {!editandoPersonales ? (
                  // MODO VISTA: DATOS PERSONALES
                  <dl className="mb-0">
                    <div className="mb-3">
                      <dt className="text-muted small fw-normal">Nombre completo</dt>
                      <dd className="fs-6 fw-medium text-dark mb-0">
                        {perfil?.nombre} {perfil?.apellido}
                      </dd>
                    </div>

                    <div className="mb-3">
                      <dt className="text-muted small fw-normal">Correo Electrónico (Solo lectura)</dt>
                      <dd className="fs-6 fw-medium text-dark mb-0">
                        {perfil?.email}
                      </dd>
                      <small className="text-muted">El correo está vinculado a la cuenta y no se modifica aquí.</small>
                    </div>

                    <div className="mb-3">
                      <dt className="text-muted small fw-normal">Teléfono personal</dt>
                      <dd className="fs-6 fw-medium text-dark mb-0">
                        {perfil?.telefono ? perfil.telefono : <span className="text-muted fst-italic">No registrado</span>}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted small fw-normal">Identificador de usuario</dt>
                      <dd className="small text-secondary mb-0">ID #{perfil?.id}</dd>
                    </div>
                  </dl>
                ) : (
                  // MODO EDICIÓN: DATOS PERSONALES
                  <form onSubmit={handleSubmitPersonales} noValidate>
                    <div className="mb-3">
                      <label htmlFor="nombre" className="form-label small fw-semibold">
                        Nombre <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        className={`form-control ${erroresPersonales.nombre ? 'is-invalid' : ''}`}
                        value={formPersonales.nombre}
                        onChange={handleChangePersonales}
                        placeholder="Ingresa tu nombre"
                        required
                        disabled={guardandoPersonales}
                        minLength={2}
                        maxLength={100}
                        aria-invalid={!!erroresPersonales.nombre}
                        aria-describedby={erroresPersonales.nombre ? 'error-nombre' : undefined}
                      />
                      {erroresPersonales.nombre && (
                        <div id="error-nombre" className="invalid-feedback">
                          {erroresPersonales.nombre}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="apellido" className="form-label small fw-semibold">
                        Apellido <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="apellido"
                        name="apellido"
                        className={`form-control ${erroresPersonales.apellido ? 'is-invalid' : ''}`}
                        value={formPersonales.apellido}
                        onChange={handleChangePersonales}
                        placeholder="Ingresa tu apellido"
                        required
                        disabled={guardandoPersonales}
                        minLength={2}
                        maxLength={100}
                        aria-invalid={!!erroresPersonales.apellido}
                        aria-describedby={erroresPersonales.apellido ? 'error-apellido' : undefined}
                      />
                      {erroresPersonales.apellido && (
                        <div id="error-apellido" className="invalid-feedback">
                          {erroresPersonales.apellido}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="telefono" className="form-label small fw-semibold">
                        Teléfono personal (Opcional)
                      </label>
                      <input
                        type="tel"
                        id="telefono"
                        name="telefono"
                        className={`form-control ${erroresPersonales.telefono ? 'is-invalid' : ''}`}
                        value={formPersonales.telefono}
                        onChange={handleChangePersonales}
                        placeholder="Ej: 3001234567"
                        disabled={guardandoPersonales}
                        maxLength={10}
                        aria-invalid={!!erroresPersonales.telefono}
                        aria-describedby={erroresPersonales.telefono ? 'error-telefono' : 'ayuda-telefono'}
                      />
                      {erroresPersonales.telefono ? (
                        <div id="error-telefono" className="invalid-feedback">
                          {erroresPersonales.telefono}
                        </div>
                      ) : (
                        <div id="ayuda-telefono" className="form-text">
                          Entre 7 y 10 dígitos numéricos.
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="email-readonly" className="form-label small fw-semibold">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        id="email-readonly"
                        className="form-control bg-light"
                        value={perfil?.email || ''}
                        disabled
                        readOnly
                      />
                      <div className="form-text">Campo de solo lectura.</div>
                    </div>

                    <div className="d-flex gap-2 pt-2 border-top">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={guardandoPersonales}
                      >
                        {guardandoPersonales ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                            Guardando...
                          </>
                        ) : (
                          'Guardar cambios'
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={cancelarEdicionPersonales}
                        disabled={guardandoPersonales}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
          {/* SECCIÓN 2: DIRECCIÓN PRINCIPAL */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <h3 className="h5 mb-0 fw-semibold text-dark">Dirección Principal</h3>
                  {perfil?.direccionPrincipal && (
                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                      Registrada
                    </span>
                  )}
                </div>
                {!editandoDireccion && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={iniciarEdicionDireccion}
                  >
                    {perfil?.direccionPrincipal ? 'Editar dirección' : 'Registrar dirección'}
                  </button>
                )}
              </div>

              <div className="card-body">
                {!editandoDireccion ? (
                  // MODO VISTA: DIRECCIÓN PRINCIPAL
                  perfil?.direccionPrincipal ? (
                    <dl className="mb-0">
                      <div className="mb-3">
                        <dt className="text-muted small fw-normal">Ciudad</dt>
                        <dd className="fs-6 fw-medium text-dark mb-0">
                          {perfil.direccionPrincipal.ciudad}
                        </dd>
                      </div>

                      <div className="mb-3">
                        <dt className="text-muted small fw-normal">Barrio o Sector</dt>
                        <dd className="fs-6 fw-medium text-dark mb-0">
                          {perfil.direccionPrincipal.barrio_sector ? (
                            perfil.direccionPrincipal.barrio_sector
                          ) : (
                            <span className="text-muted fst-italic">No especificado</span>
                          )}
                        </dd>
                      </div>

                      <div className="mb-3">
                        <dt className="text-muted small fw-normal">Información Complementaria</dt>
                        <dd className="fs-6 fw-medium text-dark mb-0">
                          {perfil.direccionPrincipal.informacion_complementaria ? (
                            perfil.direccionPrincipal.informacion_complementaria
                          ) : (
                            <span className="text-muted fst-italic">No especificada</span>
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-muted small fw-normal">Teléfono de contacto para servicios</dt>
                        <dd className="fs-6 fw-medium text-dark mb-0">
                          {perfil.direccionPrincipal.telefono}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted mb-3">
                        Aún no tienes una dirección principal registrada en tu cuenta.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={iniciarEdicionDireccion}
                      >
                        Registrar dirección principal
                      </button>
                    </div>
                  )
                ) : (
                  // MODO EDICIÓN: DIRECCIÓN PRINCIPAL
                  <form onSubmit={handleSubmitDireccion} noValidate>
                    <div className="mb-3">
                      <label htmlFor="ciudad" className="form-label small fw-semibold">
                        Ciudad <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="ciudad"
                        name="ciudad"
                        className={`form-control ${erroresDireccion.ciudad ? 'is-invalid' : ''}`}
                        value={formDireccion.ciudad}
                        onChange={handleChangeDireccion}
                        placeholder="Ej: Bogotá, Medellín, Cali..."
                        required
                        disabled={guardandoDireccion}
                        maxLength={100}
                        aria-invalid={!!erroresDireccion.ciudad}
                        aria-describedby={erroresDireccion.ciudad ? 'error-ciudad' : undefined}
                      />
                      {erroresDireccion.ciudad && (
                        <div id="error-ciudad" className="invalid-feedback">
                          {erroresDireccion.ciudad}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="barrio_sector" className="form-label small fw-semibold">
                        Barrio o Sector (Opcional)
                      </label>
                      <input
                        type="text"
                        id="barrio_sector"
                        name="barrio_sector"
                        className={`form-control ${erroresDireccion.barrio_sector ? 'is-invalid' : ''}`}
                        value={formDireccion.barrio_sector}
                        onChange={handleChangeDireccion}
                        placeholder="Ej: Chapinero, Poblado, Teusaquillo..."
                        disabled={guardandoDireccion}
                        maxLength={150}
                        aria-invalid={!!erroresDireccion.barrio_sector}
                        aria-describedby={erroresDireccion.barrio_sector ? 'error-barrio' : undefined}
                      />
                      {erroresDireccion.barrio_sector && (
                        <div id="error-barrio" className="invalid-feedback">
                          {erroresDireccion.barrio_sector}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="informacion_complementaria" className="form-label small fw-semibold">
                        Información Complementaria (Opcional)
                      </label>
                      <textarea
                        id="informacion_complementaria"
                        name="informacion_complementaria"
                        rows="2"
                        className={`form-control ${erroresDireccion.informacion_complementaria ? 'is-invalid' : ''}`}
                        value={formDireccion.informacion_complementaria}
                        onChange={handleChangeDireccion}
                        placeholder="Ej: Calle 123 # 45-67, Torre 2 Apto 501, timbre azul..."
                        disabled={guardandoDireccion}
                        maxLength={255}
                        aria-invalid={!!erroresDireccion.informacion_complementaria}
                        aria-describedby={erroresDireccion.informacion_complementaria ? 'error-info' : undefined}
                      />
                      {erroresDireccion.informacion_complementaria && (
                        <div id="error-info" className="invalid-feedback">
                          {erroresDireccion.informacion_complementaria}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="telefono_direccion" className="form-label small fw-semibold">
                        Teléfono de contacto de la dirección <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        id="telefono_direccion"
                        name="telefono"
                        className={`form-control ${erroresDireccion.telefono ? 'is-invalid' : ''}`}
                        value={formDireccion.telefono}
                        onChange={handleChangeDireccion}
                        placeholder="Ej: 3009876543 o fijo 6012345678"
                        required
                        disabled={guardandoDireccion}
                        maxLength={20}
                        aria-invalid={!!erroresDireccion.telefono}
                        aria-describedby={erroresDireccion.telefono ? 'error-tel-dir' : undefined}
                      />
                      {erroresDireccion.telefono && (
                        <div id="error-tel-dir" className="invalid-feedback">
                          {erroresDireccion.telefono}
                        </div>
                      )}
                    </div>

                    <div className="d-flex gap-2 pt-2 border-top">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={guardandoDireccion}
                      >
                        {guardandoDireccion ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                            Guardando...
                          </>
                        ) : (
                          'Guardar dirección'
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={cancelarEdicionDireccion}
                        disabled={guardandoDireccion}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
