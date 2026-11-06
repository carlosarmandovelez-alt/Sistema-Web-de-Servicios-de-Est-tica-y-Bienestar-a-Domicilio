package com.backend.backend.Service;

import com.backend.backend.DTO.actualizarClienteDTO;
import com.backend.backend.DTO.clienteResponseDTO;
import com.backend.backend.DTO.direccionDTO;
import com.backend.backend.Model.clienteModel;
import com.backend.backend.Model.direccionModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Repository.clienteRepository;
import com.backend.backend.Repository.direccionRepository;
import com.backend.backend.Repository.usuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class clienteService {
    
    @Autowired
    private usuarioRepository usuarioRepository;
    
    @Autowired
    private clienteRepository clienteRepository;
    
    @Autowired
    private direccionRepository direccionRepository;
    
    public clienteResponseDTO consultarPerfil(String email) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        clienteModel cliente = clienteRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
        
        Optional<direccionModel> direccionOpt = direccionRepository
            .buscarPorClienteYEsPrincipal(cliente, true);
        
        direccionDTO direccionDTO = null;
        if (direccionOpt.isPresent()) {
            direccionModel dir = direccionOpt.get();
            direccionDTO = new direccionDTO(
                dir.getCiudad(),
                dir.getBarrio_sector(),
                dir.getInformacion_complementaria(),
                dir.getTelefono()
            );
        }
        
        return new clienteResponseDTO(
            usuario.getId(),
            usuario.getNombre(),
            usuario.getApellido(),
            usuario.getEmail(),
            usuario.getTelefono(),
            direccionDTO
        );
    }
    
    @Transactional
    public clienteResponseDTO actualizarDatosPersonales(String email, actualizarClienteDTO dto) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        usuario.setNombre(dto.getNombre().trim());
        usuario.setApellido(dto.getApellido().trim());
        usuario.setTelefono(dto.getTelefono());
        usuario.setFecha_actualizacion(LocalDateTime.now());
        
        usuarioRepository.save(usuario);
        
        return consultarPerfil(email);
    }
    
    @Transactional
    public clienteResponseDTO actualizarDireccionPrincipal(String email, direccionDTO dto) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        clienteModel cliente = clienteRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
        
        Optional<direccionModel> direccionOpt = direccionRepository
            .buscarPorClienteYEsPrincipal(cliente, true);
        
        direccionModel direccion;
        if (direccionOpt.isPresent()) {
            direccion = direccionOpt.get();
        } else {
            direccion = new direccionModel();
            direccion.setCliente(cliente);
            direccion.setEs_principal(true);
            direccion.setFecha_creacion(LocalDateTime.now());
        }
        
        direccion.setCiudad(dto.getCiudad());
        direccion.setBarrio_sector(dto.getBarrio_sector());
        direccion.setInformacion_complementaria(dto.getInformacion_complementaria());
        direccion.setTelefono(dto.getTelefono());
        
        direccionRepository.save(direccion);
        
        return consultarPerfil(email);
    }
}