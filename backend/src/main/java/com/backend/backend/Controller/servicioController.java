package com.backend.backend.Controller;

import com.backend.backend.DTO.crearServicioDTO;
import com.backend.backend.DTO.servicioResponseDTO;
import com.backend.backend.Service.servicioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "*")
public class servicioController {
    
    @Autowired
    private servicioService servicioService;
    
    @PostMapping
    public ResponseEntity<servicioResponseDTO> crearServicio(
            Authentication authentication,
            @Valid @RequestBody crearServicioDTO dto) {
        String email = authentication.getName();
        servicioResponseDTO servicio = servicioService.crearServicio(email, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(servicio);
    }
}