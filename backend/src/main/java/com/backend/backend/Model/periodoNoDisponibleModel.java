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
    private Integer id_periodo;

    @ManyToOne
    @JoinColumn(name = "id_proveedor")
    private proveedorModel proveedor;

    private LocalDate fecha_inicio;

    private LocalDate fecha_fin;
}
