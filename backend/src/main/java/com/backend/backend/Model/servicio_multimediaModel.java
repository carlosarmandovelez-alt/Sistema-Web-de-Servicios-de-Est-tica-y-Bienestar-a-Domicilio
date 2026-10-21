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
    @JoinColumn(name = "id_servicio", nullable = false)
    private servicioModel servicio;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_archivo", nullable = false, length = 20)
    private tipoArchivoModel tipo_archivo;
    
    @Column(name = "url_archivo", nullable = false, length = 500)
    private String url_archivo;
    
    @Column(name = "orden", nullable = false)
    private Integer orden;
}