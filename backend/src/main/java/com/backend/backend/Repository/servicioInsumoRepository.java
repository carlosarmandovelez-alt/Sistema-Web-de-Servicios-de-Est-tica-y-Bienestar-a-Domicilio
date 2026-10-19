package com.backend.backend.Repository;

import com.backend.backend.Model.servicio_insumoModel;
import com.backend.backend.Model.servicioModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface servicioInsumoRepository extends JpaRepository<servicio_insumoModel, Integer> {
    
    List<servicio_insumoModel> findByServicio(servicioModel servicio);
}