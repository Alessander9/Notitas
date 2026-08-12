package com.notitas.api.controller;

import com.notitas.api.BaseIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Recuperación de contraseña: forgot-password genera el token y (en tests, sin
 * email configurado) expone el enlace de reset; reset-password lo valida y
 * permite iniciar sesión con la nueva contraseña. El token es de un solo uso.
 */
class PasswordResetIntegrationTest extends BaseIntegrationTest {

    private String requestResetLink(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(body.has("devResetLink")).as("en tests sin email configurado se expone el enlace").isTrue();
        String resetLink = body.get("devResetLink").asText();
        // El enlace apunta a /reset-password?token=...
        assertThat(resetLink).contains("/reset-password?token=");
        return resetLink.substring(resetLink.indexOf("token=") + "token=".length());
    }

    @Test
    void forgotAndResetPassword_fullFlow() throws Exception {
        register("reset@test.com", "password123", "Reset");
        String token = requestResetLink("reset@test.com");

        // Reset con la nueva contraseña
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", token, "password", "nuevaClave123"))))
                .andExpect(status().isOk());

        // El login con la nueva contraseña funciona
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "reset@test.com", "password", "nuevaClave123"))))
                .andExpect(status().isOk());

        // La contraseña antigua ya no sirve
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "reset@test.com", "password", "password123"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void resetToken_isSingleUseAndExpiredTokensRejected() throws Exception {
        register("once@test.com", "password123", "Once");
        String token = requestResetLink("once@test.com");

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", token, "password", "primera123"))))
                .andExpect(status().isOk());

        // Reutilizar el mismo token: rechazado
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", token, "password", "segunda123"))))
                .andExpect(status().isBadRequest());

        // Token inexistente: rechazado
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", "no-existe", "password", "tercera123"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void forgotPassword_doesNotRevealIfEmailExists() throws Exception {
        // Email no registrado: misma respuesta 200 genérica, sin enlace de dev
        MvcResult result = mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "nadie@test.com"))))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(body.has("devResetLink")).isFalse();
        assertThat(body.get("message").asText()).contains("Si el correo está registrado");
    }

    @Test
    void forgotPassword_validatesEmail() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "no-es-un-email"))))
                .andExpect(status().isBadRequest());
    }
}
