import {
  calcularFinSolicitud,
  obtenerClaseEstadoSolicitud,
  obtenerDatosAtencion,
  obtenerMotivoSolicitud,
  ordenarSolicitudesPorCreacion,
} from './solicitudConsultaUtilidades';

describe('HU-013: utilidades de consulta de solicitudes', () => {
  test('diferencia visualmente los estados reales del backend', () => {
    expect(obtenerClaseEstadoSolicitud('pendiente')).toContain('bg-warning-subtle');
    expect(obtenerClaseEstadoSolicitud('sugerida')).toContain('bg-info-subtle');
    expect(obtenerClaseEstadoSolicitud('aceptada')).toContain('bg-primary-subtle');
    expect(obtenerClaseEstadoSolicitud('completada')).toContain('bg-success-subtle');
    expect(obtenerClaseEstadoSolicitud('cancelada')).toContain('bg-secondary-subtle');
    expect(obtenerClaseEstadoSolicitud('rechazada')).toContain('bg-danger-subtle');
    expect(obtenerClaseEstadoSolicitud('otro')).toContain('bg-light');
  });

  test('ordena por fecha de creación, de la más reciente a la más antigua', () => {
    const solicitudes = [
      { id_solicitud: 1, fecha_creacion: '2026-11-01T10:00:00' },
      { id_solicitud: 3, fecha_creacion: '2026-11-03T10:00:00' },
      { id_solicitud: 2, fecha_creacion: '2026-11-02T10:00:00' },
    ];

    expect(ordenarSolicitudesPorCreacion(solicitudes).map((s) => s.id_solicitud)).toEqual([
      3, 2, 1,
    ]);
    // No muta el arreglo original.
    expect(solicitudes.map((s) => s.id_solicitud)).toEqual([1, 3, 2]);
  });

  test('usa la fecha de atención y el id cuando falta la fecha de creación', () => {
    const solicitudes = [
      { id_solicitud: 1, fecha_hora_solicitada: '2026-11-01T10:00:00' },
      { id_solicitud: 3, fecha_hora_solicitada: '2026-11-03T10:00:00' },
      { id_solicitud: 2, fecha_hora_solicitada: '2026-11-02T10:00:00' },
    ];

    expect(ordenarSolicitudesPorCreacion(solicitudes).map((s) => s.id_solicitud)).toEqual([
      3, 2, 1,
    ]);
    expect(
      ordenarSolicitudesPorCreacion([
        { id_solicitud: 1 },
        { id_solicitud: 2 },
      ]).map((s) => s.id_solicitud)
    ).toEqual([2, 1]);
  });

  test('calcula el periodo de atención con la duración conservada', () => {
    const solicitud = {
      fecha_hora_solicitada: '2026-11-12T10:00:00',
      duracion_snapshot_minutos: 90,
    };
    const atencion = obtenerDatosAtencion(solicitud);

    expect(atencion.fechaTexto).toBe('12/11/2026');
    expect(atencion.inicioTexto).toBe('12/11/2026 10:00');
    expect(atencion.finTexto).toBe('11:30');
    expect(atencion.rangoHorario).toBe('10:00 – 11:30');
    expect(calcularFinSolicitud(solicitud)).toBeInstanceOf(Date);
  });

  test('contempla cambios de día en la hora final', () => {
    const atencion = obtenerDatosAtencion({
      fecha_hora_solicitada: '2026-11-12T23:30:00',
      duracion_snapshot_minutos: 60,
    });

    expect(atencion.finTexto).toBe('00:30 del 13/11/2026');
    expect(atencion.rangoHorario).toBe('23:30 – 00:30 del 13/11/2026');
  });

  test('no inventa una hora final si falta la duración', () => {
    const atencion = obtenerDatosAtencion({
      fecha_hora_solicitada: '2026-11-12T10:00:00',
      duracion_snapshot_minutos: null,
    });

    expect(atencion.finTexto).toBe('');
    expect(atencion.rangoHorario).toBe('10:00');
    expect(calcularFinSolicitud({ fecha_hora_solicitada: '2026-11-12T10:00:00' })).toBeNull();
  });

  test('contextualiza el motivo según el estado, sin mezclar rechazo y cancelación', () => {
    expect(
      obtenerMotivoSolicitud({
        estado: 'rechazada',
        motivo_rechazo_cancelacion: 'No hay cobertura para la fecha',
      })
    ).toEqual({
      tipo: 'rechazo',
      etiqueta: 'Motivo de rechazo',
      motivo: 'No hay cobertura para la fecha',
    });

    expect(
      obtenerMotivoSolicitud({
        estado: 'cancelada',
        motivo_rechazo_cancelacion: 'Cancelada por el Cliente',
      })
    ).toEqual({
      tipo: 'cancelacion',
      etiqueta: 'Motivo de cancelación',
      motivo: 'Cancelada por el Cliente',
    });

    expect(
      obtenerMotivoSolicitud({
        estado: 'pendiente',
        motivo_rechazo_cancelacion: 'Este motivo no corresponde al estado actual',
      })
    ).toBeNull();
  });

  test('mantiene el motivo vacío cuando el backend no lo registró', () => {
    expect(
      obtenerMotivoSolicitud({
        estado: 'rechazada',
        motivo_rechazo_cancelacion: null,
      })
    ).toEqual({
      tipo: 'rechazo',
      etiqueta: 'Motivo de rechazo',
      motivo: '',
    });

    expect(
      obtenerMotivoSolicitud({
        estado: 'cancelada',
        motivo_rechazo_cancelacion: '   ',
      })
    ).toEqual({
      tipo: 'cancelacion',
      etiqueta: 'Motivo de cancelación',
      motivo: '',
    });
  });
});
