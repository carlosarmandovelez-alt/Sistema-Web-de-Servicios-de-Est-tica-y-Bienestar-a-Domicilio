package com.backend.backend.Model;

import com.backend.backend.Model.enums.estadoCuentaModel;
import com.backend.backend.Model.enums.rolModel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuario")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class usuarioModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer id;
    
    private String email;
    
    private String password_hash;
    
    @Enumerated(EnumType.STRING)
    private rolModel rol;
    
    private String nombre;
    
    private String apellido;
    
    private String telefono;
    
    @Enumerated(EnumType.STRING)
    private estadoCuentaModel estado_cuenta;
    
    private LocalDateTime fecha_registro;
    
    private LocalDateTime fecha_actualizacion;
}