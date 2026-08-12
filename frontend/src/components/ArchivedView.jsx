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
  Unarchive as UnarchiveIcon,
  Description as NoteIcon,
  Inventory2 as ArchiveIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import RowsSkeleton from './skeletons/RowsSkeleton';
import EmptyState from './EmptyState';
import InfiniteScroll from './InfiniteScroll';
import { usePaginatedNotes } from '../hooks/usePaginatedNotes';

/**
 * Vista de notas archivadas: las que el usuario ocultó de sus listas activas
 * (botón "Archivar" del editor). Desde aquí se pueden restaurar (desarchivar).
 */
export default function ArchivedView() {
  const { setCurrentProject, setCurrentNote } = useUiStore();
  const queryClient = useQueryClient();

  const {
    notes: archivedNotes = [],
    totalCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePaginatedNotes({
    queryKey: ['notes', 'archived'],
    url: '/notes/archived',
  });

  // Restaurar nota (archived = false)
  const unarchiveMutation = useMutation({
    mutationFn: async (noteId) => {
      const res = await api.put(`/notes/${noteId}`, { archived: false });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Nota restaurada de archivadas');
    },
    onError: () => toast.error('No se pudo restaurar la nota'),
  });

  const openNote = (note) => {
    setCurrentProject(note.projectId);
    setCurrentNote(note.id);
  };

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
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <ArchiveIcon sx={{ color: 'primary.main', fontSize: 30 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Archivadas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalCount === 0
              ? 'Archiva una nota desde el editor para ocultarla de tus listas sin borrarla.'
              : `${totalCount} nota${totalCount !== 1 ? 's' : ''} archivada${totalCount !== 1 ? 's' : ''}. Puedes restaurarlas cuando quieras.`}
          </Typography>
        </Box>
      </Box>

      {/* Archived Notes List (scroll infinito) */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pb: { xs: 12, sm: 4 } }}>
        {archivedNotes.length > 0 && (
          <InfiniteScroll hasMore={hasNextPage} loading={isFetchingNextPage} onLoadMore={fetchNextPage}>
            <Stack spacing={2}>
              <AnimatePresence mode="popLayout">
                {archivedNotes.map((note) => (
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
                        opacity: 0.88,
                        '&:hover': { opacity: 1, boxShadow: 2 },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                          {/* Note info */}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              minWidth: 0,
                              flexGrow: 1,
                              cursor: 'pointer',
                            }}
                            onClick={() => openNote(note)}
                          >
                            <NoteIcon color="action" sx={{ fontSize: 20, flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body1" fontWeight={600} noWrap>
                                {note.title || 'Sin título'}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                Archivada el{' '}
                                {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
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
                            <Tooltip title="Restaurar (desarchivar)">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => unarchiveMutation.mutate(note.id)}
                                disabled={unarchiveMutation.isPending}
                              >
                                <UnarchiveIcon fontSize="small" />
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
      {archivedNotes.length === 0 && (
        <EmptyState
          icon={<ArchiveIcon />}
          title="No hay notas archivadas"
          description="Cuando archivas una nota, desaparece de tus listas pero no se borra: podrás restaurarla desde aquí en cualquier momento."
        />
      )}
    </Box>
  );
}
