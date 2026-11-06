package com.backend.backend.Service;

import com.backend.backend.DTO.actualizarProveedorDTO;
import com.backend.backend.DTO.proveedorResponseDTO;
import com.backend.backend.DTO.zonaCoberturaDTO;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Model.zona_coberturaModel;
import com.backend.backend.Repository.proveedorRepository;
import com.backend.backend.Repository.usuarioRepository;
import com.backend.backend.Repository.zonaCoberturaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class proveedorService {
    
    @Autowired
    private usuarioRepository usuarioRepository;
    
    @Autowired
    private proveedorRepository proveedorRepository;
    
    @Autowired
    private zonaCoberturaRepository zonaCoberturaRepository;
    
    public proveedorResponseDTO consultarPerfil(String email) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        proveedorModel proveedor = proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));
        
        List<zona_coberturaModel> zonas = zonaCoberturaRepository.findByProveedor(proveedor);
        
        List<zonaCoberturaDTO> zonasDTO = zonas.stream()
            .map(z -> new zonaCoberturaDTO(z.getCiudad(), z.getBarrio_sector()))
            .collect(Collectors.toList());
        
        return new proveedorResponseDTO(
            usuario.getId(),
            usuario.getNombre(),
            usuario.getApellido(),
            usuario.getEmail(),
            usuario.getTelefono(),
            proveedor.getPerfil_profesional(),
            zonasDTO
        );
    }
    
    @Transactional
    public proveedorResponseDTO actualizarPerfil(String email, actualizarProveedorDTO dto) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        proveedorModel proveedor = proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));
        
        // Actualizar datos del usuario
        usuario.setNombre(dto.getNombre().trim());
        usuario.setApellido(dto.getApellido().trim());
        usuario.setTelefono(dto.getTelefono());
        usuario.setFecha_actualizacion(LocalDateTime.now());
        usuarioRepository.save(usuario);
        
        // Actualizar perfil profesional
        proveedor.setPerfil_profesional(dto.getPerfil_profesional());
        proveedorRepository.save(proveedor);
        
        return consultarPerfil(email);
    }
    
    @Transactional
    public proveedorResponseDTO actualizarZonasAtencion(String email, List<zonaCoberturaDTO> zonasDTO) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        proveedorModel proveedor = proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));
        
        // Eliminar zonas existentes
        zonaCoberturaRepository.deleteByProveedor(proveedor);
        
        // Crear nuevas zonas
        List<zona_coberturaModel> nuevasZonas = new ArrayList<>();
        for (zonaCoberturaDTO dto : zonasDTO) {
            zona_coberturaModel zona = new zona_coberturaModel();
            zona.setCiudad(dto.getCiudad());
            zona.setBarrio_sector(dto.getBarrio_sector());
            zona.setProveedor(proveedor);
            nuevasZonas.add(zona);
        }
        zonaCoberturaRepository.saveAll(nuevasZonas);
        
        return consultarPerfil(email);
    }
}