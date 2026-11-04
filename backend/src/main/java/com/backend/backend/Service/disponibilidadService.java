package com.backend.backend.Service;

import com.backend.backend.DTO.crearDisponibilidadDTO;
import com.backend.backend.DTO.crearPeriodoNoDisponibleDTO;
import com.backend.backend.DTO.disponibilidadDTO;
import com.backend.backend.DTO.periodoNoDisponibleDTO;
import com.backend.backend.Exception.accesoDenegadoException;
import com.backend.backend.Exception.datosInvalidosException;
import com.backend.backend.Exception.proveedorNoEncontradoException;
import com.backend.backend.Model.disponibilidadModel;
import com.backend.backend.Model.periodoNoDisponibleModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Repository.disponibilidadRepository;
import com.backend.backend.Repository.periodoNoDisponibleRepository;
import com.backend.backend.Repository.proveedorRepository;
import com.backend.backend.Repository.usuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
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
    // HU-011: Franjas de disponibilidad
    // ============================================
    public List<disponibilidadDTO> listarDisponibilidad(String email) {
        proveedorModel proveedor = obtenerProveedor(email);

        return disponibilidadRepository.findByProveedor(proveedor).stream()
            .sorted(Comparator
                .comparing((disponibilidadModel d) -> d.getDia_semana().ordinal())
                .thenComparing(disponibilidadModel::getHora_inicio))
            .map(this::convertirADTO)
            .collect(Collectors.toList());
    }

    @Transactional
    public disponibilidadDTO crearDisponibilidad(String email, crearDisponibilidadDTO dto) {
        proveedorModel proveedor = obtenerProveedor(email);

        if (!dto.getHora_inicio().isBefore(dto.getHora_fin())) {
            throw new datosInvalidosException("La hora inicial debe ser anterior a la hora final");
        }

        boolean seCruza = disponibilidadRepository.findByProveedor(proveedor).stream()
            .filter(franja -> franja.getDia_semana() == dto.getDia_semana())
            .anyMatch(franja ->
                dto.getHora_inicio().isBefore(franja.getHora_fin())
                    && franja.getHora_inicio().isBefore(dto.getHora_fin()));

        if (seCruza) {
            throw new datosInvalidosException(
                "El horario se cruza con otra franja ya registrada para ese día");
        }

        disponibilidadModel franja = new disponibilidadModel();
        franja.setProveedor(proveedor);
        franja.setDia_semana(dto.getDia_semana());
        franja.setHora_inicio(dto.getHora_inicio());
        franja.setHora_fin(dto.getHora_fin());

        return convertirADTO(disponibilidadRepository.save(franja));
    }

    @Transactional
    public void eliminarDisponibilidad(String email, Integer idDisponibilidad) {
        proveedorModel proveedor = obtenerProveedor(email);
        disponibilidadModel franja = disponibilidadRepository.findById(idDisponibilidad)
            .orElseThrow(() -> new datosInvalidosException("La franja de disponibilidad no existe"));

        if (!franja.getProveedor().getId_proveedor().equals(proveedor.getId_proveedor())) {
            throw new accesoDenegadoException("La franja no pertenece a su disponibilidad");
        }

        disponibilidadRepository.delete(franja);
    }

    // ============================================
    // HU-011: Periodos no disponibles
    // ============================================
    public List<periodoNoDisponibleDTO> listarPeriodos(String email) {
        proveedorModel proveedor = obtenerProveedor(email);

        return periodoNoDisponibleRepository.findByProveedor(proveedor).stream()
            .sorted(Comparator.comparing(periodoNoDisponibleModel::getFecha_inicio))
            .map(this::convertirADTO)
            .collect(Collectors.toList());
    }

    @Transactional
    public periodoNoDisponibleDTO crearPeriodo(String email, crearPeriodoNoDisponibleDTO dto) {
        proveedorModel proveedor = obtenerProveedor(email);

        if (dto.getFecha_fin().isBefore(dto.getFecha_inicio())) {
            throw new datosInvalidosException("La fecha final no puede ser anterior a la fecha inicial");
        }

        boolean seCruza = periodoNoDisponibleRepository.findByProveedor(proveedor).stream()
            .anyMatch(periodo ->
                !dto.getFecha_fin().isBefore(periodo.getFecha_inicio())
                    && !periodo.getFecha_fin().isBefore(dto.getFecha_inicio()));

        if (seCruza) {
            throw new datosInvalidosException(
                "El periodo se cruza con otro periodo no disponible ya registrado");
        }

        periodoNoDisponibleModel periodo = new periodoNoDisponibleModel();
        periodo.setProveedor(proveedor);
        periodo.setFecha_inicio(dto.getFecha_inicio());
        periodo.setFecha_fin(dto.getFecha_fin());

        return convertirADTO(periodoNoDisponibleRepository.save(periodo));
    }

    @Transactional
    public void eliminarPeriodo(String email, Integer idPeriodo) {
        proveedorModel proveedor = obtenerProveedor(email);
        periodoNoDisponibleModel periodo = periodoNoDisponibleRepository.findById(idPeriodo)
            .orElseThrow(() -> new datosInvalidosException("El periodo no disponible no existe"));

        if (!periodo.getProveedor().getId_proveedor().equals(proveedor.getId_proveedor())) {
            throw new accesoDenegadoException("El periodo no pertenece a su disponibilidad");
        }

        periodoNoDisponibleRepository.delete(periodo);
    }

    // ============================================
    // Auxiliares
    // ============================================
    private proveedorModel obtenerProveedor(String email) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new accesoDenegadoException("Usuario no encontrado"));

        if (!usuario.getRol().name().equals("proveedor")) {
            throw new accesoDenegadoException("Esta operación es exclusiva de proveedores");
        }

        return proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new proveedorNoEncontradoException("Proveedor no encontrado"));
    }

    private disponibilidadDTO convertirADTO(disponibilidadModel franja) {
        return new disponibilidadDTO(
            franja.getId_disponibilidad(),
            franja.getDia_semana(),
            franja.getHora_inicio(),
            franja.getHora_fin());
    }

    private periodoNoDisponibleDTO convertirADTO(periodoNoDisponibleModel periodo) {
        return new periodoNoDisponibleDTO(
            periodo.getId_periodo(),
            periodo.getFecha_inicio(),
            periodo.getFecha_fin());
    }
}
