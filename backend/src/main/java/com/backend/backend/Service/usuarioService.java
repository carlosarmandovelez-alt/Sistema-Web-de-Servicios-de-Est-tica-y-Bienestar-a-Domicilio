package com.backend.backend.Service;

import com.backend.backend.DTO.registroRequestDTO;
import com.backend.backend.DTO.usuarioResponseDTO;
import com.backend.backend.Exception.emailDuplicadoException;
import com.backend.backend.Model.enums.estadoCuentaModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Repository.usuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class usuarioService {
    
    @Autowired
    private usuarioRepository usuarioRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    public usuarioResponseDTO registrar(registroRequestDTO dto) {
        String emailNormalizado = dto.getEmail().toLowerCase().trim();
        
        if (usuarioRepository.existsByEmail(emailNormalizado)) {
            throw new emailDuplicadoException("El correo electrónico ya está registrado");
        }
        
        usuarioModel usuario = new usuarioModel();
        usuario.setNombre(dto.getNombre().trim());
        usuario.setApellido(dto.getApellido().trim());
        usuario.setEmail(emailNormalizado);
        usuario.setPassword_hash(passwordEncoder.encode(dto.getPassword()));
        usuario.setRol(dto.getRol());
        usuario.setTelefono(dto.getTelefono());
        usuario.setEstado_cuenta(estadoCuentaModel.activo);
        usuario.setFecha_registro(LocalDateTime.now());
        usuario.setFecha_actualizacion(LocalDateTime.now());
        
        usuarioModel usuarioGuardado = usuarioRepository.save(usuario);
        
        return new usuarioResponseDTO(
            usuarioGuardado.getId(),
            usuarioGuardado.getNombre(),
            usuarioGuardado.getApellido(),
            usuarioGuardado.getEmail(),
            usuarioGuardado.getTelefono(),
            usuarioGuardado.getRol(),
            usuarioGuardado.getEstado_cuenta()
        );
    }
}