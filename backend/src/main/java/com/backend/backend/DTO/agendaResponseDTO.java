package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class agendaResponseDTO {
    
    private Integer id_solicitud;
    private String nombre_servicio;
    private LocalDateTime fecha_hora_inicio;
    private LocalDateTime fecha_hora_fin; // Calculada
    private String nombre_cliente;
    private String direccion_texto;
    private String barrio_sector;
}