package com.backend.backend.Repository;

import com.backend.backend.Model.categoriaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface categoriaRepository extends JpaRepository<categoriaModel, Integer> {
    
    Optional<categoriaModel> findByNombre(String nombre);
    
    // HU-009: categorías ordenadas para el filtro de exploración.
    // Se usa JPQL porque el nombre del campo (id_categoria) no es una ruta de
    // propiedad válida para Sort en Spring Data 4.
    @Query("SELECT c FROM categoriaModel c ORDER BY c.id_categoria ASC")
    List<categoriaModel> listarOrdenadasPorId();
}