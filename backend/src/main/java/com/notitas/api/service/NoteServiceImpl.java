package com.notitas.api.service;

import com.notitas.api.exception.AccessDeniedException;
import com.notitas.api.exception.ResourceNotFoundException;
import com.notitas.api.model.*;
import com.notitas.api.payload.NoteRequest;
import com.notitas.api.payload.NoteResponse;
import com.notitas.api.payload.NoteVersionResponse;
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
     * Acceso de ESCRITURA a la nota: dueño o miembro con rol distinto de
     * VIEWER (los lectores solo pueden ver, no editar ni restaurar).
     */
    private void checkNoteEditAccess(Note note, Long userId) {
        checkNoteAccess(note, userId);
        Project project = note.getProject();
        boolean isOwner = project.getUser().getId().equals(userId);
        boolean isNoteMember = noteMemberRepository.existsByNoteIdAndUserId(note.getId(), userId);

        if (!isOwner && !isNoteMember) {
            ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(project.getId(), userId)
                    .orElseThrow(() -> new AccessDeniedException("No tienes acceso a esta nota"));
            if ("VIEWER".equals(member.getRole())) {
                throw new AccessDeniedException("Viewer cannot edit note");
            }
        }
    }

    private void notifyCollaborators(Project project, Long actionUserId, String title, String message) {
        // Notify owner if the actor is not the owner
        if (!project.getUser().getId().equals(actionUserId)) {
            notificationService.createNotification(project.getUser().getId(), title, message);
        }

        // Notify members if they are not the actor
        List<ProjectMember> members = projectMemberRepository.findByProjectId(project.getId());
        for (ProjectMember m : members) {
            if (!m.getUser().getId().equals(actionUserId) && !m.getUser().getId().equals(project.getUser().getId())) {
                notificationService.createNotification(m.getUser().getId(), title, message);
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
            return noteRepository.findByProjectIdAndDeletedFalseOrderByUpdatedAtDesc(projectId, pageable)
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
            creatorName + " ha creado la nota '" + savedNote.getTitle() + "' en el proyecto " + project.getName()
        );

        return mapToResponse(savedNote);
    }

    @Override
    @Transactional
    public NoteResponse updateNote(Long id, NoteRequest request, Long userId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada"));
        checkNoteAccess(note, userId);

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
        checkNoteAccess(note, userId);
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
        checkNoteAccess(note, userId);
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
        checkNoteAccess(note, userId);
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
        checkNoteAccess(note, userId);
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
        checkNoteAccess(note, userId);

        if (note.isDeleted()) {
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
            // Historial de versiones: se borra explícitamente (no hay cascade de
            // colección en Note para evitar interacciones con el auto-flush).
            noteVersionRepository.deleteByNoteId(note.getId());
            noteRepository.delete(note);
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
                editorName + " ha movido la nota '" + note.getTitle() + "' a la papelera"
            );
        }
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
            editorName + " ha restaurado una versión anterior de la nota '" + note.getTitle() + "'"
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
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .updatedBy(note.getUpdatedBy())
                .build();
    }
}
