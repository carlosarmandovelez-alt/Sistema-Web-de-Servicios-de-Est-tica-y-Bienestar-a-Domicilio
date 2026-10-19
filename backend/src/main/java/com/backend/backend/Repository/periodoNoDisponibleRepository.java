package com.backend.backend.Repository;

import com.backend.backend.Model.periodoNoDisponibleModel;
import com.backend.backend.Model.proveedorModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface periodoNoDisponibleRepository extends JpaRepository<periodoNoDisponibleModel, Integer> {
    
    List<periodoNoDisponibleModel> findByProveedor(proveedorModel proveedor);
    
    void deleteByProveedor(proveedorModel proveedor);
}