import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Divider,
  Tooltip,
  CircularProgress,
  ListItemButton,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  DoneAll as DoneAllIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../store/toastStore';
import { useUiStore } from '../store/uiStore';

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setCurrentProject = useUiStore((state) => state.setCurrentProject);
  const setCurrentNote = useUiStore((state) => state.setCurrentNote);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isOpen = Boolean(anchorEl);

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.noteId) {
      setCurrentProject(notification.projectId ?? null);
      setCurrentNote(notification.noteId);
      handleClose();
      navigate('/');
      return;
    }

    if (notification.projectId) {
      setCurrentProject(notification.projectId);
      handleClose();
      navigate('/');
      return;
    }

    handleClose();
  };

  // 1. Fetch unread notifications count
  const { data: countData } = useQuery({
    queryKey: ['notificationsCount'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data;
    },
    refetchInterval: 15000, // Poll every 15s
  });

  const unreadCount = countData?.count || 0;

  // 2. Fetch full list of notifications when open
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    },
    enabled: isOpen,
  });

  // 3. Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsCount'] });
      refetch();
    },
  });

  // 4. Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.put('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsCount'] });
      refetch();
      toast.success('Todas las notificaciones marcadas como leídas');
    },
  });

  // 5. Clear all notifications
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/notifications');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsCount'] });
      refetch();
      toast.success('Historial de notificaciones limpiado');
    },
  });

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return `Hace ${diffDays} d`;
  };

  return (
    <>
      <Tooltip title="Notificaciones">
        <IconButton onClick={handleOpen} color="inherit">
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                fontWeight: 'bold',
                height: 18,
                minWidth: 18,
                transition: 'transform 0.3s ease-in-out',
                transform: unreadCount > 0 ? 'scale(1) translate(25%, -25%)' : 'scale(0)',
              },
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1.5,
            width: 320,
            maxHeight: 480,
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(30, 30, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Notificaciones
          </Typography>
          {unreadCount > 0 && (
            <Tooltip title="Marcar todas como leídas">
              <IconButton
                size="small"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                sx={{ color: 'primary.main' }}
              >
                <DoneAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Content list */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No tienes notificaciones
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              <AnimatePresence initial={false}>
                {notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <ListItemButton
                      onClick={() => handleNotificationClick(notif)}
                      aria-label={`Abrir notificación: ${notif.title}`}
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        py: 1.5,
                        px: 2,
                        bgcolor: notif.read ? 'transparent' : (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.08)' : 'rgba(56, 108, 95, 0.04)',
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={notif.read ? 'normal' : 'bold'} color="text.primary" sx={{ pr: 1 }}>
                              {notif.title}
                            </Typography>
                            {!notif.read && (
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: 'primary.main',
                                  flexShrink: 0,
                                  mt: 0.6,
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, lineHeight: 1.3 }}>
                              {notif.message}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                              {formatTimeAgo(notif.createdAt)}
                            </Typography>
                          </>
                        }
                        disableTypography
                      />
                    </ListItemButton>
                  </motion.div>
                ))}
              </AnimatePresence>
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
            <Button
              size="small"
              fullWidth
              color="inherit"
              startIcon={<DeleteSweepIcon fontSize="small" />}
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              sx={{
                borderRadius: 2,
                py: 0.8,
                fontSize: '0.75rem',
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.08)' : 'rgba(244, 67, 54, 0.04)',
                  color: 'error.main',
                },
              }}
            >
              Limpiar historial
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}
