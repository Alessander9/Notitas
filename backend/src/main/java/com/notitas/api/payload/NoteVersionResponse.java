package com.notitas.api.payload;

import java.time.LocalDateTime;

public class NoteVersionResponse {
    private Long id;
    private Long noteId;
    private String title;
    private String content;
    private LocalDateTime createdAt;
    private Long updatedBy;

    public NoteVersionResponse() {}

    public NoteVersionResponse(Long id, Long noteId, String title, String content, LocalDateTime createdAt, Long updatedBy) {
        this.id = id;
        this.noteId = noteId;
        this.title = title;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedBy = updatedBy;
    }

    public static NoteVersionResponseBuilder builder() {
        return new NoteVersionResponseBuilder();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getNoteId() { return noteId; }
    public void setNoteId(Long noteId) { this.noteId = noteId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }

    public static class NoteVersionResponseBuilder {
        private Long id;
        private Long noteId;
        private String title;
        private String content;
        private LocalDateTime createdAt;
        private Long updatedBy;

        public NoteVersionResponseBuilder id(Long id) { this.id = id; return this; }
        public NoteVersionResponseBuilder noteId(Long noteId) { this.noteId = noteId; return this; }
        public NoteVersionResponseBuilder title(String title) { this.title = title; return this; }
        public NoteVersionResponseBuilder content(String content) { this.content = content; return this; }
        public NoteVersionResponseBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public NoteVersionResponseBuilder updatedBy(Long updatedBy) { this.updatedBy = updatedBy; return this; }

        public NoteVersionResponse build() {
            return new NoteVersionResponse(id, noteId, title, content, createdAt, updatedBy);
        }
    }
}
