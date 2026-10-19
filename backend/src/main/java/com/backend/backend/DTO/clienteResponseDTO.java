package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class clienteResponseDTO {
    
    private Integer id;
    private String nombre;
    private String apellido;
    private String email;
    private String telefono;
    private direccionDTO direccionPrincipal;
}