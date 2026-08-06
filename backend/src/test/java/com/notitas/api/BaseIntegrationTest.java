package com.notitas.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Clase base para los tests de integración de los controllers.
 *
 * Levanta el contexto Spring completo (H2 + seguridad JWT real) y expone
 * helpers para registrar usuarios, autenticarse y crear datos de prueba.
 *
 * {@code @Transactional} hace que cada test haga rollback de sus cambios,
 * manteniendo el aislamiento entre tests sin necesidad de limpiar la base.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    /** Registra un usuario y devuelve el token JWT obtenido tras el login. */
    protected String register(String email, String password, String name) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", name,
                                "email", email,
                                "password", password))))
                .andExpect(status().isOk());
        return login(email, password);
    }

    /** Hace login y devuelve el token JWT. */
    protected String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    /** Crea un proyecto y devuelve su id. */
    protected long createProject(String token, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/projects")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", name))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    /** Crea una nota en el proyecto indicado y devuelve su id. */
    protected long createNote(String token, long projectId, String title) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("content", "<p>Contenido de prueba</p>");
        MvcResult result = mockMvc.perform(post("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    protected String bearer(String token) {
        return "Bearer " + token;
    }

    /**
     * Verifica una respuesta de error de la API: código HTTP y mensaje en el
     * cuerpo JSON. El {@code GlobalExceptionHandler} convierte las excepciones
     * de los servicios en respuestas 400/403/404/500 con {"message": "..."}.
     */
    protected void expectApiError(int expectedStatus, String expectedMessage, MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().is(expectedStatus))
                .andExpect(jsonPath("$.message").value(expectedMessage));
    }
}
