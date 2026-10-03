package com.backend.backend.Repository;

import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.usuarioModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface proveedorRepository extends JpaRepository<proveedorModel, Integer> {
    
    Optional<proveedorModel> findByUsuario(usuarioModel usuario);
}