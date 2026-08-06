package com.notitas.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "notes")
public class Note {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    private String title;

    // LONGVARCHAR es portátil entre bases: CLOB en H2 (dev) y text en
    // PostgreSQL/Supabase (prod). El columnDefinition="CLOB" anterior rompía
    // el DDL en Postgres.
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String content;

    @Column(name = "cover_image")
    private String coverImage;

    private boolean favorite;

    private boolean archived;

    private boolean deleted;

    @Column(name = "share_token", unique = true)
    private String shareToken;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** User id of the last editor (null if never edited). */
    @Column(name = "updated_by")
    private Long updatedBy;

    @OneToMany(mappedBy = "note", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Tag> tags = new ArrayList<>();

    @OneToMany(mappedBy = "note", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Attachment> attachments = new ArrayList<>();

    public Note() {}

    public Note(Long id, Project project, String title, String content, String coverImage, boolean favorite, boolean archived, boolean deleted, String shareToken, LocalDateTime createdAt, LocalDateTime updatedAt, Long updatedBy, List<Tag> tags, List<Attachment> attachments) {
        this.id = id;
        this.project = project;
        this.title = title;
        this.content = content;
        this.coverImage = coverImage;
        this.favorite = favorite;
        this.archived = archived;
        this.deleted = deleted;
        this.shareToken = shareToken;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.updatedBy = updatedBy;
        if (tags != null) this.tags = tags;
        if (attachments != null) this.attachments = attachments;
    }

    public static NoteBuilder builder() {
        return new NoteBuilder();
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
    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    public boolean isFavorite() { return favorite; }
    public void setFavorite(boolean favorite) { this.favorite = favorite; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
    public String getShareToken() { return shareToken; }
    public void setShareToken(String shareToken) { this.shareToken = shareToken; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
    public List<Tag> getTags() { return tags; }
    public void setTags(List<Tag> tags) { this.tags = tags; }
    public List<Attachment> getAttachments() { return attachments; }
    public void setAttachments(List<Attachment> attachments) { this.attachments = attachments; }

    // Builder
    public static class NoteBuilder {
        private Long id;
        private Project project;
        private String title;
        private String content;
        private String coverImage;
        private boolean favorite;
        private boolean archived;
        private boolean deleted;
        private String shareToken;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private Long updatedBy;
        private List<Tag> tags = new ArrayList<>();
        private List<Attachment> attachments = new ArrayList<>();

        public NoteBuilder id(Long id) { this.id = id; return this; }
        public NoteBuilder project(Project project) { this.project = project; return this; }
        public NoteBuilder title(String title) { this.title = title; return this; }
        public NoteBuilder content(String content) { this.content = content; return this; }
        public NoteBuilder coverImage(String coverImage) { this.coverImage = coverImage; return this; }
        public NoteBuilder favorite(boolean favorite) { this.favorite = favorite; return this; }
        public NoteBuilder archived(boolean archived) { this.archived = archived; return this; }
        public NoteBuilder deleted(boolean deleted) { this.deleted = deleted; return this; }
        public NoteBuilder shareToken(String shareToken) { this.shareToken = shareToken; return this; }
        public NoteBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public NoteBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public NoteBuilder updatedBy(Long updatedBy) { this.updatedBy = updatedBy; return this; }
        public NoteBuilder tags(List<Tag> tags) { if (tags != null) this.tags = tags; return this; }
        public NoteBuilder attachments(List<Attachment> attachments) { if (attachments != null) this.attachments = attachments; return this; }

        public Note build() {
            return new Note(id, project, title, content, coverImage, favorite, archived, deleted, shareToken, createdAt, updatedAt, updatedBy, tags, attachments);
        }
    }
}
