package com.backend.backend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "proveedor")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class proveedorModel {
    
    @Id
    private Integer id_proveedor;
    
    private String perfil_profesional;
    
    @OneToOne
    @MapsId
    @JoinColumn(name = "id_proveedor")
    private usuarioModel usuario;
}