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
  Paper,
  Menu,
  MenuItem,
} from '@mui/material';
import { useLongPress } from '../hooks/useLongPress';
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
  PlayArrow as PlayArrowIcon,
  FileUpload as ImportIcon,
  MoreVert as MoreVertIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import ProjectsDashboardSkeleton from './skeletons/ProjectsDashboardSkeleton';
import EmptyState from './EmptyState';
import CoverImage from './CoverImage';
import ProjectFormDialog from './ProjectFormDialog';
import UniversalNoteImporterModal from './UniversalNoteImporterModal';
import { COLOR_OPTIONS, getProjectIcon, PROJECT_TEMPLATES } from '../constants/projectOptions';
import FavoritesSection from './FavoritesSection';
import CollaboratorsChip from './CollaboratorsChip';
import { useProjectNotes } from '../hooks/useProjectNotes';
import { useTiltHover } from '../hooks/useTiltHover';
import { formatShortDate, getAssetUrl } from '../utils/text';
import { compressImage } from '../utils/imageCompressor';
import { getGenerativeGradient } from '../utils/gradientGenerator';

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
function ProjectGridCard({ project, index, onSelect, onEdit, onShare, onDelete, onLongPress }) {
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useTiltHover(2.5);
  const hasCover = Boolean(project.coverImage);
  const coverUrl = hasCover ? getAssetUrl(project.coverImage) : null;

  const longPressHandlers = useLongPress(
    (e) => onLongPress?.(project, e),
    () => onSelect(project.id),
    { delay: 450 }
  );

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
        {...longPressHandlers}
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
      >
        {coverUrl ? (
          <CoverImage
            src={coverUrl}
            alt={project.name}
            seed={project.name || project.id}
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
              background: getGenerativeGradient(project.name || project.id).background,
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

        {/* Hover / Touch actions overlay */}
        <Box
          className="project-card-actions"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            opacity: { xs: 1, md: 0 },
            pointerEvents: { xs: 'auto', md: 'none' },
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

function ProjectListItemRow({ project, coverUrl, onSelect, onEdit, onShare, onDelete, onLongPress, onOpenMenu }) {
  const longPressHandlers = useLongPress(
    (e) => onLongPress?.(project, e),
    () => onSelect(project.id),
    { delay: 450, moveThreshold: 10 }
  );

  return (
    <Box
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
        {...longPressHandlers}
        sx={{
          borderRadius: 2.5,
          py: 1.4,
          pl: 3.25,
          pr: { xs: 8, sm: 15 },
          display: 'flex',
          alignItems: 'center',
        }}
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
              seed={project.name || project.id}
              sx={{ width: 44, height: 44, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}
            />
          ) : (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                background: getGenerativeGradient(project.name || project.id).background,
                boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontSize: '1.5rem', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}>
                {getProjectIcon(project.icon)}
              </Typography>
            </Box>
          )}
        </ListItemIcon>
        <ListItemText
          primary={project.name}
          secondary={project.description || 'Sin descripción.'}
          primaryTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
          secondaryTypographyProps={{
            noWrap: true,
            sx: { maxWidth: { xs: '180px', sm: '380px' }, fontSize: '0.8rem' },
          }}
        />
        {/* Flecha indicadora de apertura */}
        <ChevronRightIcon
          sx={{
            color: 'text.secondary',
            fontSize: 22,
            opacity: { xs: 0.6, sm: 0.25 },
            flexShrink: 0,
            ml: 'auto',
            mr: { xs: 0.5, sm: 1 },
          }}
        />
      </ListItemButton>

      {/* Botones de acción en escritorio / Menú de 3 puntos en móvil */}
      <Box
        className="project-list-actions"
        sx={{
          position: 'absolute',
          right: { xs: 8, sm: 12 },
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          opacity: { xs: 1, sm: 0 },
          transition: 'opacity 0.2s',
          zIndex: 2,
        }}
      >
        {/* Móvil: Botón compacto de 3 puntos (⋮) */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
          <Tooltip title="Opciones del proyecto">
            <IconButton
              size="small"
              aria-label="Opciones del proyecto"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMenu?.(project, e);
              }}
              sx={{
                p: 0.85,
                borderRadius: 2,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: 'text.secondary',
                '&:hover': { color: 'text.primary', bgcolor: 'action.selected' },
              }}
            >
              <MoreVertIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Escritorio: Botones directos con tooltip */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5 }}>
          <Tooltip title="Compartir proyecto">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onShare(project); }}>
              <ShareIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar proyecto">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar proyecto">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

