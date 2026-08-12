package com.notitas.api.repository;

import com.notitas.api.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    /** Comentarios en orden cronológico (los más antiguos primero). */
    List<Comment> findByNoteIdOrderByCreatedAtAsc(Long noteId);

    /** Borra los comentarios de una nota (borrado físico de la nota). */
    void deleteByNoteId(Long noteId);
}
