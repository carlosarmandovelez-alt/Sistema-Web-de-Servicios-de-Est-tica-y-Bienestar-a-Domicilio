package com.backend.backend.Controller;

import com.backend.backend.DTO.disponibilidadRequestDTO;
import com.backend.backend.DTO.disponibilidadResponseDTO;
import com.backend.backend.DTO.periodoNoDisponibleRequestDTO;
import com.backend.backend.DTO.periodoNoDisponibleResponseDTO;
import com.backend.backend.Service.disponibilidadService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/disponibilidad")
@CrossOrigin(origins = "*")
public class disponibilidadController {

    @Autowired
    private disponibilidadService disponibilidadService;

    // HU-011: Disponibilidad
    @PostMapping
    public ResponseEntity<List<disponibilidadResponseDTO>> guardarDisponibilidad(
            Authentication authentication,
            @Valid @RequestBody List<disponibilidadRequestDTO> dtos) {
        String email = authentication.getName();
        return ResponseEntity.ok(disponibilidadService.guardarDisponibilidad(email, dtos));
    }

    @GetMapping
    public ResponseEntity<List<disponibilidadResponseDTO>> consultarDisponibilidad(Authentication authentication) {
        return ResponseEntity.ok(disponibilidadService.consultarDisponibilidad(authentication.getName()));
    }

    // HU-011: Periodos No Disponibles
    @PostMapping("/periodos-no-disponibles")
    public ResponseEntity<periodoNoDisponibleResponseDTO> agregarPeriodo(
            Authentication authentication,
            @Valid @RequestBody periodoNoDisponibleRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(disponibilidadService.agregarPeriodoNoDisponible(authentication.getName(), dto));
    }

    @GetMapping("/periodos-no-disponibles")
    public ResponseEntity<List<periodoNoDisponibleResponseDTO>> consultarPeriodos(Authentication authentication) {
        return ResponseEntity.ok(disponibilidadService.consultarPeriodosNoDisponibles(authentication.getName()));
    }
}