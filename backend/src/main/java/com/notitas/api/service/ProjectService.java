package com.notitas.api.service;

import com.notitas.api.payload.ProjectRequest;
import com.notitas.api.payload.ProjectResponse;

import java.util.List;

public interface ProjectService {
    List<ProjectResponse> getProjectsByUser(Long userId);
    ProjectResponse getProjectByIdAndUser(Long id, Long userId);
    ProjectResponse createProject(ProjectRequest request, Long userId);
    ProjectResponse updateProject(Long id, ProjectRequest request, Long userId);
    void deleteProject(Long id, Long userId);
    String generateInviteToken(Long id, Long userId);
    ProjectResponse joinProject(String token, Long userId);
    ProjectResponse changeMemberRole(Long projectId, Long memberUserId, String role, Long currentUserId);
    ProjectResponse removeMember(Long projectId, Long memberUserId, Long currentUserId);
}
