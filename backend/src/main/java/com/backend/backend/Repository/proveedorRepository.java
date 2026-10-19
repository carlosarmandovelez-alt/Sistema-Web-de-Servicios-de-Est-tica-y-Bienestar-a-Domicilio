package com.backend.backend.Repository;

import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.usuarioModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface proveedorRepository extends JpaRepository<proveedorModel, Integer> {
    
    Optional<proveedorModel> findByUsuario(usuarioModel usuario);
    
    // Proveedores que tienen al menos un servicio activo
    @Query("SELECT DISTINCT p FROM proveedorModel p JOIN servicioModel s ON s.proveedor = p WHERE s.estado = 'activo'")
    List<proveedorModel> findProveedoresConServiciosActivos();
}