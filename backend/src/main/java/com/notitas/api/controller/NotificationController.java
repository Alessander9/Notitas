package com.notitas.api.controller;

import com.notitas.api.payload.NotificationResponse;
import com.notitas.api.security.UserDetailsImpl;
import com.notitas.api.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    private Long getUserId(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userDetails.getId();
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(Authentication authentication) {
        return ResponseEntity.ok(notificationService.getNotificationsByUser(getUserId(authentication)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication authentication) {
        long count = notificationService.getUnreadCountByUser(getUserId(authentication));
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(notificationService.markAsRead(id, getUserId(authentication)));
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        notificationService.markAllAsRead(getUserId(authentication));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    public ResponseEntity<?> clearNotifications(Authentication authentication) {
        notificationService.clearAllNotifications(getUserId(authentication));
        return ResponseEntity.ok().build();
    }
}
