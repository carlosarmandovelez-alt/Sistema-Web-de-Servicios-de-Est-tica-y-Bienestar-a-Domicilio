package com.backend.backend.Repository;

import com.backend.backend.Model.clienteModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.solicitud_reservaModel;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    /**
     * HU-015: misma búsqueda que {@link #buscarPorIdYProveedor} pero con
     * bloqueo pesimista de la fila. Serializa las respuestas (aceptar,
     * rechazar, proponer) sobre una misma solicitud para que no se pisen
     * entre sí. Requiere una transacción activa.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.id_solicitud = :idSolicitud AND s.proveedor = :proveedor")
    Optional<solicitud_reservaModel> buscarPorIdYProveedorConBloqueo(
        @Param("idSolicitud") Integer idSolicitud,
        @Param("proveedor") proveedorModel proveedor
    );

    /**
     * HU-016: misma búsqueda que {@link #buscarPorIdYCliente} pero con
     * bloqueo pesimista. Serializa aceptar y rechazar una misma
     * contrapropuesta para que no se pisen entre sí. Requiere transacción.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.id_solicitud = :idSolicitud AND s.cliente = :cliente")
    Optional<solicitud_reservaModel> buscarPorIdYClienteConBloqueo(
        @Param("idSolicitud") Integer idSolicitud,
        @Param("cliente") clienteModel cliente
    );

    // HU-015: Buscar reservas aceptadas por proveedor para validar solapamiento
    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.proveedor = :proveedor AND s.estado = 'aceptada'")
    List<solicitud_reservaModel> findReservasAceptadasByProveedor(@Param("proveedor") proveedorModel proveedor);

    // HU-019: Buscar reservas aceptadas ordenadas cronológicamente.
    // El EntityGraph evita consultas N+1 al recuperar el Cliente y su Usuario.
    @EntityGraph(attributePaths = {"cliente", "cliente.usuario"})
    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.proveedor = :proveedor AND s.estado = 'aceptada' ORDER BY s.fecha_hora_solicitada ASC, s.id_solicitud ASC")
    List<solicitud_reservaModel> findAgendaAceptadaByProveedor(@Param("proveedor") proveedorModel proveedor);
    
}