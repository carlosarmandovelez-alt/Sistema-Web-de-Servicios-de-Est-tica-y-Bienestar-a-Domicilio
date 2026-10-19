package com.backend.backend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "cliente")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class clienteModel {
    
    @Id
    private Integer id_cliente;
    
    @OneToOne
    @MapsId
    @JoinColumn(name = "id_cliente")
    private usuarioModel usuario;
}