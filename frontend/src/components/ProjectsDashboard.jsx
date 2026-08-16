import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import {
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FolderOpen as FolderOpenIcon,
  Share as ShareIcon,
  Schedule as ScheduleIcon,
  Description as NoteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import ProjectsDashboardSkeleton from './skeletons/ProjectsDashboardSkeleton';
import EmptyState from './EmptyState';
import CoverImage from './CoverImage';
import ProjectFormDialog from './ProjectFormDialog';
import { COLOR_OPTIONS, getProjectIcon } from '../constants/projectOptions';
import FavoritesSection from './FavoritesSection';
import CollaboratorsChip from './CollaboratorsChip';
import { useProjectNotes } from '../hooks/useProjectNotes';
import { useTiltHover } from '../hooks/useTiltHover';
import { formatShortDate, getAssetUrl } from '../utils/text';

// Note count pill used on project cards and list rows
function NoteCountChip({ projectId, color }) {
  const { totalCount, isLoading } = useProjectNotes(projectId);

  return (
    <Tooltip title={`${totalCount} ${totalCount === 1 ? 'nota' : 'notas'}`}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.8,
          py: 0.15,
          borderRadius: '10px',
          fontSize: '0.7rem',
          fontWeight: 700,
          lineHeight: 1.5,
          bgcolor: `${color || '#1976d2'}1A`,
          color: 'text.secondary',
          whiteSpace: 'nowrap',
        }}
      >
        <NoteIcon sx={{ fontSize: 13 }} />
        {isLoading ? '…' : totalCount}
      </Box>
    </Tooltip>
  );
}

