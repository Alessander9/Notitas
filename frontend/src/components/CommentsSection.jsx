import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Button,
  TextField,
  Divider,
  CircularProgress,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Send as SendIcon,
  DeleteOutline as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  ChatBubbleOutline as CommentsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import { getAvatarUrl, formatRelativeTime } from '../utils/text';

const MAX_COMMENT_LENGTH = 5000;

/**
 * Sección de comentarios de una nota. Cualquier miembro del proyecto puede
 * comentar (también los VIEWER); cada comentario notifica a los demás
 * colaboradores. Solo el autor puede editar o borrar el suyo.
 */
export default function CommentsSection({ noteId }) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', noteId],
    queryFn: async () => {
      const res = await api.get(`/notes/${noteId}/comments`);
      return res.data;
    },
    enabled: Boolean(noteId),
  });

  const invalidateComments = () =>
    queryClient.invalidateQueries({ queryKey: ['comments', noteId] });

  const addMutation = useMutation({
    mutationFn: async (content) => {
      const res = await api.post(`/notes/${noteId}/comments`, { content });
      return res.data;
    },
    onSuccess: () => {
      setDraft('');
      invalidateComments();
    },
    onError: () => toast.error('No se pudo añadir el comentario'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ commentId, content }) => {
      const res = await api.put(`/notes/${noteId}/comments/${commentId}`, { content });
      return res.data;
    },
    onSuccess: () => {
      setEditingId(null);
      setEditValue('');
      invalidateComments();
    },
    onError: () => toast.error('No se pudo editar el comentario'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId) => {
      await api.delete(`/notes/${noteId}/comments/${commentId}`);
    },
    onSuccess: () => invalidateComments(),
    onError: () => toast.error('No se pudo eliminar el comentario'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    addMutation.mutate(content);
  };

  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditValue(comment.content);
  };

  const saveEdit = (commentId) => {
    const content = editValue.trim();
    if (!content) return;
    updateMutation.mutate({ commentId, content });
  };

  const handleDelete = (comment) => {
    confirm({
      title: 'Eliminar comentario',
      message: '¿Eliminar este comentario? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      color: 'error',
      onConfirm: () => deleteMutation.mutate(comment.id),
    });
  };

  return (
    <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CommentsIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
        <Typography variant="subtitle2" fontWeight="bold">
          Comentarios ({comments.length})
        </Typography>
      </Box>

      {/* Formulario de nuevo comentario */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          gap: 1.25,
          mb: 3,
          alignItems: 'flex-start',
          bgcolor: 'action.hover',
          borderRadius: 3,
          p: 1.5,
        }}
      >
        <Avatar
          src={getAvatarUrl(user?.avatar)}
          sx={{ width: 32, height: 32, fontSize: '0.9rem', bgcolor: 'primary.main', flexShrink: 0 }}
        >
          {(user?.name || '?').charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <TextField
            fullWidth
            multiline
            minRows={1}
            maxRows={6}
            size="small"
            placeholder="Escribe un comentario… (Enter para enviar, Shift+Enter para salto de línea)"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            inputProps={{ maxLength: MAX_COMMENT_LENGTH }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
                borderRadius: 2.5,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1, alignItems: 'center' }}>
            <Typography variant="caption" color="text.disabled">
              {draft.length}/{MAX_COMMENT_LENGTH}
            </Typography>
            <Button
              type="submit"
              variant="contained"
              size="small"
              startIcon={<SendIcon sx={{ fontSize: 16 }} />}
              disabled={!draft.trim() || addMutation.isPending}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              {addMutation.isPending ? 'Enviando…' : 'Comentar'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Lista de comentarios */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={22} />
        </Box>
      ) : comments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
          Sin comentarios todavía. ¡Sé el primero en comentar!
        </Typography>
      ) : (
        <Stack direction="column" spacing={2}>
          <AnimatePresence initial={false}>
            {comments.map((comment) => {
              const isOwn = comment.userId === user?.id;
              const isEditing = editingId === comment.id;

              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.18 }}
                >
                  <Box sx={{ display: 'flex', gap: 1.25 }}>
                    <Avatar
                      src={getAvatarUrl(comment.authorAvatar)}
                      sx={{ width: 32, height: 32, fontSize: '0.9rem', bgcolor: 'secondary.main', flexShrink: 0 }}
                    >
                      {(comment.authorName || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      {/* Meta: autor + fecha */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>
                          {comment.authorName}
                        </Typography>
                        {isOwn && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              px: 0.7,
                              py: 0.1,
                              borderRadius: '6px',
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              opacity: 0.85,
                            }}
                          >
                            TÚ
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                          {formatRelativeTime(comment.createdAt)}
                          {comment.updatedAt && ' · editado'}
                        </Typography>
                      </Box>

                      {/* Contenido (o edición) */}
                      {isEditing ? (
                        <Box sx={{ mt: 0.5 }}>
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            size="small"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                            inputProps={{ maxLength: MAX_COMMENT_LENGTH }}
                            autoFocus
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 0.75 }}>
                            <Button
                              size="small"
                              startIcon={<CloseIcon sx={{ fontSize: 15 }} />}
                              onClick={() => {
                                setEditingId(null);
                                setEditValue('');
                              }}
                              sx={{ borderRadius: 2, textTransform: 'none' }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckIcon sx={{ fontSize: 15 }} />}
                              disabled={!editValue.trim() || updateMutation.isPending}
                              onClick={() => saveEdit(comment.id)}
                              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                              Guardar
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.25,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: 'text.primary',
                            fontSize: '0.88rem',
                            lineHeight: 1.6,
                          }}
                        >
                          {comment.content}
                        </Typography>
                      )}

                      {/* Acciones (solo autor) */}
                      {isOwn && !isEditing && (
                        <Box sx={{ display: 'flex', gap: 0.25, mt: 0.5 }}>
                          <Tooltip title="Editar comentario">
                            <IconButton size="small" onClick={() => startEdit(comment)} sx={{ p: 0.4 }}>
                              <EditIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar comentario">
                            <IconButton size="small" onClick={() => handleDelete(comment)} sx={{ p: 0.4 }}>
                              <DeleteIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </Stack>
      )}

      <Divider sx={{ mt: 3 }} />
    </Box>
  );
}
