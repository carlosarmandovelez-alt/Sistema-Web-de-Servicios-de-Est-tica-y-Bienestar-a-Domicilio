package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class categoriaResponseDTO {
    
    private Integer id_categoria;
    private String nombre;
}

