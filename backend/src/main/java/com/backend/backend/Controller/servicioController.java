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
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "*")
public class servicioController {

    @Autowired
    private servicioService servicioService;

    // HU-006: Registrar servicio
    @PostMapping
    public ResponseEntity<servicioResponseDTO> crearServicio(
            Authentication authentication,
            @Valid @RequestBody crearServicioDTO dto) {
        String email = authentication.getName();
        servicioResponseDTO servicio = servicioService.crearServicio(email, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(servicio);
    }

    // HU-006: Consultar el catálogo propio
    @GetMapping("/mis-servicios")
    public ResponseEntity<List<servicioResponseDTO>> listarMisServicios(Authentication authentication) {
        return ResponseEntity.ok(servicioService.listarMisServicios(authentication.getName()));
    }

    @GetMapping("/mis-servicios/{idServicio}")
    public ResponseEntity<servicioResponseDTO> consultarMiServicio(
            Authentication authentication,
            @PathVariable Integer idServicio) {
        return ResponseEntity.ok(servicioService.consultarMiServicio(authentication.getName(), idServicio));
    }

    // HU-007: Actualizar y cambiar estado
    @PutMapping("/{idServicio}")
    public ResponseEntity<servicioResponseDTO> actualizarServicio(
            Authentication authentication,
            @PathVariable Integer idServicio,
            @Valid @RequestBody actualizarServicioDTO dto) {
        return ResponseEntity.ok(
            servicioService.actualizarServicio(authentication.getName(), idServicio, dto));
    }

    @PatchMapping("/{idServicio}/estado")
    public ResponseEntity<servicioResponseDTO> cambiarEstadoServicio(
            Authentication authentication,
            @PathVariable Integer idServicio,
            @Valid @RequestBody cambiarEstadoServicioDTO dto) {
        return ResponseEntity.ok(
            servicioService.cambiarEstadoServicio(authentication.getName(), idServicio, dto));
    }

    // HU-008: Multimedia
    @GetMapping("/{idServicio}/multimedia")
    public ResponseEntity<List<MultimediaDTO>> listarMultimedia(
            Authentication authentication,
            @PathVariable Integer idServicio) {
        return ResponseEntity.ok(servicioService.listarMultimedia(authentication.getName(), idServicio));
    }

    @PostMapping("/{idServicio}/multimedia")
    public ResponseEntity<MultimediaDTO> agregarMultimedia(
            Authentication authentication,
            @PathVariable Integer idServicio,
            @RequestBody MultimediaDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(servicioService.agregarMultimedia(authentication.getName(), idServicio, dto));
    }

    @DeleteMapping("/{idServicio}/multimedia/{idMultimedia}")
    public ResponseEntity<Void> eliminarMultimedia(
            Authentication authentication,
            @PathVariable Integer idServicio,
            @PathVariable Integer idMultimedia) {
        servicioService.eliminarMultimedia(authentication.getName(), idServicio, idMultimedia);
        return ResponseEntity.noContent().build();
    }

    // HU-008: Insumos y equipos
    @GetMapping("/{idServicio}/insumos")
    public ResponseEntity<List<InsumoDTO>> listarInsumos(
            Authentication authentication,
            @PathVariable Integer idServicio) {
        return ResponseEntity.ok(servicioService.listarInsumos(authentication.getName(), idServicio));
    }

    @PostMapping("/{idServicio}/insumos")
    public ResponseEntity<InsumoDTO> agregarInsumo(
            Authentication authentication,
            @PathVariable Integer idServicio,
            @RequestBody InsumoDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(servicioService.agregarInsumo(authentication.getName(), idServicio, dto));
    }

    @DeleteMapping("/{idServicio}/insumos/{idInsumo}")
    public ResponseEntity<Void> eliminarInsumo(
            Authentication authentication,
            @PathVariable Integer idServicio,
            @PathVariable Integer idInsumo) {
        servicioService.eliminarInsumo(authentication.getName(), idServicio, idInsumo);
        return ResponseEntity.noContent().build();
    }
}
