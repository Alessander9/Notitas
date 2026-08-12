package com.notitas.api.service;

import com.notitas.api.exception.AccessDeniedException;
import com.notitas.api.exception.ResourceNotFoundException;
import com.notitas.api.model.Attachment;
import com.notitas.api.model.Note;
import com.notitas.api.model.Project;
import com.notitas.api.model.ProjectMember;
import com.notitas.api.model.User;
import com.notitas.api.payload.ProjectRequest;
import com.notitas.api.payload.ProjectResponse;
import com.notitas.api.repository.CommentRepository;
import com.notitas.api.repository.NoteMemberRepository;
import com.notitas.api.repository.NoteRepository;
import com.notitas.api.repository.NoteVersionRepository;
import com.notitas.api.repository.ProjectMemberRepository;
import com.notitas.api.repository.ProjectRepository;
import com.notitas.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProjectServiceImpl implements ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectMemberRepository projectMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private NoteVersionRepository noteVersionRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private NoteMemberRepository noteMemberRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private NotificationService notificationService;

    @Override
    public List<ProjectResponse> getProjectsByUser(Long userId) {
        // Own projects
        List<Project> ownProjects = projectRepository.findByUserIdOrderByCreatedAtDesc(userId);

        // Joined projects as a member
        List<ProjectMember> memberships = projectMemberRepository.findByUserId(userId);
        List<Project> memberProjects = memberships.stream()
                .map(ProjectMember::getProject)
                .collect(Collectors.toList());

        // Projects with shared notes
        List<Project> noteSharedProjects = projectRepository.findProjectsByNoteCollaboratorUserId(userId);

        List<Project> combined = new ArrayList<>(ownProjects);
        for (Project mp : memberProjects) {
            if (combined.stream().noneMatch(p -> p.getId().equals(mp.getId()))) {
                combined.add(mp);
            }
        }
        for (Project nsp : noteSharedProjects) {
            if (combined.stream().noneMatch(p -> p.getId().equals(nsp.getId()))) {
                combined.add(nsp);
            }
        }

        return combined.stream()
                .map(p -> mapToResponse(p, userId))
                .collect(Collectors.toList());
    }

    @Override
    public ProjectResponse getProjectByIdAndUser(Long id, Long userId) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado"));

        boolean isOwner = project.getUser().getId().equals(userId);
        boolean isMember = projectMemberRepository.existsByProjectIdAndUserId(id, userId);
        boolean hasNoteAccess = noteRepository.existsSharedNotesByProjectAndUser(id, userId);

        if (!isOwner && !isMember && !hasNoteAccess) {
            throw new AccessDeniedException("No tienes acceso a este proyecto");
        }

        return mapToResponse(project, userId);
    }

    @Override
    @Transactional
    public ProjectResponse createProject(ProjectRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        Project project = Project.builder()
                .user(user)
                .name(request.getName())
                .icon(request.getIcon() != null ? request.getIcon() : "folder")
                .color(request.getColor() != null ? request.getColor() : "#1976d2")
                .description(request.getDescription())
                .coverImage(request.getCoverImage())
                .inviteToken(UUID.randomUUID().toString())
                .build();

        Project saved = projectRepository.save(project);
        return mapToResponse(saved, userId);
    }

    @Override
    @Transactional
    public ProjectResponse updateProject(Long id, ProjectRequest request, Long userId) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado"));

        boolean isOwner = project.getUser().getId().equals(userId);
        boolean isMember = projectMemberRepository.existsByProjectIdAndUserId(id, userId);
        if (!isOwner && !isMember) {
            throw new AccessDeniedException("No tienes acceso a este proyecto");
        }

        if (request.getName() != null) project.setName(request.getName());
        if (request.getIcon() != null) project.setIcon(request.getIcon());
        if (request.getColor() != null) project.setColor(request.getColor());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getCoverImage() != null) project.setCoverImage(request.getCoverImage());

        Project updated = projectRepository.save(project);
        return mapToResponse(updated, userId);
    }

    @Override
    @Transactional
    public void deleteProject(Long id, Long userId) {
        Project project = projectRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new AccessDeniedException("No tienes acceso a este proyecto"));

        // Antes se borraba solo el proyecto: cualquier nota, versión o miembro
        // referenciado rompía la FK (notes.project_id, note_versions.note_id,
        // project_members.project_id) y el borrado fallaba con 500. Ahora se
        // borran primero versiones, notas (con sus archivos) y miembros, y
        // después el proyecto.
        List<Note> notes = noteRepository.findByProjectId(id);
        for (Note note : notes) {
            noteVersionRepository.deleteByNoteId(note.getId());
            commentRepository.deleteByNoteId(note.getId());
        }
        for (Note note : notes) {
            deleteNoteFiles(note);
        }
        noteRepository.deleteAll(notes);

        List<ProjectMember> members = projectMemberRepository.findByProjectId(id);
        projectMemberRepository.deleteAll(members);

        projectRepository.delete(project);
    }

    private void deleteNoteFiles(Note note) {
        if (note.getCoverImage() != null) {
            fileStorageService.deleteFile(note.getCoverImage().substring(note.getCoverImage().lastIndexOf('/') + 1));
        }
        for (Attachment att : note.getAttachments()) {
            fileStorageService.deleteFile(att.getUrl().substring(att.getUrl().lastIndexOf('/') + 1));
        }
        fileStorageService.deleteContentImages(note.getContent());
    }

    @Override
    @Transactional
    public String generateInviteToken(Long id, Long userId) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado"));

        boolean isOwner = project.getUser().getId().equals(userId);
        boolean isMember = projectMemberRepository.existsByProjectIdAndUserId(id, userId);
        if (!isOwner && !isMember) {
            throw new AccessDeniedException("No tienes acceso a este proyecto");
        }

        if (project.getInviteToken() == null || project.getInviteToken().isEmpty()) {
            project.setInviteToken(UUID.randomUUID().toString());
            projectRepository.save(project);
        }

        return project.getInviteToken();
    }

    @Override
    @Transactional
    public ProjectResponse joinProject(String token, Long userId) {
        // Bloqueo pesimista sobre la fila del proyecto: dos joins concurrentes con
        // el mismo token quedan serializados (el segundo espera al commit del
        // primero y ve el miembro ya creado). Sin el lock, ambos podían pasar el
        // check "no es miembro" a la vez e insertar el miembro duplicado, que
        // rompía findByProjectIdAndUserId (Optional >1 fila) → 500. La constraint
        // UNIQUE(project_id, user_id) queda como red de seguridad adicional.
        Project project = projectRepository.findByInviteTokenForUpdate(token)
                .orElseThrow(() -> new ResourceNotFoundException("Token de invitación inválido"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        // If the user is the owner, return the project
        if (project.getUser().getId().equals(userId)) {
            return mapToResponse(project, userId);
        }

        // If not a member yet, add to project_members
        if (!projectMemberRepository.existsByProjectIdAndUserId(project.getId(), userId)) {
            ProjectMember member = new ProjectMember(null, project, user, "EDITOR", null);
            projectMemberRepository.save(member);

            // Notify the owner of the project
            notificationService.createNotification(
                project.getUser().getId(),
                "Nuevo colaborador",
                user.getName() + " se ha unido al proyecto: " + project.getName(),
                "PROJECT_MEMBER_JOINED", project.getId(), null
            );

            // Notify all other members of the project
            List<ProjectMember> members = projectMemberRepository.findByProjectId(project.getId());
            for (ProjectMember m : members) {
                if (!m.getUser().getId().equals(userId) && !m.getUser().getId().equals(project.getUser().getId())) {
                    notificationService.createNotification(
                        m.getUser().getId(),
                        "Nuevo colaborador",
                        user.getName() + " se ha unido al proyecto: " + project.getName(),
                        "PROJECT_MEMBER_JOINED", project.getId(), null
                    );
                }
            }
        }

        return mapToResponse(project, userId);
    }

    @Override
    @Transactional
    public ProjectResponse changeMemberRole(Long projectId, Long memberUserId, String role, Long currentUserId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado"));

        // Solo el propietario puede gestionar los roles de los colaboradores
        if (!project.getUser().getId().equals(currentUserId)) {
            throw new AccessDeniedException("Solo el propietario puede gestionar los miembros");
        }

        if (!"EDITOR".equals(role) && !"VIEWER".equals(role)) {
            throw new IllegalArgumentException("Rol inválido: debe ser EDITOR o VIEWER");
        }

        // El propietario no está en project_members; se protege por si acaso
        if (project.getUser().getId().equals(memberUserId)) {
            throw new IllegalArgumentException("No puedes cambiar el rol del propietario");
        }

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("El usuario no es miembro de este proyecto"));

        // Si el rol no cambia realmente, no guardar ni notificar
        if (member.getRole().equals(role)) {
            return mapToResponse(project, currentUserId);
        }

        member.setRole(role);
        projectMemberRepository.save(member);

        String roleLabel = "EDITOR".equals(role) ? "editor" : "visor";
        notificationService.createNotification(
                memberUserId,
                "Rol actualizado",
                project.getUser().getName() + " te ha cambiado el rol a " + roleLabel
                        + " en el proyecto: " + project.getName(),
                "PROJECT_MEMBER_ROLE_CHANGED", project.getId(), null
        );

        return mapToResponse(project, currentUserId);
    }

    @Override
    @Transactional
    public ProjectResponse removeMember(Long projectId, Long memberUserId, Long currentUserId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado"));

        // Solo el propietario puede expulsar colaboradores
        if (!project.getUser().getId().equals(currentUserId)) {
            throw new AccessDeniedException("Solo el propietario puede gestionar los miembros");
        }

        if (project.getUser().getId().equals(memberUserId)) {
            throw new IllegalArgumentException("No puedes eliminar al propietario del proyecto");
        }

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("El usuario no es miembro de este proyecto"));

        projectMemberRepository.delete(member);

        // Revoca también los accesos por-nota del usuario dentro del proyecto
        // (note_members): así la expulsión retira TODA la visibilidad de las
        // notas del proyecto, tal y como promete la UI.
        noteMemberRepository.deleteByUser_IdAndNote_Project_Id(memberUserId, projectId);

        notificationService.createNotification(
                memberUserId,
                "Eliminado del proyecto",
                project.getUser().getName() + " te ha eliminado del proyecto: " + project.getName(),
                "PROJECT_MEMBER_REMOVED", project.getId(), null
        );

        return mapToResponse(project, currentUserId);
    }

    private ProjectResponse mapToResponse(Project project, Long currentUserId) {
        String role = "VIEWER";
        if (project.getUser().getId().equals(currentUserId)) {
            role = "OWNER";
        } else {
            Optional<ProjectMember> memberOpt = projectMemberRepository.findByProjectIdAndUserId(project.getId(), currentUserId);
            if (memberOpt.isPresent()) {
                role = memberOpt.get().getRole();
            }
        }

        ProjectResponse.UserResponse creatorDto = ProjectResponse.UserResponse.builder()
                .id(project.getUser().getId())
                .name(project.getUser().getName())
                .email(project.getUser().getEmail())
                .avatar(project.getUser().getAvatar())
                .role("OWNER")
                .build();

        List<ProjectMember> members = projectMemberRepository.findByProjectId(project.getId());
        List<ProjectResponse.UserResponse> collaboratorsDto = members.stream()
                .map(m -> ProjectResponse.UserResponse.builder()
                        .id(m.getUser().getId())
                        .name(m.getUser().getName())
                        .email(m.getUser().getEmail())
                        .avatar(m.getUser().getAvatar())
                        .role(m.getRole())
                        .build())
                .collect(Collectors.toList());

        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .icon(project.getIcon())
                .color(project.getColor())
                .description(project.getDescription())
                .coverImage(project.getCoverImage())
                .currentUserRole(role)
                .creator(creatorDto)
                .collaborators(collaboratorsDto)
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
