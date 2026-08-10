package com.notitas.api.security;

import com.notitas.api.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test de integración del {@link RateLimitFilter} real sobre el endpoint de
 * login. El perfil de test desactiva el rate limit por defecto; este test
 * activa la propiedad para cubrir el comportamiento en producción.
 *
 * Usa su propio contexto de Spring (por el {@code @TestPropertySource}) para
 * no contaminar el contador de IP del resto de la suite.
 */
@TestPropertySource(properties = "app.rate-limit.enabled=true")
class RateLimitFilterIntegrationTest extends BaseIntegrationTest {

    @Test
    void loginBeyondLimit_returns429() throws Exception {
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"email":"nobody@test.com","password":"wrong"}
                                    """))
                    .andExpect(status().isUnauthorized());
        }

        // La petición número 11 se bloquea con 429
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"nobody@test.com","password":"wrong"}
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Demasiadas solicitudes. Intenta de nuevo en 1 minuto."));
    }
}
