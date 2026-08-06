package com.notitas.api.repository;

import com.notitas.api.model.NoteVersion;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoteVersionRepository extends JpaRepository<NoteVersion, Long> {

    /** Última versión de la nota (por id descendente: el id es monotónico). */
    Optional<NoteVersion> findTopByNoteIdOrderByIdDesc(Long noteId);

    /** Todas las versiones de la nota, de la más reciente a la más antigua. */
    @Query("SELECT v FROM NoteVersion v WHERE v.note.id = :noteId ORDER BY v.createdAt DESC, v.id DESC")
    List<NoteVersion> findByNoteIdOrderByNewestFirst(@Param("noteId") Long noteId);

    /** Versiones más antiguas primero (para podar cuando se supera el límite). */
    @Query("SELECT v FROM NoteVersion v WHERE v.note.id = :noteId ORDER BY v.createdAt ASC, v.id ASC")
    List<NoteVersion> findOldestFirst(@Param("noteId") Long noteId, Pageable pageable);

    long countByNoteId(Long noteId);

    /** Borra todas las versiones de una nota (borrado definitivo de la nota). */
    void deleteByNoteId(Long noteId);
}
