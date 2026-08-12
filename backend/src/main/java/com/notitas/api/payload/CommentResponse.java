package com.notitas.api.payload;

import java.time.LocalDateTime;

public class CommentResponse {
    private Long id;
    private Long noteId;
    private Long userId;
    private String authorName;
    private String authorAvatar;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public CommentResponse() {}

    public CommentResponse(Long id, Long noteId, Long userId, String authorName, String authorAvatar,
                           String content, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.noteId = noteId;
        this.userId = userId;
        this.authorName = authorName;
        this.authorAvatar = authorAvatar;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getNoteId() { return noteId; }
    public void setNoteId(Long noteId) { this.noteId = noteId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public String getAuthorAvatar() { return authorAvatar; }
    public void setAuthorAvatar(String authorAvatar) { this.authorAvatar = authorAvatar; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
