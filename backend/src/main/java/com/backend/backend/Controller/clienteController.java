package com.backend.backend.Controller;

import com.backend.backend.DTO.actualizarClienteDTO;
import com.backend.backend.DTO.clienteResponseDTO;
import com.backend.backend.DTO.direccionDTO;
import com.backend.backend.Service.clienteService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clientes")
@CrossOrigin(origins = "*")
public class clienteController {
    
    @Autowired
    private clienteService clienteService;
    
    @GetMapping("/perfil")
    public ResponseEntity<clienteResponseDTO> consultarPerfil(Authentication authentication) {
        String email = authentication.getName();
        clienteResponseDTO perfil = clienteService.consultarPerfil(email);
        return ResponseEntity.ok(perfil);
    }
    
    @PutMapping("/perfil")
    public ResponseEntity<clienteResponseDTO> actualizarPerfil(
            Authentication authentication,
            @Valid @RequestBody actualizarClienteDTO dto) {
        String email = authentication.getName();
        clienteResponseDTO perfil = clienteService.actualizarDatosPersonales(email, dto);
        return ResponseEntity.ok(perfil);
    }
    
    @PutMapping("/direccion")
    public ResponseEntity<clienteResponseDTO> actualizarDireccion(
            Authentication authentication,
            @Valid @RequestBody direccionDTO dto) {
        String email = authentication.getName();
        clienteResponseDTO perfil = clienteService.actualizarDireccionPrincipal(email, dto);
        return ResponseEntity.ok(perfil);
    }
}