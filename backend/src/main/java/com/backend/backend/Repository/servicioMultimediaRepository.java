package com.backend.backend.Repository;

import com.backend.backend.Model.servicioModel;
import com.backend.backend.Model.servicio_multimediaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface servicioMultimediaRepository extends JpaRepository<servicio_multimediaModel, Integer> {
    
    List<servicio_multimediaModel> findByServicio(servicioModel servicio);
}