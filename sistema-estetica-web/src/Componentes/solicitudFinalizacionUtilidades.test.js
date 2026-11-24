import {
  mensajeErrorFinalizacion,
  puedeFinalizarReserva,
} from './solicitudFinalizacionUtilidades';

describe('HU-018: utilidades de finalización', () => {
  test('solo una reserva Aceptada puede marcarse como Completada', () => {
    ['aceptada', 'ACEPTADA', ' Aceptada '].forEach((estado) => {
      expect(puedeFinalizarReserva({ estado })).toBe(true);
    });

    ['pendiente', 'sugerida', 'rechazada', 'cancelada', 'completada'].forEach(
      (estado) => {
        expect(puedeFinalizarReserva({ estado })).toBe(false);
      }
    );
  });

  test('traduce los errores de autorización, no encontrado y transición', () => {
    expect(mensajeErrorFinalizacion({ status: 404 }, 'fallback')).toMatch(
      /no existe o no está asociada/i
    );
    expect(
      mensajeErrorFinalizacion({ status: 403, message: 'Sin permiso' }, 'fallback')
    ).toBe('Sin permiso');
    expect(
      mensajeErrorFinalizacion(
        { status: 400, message: 'Solo se pueden completar reservas Aceptadas' },
        'fallback'
      )
    ).toBe('Solo se pueden completar reservas Aceptadas');
    expect(mensajeErrorFinalizacion(null, 'fallback')).toBe('fallback');
  });
});
