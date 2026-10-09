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
    const errorMessage = data.message || data.mensaje || 'Error al iniciar sesión';
    throw new Error(errorMessage);
  }

  return data;
};