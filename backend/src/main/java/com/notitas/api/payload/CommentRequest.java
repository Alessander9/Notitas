package com.notitas.api.payload;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CommentRequest {

    @NotBlank(message = "El comentario no puede estar vacío")
    @Size(max = 5000, message = "El comentario no puede superar los 5000 caracteres")
    private String content;

    public CommentRequest() {}

    public CommentRequest(String content) {
        this.content = content;
    }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
