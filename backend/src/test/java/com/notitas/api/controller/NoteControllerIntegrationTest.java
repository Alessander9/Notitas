package com.notitas.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.notitas.api.BaseIntegrationTest;
import com.notitas.api.service.FileStorageService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de integración del NoteController: CRUD, favoritos, papelera,
 * búsqueda, compartir y subida de archivos.
 *
 * Se usa {@code @TestInstance(PER_CLASS)} para poder limpiar en {@code @AfterAll}
 * los archivos que los tests de subida dejan escritos en el disco.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class NoteControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private FileStorageService fileStorageService;

    private final List<String> createdFiles = new ArrayList<>();

    @AfterAll
    void cleanUpUploadedFiles() {
        createdFiles.forEach(fileStorageService::deleteFile);
    }

    @Test
    void createNote_returnsNoteWithDefaultsAndTags() throws Exception {
        String token = register("note.creator@test.com", "secret123", "NoteCreator");
        long projectId = createProject(token, "Proyecto Notas");

        mockMvc.perform(post("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Mi primera nota","content":"<p>Hola</p>","tags":["java","spring"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.projectId").value(projectId))
                .andExpect(jsonPath("$.title").value("Mi primera nota"))
                .andExpect(jsonPath("$.favorite").value(false))
                .andExpect(jsonPath("$.deleted").value(false))
                .andExpect(jsonPath("$.tags", hasItems("java", "spring")));
    }

    @Test
    void createNote_withoutAuth_returnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/projects/1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Sin auth"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getNotesByProject_returnsNotes() throws Exception {
        String token = register("list.notes@test.com", "secret123", "ListNotes");
        long projectId = createProject(token, "Proyecto Notas");
        createNote(token, projectId, "Nota 1");
        createNote(token, projectId, "Nota 2");

        MvcResult result = mockMvc.perform(get("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode notes = objectMapper.readTree(result.getResponse().getContentAsString()).get("content");
        assertThat(notes).hasSize(2);
        assertThat(notes).anyMatch(node -> "Nota 1".equals(node.get("title").asText()));
        assertThat(notes).anyMatch(node -> "Nota 2".equals(node.get("title").asText()));
    }

    @Test
    void getNoteById_returnsNote() throws Exception {
        String token = register("get.note@test.com", "secret123", "GetNote");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Nota buscada");

        mockMvc.perform(get("/api/notes/" + noteId).header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Nota buscada"))
                .andExpect(jsonPath("$.projectId").value(projectId));
    }

    @Test
    void updateNote_updatesTitleAndFavorite() throws Exception {
        String token = register("update.note@test.com", "secret123", "UpdateNote");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Título original");

        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Título actualizado","favorite":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Título actualizado"))
                .andExpect(jsonPath("$.favorite").value(true))
                .andExpect(jsonPath("$.updatedBy").isNumber());
    }

    @Test
    void createNote_hasNoUpdatedBy() throws Exception {
        String token = register("new.note@test.com", "secret123", "NewNote");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Nota recién creada");

        // Una nota recién creada no tiene editor (updatedBy null)
        mockMvc.perform(get("/api/notes/" + noteId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedBy").value(nullValue()));
    }

    @Test
    void getFavoriteNotes_returnsOnlyFavoriteNotes() throws Exception {
        String token = register("fav@test.com", "secret123", "Fav");
        long projectId = createProject(token, "Proyecto Notas");
        long favNoteId = createNote(token, projectId, "Nota favorita");
        createNote(token, projectId, "Nota normal");

        // Marcar una nota como favorita
        mockMvc.perform(put("/api/notes/" + favNoteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"favorite":true}
                                """))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(get("/api/notes/favorites").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode favorites = objectMapper.readTree(result.getResponse().getContentAsString()).get("content");
        assertThat(favorites).hasSize(1);
        assertThat(favorites).allMatch(node -> node.get("favorite").asBoolean());
        assertThat(favorites).anyMatch(node -> "Nota favorita".equals(node.get("title").asText()));
    }

    @Test
    void collaborator_favoritesNoteOfSharedProject_appearsInTheirFavorites() throws Exception {
        // Propietario: crea el proyecto con dos notas (ninguna favorita aún)
        String ownerToken = register("fav.owner@test.com", "secret123", "FavOwner");
        long projectId = createProject(ownerToken, "Proyecto Compartido");
        long noteId = createNote(ownerToken, projectId, "Nota del equipo");
        createNote(ownerToken, projectId, "Otra nota sin favorito");

        // Colaborador: se une al proyecto mediante el token de invitación
        String memberToken = register("fav.member@test.com", "secret123", "FavMember");
        MvcResult inviteResult = mockMvc.perform(post("/api/projects/" + projectId + "/invite-token")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andReturn();
        String inviteToken = objectMapper.readTree(inviteResult.getResponse().getContentAsString()).get("inviteToken").asText();
        mockMvc.perform(post("/api/projects/join/" + inviteToken).header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentUserRole").value("EDITOR"));

        // El colaborador favoritiza una nota creada por el propietario
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"favorite":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorite").value(true))
                .andExpect(jsonPath("$.updatedBy").isNumber());

        // La nota aparece en los favoritos del colaborador
        MvcResult favoritesResult = mockMvc.perform(get("/api/notes/favorites")
                        .header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode favorites = objectMapper.readTree(favoritesResult.getResponse().getContentAsString()).get("content");
        assertThat(favorites).hasSize(1);
        assertThat(favorites).allMatch(node -> node.get("favorite").asBoolean());
        assertThat(favorites).anyMatch(node -> "Nota del equipo".equals(node.get("title").asText()));

        // El colaborador sigue viendo la nota en el listado del proyecto
        MvcResult projectNotes = mockMvc.perform(get("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(projectNotes.getResponse().getContentAsString()).get("content")).hasSize(2);
    }

    @Test
    void collaborator_cannotFavoriteNoteOfProjectTheyDontBelongTo() throws Exception {
        String ownerToken = register("fav.private@test.com", "secret123", "FavPrivateOwner");
        long projectId = createProject(ownerToken, "Proyecto Privado");
        long noteId = createNote(ownerToken, projectId, "Nota inaccesible");

        // Un usuario ajeno al proyecto intenta favoritizarla
        String outsiderToken = register("fav.outsider@test.com", "secret123", "FavOutsider");
        expectApiError(403, "No tienes acceso a esta nota",
                put("/api/notes/" + noteId)
                        .header("Authorization", bearer(outsiderToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"favorite":true}
                                """));
    }

    @Test
    void searchNotes_findsByTitle() throws Exception {
        String token = register("search@test.com", "secret123", "Search");
        long projectId = createProject(token, "Proyecto Notas");
        createNote(token, projectId, "Guía de Spring Boot");
        createNote(token, projectId, "Recetas de cocina");

        MvcResult result = mockMvc.perform(get("/api/notes/search")
                        .header("Authorization", bearer(token))
                        .param("query", "spring"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode results = objectMapper.readTree(result.getResponse().getContentAsString()).get("content");
        assertThat(results).hasSize(1);
        assertThat(results.get(0).get("title").asText()).isEqualTo("Guía de Spring Boot");
    }

    @Test
    void searchNotes_blankQuery_returnsEmptyList() throws Exception {
        String token = register("search.blank@test.com", "secret123", "SearchBlank");
        createProject(token, "Proyecto Notas");

        MvcResult result = mockMvc.perform(get("/api/notes/search")
                        .header("Authorization", bearer(token))
                        .param("query", ""))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode results = objectMapper.readTree(result.getResponse().getContentAsString()).get("content");
        assertThat(results).isEmpty();
    }

    @Test
    void softDelete_movesNoteToTrashAndCanBeRestored() throws Exception {
        String token = register("trash@test.com", "secret123", "Trash");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Nota a la papelera");

        mockMvc.perform(delete("/api/notes/" + noteId).header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        // No aparece en la lista del proyecto
        MvcResult projectResult = mockMvc.perform(get("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(projectResult.getResponse().getContentAsString()).get("content")).isEmpty();

        // Sí aparece en la papelera
        MvcResult trashResult = mockMvc.perform(get("/api/notes/deleted").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(trashResult.getResponse().getContentAsString()).get("content"))
                .anyMatch(node -> "Nota a la papelera".equals(node.get("title").asText()));

        // Restaurar la nota
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"deleted":false}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(false));

        MvcResult restoredResult = mockMvc.perform(get("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(restoredResult.getResponse().getContentAsString()).get("content"))
                .anyMatch(node -> "Nota a la papelera".equals(node.get("title").asText()));
    }

    @Test
    void hardDelete_removesNotePermanently() throws Exception {
        String token = register("hard.delete@test.com", "secret123", "HardDelete");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Nota para borrar del todo");

        mockMvc.perform(delete("/api/notes/" + noteId).header("Authorization", bearer(token)))
                .andExpect(status().isOk());
        // Segundo borrado = borrado definitivo
        mockMvc.perform(delete("/api/notes/" + noteId).header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        MvcResult trashResult = mockMvc.perform(get("/api/notes/deleted").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(trashResult.getResponse().getContentAsString()).get("content")).isEmpty();

        expectApiError(404, "Nota no encontrada",
                get("/api/notes/" + noteId).header("Authorization", bearer(token)));
    }

    @Test
    void shareNote_publicEndpointReturnsSharedNote() throws Exception {
        String token = register("share@test.com", "secret123", "Share");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Nota compartida");

        MvcResult shareResult = mockMvc.perform(post("/api/notes/" + noteId + "/share-token")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        String shareToken = objectMapper.readTree(shareResult.getResponse().getContentAsString()).get("shareToken").asText();
        assertThat(shareToken).isNotBlank();

        // Acceso público sin autenticación
        mockMvc.perform(get("/api/public/notes/shared/" + shareToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Nota compartida"));
    }

    @Test
    void getNote_otherUserNotMember_returnsServerError() throws Exception {
        String ownerToken = register("note.owner@test.com", "secret123", "NoteOwner");
        long projectId = createProject(ownerToken, "Proyecto Notas");
        long noteId = createNote(ownerToken, projectId, "Nota privada");

        String intruderToken = register("note.intruder@test.com", "secret123", "NoteIntruder");
        expectApiError(403, "No tienes acceso a esta nota",
                get("/api/notes/" + noteId).header("Authorization", bearer(intruderToken)));
    }

    @Test
    void uploadCoverImage_thenDeleteCover() throws Exception {
        String token = register("cover@test.com", "secret123", "Cover");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Nota con portada");

        MockMultipartFile file = new MockMultipartFile("file", "portada.png", "image/png", new byte[]{1, 2, 3});
        MvcResult uploadResult = mockMvc.perform(multipart(HttpMethod.POST, "/api/notes/" + noteId + "/cover")
                        .file(file)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coverImage", startsWith("/uploads/")))
                .andReturn();
        trackUploadedFile(objectMapper.readTree(uploadResult.getResponse().getContentAsString()).get("coverImage"));

        mockMvc.perform(delete("/api/notes/" + noteId + "/cover").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coverImage").doesNotExist());
    }

    @Test
    void uploadAttachment_andUpdateTag() throws Exception {
        String token = register("attach@test.com", "secret123", "Attach");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Nota con adjunto");

        MockMultipartFile file = new MockMultipartFile("file", "archivo.txt", "text/plain", "contenido".getBytes());
        MvcResult uploadResult = mockMvc.perform(multipart(HttpMethod.POST, "/api/notes/" + noteId + "/attachment")
                        .file(file)
                        .param("tag", "docs")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attachments[0].name").value("archivo.txt"))
                .andExpect(jsonPath("$.attachments[0].tag").value("docs"))
                .andExpect(jsonPath("$.attachments[0].url", startsWith("/uploads/")))
                .andReturn();

        JsonNode noteJson = objectMapper.readTree(uploadResult.getResponse().getContentAsString());
        trackUploadedFile(noteJson.get("attachments").get(0).get("url"));
        long attachmentId = noteJson.get("attachments").get(0).get("id").asLong();

        mockMvc.perform(put("/api/notes/" + noteId + "/attachments/" + attachmentId + "/tag")
                        .header("Authorization", bearer(token))
                        .param("tag", "actualizado"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attachments[0].tag").value("actualizado"));
    }

    @Test
    void uploadInlineImage_returnsUrl() throws Exception {
        String token = register("inline@test.com", "secret123", "Inline");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Nota con imagen");

        MockMultipartFile file = new MockMultipartFile("file", "imagen.png", "image/png", new byte[]{9, 8, 7});
        MvcResult result = mockMvc.perform(multipart(HttpMethod.POST, "/api/notes/" + noteId + "/images")
                        .file(file)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", startsWith("/uploads/")))
                .andReturn();
        trackUploadedFile(objectMapper.readTree(result.getResponse().getContentAsString()).get("url"));
    }

    @Test
    void noteVersions_snapshotEditsAndRestores() throws Exception {
        String token = register("versions@test.com", "secret123", "Versions");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Título v1");

        // Editar el título → nueva versión
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Título v2"}
                                """))
                .andExpect(status().isOk());

        // Editar el contenido → nueva versión
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"<p>Contenido v2</p>"}
                                """))
                .andExpect(status().isOk());

        // Cambiar solo el favorito → NO crea versión (no toca título/contenido)
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"favorite":true}
                                """))
                .andExpect(status().isOk());

        MvcResult versionsResult = mockMvc.perform(get("/api/notes/" + noteId + "/versions")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode versions = objectMapper.readTree(versionsResult.getResponse().getContentAsString());
        // inicial (create) + título + contenido = 3 (la del favorito no cuenta)
        assertThat(versions).hasSize(3);
        assertThat(versions.get(0).get("title").asText()).isEqualTo("Título v2");

        // Restaurar la versión más antigua (título v1, contenido de prueba)
        long oldestId = versions.get(2).get("id").asLong();
        mockMvc.perform(post("/api/notes/" + noteId + "/versions/" + oldestId + "/restore")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Título v1"))
                .andExpect(jsonPath("$.content").value("<p>Contenido de prueba</p>"));

        // La restauración es reversible: el estado previo ("Título v2") ya era la
        // última versión, por lo que se deduplicó y sigue disponible en el historial.
        MvcResult afterRestore = mockMvc.perform(get("/api/notes/" + noteId + "/versions")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode after = objectMapper.readTree(afterRestore.getResponse().getContentAsString());
        assertThat(after).hasSize(3);
        assertThat(after.get(0).get("title").asText()).isEqualTo("Título v2");
        assertThat(after.get(0).get("content").asText()).isEqualTo("<p>Contenido v2</p>");
    }

    @Test
    void noteVersions_repeatedSameContent_doesNotCreateDuplicate() throws Exception {
        String token = register("versions.dedupe@test.com", "secret123", "VersionsDedupe");
        long projectId = createProject(token, "Proyecto Notas");
        long noteId = createNote(token, projectId, "Sin cambios");

        // Enviar dos veces exactamente el mismo contenido: el segundo guardado
        // (p. ej. un guardado automático repetido) no debe duplicar versiones.
        String body = """
                {"content":"<p>Mismo contenido</p>"}
                """;
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        MvcResult versionsResult = mockMvc.perform(get("/api/notes/" + noteId + "/versions")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(versionsResult.getResponse().getContentAsString())).hasSize(2);
    }

    @Test
    void noteVersions_outsiderCannotListOrRestore() throws Exception {
        String ownerToken = register("versions.owner@test.com", "secret123", "VersionsOwner");
        long projectId = createProject(ownerToken, "Proyecto Notas");
        long noteId = createNote(ownerToken, projectId, "Nota privada");

        String intruderToken = register("versions.intruder@test.com", "secret123", "VersionsIntruder");
        expectApiError(403, "No tienes acceso a esta nota",
                get("/api/notes/" + noteId + "/versions").header("Authorization", bearer(intruderToken)));

        MvcResult versionsResult = mockMvc.perform(get("/api/notes/" + noteId + "/versions")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andReturn();
        long versionId = objectMapper.readTree(versionsResult.getResponse().getContentAsString()).get(0).get("id").asLong();
        expectApiError(403, "No tienes acceso a esta nota",
                post("/api/notes/" + noteId + "/versions/" + versionId + "/restore")
                        .header("Authorization", bearer(intruderToken)));
    }

    @Test
    void searchNotes_inMemberProject() throws Exception {
        String ownerToken = register("member.owner@test.com", "secret123", "MemberOwner");
        long projectId = createProject(ownerToken, "Proyecto Compartido");
        createNote(ownerToken, projectId, "Nota secreta del equipo");

        String memberToken = register("member.user@test.com", "secret123", "MemberUser");
        MvcResult inviteResult = mockMvc.perform(post("/api/projects/" + projectId + "/invite-token")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andReturn();
        String inviteToken = objectMapper.readTree(inviteResult.getResponse().getContentAsString()).get("inviteToken").asText();
        mockMvc.perform(post("/api/projects/join/" + inviteToken).header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(get("/api/notes/search")
                        .header("Authorization", bearer(memberToken))
                        .param("query", "secreta"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode results = objectMapper.readTree(result.getResponse().getContentAsString()).get("content");
        assertThat(results).anyMatch(node -> "Nota secreta del equipo".equals(node.get("title").asText()));
    }

    @Test
    void emptyTrash_deletesAllTrashNotesPermanently() throws Exception {
        String token = register("empty.trash@test.com", "secret123", "EmptyTrash");
        long projectId = createProject(token, "Proyecto Notas");
        long note1 = createNote(token, projectId, "Nota 1");
        long note2 = createNote(token, projectId, "Nota 2");
        createNote(token, projectId, "Nota activa");

        // Dos notas a la papelera (soft delete)
        mockMvc.perform(delete("/api/notes/" + note1).header("Authorization", bearer(token)))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/notes/" + note2).header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        MvcResult before = mockMvc.perform(get("/api/notes/deleted").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(before.getResponse().getContentAsString()).get("content")).hasSize(2);

        // Vaciar papelera: borrado definitivo de todas
        mockMvc.perform(delete("/api/notes/deleted").header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        MvcResult after = mockMvc.perform(get("/api/notes/deleted").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(after.getResponse().getContentAsString()).get("content")).isEmpty();

        // Las notas ya no existen (ni por id)
        expectApiError(404, "Nota no encontrada",
                get("/api/notes/" + note1).header("Authorization", bearer(token)));
        expectApiError(404, "Nota no encontrada",
                get("/api/notes/" + note2).header("Authorization", bearer(token)));
    }

    @Test
    void restoreAllTrash_restoresEveryDeletedNote() throws Exception {
        String token = register("restore.all@test.com", "secret123", "RestoreAll");
        long projectId = createProject(token, "Proyecto Notas");
        createNote(token, projectId, "Nota 1");
        createNote(token, projectId, "Nota 2");

        // Borrar todas
        MvcResult projectBefore = mockMvc.perform(get("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode activeBefore = objectMapper.readTree(projectBefore.getResponse().getContentAsString()).get("content");
        for (JsonNode note : activeBefore) {
            mockMvc.perform(delete("/api/notes/" + note.get("id").asLong()).header("Authorization", bearer(token)))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/notes/deleted/restore-all").header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        // Papelera vacía
        MvcResult trashAfter = mockMvc.perform(get("/api/notes/deleted").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(trashAfter.getResponse().getContentAsString()).get("content")).isEmpty();

        // Las notas vuelven al proyecto
        MvcResult projectAfter = mockMvc.perform(get("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(projectAfter.getResponse().getContentAsString()).get("content")).hasSize(activeBefore.size());
    }

    @Test
    void emptyTrash_doesNotAffectOtherUsersTrash() throws Exception {
        String tokenA = register("trash.a@test.com", "secret123", "TrashA");
        long projectA = createProject(tokenA, "Proyecto A");
        long noteA = createNote(tokenA, projectA, "Nota de A");
        mockMvc.perform(delete("/api/notes/" + noteA).header("Authorization", bearer(tokenA)))
                .andExpect(status().isOk());

        String tokenB = register("trash.b@test.com", "secret123", "TrashB");
        long projectB = createProject(tokenB, "Proyecto B");
        long noteB = createNote(tokenB, projectB, "Nota de B");
        mockMvc.perform(delete("/api/notes/" + noteB).header("Authorization", bearer(tokenB)))
                .andExpect(status().isOk());

        // A vacía su papelera: la de B no se toca
        mockMvc.perform(delete("/api/notes/deleted").header("Authorization", bearer(tokenA)))
                .andExpect(status().isOk());

        MvcResult trashB = mockMvc.perform(get("/api/notes/deleted").header("Authorization", bearer(tokenB)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(trashB.getResponse().getContentAsString()).get("content"))
                .anyMatch(node -> "Nota de B".equals(node.get("title").asText()));
    }

    /** Registra el nombre de archivo subido para borrarlo en @AfterAll. */
    private void trackUploadedFile(JsonNode value) {
        if (value != null && value.isTextual() && value.asText().startsWith("/uploads/")) {
            createdFiles.add(value.asText().substring(value.asText().lastIndexOf('/') + 1));
        }
    }
}
