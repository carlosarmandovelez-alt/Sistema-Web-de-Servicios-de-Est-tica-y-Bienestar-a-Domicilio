package com.backend.backend.Repository;

import com.backend.backend.Model.categoriaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface categoriaRepository extends JpaRepository<categoriaModel, Integer> {
    
    Optional<categoriaModel> findByNombre(String nombre);

    @Query("SELECT c FROM categoriaModel c ORDER BY c.id_categoria ASC")
    List<categoriaModel> listarOrdenadasPorId();
}
