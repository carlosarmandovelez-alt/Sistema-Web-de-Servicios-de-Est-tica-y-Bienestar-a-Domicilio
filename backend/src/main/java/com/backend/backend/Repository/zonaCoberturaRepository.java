package com.backend.backend.Repository;

import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.zona_coberturaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface zonaCoberturaRepository extends JpaRepository<zona_coberturaModel, Integer> {
    
    List<zona_coberturaModel> findByProveedor(proveedorModel proveedor);
    
    void deleteByProveedor(proveedorModel proveedor);
}