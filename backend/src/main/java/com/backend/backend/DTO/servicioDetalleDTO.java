package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class servicioDetalleDTO {
    
    private Integer id;
    private String nombre;
    private String categoria;
    private String descripcion;
    private Integer duracion_minutos;
    private BigDecimal precio;
    private Integer id_proveedor;
    private String nombre_proveedor;
    private List<MultimediaDTO> multimedia;
    private List<InsumoDTO> insumos;
}