package com.notitas.api.service;

import com.notitas.api.exception.AccessDeniedException;
import com.notitas.api.exception.ResourceNotFoundException;
import com.notitas.api.model.Notification;
import com.notitas.api.model.User;
import com.notitas.api.payload.NotificationResponse;
import com.notitas.api.repository.NotificationRepository;
import com.notitas.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        return notificationRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCountByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        return notificationRepository.countByUserAndReadFalse(user);
    }

    @Override
    public NotificationResponse markAsRead(Long id, Long userId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notificación no encontrada"));
        
        if (!notification.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("No tienes permiso para modificar esta notificación");
        }
        
        notification.setRead(true);
        Notification saved = notificationRepository.save(notification);
        return mapToResponse(saved);
    }

    @Override
    public void markAllAsRead(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user);
        for (Notification n : notifications) {
            if (!n.isRead()) {
                n.setRead(true);
            }
        }
        notificationRepository.saveAll(notifications);
    }

    @Override
    public void clearAllNotifications(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user);
        notificationRepository.deleteAll(notifications);
    }

    @Override
    public void createNotification(Long userId, String title, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        Notification notification = new Notification(user, title, message);
        notificationRepository.save(notification);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
