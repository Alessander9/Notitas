package com.notitas.api.payload;

import java.time.LocalDateTime;

public class NoteMemberResponse {
    private Long id;
    private Long noteId;
    private Long userId;
    private String name;
    private String email;
    private String avatar;
    private String role; // "EDITOR" or "VIEWER"
    private LocalDateTime joinedAt;

    public NoteMemberResponse() {}

    public NoteMemberResponse(Long id, Long noteId, Long userId, String name, String email,
                              String avatar, String role, LocalDateTime joinedAt) {
        this.id = id;
        this.noteId = noteId;
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.avatar = avatar;
        this.role = role;
        this.joinedAt = joinedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getNoteId() { return noteId; }
    public void setNoteId(Long noteId) { this.noteId = noteId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
}
