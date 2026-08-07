import React from 'react';
import {
  Box,
  Typography,
  Button,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Star as StarIcon,
  ChevronRight as ChevronRightIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import CoverImage from './CoverImage';
import { getProjectIcon } from './ProjectFormDialog';
import CollaboratorsChip from './CollaboratorsChip';
import { getPlainText, formatShortDate, getAssetUrl } from '../utils/text';

export default function FavoritesSection({ projects, projectsLoading }) {
  const { setCurrentProject, setCurrentNote } = useUiStore();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['notes', 'favorites'],
    queryFn: async () => {
      const res = await api.get('/notes/favorites');
      return res.data?.content || res.data || [];
    },
    // Comparte la caché con la vista Favoritos del sidebar (misma clave);
    // este staleTime evita refetchear al entrar en la vista Favoritos.
    staleTime: 60_000,
  });

  // Soft delete (moves the note to trash)
  const deleteFavoriteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/notes/${id}`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Nota movida a la papelera', {
        duration: 6000,
        action: {
          label: 'Deshacer',
          onClick: () => {
            api
              .put(`/notes/${id}`, { deleted: false })
              .then(() => queryClient.invalidateQueries({ queryKey: ['notes'] }))
              .catch(() => {});
          },
        },
      });
    },
    onError: () => toast.error('No se pudo eliminar la nota'),
  });

  if (isLoading || projectsLoading || favorites.length === 0) return null;

  const openNote = (note) => {
    setCurrentProject(note.projectId);
    setCurrentNote(note.id);
  };

  return (
    <Box sx={{ mb: 3.5 }}>
      {/* Section header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <StarIcon sx={{ color: '#fbc02d', fontSize: 22 }} />
        <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
          Destacados
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          endIcon={<ChevronRightIcon />}
          onClick={() => setCurrentProject('favorites')}
          sx={{ textTransform: 'none', fontWeight: 600, color: 'primary.main' }}
        >
          Ver todos ({favorites.length})
        </Button>
      </Box>

      {/* Horizontal filmstrip of favorite note cards */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 1.5,
          pt: 0.5,
          px: 0.5,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: 8 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { 
            background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', 
            borderRadius: 4,
            '&:hover': {
              background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
            },
          },
          // Sombra sutil a los lados para indicar que hay más contenido
          maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
        }}
      >
        {favorites.map((note) => {
          const project = projects.find((p) => p.id === note.projectId);
          const color = project?.color || '#1976d2';
          const hasCover = Boolean(note.coverImage);
          const coverUrl = hasCover ? getAssetUrl(note.coverImage) : null;

          return (
            <Box
              key={note.id}
              onClick={() => openNote(note)}
              sx={{
                position: 'relative',
                flex: '0 0 260px',
                scrollSnapAlign: 'start',
                borderRadius: 3,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  borderColor: `${color}88`,
                  boxShadow: `0 12px 28px ${color}26`,
                },
                '&:hover .fav-card-actions': { opacity: 1, pointerEvents: 'auto', visibility: 'visible' },
              }}
            >
              {/* Hover actions: move to trash */}
              <Box
                className="fav-card-actions"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 2,
                  display: 'flex',
                  gap: 0.3,
                  opacity: 0,
                  pointerEvents: 'none',
                  visibility: 'hidden',
                  transition: 'opacity 0.18s ease, visibility 0.18s',
                }}
              >
                <Tooltip title="Mover a Papelera">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFavoriteMutation.mutate(note.id);
                    }}
                    sx={{
                      bgcolor: 'rgba(15,15,35,0.6)',
                      color: '#fff',
                      backdropFilter: 'blur(6px)',
                      '&:hover': { bgcolor: 'error.main' },
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Cover */}
              {coverUrl ? (
                <CoverImage src={coverUrl} alt={note.title} sx={{ width: '100%', height: 100 }} zoomOnHover />
              ) : (
                <Box
                  sx={{
                    position: 'relative',
                    height: 100,
                    background: `linear-gradient(135deg, ${color} 0%, ${color}cc 55%, ${color}66 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ position: 'absolute', top: -24, right: -16, width: 90, height: 90, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.14)' }} />
                  <StarIcon
                    sx={{
                      fontSize: 44,
                      color: 'rgba(255,255,255,0.9)',
                      filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.25))',
                      position: 'relative',
                    }}
                  />
                </Box>
              )}

              {/* Body */}
              <Box sx={{ p: 1.8, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <Typography fontWeight={700} noWrap sx={{ fontSize: '0.9rem', mb: 0.5 }}>
                  {note.title || 'Sin título'}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    fontSize: '0.75rem',
                    lineHeight: 1.45,
                    mb: 1.5,
                    flexGrow: 1,
                  }}
                >
                  {getPlainText(note.content, 'Sin contenido.')}
                </Typography>

                {/* Footer: project chip + members + date */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                    <Tooltip title={project?.name || 'Proyecto'}>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.6,
                          px: 0.9,
                          py: 0.3,
                          borderRadius: '10px',
                          bgcolor: `${color}1A`,
                          minWidth: 0,
                        }}
                      >
                        <Typography sx={{ fontSize: '0.85rem', lineHeight: 1 }}>{getProjectIcon(project?.icon)}</Typography>
                        <Typography noWrap sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>
                          {project?.name || 'Proyecto'}
                        </Typography>
                      </Box>
                    </Tooltip>
                    {project && <CollaboratorsChip project={project} />}
                  </Box>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', flexShrink: 0 }}>
                    {formatShortDate(note.updatedAt || note.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
