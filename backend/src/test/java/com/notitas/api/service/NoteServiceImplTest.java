package com.notitas.api.service;

import com.notitas.api.exception.AccessDeniedException;
import com.notitas.api.exception.ResourceNotFoundException;
import com.notitas.api.model.Attachment;
import com.notitas.api.model.Note;
import com.notitas.api.model.NoteVersion;
import com.notitas.api.model.Project;
import com.notitas.api.model.ProjectMember;
import com.notitas.api.model.User;
import com.notitas.api.payload.NoteRequest;
import com.notitas.api.payload.NoteResponse;
import com.notitas.api.repository.CommentRepository;
import com.notitas.api.repository.NoteMemberRepository;
import com.notitas.api.repository.NoteRepository;
import com.notitas.api.repository.NoteVersionRepository;
import com.notitas.api.repository.ProjectMemberRepository;
import com.notitas.api.repository.ProjectRepository;
import com.notitas.api.repository.TagRepository;
import com.notitas.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Tests unitarios de {@link NoteServiceImpl} con mocks de repositorios:
 * control de acceso, versionado con deduplicación, borrado en 2 pasos,
 * compartir y búsqueda.
 *
 * LENIENT: los checks de acceso cortocircuitan (owner → no consulta membresía),
 * así que algunos stubs quedan sin usar según el escenario.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NoteServiceImplTest {

    private static final Long OWNER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;
    private static final Long PROJECT_ID = 10L;
    private static final Long NOTE_ID = 11L;

    @Mock private NoteRepository noteRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private TagRepository tagRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private NoteVersionRepository noteVersionRepository;
    @Mock private NoteMemberRepository noteMemberRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private CommentRepository commentRepository;

    @InjectMocks
    private NoteServiceImpl noteService;

    private User owner;
    private Project project;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(OWNER_ID).name("Owner").email("owner@test.com").build();
        project = Project.builder().id(PROJECT_ID).user(owner).name("Proyecto").build();
    }

    private Note note() {
        return Note.builder()
                .id(NOTE_ID)
                .project(project)
                .title("Título")
                .content("<p>contenido</p>")
                .deleted(false)
                .build();
    }

    private Note noteWithFiles() {
        Note n = note();
        n.setDeleted(true);
        n.setCoverImage("/uploads/cov.png");
        n.getAttachments().add(Attachment.builder().id(1L).url("/uploads/att.txt").name("att.txt").build());
        n.setContent("<p><img src=\"/uploads/inline.png\"></p>");
        return n;
    }

    // ---------- createNote ----------

    @Test
    void createNote_outsiderWithoutAccess_throwsAccessDenied() {
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId(PROJECT_ID, OTHER_USER_ID)).thenReturn(false);
        when(noteRepository.existsSharedNotesByProjectAndUser(PROJECT_ID, OTHER_USER_ID)).thenReturn(false);
        when(projectMemberRepository.findByProjectId(PROJECT_ID)).thenReturn(List.of());

        assertThatThrownBy(() -> noteService.createNote(PROJECT_ID, new NoteRequest(null, "N", null, null, null, null, null, null), OTHER_USER_ID))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("No tienes acceso a este proyecto");
    }

    @Test
    void createNote_owner_createsNoteWithTagsAndInitialVersion() {
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId(PROJECT_ID, OWNER_ID)).thenReturn(false);
        when(noteRepository.existsSharedNotesByProjectAndUser(PROJECT_ID, OWNER_ID)).thenReturn(false);
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));
        when(projectMemberRepository.findByProjectId(PROJECT_ID)).thenReturn(List.of());
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> {
            Note n = inv.getArgument(0);
            n.setId(99L);
            return n;
        });
        when(noteVersionRepository.findTopByNoteIdOrderByIdDesc(99L)).thenReturn(Optional.empty());
        when(noteVersionRepository.countByNoteId(99L)).thenReturn(0L);

        NoteRequest request = new NoteRequest(null, "Mi nota", "<p>hola</p>", null, null, null, null, List.of("tag1", "tag2"));
        NoteResponse response = noteService.createNote(PROJECT_ID, request, OWNER_ID);

        assertThat(response.getId()).isEqualTo(99L);
        assertThat(response.getTitle()).isEqualTo("Mi nota");
        assertThat(response.getTags()).containsExactly("tag1", "tag2");
        // Versión inicial (permite restaurar el estado original)
        verify(noteVersionRepository).save(any(NoteVersion.class));
        // El creador es el propio owner: nadie recibe notificación
        verify(notificationService, never()).createNotification(any(), anyString(), anyString());
    }

    // ---------- updateNote ----------

    @Test
    void updateNote_contentChange_createsVersion() {
        Note note = note();
        when(noteRepository.findById(NOTE_ID)).thenReturn(Optional.of(note));
        when(projectMemberRepository.existsByProjectIdAndUserId(PROJECT_ID, OWNER_ID)).thenReturn(false);
        when(noteMemberRepository.existsByNoteIdAndUserId(NOTE_ID, OWNER_ID)).thenReturn(false);
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> inv.getArgument(0));
        when(noteVersionRepository.findTopByNoteIdOrderByIdDesc(NOTE_ID)).thenReturn(Optional.empty());
        when(noteVersionRepository.countByNoteId(NOTE_ID)).thenReturn(1L);

        NoteRequest request = new NoteRequest(null, null, "<p>contenido nuevo</p>", null, null, null, null, null);
        NoteResponse response = noteService.updateNote(NOTE_ID, request, OWNER_ID);

        assertThat(response.getContent()).isEqualTo("<p>contenido nuevo</p>");
        assertThat(response.getUpdatedBy()).isEqualTo(OWNER_ID);
        verify(noteVersionRepository).save(any(NoteVersion.class));
    }

    @Test
    void updateNote_favoriteOnly_doesNotCreateVersion() {
        Note note = note();
        when(noteRepository.findById(NOTE_ID)).thenReturn(Optional.of(note));
        when(projectMemberRepository.existsByProjectIdAndUserId(PROJECT_ID, OWNER_ID)).thenReturn(false);
        when(noteMemberRepository.existsByNoteIdAndUserId(NOTE_ID, OWNER_ID)).thenReturn(false);
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> inv.getArgument(0));

        NoteRequest request = new NoteRequest(null, null, null, null, true, null, null, null);
        noteService.updateNote(NOTE_ID, request, OWNER_ID);

        verify(noteVersionRepository, never()).save(any(NoteVersion.class));
    }

    @Test
    void updateNote_identicalTitleAndContent_doesNotCreateVersion() {
        Note note = note();
        when(noteRepository.findById(NOTE_ID)).thenReturn(Optional.of(note));
        when(projectMemberRepository.existsByProjectIdAndUserId(PROJECT_ID, OWNER_ID)).thenReturn(false);
        when(noteMemberRepository.existsByNoteIdAndUserId(NOTE_ID, OWNER_ID)).thenReturn(false);
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> inv.getArgument(0));

        NoteRequest request = new NoteRequest(null, "Título", "<p>contenido</p>", null, null, null, null, null);
        noteService.updateNote(NOTE_ID, request, OWNER_ID);

        verify(noteVersionRepository, never()).save(any(NoteVersion.class));
    }

    @Test
    void updateNote_viewerMember_isRejected() {
        // Un miembro con rol VIEWER (solo lectura) no debe poder editar la nota
        Project otherProject = Project.builder().id(PROJECT_ID)
                .user(User.builder().id(OTHER_USER_ID).name("Other").build())
                .name("Proyecto").build();
        Note note = Note.builder().id(NOTE_ID).project(otherProject).title("T").content("<p>c</p>").build();

        when(noteRepository.findById(NOTE_ID)).thenReturn(Optional.of(note));
        when(projectMemberRepository.existsByProjectIdAndUserId(PROJECT_ID, OWNER_ID)).thenReturn(true);
        when(noteMemberRepository.existsByNoteIdAndUserId(NOTE_ID, OWNER_ID)).thenReturn(false);
        when(projectMemberRepository.findByProjectIdAndUserId(PROJECT_ID, OWNER_ID))
                .thenReturn(Optional.of(new ProjectMember(null, otherProject, owner, "VIEWER", null)));

        assertThatThrownBy(() -> noteService.updateNote(NOTE_ID, new NoteRequest(null, "X", null, null, null, null, null, null), OWNER_ID))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("No tienes permisos de edición en esta nota");
        verify(noteRepository, never()).save(any(Note.class));
    }

    // ---------- deleteNote (borrado en 2 pasos) ----------

    @Test
    void deleteNote_firstCall_softDeletesWithoutTouchingFiles() {
        Note note = note();
        when(noteRepository.findById(NOTE_ID)).thenReturn(Optional.of(note));
        when(projectMemberRepository.existsByProjectIdAndUserId(PROJECT_ID, OWNER_ID)).thenReturn(false);
        when(noteMemberRepository.existsByNoteIdAndUserId(NOTE_ID, OWNER_ID)).thenReturn(false);
        when(projectMemberRepository.findByProjectId(PROJECT_ID)).thenReturn(List.of());
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));
        when(noteRepository.save(any(Note.class))).thenReturn(note);

        noteService.deleteNote(NOTE_ID, OWNER_ID);

        assertThat(note.isDeleted()).isTrue();
        verify(noteRepository).save(note);
        verify(noteRepository, never()).delete(any(Note.class));
        verify(fileStorageService, never()).deleteFile(anyString());
        verify(fileStorageService, never()).deleteContentImages(anyString());
    }

    @Test
    void deleteNote_secondCall_hardDeletesAndCleansFilesAndVersions() {
        Note note = noteWithFiles();
        when(noteRepository.findById(NOTE_ID)).thenReturn(Optional.of(note));
        when(projectMemberRepository.existsByProjectIdAndUserId(PROJECT_ID, OWNER_ID)).thenReturn(false);
        when(noteMemberRepository.existsByNoteIdAndUserId(NOTE_ID, OWNER_ID)).thenReturn(false);

        noteService.deleteNote(NOTE_ID, OWNER_ID);

        verify(fileStorageService).deleteFile("cov.png");
        verify(fileStorageService).deleteFile("att.txt");
        verify(fileStorageService).deleteContentImages("<p><img src=\"/uploads/inline.png\"></p>");
        verify(noteVersionRepository).deleteByNoteId(NOTE_ID);
        verify(commentRepository).deleteByNoteId(NOTE_ID);
        verify(noteRepository).delete(note);
    }

    // ---------- compartir ----------

    @Test
    void generateNoteShareToken_persistsTokenOnlyOnce() {
        Note note = note();
        when(noteRepository.findById(NOTE_ID)).thenReturn(Optional.of(note));
        when(projectMemberRepository.existsByProjectIdAndUserId(PROJECT_ID, OWNER_ID)).thenReturn(false);
        when(noteMemberRepository.existsByNoteIdAndUserId(NOTE_ID, OWNER_ID)).thenReturn(false);

        String first = noteService.generateNoteShareToken(NOTE_ID, OWNER_ID);
        String second = noteService.generateNoteShareToken(NOTE_ID, OWNER_ID);

        assertThat(first).isNotBlank();
        assertThat(second).isEqualTo(first);
        verify(noteRepository, times(1)).save(note);
    }

    @Test
    void getSharedNoteByToken_unknownToken_throwsNotFound() {
        when(noteRepository.findByShareToken("no-existe")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> noteService.getSharedNoteByToken("no-existe"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Shared note not found or access expired");
    }

    // ---------- versiones ----------

    @Test
    void restoreNoteVersion_versionFromAnotherNote_throwsNotFound() {
        Note note = note();
        NoteVersion foreignVersion = NoteVersion.builder()
                .id(5L)
                .note(Note.builder().id(999L).build())
                .title("otra")
                .content("<p>otra</p>")
                .build();
        when(noteRepository.findById(NOTE_ID)).thenReturn(Optional.of(note));
        when(projectMemberRepository.existsByProjectIdAndUserId(PROJECT_ID, OWNER_ID)).thenReturn(false);
        when(noteMemberRepository.existsByNoteIdAndUserId(NOTE_ID, OWNER_ID)).thenReturn(false);
        when(noteVersionRepository.findById(5L)).thenReturn(Optional.of(foreignVersion));

        assertThatThrownBy(() -> noteService.restoreNoteVersion(NOTE_ID, 5L, OWNER_ID))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Version not found");
    }

    // ---------- búsqueda ----------

    @Test
    void searchNotes_blankQuery_returnsAllActiveNotesForUser() {
        when(noteRepository.findAllActiveNotesForUser(eq(OWNER_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(note())));

        Page<NoteResponse> page = noteService.searchNotes(OWNER_ID, "   ", PageRequest.of(0, 20));

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getId()).isEqualTo(NOTE_ID);
        verify(noteRepository).findAllActiveNotesForUser(eq(OWNER_ID), any(Pageable.class));
    }
}
