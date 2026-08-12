package com.notitas.api.service;

import com.notitas.api.exception.AccessDeniedException;
import com.notitas.api.exception.ResourceNotFoundException;
import com.notitas.api.model.*;
import com.notitas.api.payload.CommentResponse;
import com.notitas.api.payload.NoteMemberResponse;
import com.notitas.api.payload.NoteRequest;
import com.notitas.api.payload.NoteResponse;
import com.notitas.api.payload.NoteVersionResponse;
import com.notitas.api.repository.CommentRepository;
import com.notitas.api.repository.NoteRepository;
import com.notitas.api.repository.NoteVersionRepository;
import com.notitas.api.repository.ProjectMemberRepository;
import com.notitas.api.repository.ProjectRepository;
import com.notitas.api.repository.TagRepository;
import com.notitas.api.repository.NoteMemberRepository;
import com.notitas.api.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NoteServiceImpl implements NoteService {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectMemberRepository projectMemberRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private NoteVersionRepository noteVersionRepository;

    @Autowired
    private NoteMemberRepository noteMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CommentRepository commentRepository;

    /** Máximo de versiones guardadas por nota: al superarlo se descartan las más antiguas. */
    private static final int MAX_VERSIONS_PER_NOTE = 50;

    private void checkProjectAccess(Long projectId, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado"));

        boolean isOwner = project.getUser().getId().equals(userId);
        boolean isMember = projectMemberRepository.existsByProjectIdAndUserId(projectId, userId);
        boolean hasNoteAccess = noteRepository.existsSharedNotesByProjectAndUser(projectId, userId);

        if (!isOwner && !isMember && !hasNoteAccess) {
            throw new AccessDeniedException("No tienes acceso a este proyecto");
        }
    }

    private void checkNoteAccess(Note note, Long userId) {
        Project project = note.getProject();
        boolean isOwner = project.getUser().getId().equals(userId);
        boolean isMember = projectMemberRepository.existsByProjectIdAndUserId(project.getId(), userId);
        boolean isNoteMember = noteMemberRepository.existsByNoteIdAndUserId(note.getId(), userId);

        if (!isOwner && !isMember && !isNoteMember) {
            throw new AccessDeniedException("No tienes acceso a esta nota");
        }
    }

    /**
     * Acceso de ESCRITURA a la nota: dueño, miembro del proyecto con rol
     * EDITOR o colaborador por-nota con rol EDITOR. Los VIEWER (de proyecto o
     * de la nota) solo pueden ver, no editar ni restaurar.
     *
     * Precedencia: el rol por-nota sobrescribe al del proyecto (un usuario que
     * es a la vez miembro del proyecto y colaborador por-nota se rige por el
     * rol que el creador le asignó en la nota).
     */
    private void checkNoteEditAccess(Note note, Long userId) {
        checkNoteAccess(note, userId);
        Project project = note.getProject();
        if (project.getUser().getId().equals(userId)) {
            return; // El dueño del proyecto siempre edita
        }

        // Colaborador por-nota: su rol decide (VIEWER no edita)
        NoteMember noteMember = noteMemberRepository.findByNoteIdAndUserId(note.getId(), userId).orElse(null);
        if (noteMember != null) {
            if ("VIEWER".equals(noteMember.getRole())) {
                throw new AccessDeniedException("No tienes permisos de edición en esta nota");
            }
            return; // EDITOR por-nota puede editar
        }

        // Miembro del proyecto: el rol del proyecto decide
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(project.getId(), userId)
                .orElseThrow(() -> new AccessDeniedException("No tienes acceso a esta nota"));
        if ("VIEWER".equals(member.getRole())) {
            throw new AccessDeniedException("No tienes permisos de edición en esta nota");
        }
    }

    private void notifyCollaborators(Project project, Long actionUserId, String title, String message,
                                     String eventType, Long noteId) {
        // Notify owner if the actor is not the owner
        if (!project.getUser().getId().equals(actionUserId)) {
            notificationService.createNotification(project.getUser().getId(), title, message,
                    eventType, project.getId(), noteId);
        }

        // Notify members if they are not the actor
        List<ProjectMember> members = projectMemberRepository.findByProjectId(project.getId());
        for (ProjectMember m : members) {
            if (!m.getUser().getId().equals(actionUserId) && !m.getUser().getId().equals(project.getUser().getId())) {
                notificationService.createNotification(m.getUser().getId(), title, message,
                        eventType, project.getId(), noteId);
            }
        }
    }

    @Override
    public Page<NoteResponse> getNotesByProject(Long projectId, Long userId, Pageable pageable) {
        checkProjectAccess(projectId, userId);
        Project project = projectRepository.findById(projectId).get();
        boolean isOwner = project.getUser().getId().equals(userId);
        boolean isMember = projectMemberRepository.existsByProjectIdAndUserId(projectId, userId);

        if (isOwner || isMember) {
            // Las notas archivadas no aparecen en la lista activa del proyecto.
            return noteRepository.findByProjectIdAndDeletedFalseAndArchivedFalseOrderByUpdatedAtDesc(projectId, pageable)
                    .map(this::mapToResponse);
        } else {
            return noteRepository.findSharedNotesByProjectAndUser(projectId, userId, pageable)
                    .map(this::mapToResponse);
        }
    }

    @Override
    public NoteResponse getNoteByIdAndUser(Long id, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteAccess(note, userId);
        return mapToResponse(note);
    }

    @Override
    public Page<NoteResponse> getFavoriteNotes(Long userId, Pageable pageable) {
        // Notas favoritas de proyectos propios o donde el usuario es miembro,
        // filtradas y ordenadas en una sola consulta JPQL (sin filtrar en Java).
        return noteRepository.findFavoriteNotesForUser(userId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<NoteResponse> getDeletedNotes(Long userId, Pageable pageable) {
        // Only creator has a recycle bin for notes in their projects
        return noteRepository.findByProjectUserIdAndDeletedTrue(userId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<NoteResponse> getArchivedNotes(Long userId, Pageable pageable) {
        // Notas archivadas (propias o de proyectos donde es miembro), no eliminadas.
        return noteRepository.findArchivedNotesForUser(userId, pageable)
                .map(this::mapToResponse);
    }

    // ── Comentarios ────────────────────────────────────────────────────────

    @Override
    public List<CommentResponse> getComments(Long noteId, Long userId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteAccess(note, userId);

        return commentRepository.findByNoteIdOrderByCreatedAtAsc(noteId).stream()
                .map(this::mapCommentToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CommentResponse addComment(Long noteId, String content, Long userId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        // Comentar es una operación de LECTURA+escritura ligera: cualquier
        // miembro del proyecto (también los VIEWER) y los colaboradores por
        // nota pueden comentar, pero no editar la nota en sí.
        checkNoteAccess(note, userId);

        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        Comment saved = commentRepository.save(new Comment(note, author, content));

        // Notifica a los demás colaboradores (owner + miembros del proyecto) y
        // a los colaboradores por-nota.
        String authorName = author.getName();
        String title = "Nuevo comentario";
        String message = authorName + " comentó en la nota \"" + note.getTitle() + "\"";
        notifyCollaborators(note.getProject(), userId, title, message, "NOTE_COMMENTED", note.getId());
        for (NoteMember nm : noteMemberRepository.findByNote(note)) {
            if (!nm.getUser().getId().equals(userId)) {
                notificationService.createNotification(nm.getUser().getId(), title, message,
                        "NOTE_COMMENTED", note.getProject().getId(), note.getId());
            }
        }

        return mapCommentToResponse(saved);
    }

    @Override
    @Transactional
    public CommentResponse updateComment(Long noteId, Long commentId, String content, Long userId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteAccess(note, userId);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comentario no encontrado"));
        if (!comment.getNote().getId().equals(noteId)) {
            throw new ResourceNotFoundException("Comentario no encontrado");
        }
        if (!comment.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Solo el autor puede editar este comentario");
        }

        comment.setContent(content);
        return mapCommentToResponse(commentRepository.save(comment));
    }

    @Override
    @Transactional
    public void deleteComment(Long noteId, Long commentId, Long userId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteAccess(note, userId);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comentario no encontrado"));
        if (!comment.getNote().getId().equals(noteId)) {
            throw new ResourceNotFoundException("Comentario no encontrado");
        }
        if (!comment.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Solo el autor puede borrar este comentario");
        }

        commentRepository.delete(comment);
    }

    private CommentResponse mapCommentToResponse(Comment comment) {
        User author = comment.getUser();
        return new CommentResponse(
                comment.getId(),
                comment.getNote().getId(),
                author.getId(),
                author.getName(),
                author.getAvatar(),
                comment.getContent(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }

    @Override
    public Page<NoteResponse> searchNotes(Long userId, String query, Pageable pageable) {
        if (query == null || query.trim().isEmpty()) {
            return Page.empty();
        }

        // Una sola consulta (proyectos propios + donde es miembro, sin duplicados
        // vía EXISTS) y filtrado en base de datos con SQL case-insensitive.
        return noteRepository.findSearchableNotesForUser(userId, query.trim(), pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional
    public NoteResponse createNote(Long projectId, NoteRequest request, Long userId) {
        checkProjectAccess(projectId, userId);
        Project project = projectRepository.findById(projectId).get();

        Note note = Note.builder()
                .project(project)
                .title(request.getTitle() != null ? request.getTitle() : "Untitled Note")
                .content(request.getContent() != null ? request.getContent() : "")
                .coverImage(request.getCoverImage())
                .favorite(request.getFavorite() != null && request.getFavorite())
                .archived(request.getArchived() != null && request.getArchived())
                .deleted(false)
                .build();

        Note savedNote = noteRepository.save(note);

        if (request.getTags() != null) {
            List<Tag> tags = request.getTags().stream()
                    .map(t -> Tag.builder().note(savedNote).tag(t).build())
                    .collect(Collectors.toList());
            savedNote.getTags().addAll(tags);
            noteRepository.save(savedNote);
        }

        // Versión inicial: permite restaurar el estado original de la nota.
        snapshotVersion(savedNote, userId);

        User creator = userRepository.findById(userId).orElse(null);
        String creatorName = creator != null ? creator.getName() : "Un colaborador";
        notifyCollaborators(
            project,
            userId,
            "Nueva nota creada",
            creatorName + " ha creado la nota '" + savedNote.getTitle() + "' en el proyecto " + project.getName(),
            "NOTE_CREATED", savedNote.getId()
        );

        return mapToResponse(savedNote);
    }

    @Override
    @Transactional
    public NoteResponse updateNote(Long id, NoteRequest request, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        // Editar (título, contenido, mover, tags, favorito, papelera) es una
        // operación de ESCRITURA: los VIEWER (solo lectura) no pueden modificarla
        // (antes solo se comprobaba acceso de lectura, así que un VIEWER podía
        // editar y borrar notas vía API).
        checkNoteEditAccess(note, userId);

        if (request.getProjectId() != null) {
            checkProjectAccess(request.getProjectId(), userId);
            Project newProject = projectRepository.findById(request.getProjectId()).get();
            note.setProject(newProject);
        }

        // Track who last edited the note
        note.setUpdatedBy(userId);

        // Solo los cambios reales de título/contenido generan una versión en el
        // historial (favorito, etiquetas, papelera o mover de proyecto no crean
        // versiones).
        boolean titleChanged = false;
        boolean contentChanged = false;

        if (request.getTitle() != null && !Objects.equals(request.getTitle(), note.getTitle())) {
            note.setTitle(request.getTitle());
            titleChanged = true;
        }
        if (request.getContent() != null && !Objects.equals(request.getContent(), note.getContent())) {
            note.setContent(request.getContent());
            contentChanged = true;
        }
        if (request.getCoverImage() != null) note.setCoverImage(request.getCoverImage());
        if (request.getFavorite() != null) note.setFavorite(request.getFavorite());
        if (request.getArchived() != null) note.setArchived(request.getArchived());
        if (request.getDeleted() != null) note.setDeleted(request.getDeleted());

        if (request.getTags() != null) {
            note.getTags().clear();
            List<Tag> tags = request.getTags().stream()
                    .map(t -> Tag.builder().note(note).tag(t).build())
                    .collect(Collectors.toList());
            note.getTags().addAll(tags);
        }

        Note updated = noteRepository.save(note);

        if (titleChanged || contentChanged) {
            snapshotVersion(updated, userId);
        }

        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public NoteResponse uploadCoverImage(Long id, MultipartFile file, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteEditAccess(note, userId);
        note.setUpdatedBy(userId);

        if (note.getCoverImage() != null) {
            String oldFileName = note.getCoverImage().substring(note.getCoverImage().lastIndexOf('/') + 1);
            fileStorageService.deleteFile(oldFileName);
        }

        String fileName = fileStorageService.storeFile(file);
        note.setCoverImage("/uploads/" + fileName);

        Note updated = noteRepository.save(note);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public NoteResponse deleteCoverImage(Long id, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteEditAccess(note, userId);
        note.setUpdatedBy(userId);

        if (note.getCoverImage() != null) {
            String fileName = note.getCoverImage().substring(note.getCoverImage().lastIndexOf('/') + 1);
            fileStorageService.deleteFile(fileName);
            note.setCoverImage(null);
            noteRepository.save(note);
        }

        return mapToResponse(note);
    }

    @Override
    @Transactional
    public NoteResponse uploadAttachment(Long id, MultipartFile file, String tag, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteEditAccess(note, userId);
        note.setUpdatedBy(userId);

        String fileName = fileStorageService.storeFile(file);
        Attachment attachment = Attachment.builder()
                .note(note)
                .url("/uploads/" + fileName)
                .type(file.getContentType())
                .name(file.getOriginalFilename())
                .tag(tag)
                .build();

        note.getAttachments().add(attachment);
        Note updated = noteRepository.save(note);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public NoteResponse updateAttachmentTag(Long noteId, Long attachmentId, String tag, Long userId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteEditAccess(note, userId);
        note.setUpdatedBy(userId);

        Attachment attachment = note.getAttachments().stream()
                .filter(a -> a.getId().equals(attachmentId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Adjunto no encontrado"));

        attachment.setTag(tag);
        Note updated = noteRepository.save(note);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void deleteNote(Long id, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        // Mover a la papelera o borrar definitivamente también es escritura
        checkNoteEditAccess(note, userId);

        if (note.isDeleted()) {
            hardDeleteNote(note);
        } else {
            note.setDeleted(true);
            note.setUpdatedBy(userId);
            noteRepository.save(note);

            User editor = userRepository.findById(userId).orElse(null);
            String editorName = editor != null ? editor.getName() : "Un colaborador";
            notifyCollaborators(
                note.getProject(),
                userId,
                "Nota eliminada",
                editorName + " ha movido la nota '" + note.getTitle() + "' a la papelera",
                "NOTE_TRASHED", note.getId()
            );
        }
    }

    @Override
    @Transactional
    public void emptyTrash(Long userId) {
        // La papelera solo contiene notas de proyectos PROPIOS, así que el
        // usuario tiene permiso para borrarlas todas definitivamente.
        List<Note> trashNotes = noteRepository.findByProjectUserIdAndDeletedTrue(userId);
        for (Note note : trashNotes) {
            hardDeleteNote(note);
        }
    }

    @Override
    @Transactional
    public void restoreAllTrash(Long userId) {
        List<Note> trashNotes = noteRepository.findByProjectUserIdAndDeletedTrue(userId);
        for (Note note : trashNotes) {
            note.setDeleted(false);
            noteRepository.save(note);
        }
    }

    /**
     * Borrado físico de una nota ya marcada como eliminada: limpia portada,
     * adjuntos e imágenes inline del contenido y elimina su historial de
     * versiones antes de borrar la fila (evita violaciones de FK).
     */
    private void hardDeleteNote(Note note) {
        if (note.getCoverImage() != null) {
            String coverName = note.getCoverImage().substring(note.getCoverImage().lastIndexOf('/') + 1);
            fileStorageService.deleteFile(coverName);
        }
        for (Attachment att : note.getAttachments()) {
            String attName = att.getUrl().substring(att.getUrl().lastIndexOf('/') + 1);
            fileStorageService.deleteFile(attName);
        }
        // Imágenes inline embebidas en el HTML del contenido (antes quedaban
        // huérfanas en disco al borrar la nota definitivamente)
        fileStorageService.deleteContentImages(note.getContent());
        // Historial de versiones y comentarios: se borran explícitamente (no hay
        // cascade de colección en Note para evitar interacciones con el auto-flush).
        noteVersionRepository.deleteByNoteId(note.getId());
        commentRepository.deleteByNoteId(note.getId());
        noteRepository.delete(note);
    }

    @Override
    @Transactional
    public java.util.Map<String, String> uploadInlineImage(Long id, MultipartFile file, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        // Subir una imagen embebe un archivo en el contenido: solo EDITOR/owner
        // (antes el controlador solo comprobaba acceso de lectura, así que un
        // VIEWER podía subir imágenes a una nota de solo lectura).
        checkNoteEditAccess(note, userId);
        String fileName = fileStorageService.storeFile(file);
        return java.util.Map.of("url", "/uploads/" + fileName);
    }

    @Override
    @Transactional
    public String generateNoteShareToken(Long id, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteAccess(note, userId);

        if (note.getShareToken() == null || note.getShareToken().isEmpty()) {
            note.setShareToken(UUID.randomUUID().toString());
            noteRepository.save(note);
        }

        return note.getShareToken();
    }

    @Override
    @Transactional
    public void revokeNoteShareToken(Long id, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteEditAccess(note, userId);

        if (note.getShareToken() != null && !note.getShareToken().isEmpty()) {
            noteMemberRepository.deleteByNoteId(note.getId());
            note.setShareToken(null);
            noteRepository.save(note);
        }
    }

    @Override
    public List<NoteMemberResponse> getNoteMembers(Long noteId, Long userId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteAccess(note, userId);

        return noteMemberRepository.findByNoteOrderByJoinedAtAsc(note).stream()
                .map(nm -> mapNoteMemberToResponse(noteId, nm))
                .collect(Collectors.toList());
    }

    private NoteMemberResponse mapNoteMemberToResponse(Long noteId, NoteMember nm) {
        return new NoteMemberResponse(
                nm.getId(),
                noteId,
                nm.getUser().getId(),
                nm.getUser().getName(),
                nm.getUser().getEmail(),
                nm.getUser().getAvatar(),
                nm.getRole(),
                nm.getJoinedAt());
    }

    @Override
    @Transactional
    public void changeNoteMemberRole(Long noteId, Long memberUserId, String role, Long currentUserId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));

        // Solo el creador de la nota (dueño del proyecto) gestiona los roles
        if (!note.getProject().getUser().getId().equals(currentUserId)) {
            throw new AccessDeniedException("Solo el creador de la nota puede gestionar los colaboradores");
        }

        if (!"EDITOR".equals(role) && !"VIEWER".equals(role)) {
            throw new IllegalArgumentException("Rol inválido: debe ser EDITOR o VIEWER");
        }

        NoteMember member = noteMemberRepository.findByNoteIdAndUserId(noteId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("El usuario no es colaborador de esta nota"));

        // Defensa en profundidad: el owner nunca está en note_members (joinNote
        // no lo inserta), pero si algún día llegara a estarlo, su rol no cambia.
        if (member.getUser().getId().equals(note.getProject().getUser().getId())) {
            throw new IllegalArgumentException("No puedes cambiar el rol del creador de la nota");
        }

        // Si el rol no cambia realmente, no guardar ni notificar
        if (Objects.equals(member.getRole(), role)) {
            return;
        }

        member.setRole(role);
        noteMemberRepository.save(member);

        String roleLabel = "EDITOR".equals(role) ? "editor" : "visor";
        notificationService.createNotification(
                memberUserId,
                "Rol actualizado",
                note.getProject().getUser().getName() + " te ha cambiado el rol a " + roleLabel
                        + " en la nota \"" + note.getTitle() + "\"",
                "NOTE_MEMBER_ROLE_CHANGED", note.getProject().getId(), noteId
        );
    }

    @Override
    @Transactional
    public void removeNoteMember(Long noteId, Long memberUserId, Long currentUserId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));

        // Solo el creador de la nota (dueño del proyecto al que pertenece) puede
        // expulsar colaboradores por-nota. Ni los EDITOR ni los VIEWER ni los
        // propios colaboradores pueden hacerlo.
        if (!note.getProject().getUser().getId().equals(currentUserId)) {
            throw new AccessDeniedException("Solo el creador de la nota puede eliminar colaboradores");
        }

        NoteMember member = noteMemberRepository.findByNoteIdAndUserId(noteId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("El usuario no es colaborador de esta nota"));

        // Defensa en profundidad: el owner nunca debería estar en note_members
        // (joinNote no lo inserta), pero si algún día llegara a estarlo, no se
        // puede expulsar al creador.
        if (member.getUser().getId().equals(note.getProject().getUser().getId())) {
            throw new IllegalArgumentException("No puedes eliminar al creador de la nota");
        }

        noteMemberRepository.delete(member);

        // Rota el shareToken: el expulsado conservaría el enlace de invitación
        // y podría re-unirse con él; al regenerarlo, el enlace antiguo queda
        // inválido y la expulsión es efectiva. (El propietario ve el nuevo
        // enlace al abrir el diálogo de compartir.)
        note.setShareToken(UUID.randomUUID().toString());
        noteRepository.save(note);

        // Avisa al expulsado (no recibe notificaciones de la nota a partir de ahora).
        notificationService.createNotification(
                memberUserId,
                "Eliminado de la nota",
                note.getProject().getUser().getName() + " te ha eliminado de la nota \"" + note.getTitle() + "\"",
                "NOTE_MEMBER_REMOVED", note.getProject().getId(), noteId
        );
    }

    @Override
    public NoteResponse getSharedNoteByToken(String token) {
        Note note = noteRepository.findByShareToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Shared note not found or access expired"));
        return mapToResponse(note);
    }

    @Override
    @Transactional
    public NoteResponse joinNote(String token, Long userId) {
        Note note = noteRepository.findByShareToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Enlace de nota compartido inválido o expirado"));

        Project project = note.getProject();
        boolean isOwner = project.getUser().getId().equals(userId);
        boolean isProjectMember = projectMemberRepository.existsByProjectIdAndUserId(project.getId(), userId);

        if (!isOwner && !isProjectMember) {
            boolean isNoteMember = noteMemberRepository.existsByNoteIdAndUserId(note.getId(), userId);
            if (!isNoteMember) {
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
                NoteMember noteMember = new NoteMember(note, user);
                noteMemberRepository.save(noteMember);
            }
        }

        return mapToResponse(note);
    }

    @Override
    public List<NoteVersionResponse> getNoteVersions(Long noteId, Long userId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteAccess(note, userId);

        return noteVersionRepository.findByNoteIdOrderByNewestFirst(noteId).stream()
                .map(v -> NoteVersionResponse.builder()
                        .id(v.getId())
                        .noteId(noteId)
                        .title(v.getTitle())
                        .content(v.getContent())
                        .createdAt(v.getCreatedAt())
                        .updatedBy(v.getUpdatedBy())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public NoteResponse restoreNoteVersion(Long noteId, Long versionId, Long userId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        // Restaurar sobreescribe el contenido: solo dueño o EDITOR
        checkNoteEditAccess(note, userId);

        NoteVersion version = noteVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Version not found"));
        if (!version.getNote().getId().equals(noteId)) {
            throw new ResourceNotFoundException("Version not found");
        }

        // Antes de restaurar se guarda el estado actual como nueva versión, así
        // la restauración también es reversible.
        snapshotVersion(note, userId);

        note.setTitle(version.getTitle());
        note.setContent(version.getContent());
        note.setUpdatedBy(userId);
        Note updated = noteRepository.save(note);

        User editor = userRepository.findById(userId).orElse(null);
        String editorName = editor != null ? editor.getName() : "Un colaborador";
        notifyCollaborators(
            note.getProject(),
            userId,
            "Versión restaurada",
            editorName + " ha restaurado una versión anterior de la nota '" + note.getTitle() + "'",
            "NOTE_VERSION_RESTORED", note.getId()
        );

        return mapToResponse(updated);
    }

    /**
     * Guarda una instantánea de título/contenido si difiere de la última versión
     * (deduplicación: los guardados automáticos repetidos no crean versiones
     * duplicadas) y poda las versiones más antiguas si se supera el límite.
     */
    private void snapshotVersion(Note note, Long userId) {
        Optional<NoteVersion> last = noteVersionRepository.findTopByNoteIdOrderByIdDesc(note.getId());
        if (last.isPresent()
                && Objects.equals(last.get().getTitle(), note.getTitle())
                && Objects.equals(last.get().getContent(), note.getContent())) {
            return;
        }

        NoteVersion version = NoteVersion.builder()
                .note(note)
                .title(note.getTitle())
                .content(note.getContent())
                .updatedBy(userId)
                .build();
        noteVersionRepository.save(version);

        long count = noteVersionRepository.countByNoteId(note.getId());
        if (count > MAX_VERSIONS_PER_NOTE) {
            int excess = (int) (count - MAX_VERSIONS_PER_NOTE);
            List<NoteVersion> oldest = noteVersionRepository.findOldestFirst(note.getId(), PageRequest.of(0, excess));
            noteVersionRepository.deleteAll(oldest);
        }
    }

    private NoteResponse mapToResponse(Note note) {
        List<String> tagsList = note.getTags().stream().map(Tag::getTag).collect(Collectors.toList());
        List<NoteResponse.AttachmentResponse> attachmentsList = note.getAttachments().stream()
                .map(a -> NoteResponse.AttachmentResponse.builder()
                        .id(a.getId())
                        .url(a.getUrl())
                        .type(a.getType())
                        .name(a.getName())
                        .tag(a.getTag())
                        .build())
                .collect(Collectors.toList());

        // Colaboradores por-nota: solo existen si el compartido está activo
        // (shareToken). Sin token no puede haber note_members, así que se evita
        // una consulta por nota en las listas (N+1) para las notas no compartidas.
        List<NoteMemberResponse> noteMembers = List.of();
        if (note.getShareToken() != null && !note.getShareToken().isEmpty()) {
            noteMembers = noteMemberRepository.findByNoteOrderByJoinedAtAsc(note).stream()
                    .map(nm -> mapNoteMemberToResponse(note.getId(), nm))
                    .collect(Collectors.toList());
        }

        return NoteResponse.builder()
                .id(note.getId())
                .projectId(note.getProject().getId())
                .title(note.getTitle())
                .content(note.getContent())
                .coverImage(note.getCoverImage())
                .favorite(note.isFavorite())
                .archived(note.isArchived())
                .deleted(note.isDeleted())
                .shareToken(note.getShareToken())
                .tags(tagsList)
                .attachments(attachmentsList)
                .noteMembers(noteMembers)
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .updatedBy(note.getUpdatedBy())
                .build();
    }
}
