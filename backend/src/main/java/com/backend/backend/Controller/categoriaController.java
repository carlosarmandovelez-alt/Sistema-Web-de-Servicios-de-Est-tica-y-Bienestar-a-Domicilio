package com.backend.backend.Controller;

import com.backend.backend.DTO.categoriaDTO;
import com.backend.backend.Repository.categoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categorias")
@CrossOrigin(origins = "*")
public class categoriaController {

    @Autowired
    private categoriaRepository categoriaRepository;

    @GetMapping
    public ResponseEntity<List<categoriaDTO>> listarCategorias() {
        List<categoriaDTO> categorias = categoriaRepository.findAll().stream()
            .sorted(Comparator.comparing(categoria -> categoria.getNombre().toLowerCase()))
            .map(categoria -> new categoriaDTO(categoria.getId_categoria(), categoria.getNombre()))
            .collect(Collectors.toList());

        return ResponseEntity.ok(categorias);
    }
}
