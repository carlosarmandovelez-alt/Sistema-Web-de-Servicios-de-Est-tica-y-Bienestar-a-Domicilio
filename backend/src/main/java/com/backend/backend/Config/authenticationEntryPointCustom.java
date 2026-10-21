package com.backend.backend.Config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Devuelve 401 cuando no existe una sesión autenticada válida.
 * Necesario para diferenciar "sin autenticación" (HU-008 CA-05) de "sin permisos" (HU-008 CA-04).
 */
@Component
public class authenticationEntryPointCustom implements AuthenticationEntryPoint {
    
    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        String json = "{\"error\": \"No autenticado: inicia sesión con una cuenta de proveedor para realizar esta operación\"}";
        response.getWriter().write(json);
    }
}
