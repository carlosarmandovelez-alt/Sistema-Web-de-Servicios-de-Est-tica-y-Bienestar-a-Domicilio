package com.backend.backend.DTO;

import com.backend.backend.Model.enums.diaSemanaModel;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class crearDisponibilidadDTO {

    @NotNull(message = "El día de la semana es obligatorio")
    private diaSemanaModel dia_semana;

    @NotNull(message = "La hora inicial es obligatoria")
    private LocalTime hora_inicio;

    @NotNull(message = "La hora final es obligatoria")
    private LocalTime hora_fin;
}
