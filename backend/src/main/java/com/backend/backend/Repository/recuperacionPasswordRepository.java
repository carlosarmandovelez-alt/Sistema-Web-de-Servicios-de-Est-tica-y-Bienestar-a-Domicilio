package com.backend.backend.Repository;

import com.backend.backend.Model.recuperacion_passwordModel;
import com.backend.backend.Model.usuarioModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface recuperacionPasswordRepository extends JpaRepository<recuperacion_passwordModel, Integer> {
    
    @Query("SELECT r FROM recuperacion_passwordModel r WHERE r.usuario = :usuario AND r.usado = false ORDER BY r.fecha_creacion DESC")
    Optional<recuperacion_passwordModel> buscarUltimoOtpActivo(@Param("usuario") usuarioModel usuario);
    
    @Query("SELECT r FROM recuperacion_passwordModel r WHERE r.usuario = :usuario AND r.codigo_token = :codigo AND r.usado = false")
    Optional<recuperacion_passwordModel> buscarPorUsuarioYCodigo(
        @Param("usuario") usuarioModel usuario, 
        @Param("codigo") String codigo
    );
}