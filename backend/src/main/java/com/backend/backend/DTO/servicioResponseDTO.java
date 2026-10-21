package com.backend.backend.DTO;

import com.backend.backend.Model.enums.estadoServicioModel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
    
    // HU-008: información complementaria consultable junto con el servicio
    private List<MultimediaDTO> multimedia;
    private List<InsumoDTO> insumos;
    
    /**
     * Constructor conservado para los consumidores previos a la HU-008.
     * La información complementaria queda vacía.
     */
    public servicioResponseDTO(Integer id, Integer id_categoria, String categoria, String nombre,
                               String descripcion, Integer duracion_minutos, BigDecimal precio,
                               estadoServicioModel estado, LocalDateTime fecha_creacion,
                               LocalDateTime fecha_actualizacion, Integer id_proveedor) {
        this(id, id_categoria, categoria, nombre, descripcion, duracion_minutos, precio, estado,
             fecha_creacion, fecha_actualizacion, id_proveedor, List.of(), List.of());
    }
}