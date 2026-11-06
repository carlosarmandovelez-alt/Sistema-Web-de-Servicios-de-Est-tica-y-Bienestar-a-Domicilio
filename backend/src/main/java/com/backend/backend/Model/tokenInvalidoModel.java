package com.backend.backend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "token_invalido")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class tokenInvalidoModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_token")
    private Integer id;
    
    @Column(name = "token", length = 500, nullable = false)
    private String token;
    
    @Column(name = "fecha_invalidacion")
    private LocalDateTime fechaInvalidacion;
}