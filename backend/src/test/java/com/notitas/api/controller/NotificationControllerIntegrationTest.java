package com.notitas.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.notitas.api.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de integración del {@code NotificationController}: lista, contador de
 * no leídas, marcar como leída (solo el destinatario), marcar todas y limpiar.
 *
 * Es la funcionalidad más reciente del sistema y no tenía cobertura de tests.
 */
class NotificationControllerIntegrationTest extends BaseIntegrationTest {

    @Test
    void notifications_fullFlow_joinNoteAndReadClear() throws Exception {
        String ownerToken = register("notif.owner@test.com", "secret123", "NotifOwner");
        long projectId = createProject(ownerToken, "Proyecto Notificado");

        // Sin notificaciones al principio
        mockMvc.perform(get("/api/notifications").header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(get("/api/notifications/unread-count").header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));

        // Un colaborador se une al proyecto → el owner recibe "Nuevo colaborador"
        String memberToken = register("notif.member@test.com", "secret123", "NotifMember");
        String inviteToken = getInviteToken(projectId, ownerToken);
        mockMvc.perform(post("/api/projects/join/" + inviteToken).header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk());

        MvcResult listResult = mockMvc.perform(get("/api/notifications").header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Nuevo colaborador"))
                .andExpect(jsonPath("$[0].read").value(false))
                .andReturn();
        JsonNode list = objectMapper.readTree(listResult.getResponse().getContentAsString());
        assertThat(list).hasSize(1);
        long notificationId = list.get(0).get("id").asLong();

        mockMvc.perform(get("/api/notifications/unread-count").header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1));

        // Marcar como leída → el contador baja a 0
        mockMvc.perform(put("/api/notifications/" + notificationId + "/read")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));
        mockMvc.perform(get("/api/notifications/unread-count").header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));

        // El owner crea una nota → el miembro recibe "Nueva nota creada"
        createNote(ownerToken, projectId, "Nota con aviso");
        mockMvc.perform(get("/api/notifications").header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Nueva nota creada"));

        // Marcar todas como leídas y limpiar la bandeja
        mockMvc.perform(put("/api/notifications/read-all").header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/notifications/unread-count").header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));

        mockMvc.perform(delete("/api/notifications").header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/notifications").header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void markAsRead_otherUsersNotification_returnsForbidden() throws Exception {
        String ownerToken = register("notif2.owner@test.com", "secret123", "N2Owner");
        long projectId = createProject(ownerToken, "Proyecto 2");
        String memberToken = register("notif2.member@test.com", "secret123", "N2Member");
        String inviteToken = getInviteToken(projectId, ownerToken);
        mockMvc.perform(post("/api/projects/join/" + inviteToken).header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk());

        // El miembro intenta marcar como leída una notificación del owner
        MvcResult listResult = mockMvc.perform(get("/api/notifications").header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andReturn();
        long notificationId = objectMapper.readTree(listResult.getResponse().getContentAsString()).get(0).get("id").asLong();

        expectApiError(403, "No tienes permiso para modificar esta notificación",
                put("/api/notifications/" + notificationId + "/read")
                        .header("Authorization", bearer(memberToken)));
    }

    @Test
    void notifications_withoutAuth_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/notifications/unread-count")).andExpect(status().isUnauthorized());
    }

    private String getInviteToken(long projectId, String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/projects/" + projectId + "/invite-token")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("inviteToken").asText();
    }
}
