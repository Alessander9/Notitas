package com.notitas.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

/**
 * Instantánea (versión) del título y contenido de una nota. Se crea cada vez
 * que el título o el contenido cambian realmente, con deduplicación contra la
 * última versión y un límite de versiones por nota (las más antiguas se
 * descartan). Permite ver el historial y restaurar cualquier versión.
 */
@Entity
@Table(name = "note_versions")
public class NoteVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id", nullable = false)
    private Note note;

    private String title;

    // Mismo mapeo portátil que Note.content: CLOB en H2 (dev), text en
    // PostgreSQL/Supabase (prod).
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Id del usuario que guardó esta versión. */
    @Column(name = "updated_by")
    private Long updatedBy;

    public NoteVersion() {}

    public NoteVersion(Long id, Note note, String title, String content, LocalDateTime createdAt, Long updatedBy) {
        this.id = id;
        this.note = note;
        this.title = title;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedBy = updatedBy;
    }

    public static NoteVersionBuilder builder() {
        return new NoteVersionBuilder();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Note getNote() { return note; }
    public void setNote(Note note) { this.note = note; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }

    public static class NoteVersionBuilder {
        private Long id;
        private Note note;
        private String title;
        private String content;
        private LocalDateTime createdAt;
        private Long updatedBy;

        public NoteVersionBuilder id(Long id) { this.id = id; return this; }
        public NoteVersionBuilder note(Note note) { this.note = note; return this; }
        public NoteVersionBuilder title(String title) { this.title = title; return this; }
        public NoteVersionBuilder content(String content) { this.content = content; return this; }
        public NoteVersionBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public NoteVersionBuilder updatedBy(Long updatedBy) { this.updatedBy = updatedBy; return this; }

        public NoteVersion build() {
            return new NoteVersion(id, note, title, content, createdAt, updatedBy);
        }
    }
}
