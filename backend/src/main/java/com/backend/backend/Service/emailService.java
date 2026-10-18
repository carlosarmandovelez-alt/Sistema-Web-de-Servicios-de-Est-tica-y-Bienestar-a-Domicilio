package com.backend.backend.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class emailService {
    
    @Autowired
    private JavaMailSender mailSender;
    
    public void enviarCodigoRecuperacion(String destinatario, String codigo) {
        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setTo(destinatario);
        mensaje.setSubject("Recuperación de contraseña - Bienestar en Casa");
        mensaje.setText(
            "Hola,\n\n" +
            "Has solicitado recuperar tu contraseña en Bienestar en Casa.\n\n" +
            "Tu código de verificación es: " + codigo + "\n\n" +
            "Este código es válido por 15 minutos y es de un solo uso.\n\n" +
            "Si no solicitaste este cambio, ignora este mensaje.\n\n" +
            "Saludos,\n" +
            "Equipo Bienestar en Casa"
        );
        
        mailSender.send(mensaje);
    }
}