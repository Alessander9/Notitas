package com.notitas.api.payload;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class UpdateProfileRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String name;

    public UpdateProfileRequest() {}

    public UpdateProfileRequest(String email, String name) {
        this.email = email;
        this.name = name;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
