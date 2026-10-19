package com.backend.backend.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
                .requestMatchers("/api/auth/registro").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/auth/solicitar-recuperacion").permitAll()
                .requestMatchers("/api/auth/validar-otp").permitAll()
                .requestMatchers("/api/auth/restablecer-password").permitAll()
                
                // HU-004 (Cliente)
                .requestMatchers("/api/clientes/**").hasRole("cliente")
                
                // HU-005 (Proveedor)
                .requestMatchers("/api/proveedores/**").hasRole("proveedor")
                
                // HU-006, HU-007 y HU-008 (Proveedor)
                .requestMatchers("/api/servicios/**").hasRole("proveedor")
                
                // HU-011 (Proveedor)
                .requestMatchers("/api/disponibilidad/**").hasRole("proveedor")
                
                // HU-009 y HU-010 (Públicos)
                .requestMatchers("/api/exploracion/**").permitAll()
                
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