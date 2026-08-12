package com.notitas.api.repository;

import com.notitas.api.model.Note;
import com.notitas.api.model.NoteMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoteMemberRepository extends JpaRepository<NoteMember, Long> {
    boolean existsByNoteIdAndUserId(Long noteId, Long userId);
    Optional<NoteMember> findByNoteIdAndUserId(Long noteId, Long userId);
    List<NoteMember> findByNote(Note note);
    // Lista de colaboradores en orden de incorporación (estable para la UI)
    List<NoteMember> findByNoteOrderByJoinedAtAsc(Note note);
    void deleteByNoteId(Long noteId);
    // Revoca los accesos por-nota de un usuario dentro de un proyecto (expulsión)
    void deleteByUser_IdAndNote_Project_Id(Long userId, Long projectId);
}
