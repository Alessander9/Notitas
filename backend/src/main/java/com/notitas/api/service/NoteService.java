package com.notitas.api.service;

import com.notitas.api.payload.NoteRequest;
import com.notitas.api.payload.NoteResponse;
import com.notitas.api.payload.NoteVersionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface NoteService {
    Page<NoteResponse> getNotesByProject(Long projectId, Long userId, Pageable pageable);
    NoteResponse getNoteByIdAndUser(Long id, Long userId);
    Page<NoteResponse> getFavoriteNotes(Long userId, Pageable pageable);
    Page<NoteResponse> getDeletedNotes(Long userId, Pageable pageable);
    Page<NoteResponse> searchNotes(Long userId, String query, Pageable pageable);

    NoteResponse createNote(Long projectId, NoteRequest request, Long userId);
    NoteResponse updateNote(Long id, NoteRequest request, Long userId);
    NoteResponse uploadCoverImage(Long id, MultipartFile file, Long userId);
    NoteResponse deleteCoverImage(Long id, Long userId);
    NoteResponse uploadAttachment(Long id, MultipartFile file, String tag, Long userId);
    NoteResponse updateAttachmentTag(Long noteId, Long attachmentId, String tag, Long userId);

    /** Sube una imagen inline del editor y devuelve {"url": "/uploads/..."}. Requiere acceso de escritura. */
    java.util.Map<String, String> uploadInlineImage(Long id, MultipartFile file, Long userId);
    void deleteNote(Long id, Long userId);
    void emptyTrash(Long userId);
    void restoreAllTrash(Long userId);
    String generateNoteShareToken(Long id, Long userId);
    void revokeNoteShareToken(Long id, Long userId);
    NoteResponse getSharedNoteByToken(String token);
    NoteResponse joinNote(String token, Long userId);

    List<NoteVersionResponse> getNoteVersions(Long noteId, Long userId);
    NoteResponse restoreNoteVersion(Long noteId, Long versionId, Long userId);
}
