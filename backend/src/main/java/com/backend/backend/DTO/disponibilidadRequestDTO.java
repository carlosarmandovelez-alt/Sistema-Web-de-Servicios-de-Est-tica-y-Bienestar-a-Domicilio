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
public class disponibilidadRequestDTO {
    
    @NotNull(message = "El día de la semana es obligatorio")
    private diaSemanaModel dia_semana;
    
    @NotNull(message = "La hora de inicio es obligatoria")
    private LocalTime hora_inicio;
    
    @NotNull(message = "La hora de fin es obligatoria")
    private LocalTime hora_fin;
}