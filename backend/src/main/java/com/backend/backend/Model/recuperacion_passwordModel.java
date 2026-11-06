package com.backend.backend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "recuperacion_password")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class recuperacion_passwordModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id_recuperacion;
    
    @ManyToOne
    @JoinColumn(name = "id_usuario")
    private usuarioModel usuario;
    
    private String codigo_token;
    
    private LocalDateTime fecha_expiracion;
    
    private Boolean usado;
    
    private LocalDateTime fecha_creacion;
}