package com.backend.backend.Service;

import com.backend.backend.DTO.categoriaResponseDTO;
import com.backend.backend.Repository.categoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class categoriaService {
    
    @Autowired
    private categoriaRepository categoriaRepository;
    
    @Transactional(readOnly = true)
    public List<categoriaResponseDTO> listarCategorias() {
        return categoriaRepository.findAll(Sort.by(Sort.Direction.ASC, "id_categoria")).stream()
            .map(c -> new categoriaResponseDTO(c.getId_categoria(), c.getNombre()))
            .toList();
    }
}

