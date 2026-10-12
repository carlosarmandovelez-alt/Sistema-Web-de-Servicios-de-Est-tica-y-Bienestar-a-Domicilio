const API_URL = 'http://localhost:8080/api/auth';

export const registrarUsuario = async (datosRegistro) => {
  const response = await fetch(`${API_URL}/registro`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datosRegistro),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.message || data.mensaje || 'Error al registrar el usuario';
    throw new Error(errorMessage);
  }

  return data;
};

export const loginUsuario = async (datosLogin) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datosLogin),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.error || data.message || data.mensaje || 'Error al iniciar sesión';
    throw new Error(errorMessage);
  }

  return data;
};

export const solicitarRecuperacion = async (datosSolicitud) => {
  const response = await fetch(`${API_URL}/solicitar-recuperacion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datosSolicitud),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.error ||
      data.mensaje ||
      data.message ||
      (typeof data === 'object' && Object.values(data).length > 0 ? Object.values(data).join('. ') : null) ||
      'Error al procesar la solicitud de recuperación';
    throw new Error(errorMsg);
  }

  return data;
};

export const validarOtp = async (datosOtp) => {
  const response = await fetch(`${API_URL}/validar-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datosOtp),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.error ||
      data.mensaje ||
      data.message ||
      (typeof data === 'object' && Object.values(data).length > 0 ? Object.values(data).join('. ') : null) ||
      'Código de verificación inválido o expirado';
    throw new Error(errorMsg);
  }

  return data;
};

export const restablecerPassword = async (datosReset) => {
  const response = await fetch(`${API_URL}/restablecer-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datosReset),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.error ||
      data.mensaje ||
      data.message ||
      (typeof data === 'object' && Object.values(data).length > 0 ? Object.values(data).join('. ') : null) ||
      'Error al restablecer la contraseña';
    throw new Error(errorMsg);
  }

  return data;
};