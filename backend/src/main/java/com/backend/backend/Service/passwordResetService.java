package com.backend.backend.Service;

import com.backend.backend.DTO.restablecerPasswordDTO;
import com.backend.backend.DTO.solicitarRecuperacionDTO;
import com.backend.backend.DTO.validarOtpDTO;
import com.backend.backend.Exception.otpExpiradoException;
import com.backend.backend.Exception.otpInvalidoException;
import com.backend.backend.Model.recuperacion_passwordModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Repository.recuperacionPasswordRepository;
import com.backend.backend.Repository.usuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class passwordResetService {
    
    @Autowired
    private usuarioRepository usuarioRepository;
    
    @Autowired
    private recuperacionPasswordRepository recuperacionPasswordRepository;
    
    @Autowired
    private emailService emailService;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    private static final int MINUTOS_VIGENCIA = 15;
    
    @Transactional
    public void solicitarRecuperacion(solicitarRecuperacionDTO dto) {
        String emailNormalizado = dto.getEmail().toLowerCase().trim();
        
        Optional<usuarioModel> usuarioOpt = usuarioRepository.findByEmail(emailNormalizado);
        
        // CA-02: Si el correo no existe, no revelar información
        if (usuarioOpt.isEmpty()) {
            return; // Respuesta exitosa simulada para no revelar si el correo existe
        }
        
        usuarioModel usuario = usuarioOpt.get();
        
        // CA-08: Invalidar OTP anterior si existe
        Optional<recuperacion_passwordModel> otpAnterior = 
            recuperacionPasswordRepository.buscarUltimoOtpActivo(usuario);
        
        otpAnterior.ifPresent(otp -> {
            otp.setUsado(true);
            recuperacionPasswordRepository.save(otp);
        });
        
        // Generar nuevo OTP de 6 dígitos
        String codigo = generarCodigoOtp();
        
        // Guardar en BD
        recuperacion_passwordModel recuperacion = new recuperacion_passwordModel();
        recuperacion.setUsuario(usuario);
        recuperacion.setCodigo_token(codigo);
        recuperacion.setFecha_expiracion(LocalDateTime.now().plusMinutes(MINUTOS_VIGENCIA));
        recuperacion.setUsado(false);
        recuperacion.setFecha_creacion(LocalDateTime.now());
        
        recuperacionPasswordRepository.save(recuperacion);
        
        // Enviar correo
        emailService.enviarCodigoRecuperacion(usuario.getEmail(), codigo);
    }
    
    public void validarOtp(validarOtpDTO dto) {
        String emailNormalizado = dto.getEmail().toLowerCase().trim();
        
        usuarioModel usuario = usuarioRepository.findByEmail(emailNormalizado)
            .orElseThrow(() -> new otpInvalidoException("El código es inválido o ha expirado"));
        
        recuperacion_passwordModel recuperacion = recuperacionPasswordRepository
            .buscarPorUsuarioYCodigo(usuario, dto.getCodigo())
            .orElseThrow(() -> new otpInvalidoException("El código es inválido o ha expirado"));
        
        // CA-05: Verificar expiración
        if (recuperacion.getFecha_expiracion().isBefore(LocalDateTime.now())) {
            throw new otpExpiradoException("El código ha expirado");
        }
    }
    
    @Transactional
    public void restablecerPassword(restablecerPasswordDTO dto) {
        String emailNormalizado = dto.getEmail().toLowerCase().trim();
        
        usuarioModel usuario = usuarioRepository.findByEmail(emailNormalizado)
            .orElseThrow(() -> new otpInvalidoException("El código es inválido o ha expirado"));
        
        recuperacion_passwordModel recuperacion = recuperacionPasswordRepository
            .buscarPorUsuarioYCodigo(usuario, dto.getCodigo())
            .orElseThrow(() -> new otpInvalidoException("El código es inválido o ha expirado"));
        
        // CA-05: Verificar expiración
        if (recuperacion.getFecha_expiracion().isBefore(LocalDateTime.now())) {
            throw new otpExpiradoException("El código ha expirado");
        }
        
        // Actualizar contraseña
        usuario.setPassword_hash(passwordEncoder.encode(dto.getNuevaPassword()));
        usuario.setFecha_actualizacion(LocalDateTime.now());
        usuarioRepository.save(usuario);
        
        // CA-07: Invalidar el OTP (un solo uso)
        recuperacion.setUsado(true);
        recuperacionPasswordRepository.save(recuperacion);
    }
    
    private String generarCodigoOtp() {
        SecureRandom random = new SecureRandom();
        int codigo = 100000 + random.nextInt(900000); // Entre 100000 y 999999
        return String.valueOf(codigo);
    }
}