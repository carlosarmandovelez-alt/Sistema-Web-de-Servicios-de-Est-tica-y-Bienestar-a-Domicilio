package com.backend.backend.Controller;

import com.backend.backend.DTO.*;
import com.backend.backend.Service.servicioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/proveedores/servicios")
@CrossOrigin(origins = "*")
public class servicioController {
    
    @Autowired
    private servicioService servicioService;
    
    // ... (Endpoints de HU-006 y HU-007 se mantienen igual) ...
    @PostMapping
    public ResponseEntity<servicioResponseDTO> crearServicio(Authentication authentication, @Valid @RequestBody crearServicioDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioService.crearServicio(authentication.getName(), dto));
    }
    @GetMapping("/{idServicio}")
    public ResponseEntity<servicioResponseDTO> consultarServicio(Authentication authentication, @PathVariable Integer idServicio) {
        return ResponseEntity.ok(servicioService.consultarServicio(authentication.getName(), idServicio));
    }
    @PutMapping("/{idServicio}")
    public ResponseEntity<servicioResponseDTO> actualizarServicio(Authentication authentication, @PathVariable Integer idServicio, @Valid @RequestBody actualizarServicioDTO dto) {
        return ResponseEntity.ok(servicioService.actualizarServicio(authentication.getName(), idServicio, dto));
    }
    @PatchMapping("/{idServicio}/estado")
    public ResponseEntity<servicioResponseDTO> cambiarEstado(Authentication authentication, @PathVariable Integer idServicio, @RequestParam String estado) {
        return ResponseEntity.ok(servicioService.cambiarEstadoServicio(authentication.getName(), idServicio, estado));
    }

    // ============================================
    // HU-008 (CON NOMBRES CORREGIDOS)
    // ============================================
    @PostMapping("/{idServicio}/multimedia")
    public ResponseEntity<MultimediaDTO> agregarMultimedia(
            Authentication authentication,
            @PathVariable Integer idServicio,
            @Valid @RequestBody multimediaRequestDTO dto) { // <-- CAMBIO
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioService.agregarMultimedia(authentication.getName(), idServicio, dto));
    }

    @GetMapping("/{idServicio}/multimedia")
    public ResponseEntity<List<MultimediaDTO>> consultarMultimedia(Authentication authentication, @PathVariable Integer idServicio) {
        return ResponseEntity.ok(servicioService.consultarMultimedia(authentication.getName(), idServicio));
    }

    @PostMapping("/{idServicio}/insumos")
    public ResponseEntity<InsumoDTO> agregarInsumo(
            Authentication authentication,
            @PathVariable Integer idServicio,
            @Valid @RequestBody insumoRequestDTO dto) { // <-- CAMBIO
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioService.agregarInsumo(authentication.getName(), idServicio, dto));
    }

    @GetMapping("/{idServicio}/insumos")
    public ResponseEntity<List<InsumoDTO>> consultarInsumos(Authentication authentication, @PathVariable Integer idServicio) {
        return ResponseEntity.ok(servicioService.consultarInsumos(authentication.getName(), idServicio));
    }
}