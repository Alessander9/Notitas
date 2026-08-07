import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  RestoreFromTrash as RestoreIcon,
  DeleteForever as PermDeleteIcon,
  Description as NoteIcon,
  DeleteOutline as DeleteOutlineIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import RowsSkeleton from './skeletons/RowsSkeleton';
import EmptyState from './EmptyState';

export default function TrashView() {
  const { setCurrentNote } = useUiStore();
  const queryClient = useQueryClient();

  const { data: deletedNotes = [], isLoading } = useQuery({
    queryKey: ['notes', 'trash'],
    queryFn: async () => {
      const res = await api.get('/notes/deleted');
      return res.data?.content || res.data || [];
    },
  });

  // Restore note (set deleted = false)
  const restoreMutation = useMutation({
    mutationFn: async (noteId) => {
      const res = await api.put(`/notes/${noteId}`, { deleted: false });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
      toast.success('Nota restaurada');
    },
    onError: () => toast.error('No se pudo restaurar la nota'),
  });

  // Permanently delete note
  const permDeleteMutation = useMutation({
    mutationFn: async (noteId) => {
      await api.delete(`/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
      toast.success('Nota eliminada definitivamente');
    },
    onError: () => toast.error('No se pudo eliminar la nota'),
  });

  if (isLoading) {
    return (
      <Box sx={{ flexGrow: 1, height: '100%', overflowY: 'auto', px: { xs: 2, sm: 4 }, pt: 4 }}>
        <RowsSkeleton />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: { xs: 2.5, sm: 4 }, pb: 2 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Papelera de reciclaje
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {deletedNotes.length === 0
            ? 'Las notas eliminadas aparecerán aquí durante un tiempo antes de borrarse definitivamente.'
            : `${deletedNotes.length} nota${deletedNotes.length !== 1 ? 's' : ''} eliminada${deletedNotes.length !== 1 ? 's' : ''}. Las notas se eliminan permanentemente al hacer clic en "Eliminar definitivamente".`
          }
        </Typography>
      </Box>

      {/* Deleted Notes List */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pb: { xs: 12, sm: 4 } }}>
        {deletedNotes.length > 0 && (
          <Stack spacing={2}>
            <AnimatePresence mode="popLayout">
              {deletedNotes.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      opacity: 0.85,
                      '&:hover': { opacity: 1, boxShadow: 2 },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        {/* Note info */}
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flexGrow: 1, cursor: 'pointer' }}
                          onClick={() => setCurrentNote(note.id)}
                        >
                          <NoteIcon color="action" sx={{ fontSize: 20, flexShrink: 0 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body1" fontWeight={600} noWrap>
                              {note.title || 'Sin título'}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              Eliminada el {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Tags */}
                        {note.tags && note.tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                            {note.tags.slice(0, 3).map((tag) => (
                              <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                            ))}
                          </Box>
                        )}

                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          <Tooltip title="Restaurar nota">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => restoreMutation.mutate(note.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar definitivamente">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                confirm({
                                  title: 'Eliminar definitivamente',
                                  message: `¿Eliminar "${note.title || 'Sin título'}" permanentemente? Esta acción no se puede deshacer.`,
                                  confirmLabel: 'Eliminar',
                                  cancelLabel: 'Cancelar',
                                  color: 'error',
                                  onConfirm: () => permDeleteMutation.mutate(note.id),
                                });
                              }}
                              disabled={permDeleteMutation.isPending}
                            >
                              <PermDeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </Stack>
        )}
      </Box>

      {/* Estado vacío ilustrado */}
      {deletedNotes.length === 0 && (
        <EmptyState
          icon={<DeleteOutlineIcon />}
          title="La papelera está vacía"
          description="Cuando elimines una nota, podrás restaurarla desde aquí antes de que se borre definitivamente."
        />
      )}
    </Box>
  );
}
