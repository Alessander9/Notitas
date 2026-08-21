package com.notitas.api.service;

import com.notitas.api.exception.AccessDeniedException;
import com.notitas.api.model.Attachment;
import com.notitas.api.model.Note;
import com.notitas.api.model.Project;
import com.notitas.api.model.ProjectMember;
import com.notitas.api.model.User;
import com.notitas.api.payload.ProjectRequest;
import com.notitas.api.payload.ProjectResponse;
import com.notitas.api.repository.CommentRepository;
import com.notitas.api.repository.NoteRepository;
import com.notitas.api.repository.NoteVersionRepository;
import com.notitas.api.repository.ProjectMemberRepository;
import com.notitas.api.repository.ProjectRepository;
import com.notitas.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitarios de {@link ProjectServiceImpl}: CRUD, combinación de
 * proyectos (propios + como miembro + notas compartidas sin duplicados),
 * invitaciones y cascada de borrado.
 */
@ExtendWith(MockitoExtension.class)
class ProjectServiceImplTest {

    private static final Long OWNER_ID = 1L;
    private static final Long MEMBER_ID = 2L;
    private static final Long OTHER_OWNER_ID = 5L;

    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private UserRepository userRepository;
    @Mock private NoteRepository noteRepository;
    @Mock private NoteVersionRepository noteVersionRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private NotificationService notificationService;
    @Mock private CommentRepository commentRepository;

    @InjectMocks
    private ProjectServiceImpl projectService;

