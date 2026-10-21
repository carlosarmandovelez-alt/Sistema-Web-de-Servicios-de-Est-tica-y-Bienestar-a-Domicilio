package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class solicitudResponseDTO {

    private Integer id_solicitud;
    private String nombre_servicio_snapshot;
    private BigDecimal precio_snapshot;
    private Integer duracion_snapshot_minutos;
    private LocalDateTime fecha_hora_solicitada;
    private LocalDateTime fecha_hora_propuesta;
    private String direccion_texto;
    private String barrio_sector;
    private String informacion_complementaria;
    private String observaciones;
    private String estado;
    private String motivo_rechazo_cancelacion;
    private LocalDateTime fecha_creacion;
    private LocalDateTime fecha_actualizacion;
    private Integer id_cliente;
    private Integer id_proveedor;
    private String nombre_cliente;
    private String apellido_cliente;
}
