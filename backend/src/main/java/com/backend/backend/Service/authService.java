package com.backend.backend.Service;

import com.backend.backend.DTO.loginRequestDTO;
import com.backend.backend.DTO.loginResponseDTO;
import com.backend.backend.Exception.credencialesInvalidasException;
import com.backend.backend.Model.tokenInvalidoModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Repository.tokenInvalidoRepository;
import com.backend.backend.Repository.usuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class authService {
    
    @Autowired
    private usuarioRepository usuarioRepository;
    
    @Autowired
    private tokenInvalidoRepository tokenInvalidoRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private jwtService jwtService;
    
    public loginResponseDTO login(loginRequestDTO dto) {
        String emailNormalizado = dto.getEmail().toLowerCase().trim();
        
        // Buscar usuario por email
        usuarioModel usuario = usuarioRepository.findByEmail(emailNormalizado)
                .orElseThrow(() -> new credencialesInvalidasException("Credenciales no válidas"));
        
        // Verificar contraseña
        if (!passwordEncoder.matches(dto.getPassword(), usuario.getPassword_hash())) {
            throw new credencialesInvalidasException("Credenciales no válidas");
        }
        
        // Verificar que la cuenta esté activa
        if (!usuario.getEstado_cuenta().name().equals("activo")) {
            throw new credencialesInvalidasException("Credenciales no válidas");
        }
        
        // Generar token
        String token = jwtService.generarToken(
                usuario.getEmail(),
                usuario.getRol().name(),
                usuario.getId()
        );
        
        return new loginResponseDTO(
                token,
                "Bearer",
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getRol()
        );
    }
    
    public void logout(String token) {
        // Invalidar el token (agregarlo a la lista negra)
        tokenInvalidoModel tokenInvalido = new tokenInvalidoModel();
        tokenInvalido.setToken(token);
        tokenInvalido.setFechaInvalidacion(LocalDateTime.now());
        tokenInvalidoRepository.save(tokenInvalido);
    }
    
    public boolean esTokenInvalido(String token) {
        return tokenInvalidoRepository.existsByToken(token);
    }
}