const DEMO_NOTES = [
  {
    title: '👋 Bienvenido a Notitas',
    content: '<h2>¿Qué podés hacer aquí?</h2><ul><li>Escribir notas con formato rico</li><li>Colaborar con tu equipo</li><li>Organizar por proyectos y etiquetas</li></ul><p>Presioná <code>/</code> en el editor para ver todos los comandos disponibles.</p>',
  },
  {
    title: '✅ Lista de tareas de ejemplo',
    content: '<ul data-type="taskList"><li data-type="taskItem" data-checked="false">Explorar el editor</li><li data-type="taskItem" data-checked="false">Probar el asistente IA (Ctrl+J)</li><li data-type="taskItem" data-checked="false">Invitar a un colaborador</li><li data-type="taskItem" data-checked="true">Crear mi primer proyecto</li></ul>',
  },
  {
    title: '💡 Tips y atajos de teclado',
    content: '<h2>Atajos principales</h2><table><tbody><tr><td><strong>Ctrl+K</strong></td><td>Paleta de comandos</td></tr><tr><td><strong>Ctrl+J</strong></td><td>Asistente IA</td></tr><tr><td><strong>Ctrl+Shift+F</strong></td><td>Modo Zen</td></tr><tr><td><strong>/</strong></td><td>Comandos del editor</td></tr></tbody></table>',
  },
];

