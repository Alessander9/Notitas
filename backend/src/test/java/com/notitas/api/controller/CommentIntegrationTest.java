package com.notitas.api.controller;

import com.notitas.api.BaseIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Comentarios en notas: CRUD, permisos (solo el autor edita/borra), acceso por
 * proyecto/miembro y notificaciones a los demás colaboradores.
 */
class CommentIntegrationTest extends BaseIntegrationTest {

    /** Registra un usuario y devuelve {token, id}. */
    private JsonNode registerUser(String email, String password, String name) throws Exception {
        String token = register(email, password, name);
        MvcResult result = mockMvc.perform(get("/api/users/me")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        long id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        return objectMapper.createObjectNode().put("token", token).put("id", id);
    }

    /** Owner crea proyecto + nota; member se une como EDITOR. Devuelve {ownerToken, ownerId, projectId, noteId, memberToken, memberId}. */
    private JsonNode setupProjectWithMember() throws Exception {
        JsonNode owner = registerUser("owner@comments.com", "password123", "Owner");
        String ownerToken = owner.get("token").asText();
        long projectId = createProject(ownerToken, "Proyecto Comentarios");
        long noteId = createNote(ownerToken, projectId, "Nota con comentarios");

        MvcResult invite = mockMvc.perform(post("/api/projects/" + projectId + "/invite-token")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andReturn();
        String inviteToken = objectMapper.readTree(invite.getResponse().getContentAsString()).get("inviteToken").asText();

        JsonNode member = registerUser("member@comments.com", "password123", "Member");
        mockMvc.perform(post("/api/projects/join/" + inviteToken)
                        .header("Authorization", bearer(member.get("token").asText())))
                .andExpect(status().isOk());

        return objectMapper.createObjectNode()
                .put("ownerToken", ownerToken)
                .put("ownerId", owner.get("id").asLong())
                .put("projectId", projectId)
                .put("noteId", noteId)
                .put("memberToken", member.get("token").asText())
                .put("memberId", member.get("id").asLong());
    }

    @Test
    void memberCanComment_listOrderedAndNotificationsCreated() throws Exception {
        JsonNode ctx = setupProjectWithMember();
        String ownerToken = ctx.get("ownerToken").asText();
        String memberToken = ctx.get("memberToken").asText();
        long noteId = ctx.get("noteId").asLong();

        // El miembro comenta
        mockMvc.perform(post("/api/notes/" + noteId + "/comments")
                        .header("Authorization", bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", "¡Buen trabajo!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorName").value("Member"))
                .andExpect(jsonPath("$.content").value("¡Buen trabajo!"));

        // El owner también comenta
        mockMvc.perform(post("/api/notes/" + noteId + "/comments")
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", "Gracias 🙂"))))
                .andExpect(status().isOk());

        // Lista en orden cronológico
        mockMvc.perform(get("/api/notes/" + noteId + "/comments")
                        .header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].authorName").value("Member"))
                .andExpect(jsonPath("$[1].authorName").value("Owner"));

        // El owner recibió notificación del comentario del miembro
        mockMvc.perform(get("/api/notifications")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("NOTE_COMMENTED"))
                .andExpect(jsonPath("$[0].noteId").value(noteId));
    }

    @Test
    void onlyAuthorCanEditOrDelete() throws Exception {
        JsonNode ctx = setupProjectWithMember();
        String ownerToken = ctx.get("ownerToken").asText();
        String memberToken = ctx.get("memberToken").asText();
        long noteId = ctx.get("noteId").asLong();

        // El miembro comenta
        MvcResult created = mockMvc.perform(post("/api/notes/" + noteId + "/comments")
                        .header("Authorization", bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", "Comentario del miembro"))))
                .andExpect(status().isOk())
                .andReturn();
        long commentId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        // El owner NO puede editar el comentario del miembro
        mockMvc.perform(put("/api/notes/" + noteId + "/comments/" + commentId)
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", "Editado por owner"))))
                .andExpect(status().isForbidden());

        // El owner NO puede borrarlo
        mockMvc.perform(delete("/api/notes/" + noteId + "/comments/" + commentId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isForbidden());

        // El autor SÍ puede editarlo y borrarlo
        mockMvc.perform(put("/api/notes/" + noteId + "/comments/" + commentId)
                        .header("Authorization", bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", "Editado por el autor"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Editado por el autor"));

        mockMvc.perform(delete("/api/notes/" + noteId + "/comments/" + commentId)
                        .header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/notes/" + noteId + "/comments")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void viewerMemberCanCommentButNotEditTheNote() throws Exception {
        JsonNode ctx = setupProjectWithMember();
        String ownerToken = ctx.get("ownerToken").asText();
        String memberToken = ctx.get("memberToken").asText();
        long projectId = ctx.get("projectId").asLong();
        long noteId = ctx.get("noteId").asLong();

        // El owner degrada al miembro a VIEWER
        mockMvc.perform(put("/api/projects/" + projectId + "/members/" + ctx.get("memberId").asLong())
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "VIEWER"))))
                .andExpect(status().isOk());

        // Un VIEWER no puede editar la nota...
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("title", "Intento de edición"))))
                .andExpect(status().isForbidden());

        // ...pero sí puede comentar
        mockMvc.perform(post("/api/notes/" + noteId + "/comments")
                        .header("Authorization", bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", "Soy viewer pero puedo comentar"))))
                .andExpect(status().isOk());
    }

    @Test
    void outsiderCannotReadOrComment() throws Exception {
        JsonNode ctx = setupProjectWithMember();
        long noteId = ctx.get("noteId").asLong();

        String outsider = register("outsider@comments.com", "password123", "Outsider");

        mockMvc.perform(get("/api/notes/" + noteId + "/comments")
                        .header("Authorization", bearer(outsider)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/notes/" + noteId + "/comments")
                        .header("Authorization", bearer(outsider))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", "Intruso"))))
                .andExpect(status().isForbidden());
    }
}
