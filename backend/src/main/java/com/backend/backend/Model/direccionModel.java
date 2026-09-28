package com.backend.backend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "direccion")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class direccionModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id_direccion;
    
    @ManyToOne
    @JoinColumn(name = "cliente_id_cliente")
    private clienteModel cliente;
    
    private Boolean es_principal;
    
    private String telefono;
    
    private String ciudad;
    
    private String barrio_sector;
    
    private String informacion_complementaria;
    
    private LocalDateTime fecha_creacion;
}