import {
  MOTIVO_CANCELACION_MAX,
  mensajeErrorCancelacion,
  puedeCancelarComoCliente,
  puedeCancelarComoProveedor,
  validarMotivoCancelacion,
} from './solicitudCancelacionUtilidades';

describe('HU-017: utilidades de cancelación', () => {
  test('el Cliente puede cancelar Pendiente, Sugerida y Aceptada', () => {
    ['pendiente', 'sugerida', 'aceptada', 'ACEPTADA', ' Sugerida '].forEach(
      (estado) => {
        expect(puedeCancelarComoCliente({ estado })).toBe(true);
      }
    );
  });

  test('el Cliente no puede cancelar Completada, Cancelada ni Rechazada', () => {
    ['completada', 'cancelada', 'rechazada', 'desconocida', null, undefined].forEach(
      (estado) => {
        expect(puedeCancelarComoCliente({ estado })).toBe(false);
      }
    );
  });

  test('el Proveedor solo puede cancelar reservas Aceptada', () => {
    expect(puedeCancelarComoProveedor({ estado: 'aceptada' })).toBe(true);
    ['pendiente', 'sugerida', 'completada', 'cancelada', 'rechazada'].forEach(
      (estado) => {
        expect(puedeCancelarComoProveedor({ estado })).toBe(false);
      }
    );
  });

  test('rechaza motivo vacío, nulo o compuesto solo por espacios', () => {
    [null, undefined, '', '   ', '\t\n'].forEach((motivo) => {
      const resultado = validarMotivoCancelacion(motivo);
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toMatch(/obligatorio/i);
    });
  });

  test('recorta el motivo y acepta hasta el límite de la columna', () => {
    expect(validarMotivoCancelacion('  Ya no lo necesito  ')).toEqual({
      valido: true,
      motivo: 'Ya no lo necesito',
      error: null,
    });

    const limite = 'a'.repeat(MOTIVO_CANCELACION_MAX);
    expect(validarMotivoCancelacion(limite)).toMatchObject({
      valido: true,
      motivo: limite,
    });
  });

  test('rechaza un motivo mayor a 255 caracteres', () => {
    const resultado = validarMotivoCancelacion('a'.repeat(256));
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toMatch(/255/);
  });

  test('traduce los errores de autorización, no encontrado y validación', () => {
    expect(mensajeErrorCancelacion({ status: 404 }, 'fallback')).toMatch(
      /no existe o no está asociada/i
    );
    expect(
      mensajeErrorCancelacion({ status: 403, message: 'Sin permiso' }, 'fallback')
    ).toBe('Sin permiso');
    expect(
      mensajeErrorCancelacion({ status: 400, message: 'Ya está cancelada' }, 'fallback')
    ).toBe('Ya está cancelada');
    expect(mensajeErrorCancelacion(null, 'fallback')).toBe('fallback');
  });
});
