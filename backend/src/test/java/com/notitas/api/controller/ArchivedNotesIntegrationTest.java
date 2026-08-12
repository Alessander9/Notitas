package com.notitas.api.controller;

import com.notitas.api.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Flujo de archivado de notas: la nota archivada desaparece de la lista del
 * proyecto, aparece en GET /api/notes/archived y se puede restaurar.
 */
class ArchivedNotesIntegrationTest extends BaseIntegrationTest {

    @Test
    void archiveNote_hidesItFromProjectAndShowsInArchivedView() throws Exception {
        String token = register("owner@test.com", "password123", "Owner");
        long projectId = createProject(token, "Proyecto");
        long noteId = createNote(token, projectId, "Nota para archivar");

        // La nota está en la lista del proyecto
        mockMvc.perform(get("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(noteId));

        // Archivar
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("archived", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.archived").value(true));

        // Ya no aparece en la lista activa del proyecto
        mockMvc.perform(get("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        // Sí aparece en la vista de archivadas
        mockMvc.perform(get("/api/notes/archived")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(noteId))
                .andExpect(jsonPath("$.content[0].archived").value(true));

        // Restaurar (desarchivar)
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("archived", false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.archived").value(false));

        mockMvc.perform(get("/api/notes/archived")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));
    }

    @Test
    void archivedNote_doesNotAppearInFavoritesOrSearch() throws Exception {
        String token = register("fav@test.com", "password123", "Fav");
        long projectId = createProject(token, "Proyecto Fav");
        long noteId = createNote(token, projectId, "Nota favorita y archivada");

        // Favorita + archivada
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("favorite", true, "archived", true))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/notes/favorites")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        mockMvc.perform(get("/api/notes/search")
                        .param("query", "favorita")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        // Y al desarchivar vuelve a búsqueda y favoritos
        mockMvc.perform(put("/api/notes/" + noteId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("archived", false))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/notes/favorites")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(noteId));
    }

    @Test
    void archivedView_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/notes/archived"))
                .andExpect(status().isUnauthorized());
    }
}
