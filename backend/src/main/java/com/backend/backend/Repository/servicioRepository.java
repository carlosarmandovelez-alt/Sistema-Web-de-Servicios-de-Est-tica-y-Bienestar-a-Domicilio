package com.backend.backend.Repository;

import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.servicioModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface servicioRepository extends JpaRepository<servicioModel, Integer> {
    
    List<servicioModel> findByProveedor(proveedorModel proveedor);
}