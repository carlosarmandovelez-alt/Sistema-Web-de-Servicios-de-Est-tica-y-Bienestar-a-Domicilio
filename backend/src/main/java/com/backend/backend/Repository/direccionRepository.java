package com.backend.backend.Repository;

import com.backend.backend.Model.clienteModel;
import com.backend.backend.Model.direccionModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface direccionRepository extends JpaRepository<direccionModel, Integer> {
    
    List<direccionModel> findByCliente(clienteModel cliente);
    
    @Query("SELECT d FROM direccionModel d WHERE d.cliente = :cliente AND d.es_principal = :es_principal")
    Optional<direccionModel> buscarPorClienteYEsPrincipal(
        @Param("cliente") clienteModel cliente, 
        @Param("es_principal") Boolean es_principal
    );
}