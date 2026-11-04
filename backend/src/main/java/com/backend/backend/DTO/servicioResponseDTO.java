package com.backend.backend.DTO;

import com.backend.backend.Model.enums.estadoServicioModel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class servicioResponseDTO {
    
    private Integer id;
    private Integer id_categoria;
    private String categoria;
    private String nombre;
    private String descripcion;
    private Integer duracion_minutos;
    private BigDecimal precio;
    private estadoServicioModel estado;
    private LocalDateTime fecha_creacion;
    private LocalDateTime fecha_actualizacion;
    private Integer id_proveedor;
}