export default function ProjectsDashboard() {
  const { setCurrentProject } = useUiStore();
  const queryClient = useQueryClient();
  const firstName = useAuthStore((s) => s.user?.name?.split(' ')[0] || 'Usuario');

  // Local states
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('project-view-mode') || 'list';
  });
  const [filterQuery, setFilterQuery] = useState('');
  const [contextMenuProject, setContextMenuProject] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);

  const handleOpenContextMenu = (project, event) => {
    if (event?.preventDefault) event.preventDefault();
    setContextMenuProject(project);
    if (event?.currentTarget && (!event?.touches || !event?.touches?.length) && (!event?.clientY || (event?.clientX === 0 && event?.clientY === 0))) {
      const rect = event.currentTarget.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 6, left: Math.max(16, rect.right - 180) });
    } else if (event?.touches?.[0]) {
      setMenuPosition({ top: event.touches[0].clientY, left: event.touches[0].clientX });
    } else if (event?.clientY && event?.clientX) {
      setMenuPosition({ top: event.clientY, left: event.clientX });
    } else if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 6, left: Math.max(16, rect.right - 180) });
    } else {
      setMenuPosition({ top: window.innerHeight / 2 - 80, left: window.innerWidth / 2 - 100 });
    }
  };
  
  // Modal states for creating/editing projects
  const [openModal, setOpenModal] = useState(false);
  const [importerModalOpen, setImporterModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState('folder');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('none');

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
      const template = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplate);
      if (template && template.notes.length > 0) {
        for (const note of template.notes) {
          try {
            await api.post(`/projects/${data.id}/notes`, note);
          } catch {
            // non-fatal
          }
        }
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
    try {
      const optimizedFile = await compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85 });
      const formData = new FormData();
      formData.append('file', optimizedFile);
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
    setSelectedTemplate('none');
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

  const createDemoProject = async () => {
    try {
      const res = await api.post('/projects', {
        name: 'Mi primer proyecto',
        description: 'Proyecto de ejemplo para explorar Notitas',
        color: '#386c5f',
      });
      const newProject = res.data;
      for (const note of DEMO_NOTES) {
        try {
          await api.post(`/projects/${newProject.id}/notes`, note);
        } catch {
          // non-fatal
        }
      }
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Proyecto de demo creado');
      setCurrentProject(newProject.id);
    } catch {
      toast.error('No se pudo crear el proyecto de demo');
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100%', p: { xs: 1.5, sm: 3, md: 4 }, pb: { xs: 12, sm: 4 }, overflowY: 'auto' }}>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: { xs: 2.5, sm: 4 }, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' } }}>
            Mis Proyectos
          </Typography>
           <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
             Organiza tus notas, tareas y adjuntos por proyectos
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<ImportIcon sx={{ color: '#0ea5e9' }} />}
            onClick={() => setImporterModalOpen(true)}
            sx={{ borderRadius: 2, py: 1, px: 2, minHeight: 44, fontWeight: 700, textTransform: 'none' }}
          >
            Importar
          </Button>
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
      </Box>

      {/* Featured favorites section */}
      <FavoritesSection projects={projects} projectsLoading={isLoading} />

      {/* Toolbar filters and toggles */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
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
          sx={{ width: { xs: '100%', sm: 'auto' } }}
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
      ) : projects.length === 0 && !filterQuery ? (
        /* Onboarding: usuario sin proyectos */
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: 3, p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              ¡Bienvenido, {firstName}! 👋
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440 }}>
              Notitas es tu espacio de trabajo colaborativo. Creá tu primer proyecto para empezar.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Paper
              onClick={handleOpenCreateModal}
              sx={{
                p: 3,
                width: 220,
                cursor: 'pointer',
                borderRadius: 3,
                border: '2px solid',
                borderColor: 'primary.main',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                transition: 'all 0.2s',
              }}
            >
              <AddIcon sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={700}>Crear proyecto</Typography>
              <Typography variant="caption" color="text.secondary">Empezá desde cero</Typography>
            </Paper>

            <Paper
              onClick={createDemoProject}
              sx={{
                p: 3,
                width: 220,
                cursor: 'pointer',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                transition: 'all 0.2s',
              }}
            >
              <PlayArrowIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={700}>Explorar con demo</Typography>
              <Typography variant="caption" color="text.secondary">Proyecto de ejemplo</Typography>
            </Paper>
          </Box>
        </Box>
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
                onLongPress={handleOpenContextMenu}
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
                <ProjectListItemRow
                  key={project.id}
                  project={project}
                  coverUrl={coverUrl}
                  onSelect={setCurrentProject}
                  onEdit={handleOpenEditModal}
                  onShare={handleShareProject}
                  onDelete={handleDeleteProject}
                  onLongPress={handleOpenContextMenu}
                  onOpenMenu={handleOpenContextMenu}
                />
              );
            })}
          </List>
        </Card>
      )}

      {/* Menú Rápido por Pulsación Larga (Long-Press Haptic Menu) */}
      <Menu
        open={Boolean(contextMenuProject)}
        onClose={() => setContextMenuProject(null)}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 210,
            boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
            border: '1px solid',
            borderColor: 'divider',
            p: 0.5,
          },
        }}
      >
        {contextMenuProject && (
          <>
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: 200 }}>
                {getProjectIcon(contextMenuProject.icon)} {contextMenuProject.name}
              </Typography>
            </Box>
            <MenuItem
              onClick={() => {
                handleOpenEditModal(contextMenuProject);
                setContextMenuProject(null);
              }}
            >
              <ListItemIcon>
                <EditIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText primary="Editar proyecto" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleShareProject(contextMenuProject);
                setContextMenuProject(null);
              }}
            >
              <ListItemIcon>
                <ShareIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText primary="Gestionar colaboradores" />
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={() => {
                handleDeleteProject(contextMenuProject.id);
                setContextMenuProject(null);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'error.main' }}>
                <DeleteIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText primary="Eliminar proyecto" />
            </MenuItem>
          </>
        )}
      </Menu>

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
        selectedTemplate={selectedTemplate}
        onTemplateChange={setSelectedTemplate}
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

      {/* Modal de Importación Universal de Notas */}
      {importerModalOpen && (
        <UniversalNoteImporterModal
          open={importerModalOpen}
          onClose={() => setImporterModalOpen(false)}
        />
      )}
    </Box>
  );
}
