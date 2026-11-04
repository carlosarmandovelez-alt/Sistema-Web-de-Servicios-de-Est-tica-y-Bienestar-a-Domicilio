package com.backend.backend.DTO;

import com.backend.backend.Model.enums.diaSemanaModel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class disponibilidadDTO {

    private Integer id_disponibilidad;
    private diaSemanaModel dia_semana;
    private LocalTime hora_inicio;
    private LocalTime hora_fin;
}
