package com.backend.backend.Controller;

import com.backend.backend.DTO.*;
import com.backend.backend.Service.authService;
import com.backend.backend.Service.passwordResetService;
import com.backend.backend.Service.usuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class authController {
    
    @Autowired
    private usuarioService usuarioService;
    
    @Autowired
    private authService authService;
    
    @Autowired
    private passwordResetService passwordResetService;
    
    @PostMapping("/registro")
    public ResponseEntity<usuarioResponseDTO> registrar(@Valid @RequestBody registroRequestDTO dto) {
        usuarioResponseDTO usuario = usuarioService.registrar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(usuario);
    }
    
    @PostMapping("/login")
    public ResponseEntity<loginResponseDTO> login(@Valid @RequestBody loginRequestDTO dto) {
        loginResponseDTO response = authService.login(dto);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            authService.logout(token);
        }
        
        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "Sesión cerrada correctamente");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/solicitar-recuperacion")
    public ResponseEntity<Map<String, String>> solicitarRecuperacion(
            @Valid @RequestBody solicitarRecuperacionDTO dto) {
        passwordResetService.solicitarRecuperacion(dto);
        
        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "Si el correo está registrado, recibirás un código de recuperación");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/validar-otp")
    public ResponseEntity<Map<String, String>> validarOtp(@Valid @RequestBody validarOtpDTO dto) {
        passwordResetService.validarOtp(dto);
        
        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "Código válido");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/restablecer-password")
    public ResponseEntity<Map<String, String>> restablecerPassword(
            @Valid @RequestBody restablecerPasswordDTO dto) {
        passwordResetService.restablecerPassword(dto);
        
        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "Contraseña restablecida correctamente");
        return ResponseEntity.ok(response);
    }
}