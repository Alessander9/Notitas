package com.notitas.api.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Entity
@Table(name = "projects")
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    private String name;

    private String icon;

    private String color;

    private String description;

    @Column(name = "cover_image")
    private String coverImage;

    @Column(name = "invite_token", unique = true)
    private String inviteToken;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Project() {}

    public Project(Long id, User user, String name, String icon, String color, String description, String coverImage, String inviteToken, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.user = user;
        this.name = name;
        this.icon = icon;
        this.color = color;
        this.description = description;
        this.coverImage = coverImage;
        this.inviteToken = inviteToken;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static ProjectBuilder builder() {
        return new ProjectBuilder();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    public String getInviteToken() { return inviteToken; }
    public void setInviteToken(String inviteToken) { this.inviteToken = inviteToken; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Builder
    public static class ProjectBuilder {
        private Long id;
        private User user;
        private String name;
        private String icon;
        private String color;
        private String description;
        private String coverImage;
        private String inviteToken;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public ProjectBuilder id(Long id) { this.id = id; return this; }
        public ProjectBuilder user(User user) { this.user = user; return this; }
        public ProjectBuilder name(String name) { this.name = name; return this; }
        public ProjectBuilder icon(String icon) { this.icon = icon; return this; }
        public ProjectBuilder color(String color) { this.color = color; return this; }
        public ProjectBuilder description(String description) { this.description = description; return this; }
        public ProjectBuilder coverImage(String coverImage) { this.coverImage = coverImage; return this; }
        public ProjectBuilder inviteToken(String inviteToken) { this.inviteToken = inviteToken; return this; }
        public ProjectBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public ProjectBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public Project build() {
            return new Project(id, user, name, icon, color, description, coverImage, inviteToken, createdAt, updatedAt);
        }
    }
}
