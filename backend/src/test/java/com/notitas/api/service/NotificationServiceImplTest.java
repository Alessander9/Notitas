package com.notitas.api.service;

import com.notitas.api.exception.AccessDeniedException;
import com.notitas.api.exception.ResourceNotFoundException;
import com.notitas.api.model.Notification;
import com.notitas.api.model.User;
import com.notitas.api.payload.NotificationResponse;
import com.notitas.api.repository.NotificationRepository;
import com.notitas.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitarios de {@link NotificationServiceImpl}: lectura, conteo de no
 * leídas, marcar como leída (con permiso del destinatario), leer todas,
 * limpiar y crear.
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    private static final Long USER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private User user;
    private Notification notification;

    @BeforeEach
    void setUp() {
        user = User.builder().id(USER_ID).name("User").build();
        notification = new Notification(user, "Título", "Mensaje");
        notification.setId(10L);
    }

    @Test
    void getNotifications_returnsUsersNotifications() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(notificationRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(notification));

        List<NotificationResponse> result = notificationService.getNotificationsByUser(USER_ID);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("Título");
        assertThat(result.get(0).isRead()).isFalse();
    }

    @Test
    void getUnreadCount_countsOnlyUnread() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(notificationRepository.countByUserAndReadFalse(user)).thenReturn(3L);

        assertThat(notificationService.getUnreadCountByUser(USER_ID)).isEqualTo(3L);
    }

    @Test
    void markAsRead_byRecipient_marksAndReturnsNotification() {
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(notification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        NotificationResponse response = notificationService.markAsRead(10L, USER_ID);

        assertThat(response.isRead()).isTrue();
        assertThat(notification.isRead()).isTrue();
    }

    @Test
    void markAsRead_byOtherUser_throwsAccessDenied() {
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(notification));

        assertThatThrownBy(() -> notificationService.markAsRead(10L, OTHER_USER_ID))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("No tienes permiso para modificar esta notificación");
    }

    @Test
    void markAsRead_unknownNotification_throwsNotFound() {
        when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAsRead(999L, USER_ID))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Notificación no encontrada");
    }

    @Test
    void markAllAsRead_marksEveryUnreadAsRead() {
        Notification n2 = new Notification(user, "Otro", "Mensaje 2");
        n2.setId(11L);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(notificationRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(notification, n2));

        notificationService.markAllAsRead(USER_ID);

        assertThat(notification.isRead()).isTrue();
        assertThat(n2.isRead()).isTrue();
        verify(notificationRepository).saveAll(List.of(notification, n2));
    }

    @Test
    void clearAllNotifications_deletesAll() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(notificationRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(notification));

        notificationService.clearAllNotifications(USER_ID);

        verify(notificationRepository).deleteAll(List.of(notification));
    }

    @Test
    void createNotification_savesForUser() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        notificationService.createNotification(USER_ID, "Nuevo colaborador", "Alguien se unió");

        verify(notificationRepository).save(any(Notification.class));
        verify(userRepository).findById(USER_ID);
    }
}
