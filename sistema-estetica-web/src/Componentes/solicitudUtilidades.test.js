import {
  calcularHoraFin,
  construirFechaHoraSolicitada,
  describirHoraFin,
  esFechaHoraFutura,
  esFechaValida,
  esHoraValida,
  formatearLocalDateTime,
  mapearEstadoSolicitud,
  parsearFechaHoraLocal,
  parsearLocalDateTime,
} from './solicitudUtilidades';

describe('HU-012: utilidades de fecha, hora y estado', () => {
  test('construye el LocalDateTime sin zona horaria que espera el backend', () => {
    expect(construirFechaHoraSolicitada('2026-11-12', '13:00')).toBe(
      '2026-11-12T13:00:00'
    );
    expect(construirFechaHoraSolicitada('2026-11-12', '13:00:45')).toBe(
      '2026-11-12T13:00:45'
    );
  });

  test('rechaza fechas y horas inválidas', () => {
    expect(esFechaValida('2026-02-30')).toBe(false);
    expect(esFechaValida('2026-13-01')).toBe(false);
    expect(esHoraValida('24:00')).toBe(false);
    expect(esHoraValida('10:75')).toBe(false);
    expect(construirFechaHoraSolicitada('2026-02-30', '10:00')).toBeNull();
  });

  test('calcula la hora final sumando la duración (CA-10)', () => {
    const fin = calcularHoraFin('2026-11-12', '10:00', 90);
    expect(fin).toBeInstanceOf(Date);
    expect(fin.getHours()).toBe(11);
    expect(fin.getMinutes()).toBe(30);
    expect(describirHoraFin('2026-11-12', '10:00', 90)).toBe('11:30');
  });

  test('contempla duraciones que cambian de día', () => {
    const fin = calcularHoraFin('2026-11-12', '23:30', 60);
    expect(fin.getDate()).toBe(13);
    expect(fin.getHours()).toBe(0);
    expect(fin.getMinutes()).toBe(30);
    expect(describirHoraFin('2026-11-12', '23:30', 60)).toBe('00:30 del 13/11/2026');
  });

  test('interpreta los LocalDateTime del backend sin desplazarlos a UTC', () => {
    const fecha = parsearLocalDateTime('2026-11-12T13:00:00');
    expect(fecha.getFullYear()).toBe(2026);
    expect(fecha.getMonth()).toBe(10);
    expect(fecha.getDate()).toBe(12);
    expect(fecha.getHours()).toBe(13);
    expect(fecha.getMinutes()).toBe(0);
    expect(formatearLocalDateTime('2026-11-12T13:00:00')).toBe('12/11/2026 13:00');
  });

  test('compara contra el momento actual para respetar @Future', () => {
    const ahora = new Date(2026, 10, 4, 15, 10);
    expect(esFechaHoraFutura('2026-11-04', '15:00', ahora)).toBe(false);
    expect(esFechaHoraFutura('2026-11-04', '15:11', ahora)).toBe(true);
    expect(parsearFechaHoraLocal('2026-11-04', '15:11')).toBeInstanceOf(Date);
  });

  test('presenta el estado pendiente con la etiqueta de la historia', () => {
    expect(mapearEstadoSolicitud('pendiente')).toBe('Pendiente');
    expect(mapearEstadoSolicitud('SUGERIDA')).toBe('Sugerida');
    expect(mapearEstadoSolicitud(null)).toBe('No informado');
  });
});
