package com.backend.backend.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class periodoNoDisponibleRequestDTO {
    
    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDate fecha_inicio;
    
    @NotNull(message = "La fecha de fin es obligatoria")
    private LocalDate fecha_fin;
    
    private String motivo;
}