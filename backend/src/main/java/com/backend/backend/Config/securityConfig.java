package com.backend.backend.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class securityConfig {
    
    @Autowired
    private jwtAuthenticationFilter jwtAuthFilter;
    
    @Autowired
    private accessDeniedHandlerCustom accessDeniedHandler;

    @Autowired
    private authenticationEntryPointCustom authenticationEntryPoint; 
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // El frontend (React en otro puerto) necesita CORS y que el
            // preflight OPTIONS se resuelva sin autenticación. Sin esto el
            // navegador bloquea TODAS las peticiones con JWT.
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // Preflight CORS (debe ir antes que cualquier regla con rol)
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // HU-001, HU-002, HU-003 (Públicos)
                .requestMatchers("/api/auth/**").permitAll()
                
                // HU-004 (Cliente)
                .requestMatchers("/api/clientes/**").hasRole("cliente")
                
                // HU-005 (Proveedor)
                .requestMatchers("/api/proveedores/**").hasRole("proveedor")
                
                // HU-006, HU-007, HU-008 (Proveedor)
                .requestMatchers("/api/servicios/**").hasRole("proveedor")
                
                // HU-011 (Proveedor)
                .requestMatchers("/api/disponibilidad/**").hasRole("proveedor")
                
                // HU-009 y HU-010 (Públicos)
                .requestMatchers("/api/exploracion/**").permitAll()

                // Catálogo de categorías (público, usado por la exploración
                // y por los formularios de servicio)
                .requestMatchers("/api/categorias/**").permitAll()
                
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
                .authenticationEntryPoint(authenticationEntryPoint) 
                .accessDeniedHandler(accessDeniedHandler)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    /**
     * Configuración CORS explícita para el frontend React.
     *
     * El proyecto usa JWT en la cabecera Authorization (no cookies), por lo
     * que no se habilitan credenciales y se permite cualquier origen de
     * desarrollo (la app se sirve desde otro puerto).
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuracion = new CorsConfiguration();
        configuracion.setAllowedOriginPatterns(Arrays.asList("*"));
        configuracion.setAllowedMethods(
            Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        );
        configuracion.setAllowedHeaders(Arrays.asList("*"));
        configuracion.setExposedHeaders(Arrays.asList("Authorization"));
        configuracion.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/**", configuracion);
        return fuente;
    }
}