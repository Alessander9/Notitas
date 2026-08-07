package com.notitas.api.controller;

import com.notitas.api.BaseIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de integración del AuthController: registro, login y control de acceso.
 */
class AuthControllerIntegrationTest extends BaseIntegrationTest {

    @Test
    void register_createsUserAndReturnsSuccessMessage() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Alice","email":"alice@test.com","password":"secret123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Usuario registrado exitosamente"));
    }

    @Test
    void register_duplicateEmail_returnsBadRequest() throws Exception {
        register("dup@test.com", "secret123", "Dup");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Dup 2","email":"dup@test.com","password":"secret123"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Error: El email ya está registrado"));
    }

    @Test
    void register_invalidPayload_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"","email":"not-an-email","password":"123"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_validCredentials_returnsJwtToken() throws Exception {
        register("bob@test.com", "secret123", "Bob");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"bob@test.com","password":"secret123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("Bearer"))
                .andExpect(jsonPath("$.email").value("bob@test.com"))
                .andExpect(jsonPath("$.name").value("Bob"))
                .andExpect(jsonPath("$.id").isNumber())
                .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    void login_withSeededDemoUser_returnsJwtToken() throws Exception {
        // El usuario demo lo inserta DatabaseInitializer al arrancar el contexto
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@notitas.com","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@notitas.com"))
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void login_wrongPassword_returnsUnauthorized() throws Exception {
        register("carol@test.com", "secret123", "Carol");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"carol@test.com","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_invalidPayload_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"not-an-email","password":""}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void protectedEndpoint_withoutToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_withInvalidToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer invalid.token.value"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_returnsCurrentUserWithValidToken() throws Exception {
        String token = register("me@test.com", "secret123", "Me");

        mockMvc.perform(get("/api/users/me").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("me@test.com"))
                .andExpect(jsonPath("$.name").value("Me"));
    }

    @Test
    void me_withoutToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_withValidCookie_renewsSessionAndSetsNewCookie() throws Exception {
        String token = register("refresh@test.com", "secret123", "Refresh");

        // Simula el navegador: el JWT viaja en la cookie httpOnly
        MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("jwt", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("refresh@test.com"))
                .andReturn();

        // Se renueva la cookie (el JWT puede ser idéntico si se genera en el
        // mismo milisegundo, lo importante es que se vuelve a emitir)
        Cookie renewed = result.getResponse().getCookie("jwt");
        assertThat(renewed).isNotNull();
        assertThat(renewed.getValue()).isNotBlank();
        assertThat(renewed.getMaxAge()).isPositive();

        // La cookie renovada funciona en un endpoint protegido (ciclo completo)
        mockMvc.perform(get("/api/users/me").cookie(new Cookie("jwt", renewed.getValue())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("refresh@test.com"));
    }

    @Test
    void refresh_withInvalidToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("jwt", "invalid.token.value")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_withWellFormedButWrongSignature_returnsUnauthorizedNot500() throws Exception {
        // Regresión del bug de producción: un JWT con la estructura correcta
        // (header.payload) pero firmado con OTRA clave lanza SignatureException
        // en validateJwtToken. Antes del fix eso escapaba como excepción no
        // controlada → 500 "Error interno del servidor" en lugar de 401.
        String header = base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = base64Url("{\"sub\":\"nobody@test.com\",\"tv\":0,\"iat\":1,\"exp\":9999999999}");
        String wrongSignature = hmacSha256(header + "." + payload, "clave-diferente-a-la-del-servidor");
        String forgedToken = header + "." + payload + "." + wrongSignature;

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("jwt", forgedToken)))
                .andExpect(status().isUnauthorized());
    }

    private static String base64Url(String json) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private static String hmacSha256(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void refresh_withoutToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_revokesAllPreviouslyIssuedTokens() throws Exception {
        String token = register("logout@test.com", "secret123", "Logout");

        // El token funciona antes del logout
        mockMvc.perform(get("/api/projects").header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        // Logout con el token en la cookie (como hace el navegador)
        mockMvc.perform(post("/api/auth/logout").cookie(new Cookie("jwt", token)))
                .andExpect(status().isOk());

        // El token emitido antes queda revocado → 401 aunque no haya expirado
        mockMvc.perform(get("/api/projects").header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }
}
