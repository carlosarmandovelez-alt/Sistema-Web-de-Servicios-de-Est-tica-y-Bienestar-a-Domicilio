package com.backend.backend.Controller;

import com.backend.backend.DTO.actualizarProveedorDTO;
import com.backend.backend.DTO.proveedorResponseDTO;
import com.backend.backend.DTO.zonaCoberturaDTO;
import com.backend.backend.Service.proveedorService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/proveedores")
@CrossOrigin(origins = "*")
public class proveedorController {
    
    @Autowired
    private proveedorService proveedorService;
    
    @GetMapping("/perfil")
    public ResponseEntity<proveedorResponseDTO> consultarPerfil(Authentication authentication) {
        String email = authentication.getName();
        proveedorResponseDTO perfil = proveedorService.consultarPerfil(email);
        return ResponseEntity.ok(perfil);
    }
    
    @PutMapping("/perfil")
    public ResponseEntity<proveedorResponseDTO> actualizarPerfil(
            Authentication authentication,
            @Valid @RequestBody actualizarProveedorDTO dto) {
        String email = authentication.getName();
        proveedorResponseDTO perfil = proveedorService.actualizarPerfil(email, dto);
        return ResponseEntity.ok(perfil);
    }
    
    @PutMapping("/zonas")
    public ResponseEntity<proveedorResponseDTO> actualizarZonas(
            Authentication authentication,
            @Valid @RequestBody List<zonaCoberturaDTO> zonas) {
        String email = authentication.getName();
        proveedorResponseDTO perfil = proveedorService.actualizarZonasAtencion(email, zonas);
        return ResponseEntity.ok(perfil);
    }
}