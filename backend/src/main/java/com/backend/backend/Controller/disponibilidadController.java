package com.backend.backend.Controller;

import com.backend.backend.DTO.crearDisponibilidadDTO;
import com.backend.backend.DTO.crearPeriodoNoDisponibleDTO;
import com.backend.backend.DTO.disponibilidadDTO;
import com.backend.backend.DTO.periodoNoDisponibleDTO;
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

    @GetMapping
    public ResponseEntity<List<disponibilidadDTO>> listarDisponibilidad(Authentication authentication) {
        return ResponseEntity.ok(disponibilidadService.listarDisponibilidad(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<disponibilidadDTO> crearDisponibilidad(
            Authentication authentication,
            @Valid @RequestBody crearDisponibilidadDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(disponibilidadService.crearDisponibilidad(authentication.getName(), dto));
    }

    @DeleteMapping("/{idDisponibilidad}")
    public ResponseEntity<Void> eliminarDisponibilidad(
            Authentication authentication,
            @PathVariable Integer idDisponibilidad) {
        disponibilidadService.eliminarDisponibilidad(authentication.getName(), idDisponibilidad);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/periodos")
    public ResponseEntity<List<periodoNoDisponibleDTO>> listarPeriodos(Authentication authentication) {
        return ResponseEntity.ok(disponibilidadService.listarPeriodos(authentication.getName()));
    }

    @PostMapping("/periodos")
    public ResponseEntity<periodoNoDisponibleDTO> crearPeriodo(
            Authentication authentication,
            @Valid @RequestBody crearPeriodoNoDisponibleDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(disponibilidadService.crearPeriodo(authentication.getName(), dto));
    }

    @DeleteMapping("/periodos/{idPeriodo}")
    public ResponseEntity<Void> eliminarPeriodo(
            Authentication authentication,
            @PathVariable Integer idPeriodo) {
        disponibilidadService.eliminarPeriodo(authentication.getName(), idPeriodo);
        return ResponseEntity.noContent().build();
    }
}
