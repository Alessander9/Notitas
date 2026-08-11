package com.notitas.api.controller;

import com.notitas.api.payload.NoteRequest;
import com.notitas.api.payload.NoteResponse;
import com.notitas.api.payload.NoteVersionResponse;
import com.notitas.api.security.UserDetailsImpl;
import com.notitas.api.service.NoteService;
import com.notitas.api.service.FileStorageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
public class NoteController {

    @Autowired
    private NoteService noteService;

    private Long getUserId(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userDetails.getId();
    }

    @GetMapping("/projects/{projectId}/notes")
    public ResponseEntity<Page<NoteResponse>> getNotesByProject(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            Authentication authentication) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(noteService.getNotesByProject(projectId, getUserId(authentication), pageable));
    }

    @GetMapping("/notes/{id}")
    public ResponseEntity<NoteResponse> getNoteById(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(noteService.getNoteByIdAndUser(id, getUserId(authentication)));
    }

    @GetMapping("/notes/favorites")
    public ResponseEntity<Page<NoteResponse>> getFavoriteNotes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            Authentication authentication) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(noteService.getFavoriteNotes(getUserId(authentication), pageable));
    }

    @GetMapping("/notes/deleted")
    public ResponseEntity<Page<NoteResponse>> getDeletedNotes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            Authentication authentication) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(noteService.getDeletedNotes(getUserId(authentication), pageable));
    }

    @GetMapping("/notes/search")
    public ResponseEntity<Page<NoteResponse>> searchNotes(
            @RequestParam("query") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            Authentication authentication) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(noteService.searchNotes(getUserId(authentication), query, pageable));
    }

    @PostMapping("/projects/{projectId}/notes")
    public ResponseEntity<NoteResponse> createNote(
            @PathVariable Long projectId, @RequestBody NoteRequest request, Authentication authentication) {
        return ResponseEntity.ok(noteService.createNote(projectId, request, getUserId(authentication)));
    }

    @PutMapping("/notes/{id}")
    public ResponseEntity<NoteResponse> updateNote(
            @PathVariable Long id, @RequestBody NoteRequest request, Authentication authentication) {
        return ResponseEntity.ok(noteService.updateNote(id, request, getUserId(authentication)));
    }

    @PostMapping("/notes/{id}/cover")
    public ResponseEntity<NoteResponse> uploadCoverImage(
            @PathVariable Long id, @RequestParam("file") MultipartFile file, Authentication authentication) {
        return ResponseEntity.ok(noteService.uploadCoverImage(id, file, getUserId(authentication)));
    }

    @DeleteMapping("/notes/{id}/cover")
    public ResponseEntity<NoteResponse> deleteCoverImage(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(noteService.deleteCoverImage(id, getUserId(authentication)));
    }

    @PostMapping("/notes/{id}/attachment")
    public ResponseEntity<NoteResponse> uploadAttachment(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "tag", required = false) String tag,
            Authentication authentication) {
        return ResponseEntity.ok(noteService.uploadAttachment(id, file, tag, getUserId(authentication)));
    }

    @PutMapping("/notes/{noteId}/attachments/{attachmentId}/tag")
    public ResponseEntity<NoteResponse> updateAttachmentTag(
            @PathVariable Long noteId,
            @PathVariable Long attachmentId,
            @RequestParam("tag") String tag,
            Authentication authentication) {
        return ResponseEntity.ok(noteService.updateAttachmentTag(noteId, attachmentId, tag, getUserId(authentication)));
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<?> deleteNote(@PathVariable Long id, Authentication authentication) {
        noteService.deleteNote(id, getUserId(authentication));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/notes/deleted")
    public ResponseEntity<?> emptyTrash(Authentication authentication) {
        noteService.emptyTrash(getUserId(authentication));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/notes/deleted/restore-all")
    public ResponseEntity<?> restoreAllTrash(Authentication authentication) {
        noteService.restoreAllTrash(getUserId(authentication));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/notes/{id}/share-token")
    public ResponseEntity<?> getShareToken(@PathVariable Long id, Authentication authentication) {
        String token = noteService.generateNoteShareToken(id, getUserId(authentication));
        return ResponseEntity.ok(java.util.Map.of("shareToken", token));
    }

    @DeleteMapping("/notes/{id}/share-token")
    public ResponseEntity<?> revokeShareToken(@PathVariable Long id, Authentication authentication) {
        noteService.revokeNoteShareToken(id, getUserId(authentication));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/public/notes/shared/{token}")
    public ResponseEntity<NoteResponse> getSharedNote(@PathVariable String token) {
        return ResponseEntity.ok(noteService.getSharedNoteByToken(token));
    }

    @PostMapping("/notes/join/{token}")
    public ResponseEntity<NoteResponse> joinNote(@PathVariable String token, Authentication authentication) {
        return ResponseEntity.ok(noteService.joinNote(token, getUserId(authentication)));
    }

    @GetMapping("/notes/{id}/versions")
    public ResponseEntity<List<NoteVersionResponse>> getNoteVersions(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(noteService.getNoteVersions(id, getUserId(authentication)));
    }

    @PostMapping("/notes/{id}/versions/{versionId}/restore")
    public ResponseEntity<NoteResponse> restoreNoteVersion(
            @PathVariable Long id, @PathVariable Long versionId, Authentication authentication) {
        return ResponseEntity.ok(noteService.restoreNoteVersion(id, versionId, getUserId(authentication)));
    }

    @PostMapping("/notes/{id}/images")
    public ResponseEntity<?> uploadInlineImage(
            @PathVariable Long id, @RequestParam("file") MultipartFile file, Authentication authentication) {
        // El servicio valida acceso de ESCRITURA y guarda el archivo
        return ResponseEntity.ok(noteService.uploadInlineImage(id, file, getUserId(authentication)));
    }
}
