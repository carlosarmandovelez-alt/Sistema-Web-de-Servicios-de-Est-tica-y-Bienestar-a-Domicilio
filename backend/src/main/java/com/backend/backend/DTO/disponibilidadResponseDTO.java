package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class disponibilidadResponseDTO {
    
    private Integer id;
    private String dia_semana;
    private String hora_inicio;
    private String hora_fin;
}