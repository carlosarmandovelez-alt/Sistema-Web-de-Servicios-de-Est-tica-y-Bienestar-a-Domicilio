package com.backend.backend.Repository;

import com.backend.backend.Model.clienteModel;
import com.backend.backend.Model.enums.estadoSolicitudModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.solicitud_reservaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface solicitudReservaRepository extends JpaRepository<solicitud_reservaModel, Integer> {

    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.cliente = :cliente ORDER BY s.fecha_creacion DESC")
    List<solicitud_reservaModel> listarPorCliente(@Param("cliente") clienteModel cliente);

    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.proveedor = :proveedor ORDER BY s.fecha_creacion DESC")
    List<solicitud_reservaModel> listarPorProveedor(@Param("proveedor") proveedorModel proveedor);

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

    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.proveedor = :proveedor AND s.estado = :estado "
         + "ORDER BY s.fecha_hora_solicitada ASC")
    List<solicitud_reservaModel> agenda(
        @Param("proveedor") proveedorModel proveedor,
        @Param("estado") estadoSolicitudModel estado
    );

    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.proveedor = :proveedor AND s.estado = :estado "
         + "AND s.fecha_hora_solicitada >= :desde ORDER BY s.fecha_hora_solicitada ASC")
    List<solicitud_reservaModel> agendaDesde(
        @Param("proveedor") proveedorModel proveedor,
        @Param("estado") estadoSolicitudModel estado,
        @Param("desde") LocalDateTime desde
    );

    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.proveedor = :proveedor AND s.estado = :estado "
         + "AND s.fecha_hora_solicitada <= :hasta ORDER BY s.fecha_hora_solicitada ASC")
    List<solicitud_reservaModel> agendaHasta(
        @Param("proveedor") proveedorModel proveedor,
        @Param("estado") estadoSolicitudModel estado,
        @Param("hasta") LocalDateTime hasta
    );

    @Query("SELECT s FROM solicitud_reservaModel s WHERE s.proveedor = :proveedor AND s.estado = :estado "
         + "AND s.fecha_hora_solicitada BETWEEN :desde AND :hasta ORDER BY s.fecha_hora_solicitada ASC")
    List<solicitud_reservaModel> agendaEntre(
        @Param("proveedor") proveedorModel proveedor,
        @Param("estado") estadoSolicitudModel estado,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta
    );
}
