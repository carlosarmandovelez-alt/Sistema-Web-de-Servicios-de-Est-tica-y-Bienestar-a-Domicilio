package com.backend.backend.Controller;

import com.backend.backend.DTO.actualizarServicioDTO;
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
    
    // HU-006: Crear servicio
    @PostMapping
    public ResponseEntity<servicioResponseDTO> crearServicio(
            Authentication authentication,
            @Valid @RequestBody crearServicioDTO dto) {
        String email = authentication.getName();
        servicioResponseDTO servicio = servicioService.crearServicio(email, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(servicio);
    }
    
    // HU-007: Consultar un servicio propio
    @GetMapping("/{idServicio}")
    public ResponseEntity<servicioResponseDTO> consultarServicio(
            Authentication authentication,
            @PathVariable Integer idServicio) {
        String email = authentication.getName();
        servicioResponseDTO servicio = servicioService.consultarServicio(email, idServicio);
        return ResponseEntity.ok(servicio);
    }
    
    // HU-007: Actualizar un servicio
    @PutMapping("/{idServicio}")
    public ResponseEntity<servicioResponseDTO> actualizarServicio(
            Authentication authentication,
            @PathVariable Integer idServicio,
            @Valid @RequestBody actualizarServicioDTO dto) {
        String email = authentication.getName();
        servicioResponseDTO servicio = servicioService.actualizarServicio(email, idServicio, dto);
        return ResponseEntity.ok(servicio);
    }
    
    // HU-007: Cambiar estado (activar/desactivar)
    @PatchMapping("/{idServicio}/estado")
    public ResponseEntity<servicioResponseDTO> cambiarEstado(
            Authentication authentication,
            @PathVariable Integer idServicio,
            @RequestParam String estado) {
        String email = authentication.getName();
        servicioResponseDTO servicio = servicioService.cambiarEstadoServicio(email, idServicio, estado);
        return ResponseEntity.ok(servicio);
    }
}