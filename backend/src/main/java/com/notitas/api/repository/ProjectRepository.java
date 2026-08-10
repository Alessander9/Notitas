package com.notitas.api.repository;

import com.notitas.api.model.Project;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    /**
     * Igual que {@link #findByInviteToken} pero con bloqueo pesimista de
     * escritura: serializa los joins concurrentes con el mismo token (dos
     * peticiones a la vez pasaban el check "no es miembro" e insertaban el
     * miembro duplicado). El segundo join espera a que el primero confirme y
     * entonces ve el miembro existente → no inserta ni duplica.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Project p WHERE p.inviteToken = :token")
    Optional<Project> findByInviteTokenForUpdate(@Param("token") String token);

    @Query("SELECT DISTINCT p FROM Project p JOIN Note n ON n.project = p " +
           "WHERE n.deleted = false AND EXISTS (SELECT nm FROM NoteMember nm WHERE nm.note = n AND nm.user.id = :userId)")
    List<Project> findProjectsByNoteCollaboratorUserId(@Param("userId") Long userId);
}
