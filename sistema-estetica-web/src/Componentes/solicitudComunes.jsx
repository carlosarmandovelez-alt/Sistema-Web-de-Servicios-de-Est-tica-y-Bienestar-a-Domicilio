import React from 'react';

export const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente',
  sugerida: 'Contrapropuesta',
  aceptada: 'Aceptada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  rechazada: 'Rechazada',
};

const CLASES_ESTADO = {
  pendiente: 'bg-warning-subtle text-warning-emphasis border-warning-subtle',
  sugerida: 'bg-info-subtle text-info-emphasis border-info-subtle',
  aceptada: 'bg-success-subtle text-success-emphasis border-success-subtle',
  completada: 'bg-primary-subtle text-primary-emphasis border-primary-subtle',
  cancelada: 'bg-secondary-subtle text-secondary-emphasis border-secondary-subtle',
  rechazada: 'bg-danger-subtle text-danger-emphasis border-danger-subtle',
};

export const EstadoSolicitudBadge = ({ estado }) => (
  <span className={`badge border ${CLASES_ESTADO[estado] || 'bg-light text-dark'}`}>
    {ETIQUETAS_ESTADO[estado] || estado}
  </span>
);

export const formatearFechaHora = (valor) => {
  if (!valor) return 'Sin definir';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const formatearHora = (valor) => {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

export const formatearPrecio = (valor) => {
  if (valor === null || valor === undefined) return '';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor));
};

export const FECHA_HORA_ACTUAL_LOCAL = () => {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
  return ahora.toISOString().slice(0, 16);
};
