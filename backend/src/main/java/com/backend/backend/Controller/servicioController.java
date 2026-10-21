package com.backend.backend.Controller;

import com.backend.backend.DTO.InsumoDTO;
import com.backend.backend.DTO.MultimediaDTO;
import com.backend.backend.DTO.actualizarServicioDTO;
import com.backend.backend.DTO.cambiarEstadoServicioDTO;
import com.backend.backend.DTO.crearServicioDTO;
import com.backend.backend.DTO.insumoRequestDTO;
import com.backend.backend.DTO.multimediaRequestDTO;
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
    
    // ============================================
    // HU-008: Gestión de información complementaria del servicio
    // ============================================
    
    // CA-01: Asociar una fotografía o video de referencia
    @PostMapping("/{id}/multimedia")
    public ResponseEntity<MultimediaDTO> agregarMultimedia(
            Authentication authentication,
            @PathVariable Integer id,
            @Valid @RequestBody multimediaRequestDTO dto) {
        MultimediaDTO multimedia = servicioService.agregarMultimedia(authentication.getName(), id, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(multimedia);
    }
    
    // CA-01 y CA-02: Consultar la multimedia del servicio propio
    @GetMapping("/{id}/multimedia")
    public ResponseEntity<List<MultimediaDTO>> listarMultimedia(
            Authentication authentication,
            @PathVariable Integer id) {
        List<MultimediaDTO> multimedia = servicioService.listarMultimedia(authentication.getName(), id);
        return ResponseEntity.ok(multimedia);
    }
    
    // CA-01 y CA-02: Actualizar una fotografía o video del servicio propio
    @PutMapping("/{id}/multimedia/{idMultimedia}")
    public ResponseEntity<MultimediaDTO> actualizarMultimedia(
            Authentication authentication,
            @PathVariable Integer id,
            @PathVariable Integer idMultimedia,
            @Valid @RequestBody multimediaRequestDTO dto) {
        MultimediaDTO multimedia = servicioService.actualizarMultimedia(
            authentication.getName(), id, idMultimedia, dto);
        return ResponseEntity.ok(multimedia);
    }
    
    // CA-01 y CA-02: Eliminar una fotografía o video del servicio propio
    @DeleteMapping("/{id}/multimedia/{idMultimedia}")
    public ResponseEntity<Void> eliminarMultimedia(
            Authentication authentication,
            @PathVariable Integer id,
            @PathVariable Integer idMultimedia) {
        servicioService.eliminarMultimedia(authentication.getName(), id, idMultimedia);
        return ResponseEntity.noContent().build();
    }
    
    // CA-03: Registrar un producto, insumo o equipo
    @PostMapping("/{id}/insumos")
    public ResponseEntity<InsumoDTO> agregarInsumo(
            Authentication authentication,
            @PathVariable Integer id,
            @Valid @RequestBody insumoRequestDTO dto) {
        InsumoDTO insumo = servicioService.agregarInsumo(authentication.getName(), id, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(insumo);
    }
    
    // CA-03: Consultar productos, insumos o equipos del servicio propio
    @GetMapping("/{id}/insumos")
    public ResponseEntity<List<InsumoDTO>> listarInsumos(
            Authentication authentication,
            @PathVariable Integer id) {
        List<InsumoDTO> insumos = servicioService.listarInsumos(authentication.getName(), id);
        return ResponseEntity.ok(insumos);
    }
    
    // CA-03: Actualizar un producto, insumo o equipo del servicio propio
    @PutMapping("/{id}/insumos/{idInsumo}")
    public ResponseEntity<InsumoDTO> actualizarInsumo(
            Authentication authentication,
            @PathVariable Integer id,
            @PathVariable Integer idInsumo,
            @Valid @RequestBody insumoRequestDTO dto) {
        InsumoDTO insumo = servicioService.actualizarInsumo(authentication.getName(), id, idInsumo, dto);
        return ResponseEntity.ok(insumo);
    }
    
    // CA-03: Eliminar un producto, insumo o equipo del servicio propio
    @DeleteMapping("/{id}/insumos/{idInsumo}")
    public ResponseEntity<Void> eliminarInsumo(
            Authentication authentication,
            @PathVariable Integer id,
            @PathVariable Integer idInsumo) {
        servicioService.eliminarInsumo(authentication.getName(), id, idInsumo);
        return ResponseEntity.noContent().build();
    }
}
