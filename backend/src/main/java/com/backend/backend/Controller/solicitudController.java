package com.backend.backend.Controller;

import com.backend.backend.DTO.crearSolicitudDTO;
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
}