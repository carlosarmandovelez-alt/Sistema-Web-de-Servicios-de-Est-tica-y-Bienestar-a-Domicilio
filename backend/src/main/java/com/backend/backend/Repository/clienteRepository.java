package com.backend.backend.Repository;

import com.backend.backend.Model.clienteModel;
import com.backend.backend.Model.usuarioModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface clienteRepository extends JpaRepository<clienteModel, Integer> {
    
    Optional<clienteModel> findByUsuario(usuarioModel usuario);
}