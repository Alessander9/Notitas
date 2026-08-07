package com.notitas.api.controller;

import com.notitas.api.model.User;
import com.notitas.api.payload.ChangePasswordRequest;
import com.notitas.api.payload.MessageResponse;
import com.notitas.api.payload.UpdateProfileRequest;
import com.notitas.api.repository.UserRepository;
import com.notitas.api.security.JwtUtils;
import com.notitas.api.security.UserDetailsImpl;
import com.notitas.api.service.FileStorageService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtils jwtUtils;

    private Long getUserId(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userDetails.getId();
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication) {

        Long userId = getUserId(authentication);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Email uniqueness check (excluding the current user)
        if (!user.getEmail().equalsIgnoreCase(request.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Email is already in use!"));
        }

        boolean emailChanged = !user.getEmail().equalsIgnoreCase(request.getEmail());
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("avatar", user.getAvatar());
        // If the email changed, the old JWT (subject = old email) becomes invalid,
        // so return a fresh token for the new email (with the current session version).
        response.put("token", jwtUtils.generateTokenFromUsername(user.getEmail(), user.getTokenVersion()));

        return ResponseEntity.ok(response);
    }

    /**
     * Devuelve el perfil del usuario autenticado. El frontend lo usa al arrancar
     * para validar que la cookie JWT sigue siendo válida (un 401 aquí significa
     * sesión expirada/revocada y dispara el logout limpio) y para sincronizar
     * nombre/avatar si cambiaron en otro dispositivo.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        Long userId = getUserId(authentication);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // HashMap (no Map.of): el avatar puede ser null y Map.of lanza NPE con valores null.
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("avatar", user.getAvatar());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile/password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {

        Long userId = getUserId(authentication);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!encoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("La contraseña actual es incorrecta"));
        }

        user.setPassword(encoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("Contraseña actualizada correctamente"));
    }

    @PostMapping("/profile/avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        
        Long userId = getUserId(authentication);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Delete old custom avatar if it was stored locally
        if (user.getAvatar() != null && user.getAvatar().startsWith("/uploads/")) {
            String oldFileName = user.getAvatar().substring(user.getAvatar().lastIndexOf('/') + 1);
            fileStorageService.deleteFile(oldFileName);
        }

        String fileName = fileStorageService.storeFile(file);
        String avatarUrl = "/uploads/" + fileName;
        user.setAvatar(avatarUrl);
        userRepository.save(user);

        return ResponseEntity.ok(java.util.Map.of("avatar", avatarUrl));
    }
}
