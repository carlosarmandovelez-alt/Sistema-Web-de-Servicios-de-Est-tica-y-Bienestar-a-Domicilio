package com.backend.backend.Repository;

import com.backend.backend.Model.disponibilidadModel;
import com.backend.backend.Model.proveedorModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface disponibilidadRepository extends JpaRepository<disponibilidadModel, Integer> {
    
    List<disponibilidadModel> findByProveedor(proveedorModel proveedor);
    
    void deleteByProveedor(proveedorModel proveedor);
}