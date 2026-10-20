package com.backend.backend.Controller;

import com.backend.backend.DTO.categoriaResponseDTO;
import com.backend.backend.Service.categoriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categorias")
@CrossOrigin(origins = "*")
public class categoriaController {
    
    @Autowired
    private categoriaService categoriaService;
    
    @GetMapping
    public ResponseEntity<List<categoriaResponseDTO>> listarCategorias() {
        return ResponseEntity.ok(categoriaService.listarCategorias());
    }
}

