package com.backend.backend.Repository;

import com.backend.backend.Model.servicioModel;
import com.backend.backend.Model.servicio_multimediaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface servicioMultimediaRepository extends JpaRepository<servicio_multimediaModel, Integer> {
    
    List<servicio_multimediaModel> findByServicio(servicioModel servicio);
    
    // Multimedia ordenada para consultarla como parte de la información del servicio
    @Query("SELECT m FROM servicio_multimediaModel m WHERE m.servicio = :servicio " +
           "ORDER BY m.orden ASC, m.id_multimedia ASC")
    List<servicio_multimediaModel> findByServicioOrdenado(@Param("servicio") servicioModel servicio);
}