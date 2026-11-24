import {
  describirPeriodoAgenda,
  obtenerDuracionAgenda,
  obtenerFinAgenda,
} from './agendaUtilidades';

describe('HU-019: utilidades de agenda', () => {
  test('describe un periodo del mismo día', () => {
    expect(
      describirPeriodoAgenda({
        fecha_hora_inicio: '2026-12-07T10:30:00',
        fecha_hora_fin: '2026-12-07T12:00:00',
        duracion_snapshot_minutos: 90,
      })
    ).toBe('10:30 – 12:00');
  });

  test('calcula el fin con la duración histórica cuando no llega fecha_hora_fin', () => {
    const reserva = {
      fecha_hora_inicio: '2026-12-07T10:30:00',
      duracion_snapshot_minutos: 90,
    };

    expect(obtenerFinAgenda(reserva)).toEqual(new Date(2026, 11, 7, 12, 0));
    expect(describirPeriodoAgenda(reserva)).toBe('10:30 – 12:00');
  });

  test('representa correctamente un fin que cruza la medianoche', () => {
    expect(
      describirPeriodoAgenda({
        fecha_hora_inicio: '2026-12-07T23:30:00',
        fecha_hora_fin: '2026-12-08T01:00:00',
        duracion_snapshot_minutos: 90,
      })
    ).toBe('23:30 del 07/12/2026 – 01:00 del 08/12/2026');
  });

  test('deriva la duración del periodo si el backend antiguo no la envía', () => {
    expect(
      obtenerDuracionAgenda({
        fecha_hora_inicio: '2026-12-07T10:30:00',
        fecha_hora_fin: '2026-12-07T12:00:00',
      })
    ).toBe(90);
  });

  test('devuelve valores vacíos para datos inválidos', () => {
    expect(obtenerFinAgenda({})).toBeNull();
    expect(obtenerDuracionAgenda({})).toBeNull();
    expect(describirPeriodoAgenda({})).toBe('');
  });
});
