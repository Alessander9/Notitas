import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Chip,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  EditNote as EditNoteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import NoteListSkeleton from './skeletons/NoteListSkeleton';
import CoverImage from './CoverImage';
import AuthorAvatars from './AuthorAvatars';
import MemberProfileDialog from './MemberProfileDialog';
import { getPlainText, getAssetUrl } from '../utils/text';

export default function NoteList() {
  const { currentProjectId, currentNoteId, setCurrentNote, searchQuery } = useUiStore();
  const queryClient = useQueryClient();

  // Determine API endpoint based on selected sidebar view or search
  const isProjectView = typeof currentProjectId === 'number';
  const isFavorites = currentProjectId === 'favorites';
  const isTrash = currentProjectId === 'trash';
  const isSearch = currentProjectId === 'search';

  // Claves de caché consistentes para que las vistas compartan datos:
  // - vista proyecto: misma clave que el hook del sidebar (['notes','project',id])
  // - vista favoritos: misma clave que la sección Destacados (['notes','favorites'])
  const queryKey = isProjectView
    ? ['notes', 'project', currentProjectId]
    : isFavorites
      ? ['notes', 'favorites']
      : isTrash
        ? ['notes', 'trash']
        : ['notes', 'search', searchQuery];

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (isProjectView) {
        const res = await api.get(`/projects/${currentProjectId}/notes`);
        return res.data?.content || res.data || [];
      }
      if (isFavorites) {
        const res = await api.get('/notes/favorites');
        return res.data?.content || res.data || [];
      }
      if (isTrash) {
        const res = await api.get('/notes/deleted');
        return res.data?.content || res.data || [];
      }
      if (isSearch && searchQuery) {
        const res = await api.get(`/notes/search`, { params: { query: searchQuery } });
        return res.data?.content || res.data || [];
      }
      return [];
    },
    enabled: Boolean(currentProjectId),
    // Los favoritos los comparte la sección Destacados: se mantienen frescos
    // para no refetchear al navegar entre Destacados y la vista Favoritos.
    staleTime: isFavorites ? 60_000 : 0,
  });

  // Projects cache (shared with the sidebar) to resolve each note's
  // project color and members (creator + collaborators avatars).
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
  });

  // Create Note Mutation
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/projects/${currentProjectId}/notes`, {
        title: 'Nueva Nota',
        content: '',
      });
      return res.data;
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setCurrentNote(newNote.id);
    },
  });

  // Toggle Favorite Mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, favorite }) => {
      const res = await api.put(`/notes/${id}`, { favorite: !favorite });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Delete note: soft delete (trash) in normal views, permanent delete in trash
  const deleteNoteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/notes/${id}`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (currentNoteId === id) setCurrentNote(null);
    },
  });

  // Restore note from trash
  const restoreNoteMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/notes/${id}`, { deleted: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [profileMember, setProfileMember] = useState(null);

  const getHeaderTitle = () => {
    if (isFavorites) return 'Favoritos';
    if (isTrash) return 'Papelera';
    if (isSearch) return `Búsqueda`;
    if (isProjectView) return 'Notas';
    return 'Notas';
  };

  return (
    <Box
      sx={{
        width: 320,
        height: '100%',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {isLoading ? (
        <NoteListSkeleton />
      ) : (
        <>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
          {getHeaderTitle().toUpperCase()} ({notes.length})
        </Typography>

        {isProjectView && (
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => createNoteMutation.mutate()}
            disabled={createNoteMutation.isPending}
            sx={{ textTransform: 'none', borderRadius: 2, py: 0.5 }}
          >
            Añadir
          </Button>
        )}
      </Box>

      {/* Notes Cards List */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 2 }}>
        {!currentProjectId ? (
          <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary', p: 2 }}>
            <Typography variant="body2">
              Selecciona un proyecto a la izquierda para ver sus notas o crea uno nuevo.
            </Typography>
          </Box>
        ) : notes.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
            <Typography variant="body2">No hay notas.</Typography>
          </Box>
        ) : (
          <AnimatePresence mode="popLayout">
            <Stack spacing={2}>
              {notes.map((note) => {
                const isSelected = currentNoteId === note.id;
                const project = projects.find((p) => p.id === note.projectId);
                const color = project?.color || '#386c5f';
                // Last editor: resolved from the project members (creator + collaborators)
                const members = project ? [project.creator, ...(project.collaborators || [])] : [];
                const lastEditor =
                  note.updatedBy != null ? members.find((m) => m?.id === note.updatedBy) : null;
                const hasCover = Boolean(note.coverImage);
                const coverUrl = hasCover ? getAssetUrl(note.coverImage) : null;

                return (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Card
                      variant="outlined"
                      onClick={() => setCurrentNote(note.id)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: isSelected ? color : 'divider',
                        bgcolor: 'background.paper',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s ease-in-out',
                        boxShadow: isSelected
                          ? `inset 3px 0 0 0 ${color}, 0 2px 12px ${color}26`
                          : '0 1px 3px rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                        position: 'relative',
                        '&:hover .note-card-actions': { opacity: 1, pointerEvents: 'auto', visibility: 'visible' },
                        '&:hover': {
                          boxShadow: isSelected
                            ? `inset 3px 0 0 0 ${color}, 0 6px 20px ${color}33`
                            : `0 6px 20px ${color}22`,
                          borderColor: isSelected ? color : `${color}88`,
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      {/* Accent bar on top for cards without cover */}
                      {!coverUrl && (
                        <Box
                          sx={{
                            height: 3.5,
                            width: '100%',
                            flexShrink: 0,
                            background: `linear-gradient(90deg, ${color}, ${color}66)`,
                          }}
                        />
                      )}

                      {/* Card Cover Image */}
                      {coverUrl && (
                        <Box sx={{ position: 'relative', flexShrink: 0 }}>
                          <CoverImage src={coverUrl} alt={note.title} sx={{ width: '100%', height: 132 }} />
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.18))',
                              pointerEvents: 'none',
                            }}
                          />
                        </Box>
                      )}

                      <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 2.5 } }}>
                        {/* Header with Title and Favorite Star */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            sx={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.95rem',
                              letterSpacing: '-0.01em',
                              color: isSelected ? 'primary.main' : 'text.primary',
                            }}
                          >
                            {note.title || 'Sin Título'}
                          </Typography>

                          {/* Favorite star + hover actions (trash / restore) */}
                          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <Tooltip title={note.favorite ? 'Quitar Favorito' : 'Marcar Favorito'}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavoriteMutation.mutate({ id: note.id, favorite: note.favorite });
                                }}
                                sx={{ p: 0.4, ml: 0.5, flexShrink: 0 }}
                              >
                                {note.favorite ? (
                                  <StarIcon fontSize="small" sx={{ color: '#fbc02d' }} />
                                ) : (
                                  <StarBorderIcon fontSize="small" color="action" />
                                )}
                              </IconButton>
                            </Tooltip>

                            {/* Hover-revealed actions */}
                            <Box
                              className="note-card-actions"
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.2,
                                opacity: 0,
                                pointerEvents: 'none',
                                visibility: 'hidden',
                                transition: 'opacity 0.18s ease, visibility 0.18s',
                              }}
                            >
                              {isTrash ? (
                                <>
                                  <Tooltip title="Restaurar nota">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        restoreNoteMutation.mutate(note.id);
                                      }}
                                      sx={{ p: 0.4, color: 'text.secondary', '&:hover': { color: 'success.main' } }}
                                    >
                                      <RestoreIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Eliminar permanentemente">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(note.id);
                                      }}
                                      sx={{ p: 0.4, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              ) : (
                                <Tooltip title="Mover a Papelera">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNoteMutation.mutate(note.id);
                                    }}
                                    sx={{ p: 0.4, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        </Box>

                        {/* Excerpt */}
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mb: 1.5,
                            fontSize: '0.8rem',
                            lineHeight: 1.5,
                          }}
                        >
                          {getPlainText(note.content, 'Sin contenido...')}
                        </Typography>

                        {/* Tags (soft chips tinted with the project color) */}
                        {note.tags && note.tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', overflow: 'hidden', mb: 1.25 }}>
                            {note.tags.slice(0, 2).map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.62rem',
                                  fontWeight: 600,
                                  borderRadius: '5px',
                                  bgcolor: `${color}1F`,
                                  color: 'text.primary',
                                  '& .MuiChip-label': { px: 0.8 },
                                }}
                              />
                            ))}
                            {note.tags.length > 2 && (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ fontSize: '0.62rem', lineHeight: '18px', fontWeight: 600 }}
                              >
                                +{note.tags.length - 2}
                              </Typography>
                            )}
                          </Box>
                        )}

                        {/* Footer: avatars + last editor + date */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            mt: 'auto',
                            pt: 0.25,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                            <AuthorAvatars
                              creator={project?.creator}
                              collaborators={project?.collaborators}
                              onMemberClick={setProfileMember}
                            />
                            {lastEditor && (
                              <Tooltip title={`Último editor: ${lastEditor.name}`} placement="top">
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.35,
                                    fontSize: '0.65rem',
                                    fontWeight: 500,
                                    minWidth: 0,
                                  }}
                                >
                                  <EditNoteIcon sx={{ fontSize: 13, flexShrink: 0, opacity: 0.7 }} />
                                  <Box
                                    component="span"
                                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  >
                                    {lastEditor.name}
                                  </Box>
                                </Typography>
                              </Tooltip>
                            )}
                          </Box>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem', fontWeight: 500, flexShrink: 0 }}>
                            {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                </motion.div>
              );
            })}
            </Stack>
          </AnimatePresence>
        )}
        </Box>
        </>
      )}

      {/* Member profile (clicked avatar) */}
      {profileMember && (
        <MemberProfileDialog member={profileMember} onClose={() => setProfileMember(null)} />
      )}

      {/* Confirm permanent delete (trash view only) */}
      <Dialog open={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>¿Eliminar nota permanentemente?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta acción es <strong>irreversible</strong>: la nota, su portada y sus archivos adjuntos se borrarán de forma definitiva.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setConfirmDeleteId(null)} color="inherit" sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirmDeleteId) deleteNoteMutation.mutate(confirmDeleteId);
              setConfirmDeleteId(null);
            }}
            sx={{ borderRadius: 2, minWidth: 170 }}
          >
            Eliminar definitivamente
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
