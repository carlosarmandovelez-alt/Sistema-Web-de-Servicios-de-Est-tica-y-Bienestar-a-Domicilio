package com.backend.backend.Service;

import com.backend.backend.DTO.disponibilidadRequestDTO;
import com.backend.backend.DTO.disponibilidadResponseDTO;
import com.backend.backend.DTO.periodoNoDisponibleRequestDTO;
import com.backend.backend.DTO.periodoNoDisponibleResponseDTO;
import com.backend.backend.Exception.horarioInvalidoException;
import com.backend.backend.Exception.proveedorNoEncontradoException;
import com.backend.backend.Model.disponibilidadModel;
import com.backend.backend.Model.periodoNoDisponibleModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class disponibilidadService {

    @Autowired
    private disponibilidadRepository disponibilidadRepository;

    @Autowired
    private periodoNoDisponibleRepository periodoNoDisponibleRepository;

    @Autowired
    private usuarioRepository usuarioRepository;

    @Autowired
    private proveedorRepository proveedorRepository;

    // ============================================
    // HU-011: Configurar Disponibilidad (CA-01, CA-02)
    // ============================================
    @Transactional
    public List<disponibilidadResponseDTO> guardarDisponibilidad(String email, List<disponibilidadRequestDTO> dtos) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);

        // Validar todos antes de guardar
        for (disponibilidadRequestDTO dto : dtos) {
            if (!dto.getHora_inicio().isBefore(dto.getHora_fin())) {
                throw new horarioInvalidoException("La hora de inicio debe ser anterior a la hora de fin para el día " + dto.getDia_semana());
            }
        }

        // Borrar disponibilidad anterior y guardar la nueva (Reemplazo total)
        disponibilidadRepository.deleteByProveedor(proveedor);
        
        List<disponibilidadModel> nuevasDisponibilidades = new ArrayList<>();
        for (disponibilidadRequestDTO dto : dtos) {
            disponibilidadModel disp = new disponibilidadModel();
            disp.setProveedor(proveedor);
            disp.setDia_semana(dto.getDia_semana());
            disp.setHora_inicio(dto.getHora_inicio());
            disp.setHora_fin(dto.getHora_fin());
            nuevasDisponibilidades.add(disp);
        }

        List<disponibilidadModel> guardadas = disponibilidadRepository.saveAll(nuevasDisponibilidades);

        return guardadas.stream()
            .map(d -> new disponibilidadResponseDTO(d.getId_disponibilidad(), d.getDia_semana().name(), d.getHora_inicio().toString(), d.getHora_fin().toString()))
            .collect(Collectors.toList());
    }

    public List<disponibilidadResponseDTO> consultarDisponibilidad(String email) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        return disponibilidadRepository.findByProveedor(proveedor).stream()
            .map(d -> new disponibilidadResponseDTO(d.getId_disponibilidad(), d.getDia_semana().name(), d.getHora_inicio().toString(), d.getHora_fin().toString()))
            .collect(Collectors.toList());
    }

    // ============================================
    // HU-011: Periodos No Disponibles (CA-03, CA-04)
    // ============================================
    @Transactional
    public periodoNoDisponibleResponseDTO agregarPeriodoNoDisponible(String email, periodoNoDisponibleRequestDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);

        if (dto.getFecha_inicio().isAfter(dto.getFecha_fin())) {
            throw new horarioInvalidoException("La fecha de inicio no puede ser posterior a la fecha de fin");
        }

        periodoNoDisponibleModel periodo = new periodoNoDisponibleModel();
        periodo.setProveedor(proveedor);
        periodo.setFecha_inicio(dto.getFecha_inicio());
        periodo.setFecha_fin(dto.getFecha_fin());
        periodo.setMotivo(dto.getMotivo());

        periodoNoDisponibleModel guardado = periodoNoDisponibleRepository.save(periodo);

        return new periodoNoDisponibleResponseDTO(
            guardado.getId_periodo(),
            guardado.getFecha_inicio(),
            guardado.getFecha_fin(),
            guardado.getMotivo()
        );
    }

    public List<periodoNoDisponibleResponseDTO> consultarPeriodosNoDisponibles(String email) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        return periodoNoDisponibleRepository.findByProveedor(proveedor).stream()
            .map(p -> new periodoNoDisponibleResponseDTO(p.getId_periodo(), p.getFecha_inicio(), p.getFecha_fin(), p.getMotivo()))
            .collect(Collectors.toList());
    }

    // ============================================
    // Auxiliar
    // ============================================
    private proveedorModel obtenerProveedorPorEmail(String email) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new proveedorNoEncontradoException("Proveedor no encontrado"));
    }
}