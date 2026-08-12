package com.notitas.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitarios del {@link RateLimitFilter}: ventana por IP, límite de
 * peticiones, X-Forwarded-For y desactivación por configuración.
 *
 * Se invoca {@code doFilterInternal} directamente (mismo paquete) porque
 * {@code OncePerRequestFilter.doFilter} descarta llamadas repetidas sobre el
 * mismo request y rompería los contadores del test.
 */
@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain chain;

    @InjectMocks
    private RateLimitFilter filter;

    private final StringWriter body = new StringWriter();

    @BeforeEach
    void setUp() throws Exception {
        ReflectionTestUtils.setField(filter, "enabled", true);
        ReflectionTestUtils.setField(filter, "maxRequests", 10);
        ReflectionTestUtils.setField(filter, "windowMs", 60_000L);
    }

    /** El bloqueo escribe el JSON de error: solo los tests que bloquean necesitan el writer. */
    private void stubResponseWriter() throws Exception {
        when(response.getWriter()).thenReturn(new PrintWriter(body));
    }

    private void stubLoginRequest(String ip) {
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        when(request.getRemoteAddr()).thenReturn(ip);
    }

    @Test
    void requestsUnderLimit_passThrough() throws Exception {
        stubLoginRequest("1.2.3.4");
        for (int i = 0; i < 10; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(chain, org.mockito.Mockito.times(10)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    @Test
    void requestsOverLimit_areBlockedWith429() throws Exception {
        stubResponseWriter();
        stubLoginRequest("5.6.7.8");
        for (int i = 0; i < 11; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(chain, org.mockito.Mockito.times(10)).doFilter(request, response);
        verify(response).setStatus(429);
        assertThat(body.toString()).contains("Demasiadas solicitudes");
    }

    @Test
    void rateLimit_isPerIp() throws Exception {
        stubResponseWriter();
        stubLoginRequest("10.0.0.1");
        for (int i = 0; i < 11; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(response).setStatus(429);

        // Otra IP distinta tiene su propia ventana: no está bloqueada
        org.mockito.Mockito.clearInvocations(response);
        stubLoginRequest("10.0.0.2");
        filter.doFilterInternal(request, response, chain);
        verify(response, never()).setStatus(429);
        verify(chain, org.mockito.Mockito.times(11)).doFilter(request, response);
    }

    @Test
    void xForwardedFor_headerDistinguishesClientsBehindSameProxy() throws Exception {
        stubResponseWriter();
        when(request.getRequestURI()).thenReturn("/api/auth/register");
        // Nota: con XFF presente el filtro no lee el remoteAddr (misma IP física
        // para ambos clientes en un despliegue con proxy)

        // El valor de XFF cambia entre peticiones (thenAnswer + holder mutable)
        final String[] xff = {"203.0.113.9"};
        when(request.getHeader("X-Forwarded-For")).thenAnswer(inv -> xff[0]);

        // Cliente A: 10 peticiones → todas pasan
        for (int i = 0; i < 10; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(response, never()).setStatus(429);

        // Cliente B (otra XFF, misma IP física): ventana independiente
        xff[0] = "203.0.113.10";
        for (int i = 0; i < 10; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(response, never()).setStatus(429);
        // El 11º de B se bloquea, probando que el filtro usa la XFF, no el remoteAddr
        filter.doFilterInternal(request, response, chain);
        verify(response).setStatus(429);
    }

    @Test
    void passwordResetPaths_areAlsoLimited() throws Exception {
        stubResponseWriter();
        when(request.getRequestURI()).thenReturn("/api/auth/forgot-password");
        when(request.getRemoteAddr()).thenReturn("9.9.9.9");
        for (int i = 0; i < 11; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(response).setStatus(429);

        // El mismo límite aplica a reset-password (nueva IP para aislar el contador)
        org.mockito.Mockito.clearInvocations(response);
        when(request.getRequestURI()).thenReturn("/api/auth/reset-password");
        when(request.getRemoteAddr()).thenReturn("8.8.8.8");
        for (int i = 0; i < 11; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(response).setStatus(429);
    }

    @Test
    void nonAuthPaths_areNeverLimited() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/projects");
        for (int i = 0; i < 100; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(chain, org.mockito.Mockito.times(100)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    @Test
    void disabledFilter_passesEverything() throws Exception {
        ReflectionTestUtils.setField(filter, "enabled", false);
        // Con el filtro desactivado no se lee ni la URI ni la IP: sin stubs
        for (int i = 0; i < 100; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(chain, org.mockito.Mockito.times(100)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }
}
