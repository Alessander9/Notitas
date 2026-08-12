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
  Group as GroupIcon,
} from '@mui/icons-material';
import ManageMembersDialog from './ManageMembersDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import ProjectsDashboardSkeleton from './skeletons/ProjectsDashboardSkeleton';
import EmptyState from './EmptyState';
import CoverImage from './CoverImage';
import ProjectFormDialog, { COLOR_OPTIONS, getProjectIcon } from './ProjectFormDialog';
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
function ProjectGridCard({ project, index, onSelect, onEdit, onShare, onDelete, onManageMembers }) {
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
          {project.currentUserRole === 'OWNER' && (project.collaborators?.length ?? 0) > 0 && (
            <Tooltip title="Gestionar miembros" placement="bottom">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageMembers(project);
                }}
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  p: 1,
                  borderRadius: 2,
                  '&:hover': {
                    color: '#fff',
                    bgcolor: 'rgba(139, 92, 246, 0.35)',
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <GroupIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          )}
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
  const [previewUrl, setPreviewUrl] = useState(null);

  // Manage Members Dialog
  const [manageMembersProject, setManageMembersProject] = useState(null);
  const handleOpenManageMembers = (project, e) => {
    e?.stopPropagation();
    setManageMembersProject(project);
  };

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
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveCover = () => {
    setSelectedFile(null);
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
    setPreviewUrl(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = { name, description, color, icon };

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
