package com.backend.backend.Model;

import com.backend.backend.Model.enums.tipoArchivoModel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "servicio_multimedia")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class servicio_multimediaModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id_multimedia;
    
    @ManyToOne
    @JoinColumn(name = "id_servicio")
    private servicioModel servicio;
    
    @Enumerated(EnumType.STRING)
    private tipoArchivoModel tipo_archivo;
    
    private String url_archivo;
    
    private Integer orden;
}