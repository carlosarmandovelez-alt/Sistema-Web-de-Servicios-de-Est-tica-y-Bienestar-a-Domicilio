package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * HU-012: disponibilidad de un Proveedor para una fecha concreta, calculada
 * en el servidor a partir de sus franjas habituales, sus periodos de
 * excepción y las solicitudes que ya bloquean el horario.
 *
 * Se expone mediante la exploración pública para que el Cliente pueda elegir
 * una hora real antes de enviar la solicitud. El backend vuelve a validar
 * todo al crear la solicitud.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class disponibilidadPublicaDTO {

    private Integer id_proveedor;

    private Integer id_servicio;

    private Integer duracion_minutos;

    private LocalDate fecha;

    private String dia_semana;

    /** true si hay horario habitual para ese día y no cae en una excepción. */
    private boolean atiende;

    /**
     * Motivo cuando no hay horas disponibles:
     * SERVICIO_NO_DISPONIBLE, PERIODO_NO_DISPONIBLE, SIN_DISPONIBILIDAD_DIA,
     * SIN_HORARIOS_SUFICIENTES o SIN_HORARIOS_LIBRES. null si hay horas.
     */
    private String motivo;

    /** Horas de inicio seleccionables en formato HH:mm, ordenadas. */
    private List<String> horas_disponibles;

    /** Horas de inicio que chocan con solicitudes existentes, en formato HH:mm. */
    private List<String> horas_ocupadas;
}
