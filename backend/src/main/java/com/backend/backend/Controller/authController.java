package com.backend.backend.Controller;

import com.backend.backend.DTO.registroRequestDTO;
import com.backend.backend.DTO.usuarioResponseDTO;
import com.backend.backend.Service.usuarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class authController {
    
    @Autowired
    private usuarioService usuarioService;
    
    @PostMapping("/registro")
    public ResponseEntity<usuarioResponseDTO> registrar(@Valid @RequestBody registroRequestDTO dto) {
        usuarioResponseDTO usuario = usuarioService.registrar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(usuario);
    }
}