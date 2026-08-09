package com.notitas.api.service;

import com.notitas.api.payload.NotificationResponse;
import java.util.List;

public interface NotificationService {
    List<NotificationResponse> getNotificationsByUser(Long userId);
    long getUnreadCountByUser(Long userId);
    NotificationResponse markAsRead(Long id, Long userId);
    void markAllAsRead(Long userId);
    void clearAllNotifications(Long userId);
    void createNotification(Long userId, String title, String message);
}
