package com.backend.backend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "zona_cobertura")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class zona_coberturaModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id_zona;
    
    private String ciudad;
    
    private String barrio_sector;
    
    @ManyToOne
    @JoinColumn(name = "id_proveedor")
    private proveedorModel proveedor;
}