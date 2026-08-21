package com.notitas.api.repository;

import com.notitas.api.model.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    Page<Note> findByProjectIdAndDeletedFalseAndArchivedFalseOrderByUpdatedAtDesc(Long projectId, Pageable pageable);
    List<Note> findByProjectId(Long projectId);
    Page<Note> findByProjectUserIdAndDeletedTrue(Long userId, Pageable pageable);
    List<Note> findByProjectUserIdAndDeletedTrue(Long userId);

    /**
     * Notas favoritas (no eliminadas) del usuario: tanto las de sus propios
     * proyectos como las de los proyectos donde es miembro. El EXISTS evita
     * duplicados y hace el filtrado en la base de datos (una sola consulta).
     */
    /**
     * Notas favoritas (no eliminadas, no archivadas) del usuario: tanto las de
     * sus propios proyectos como las de los proyectos donde es miembro. El
     * EXISTS evita duplicados y hace el filtrado en la base de datos.
     */
    @Query("SELECT n FROM Note n WHERE n.favorite = true AND n.deleted = false AND n.archived = false " +
           "AND (n.project.user.id = :userId OR " +
           "EXISTS (SELECT pm FROM ProjectMember pm WHERE pm.project = n.project AND pm.user.id = :userId)) " +
           "ORDER BY n.updatedAt DESC")
    Page<Note> findFavoriteNotesForUser(@Param("userId") Long userId, Pageable pageable);

    /**
     * Notas archivadas (no eliminadas) del usuario: propias o de proyectos
     * donde es miembro. Las archivadas no aparecen en las listas activas.
     */
    @Query("SELECT n FROM Note n WHERE n.archived = true AND n.deleted = false " +
           "AND (n.project.user.id = :userId OR " +
           "EXISTS (SELECT pm FROM ProjectMember pm WHERE pm.project = n.project AND pm.user.id = :userId)) " +
           "ORDER BY n.updatedAt DESC")
    Page<Note> findArchivedNotesForUser(@Param("userId") Long userId, Pageable pageable);
    Optional<Note> findByIdAndProjectUserId(Long id, Long userId);
    Optional<Note> findByShareToken(String shareToken);

    @Query("SELECT n FROM Note n WHERE n.deleted = false AND n.archived = false AND " +
           "(n.project.user.id = :userId OR " +
           "EXISTS (SELECT pm FROM ProjectMember pm WHERE pm.project = n.project AND pm.user.id = :userId)) " +
           "AND (LOWER(n.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(n.content) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY n.updatedAt DESC")
    Page<Note> findSearchableNotesForUser(@Param("userId") Long userId, @Param("query") String query, Pageable pageable);

    @Query("SELECT n FROM Note n WHERE n.project.id = :projectId AND n.deleted = false AND n.archived = false AND " +
           "EXISTS (SELECT nm FROM NoteMember nm WHERE nm.note = n AND nm.user.id = :userId) " +
           "ORDER BY n.updatedAt DESC")
    Page<Note> findSharedNotesByProjectAndUser(@Param("projectId") Long projectId, @Param("userId") Long userId, Pageable pageable);

    @Query("SELECT n FROM Note n WHERE n.deleted = false AND n.archived = false AND " +
           "(n.project.user.id = :userId OR " +
           "EXISTS (SELECT pm FROM ProjectMember pm WHERE pm.project = n.project AND pm.user.id = :userId)) " +
           "ORDER BY n.updatedAt DESC")
    Page<Note> findAllActiveNotesForUser(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT COUNT(n) > 0 FROM Note n WHERE n.project.id = :projectId AND n.deleted = false AND " +
           "EXISTS (SELECT nm FROM NoteMember nm WHERE nm.note = n AND nm.user.id = :userId)")
    boolean existsSharedNotesByProjectAndUser(@Param("projectId") Long projectId, @Param("userId") Long userId);
}
