package com.backend.backend.Repository;

import com.backend.backend.Model.tokenInvalidoModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface tokenInvalidoRepository extends JpaRepository<tokenInvalidoModel, Integer> {
    
    boolean existsByToken(String token);
}