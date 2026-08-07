import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Star as StarIcon,
  DeleteOutline as TrashIcon,
  GridView as DashboardIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  ViewStream as ViewStreamIcon,
  ViewDay as ViewDayIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import SidebarSkeleton from './skeletons/SidebarSkeleton';
import ProjectFormDialog, { COLOR_OPTIONS } from './ProjectFormDialog';
import SidebarProjectItem from './SidebarProjectItem';
import { getAssetUrl } from '../utils/text';
import logoImage from '../assets/logo notitas.png';

export default function Sidebar({ embedded = false }) {
  const { currentProjectId, setCurrentNote, setCurrentProject, setSidebarMobileOpen } = useUiStore();
  const queryClient = useQueryClient();

  // Sidebar Collapse state (persisted in localStorage). Declarado ANTES de
  // effectiveCollapsed: usarlo antes de su declaración lanzaba un
  // ReferenceError (TDZ) que rompía la app en escritorio.
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // En el drawer móvil el sidebar siempre está expandido y sin toggle de colapso
  const effectiveCollapsed = embedded ? false : isCollapsed;

  const selectAndClose = (id) => {
    setCurrentProject(id);
    if (embedded) setSidebarMobileOpen(false);
  };

  // Set of project ids with their notes expanded in the sidebar (persisted)
  const [expandedProjects, setExpandedProjects] = useState(() => {
    try {
      const stored = localStorage.getItem('sidebar-expanded-projects');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist expanded projects so they survive page reloads
  useEffect(() => {
    localStorage.setItem('sidebar-expanded-projects', JSON.stringify([...expandedProjects]));
  }, [expandedProjects]);

  // Expand behavior: 'multiple' (several open at once) or 'accordion' (only one)
  const [expandMode, setExpandMode] = useState(() => {
    return localStorage.getItem('sidebar-expand-mode') || 'multiple';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-expand-mode', expandMode);
  }, [expandMode]);

  const handleToggleExpandMode = () => {
    setExpandMode((prev) => (prev === 'accordion' ? 'multiple' : 'accordion'));
  };

  const [openModal, setOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState('folder');
  const [selectedFile, setSelectedFile] = useState(null);
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

  // Pinned projects state (persisted in localStorage)
  const [pinnedProjects, setPinnedProjects] = useState(() => {
    try {
      const stored = localStorage.getItem('pinned-projects');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const togglePinProject = (projectId) => {
    setPinnedProjects((prev) => {
      const next = prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId];
      localStorage.setItem('pinned-projects', JSON.stringify(next));
      return next;
    });
  };

  // All projects shown in the sidebar, pinned first
  const allProjects = [...projects]
    .sort((a, b) => {
      const aPinned = pinnedProjects.includes(a.id);
      const bPinned = pinnedProjects.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });

  const toggleProject = (id) => {
    setExpandedProjects((prev) => {
      // Accordion mode: expanding one project collapses all the others
      if (expandMode === 'accordion' && !prev.has(id)) {
        return new Set([id]);
      }
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Create Note Mutation (used by SidebarProjectItem "Crear nota" button)
  const createNoteMutation = useMutation({
    mutationFn: async (projectId) => {
      const res = await api.post(`/projects/${projectId}/notes`, {
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
      setCurrentProject(data.id);
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
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries(['projects']);
      if (currentProjectId === deletedId) {
        setCurrentProject(null);
      }
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

  const handleToggleCollapse = () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    localStorage.setItem('sidebar-collapsed', String(nextCollapsed));
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setOpenModal(true);
    if (embedded) setSidebarMobileOpen(false);
  };

  // Abre el diálogo de nuevo proyecto desde fuera (FAB móvil / command palette)
  useEffect(() => {
    const openCreate = () => handleOpenCreateModal();
    window.addEventListener('notitas:new-project', openCreate);
    return () => window.removeEventListener('notitas:new-project', openCreate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenEditModal = (project, e) => {
    e.stopPropagation();
    if (embedded) setSidebarMobileOpen(false);
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

  const handleShareProject = async (project, e) => {
    e.stopPropagation();
    if (embedded) setSidebarMobileOpen(false);
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

  const handleCopyProjectLink = () => {
    const link = `${window.location.origin}/join/project/${shareToken}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    toast.success('Enlace de invitación copiado');
  };

// Animaciones staggered para items de navegación
const navItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.1 + i * 0.06,
      type: 'spring',
      stiffness: 250,
      damping: 22,
    },
  }),
};

// Variantes para la sección de proyectos
const sectionVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// Variantes para items de lista de notas
const noteItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.2,
    },
  }),
};

  return (
    <Box
      sx={{
        width: embedded ? '100%' : effectiveCollapsed ? 72 : 300,
        minWidth: embedded ? '100%' : effectiveCollapsed ? 72 : 300,
        height: '100%',
        flexShrink: 0,
        borderRight: embedded ? 'none' : '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(26, 26, 53, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        // Safe area para dispositivos con notch (iPhone)
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {isLoading ? (
        <SidebarSkeleton collapsed={effectiveCollapsed} />
      ) : (
        <>
      {/* Sidebar Collapse Toggle & Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: effectiveCollapsed ? 'center' : 'space-between',
            p: embedded ? 2 : 1.5,
            px: embedded ? 2.5 : 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            minHeight: '56px',
          }}
        >
          {!effectiveCollapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Logo oficial de Notitas */}
              {embedded && (
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={logoImage}
                    alt="Notitas Logo"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 4px rgba(56,108,95,0.25))',
                    }}
                  />
                </Box>
              )}
              <Typography
                variant="subtitle2"
                fontWeight={800}
                color="text.secondary"
                sx={{
                  letterSpacing: '0.5px',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                }}
              >
                {embedded ? 'Notitas' : 'NAVEGACIÓN'}
              </Typography>
            </Box>
          )}
          {!embedded && (
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton size="small" onClick={handleToggleCollapse} sx={{ borderRadius: 1.5 }}>
                {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            </motion.div>
          )}
          {embedded && (
            <Tooltip title="Cerrar menú">
              <motion.div whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}>
                <IconButton
                  size="small"
                  onClick={() => setSidebarMobileOpen(false)}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    '&:hover': {
                      bgcolor: 'error.main',
                      color: '#fff',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </motion.div>
            </Tooltip>
          )}
        </Box>
      </motion.div>

      {/* Action Button: Nuevo Proyecto */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 200 }}
      >
        <Box sx={{ p: effectiveCollapsed ? 1.5 : 2, px: effectiveCollapsed ? 1.5 : 2.5, display: 'flex', justifyContent: 'center' }}>
          {effectiveCollapsed ? (
            <Tooltip title="Nuevo Proyecto" placement="right">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <IconButton
                  color="primary"
                  variant="contained"
                  onClick={handleOpenCreateModal}
                  sx={{
                    background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
                    color: '#fff',
                    width: 44,
                    height: 44,
                    boxShadow: '0 4px 14px rgba(56, 108, 95, 0.35)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #6a968c 0%, #386c5f 100%)',
                      boxShadow: '0 6px 20px rgba(56, 108, 95, 0.45)',
                    },
                    transition: 'all 0.25s ease',
                  }}
                >
                  <AddIcon sx={{ fontSize: 24 }} />
                </IconButton>
              </motion.div>
            </Tooltip>
          ) : (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ width: '100%' }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateModal}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 1.2,
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
                  boxShadow: '0 4px 16px rgba(56, 108, 95, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #6a968c 0%, #386c5f 100%)',
                    boxShadow: '0 6px 24px rgba(56, 108, 95, 0.4)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.25s ease',
                }}
              >
                Nuevo Proyecto
              </Button>
            </motion.div>
          )}
        </Box>
      </motion.div>

      <Divider />

      {/* Primary Navigation */}
      <List dense sx={{ px: 1.5, py: 1 }}>
        {/* Navigation Option: Dashboard */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <motion.div custom={0} variants={navItemVariants} initial="hidden" animate="visible" style={{ width: '100%' }}>
            <Tooltip title={effectiveCollapsed ? "Panel de Proyectos" : ""} placement="right">
              <ListItemButton
                selected={currentProjectId === null}
                onClick={() => selectAndClose(null)}
                sx={{
                  borderRadius: 2.5,
                  justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                  px: effectiveCollapsed ? 0 : 2,
                  minHeight: 44,
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.15)' : 'rgba(56, 108, 95, 0.1)',
                    '&:hover': {
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.2)' : 'rgba(56, 108, 95, 0.15)',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, justifyContent: 'center' }}>
                  <DashboardIcon sx={{ color: currentProjectId === null ? 'primary.main' : 'action.active', fontSize: 22 }} />
                </ListItemIcon>
                {!effectiveCollapsed && <ListItemText primary="Panel de Proyectos" primaryTypographyProps={{ fontWeight: currentProjectId === null ? 700 : 500, fontSize: '0.88rem' }} />}
              </ListItemButton>
            </Tooltip>
          </motion.div>
        </ListItem>

        {/* Navigation Option: Favorites */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <motion.div custom={1} variants={navItemVariants} initial="hidden" animate="visible" style={{ width: '100%' }}>
            <Tooltip title={effectiveCollapsed ? "Favoritos" : ""} placement="right">
              <ListItemButton
                selected={currentProjectId === 'favorites'}
                onClick={() => selectAndClose('favorites')}
                sx={{
                  borderRadius: 2.5,
                  justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                  px: effectiveCollapsed ? 0 : 2,
                  minHeight: 44,
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(251, 192, 45, 0.12)' : 'rgba(251, 192, 45, 0.1)',
                    '&:hover': {
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(251, 192, 45, 0.18)' : 'rgba(251, 192, 45, 0.15)',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, justifyContent: 'center' }}>
                  <StarIcon sx={{ color: currentProjectId === 'favorites' ? '#fbc02d' : 'action.active', fontSize: 22 }} />
                </ListItemIcon>
                {!effectiveCollapsed && <ListItemText primary="Favoritos" primaryTypographyProps={{ fontWeight: currentProjectId === 'favorites' ? 700 : 500, fontSize: '0.88rem' }} />}
              </ListItemButton>
            </Tooltip>
          </motion.div>
        </ListItem>

        {/* Navigation Option: Trash */}
        <ListItem disablePadding>
          <motion.div custom={2} variants={navItemVariants} initial="hidden" animate="visible" style={{ width: '100%' }}>
            <Tooltip title={effectiveCollapsed ? "Papelera" : ""} placement="right">
              <ListItemButton
                selected={currentProjectId === 'trash'}
                onClick={() => selectAndClose('trash')}
                sx={{
                  borderRadius: 2.5,
                  justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                  px: effectiveCollapsed ? 0 : 2,
                  minHeight: 44,
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                    '&:hover': {
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.12)',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, justifyContent: 'center' }}>
                  <TrashIcon sx={{ color: currentProjectId === 'trash' ? 'error.main' : 'action.active', fontSize: 22 }} />
                </ListItemIcon>
                {!effectiveCollapsed && <ListItemText primary="Papelera" primaryTypographyProps={{ fontWeight: currentProjectId === 'trash' ? 700 : 500, fontSize: '0.88rem' }} />}
              </ListItemButton>
            </Tooltip>
          </motion.div>
        </ListItem>
      </List>

      <Divider sx={{ my: 1 }} />

      {/* Projects Title Header */}
      {!effectiveCollapsed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography
              variant="caption"
              fontWeight={800}
              color="text.secondary"
              sx={{
                letterSpacing: '0.8px',
                fontSize: '0.68rem',
                textTransform: 'uppercase',
              }}
            >
              PROYECTOS ({projects.length})
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title={expandMode === 'accordion' ? 'Permitir expandir varios proyectos a la vez' : 'Modo acordeón: solo un proyecto abierto a la vez'}>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <IconButton
                    size="small"
                    onClick={handleToggleExpandMode}
                    sx={{
                      p: 0.5,
                      color: 'text.secondary',
                      borderRadius: 1.5,
                      transition: 'all 0.2s ease',
                      '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                    }}
                  >
                    {expandMode === 'accordion' ? <ViewStreamIcon sx={{ fontSize: 16 }} /> : <ViewDayIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </motion.div>
              </Tooltip>
            </Box>
          </Box>
        </motion.div>
      )}

      {/* Projects List (ordered by most recent activity) */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, pb: 2 }}>
        {projects.length === 0 ? (
          !effectiveCollapsed && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No tienes proyectos aún.
              </Typography>
            </Box>
          )
        ) : (
          <List dense disablePadding>
            {allProjects.map((project) => (
              <SidebarProjectItem
                key={project.id}
                project={project}
                isSelected={currentProjectId === project.id}
                isCollapsed={effectiveCollapsed}
                expanded={expandedProjects.has(project.id)}
                onToggleExpand={() => toggleProject(project.id)}
                onSelect={() => selectAndClose(project.id)}
                onOpenNote={(p, note) => {
                  setCurrentProject(p.id);
                  setCurrentNote(note.id);
                  if (embedded) setSidebarMobileOpen(false);
                }}
                onShare={handleShareProject}
                onEdit={handleOpenEditModal}
                onDelete={(p, e) => {
                  e.stopPropagation();
                  confirm({
                    title: 'Eliminar proyecto',
                    message: `¿Eliminar proyecto "${p.name}" y sus notas? Esta acción no se puede deshacer.`,
                    confirmLabel: 'Eliminar',
                    cancelLabel: 'Cancelar',
                    color: 'error',
                    onConfirm: () => deleteProjectMutation.mutate(p.id),
                  });
                }}
                onCreateNote={createNoteMutation.mutate}
                isPinned={pinnedProjects.includes(project.id)}
                onTogglePin={togglePinProject}
              />
            ))}
          </List>
        )}
      </Box>
        </>
      )}

      {/* Dialog for Creating/Editing Project */}
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
        onRemoveCover={handleRemoveCover}
        canRemoveCover={!isEditing || Boolean(selectedFile)}
        isPending={createProjectMutation.isPending || updateProjectMutation.isPending}
        onSubmit={handleSave}
      />

      {/* Dialog for Sharing Project */}
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
