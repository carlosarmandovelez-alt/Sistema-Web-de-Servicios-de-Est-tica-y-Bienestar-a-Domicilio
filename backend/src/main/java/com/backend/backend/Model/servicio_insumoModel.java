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
    @JoinColumn(name = "id_servicio")
    private servicioModel servicio;
    
    private String nombre;
    
    @Enumerated(EnumType.STRING)
    private tipoInsumoModel tipo;
}