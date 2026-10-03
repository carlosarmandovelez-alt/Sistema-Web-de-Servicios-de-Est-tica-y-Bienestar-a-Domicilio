package com.backend.backend.Repository;

import com.backend.backend.Model.categoriaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface categoriaRepository extends JpaRepository<categoriaModel, Integer> {
    
    Optional<categoriaModel> findByNombre(String nombre);
}