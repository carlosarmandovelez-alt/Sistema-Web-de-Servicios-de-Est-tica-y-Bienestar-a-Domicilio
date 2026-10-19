package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class proveedorResponseDTO {
    
    private Integer id;
    private String nombre;
    private String apellido;
    private String email;
    private String telefono;
    private String perfil_profesional;
    private List<zonaCoberturaDTO> zonasAtencion;
}