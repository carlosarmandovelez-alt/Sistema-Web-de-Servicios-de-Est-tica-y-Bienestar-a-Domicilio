package com.backend.backend.Repository;

import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.usuarioModel;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface proveedorRepository extends JpaRepository<proveedorModel, Integer> {
    
    Optional<proveedorModel> findByUsuario(usuarioModel usuario);
    
    // Proveedores que tienen al menos un servicio activo
    @Query("SELECT DISTINCT p FROM proveedorModel p JOIN servicioModel s ON s.proveedor = p WHERE s.estado = 'activo'")
    List<proveedorModel> findProveedoresConServiciosActivos();

    /**
     * HU-015 (CA-11): bloqueo pesimista de la fila del Proveedor.
     *
     * Todas las aceptaciones de un mismo Proveedor compiten por este bloqueo,
     * de modo que se serializan y la segunda aceptación ve la reserva que
     * confirmó la primera. Requiere una transacción activa.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM proveedorModel p WHERE p.id_proveedor = :id")
    Optional<proveedorModel> buscarPorIdConBloqueo(@Param("id") Integer id);
}