    private User owner;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(OWNER_ID).name("Owner").email("owner@test.com").build();
    }

    private Project project(Long id, User user) {
        return Project.builder().id(id).user(user).name("Proyecto " + id).build();
    }

    @Test
    void createProject_appliesDefaultsForIconColorAndInviteToken() {
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));
        when(projectMemberRepository.findByProjectId(anyLong())).thenReturn(List.of());
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p.setId(7L);
            return p;
        });

        ProjectResponse response = projectService.createProject(new ProjectRequest("Nuevo", null, null, null, null), OWNER_ID);

        assertThat(response.getId()).isEqualTo(7L);
        assertThat(response.getName()).isEqualTo("Nuevo");
        assertThat(response.getIcon()).isEqualTo("folder");
        assertThat(response.getColor()).isEqualTo("#1976d2");
        assertThat(response.getCurrentUserRole()).isEqualTo("OWNER");

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());
        assertThat(captor.getValue().getInviteToken()).isNotBlank();
    }

    @Test
    void getProjectsByUser_combinesOwnMemberAndSharedWithoutDuplicates() {
        Project own1 = project(1L, owner);
        Project own2 = project(2L, owner);
        Project memberProject = project(3L, User.builder().id(OTHER_OWNER_ID).name("Other").build());
        Project shared = project(1L, owner); // compartida vía nota: ya está → se descarta el duplicado

        when(projectRepository.findByUserIdOrderByCreatedAtDesc(OWNER_ID)).thenReturn(List.of(own1, own2));
        when(projectMemberRepository.findByUserId(OWNER_ID))
                .thenReturn(List.of(new ProjectMember(null, memberProject, owner, "EDITOR", null)));
        when(projectRepository.findProjectsByNoteCollaboratorUserId(OWNER_ID)).thenReturn(List.of(shared));
        when(projectMemberRepository.findByProjectIdIn(anyList()))
                .thenReturn(List.of(new ProjectMember(null, memberProject, owner, "EDITOR", null)));

        List<ProjectResponse> projects = projectService.getProjectsByUser(OWNER_ID);

        assertThat(projects).hasSize(3);
        assertThat(projects).extracting(ProjectResponse::getId).containsExactly(1L, 2L, 3L);
        assertThat(projects.get(2).getCurrentUserRole()).isEqualTo("EDITOR");
    }

    @Test
    void getProjectByIdAndUser_outsider_throwsAccessDenied() {
        Project project = project(1L, owner);
        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId(1L, MEMBER_ID)).thenReturn(false);
        when(noteRepository.existsSharedNotesByProjectAndUser(1L, MEMBER_ID)).thenReturn(false);

        assertThatThrownBy(() -> projectService.getProjectByIdAndUser(1L, MEMBER_ID))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("No tienes acceso a este proyecto");
    }

    @Test
    void joinProject_owner_returnsWithoutCreatingMembershipOrNotifications() {
        Project project = project(1L, owner);
        when(projectRepository.findByInviteTokenForUpdate("tok")).thenReturn(Optional.of(project));
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));
        when(projectMemberRepository.findByProjectId(1L)).thenReturn(List.of());

        projectService.joinProject("tok", OWNER_ID);

        verify(projectMemberRepository, never()).save(any(ProjectMember.class));
        verify(notificationService, never()).createNotification(anyLong(), anyString(), anyString(), anyString(), anyLong(), any());
    }

    @Test
    void joinProject_newMember_createsEditorMembershipAndNotifiesOwnerAndOthers() {
        Project project = project(1L, owner);
        User member = User.builder().id(MEMBER_ID).name("Member").build();
        User otherMemberUser = User.builder().id(3L).name("Third").build();
        ProjectMember otherMember = new ProjectMember(null, project, otherMemberUser, "EDITOR", null);

        when(projectRepository.findByInviteTokenForUpdate("tok")).thenReturn(Optional.of(project));
        when(userRepository.findById(MEMBER_ID)).thenReturn(Optional.of(member));
        when(projectMemberRepository.existsByProjectIdAndUserId(1L, MEMBER_ID)).thenReturn(false);
        when(projectMemberRepository.findByProjectId(1L)).thenReturn(List.of(otherMember));

        projectService.joinProject("tok", MEMBER_ID);

        // El nuevo miembro se guarda con rol EDITOR
        ArgumentCaptor<ProjectMember> memberCaptor = ArgumentCaptor.forClass(ProjectMember.class);
        verify(projectMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getRole()).isEqualTo("EDITOR");

        // Se notifica al owner (1) y a los demás miembros (3), no al actor (2)
        ArgumentCaptor<Long> userIdCaptor = ArgumentCaptor.forClass(Long.class);
        verify(notificationService, times(2)).createNotification(userIdCaptor.capture(), anyString(), anyString(), anyString(), anyLong(), any());
        assertThat(userIdCaptor.getAllValues()).containsExactlyInAnyOrder(1L, 3L);
    }

    @Test
    void joinProject_existingMember_isNotDuplicated() {
        Project project = project(1L, owner);
        User member = User.builder().id(MEMBER_ID).name("Member").build();
        when(projectRepository.findByInviteTokenForUpdate("tok")).thenReturn(Optional.of(project));
        when(userRepository.findById(MEMBER_ID)).thenReturn(Optional.of(member));
        when(projectMemberRepository.existsByProjectIdAndUserId(1L, MEMBER_ID)).thenReturn(true);
        when(projectMemberRepository.findByProjectId(1L)).thenReturn(List.of());

        projectService.joinProject("tok", MEMBER_ID);

        verify(projectMemberRepository, never()).save(any(ProjectMember.class));
        verify(notificationService, never()).createNotification(anyLong(), anyString(), anyString());
    }

    @Test
    void deleteProject_cascadesInCorrectOrder() {
        Project project = project(1L, owner);
        Note note = Note.builder()
                .id(20L)
                .project(project)
                .title("Nota")
                .content("<p><img src=\"/uploads/inline.png\"></p>")
                .coverImage("/uploads/cov.png")
                .build();
        note.getAttachments().add(Attachment.builder().id(1L).url("/uploads/att.txt").build());
        ProjectMember member = new ProjectMember(null, project, User.builder().id(3L).name("M").build(), "EDITOR", null);

        when(projectRepository.findByIdAndUserId(1L, OWNER_ID)).thenReturn(Optional.of(project));
        when(noteRepository.findByProjectId(1L)).thenReturn(List.of(note));
        when(projectMemberRepository.findByProjectId(1L)).thenReturn(List.of(member));

        projectService.deleteProject(1L, OWNER_ID);

        InOrder inOrder = inOrder(noteVersionRepository, fileStorageService, noteRepository,
                projectMemberRepository, projectRepository);
        // 1º versiones, 2º archivos, 3º notas, 4º miembros, 5º proyecto
        inOrder.verify(noteVersionRepository).deleteByNoteId(20L);
        inOrder.verify(fileStorageService).deleteFile("cov.png");
        inOrder.verify(fileStorageService).deleteFile("att.txt");
        inOrder.verify(fileStorageService).deleteContentImages("<p><img src=\"/uploads/inline.png\"></p>");
        inOrder.verify(noteRepository).deleteAll(List.of(note));
        inOrder.verify(projectMemberRepository).deleteAll(List.of(member));
        inOrder.verify(projectRepository).delete(project);
    }

    @Test
    void deleteProject_memberNotOwner_throwsAccessDenied() {
        when(projectRepository.findByIdAndUserId(1L, MEMBER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.deleteProject(1L, MEMBER_ID))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("No tienes acceso a este proyecto");
    }
}
