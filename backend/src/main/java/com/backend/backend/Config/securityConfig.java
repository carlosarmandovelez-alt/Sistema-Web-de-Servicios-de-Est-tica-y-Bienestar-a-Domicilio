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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class securityConfig {
    
    @Autowired
    private jwtAuthenticationFilter jwtAuthFilter;
    
    @Autowired
    private accessDeniedHandlerCustom accessDeniedHandler;

    @Autowired
    private authenticationEntryPointCustom authenticationEntryPoint; // <-- Nueva inyección
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuracion = new CorsConfiguration();
        configuracion.setAllowedOrigins(List.of("http://localhost:3000", "http://127.0.0.1:3000"));
        configuracion.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuracion.setAllowedHeaders(List.of("*"));
        configuracion.setExposedHeaders(List.of("Authorization"));
        configuracion.setAllowCredentials(false);
        configuracion.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/**", configuracion);
        return fuente;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // HU-001, HU-002, HU-003 (Públicos)
                .requestMatchers("/api/auth/**").permitAll()
                
                // HU-004 (Cliente)
                .requestMatchers("/api/clientes/**").hasRole("cliente")
                
                // HU-005 (Proveedor)
                .requestMatchers("/api/proveedores/**").hasRole("proveedor")
                
                // Catálogo de categorías (público)
                .requestMatchers("/api/categorias/**").permitAll()

                // HU-006, HU-007, HU-008 (Proveedor)
                .requestMatchers("/api/servicios/**").hasRole("proveedor")
                
                // HU-011 (Proveedor)
                .requestMatchers("/api/disponibilidad/**").hasRole("proveedor")
                
                // HU-009 y HU-010 (Públicos)
                .requestMatchers("/api/exploracion/**").permitAll()
                
                // HU-012, HU-013 y HU-014 (Solicitudes)
                .requestMatchers("/api/solicitudes/recibidas/**").hasRole("proveedor")
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
                .authenticationEntryPoint(authenticationEntryPoint) // <-- Agregado aquí
                .accessDeniedHandler(accessDeniedHandler)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
