import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Star as StarIcon,
  Delete as DeleteIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import CoverImage from './CoverImage';
import AuthorAvatars from './AuthorAvatars';
import MemberProfileDialog from './MemberProfileDialog';
import EmptyState from './EmptyState';
import CardsGridSkeleton from './skeletons/CardsGridSkeleton';
import { getProjectIcon } from './ProjectFormDialog';
import { getPlainText, formatShortDate, getAssetUrl } from '../utils/text';

export default function FavoritesView() {
  const { setCurrentProject, setCurrentNote } = useUiStore();
  const queryClient = useQueryClient();
  const [profileMember, setProfileMember] = useState(null);

  // Comparte la caché con la sección Destacados del dashboard (misma clave)
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['notes', 'favorites'],
    queryFn: async () => {
      const res = await api.get('/notes/favorites');
      return res.data?.content || res.data || [];
    },
    staleTime: 60_000,
  });

  // Proyectos (caché compartida con el sidebar) para color/icono/miembros
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
  });

  const unfavoriteMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/notes/${id}`, { favorite: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.info('Nota quitada de favoritas');
    },
    onError: () => toast.error('No se pudo actualizar la nota'),
  });

  const trashMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Nota movida a la papelera');
    },
    onError: () => toast.error('No se pudo eliminar la nota'),
  });

  const openNote = (note) => {
    setCurrentProject(note.projectId);
    setCurrentNote(note.id);
  };

  if (isLoading) {
    return (
      <Box sx={{ flexGrow: 1, height: '100%', bgcolor: 'background.paper', overflowY: 'auto', pt: 4 }}>
        <CardsGridSkeleton />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100%', bgcolor: 'background.paper', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: { xs: 2.5, sm: 4 }, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <StarIcon sx={{ color: '#fbc02d', fontSize: 30 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Favoritos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {favorites.length === 0
              ? 'Marca una nota con la estrella ⭐ para encontrarla aquí.'
              : `${favorites.length} nota${favorites.length !== 1 ? 's' : ''} favorita${favorites.length !== 1 ? 's' : ''}.`}
          </Typography>
        </Box>
      </Box>

      {/* Grid of favorite cards */}
      <Box
        sx={{
          px: { xs: 2, sm: 4 },
          pb: 4,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 2,
        }}
      >
        <AnimatePresence mode="popLayout">
          {favorites.map((note) => {
            const project = projects.find((p) => p.id === note.projectId);
            const color = project?.color || '#386c5f';
            const coverUrl = getAssetUrl(note.coverImage);

            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <Card
                  variant="outlined"
                  onClick={() => openNote(note)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      borderColor: `${color}88`,
                      boxShadow: `0 10px 26px ${color}26`,
                    },
                    '&:hover .fav-view-actions': { opacity: 1, pointerEvents: 'auto', visibility: 'visible' },
                  }}
                >
                  {/* Cover / gradient header */}
                  <Box sx={{ position: 'relative', height: 110, flexShrink: 0 }}>
                    {coverUrl ? (
                      <CoverImage src={coverUrl} alt={note.title} sx={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Box
                        sx={{
                          position: 'relative',
                          height: '100%',
                          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 55%, ${color}66 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <Box sx={{ position: 'absolute', top: -26, right: -18, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.14)' }} />
                        <StarIcon sx={{ fontSize: 44, color: 'rgba(255,255,255,0.9)', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.25))', position: 'relative' }} />
                      </Box>
                    )}
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.2))',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Hover actions */}
                    <Box
                      className="fav-view-actions"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 0.4,
                        opacity: 0,
                        pointerEvents: 'none',
                        visibility: 'hidden',
                        transition: 'opacity 0.18s ease, visibility 0.18s',
                      }}
                    >
                      <Tooltip title="Quitar de favoritas">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            unfavoriteMutation.mutate(note.id);
                          }}
                          sx={{ bgcolor: 'rgba(15,15,35,0.6)', color: '#fbc02d', backdropFilter: 'blur(6px)', '&:hover': { bgcolor: 'rgba(15,15,35,0.85)' } }}
                        >
                          <StarIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Mover a papelera">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            trashMutation.mutate(note.id);
                          }}
                          sx={{ bgcolor: 'rgba(15,15,35,0.6)', color: '#fff', backdropFilter: 'blur(6px)', '&:hover': { bgcolor: 'error.main' } }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Body */}
                  <CardContent sx={{ p: 2.2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography fontWeight={700} noWrap sx={{ fontSize: '0.95rem', mb: 0.5 }}>
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
                        fontSize: '0.78rem',
                        lineHeight: 1.5,
                        mb: 1.5,
                        flexGrow: 1,
                      }}
                    >
                      {getPlainText(note.content, 'Sin contenido.')}
                    </Typography>

                    {/* Footer: project chip + avatars + date */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Tooltip title={project?.name || 'Proyecto'}>
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 0.8,
                              py: 0.25,
                              borderRadius: '10px',
                              bgcolor: `${color}1A`,
                              minWidth: 0,
                            }}
                          >
                            <Typography sx={{ fontSize: '0.8rem', lineHeight: 1 }}>{getProjectIcon(project?.icon)}</Typography>
                            <Typography noWrap sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary' }}>
                              {project?.name || 'Proyecto'}
                            </Typography>
                          </Box>
                        </Tooltip>
                        <AuthorAvatars
                          creator={project?.creator}
                          collaborators={project?.collaborators}
                          size={20}
                          onMemberClick={setProfileMember}
                        />
                      </Box>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.66rem', flexShrink: 0 }}>
                        {formatShortDate(note.updatedAt || note.createdAt)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </Box>

      {/* Empty state */}
      {favorites.length === 0 && (
        <Box sx={{ px: { xs: 2, sm: 4 }, pb: 4 }}>
          <EmptyState
            icon={<StarBorderIcon />}
            title="No hay notas favoritas todavía"
            description="Abre una nota y pulsa la estrella ⭐ (en el editor o en su tarjeta) para guardarla aquí y tenerla siempre a mano."
            color="#fbc02d"
          />
        </Box>
      )}

      {/* Member profile (clicked avatar) */}
      {profileMember && (
        <MemberProfileDialog member={profileMember} onClose={() => setProfileMember(null)} />
      )}
    </Box>
  );
}
