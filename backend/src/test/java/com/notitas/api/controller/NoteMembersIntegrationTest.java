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
 * Colaboradores por-nota (note_members): listado, expulsión por el creador y
 * permisos (solo el dueño del proyecto puede eliminar colaboradores).
 */
class NoteMembersIntegrationTest extends BaseIntegrationTest {

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

    /**
     * Owner crea proyecto + nota y activa el share token; luego el colaborador
     * se une por el enlace (note_members). Devuelve {ownerToken, ownerId,
     * projectId, noteId, collabToken, collabId}.
     */
    private JsonNode setupNoteWithCollab() throws Exception {
        JsonNode owner = registerUser("owner@notemembers.com", "password123", "Owner");
        String ownerToken = owner.get("token").asText();
        long projectId = createProject(ownerToken, "Proyecto Nota Compartida");
        long noteId = createNote(ownerToken, projectId, "Nota compartida");

        MvcResult share = mockMvc.perform(post("/api/notes/" + noteId + "/share-token")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andReturn();
        String shareToken = objectMapper.readTree(share.getResponse().getContentAsString()).get("shareToken").asText();

        JsonNode collab = registerUser("collab@notemembers.com", "password123", "Collab");
        mockMvc.perform(post("/api/notes/join/" + shareToken)
                        .header("Authorization", bearer(collab.get("token").asText())))
                .andExpect(status().isOk());

        return objectMapper.createObjectNode()
                .put("ownerToken", ownerToken)
                .put("ownerId", owner.get("id").asLong())
                .put("projectId", projectId)
                .put("noteId", noteId)
                .put("collabToken", collab.get("token").asText())
                .put("collabId", collab.get("id").asLong());
    }

    @Test
    void creatorCanListCollaborators_defaultRoleIsEditor() throws Exception {
        JsonNode ctx = setupNoteWithCollab();
        long noteId = ctx.get("noteId").asLong();

        mockMvc.perform(get("/api/notes/" + noteId + "/members")
                        .header("Authorization", bearer(ctx.get("ownerToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Collab"))
                .andExpect(jsonPath("$[0].userId").value(ctx.get("collabId").asLong()))
                .andExpect(jsonPath("$[0].email").value("collab@notemembers.com"))
                .andExpect(jsonPath("$[0].role").value("EDITOR"));
    }

    @Test
    void creatorCanChangeRoleToViewer_whoLosesEditAccess() throws Exception {
        JsonNode ctx = setupNoteWithCollab();
        String ownerToken = ctx.get("ownerToken").asText();
        String collabToken = ctx.get("collabToken").asText();
        long noteId = ctx.get("noteId").asLong();
        long collabId = ctx.get("collabId").asLong();

        // Como EDITOR (default), el colaborador puede editar la nota
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(collabToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("title", "Editado por collab"))))
                .andExpect(status().isOk());

        // El creador lo degrada a VIEWER
        mockMvc.perform(put("/api/notes/" + noteId + "/members/" + collabId)
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "VIEWER"))))
                .andExpect(status().isOk());

        // El rol se refleja en la lista
        mockMvc.perform(get("/api/notes/" + noteId + "/members")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("VIEWER"));

        // Un VIEWER por-nota ya no puede editar la nota...
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(collabToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("title", "Intento de edición"))))
                .andExpect(status().isForbidden());

        // ...pero sigue pudiendo verla
        mockMvc.perform(get("/api/notes/" + noteId)
                        .header("Authorization", bearer(collabToken)))
                .andExpect(status().isOk());

        // El creador lo vuelve a subir a EDITOR y recupera la edición
        mockMvc.perform(put("/api/notes/" + noteId + "/members/" + collabId)
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "EDITOR"))))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(collabToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("title", "Editado de nuevo"))))
                .andExpect(status().isOk());
    }

    @Test
    void onlyCreatorCanChangeRoles() throws Exception {
        JsonNode ctx = setupNoteWithCollab();
        String collabToken = ctx.get("collabToken").asText();
        long noteId = ctx.get("noteId").asLong();
        long collabId = ctx.get("collabId").asLong();

        // El propio colaborador no puede cambiar su rol
        mockMvc.perform(put("/api/notes/" + noteId + "/members/" + collabId)
                        .header("Authorization", bearer(collabToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "VIEWER"))))
                .andExpect(status().isForbidden());

        // Un outsider tampoco
        String outsider = register("outsider2@notemembers.com", "password123", "Outsider2");
        mockMvc.perform(put("/api/notes/" + noteId + "/members/" + collabId)
                        .header("Authorization", bearer(outsider))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "VIEWER"))))
                .andExpect(status().isForbidden());

        // Rol inválido: 400
        mockMvc.perform(put("/api/notes/" + noteId + "/members/" + collabId)
                        .header("Authorization", bearer(ctx.get("ownerToken").asText()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "ADMIN"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void noteResponse_includesNoteMembers_forAvatars() throws Exception {
        JsonNode ctx = setupNoteWithCollab();
        String ownerToken = ctx.get("ownerToken").asText();
        long noteId = ctx.get("noteId").asLong();

        // La nota (detalle y lista del proyecto) expone los colaboradores por-nota
        mockMvc.perform(get("/api/notes/" + noteId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noteMembers.length()").value(1))
                .andExpect(jsonPath("$.noteMembers[0].name").value("Collab"))
                .andExpect(jsonPath("$.noteMembers[0].userId").value(ctx.get("collabId").asLong()))
                .andExpect(jsonPath("$.noteMembers[0].role").value("EDITOR"));

        mockMvc.perform(get("/api/projects/" + ctx.get("projectId").asLong() + "/notes")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].noteMembers.length()").value(1));
    }

    @Test
    void noteWithoutShareToken_hasNoNoteMembers() throws Exception {
        String token = register("owner2@notemembers.com", "password123", "Owner2");
        long projectId = createProject(token, "Proyecto Privado");
        long noteId = createNote(token, projectId, "Nota privada");

        // Sin compartido activo, la nota no expone colaboradores
        mockMvc.perform(get("/api/notes/" + noteId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noteMembers.length()").value(0));
    }

    @Test
    void creatorCanRemoveCollaborator_whoLosesAccess() throws Exception {
        JsonNode ctx = setupNoteWithCollab();
        long noteId = ctx.get("noteId").asLong();
        long collabId = ctx.get("collabId").asLong();

        // El creador expulsa al colaborador
        mockMvc.perform(delete("/api/notes/" + noteId + "/members/" + collabId)
                        .header("Authorization", bearer(ctx.get("ownerToken").asText())))
                .andExpect(status().isOk());

        // Ya no aparece en la lista
        mockMvc.perform(get("/api/notes/" + noteId + "/members")
                        .header("Authorization", bearer(ctx.get("ownerToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // El expulsado pierde el acceso a la nota
        mockMvc.perform(get("/api/notes/" + noteId)
                        .header("Authorization", bearer(ctx.get("collabToken").asText())))
                .andExpect(status().isForbidden());
    }

    @Test
    void collaboratorCannotRemoveOthers_andSeesOnlyTheirOwnAccess() throws Exception {
        JsonNode ctx = setupNoteWithCollab();
        long noteId = ctx.get("noteId").asLong();
        long collabId = ctx.get("collabId").asLong();

        // Un colaborador no puede listar... (es miembro: sí puede ver la lista,
        // pero NO puede expulsar a nadie)

        // El colaborador intenta eliminarse a sí mismo: prohibido (solo el creador)
        mockMvc.perform(delete("/api/notes/" + noteId + "/members/" + collabId)
                        .header("Authorization", bearer(ctx.get("collabToken").asText())))
                .andExpect(status().isForbidden());

        // El colaborador sí puede ver la lista (tiene acceso a la nota)
        mockMvc.perform(get("/api/notes/" + noteId + "/members")
                        .header("Authorization", bearer(ctx.get("collabToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void editorProjectMemberCannotRemoveCollaborators_onlyCreatorCan() throws Exception {
        JsonNode ctx = setupNoteWithCollab();
        String ownerToken = ctx.get("ownerToken").asText();
        long projectId = ctx.get("projectId").asLong();
        long noteId = ctx.get("noteId").asLong();
        long collabId = ctx.get("collabId").asLong();

        // Un miembro EDITOR del proyecto (no creador) intenta expulsar: prohibido
        JsonNode editor = registerUser("editor@notemembers.com", "password123", "Editor");
        MvcResult invite = mockMvc.perform(post("/api/projects/" + projectId + "/invite-token")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andReturn();
        String inviteToken = objectMapper.readTree(invite.getResponse().getContentAsString()).get("inviteToken").asText();
        mockMvc.perform(post("/api/projects/join/" + inviteToken)
                        .header("Authorization", bearer(editor.get("token").asText())))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/notes/" + noteId + "/members/" + collabId)
                        .header("Authorization", bearer(editor.get("token").asText())))
                .andExpect(status().isForbidden());

        // El colaborador sigue en la lista (la expulsión no se ejecutó)
        mockMvc.perform(get("/api/notes/" + noteId + "/members")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void removalRotatesShareToken_andNotifiesExpelledUser() throws Exception {
        JsonNode ctx = setupNoteWithCollab();
        String ownerToken = ctx.get("ownerToken").asText();
        String collabToken = ctx.get("collabToken").asText();
        long noteId = ctx.get("noteId").asLong();
        long collabId = ctx.get("collabId").asLong();

        // Token anterior (el que el expulsado conservaría)
        MvcResult before = mockMvc.perform(post("/api/notes/" + noteId + "/share-token")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andReturn();
        String oldToken = objectMapper.readTree(before.getResponse().getContentAsString()).get("shareToken").asText();

        // Expulsión
        mockMvc.perform(delete("/api/notes/" + noteId + "/members/" + collabId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk());

        // El token se regeneró: el antiguo ya no permite unirse
        mockMvc.perform(post("/api/notes/join/" + oldToken)
                        .header("Authorization", bearer(collabToken)))
                .andExpect(status().isNotFound());

        // El expulsado recibió la notificación
        mockMvc.perform(get("/api/notifications")
                        .header("Authorization", bearer(collabToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("NOTE_MEMBER_REMOVED"))
                .andExpect(jsonPath("$[0].noteId").value(noteId));
    }

    @Test
    void outsiderCannotRemoveCollaborators() throws Exception {
        JsonNode ctx = setupNoteWithCollab();
        long noteId = ctx.get("noteId").asLong();
        long collabId = ctx.get("collabId").asLong();

        String outsider = register("outsider@notemembers.com", "password123", "Outsider");

        mockMvc.perform(delete("/api/notes/" + noteId + "/members/" + collabId)
                        .header("Authorization", bearer(outsider)))
                .andExpect(status().isForbidden());
    }
}
