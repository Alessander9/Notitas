package com.notitas.api.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private int jwtExpirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = this.jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateJwtToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();
        return generateTokenFromUsername(userPrincipal.getUsername(), userPrincipal.getTokenVersion());
    }

    /**
     * Emite un JWT con la versión de sesión embebida (claim "tv"). El filtro de
     * autenticación la compara con la versión actual del usuario en BD: si el
     * usuario cerró sesión (versión incrementada), los tokens anteriores dejan
     * de ser válidos aunque no hayan expirado.
     */
    public String generateTokenFromUsername(String username, int tokenVersion) {
        return Jwts.builder()
                .subject(username)
                .claim("tv", tokenVersion)
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Versión de sesión embebida en el token (0 si el token no la lleva, p. ej.
     * tokens emitidos antes de introducir el campo). Devuelve 0 ante cualquier
     * error de parseo para no romper el flujo de validación principal.
     */
    public int getTokenVersionFromJwtToken(String token) {
        try {
            Object value = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .get("tv");
            return value instanceof Number ? ((Number) value).intValue() : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Parsea el JWT sin exigir que no haya expirado. Útil para operaciones que
     * deben funcionar con tokens vencidos (p. ej. el logout, que revoca la
     * sesión incluso si el token ya expiró). Devuelve null si la firma no es
     * válida.
     */
    public Claims parseClaimsIgnoreExpiration(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            return e.getClaims();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Extrae el JWT de la petición: primero del header {@code Authorization:
     * Bearer ...}, después de la cookie httpOnly {@code jwt}. Compartido por el
     * {@code AuthTokenFilter} (cada request) y el {@code AuthController}
     * (refresh/logout) para mantener una única fuente de verdad.
     */
    public static String extractJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("jwt".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(authToken);
            return true;
        } catch (MalformedJwtException e) {
            logger.error("Invalid JWT token: {}", e.getMessage());
        } catch (SignatureException e) {
            logger.error("JWT signature is invalid: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims string is empty: {}", e.getMessage());
        }

        return false;
    }
}
