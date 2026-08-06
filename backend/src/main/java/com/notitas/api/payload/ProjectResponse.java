package com.notitas.api.payload;

import java.time.LocalDateTime;
import java.util.List;

public class ProjectResponse {
    private Long id;
    private String name;
    private String icon;
    private String color;
    private String description;
    private String coverImage;
    private String currentUserRole; // "OWNER", "EDITOR", "VIEWER"
    private UserResponse creator;
    private List<UserResponse> collaborators;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ProjectResponse() {}

    public ProjectResponse(Long id, String name, String icon, String color, String description, String coverImage, String currentUserRole, UserResponse creator, List<UserResponse> collaborators, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.color = color;
        this.description = description;
        this.coverImage = coverImage;
        this.currentUserRole = currentUserRole;
        this.creator = creator;
        this.collaborators = collaborators;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static ProjectResponseBuilder builder() {
        return new ProjectResponseBuilder();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
    public String getCurrentUserRole() { return currentUserRole; }
    public void setCurrentUserRole(String currentUserRole) { this.currentUserRole = currentUserRole; }
    public UserResponse getCreator() { return creator; }
    public void setCreator(UserResponse creator) { this.creator = creator; }
    public List<UserResponse> getCollaborators() { return collaborators; }
    public void setCollaborators(List<UserResponse> collaborators) { this.collaborators = collaborators; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static class ProjectResponseBuilder {
        private Long id;
        private String name;
        private String icon;
        private String color;
        private String description;
        private String coverImage;
        private String currentUserRole;
        private UserResponse creator;
        private List<UserResponse> collaborators;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public ProjectResponseBuilder id(Long id) { this.id = id; return this; }
        public ProjectResponseBuilder name(String name) { this.name = name; return this; }
        public ProjectResponseBuilder icon(String icon) { this.icon = icon; return this; }
        public ProjectResponseBuilder color(String color) { this.color = color; return this; }
        public ProjectResponseBuilder description(String description) { this.description = description; return this; }
        public ProjectResponseBuilder coverImage(String coverImage) { this.coverImage = coverImage; return this; }
        public ProjectResponseBuilder currentUserRole(String currentUserRole) { this.currentUserRole = currentUserRole; return this; }
        public ProjectResponseBuilder creator(UserResponse creator) { this.creator = creator; return this; }
        public ProjectResponseBuilder collaborators(List<UserResponse> collaborators) { this.collaborators = collaborators; return this; }
        public ProjectResponseBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public ProjectResponseBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public ProjectResponse build() {
            return new ProjectResponse(id, name, icon, color, description, coverImage, currentUserRole, creator, collaborators, createdAt, updatedAt);
        }
    }

    public static class UserResponse {
        private Long id;
        private String name;
        private String email;
        private String avatar;
        private String role; // Role within project (e.g. "EDITOR", "VIEWER")

        public UserResponse() {}

        public UserResponse(Long id, String name, String email, String avatar, String role) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.avatar = avatar;
            this.role = role;
        }

        public static UserResponseBuilder builder() {
            return new UserResponseBuilder();
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public static class UserResponseBuilder {
            private Long id;
            private String name;
            private String email;
            private String avatar;
            private String role;

            public UserResponseBuilder id(Long id) { this.id = id; return this; }
            public UserResponseBuilder name(String name) { this.name = name; return this; }
            public UserResponseBuilder email(String email) { this.email = email; return this; }
            public UserResponseBuilder avatar(String avatar) { this.avatar = avatar; return this; }
            public UserResponseBuilder role(String role) { this.role = role; return this; }

            public UserResponse build() {
                return new UserResponse(id, name, email, avatar, role);
            }
        }
    }
}
