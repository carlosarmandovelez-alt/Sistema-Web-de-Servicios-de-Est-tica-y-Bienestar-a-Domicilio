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
                // HU-001: Registro
                .requestMatchers("/api/auth/registro").permitAll()
                // HU-002: Login
                .requestMatchers("/api/auth/login").permitAll()
                // HU-003: Recuperación de contraseña
                .requestMatchers("/api/auth/solicitar-recuperacion").permitAll()
                .requestMatchers("/api/auth/validar-otp").permitAll()
                .requestMatchers("/api/auth/restablecer-password").permitAll()
                // HU-004: Perfil del cliente
                .requestMatchers("/api/clientes/**").hasRole("cliente")
                // HU-005: Perfil del proveedor
                .requestMatchers("/api/proveedores/**").hasRole("proveedor")
                // HU-006: Registro de servicios
                .requestMatchers("/api/servicios/**").hasRole("proveedor")
                // HU-009: Exploración (público según la condición)
                .requestMatchers("/api/exploracion/**").permitAll()
                // Errores
                .requestMatchers("/error").permitAll()
                // Todo lo demás
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