package com.backend.backend.Model;

import com.backend.backend.Model.enums.estadoServicioModel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "servicio")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class servicioModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id_servicio;
    
    @ManyToOne
    @JoinColumn(name = "id_categoria")
    private categoriaModel categoria;
    
    private String nombre;
    
    private String descripcion;
    
    private Integer duracion_minutos;
    
    private BigDecimal precio;
    
    @Enumerated(EnumType.STRING)
    private estadoServicioModel estado;
    
    private LocalDateTime fecha_creacion;
    
    private LocalDateTime fecha_actualizacion;
    
    @ManyToOne
    @JoinColumn(name = "id_proveedor")
    private proveedorModel proveedor;
}