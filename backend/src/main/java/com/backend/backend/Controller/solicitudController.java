package com.backend.backend.Controller;

import com.backend.backend.DTO.*;
import com.backend.backend.Service.solicitudService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/solicitudes")
@CrossOrigin(origins = "*")
public class solicitudController {

    @Autowired
    private solicitudService solicitudService;

    // ============================================
    // HU-012: Crear solicitud
    // ============================================
    @PostMapping
    public ResponseEntity<solicitudResponseDTO> crearSolicitud(
            Authentication authentication,
            @Valid @RequestBody crearSolicitudDTO dto) {
        String email = authentication.getName();
        return ResponseEntity.status(HttpStatus.CREATED).body(solicitudService.crearSolicitud(email, dto));
    }

    // ============================================
    // HU-013: Solicitudes del Cliente
    // ============================================
    @GetMapping("/mis-solicitudes")
    public ResponseEntity<List<solicitudResponseDTO>> listarSolicitudesCliente(Authentication authentication) {
        return ResponseEntity.ok(solicitudService.listarSolicitudesCliente(authentication.getName()));
    }

    // ============================================
    // HU-014: Solicitudes recibidas por el Proveedor
    // ============================================
    @GetMapping("/recibidas")
    public ResponseEntity<List<solicitudResponseDTO>> listarSolicitudesRecibidas(Authentication authentication) {
        return ResponseEntity.ok(solicitudService.listarSolicitudesProveedor(authentication.getName()));
    }

    // ============================================
    // HU-019: Agenda del Proveedor
    // ============================================
    @GetMapping("/agenda")
    public ResponseEntity<List<agendaReservaDTO>> consultarAgenda(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta) {
        return ResponseEntity.ok(solicitudService.consultarAgenda(authentication.getName(), desde, hasta));
    }

    // ============================================
    // Detalle de una solicitud (Cliente o Proveedor)
    // ============================================
    @GetMapping("/{idSolicitud}")
    public ResponseEntity<solicitudResponseDTO> consultarDetalle(
            Authentication authentication,
            @PathVariable Integer idSolicitud) {
        return ResponseEntity.ok(solicitudService.consultarDetalle(authentication.getName(), idSolicitud));
    }

    // ============================================
    // HU-015: Respuesta del Proveedor
    // ============================================
    @PutMapping("/{idSolicitud}/responder")
    public ResponseEntity<solicitudResponseDTO> responderSolicitud(
            Authentication authentication,
            @PathVariable Integer idSolicitud,
            @Valid @RequestBody responderSolicitudDTO dto) {
        return ResponseEntity.ok(solicitudService.responderSolicitud(authentication.getName(), idSolicitud, dto));
    }

    // ============================================
    // HU-016: Respuesta del Cliente a la contrapropuesta
    // ============================================
    @PutMapping("/{idSolicitud}/responder-contrapropuesta")
    public ResponseEntity<solicitudResponseDTO> responderContrapropuesta(
            Authentication authentication,
            @PathVariable Integer idSolicitud,
            @Valid @RequestBody responderContrapropuestaDTO dto) {
        return ResponseEntity.ok(
            solicitudService.responderContrapropuesta(authentication.getName(), idSolicitud, dto));
    }

    // ============================================
    // HU-017: Cancelación
    // ============================================
    @PutMapping("/{idSolicitud}/cancelar")
    public ResponseEntity<solicitudResponseDTO> cancelarSolicitud(
            Authentication authentication,
            @PathVariable Integer idSolicitud,
            @Valid @RequestBody cancelarSolicitudDTO dto) {
        return ResponseEntity.ok(solicitudService.cancelarSolicitud(authentication.getName(), idSolicitud, dto));
    }

    // ============================================
    // HU-018: Finalización
    // ============================================
    @PutMapping("/{idSolicitud}/completar")
    public ResponseEntity<solicitudResponseDTO> completarSolicitud(
            Authentication authentication,
            @PathVariable Integer idSolicitud) {
        return ResponseEntity.ok(solicitudService.completarSolicitud(authentication.getName(), idSolicitud));
    }
}
