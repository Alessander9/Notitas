package com.notitas.api.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "attachments")
public class Attachment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id", nullable = false)
    @JsonIgnore
    private Note note;

    private String url;

    private String type; // e.g., image/png, application/pdf

    private String name;

    private String tag; // Label or tag for the attachment/image

    public Attachment() {}

    public Attachment(Long id, Note note, String url, String type, String name, String tag) {
        this.id = id;
        this.note = note;
        this.url = url;
        this.type = type;
        this.name = name;
        this.tag = tag;
    }

    public static AttachmentBuilder builder() {
        return new AttachmentBuilder();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Note getNote() { return note; }
    public void setNote(Note note) { this.note = note; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }

    // Builder
    public static class AttachmentBuilder {
        private Long id;
        private Note note;
        private String url;
        private String type;
        private String name;
        private String tag;

        public AttachmentBuilder id(Long id) { this.id = id; return this; }
        public AttachmentBuilder note(Note note) { this.note = note; return this; }
        public AttachmentBuilder url(String url) { this.url = url; return this; }
        public AttachmentBuilder type(String type) { this.type = type; return this; }
        public AttachmentBuilder name(String name) { this.name = name; return this; }
        public AttachmentBuilder tag(String tag) { this.tag = tag; return this; }

        public Attachment build() {
            return new Attachment(id, note, url, type, name, tag);
        }
    }
}
