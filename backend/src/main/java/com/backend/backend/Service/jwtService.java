package com.backend.backend.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class jwtService {
    
    @Value("${jwt.secret}")
    private String secretKey;
    
    @Value("${jwt.expiration}")
    private Long expiration;
    
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }
    
    public String generarToken(String email, String rol, Integer idUsuario) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("rol", rol);
        claims.put("idUsuario", idUsuario);
        
        return Jwts.builder()
                .claims(claims)                                    // ← claims() en lugar de setClaims()
                .subject(email)                                    // ← subject() en lugar de setSubject()
                .issuedAt(new Date(System.currentTimeMillis()))    // ← issuedAt() en lugar de setIssuedAt()
                .expiration(new Date(System.currentTimeMillis() + expiration))  // ← expiration()
                .signWith(getSigningKey(), Jwts.SIG.HS256)         // ← Jwts.SIG en lugar de SignatureAlgorithm
                .compact();
    }
    
    public String extraerEmail(String token) {
        return extraerClaim(token, Claims::getSubject);
    }
    
    public String extraerRol(String token) {
        return extraerClaim(token, claims -> claims.get("rol", String.class));
    }
    
    public Integer extraerIdUsuario(String token) {
        return extraerClaim(token, claims -> claims.get("idUsuario", Integer.class));
    }
    
    public Date extraerExpiracion(String token) {
        return extraerClaim(token, Claims::getExpiration);
    }
    
    public <T> T extraerClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extraerTodosLosClaims(token);
        return claimsResolver.apply(claims);
    }
    
    private Claims extraerTodosLosClaims(String token) {
        return Jwts.parser()                                       // ← parser() en lugar de parserBuilder()
                .verifyWith(getSigningKey())                       // ← verifyWith() en lugar de setSigningKey()
                .build()
                .parseSignedClaims(token)                          // ← parseSignedClaims() en lugar de parseClaimsJws()
                .getPayload();                                     // ← getPayload() en lugar de getBody()
    }
    
    public boolean esTokenExpirado(String token) {
        return extraerExpiracion(token).before(new Date());
    }
    
    public boolean validarToken(String token, String email) {
        final String emailToken = extraerEmail(token);
        return emailToken.equals(email) && !esTokenExpirado(token);
    }
}