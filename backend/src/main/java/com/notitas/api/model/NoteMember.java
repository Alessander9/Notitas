package com.notitas.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "note_members")
public class NoteMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id", nullable = false)
    private Note note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "role", nullable = false)
    private String role = "EDITOR"; // "EDITOR" or "VIEWER"

    public NoteMember() {}

    public NoteMember(Note note, User user) {
        this.note = note;
        this.user = user;
    }

    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
        if (role == null) {
            role = "EDITOR";
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Note getNote() { return note; }
    public void setNote(Note note) { this.note = note; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
