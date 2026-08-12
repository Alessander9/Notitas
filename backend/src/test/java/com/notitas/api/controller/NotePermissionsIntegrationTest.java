package com.notitas.api.controller;

import com.notitas.api.BaseIntegrationTest;
import com.notitas.api.model.Project;
import com.notitas.api.model.ProjectMember;
import com.notitas.api.model.User;
import com.notitas.api.repository.ProjectMemberRepository;
import com.notitas.api.repository.ProjectRepository;
import com.notitas.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de integración de permisos de ESCRITURA por rol.
 *
 * El rol VIEWER es "solo lectura": no puede editar, borrar ni subir archivos.
 * Como hoy no hay endpoint para crear miembros VIEWER (todos se unen como
 * EDITOR), el miembro VIEWER se crea directamente en BD para cubrir la regla.
 */
class NotePermissionsIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ProjectMemberRepository projectMemberRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    /** Registra al usuario y lo añade al proyecto como miembro VIEWER. */
    private String makeViewer(String email, long projectId) throws Exception {
        String token = register(email, "secret123", "Viewer");
        User user = userRepository.findByEmail(email).orElseThrow();
        Project project = projectRepository.findById(projectId).orElseThrow();
        projectMemberRepository.save(new ProjectMember(null, project, user, "VIEWER", null));
        return token;
    }

    private long createNoteAsOwner(String ownerEmail, String projectName) throws Exception {
        String ownerToken = register(ownerEmail, "secret123", "Owner");
        long projectId = createProject(ownerToken, projectName);
        createNote(ownerToken, projectId, "Nota protegida");
        return projectId;
    }

    @Test
    void viewer_canReadNoteButCannotUpdate() throws Exception {
        String ownerToken = register("perm.owner@test.com", "secret123", "PermOwner");
        long projectId = createProject(ownerToken, "Proyecto Permisos");
        long noteId = createNote(ownerToken, projectId, "Nota protegida");
        String viewerToken = makeViewer("perm.viewer@test.com", projectId);

        // Lectura permitida
        mockMvc.perform(get("/api/notes/" + noteId).header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Nota protegida"));

        // Escritura denegada
        expectApiError(403, "No tienes permisos de edición en esta nota",
                put("/api/notes/" + noteId)
                        .header("Authorization", bearer(viewerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Intento de edición"}
                                """));
    }

    @Test
    void viewer_cannotDeleteNoteNorUploadFiles() throws Exception {
        String ownerToken = register("perm2.owner@test.com", "secret123", "Perm2Owner");
        long projectId = createProject(ownerToken, "Proyecto Permisos 2");
        long noteId = createNote(ownerToken, projectId, "Nota blindada");
        String viewerToken = makeViewer("perm2.viewer@test.com", projectId);

        expectApiError(403, "No tienes permisos de edición en esta nota",
                delete("/api/notes/" + noteId).header("Authorization", bearer(viewerToken)));

        MockMultipartFile file = new MockMultipartFile("file", "x.png", "image/png", new byte[]{1});
        expectApiError(403, "No tienes permisos de edición en esta nota",
                multipart(HttpMethod.POST, "/api/notes/" + noteId + "/cover")
                        .file(file)
                        .header("Authorization", bearer(viewerToken)));
        expectApiError(403, "No tienes permisos de edición en esta nota",
                multipart(HttpMethod.POST, "/api/notes/" + noteId + "/attachment")
                        .file(file)
                        .header("Authorization", bearer(viewerToken)));
        expectApiError(403, "No tienes permisos de edición en esta nota",
                multipart(HttpMethod.POST, "/api/notes/" + noteId + "/images")
                        .file(file)
                        .header("Authorization", bearer(viewerToken)));
    }

    @Test
    void viewer_cannotRestoreVersionsNorRevokeShare() throws Exception {
        String ownerToken = register("perm3.owner@test.com", "secret123", "Perm3Owner");
        long projectId = createProject(ownerToken, "Proyecto Permisos 3");
        long noteId = createNote(ownerToken, projectId, "Nota con historial");
        String viewerToken = makeViewer("perm3.viewer@test.com", projectId);

        MvcResult versionsResult = mockMvc.perform(get("/api/notes/" + noteId + "/versions")
                        .header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk())
                .andReturn();
        long versionId = objectMapper.readTree(versionsResult.getResponse().getContentAsString()).get(0).get("id").asLong();

        expectApiError(403, "No tienes permisos de edición en esta nota",
                post("/api/notes/" + noteId + "/versions/" + versionId + "/restore")
                        .header("Authorization", bearer(viewerToken)));
        expectApiError(403, "No tienes permisos de edición en esta nota",
                delete("/api/notes/" + noteId + "/share-token")
                        .header("Authorization", bearer(viewerToken)));
    }

    @Test
    void editorMember_canStillUpdateNote() throws Exception {
        String ownerToken = register("perm4.owner@test.com", "secret123", "Perm4Owner");
        long projectId = createProject(ownerToken, "Proyecto Colaborativo");
        long noteId = createNote(ownerToken, projectId, "Nota del equipo");

        // El miembro se une por invitación → rol EDITOR
        String memberToken = register("perm4.member@test.com", "secret123", "Perm4Member");
        MvcResult inviteResult = mockMvc.perform(post("/api/projects/" + projectId + "/invite-token")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andReturn();
        String inviteToken = objectMapper.readTree(inviteResult.getResponse().getContentAsString()).get("inviteToken").asText();
        mockMvc.perform(post("/api/projects/join/" + inviteToken).header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentUserRole").value("EDITOR"));

        // El EDITOR sí puede editar (regresión: el fix no debe romper a los editores)
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Editado por colaborador"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Editado por colaborador"));
    }
}
