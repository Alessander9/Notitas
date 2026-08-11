package com.notitas.api.controller;

import com.notitas.api.payload.ProjectRequest;
import com.notitas.api.payload.ProjectResponse;
import com.notitas.api.payload.UpdateMemberRoleRequest;
import com.notitas.api.security.UserDetailsImpl;
import com.notitas.api.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.notitas.api.service.FileStorageService;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @Autowired
    private FileStorageService fileStorageService;

    private Long getUserId(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userDetails.getId();
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getAllProjects(Authentication authentication) {
        return ResponseEntity.ok(projectService.getProjectsByUser(getUserId(authentication)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProjectById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(projectService.getProjectByIdAndUser(id, getUserId(authentication)));
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody ProjectRequest request, Authentication authentication) {
        return ResponseEntity.ok(projectService.createProject(request, getUserId(authentication)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponse> updateProject(@PathVariable Long id, @Valid @RequestBody ProjectRequest request, Authentication authentication) {
        return ResponseEntity.ok(projectService.updateProject(id, request, getUserId(authentication)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable Long id, Authentication authentication) {
        projectService.deleteProject(id, getUserId(authentication));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/invite-token")
    public ResponseEntity<?> getInviteToken(@PathVariable Long id, Authentication authentication) {
        String token = projectService.generateInviteToken(id, getUserId(authentication));
        return ResponseEntity.ok(java.util.Map.of("inviteToken", token));
    }

    @PostMapping("/join/{token}")
    public ResponseEntity<ProjectResponse> joinProject(@PathVariable String token, Authentication authentication) {
        return ResponseEntity.ok(projectService.joinProject(token, getUserId(authentication)));
    }

    @PutMapping("/{id}/members/{userId}")
    public ResponseEntity<ProjectResponse> changeMemberRole(
            @PathVariable Long id,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateMemberRoleRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(projectService.changeMemberRole(id, userId, request.getRole(), getUserId(authentication)));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<ProjectResponse> removeMember(
            @PathVariable Long id,
            @PathVariable Long userId,
            Authentication authentication) {
        return ResponseEntity.ok(projectService.removeMember(id, userId, getUserId(authentication)));
    }

    @PostMapping("/{id}/cover")
    public ResponseEntity<ProjectResponse> uploadProjectCover(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        // Validate access
        projectService.getProjectByIdAndUser(id, getUserId(authentication));
        String fileName = fileStorageService.storeFile(file);
        
        ProjectRequest request = new ProjectRequest();
        request.setCoverImage("/uploads/" + fileName);
        
        return ResponseEntity.ok(projectService.updateProject(id, request, getUserId(authentication)));
    }
}
