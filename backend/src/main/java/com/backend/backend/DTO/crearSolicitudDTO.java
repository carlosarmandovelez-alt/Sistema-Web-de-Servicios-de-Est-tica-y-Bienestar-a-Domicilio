package com.backend.backend.DTO;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class crearSolicitudDTO {
    
    @NotNull(message = "El ID del servicio es obligatorio")
    private Integer id_servicio;
    
    @NotNull(message = "La fecha y hora solicitada es obligatoria")
    @Future(message = "La fecha y hora de la solicitud debe ser en el futuro")
    private LocalDateTime fecha_hora_solicitada;
    
    @NotBlank(message = "La dirección de atención es obligatoria")
    @Size(max = 255, message = "La dirección no puede superar los 255 caracteres")
    private String direccion_texto;
    
    @Size(max = 150, message = "El barrio o sector no puede superar los 150 caracteres")
    private String barrio_sector;
    
    @Size(max = 255, message = "La información complementaria no puede superar los 255 caracteres")
    private String informacion_complementaria;
    
    @Size(max = 500, message = "Las observaciones no pueden superar los 500 caracteres")
    private String observaciones;
}