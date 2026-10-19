package com.backend.backend.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class securityConfig {
    
    @Autowired
    private jwtAuthenticationFilter jwtAuthFilter;
    
    @Autowired
    private accessDeniedHandlerCustom accessDeniedHandler;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // HU-001, HU-002, HU-003 (Públicos)
                .requestMatchers("/api/auth/**").permitAll()
                
                // HU-004 (Cliente)
                .requestMatchers("/api/clientes/**").hasRole("cliente")
                
                // HU-005 (Proveedor)
                .requestMatchers("/api/proveedores/**").hasRole("proveedor")
                
                // HU-011 (Proveedor)
                .requestMatchers("/api/disponibilidad/**").hasRole("proveedor")
                
                // HU-009 y HU-010 (Públicos)
                .requestMatchers("/api/exploracion/**").permitAll()
                
                // ==========================================
                // HU-012, HU-013 y HU-014 (Solicitudes)
                // ==========================================
                // 1. Rutas específicas de Proveedor (Deben ir primero)
                .requestMatchers("/api/solicitudes/recibidas/**").hasRole("proveedor")
                
                // 2. Rutas específicas de Cliente
                .requestMatchers("/api/solicitudes/mis-solicitudes/**").hasRole("cliente")
                .requestMatchers(HttpMethod.POST, "/api/solicitudes").hasRole("cliente")
                
                // Errores
                .requestMatchers("/error").permitAll()
                
                // Cualquier otra ruta requiere autenticación
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .exceptionHandling(ex -> ex
                .accessDeniedHandler(accessDeniedHandler)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}