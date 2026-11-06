package com.backend.backend.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class direccionDTO {
    
    @NotBlank(message = "La ciudad es obligatoria")
    @Size(max = 100, message = "La ciudad no puede superar los 100 caracteres")
    private String ciudad;
    
    @Size(max = 150, message = "El barrio o sector no puede superar los 150 caracteres")
    private String barrio_sector;
    
    @Size(max = 255, message = "La información complementaria no puede superar los 255 caracteres")
    private String informacion_complementaria;
    
    @NotBlank(message = "El teléfono de la dirección es obligatorio")
    @Size(max = 20, message = "El teléfono no puede superar los 20 caracteres")
    private String telefono;
}