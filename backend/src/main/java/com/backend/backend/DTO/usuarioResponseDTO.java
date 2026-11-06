package com.backend.backend.DTO;

import com.backend.backend.Model.enums.estadoCuentaModel;
import com.backend.backend.Model.enums.rolModel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class usuarioResponseDTO {
    
    private Integer id_usuario;
    private String nombre;
    private String apellido;
    private String email;
    private String telefono;
    private rolModel rol;
    private estadoCuentaModel estado_cuenta;
}