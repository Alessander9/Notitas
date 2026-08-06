package com.notitas.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.notitas.api.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de integración del ProjectController: CRUD, invitaciones,
 * unión a proyectos y reglas de autorización (propietario vs miembro).
 */
class ProjectControllerIntegrationTest extends BaseIntegrationTest {

    @Test
    void createProject_returnsProjectWithOwnerRole() throws Exception {
        String token = register("owner@test.com", "secret123", "Owner");

        mockMvc.perform(post("/api/projects")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Proyecto API","icon":"folder","color":"#1976d2","description":"Descripción del proyecto"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Proyecto API"))
                .andExpect(jsonPath("$.icon").value("folder"))
                .andExpect(jsonPath("$.color").value("#1976d2"))
                .andExpect(jsonPath("$.description").value("Descripción del proyecto"))
                .andExpect(jsonPath("$.currentUserRole").value("OWNER"))
                .andExpect(jsonPath("$.creator.email").value("owner@test.com"))
                .andExpect(jsonPath("$.creator.role").value("OWNER"))
                .andExpect(jsonPath("$.collaborators").isEmpty());
    }

    @Test
    void createProject_withoutName_returnsBadRequest() throws Exception {
        String token = register("noname@test.com", "secret123", "NoName");

        mockMvc.perform(post("/api/projects")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":""}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createProject_withoutAuth_returnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Sin auth"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllProjects_returnsOwnedProjects() throws Exception {
        String token = register("list@test.com", "secret123", "List");
        createProject(token, "Proyecto A");
        createProject(token, "Proyecto B");

        MvcResult result = mockMvc.perform(get("/api/projects").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode projects = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(projects).hasSize(2);
        assertThat(projects).anyMatch(node -> "Proyecto A".equals(node.get("name").asText()));
        assertThat(projects).anyMatch(node -> "Proyecto B".equals(node.get("name").asText()));
    }

    @Test
    void getProjectById_returnsProject() throws Exception {
        String token = register("getone@test.com", "secret123", "GetOne");
        long projectId = createProject(token, "Proyecto Único");

        mockMvc.perform(get("/api/projects/" + projectId).header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Proyecto Único"))
                .andExpect(jsonPath("$.currentUserRole").value("OWNER"));
    }

    @Test
    void getProjectById_nonExistent_throwsServerError() throws Exception {
        String token = register("ghost@test.com", "secret123", "Ghost");

        expectApiError(404, "Proyecto no encontrado",
                get("/api/projects/999999").header("Authorization", bearer(token)));
    }

    @Test
    void getProjectById_otherUserNotMember_throwsServerError() throws Exception {
        String ownerToken = register("secure.owner@test.com", "secret123", "Secure");
        long projectId = createProject(ownerToken, "Proyecto Privado");

        String intruderToken = register("intruder@test.com", "secret123", "Intruder");
        expectApiError(403, "No tienes acceso a este proyecto",
                get("/api/projects/" + projectId).header("Authorization", bearer(intruderToken)));
    }

    @Test
    void updateProject_updatesNameAndColor() throws Exception {
        String token = register("updater@test.com", "secret123", "Updater");
        long projectId = createProject(token, "Nombre Original");

        mockMvc.perform(put("/api/projects/" + projectId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Nombre Actualizado","color":"#ff0000"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Nombre Actualizado"))
                .andExpect(jsonPath("$.color").value("#ff0000"));
    }

    @Test
    void deleteProject_removesProject() throws Exception {
        String token = register("deleter@test.com", "secret123", "Deleter");
        long projectId = createProject(token, "Proyecto a Borrar");

        mockMvc.perform(delete("/api/projects/" + projectId).header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(get("/api/projects").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode projects = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(projects).noneMatch(node -> "Proyecto a Borrar".equals(node.get("name").asText()));
    }

    @Test
    void deleteProject_asMemberNotOwner_returnsServerError() throws Exception {
        String ownerToken = register("del.owner@test.com", "secret123", "DelOwner");
        long projectId = createProject(ownerToken, "Proyecto Protegido");

        String memberToken = register("del.member@test.com", "secret123", "DelMember");
        String inviteToken = getInviteToken(projectId, ownerToken);
        mockMvc.perform(post("/api/projects/join/" + inviteToken).header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk());

        // Un miembro (no propietario) no puede eliminar el proyecto
        expectApiError(403, "No tienes acceso a este proyecto",
                delete("/api/projects/" + projectId).header("Authorization", bearer(memberToken)));
    }

    @Test
    void memberCanUpdateProject() throws Exception {
        String ownerToken = register("upd.owner@test.com", "secret123", "UpdOwner");
        long projectId = createProject(ownerToken, "Proyecto Colaborativo");

        String memberToken = register("upd.member@test.com", "secret123", "UpdMember");
        String inviteToken = getInviteToken(projectId, ownerToken);
        mockMvc.perform(post("/api/projects/join/" + inviteToken).header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/projects/" + projectId)
                        .header("Authorization", bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Editado por miembro"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Editado por miembro"));
    }

    @Test
    void generateInviteToken_returnsToken() throws Exception {
        String token = register("invite@test.com", "secret123", "Invite");
        long projectId = createProject(token, "Proyecto Invitable");

        mockMvc.perform(post("/api/projects/" + projectId + "/invite-token").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inviteToken").isNotEmpty());
    }

    @Test
    void joinProject_grantsEditorRoleAndAddsCollaborator() throws Exception {
        String ownerToken = register("join.owner@test.com", "secret123", "JoinOwner");
        long projectId = createProject(ownerToken, "Proyecto Compartido");
        String inviteToken = getInviteToken(projectId, ownerToken);

        String memberToken = register("join.member@test.com", "secret123", "JoinMember");

        mockMvc.perform(post("/api/projects/join/" + inviteToken).header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Proyecto Compartido"))
                .andExpect(jsonPath("$.currentUserRole").value("EDITOR"));

        // El propietario ahora ve al miembro como colaborador
        mockMvc.perform(get("/api/projects/" + projectId).header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.collaborators[0].email").value("join.member@test.com"))
                .andExpect(jsonPath("$.collaborators[0].role").value("EDITOR"));

        // El miembro ve el proyecto en su lista
        MvcResult result = mockMvc.perform(get("/api/projects").header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode projects = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(projects).anyMatch(node -> "Proyecto Compartido".equals(node.get("name").asText()));
    }

    @Test
    void joinProject_invalidToken_throwsServerError() throws Exception {
        String token = register("badjoin@test.com", "secret123", "BadJoin");

        expectApiError(404, "Token de invitación inválido",
                post("/api/projects/join/invalid-token-xyz").header("Authorization", bearer(token)));
    }

    private String getInviteToken(long projectId, String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/projects/" + projectId + "/invite-token")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("inviteToken").asText();
    }
}
