package com.notitas.api.payload;

import java.time.LocalDateTime;
import java.util.List;

public class NoteResponse {
    private Long id;
    private Long projectId;
    private String title;
    private String content;
    private String coverImage;
    private boolean favorite;
    private boolean archived;
    private boolean deleted;
    private String shareToken;
    private List<String> tags;
    private List<AttachmentResponse> attachments;
    // Colaboradores por-nota (quienes se unieron por el enlace de invitación)
    private List<NoteMemberResponse> noteMembers;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long updatedBy;

    public NoteResponse() {}

    public NoteResponse(Long id, Long projectId, String title, String content, String coverImage, boolean favorite, boolean archived, boolean deleted, String shareToken, List<String> tags, List<AttachmentResponse> attachments, List<NoteMemberResponse> noteMembers, LocalDateTime createdAt, LocalDateTime updatedAt, Long updatedBy) {
        this.id = id;
        this.projectId = projectId;
        this.title = title;
        this.content = content;
        this.coverImage = coverImage;
        this.favorite = favorite;
        this.archived = archived;
        this.deleted = deleted;
        this.shareToken = shareToken;
        this.tags = tags;
        this.attachments = attachments;
        this.noteMembers = noteMembers;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.updatedBy = updatedBy;
    }

    public static NoteResponseBuilder builder() {
        return new NoteResponseBuilder();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
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
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
    public List<AttachmentResponse> getAttachments() { return attachments; }
    public void setAttachments(List<AttachmentResponse> attachments) { this.attachments = attachments; }
    public List<NoteMemberResponse> getNoteMembers() { return noteMembers; }
    public void setNoteMembers(List<NoteMemberResponse> noteMembers) { this.noteMembers = noteMembers; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }

    public static class NoteResponseBuilder {
        private Long id;
        private Long projectId;
        private String title;
        private String content;
        private String coverImage;
        private boolean favorite;
        private boolean archived;
        private boolean deleted;
        private String shareToken;
        private List<String> tags;
        private List<AttachmentResponse> attachments;
        private List<NoteMemberResponse> noteMembers;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private Long updatedBy;

        public NoteResponseBuilder id(Long id) { this.id = id; return this; }
        public NoteResponseBuilder projectId(Long projectId) { this.projectId = projectId; return this; }
        public NoteResponseBuilder title(String title) { this.title = title; return this; }
        public NoteResponseBuilder content(String content) { this.content = content; return this; }
        public NoteResponseBuilder coverImage(String coverImage) { this.coverImage = coverImage; return this; }
        public NoteResponseBuilder favorite(boolean favorite) { this.favorite = favorite; return this; }
        public NoteResponseBuilder archived(boolean archived) { this.archived = archived; return this; }
        public NoteResponseBuilder deleted(boolean deleted) { this.deleted = deleted; return this; }
        public NoteResponseBuilder shareToken(String shareToken) { this.shareToken = shareToken; return this; }
        public NoteResponseBuilder tags(List<String> tags) { this.tags = tags; return this; }
        public NoteResponseBuilder attachments(List<AttachmentResponse> attachments) { this.attachments = attachments; return this; }
        public NoteResponseBuilder noteMembers(List<NoteMemberResponse> noteMembers) { this.noteMembers = noteMembers; return this; }
        public NoteResponseBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public NoteResponseBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public NoteResponseBuilder updatedBy(Long updatedBy) { this.updatedBy = updatedBy; return this; }

        public NoteResponse build() {
            return new NoteResponse(id, projectId, title, content, coverImage, favorite, archived, deleted, shareToken, tags, attachments, noteMembers, createdAt, updatedAt, updatedBy);
        }
    }

    public static class AttachmentResponse {
        private Long id;
        private String url;
        private String type;
        private String name;
        private String tag;

        public AttachmentResponse() {}

        public AttachmentResponse(Long id, String url, String type, String name, String tag) {
            this.id = id;
            this.url = url;
            this.type = type;
            this.name = name;
            this.tag = tag;
        }

        public static AttachmentResponseBuilder builder() {
            return new AttachmentResponseBuilder();
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getTag() { return tag; }
        public void setTag(String tag) { this.tag = tag; }

        public static class AttachmentResponseBuilder {
            private Long id;
            private String url;
            private String type;
            private String name;
            private String tag;

            public AttachmentResponseBuilder id(Long id) { this.id = id; return this; }
            public AttachmentResponseBuilder url(String url) { this.url = url; return this; }
            public AttachmentResponseBuilder type(String type) { this.type = type; return this; }
            public AttachmentResponseBuilder name(String name) { this.name = name; return this; }
            public AttachmentResponseBuilder tag(String tag) { this.tag = tag; return this; }

            public AttachmentResponse build() {
                return new AttachmentResponse(id, url, type, name, tag);
            }
        }
    }
}
