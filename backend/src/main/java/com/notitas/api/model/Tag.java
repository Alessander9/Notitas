package com.notitas.api.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "note_tags")
public class Tag {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id", nullable = false)
    @JsonIgnore
    private Note note;

    private String tag;

    public Tag() {}

    public Tag(Long id, Note note, String tag) {
        this.id = id;
        this.note = note;
        this.tag = tag;
    }

    public static TagBuilder builder() {
        return new TagBuilder();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Note getNote() { return note; }
    public void setNote(Note note) { this.note = note; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }

    // Builder
    public static class TagBuilder {
        private Long id;
        private Note note;
        private String tag;

        public TagBuilder id(Long id) { this.id = id; return this; }
        public TagBuilder note(Note note) { this.note = note; return this; }
        public TagBuilder tag(String tag) { this.tag = tag; return this; }

        public Tag build() {
            return new Tag(id, note, tag);
        }
    }
}
