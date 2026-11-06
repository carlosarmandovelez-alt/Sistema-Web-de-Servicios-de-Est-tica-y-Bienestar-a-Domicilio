package com.backend.backend.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "periodo_no_disponible")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class periodoNoDisponibleModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_periodo")
    private Integer id_periodo;
    
    @Column(name = "fecha_inicio")
    private LocalDate fecha_inicio;
    
    @Column(name = "fecha_fin")
    private LocalDate fecha_fin;
    
    @Column(name = "motivo")
    private String motivo;
    
    @ManyToOne
    @JoinColumn(name = "id_proveedor")
    private proveedorModel proveedor;
}