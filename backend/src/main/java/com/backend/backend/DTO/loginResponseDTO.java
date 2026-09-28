package com.backend.backend.DTO;

import com.backend.backend.Model.enums.rolModel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class loginResponseDTO {
    
    private String token;
    private String tipo;
    private Integer id;
    private String nombre;
    private String email;
    private rolModel rol;
}