package com.backend.backend.Repository;

import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.servicioModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface servicioRepository extends JpaRepository<servicioModel, Integer> {
    
    List<servicioModel> findByProveedor(proveedorModel proveedor);
    
    // HU-007: Buscar un servicio por ID y proveedor (con @Query para evitar el error de 'id')
    @Query("SELECT s FROM servicioModel s WHERE s.id_servicio = :id AND s.proveedor = :proveedor")
    Optional<servicioModel> buscarPorIdYProveedor(
        @Param("id") Integer id, 
        @Param("proveedor") proveedorModel proveedor
    );

    // HU-009: Servicios activos por categoría
    @Query("SELECT s FROM servicioModel s WHERE s.estado = :estado AND s.categoria.id_categoria = :idCategoria")
    List<servicioModel> buscarPorCategoriaYEstado(
        @Param("estado") estadoServicioModel estado,
        @Param("idCategoria") Integer idCategoria
    );
    
    // HU-009: Servicios activos por nombre
    @Query("SELECT s FROM servicioModel s WHERE s.estado = :estado AND LOWER(s.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))")
    List<servicioModel> buscarPorNombreYEstado(
        @Param("estado") estadoServicioModel estado,
        @Param("nombre") String nombre
    );
    
    // HU-009: Todos los servicios activos
    List<servicioModel> findByEstado(estadoServicioModel estado);
}