// Componente de tarjeta individual para vista cuadrícula
function ProjectGridCard({ project, index, onSelect, onEdit, onShare, onDelete }) {
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useTiltHover(2.5);
  const hasCover = Boolean(project.coverImage);
  const coverUrl = hasCover ? getAssetUrl(project.coverImage) : null;

  return (
    <motion.div
      layout
      layoutId={`dashboard-project-${project.id}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: Math.min(index * 0.045, 0.4) }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        height: '100%',
        rotateX,
        rotateY,
        transformPerspective: 900,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          position: 'relative',
          height: '100%',
          borderRadius: '24px',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          bgcolor: 'background.paper',
          '&:hover': {
            borderColor: `${project.color || '#1976d2'}88`,
            boxShadow: `0 20px 48px ${project.color || '#1976d2'}33`,
            '& .project-card-actions': { opacity: 1, pointerEvents: 'auto' },
          },
        }}
        onClick={() => onSelect(project.id)}
      >
        {coverUrl ? (
          <CoverImage
            src={coverUrl}
            alt={project.name}
            objectFit="contain"
            sx={{
              width: '100%',
              height: 180,
              background: `linear-gradient(135deg, ${project.color || '#1976d2'}1F 0%, transparent 70%)`,
              bgcolor: 'background.paper',
            }}
            zoomOnHover
          />
        ) : (
          <Box
            sx={{
              position: 'relative',
              height: 180,
              background: `linear-gradient(135deg, ${project.color || '#1976d2'} 0%, ${project.color || '#1976d2'}cc 55%, ${project.color || '#1976d2'}66 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -28, right: -20, width: 110, height: 110, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.14)' }} />
            <Box sx={{ position: 'absolute', bottom: -36, left: -24, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.09)' }} />
            <Typography sx={{ position: 'relative', fontSize: '3.1rem', lineHeight: 1, filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.22))' }}>
              {getProjectIcon(project.icon)}
            </Typography>
          </Box>
        )}

        {/* Hover actions overlay */}
        <Box
          className="project-card-actions"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            opacity: 0,
            pointerEvents: 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            bgcolor: 'rgba(15, 15, 35, 0.85)',
            backdropFilter: 'blur(16px) saturate(150%)',
            borderRadius: 3,
            p: 0.5,
            zIndex: 3,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Tooltip title="Compartir proyecto" placement="bottom">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onShare(project);
              }}
              sx={{ 
                color: 'rgba(255,255,255,0.8)', 
                p: 1, 
                borderRadius: 2,
                '&:hover': { 
                  color: '#fff',
                  bgcolor: 'rgba(53, 150, 181, 0.3)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <ShareIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar proyecto" placement="bottom">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              sx={{ 
                color: 'rgba(255,255,255,0.8)', 
                p: 1, 
                borderRadius: 2,
                '&:hover': { 
                  color: '#fff',
                  bgcolor: 'rgba(56, 108, 95, 0.35)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <EditIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Box sx={{ width: 1, height: 18, bgcolor: 'rgba(255,255,255,0.2)', mx: 0.25 }} />
          <Tooltip title="Eliminar proyecto" placement="bottom">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project);
              }}
              sx={{ 
                color: 'rgba(255, 107, 107, 0.8)', 
                p: 1, 
                borderRadius: 2,
                '&:hover': { 
                  color: '#ff6b6b',
                  bgcolor: 'rgba(255, 107, 107, 0.25)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <DeleteIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box sx={{ width: '100%' }}>
            {/* Icon + Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '12px',
                  bgcolor: `${project.color || '#1976d2'}1A`,
                  boxShadow: `0 4px 12px ${project.color || '#1976d2'}26, inset 0 0 0 1px ${project.color || '#1976d2'}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography sx={{ fontSize: '1.45rem', lineHeight: 1 }}>
                  {getProjectIcon(project.icon)}
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={700} noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
                {project.name}
              </Typography>
            </Box>

            {/* Description */}
            {project.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: '2.6em',
                }}
              >
                {project.description}
              </Typography>
            )}
          </Box>

          {/* Footer info: Colaboradores + Total de notas + Fecha */}
          <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <CollaboratorsChip project={project} size="small" />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NoteCountChip projectId={project.id} color={project.color} />
              <Typography variant="caption" color="text.secondary">
                {formatShortDate(project.createdAt)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ProjectsDashboard() {
  const { setCurrentProject } = useUiStore();
  const queryClient = useQueryClient();

  // Local states
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('project-view-mode') || 'list';
  });
  const [filterQuery, setFilterQuery] = useState('');
  
  // Modal states for creating/editing projects
  const [openModal, setOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState('folder');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Project Invite Share Modal
  const [openShareModal, setOpenShareModal] = useState(false);
  const [shareToken, setShareToken] = useState('');
  const [shareProjectName, setShareProjectName] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch Projects from API
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
  });

  // Create Project Mutation
  const createProjectMutation = useMutation({
    mutationFn: async (newProject) => {
      const res = await api.post('/projects', newProject);
      return res.data;
    },
    onSuccess: async (data) => {
      if (selectedFile) {
        await uploadProjectCover(data.id, selectedFile);
      }
      queryClient.invalidateQueries(['projects']);
      handleCloseModal();
      toast.success('Proyecto creado');
    },
    onError: (err) => toast.error(typeof err.response?.data?.message === 'string' ? err.response.data.message : 'No se pudo crear el proyecto'),
  });

  // Update Project Mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/projects/${id}`, data);
      return res.data;
    },
    onSuccess: async (data) => {
      if (selectedFile) {
        await uploadProjectCover(data.id, selectedFile);
      }
      queryClient.invalidateQueries(['projects']);
      handleCloseModal();
      toast.success('Proyecto actualizado');
    },
    onError: (err) => toast.error(typeof err.response?.data?.message === 'string' ? err.response.data.message : 'No se pudo actualizar el proyecto'),
  });

  // Delete Project Mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Proyecto eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el proyecto'),
  });

  const uploadProjectCover = async (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/projects/${projectId}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      console.error('Error uploading project cover', err);
    }
  };

  const handleViewModeChange = (event, nextView) => {
    if (nextView !== null) {
      setViewMode(nextView);
      localStorage.setItem('project-view-mode', nextView);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setOpenModal(true);
  };

  const handleOpenEditModal = (project, e) => {
    e?.stopPropagation();
    setIsEditing(true);
    setSelectedProjectId(project.id);
    setName(project.name);
    setDescription(project.description || '');
    setColor(project.color || COLOR_OPTIONS[0]);
    setIcon(project.icon || 'folder');
    if (project.coverImage) {
      setPreviewUrl(getAssetUrl(project.coverImage));
    } else {
      setPreviewUrl(null);
    }
    setOpenModal(true);
  };

  const handleShareProject = async (project, e) => {
    e?.stopPropagation();
    try {
      const res = await api.post(`/projects/${project.id}/invite-token`);
      setShareToken(res.data.inviteToken);
      setShareProjectName(project.name);
      setCopySuccess(false);
      setOpenShareModal(true);
    } catch (err) {
      console.error('Error generating project invite token', err);
      toast.error('Error al generar el enlace de invitación del proyecto.');
    }
  };

  const handleDeleteProject = (project, e) => {
    e?.stopPropagation();
    confirm({
      title: 'Eliminar Proyecto',
      message: `¿Estás seguro de eliminar el proyecto "${project.name}"? Esta acción borrará todas sus notas asociadas.`,
      confirmText: 'Eliminar',
      confirmColor: 'error',
      onConfirm: () => deleteProjectMutation.mutate(project.id),
    });
  };

  const handleCopyProjectLink = () => {
    const link = `${window.location.origin}/join/project/${shareToken}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    toast.success('Enlace de invitación copiado');
  };

  const handleFileChange = (e) => {
    const file = e.target?.files?.[0] || e;
    if (file) {
      setSelectedFile(file);
      setSelectedMediaUrl(null);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSelectMediaUrl = (url) => {
    setSelectedMediaUrl(url);
    setSelectedFile(null);
    setPreviewUrl(url);
  };

  const handleRemoveCover = () => {
    setSelectedFile(null);
    setSelectedMediaUrl(null);
    const project = projects.find((p) => p.id === selectedProjectId);
    if (isEditing && project?.coverImage) {
      setPreviewUrl(getAssetUrl(project.coverImage));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedProjectId(null);
    setName('');
    setDescription('');
    setColor(COLOR_OPTIONS[0]);
    setIcon('folder');
    setSelectedFile(null);
    setSelectedMediaUrl(null);
    setPreviewUrl(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      description,
      color,
      icon,
      ...(selectedMediaUrl ? { coverImage: selectedMediaUrl } : {}),
    };

    if (isEditing) {
      updateProjectMutation.mutate({ id: selectedProjectId, data: payload });
    } else {
      createProjectMutation.mutate(payload);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const term = filterQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  });

  return (
    <Box sx={{ flexGrow: 1, height: '100%', p: { xs: 2, sm: 4 }, pb: { xs: 12, sm: 4 }, overflowY: 'auto' }}>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Mis Proyectos
          </Typography>
           <Typography variant="body1" color="text.secondary">
             Organiza tus notas, tareas y adjuntos por proyectos
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
           aria-label="Crear un nuevo proyecto"
           sx={{ borderRadius: 2, py: 1, px: 2.5, minHeight: 44, fontWeight: 'bold' }}
        >
          Nuevo Proyecto
        </Button>
      </Box>

      {/* Featured favorites section */}
      <FavoritesSection projects={projects} projectsLoading={isLoading} />

      {/* Toolbar filters and toggles */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Filtrar proyectos..."
          size="small"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
           inputProps={{ 'aria-label': 'Filtrar proyectos' }}
           InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            sx: { borderRadius: 2, bgcolor: 'background.paper', width: { xs: '100%', sm: 280 } },
          }}
        />

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="view mode"
          size="small"
          sx={{ 
            bgcolor: 'background.paper',
            borderRadius: 3,
            p: 0.5,
            gap: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            '& .MuiToggleButton-root': {
              borderRadius: 2.5,
              border: 'none',
              p: 1,
              minWidth: 42,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.2)' : 'rgba(56, 108, 95, 0.1)',
                transform: 'scale(1.08)',
              },
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: '0 4px 12px rgba(56, 108, 95, 0.35)',
                '&:hover': {
                  bgcolor: 'primary.dark',
                  transform: 'scale(1.05)',
                },
              },
            },
          }}
        >
          <ToggleButton value="grid" aria-label="grid view">
            <Tooltip title="Vista Cuadrícula">
              <motion.div
                whileHover={{ rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <GridViewIcon fontSize="small" />
              </motion.div>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <Tooltip title="Vista Lista">
              <motion.div
                whileHover={{ rotate: -5 }}
                whileTap={{ scale: 0.9 }}
              >
                <ListViewIcon fontSize="small" />
              </motion.div>
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Projects Container */}
      {isLoading ? (
        <ProjectsDashboardSkeleton />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<FolderOpenIcon />}
          title={filterQuery ? 'No se encontraron proyectos' : 'No tienes proyectos todavía'}
          description={
            filterQuery
              ? `Ningún proyecto coincide con "${filterQuery}". Prueba con otro término.`
              : 'Crea tu primer proyecto para empezar a organizar tus notas, tareas y adjuntos.'
          }
          actionLabel={!filterQuery ? 'Crea tu primer proyecto' : undefined}
          onAction={!filterQuery ? handleOpenCreateModal : undefined}
        />
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(3, 1fr)',
              xl: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, index) => (
              <ProjectGridCard
                key={project.id}
                project={project}
                index={index}
                onSelect={setCurrentProject}
                onEdit={handleOpenEditModal}
                onShare={handleShareProject}
                onDelete={handleDeleteProject}
              />
            ))}
          </AnimatePresence>
        </Box>
      ) : (
        /* LIST VIEW */
        <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'background.paper', p: 1.25 }}>
          <List component="div" disablePadding>
            {filteredProjects.map((project) => {
              const hasCover = Boolean(project.coverImage);
              const coverUrl = hasCover ? getAssetUrl(project.coverImage) : null;

              return (
                <Box
                  key={project.id}
                  sx={{
                    position: 'relative',
                    borderRadius: 2.5,
                    mb: 0.75,
                    '&:last-of-type': { mb: 0 },
                    '&:hover': { bgcolor: 'action.hover' },
                    '&:hover .project-list-actions': { opacity: 1, pointerEvents: 'auto' },
                  }}
                >
                  <ListItemButton
                    onClick={() => setCurrentProject(project.id)}
                    sx={{ borderRadius: 2.5, py: 1.4, pl: 3.25, pr: 3 }}
                  >
                    {/* Color accent bar */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 32,
                        borderRadius: 2,
                        bgcolor: project.color || '#1976d2',
                      }}
                    />
                    <ListItemIcon sx={{ minWidth: 52 }}>
                      {coverUrl ? (
                        <CoverImage
                          src={coverUrl}
                          alt={project.name}
                          sx={{ width: 44, height: 44, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2.5,
                            bgcolor: `${project.color || '#1976d2'}1A`,
                            boxShadow: `inset 0 0 0 1px ${project.color || '#1976d2'}26`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>
                            {getProjectIcon(project.icon)}
                          </Typography>
                        </Box>
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={project.name}
                      secondary={project.description || 'Sin descripción.'}
                      primaryTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
                      secondaryTypographyProps={{ noWrap: true, maxWidth: '520px', fontSize: '0.8rem' }}
                    />
                    <Box sx={{ mr: 4, display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
                      <NoteCountChip projectId={project.id} color={project.color} />
                      <CollaboratorsChip project={project} />
                      <Tooltip title="Última actividad">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <ScheduleIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.disabled">
                            {formatShortDate(project.updatedAt || project.createdAt)}
                          </Typography>
                        </Box>
                      </Tooltip>

                      {/* Avatars in List View */}
                      <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.65rem' } }}>
                        {project.creator && (
                          <Tooltip title={`Creador: ${project.creator.name}`}>
                            <Avatar
                              alt={project.creator.name}
                              src={getAssetUrl(project.creator.avatar)}
                              sx={{ border: `2px solid ${project.color || '#1976d2'} !important` }}
                            />
                          </Tooltip>
                        )}
                        {project.collaborators && project.collaborators.map((collab) => (
                          <Tooltip key={collab.id} title={`Colaborador: ${collab.name}`}>
                            <Avatar
                              alt={collab.name}
                              src={getAssetUrl(collab.avatar)}
                            />
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    </Box>
                  </ListItemButton>

                  {/* Hover actions overlay */}
                  <Box
                    className="project-list-actions"
                    sx={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      opacity: 0,
                      pointerEvents: 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(26, 26, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      p: 0.5,
                      zIndex: 2,
                    }}
                  >
                    <Tooltip title="Compartir" placement="top">
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleShareProject(project, e)} 
                        sx={{ 
                          p: 1, 
                          color: 'text.secondary', 
                          borderRadius: 2,
                          '&:hover': { 
                            color: 'info.main', 
                            bgcolor: 'rgba(53, 150, 181, 0.12)',
                            transform: 'scale(1.1)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <ShareIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar" placement="top">
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleOpenEditModal(project, e)} 
                        sx={{ 
                          p: 1, 
                          color: 'text.secondary', 
                          borderRadius: 2,
                          '&:hover': { 
                            color: 'primary.main', 
                            bgcolor: 'rgba(56, 108, 95, 0.12)',
                            transform: 'scale(1.1)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Box sx={{ width: 1, height: 20, bgcolor: 'divider', mx: 0.25 }} />
                    <Tooltip title="Eliminar" placement="top">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirm({
                            title: 'Eliminar proyecto',
                            message: `¿Eliminar proyecto "${project.name}" y sus notas? Esta acción no se puede deshacer.`,
                            confirmLabel: 'Eliminar',
                            cancelLabel: 'Cancelar',
                            color: 'error',
                            onConfirm: () => deleteProjectMutation.mutate(project.id),
                          });
                        }}
                        sx={{ 
                          p: 1, 
                          color: 'text.secondary', 
                          borderRadius: 2,
                          '&:hover': { 
                            color: 'error.main', 
                            bgcolor: 'rgba(239, 68, 68, 0.12)',
                            transform: 'scale(1.1)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </List>
        </Card>
      )}

      {/* Project Creation/Edition Modal */}
      <ProjectFormDialog
        open={openModal}
        onClose={handleCloseModal}
        isEditing={isEditing}
        name={name}
        onNameChange={setName}
        description={description}
        onDescriptionChange={setDescription}
        color={color}
        onColorChange={setColor}
        icon={icon}
        onIconChange={setIcon}
        previewUrl={previewUrl}
        onFileChange={handleFileChange}
        onSelectMediaUrl={handleSelectMediaUrl}
        onRemoveCover={handleRemoveCover}
        canRemoveCover={!isEditing || Boolean(selectedFile) || Boolean(selectedMediaUrl)}
        isPending={createProjectMutation.isPending || updateProjectMutation.isPending}
        onSubmit={handleSave}
      />

      {/* Project Share Dialog */}
      <Dialog open={openShareModal} onClose={() => setOpenShareModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Invitar Colaboradores a "{shareProjectName}"</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Cualquier usuario registrado que acceda a este enlace se unirá como colaborador al proyecto y podrá editar y crear notas de forma compartida.
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={`${window.location.origin}/join/project/${shareToken}`}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleCopyProjectLink}
                  sx={{ ml: 1, minWidth: 100 }}
                >
                  {copySuccess ? 'Copiado!' : 'Copiar'}
                </Button>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenShareModal(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
