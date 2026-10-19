package com.backend.backend.Repository;

import com.backend.backend.Model.clienteModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.solicitud_reservaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface solicitudReservaRepository extends JpaRepository<solicitud_reservaModel, Integer> {
    
    // HU-013: Solicitudes de un cliente
    List<solicitud_reservaModel> findByCliente(clienteModel cliente);
    
    // HU-014: Solicitudes de un proveedor
    List<solicitud_reservaModel> findByProveedor(proveedorModel proveedor);
    
    // HU-013 / HU-014: Detalle de una solicitud validando dueño (Con @Query para evitar el error de nombres)
    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.id_solicitud = :idSolicitud AND s.cliente = :cliente")
    Optional<solicitud_reservaModel> buscarPorIdYCliente(
        @Param("idSolicitud") Integer idSolicitud, 
        @Param("cliente") clienteModel cliente
    );

    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.id_solicitud = :idSolicitud AND s.proveedor = :proveedor")
    Optional<solicitud_reservaModel> buscarPorIdYProveedor(
        @Param("idSolicitud") Integer idSolicitud, 
        @Param("proveedor") proveedorModel proveedor
    );
}