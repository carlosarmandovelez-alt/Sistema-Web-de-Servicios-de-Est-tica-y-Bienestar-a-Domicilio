package com.backend.backend.DTO;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class contrapropuestaDTO {
    
    @NotNull(message = "La nueva fecha y hora es obligatoria")
    @Future(message = "La fecha propuesta debe ser en el futuro")
    private LocalDateTime fecha_hora_propuesta;
}
