package com.backend.backend.Model;

import com.backend.backend.Model.enums.estadoSolicitudModel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "solicitud_reserva")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class solicitud_reservaModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id_solicitud;
    
    @ManyToOne
    @JoinColumn(name = "id_servicio")
    private servicioModel servicio;
    
    private String nombre_servicio_snapshot;
    
    private BigDecimal precio_snapshot;
    
    private Integer duracion_snapshot_minutos;
    
    private LocalDateTime fecha_hora_solicitada;
    
    private LocalDateTime fecha_hora_propuesta;
    
    private String direccion_texto;
    
    private String barrio_sector;
    
    private String informacion_complementaria;
    
    private String observaciones;
    
    @Enumerated(EnumType.STRING)
    private estadoSolicitudModel estado;
    
    private String motivo_rechazo_cancelacion;
    
    private LocalDateTime fecha_creacion;
    
    private LocalDateTime fecha_actualizacion;
    
    @ManyToOne
    @JoinColumn(name = "id_cliente")
    private clienteModel cliente;
    
    @ManyToOne
    @JoinColumn(name = "id_proveedor")
    private proveedorModel proveedor;
}