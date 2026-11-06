package com.backend.backend.Model;

import com.backend.backend.Model.enums.diaSemanaModel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalTime;

@Entity
@Table(name = "disponibilidad")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class disponibilidadModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id_disponibilidad;
    
    @Enumerated(EnumType.STRING)
    private diaSemanaModel dia_semana;
    
    private LocalTime hora_inicio;
    
    private LocalTime hora_fin;
    
    @ManyToOne
    @JoinColumn(name = "id_proveedor")
    private proveedorModel proveedor;
}