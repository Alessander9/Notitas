package com.notitas.api.repository;

import com.notitas.api.model.NoteMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NoteMemberRepository extends JpaRepository<NoteMember, Long> {
    boolean existsByNoteIdAndUserId(Long noteId, Long userId);
    Optional<NoteMember> findByNoteIdAndUserId(Long noteId, Long userId);
    void deleteByNoteId(Long noteId);
}
