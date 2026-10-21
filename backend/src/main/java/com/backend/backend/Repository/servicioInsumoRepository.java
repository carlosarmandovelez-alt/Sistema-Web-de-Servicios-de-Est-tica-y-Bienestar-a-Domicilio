package com.backend.backend.Repository;

import com.backend.backend.Model.servicio_insumoModel;
import com.backend.backend.Model.servicioModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface servicioInsumoRepository extends JpaRepository<servicio_insumoModel, Integer> {
    
    List<servicio_insumoModel> findByServicio(servicioModel servicio);
    
    // HU-008: productos, insumos y equipos ordenados por su identificador de registro
    @Query("SELECT i FROM servicio_insumoModel i WHERE i.servicio = :servicio ORDER BY i.id_insumo ASC")
    List<servicio_insumoModel> findByServicioOrdenado(@Param("servicio") servicioModel servicio);
}