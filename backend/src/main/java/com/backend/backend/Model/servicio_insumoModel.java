package com.backend.backend.Model;

import com.backend.backend.Model.enums.tipoInsumoModel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "servicio_insumo")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class servicio_insumoModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id_insumo;
    
    @ManyToOne
    @JoinColumn(name = "id_servicio", nullable = false)
    private servicioModel servicio;
    
    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 20)
    private tipoInsumoModel tipo;
}