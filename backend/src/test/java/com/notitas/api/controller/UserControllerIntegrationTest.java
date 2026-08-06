package com.notitas.api.controller;

import com.notitas.api.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de integración del UserController: edición de perfil y cambio de contraseña.
 */
class UserControllerIntegrationTest extends BaseIntegrationTest {

    @Test
    void updateProfile_changesNameAndEmail_returnsUpdatedUserAndToken() throws Exception {
        String token = register("profile@test.com", "secret123", "Perfil");

        mockMvc.perform(put("/api/users/profile")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Perfil Editado","email":"profile.new@test.com"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Perfil Editado"))
                .andExpect(jsonPath("$.email").value("profile.new@test.com"))
                .andExpect(jsonPath("$.token").isNotEmpty());

        // El nuevo email sirve para iniciar sesión
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"profile.new@test.com","password":"secret123"}
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void updateProfile_duplicateEmail_returnsBadRequest() throws Exception {
        register("first@test.com", "secret123", "First");
        String token = register("second@test.com", "secret123", "Second");

        mockMvc.perform(put("/api/users/profile")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Second","email":"first@test.com"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Error: Email is already in use!"));
    }

    @Test
    void updateProfile_withoutToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(put("/api/users/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"X","email":"x@test.com"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void changePassword_wrongCurrentPassword_returnsBadRequest() throws Exception {
        String token = register("pwd@test.com", "secret123", "Pwd");

        mockMvc.perform(put("/api/users/profile/password")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"wrong-password","newPassword":"newsecret123"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La contraseña actual es incorrecta"));
    }

    @Test
    void changePassword_valid_returnsSuccessAndNewPasswordWorks() throws Exception {
        String token = register("pwd2@test.com", "secret123", "Pwd2");

        mockMvc.perform(put("/api/users/profile/password")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"secret123","newPassword":"newsecret456"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Contraseña actualizada correctamente"));

        // La contraseña antigua ya no sirve, la nueva sí
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"pwd2@test.com","password":"secret123"}
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"pwd2@test.com","password":"newsecret456"}
                                """))
                .andExpect(status().isOk());
    }
}
