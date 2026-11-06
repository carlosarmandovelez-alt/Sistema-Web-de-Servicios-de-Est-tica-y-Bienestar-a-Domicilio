package com.backend.backend.Service;

import com.backend.backend.DTO.registroRequestDTO;
import com.backend.backend.DTO.usuarioResponseDTO;
import com.backend.backend.Exception.emailDuplicadoException;
import com.backend.backend.Model.clienteModel;
import com.backend.backend.Model.enums.estadoCuentaModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Repository.clienteRepository;
import com.backend.backend.Repository.proveedorRepository;
import com.backend.backend.Repository.usuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class usuarioService {
    
    @Autowired
    private usuarioRepository usuarioRepository;
    
    @Autowired
    private clienteRepository clienteRepository;
    
    @Autowired
    private proveedorRepository proveedorRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Transactional
    public usuarioResponseDTO registrar(registroRequestDTO dto) {
        String emailNormalizado = dto.getEmail().toLowerCase().trim();
        
        if (usuarioRepository.existsByEmail(emailNormalizado)) {
            throw new emailDuplicadoException("El correo electrónico ya está registrado");
        }
        
        // Crear el usuario
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
        
        // ✅ Crear el registro en cliente o proveedor según el rol
        if (dto.getRol().name().equals("cliente")) {
            clienteModel cliente = new clienteModel();
            cliente.setUsuario(usuarioGuardado);  // ← Esto asigna el ID automáticamente
            clienteRepository.save(cliente);
        } else if (dto.getRol().name().equals("proveedor")) {
            proveedorModel proveedor = new proveedorModel();
            proveedor.setUsuario(usuarioGuardado);  // ← Esto asigna el ID automáticamente
            proveedorRepository.save(proveedor);
        }
        
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