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
  Button,
} from '@mui/material';
import {
  RestoreFromTrash as RestoreIcon,
  DeleteForever as PermDeleteIcon,
  Description as NoteIcon,
  DeleteOutline as DeleteOutlineIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import RowsSkeleton from './skeletons/RowsSkeleton';
import EmptyState from './EmptyState';
import InfiniteScroll from './InfiniteScroll';
import { usePaginatedNotes } from '../hooks/usePaginatedNotes';

export default function TrashView() {
  const { setCurrentNote } = useUiStore();
  const queryClient = useQueryClient();

  const { notes: deletedNotes = [], totalCount, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    usePaginatedNotes({
      queryKey: ['notes', 'trash'],
      url: '/notes/deleted',
    });

  // Restore note (set deleted = false)
  const restoreMutation = useMutation({
    mutationFn: async (noteId) => {
      const res = await api.post(`/notes/${noteId}/restore`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
      toast.success('Nota restaurada');
    },
    onError: () => toast.error('No se pudo restaurar la nota'),
  });

  // Restaurar todas las notas de la papelera
  const restoreAllMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notes/deleted/restore-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
      toast.success('Todas las notas restauradas');
    },
    onError: () => toast.error('No se pudieron restaurar las notas'),
  });

  // Vaciar papelera (borrado definitivo de todas)
  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/notes/deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
      toast.success('Papelera vaciada');
    },
    onError: () => toast.error('No se pudo vaciar la papelera'),
  });

  const handleEmptyTrash = () => {
    confirm({
      title: 'Vaciar papelera',
      message: `¿Vaciar la papelera? Se eliminarán permanentemente las ${totalCount} nota${totalCount !== 1 ? 's' : ''} y sus archivos. Esta acción no se puede deshacer.`,
      confirmLabel: 'Vaciar',
      cancelLabel: 'Cancelar',
      color: 'error',
      onConfirm: () => emptyTrashMutation.mutate(),
    });
  };

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
      <Box
        sx={{
          px: { xs: 2, sm: 4 },
          pt: { xs: 2.5, sm: 4 },
          pb: 2,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Papelera de reciclaje
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalCount === 0
              ? 'Las notas eliminadas aparecerán aquí durante un tiempo antes de borrarse definitivamente.'
              : `${totalCount} nota${totalCount !== 1 ? 's' : ''} eliminada${totalCount !== 1 ? 's' : ''}. Puedes restaurarlas todas o vaciar la papelera.`
            }
          </Typography>
        </Box>

        {/* Acciones en bloque */}
        {totalCount > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestoreIcon />}
              onClick={() => restoreAllMutation.mutate()}
              disabled={restoreAllMutation.isPending || emptyTrashMutation.isPending}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Restaurar todo
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={handleEmptyTrash}
              disabled={emptyTrashMutation.isPending || restoreAllMutation.isPending}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Vaciar papelera
            </Button>
          </Box>
        )}
      </Box>

      {/* Deleted Notes List (scroll infinito) */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pb: { xs: 12, sm: 4 } }}>
        {deletedNotes.length > 0 && (
          <InfiniteScroll hasMore={hasNextPage} loading={isFetchingNextPage} onLoadMore={fetchNextPage}>
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
          </InfiniteScroll>
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
