package com.backend.backend.Controller;

import com.backend.backend.DTO.actualizarServicioDTO;
import com.backend.backend.DTO.cambiarEstadoServicioDTO;
import com.backend.backend.DTO.crearServicioDTO;
import com.backend.backend.DTO.servicioResponseDTO;
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
    
    // HU-006: Registrar nuevo servicio
    @PostMapping
    public ResponseEntity<servicioResponseDTO> crearServicio(
            Authentication authentication,
            @Valid @RequestBody crearServicioDTO dto) {
        String email = authentication.getName();
        servicioResponseDTO servicio = servicioService.crearServicio(email, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(servicio);
    }
    
    // HU-006 / HU-007: Listar catálogo propio
    @GetMapping("/mis-servicios")
    public ResponseEntity<List<servicioResponseDTO>> listarMisServicios(Authentication authentication) {
        String email = authentication.getName();
        List<servicioResponseDTO> servicios = servicioService.listarServiciosProveedor(email);
        return ResponseEntity.ok(servicios);
    }
    
    // HU-007 CA-01: Consultar detalle de un servicio propio
    @GetMapping("/{id}")
    public ResponseEntity<servicioResponseDTO> consultarServicioPropio(
            Authentication authentication,
            @PathVariable Integer id) {
        String email = authentication.getName();
        servicioResponseDTO servicio = servicioService.consultarServicioPropio(email, id);
        return ResponseEntity.ok(servicio);
    }
    
    // HU-007 CA-02: Actualizar información de un servicio propio
    @PutMapping("/{id}")
    public ResponseEntity<servicioResponseDTO> actualizarServicio(
            Authentication authentication,
            @PathVariable Integer id,
            @Valid @RequestBody actualizarServicioDTO dto) {
        String email = authentication.getName();
        servicioResponseDTO servicioActualizado = servicioService.actualizarServicio(email, id, dto);
        return ResponseEntity.ok(servicioActualizado);
    }
    
    // HU-007 CA-03 y CA-04: Activar / Desactivar servicio propio
    @PatchMapping("/{id}/estado")
    public ResponseEntity<servicioResponseDTO> cambiarEstadoServicio(
            Authentication authentication,
            @PathVariable Integer id,
            @Valid @RequestBody cambiarEstadoServicioDTO dto) {
        String email = authentication.getName();
        servicioResponseDTO servicioActualizado = servicioService.cambiarEstadoServicio(email, id, dto.getEstado());
        return ResponseEntity.ok(servicioActualizado);
    }
}
