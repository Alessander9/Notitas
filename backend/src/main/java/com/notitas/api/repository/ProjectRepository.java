package com.notitas.api.repository;

import com.notitas.api.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Project> findByIdAndUserId(Long id, Long userId);
    Optional<Project> findByInviteToken(String inviteToken);

    @Query("SELECT DISTINCT p FROM Project p JOIN Note n ON n.project = p " +
           "WHERE n.deleted = false AND EXISTS (SELECT nm FROM NoteMember nm WHERE nm.note = n AND nm.user.id = :userId)")
    List<Project> findProjectsByNoteCollaboratorUserId(@Param("userId") Long userId);
}
