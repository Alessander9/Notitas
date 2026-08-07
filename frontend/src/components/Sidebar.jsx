import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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

  // All projects shown in the sidebar
  const allProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

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

  return (
    <Box
      component={motion.div}
      animate={{ width: embedded ? '100%' : effectiveCollapsed ? 72 : 300 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      sx={{
        height: '100%',
        borderRight: embedded ? 'none' : '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(26, 26, 53, 0.75)' : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isLoading ? (
        <SidebarSkeleton collapsed={effectiveCollapsed} />
      ) : (
        <>
      {/* Sidebar Collapse Toggle & Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: effectiveCollapsed ? 'center' : 'space-between',
          p: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: '52px',
        }}
      >
        {!effectiveCollapsed && (
          <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ ml: 1 }}>
            NAVEGACIÓN
          </Typography>
        )}
        {!embedded && (
          <IconButton size="small" onClick={handleToggleCollapse}>
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
        {embedded && (
          <Tooltip title="Cerrar menú">
            <IconButton
              size="small"
              onClick={() => setSidebarMobileOpen(false)}
              sx={{
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Action Button: Nuevo Proyecto */}
      <Box sx={{ p: effectiveCollapsed ? 1.5 : 2, display: 'flex', justifyContent: 'center' }}>
        {effectiveCollapsed ? (
          <Tooltip title="Nuevo Proyecto" placement="right">
            <IconButton
              color="primary"
              variant="contained"
              onClick={handleOpenCreateModal}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                width: 42,
                height: 42,
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateModal}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 'bold', py: 1 }}
          >
            Nuevo Proyecto
          </Button>
        )}
      </Box>

      <Divider />

      {/* Primary Navigation */}
      <List dense sx={{ px: effectiveCollapsed ? 1 : 1.5, py: 1 }}>
        {/* Navigation Option: Dashboard */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <Tooltip title={effectiveCollapsed ? "Panel de Proyectos" : ""} placement="right">
            <ListItemButton
              selected={currentProjectId === null}
              onClick={() => selectAndClose(null)}
              sx={{
                borderRadius: 2,
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                px: effectiveCollapsed ? 1.5 : 2,
                minHeight: 40,
              }}
            >
              <ListItemIcon sx={{ minWidth: effectiveCollapsed ? 0 : 36, justifyContent: 'center' }}>
                <DashboardIcon color={currentProjectId === null ? 'primary' : 'action'} />
              </ListItemIcon>
              {!effectiveCollapsed && <ListItemText primary="Panel de Proyectos" primaryTypographyProps={{ fontWeight: 500 }} />}
            </ListItemButton>
          </Tooltip>
        </ListItem>

        {/* Navigation Option: Favorites */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <Tooltip title={effectiveCollapsed ? "Favoritos" : ""} placement="right">
            <ListItemButton
              selected={currentProjectId === 'favorites'}
              onClick={() => selectAndClose('favorites')}
              sx={{
                borderRadius: 2,
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                px: effectiveCollapsed ? 1.5 : 2,
                minHeight: 40,
              }}
            >
              <ListItemIcon sx={{ minWidth: effectiveCollapsed ? 0 : 36, justifyContent: 'center' }}>
                <StarIcon sx={{ color: '#fbc02d' }} />
              </ListItemIcon>
              {!effectiveCollapsed && <ListItemText primary="Favoritos" primaryTypographyProps={{ fontWeight: 500 }} />}
            </ListItemButton>
          </Tooltip>
        </ListItem>

        {/* Navigation Option: Trash */}
        <ListItem disablePadding>
          <Tooltip title={effectiveCollapsed ? "Papelera" : ""} placement="right">
            <ListItemButton
              selected={currentProjectId === 'trash'}
              onClick={() => selectAndClose('trash')}
              sx={{
                borderRadius: 2,
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                px: effectiveCollapsed ? 1.5 : 2,
                minHeight: 40,
              }}
            >
              <ListItemIcon sx={{ minWidth: effectiveCollapsed ? 0 : 36, justifyContent: 'center' }}>
                <TrashIcon color="action" />
              </ListItemIcon>
              {!effectiveCollapsed && <ListItemText primary="Papelera" primaryTypographyProps={{ fontWeight: 500 }} />}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>

      <Divider sx={{ my: 1 }} />

      {/* Projects Title Header */}
      {!effectiveCollapsed && (
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ letterSpacing: '0.5px' }}>
            PROYECTOS ({projects.length})
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={expandMode === 'accordion' ? 'Permitir expandir varios proyectos a la vez' : 'Modo acordeón: solo un proyecto abierto a la vez'}>
              <IconButton
                size="small"
                onClick={handleToggleExpandMode}
                sx={{ p: 0.4, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                {expandMode === 'accordion' ? <ViewStreamIcon sx={{ fontSize: 16 }} /> : <ViewDayIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* Projects List (ordered by most recent activity) */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: effectiveCollapsed ? 1 : 1.5, pb: 2 }}>
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
