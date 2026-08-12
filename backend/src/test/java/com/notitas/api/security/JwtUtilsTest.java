package com.notitas.api.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests unitarios de {@link JwtUtils}: generación, validación, claims de
 * sesión ("tv" token version, "rm" remember-me), expiración y extracción del
 * token desde header o cookie.
 */
class JwtUtilsTest {

    private static final String SECRET = "test-secret-at-least-32-bytes-long-for-hs256!";

    private JwtUtils jwtUtils;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", 86_400_000);      // 24 h
        ReflectionTestUtils.setField(jwtUtils, "rememberMeExpirationMs", 2_592_000_000L); // 30 días
    }

    private JwtUtils withSecret(String secret) {
        JwtUtils other = new JwtUtils();
        ReflectionTestUtils.setField(other, "jwtSecret", secret);
        ReflectionTestUtils.setField(other, "jwtExpirationMs", 86_400_000);
        ReflectionTestUtils.setField(other, "rememberMeExpirationMs", 2_592_000_000L);
        return other;
    }

    @Test
    void generateAndValidateRoundTrip() {
        String token = jwtUtils.generateTokenFromUsername("user@test.com", 3);
        assertThat(token).isNotBlank();
        assertThat(jwtUtils.validateJwtToken(token)).isTrue();
        assertThat(jwtUtils.getUserNameFromJwtToken(token)).isEqualTo("user@test.com");
        assertThat(jwtUtils.getTokenVersionFromJwtToken(token)).isEqualTo(3);
        assertThat(jwtUtils.getRememberMeFromJwtToken(token)).isFalse();
    }

    @Test
    void generateJwtToken_fromAuthentication_usesPrincipalDetails() {
        UserDetailsImpl principal = new UserDetailsImpl(7L, "auth@test.com", "Auth", null, 5, "pw");
        // Usamos una implementación real en lugar de un mock de Mockito: el inline mock maker
        // de ByteBuddy no soporta Java 25 al instrumentar la jerarquía de Authentication.
        Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null);

        String token = jwtUtils.generateJwtToken(authentication, true);

        assertThat(jwtUtils.getUserNameFromJwtToken(token)).isEqualTo("auth@test.com");
        assertThat(jwtUtils.getTokenVersionFromJwtToken(token)).isEqualTo(5);
        assertThat(jwtUtils.getRememberMeFromJwtToken(token)).isTrue();
    }

    @Test
    void rememberMeToken_hasLongerLifetime() {
        String normal = jwtUtils.generateTokenFromUsername("u@test.com", 0);
        String remember = jwtUtils.generateTokenFromUsername("u@test.com", 0, true);

        Claims normalClaims = jwtUtils.parseClaimsIgnoreExpiration(normal);
        Claims rememberClaims = jwtUtils.parseClaimsIgnoreExpiration(remember);
        long normalLifetime = normalClaims.getExpiration().getTime() - normalClaims.getIssuedAt().getTime();
        long rememberLifetime = rememberClaims.getExpiration().getTime() - rememberClaims.getIssuedAt().getTime();

        assertThat(normalLifetime).isEqualTo(86_400_000);
        assertThat(rememberLifetime).isEqualTo(2_592_000_000L);
    }

    @Test
    void malformedAndEmptyTokens_areRejected() {
        assertThat(jwtUtils.validateJwtToken("not-a-jwt")).isFalse();
        assertThat(jwtUtils.validateJwtToken("")).isFalse();
        assertThat(jwtUtils.validateJwtToken(null)).isFalse();
        // El parsing estricto de un token basura lanza (el AuthTokenFilter lo captura)
        assertThatThrownBy(() -> jwtUtils.getUserNameFromJwtToken("garbage"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void tokenSignedWithDifferentSecret_isRejected() {
        // 42 caracteres (< 48 bytes): jjwt firma con HS256, evita WeakKeyException
        String token = withSecret("another-secret-value-with-32-bytes-minimum").generateTokenFromUsername("u@test.com", 0);
        assertThat(jwtUtils.validateJwtToken(token)).isFalse();
    }

    @Test
    void expiredToken_isRejectedButParsableIgnoringExpiration() {
        JwtUtils shortLived = withSecret(SECRET);
        ReflectionTestUtils.setField(shortLived, "jwtExpirationMs", -1);
        ReflectionTestUtils.setField(shortLived, "rememberMeExpirationMs", -1);
        String token = shortLived.generateTokenFromUsername("u@test.com", 0, false);

        assertThat(shortLived.validateJwtToken(token)).isFalse();
        // El logout/refresh puede parsear tokens vencidos mientras la firma sea válida
        assertThat(shortLived.parseClaimsIgnoreExpiration(token)).isNotNull();
    }

    @Test
    void tokenVersion_missingOrGarbage_returnsZero() {
        assertThat(jwtUtils.getTokenVersionFromJwtToken("garbage")).isZero();
        assertThat(jwtUtils.getTokenVersionFromJwtToken(null)).isZero();
    }

    @Test
    void extractJwt_prefersAuthorizationHeaderOverCookie() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Authorization")).thenReturn("Bearer header-token");
        when(request.getCookies()).thenReturn(new Cookie[]{new Cookie("jwt", "cookie-token")});

        assertThat(JwtUtils.extractJwt(request)).isEqualTo("header-token");
    }

    @Test
    void extractJwt_fallsBackToCookie() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getCookies()).thenReturn(new Cookie[]{new Cookie("other", "x"), new Cookie("jwt", "cookie-token")});

        assertThat(JwtUtils.extractJwt(request)).isEqualTo("cookie-token");
    }

    @Test
    void extractJwt_returnsNull_whenNoTokenPresent() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getCookies()).thenReturn(new Cookie[]{});

        assertThat(JwtUtils.extractJwt(request)).isNull();
    }
}
