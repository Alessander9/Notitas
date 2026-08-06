package com.notitas.api.payload;

import java.util.List;

public class NoteRequest {
    private Long projectId;
    private String title;
    private String content;
    private String coverImage;
    private Boolean favorite;
    private Boolean archived;
    private Boolean deleted;
    private List<String> tags;

    public NoteRequest() {}

    public NoteRequest(Long projectId, String title, String content, String coverImage, Boolean favorite, Boolean archived, Boolean deleted, List<String> tags) {
        this.projectId = projectId;
        this.title = title;
        this.content = content;
        this.coverImage = coverImage;
        this.favorite = favorite;
        this.archived = archived;
        this.deleted = deleted;
        this.tags = tags;
    }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    public Boolean getFavorite() { return favorite; }
    public void setFavorite(Boolean favorite) { this.favorite = favorite; }
    public Boolean getArchived() { return archived; }
    public void setArchived(Boolean archived) { this.archived = archived; }
    public Boolean getDeleted() { return deleted; }
    public void setDeleted(Boolean deleted) { this.deleted = deleted; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
