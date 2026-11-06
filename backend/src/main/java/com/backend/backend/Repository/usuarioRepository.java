package com.backend.backend.Repository;

import com.backend.backend.Model.usuarioModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface usuarioRepository extends JpaRepository<usuarioModel, Integer> {
    
    Optional<usuarioModel> findByEmail(String email);
    
    boolean existsByEmail(String email);
}