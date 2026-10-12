import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Registro } from './Componentes/registro';
import { Login } from './Componentes/login';
import { RecuperarPassword } from './Componentes/RecuperarPassword';

const SESION_KEY = 'sesion';

const leerSesion = () => {
  try {
    const guardada = localStorage.getItem(SESION_KEY);
    return guardada ? JSON.parse(guardada) : null;
  } catch {
    return null;
  }
};

function App() {
  const [vista, setVista] = useState('login');
  const [sesion, setSesion] = useState(leerSesion);

  const handleLoginExitoso = (datos) => {
    try {
      localStorage.setItem(SESION_KEY, JSON.stringify(datos));
    } catch {
      // Si el navegador bloquea el almacenamiento, la sesión dura solo mientras la pestaña esté abierta
    }
    setSesion(datos);
  };

  const cerrarSesion = () => {
    try {
      localStorage.removeItem(SESION_KEY);
    } catch {
      // Sin acción: no hay nada que limpiar
    }
    setSesion(null);
    setVista('login');
  };

  // Usuario con sesión iniciada (reemplazar por el panel real cuando exista)
  if (sesion) {
    return (
      <div className="container mt-5" style={{ maxWidth: '480px' }}>
        <div className="card shadow-sm p-4 text-center">
          <h3 className="mb-3">Hola, {sesion.nombre || sesion.email || 'usuario'}</h3>
          {sesion.rol && <p className="text-muted">Rol: {sesion.rol}</p>}
          <button type="button" className="btn btn-outline-secondary" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {vista === 'login' && (
        <Login
          onLoginExitoso={handleLoginExitoso}
          onIrARegistro={() => setVista('registro')}
          onOlvidarPassword={() => setVista('recuperar')}
        />
      )}

      {vista === 'registro' && (
        <>
          <Registro />
          <p className="text-center mt-3">
            ¿Ya tienes cuenta?{' '}
            <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => setVista('login')}>
              Inicia sesión
            </button>
          </p>
        </>
      )}

      {vista === 'recuperar' && (
        <RecuperarPassword onVolverALogin={() => setVista('login')} />
      )}
    </div>
  );
}

export default App;