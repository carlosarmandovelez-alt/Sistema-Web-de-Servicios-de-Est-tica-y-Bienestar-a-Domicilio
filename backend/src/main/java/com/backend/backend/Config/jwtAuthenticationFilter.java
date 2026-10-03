package com.backend.backend.Config;

import com.backend.backend.Service.authService;
import com.backend.backend.Service.jwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class jwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private jwtService jwtService;
    
    @Autowired
    private authService authService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        final String authHeader = request.getHeader("Authorization");
        String email = null;
        String jwt = null;
        String rol = null;
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
            
            // Verificar si el token está en la lista negra
            if (authService.esTokenInvalido(jwt)) {
                filterChain.doFilter(request, response);
                return;
            }
            
            try {
                email = jwtService.extraerEmail(jwt);
                rol = jwtService.extraerRol(jwt);
            } catch (Exception e) {
                // Token inválido o expirado
                filterChain.doFilter(request, response);
                return;
            }
        }
        
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (jwtService.validarToken(jwt, email)) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        email,
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + rol))
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        
        filterChain.doFilter(request, response);
    }
}