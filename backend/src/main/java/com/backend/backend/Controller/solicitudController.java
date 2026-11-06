package com.backend.backend.Controller;

import com.backend.backend.DTO.contrapropuestaDTO;
import com.backend.backend.DTO.crearSolicitudDTO;
import com.backend.backend.DTO.respuestaSolicitudDTO;
import com.backend.backend.DTO.solicitudResponseDTO;
import com.backend.backend.Service.solicitudService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/solicitudes")
@CrossOrigin(origins = "*")
public class solicitudController {

    @Autowired
    private solicitudService solicitudService;

    // HU-012: Crear solicitud
    @PostMapping
    public ResponseEntity<solicitudResponseDTO> crearSolicitud(
            Authentication authentication,
            @Valid @RequestBody crearSolicitudDTO dto) {
        String email = authentication.getName();
        solicitudResponseDTO solicitud = solicitudService.crearSolicitud(email, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(solicitud);
    }

        // ============================================
    // HU-013: Endpoints del Cliente
    // ============================================
    
    @GetMapping("/mis-solicitudes")
    public ResponseEntity<List<solicitudResponseDTO>> listarSolicitudesCliente(Authentication authentication) {
        String email = authentication.getName();
        List<solicitudResponseDTO> solicitudes = solicitudService.listarSolicitudesCliente(email);
        return ResponseEntity.ok(solicitudes);
    }

    @GetMapping("/mis-solicitudes/{idSolicitud}")
    public ResponseEntity<solicitudResponseDTO> consultarDetalleSolicitud(
            Authentication authentication,
            @PathVariable Integer idSolicitud) {
        String email = authentication.getName();
        solicitudResponseDTO solicitud = solicitudService.consultarDetalleSolicitud(email, idSolicitud);
        return ResponseEntity.ok(solicitud);
    }



    // ============================================
    // HU-014: Endpoints del Proveedor
    // ============================================
    
    @GetMapping("/recibidas")
    public ResponseEntity<List<solicitudResponseDTO>> listarSolicitudesRecibidas(Authentication authentication) {
        String email = authentication.getName();
        List<solicitudResponseDTO> solicitudes = solicitudService.listarSolicitudesProveedor(email);
        return ResponseEntity.ok(solicitudes);
    }

    @GetMapping("/recibidas/{idSolicitud}")
    public ResponseEntity<solicitudResponseDTO> consultarDetalleRecibida(
            Authentication authentication,
            @PathVariable Integer idSolicitud) {
        String email = authentication.getName();
        solicitudResponseDTO solicitud = solicitudService.consultarDetalleRecibida(email, idSolicitud);
        return ResponseEntity.ok(solicitud);
    }

        // ============================================
    // HU-015: Endpoints de respuesta del Proveedor
    // ============================================
    
    @PatchMapping("/recibidas/{idSolicitud}/aceptar")
    public ResponseEntity<solicitudResponseDTO> aceptarSolicitud(Authentication authentication, @PathVariable Integer idSolicitud) {
        return ResponseEntity.ok(solicitudService.aceptarSolicitud(authentication.getName(), idSolicitud));
    }

    @PatchMapping("/recibidas/{idSolicitud}/rechazar")
    public ResponseEntity<solicitudResponseDTO> rechazarSolicitud(
            Authentication authentication, 
            @PathVariable Integer idSolicitud, 
            @RequestBody respuestaSolicitudDTO dto) {
        return ResponseEntity.ok(solicitudService.rechazarSolicitud(authentication.getName(), idSolicitud, dto.getMotivo_rechazo()));
    }

    @PatchMapping("/recibidas/{idSolicitud}/proponer")
    public ResponseEntity<solicitudResponseDTO> proponerHorario(
            Authentication authentication, 
            @PathVariable Integer idSolicitud, 
            @Valid @RequestBody contrapropuestaDTO dto) {
        return ResponseEntity.ok(solicitudService.proponerHorario(authentication.getName(), idSolicitud, dto.getFecha_hora_propuesta()));
    }

    // ============================================
    // HU-016: Endpoints de respuesta del Cliente
    // ============================================
    
    @PatchMapping("/mis-solicitudes/{idSolicitud}/aceptar-propuesta")
    public ResponseEntity<solicitudResponseDTO> aceptarContrapropuesta(Authentication authentication, @PathVariable Integer idSolicitud) {
        return ResponseEntity.ok(solicitudService.aceptarContrapropuesta(authentication.getName(), idSolicitud));
    }

    @PatchMapping("/mis-solicitudes/{idSolicitud}/rechazar-propuesta")
    public ResponseEntity<solicitudResponseDTO> rechazarContrapropuesta(
            Authentication authentication, 
            @PathVariable Integer idSolicitud, 
            @RequestBody respuestaSolicitudDTO dto) {
        return ResponseEntity.ok(solicitudService.rechazarContrapropuesta(authentication.getName(), idSolicitud, dto.getMotivo_rechazo()));
    }

    // ============================================
    // HU-017: Endpoints de Cancelación
    // ============================================

    // Para el Cliente
    @PatchMapping("/mis-solicitudes/{idSolicitud}/cancelar")
    public ResponseEntity<solicitudResponseDTO> cancelarSolicitudCliente(
            Authentication authentication,
            @PathVariable Integer idSolicitud,
            @RequestBody respuestaSolicitudDTO dto) {
        // Le pasamos el rol "cliente" al servicio
        return ResponseEntity.ok(solicitudService.cancelarSolicitud(authentication.getName(), "cliente", idSolicitud, dto.getMotivo_rechazo()));
    }

    // Para el Proveedor
    @PatchMapping("/recibidas/{idSolicitud}/cancelar")
    public ResponseEntity<solicitudResponseDTO> cancelarSolicitudProveedor(
            Authentication authentication,
            @PathVariable Integer idSolicitud,
            @RequestBody respuestaSolicitudDTO dto) {
        // Le pasamos el rol "proveedor" al servicio
        return ResponseEntity.ok(solicitudService.cancelarSolicitud(authentication.getName(), "proveedor", idSolicitud, dto.getMotivo_rechazo()));
    }

    // ============================================
    // HU-018: Endpoint de Finalización
    // ============================================
    
    @PatchMapping("/recibidas/{idSolicitud}/completar")
    public ResponseEntity<solicitudResponseDTO> completarServicio(
            Authentication authentication, 
            @PathVariable Integer idSolicitud) {
        return ResponseEntity.ok(solicitudService.completarServicio(authentication.getName(), idSolicitud));
    }
}
