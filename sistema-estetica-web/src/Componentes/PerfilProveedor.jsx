import React, { useState, useEffect, useCallback } from 'react';
import {
  consultarPerfilProveedor,
  actualizarPerfilProveedor,
  actualizarZonasAtencion,
} from '../Servicios/proveedorService';

export const PerfilProveedor = ({ sesion, onCerrarSesion, onActualizarSesion, mostrarHeader = true }) => {
  // Estado general del perfil cargado desde el backend
  const [perfil, setPerfil] = useState(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Estados de edición para Perfil Profesional
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [formPerfil, setFormPerfil] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    perfil_profesional: '',
  });
  const [erroresPerfil, setErroresPerfil] = useState({});

  // Estados para Gestión de Zonas de Atención
  const [modoZona, setModoZona] = useState(null); // null | 'crear' | 'editar'
  const [indiceZonaEditando, setIndiceZonaEditando] = useState(null);
  const [guardandoZonas, setGuardandoZonas] = useState(false);
  const [formZona, setFormZona] = useState({
    ciudad: '',
    barrio_sector: '',
  });
  const [erroresZona, setErroresZona] = useState({});
  const [zonaAEliminar, setZonaAEliminar] = useState(null);

  // Función para cargar o recargar el perfil desde el backend
  const cargarPerfil = useCallback(async () => {
    if (!sesion?.token) {
      setErrorGeneral('No se encontró una sesión activa válida.');
      setCargandoInicial(false);
      return;
    }

    if (sesion?.rol && sesion.rol !== 'proveedor') {
      setErrorGeneral('Acceso denegado: este panel está disponible únicamente para usuarios con rol de Proveedor.');
      setCargandoInicial(false);
      return;
    }

    setCargandoInicial(true);
    setErrorGeneral(null);

    try {
      const data = await consultarPerfilProveedor(sesion.token);
      setPerfil(data);

      // Sincronizar formulario local de perfil con la información confirmada por el backend
      setFormPerfil({
        nombre: data.nombre || '',
        apellido: data.apellido || '',
        telefono: data.telefono || '',
        perfil_profesional: data.perfil_profesional || '',
      });
    } catch (err) {
      if (err.esErrorAutenticacion && onCerrarSesion) {
        setErrorGeneral(err.message || 'Tu sesión ha expirado o no tienes permisos de proveedor.');
      } else {
        setErrorGeneral(err.message || 'Error al obtener la información del perfil profesional.');
      }
    } finally {
      setCargandoInicial(false);
    }
  }, [sesion?.token, sesion?.rol, onCerrarSesion]);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  // Manejo de cambios en el formulario del perfil profesional
  const handleChangePerfil = (e) => {
    const { name, value } = e.target;
    setFormPerfil((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (erroresPerfil[name]) {
      setErroresPerfil((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Manejo de cambios en el formulario de zona
  const handleChangeZona = (e) => {
    const { name, value } = e.target;
    setFormZona((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (erroresZona[name]) {
      setErroresZona((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Validaciones del frontend para el perfil profesional
  const validarFormPerfil = () => {
    const nuevosErrores = {};
    const nombreTrim = (formPerfil.nombre || '').trim();
    const apellidoTrim = (formPerfil.apellido || '').trim();
    const telefonoTrim = (formPerfil.telefono || '').trim();
    const perfilProfTrim = (formPerfil.perfil_profesional || '').trim();

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

    if (telefonoTrim) {
      const regexTelefono = /^[0-9+() -]{7,20}$/;
      if (!regexTelefono.test(telefonoTrim)) {
        nuevosErrores.telefono = 'El teléfono no tiene un formato válido (máximo 20 caracteres)';
      }
    }

    if (perfilProfTrim && perfilProfTrim.length > 5000) {
      nuevosErrores.perfil_profesional = 'El perfil profesional no puede superar los 5000 caracteres';
    }

    setErroresPerfil(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Iniciar edición de perfil profesional
  const iniciarEdicionPerfil = () => {
    setFormPerfil({
      nombre: perfil?.nombre || '',
      apellido: perfil?.apellido || '',
      telefono: perfil?.telefono || '',
      perfil_profesional: perfil?.perfil_profesional || '',
    });
    setErroresPerfil({});
    setMensajeExito(null);
    setErrorGeneral(null);
    setEditandoPerfil(true);
  };

  // Cancelar edición de perfil profesional
  const cancelarEdicionPerfil = () => {
    setFormPerfil({
      nombre: perfil?.nombre || '',
      apellido: perfil?.apellido || '',
      telefono: perfil?.telefono || '',
      perfil_profesional: perfil?.perfil_profesional || '',
    });
    setErroresPerfil({});
    setEditandoPerfil(false);
  };

  // Guardar datos del perfil profesional en el servidor
  const handleSubmitPerfil = async (e) => {
    e.preventDefault();
    setMensajeExito(null);
    setErrorGeneral(null);

    if (!validarFormPerfil()) {
      return;
    }

    setGuardandoPerfil(true);

    const payload = {
      nombre: formPerfil.nombre.trim(),
      apellido: formPerfil.apellido.trim(),
      telefono: formPerfil.telefono ? formPerfil.telefono.trim() : null,
      perfil_profesional: formPerfil.perfil_profesional ? formPerfil.perfil_profesional.trim() : null,
    };

    try {
      const perfilActualizado = await actualizarPerfilProveedor(sesion.token, payload);
      setPerfil(perfilActualizado);
      setEditandoPerfil(false);
      setMensajeExito('Perfil profesional actualizado correctamente.');

      // Notificar a App si cambió el nombre para actualizar la cabecera
      if (onActualizarSesion && perfilActualizado.nombre) {
        onActualizarSesion({
          ...sesion,
          nombre: perfilActualizado.nombre,
        });
      }
    } catch (err) {
      if (err.fieldErrors) {
        setErroresPerfil(err.fieldErrors);
        setErrorGeneral('Por favor revisa y corrige los campos señalados.');
      } else if (err.esErrorAutenticacion && onCerrarSesion) {
        setErrorGeneral(err.message);
      } else {
        setErrorGeneral(err.message || 'No fue posible guardar los cambios del perfil profesional.');
      }
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // Validaciones del formulario de zonas
  const validarFormZona = (zonasExistentes, indiceExcluir = null) => {
    const nuevosErrores = {};
    const ciudadTrim = (formZona.ciudad || '').trim();
    const barrioTrim = (formZona.barrio_sector || '').trim();

    if (!ciudadTrim) {
      nuevosErrores.ciudad = 'La ciudad es obligatoria';
    } else if (ciudadTrim.length > 100) {
      nuevosErrores.ciudad = 'La ciudad no puede superar los 100 caracteres';
    }

    if (barrioTrim && barrioTrim.length > 150) {
      nuevosErrores.barrio_sector = 'El barrio o sector no puede superar los 150 caracteres';
    }

    // Comprobación de duplicados (misma ciudad y mismo barrio/sector, insensible a mayúsculas)
    if (!nuevosErrores.ciudad) {
      const esDuplicado = zonasExistentes.some((z, idx) => {
        if (indiceExcluir !== null && idx === indiceExcluir) {
          return false;
        }
        const mismaCiudad = (z.ciudad || '').trim().toLowerCase() === ciudadTrim.toLowerCase();
        const mismoBarrio = (z.barrio_sector || '').trim().toLowerCase() === barrioTrim.toLowerCase();
        return mismaCiudad && mismoBarrio;
      });

      if (esDuplicado) {
        nuevosErrores.ciudad = 'Ya tienes registrada esta zona con la misma ciudad y barrio/sector.';
      }
    }

    setErroresZona(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Abrir formulario para añadir una nueva zona
  const abrirCrearZona = () => {
    setFormZona({ ciudad: '', barrio_sector: '' });
    setErroresZona({});
    setIndiceZonaEditando(null);
    setModoZona('crear');
    setZonaAEliminar(null);
  };

  // Abrir formulario para editar una zona existente
  const abrirEditarZona = (zona, index) => {
    setFormZona({
      ciudad: zona.ciudad || '',
      barrio_sector: zona.barrio_sector || '',
    });
    setErroresZona({});
    setIndiceZonaEditando(index);
    setModoZona('editar');
    setZonaAEliminar(null);
  };

  // Cancelar la acción de zona
  const cancelarFormZona = () => {
    setFormZona({ ciudad: '', barrio_sector: '' });
    setErroresZona({});
    setIndiceZonaEditando(null);
    setModoZona(null);
  };

  // Guardar zona (nueva o editada) enviando la lista completa a PUT /api/proveedores/zonas
  const handleSubmitZona = async (e) => {
    e.preventDefault();
    setMensajeExito(null);
    setErrorGeneral(null);

    const zonasActuales = perfil?.zonasAtencion ? [...perfil.zonasAtencion] : [];

    if (!validarFormZona(zonasActuales, modoZona === 'editar' ? indiceZonaEditando : null)) {
      return;
    }

    const nuevaZonaDTO = {
      ciudad: formZona.ciudad.trim(),
      barrio_sector: formZona.barrio_sector ? formZona.barrio_sector.trim() : null,
    };

    let listaActualizada;
    if (modoZona === 'crear') {
      listaActualizada = [...zonasActuales, nuevaZonaDTO];
    } else if (modoZona === 'editar' && indiceZonaEditando !== null) {
      listaActualizada = zonasActuales.map((z, idx) => (idx === indiceZonaEditando ? nuevaZonaDTO : z));
    } else {
      return;
    }

    setGuardandoZonas(true);

    try {
      const perfilActualizado = await actualizarZonasAtencion(sesion.token, listaActualizada);
      setPerfil(perfilActualizado);
      cancelarFormZona();
      setMensajeExito(
        modoZona === 'crear'
          ? 'Nueva zona de atención agregada exitosamente.'
          : 'Zona de atención actualizada exitosamente.'
      );
    } catch (err) {
      if (err.fieldErrors) {
        setErroresZona(err.fieldErrors);
        setErrorGeneral('Por favor revisa y corrige los campos de la zona.');
      } else if (err.esErrorAutenticacion && onCerrarSesion) {
        setErrorGeneral(err.message);
      } else {
        setErrorGeneral(err.message || 'No fue posible guardar las zonas de atención.');
      }
    } finally {
      setGuardandoZonas(false);
    }
  };

  // Confirmar y ejecutar eliminación de una zona
  const handleEliminarZona = async (indexAEliminar) => {
    setMensajeExito(null);
    setErrorGeneral(null);

    const zonasActuales = perfil?.zonasAtencion ? [...perfil.zonasAtencion] : [];
    const listaActualizada = zonasActuales.filter((_, idx) => idx !== indexAEliminar);

    setGuardandoZonas(true);

    try {
      const perfilActualizado = await actualizarZonasAtencion(sesion.token, listaActualizada);
      setPerfil(perfilActualizado);
      setZonaAEliminar(null);
      if (indiceZonaEditando === indexAEliminar) {
        cancelarFormZona();
      }
      setMensajeExito('Zona de atención eliminada exitosamente.');
    } catch (err) {
      if (err.esErrorAutenticacion && onCerrarSesion) {
        setErrorGeneral(err.message);
      } else {
        setErrorGeneral(err.message || 'No fue posible eliminar la zona de atención.');
      }
    } finally {
      setGuardandoZonas(false);
    }
  };

  return (
    <div className={mostrarHeader ? 'container py-4' : ''} style={mostrarHeader ? { maxWidth: '960px' } : undefined}>
      {/* Encabezado y barra superior */}
      {mostrarHeader && (
        <header className="d-flex flex-wrap justify-content-between align-items-center pb-3 mb-4 border-bottom">
          <div>
            <h2 className="h4 mb-1 text-primary fw-bold">Bienestar en Casa</h2>
            <p className="text-muted small mb-0">Mi Perfil Profesional y Zonas de Atención</p>
          </div>
          <div className="d-flex align-items-center gap-3 mt-2 mt-sm-0">
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle py-2 px-3">
              Proveedor: {perfil?.nombre || sesion?.nombre || 'Profesional'} {perfil?.apellido || ''}
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
      )}

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
          <p className="text-muted mt-3">Consultando información del perfil profesional...</p>
        </div>
      ) : (
        <div className="row g-4">
          {/* SECCIÓN 1: DATOS PROFESIONALES */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h3 className="h5 mb-0 fw-semibold text-dark">Perfil Profesional</h3>
                {!editandoPerfil && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={iniciarEdicionPerfil}
                  >
                    Editar datos
                  </button>
                )}
              </div>

              <div className="card-body">
                {!editandoPerfil ? (
                  // MODO VISTA: DATOS DEL PERFIL PROFESIONAL
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
                      <dt className="text-muted small fw-normal">Teléfono de contacto</dt>
                      <dd className="fs-6 fw-medium text-dark mb-0">
                        {perfil?.telefono ? perfil.telefono : <span className="text-muted fst-italic">No registrado</span>}
                      </dd>
                    </div>

                    <div className="mb-3">
                      <dt className="text-muted small fw-normal">Presentación y perfil profesional</dt>
                      <dd className="fs-6 text-dark mb-0 p-3 bg-light rounded border">
                        {perfil?.perfil_profesional ? (
                          <span style={{ whiteSpace: 'pre-wrap' }}>{perfil.perfil_profesional}</span>
                        ) : (
                          <span className="text-muted fst-italic">
                            Aún no has registrado una descripción profesional. Haz clic en "Editar datos" para describir tus especialidades y trayectoria.
                          </span>
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted small fw-normal">Identificador de usuario</dt>
                      <dd className="small text-secondary mb-0">ID #{perfil?.id}</dd>
                    </div>
                  </dl>
                ) : (
                  // MODO EDICIÓN: DATOS DEL PERFIL PROFESIONAL
                  <form onSubmit={handleSubmitPerfil} noValidate>
                    <div className="mb-3">
                      <label htmlFor="nombre" className="form-label small fw-semibold">
                        Nombre <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        className={`form-control ${erroresPerfil.nombre ? 'is-invalid' : ''}`}
                        value={formPerfil.nombre}
                        onChange={handleChangePerfil}
                        maxLength={100}
                        disabled={guardandoPerfil}
                        required
                      />
                      {erroresPerfil.nombre && (
                        <div className="invalid-feedback">{erroresPerfil.nombre}</div>
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
                        className={`form-control ${erroresPerfil.apellido ? 'is-invalid' : ''}`}
                        value={formPerfil.apellido}
                        onChange={handleChangePerfil}
                        maxLength={100}
                        disabled={guardandoPerfil}
                        required
                      />
                      {erroresPerfil.apellido && (
                        <div className="invalid-feedback">{erroresPerfil.apellido}</div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="telefono" className="form-label small fw-semibold">
                        Teléfono de contacto
                      </label>
                      <input
                        type="tel"
                        id="telefono"
                        name="telefono"
                        className={`form-control ${erroresPerfil.telefono ? 'is-invalid' : ''}`}
                        value={formPerfil.telefono}
                        onChange={handleChangePerfil}
                        placeholder="Ej: 3001234567"
                        maxLength={20}
                        disabled={guardandoPerfil}
                      />
                      {erroresPerfil.telefono ? (
                        <div className="invalid-feedback">{erroresPerfil.telefono}</div>
                      ) : (
                        <small className="text-muted">Opcional. Máximo 20 caracteres.</small>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <label htmlFor="perfil_profesional" className="form-label small fw-semibold mb-0">
                          Perfil profesional y experiencia
                        </label>
                        <small className="text-muted">
                          {(formPerfil.perfil_profesional || '').length}/5000
                        </small>
                      </div>
                      <textarea
                        id="perfil_profesional"
                        name="perfil_profesional"
                        rows={5}
                        className={`form-control mt-1 ${erroresPerfil.perfil_profesional ? 'is-invalid' : ''}`}
                        value={formPerfil.perfil_profesional}
                        onChange={handleChangePerfil}
                        placeholder="Describe tu formación, especialidades, certificaciones y años de experiencia en servicios de belleza y bienestar..."
                        maxLength={5000}
                        disabled={guardandoPerfil}
                      />
                      {erroresPerfil.perfil_profesional && (
                        <div className="invalid-feedback">{erroresPerfil.perfil_profesional}</div>
                      )}
                    </div>

                    <div className="d-flex gap-2 justify-content-end pt-2">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={cancelarEdicionPerfil}
                        disabled={guardandoPerfil}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={guardandoPerfil}
                      >
                        {guardandoPerfil ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                            Guardando...
                          </>
                        ) : (
                          'Guardar cambios'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: ZONAS GENERALES DE ATENCIÓN */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="h5 mb-0 fw-semibold text-dark">Zonas de Atención</h3>
                  <small className="text-muted">Ciudades y sectores donde prestas servicios</small>
                </div>
                {modoZona === null && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={abrirCrearZona}
                    disabled={guardandoZonas}
                  >
                    + Agregar zona
                  </button>
                )}
              </div>

              <div className="card-body">
                {/* Nota informativa obligatoria sobre el carácter orientativo */}
                <div className="alert alert-info py-2 px-3 small mb-3 border-0 bg-info-subtle text-info-emphasis">
                  <strong>Nota informativa:</strong> Estas zonas son <em>orientativas</em> y no garantizan cobertura para una dirección específica. Tienen un propósito puramente orientativo para que los clientes conozcan tus localidades habituales. No se realizan cálculos de distancia ni validaciones de proximidad geográfica.
                </div>

                {/* Subformulario para crear o editar una zona */}
                {modoZona !== null && (
                  <div className="p-3 mb-3 border rounded bg-light">
                    <h4 className="h6 fw-bold mb-3 text-primary">
                      {modoZona === 'crear' ? 'Nueva Zona de Atención' : 'Editar Zona de Atención'}
                    </h4>
                    <form onSubmit={handleSubmitZona} noValidate>
                      <div className="mb-2">
                        <label htmlFor="ciudad" className="form-label small fw-semibold">
                          Ciudad <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          id="ciudad"
                          name="ciudad"
                          className={`form-control form-control-sm ${erroresZona.ciudad ? 'is-invalid' : ''}`}
                          value={formZona.ciudad}
                          onChange={handleChangeZona}
                          placeholder="Ej: Bogotá, Medellín, Cali..."
                          maxLength={100}
                          disabled={guardandoZonas}
                          required
                        />
                        {erroresZona.ciudad && (
                          <div className="invalid-feedback">{erroresZona.ciudad}</div>
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
                          className={`form-control form-control-sm ${erroresZona.barrio_sector ? 'is-invalid' : ''}`}
                          value={formZona.barrio_sector}
                          onChange={handleChangeZona}
                          placeholder="Ej: Chapinero, Poblado, Norte... (opcional)"
                          maxLength={150}
                          disabled={guardandoZonas}
                        />
                        {erroresZona.barrio_sector ? (
                          <div className="invalid-feedback">{erroresZona.barrio_sector}</div>
                        ) : (
                          <small className="text-muted">Si lo dejas vacío, aplicará para toda la ciudad o sector general.</small>
                        )}
                      </div>

                      <div className="d-flex gap-2 justify-content-end">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={cancelarFormZona}
                          disabled={guardandoZonas}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm"
                          disabled={guardandoZonas}
                        >
                          {guardandoZonas ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                              Guardando...
                            </>
                          ) : modoZona === 'crear' ? (
                            'Guardar zona'
                          ) : (
                            'Actualizar zona'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Confirmación para eliminar zona */}
                {zonaAEliminar !== null && (
                  <div className="alert alert-warning p-3 mb-3" role="alert">
                    <p className="mb-2 small">
                      ¿Confirmas que deseas eliminar la zona{' '}
                      <strong>{perfil?.zonasAtencion?.[zonaAEliminar]?.ciudad}</strong>
                      {perfil?.zonasAtencion?.[zonaAEliminar]?.barrio_sector
                        ? ` (${perfil.zonasAtencion[zonaAEliminar].barrio_sector})`
                        : ''}
                      ?
                    </p>
                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setZonaAEliminar(null)}
                        disabled={guardandoZonas}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleEliminarZona(zonaAEliminar)}
                        disabled={guardandoZonas}
                        aria-label="Confirmar eliminación"
                      >
                        {guardandoZonas ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de zonas registradas */}
                {(!perfil?.zonasAtencion || perfil.zonasAtencion.length === 0) ? (
                  // ESTADO VACÍO
                  <div className="text-center py-4 px-3 border border-dashed rounded bg-light">
                    <p className="text-muted mb-2">
                      No tienes zonas de atención registradas actualmente.
                    </p>
                    <p className="small text-muted mb-3">
                      Agrega las ciudades o sectores generales donde prestas tus servicios a domicilio para que los clientes puedan encontrarte.
                    </p>
                    {modoZona === null && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={abrirCrearZona}
                        disabled={guardandoZonas}
                      >
                        Registrar mi primera zona
                      </button>
                    )}
                  </div>
                ) : (
                  // LISTADO DE ZONAS
                  <div className="list-group">
                    {perfil.zonasAtencion.map((zona, index) => (
                      <div
                        key={`${zona.ciudad}-${zona.barrio_sector || 'gral'}-${index}`}
                        className="list-group-item d-flex justify-content-between align-items-center py-2 px-3"
                      >
                        <div>
                          <div className="fw-semibold text-dark">{zona.ciudad}</div>
                          <small className="text-muted">
                            {zona.barrio_sector ? (
                              <span>
                                Sector / Barrio: <strong className="text-secondary fw-semibold">{zona.barrio_sector}</strong>
                              </span>
                            ) : (
                              <span className="fst-italic text-secondary">Toda la ciudad o sector general</span>
                            )}
                          </small>
                        </div>
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => abrirEditarZona(zona, index)}
                            disabled={guardandoZonas || modoZona !== null || zonaAEliminar !== null}
                            title="Editar zona"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => setZonaAEliminar(index)}
                            disabled={guardandoZonas || modoZona !== null || zonaAEliminar !== null}
                            title="Eliminar zona"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};