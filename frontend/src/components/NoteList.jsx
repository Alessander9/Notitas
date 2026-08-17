import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';
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
  Avatar,
  Badge,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  EditNote as EditNoteIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
  OpenInFull as MaximizeIcon,
  CloseFullscreen as MinimizeIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ContentCopy as DuplicateIcon,
  GridView as MasonryIcon,
  ViewList as ListIcon,
  ViewKanban as KanbanIcon,
  Dashboard as ChecklistKanbanIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import NoteListSkeleton from './skeletons/NoteListSkeleton';
import CoverImage from './CoverImage';
import AuthorAvatars from './AuthorAvatars';
import MemberProfileDialog from './MemberProfileDialog';
import InfiniteScroll from './InfiniteScroll';
import { usePaginatedNotes } from '../hooks/usePaginatedNotes';
import HighlightText from './HighlightText';
import { getPlainText, getAssetUrl, formatRelativeTime, extractFirstImage } from '../utils/text';
import ManageMembersDialog from './ManageMembersDialog';
import { Group as GroupIcon } from '@mui/icons-material';
import KanbanView from './KanbanView';
import CalendarTimelineView from './CalendarTimelineView';

export default function NoteList() {
  const { currentProjectId, currentNoteId, setCurrentNote, searchQuery, setCurrentProject, notesViewMode = 'masonry', setNotesViewMode } = useUiStore();
  const [manageMembersOpen, setManageMembersOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pinnedNotes, setPinnedNotes] = useState(() => {
    try {
      const stored = localStorage.getItem('pinned-notes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Filtro local de notas dentro de un proyecto (texto + tag)
  const [filterText, setFilterText] = useState('');
  const [filterTag, setFilterTag] = useState(null);

  // Manual drag-to-reorder state
  const [manualOrder, setManualOrder] = useState({});
  const [dragNoteId, setDragNoteId] = useState(null);
  const [dragOverNoteId, setDragOverNoteId] = useState(null);

  // Load manual order from localStorage when project changes
  useEffect(() => {
    if (typeof currentProjectId !== 'number') return;
    try {
      const stored = localStorage.getItem(`notitas-note-order-${currentProjectId}`);
      setManualOrder(stored ? JSON.parse(stored) : {});
    } catch { setManualOrder({}); }
  }, [currentProjectId]);

  const saveOrder = (order) => {
    if (typeof currentProjectId !== 'number') return;
    try { localStorage.setItem(`notitas-note-order-${currentProjectId}`, JSON.stringify(order)); } catch {}
  };

  // Duplicar nota
  const duplicateNoteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/notes/${id}/duplicate`);
      return res.data;
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setCurrentNote(newNote.id);
      toast.success('Nota duplicada');
    },
    onError: () => toast.error('No se pudo duplicar la nota'),
  });

  // Drag & drop de archivos Markdown o texto
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    if (typeof currentProjectId !== 'number') return;
    const files = Array.from(e.dataTransfer.files || []);
    for (const file of files) {
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const text = await file.text();
        const formatted = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');
        const title = file.name.replace(/\.[^/.]+$/, '');
        const res = await api.post(`/projects/${currentProjectId}/notes`, {
          title,
          content: `<p>${formatted}</p>`,
        });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        setCurrentNote(res.data.id);
        toast.success(`Nota creada desde "${file.name}"`);
      }
    }
  };

  // Al cambiar de vista/proyecto se limpia el filtro
  useEffect(() => {
    setFilterText('');
    setFilterTag(null);
  }, [currentProjectId]);

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

  // Paginación con scroll infinito (hook compartido: los consumidores de la
  // misma queryKey usan la misma forma de datos en caché).
  const { notes, totalCount, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    usePaginatedNotes({
      queryKey,
      url: isProjectView
        ? `/projects/${currentProjectId}/notes`
        : isFavorites
          ? '/notes/favorites'
          : isTrash
            ? '/notes/deleted'
            : '/notes/search',
      params: isSearch ? { query: searchQuery } : {},
      enabled: Boolean(currentProjectId) && (isSearch ? Boolean(searchQuery) : true),
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
      // Deshacer solo en borrados suaves (fuera de la papelera)
      if (!isTrash) {
        toast.success('Nota movida a la papelera', {
          duration: 6000,
          action: {
            label: 'Deshacer',
            onClick: () => restoreNoteMutation.mutate(id),
          },
        });
      }
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

  // Mover nota entre columnas Kanban (actualiza tags)
  const updateNoteTagsMutation = useMutation({
    mutationFn: async ({ id, tags }) => {
      const res = await api.put(`/notes/${id}`, { tags });
      return res.data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const [draggingNoteId, setDraggingNoteId] = useState(null);
  const [activeDropCol, setActiveDropCol] = useState(null);

  const handleDropOnColumn = (targetColId, noteId) => {
    setActiveDropCol(null);
    setDraggingNoteId(null);
    const nId = Number(noteId);
    const targetNote = notes.find((n) => n.id === nId);
    if (!targetNote) return;

    const statusTags = new Set(['todo', 'doing', 'done', 'progreso', 'proceso', 'en curso', 'wip', 'terminado', 'completado', 'listo', 'finalizado', 'pendiente', 'por hacer', 'hacer']);
    const nonStatusTags = (targetNote.tags || []).filter((t) => !statusTags.has((t || '').toLowerCase()));
    
    let newTag = 'todo';
    if (targetColId === 'doing') newTag = 'doing';
    else if (targetColId === 'done') newTag = 'done';
    else if (targetColId === 'other') newTag = null;

    const newTags = newTag ? [...nonStatusTags, newTag] : nonStatusTags;
    updateNoteTagsMutation.mutate({ id: nId, tags: newTags });
    toast.success(`Nota movida a "${targetColId === 'todo' ? 'Por Hacer' : targetColId === 'doing' ? 'En Progreso' : targetColId === 'done' ? 'Terminado' : 'Otras'}"`);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [profileMember, setProfileMember] = useState(null);

  const getHeaderTitle = () => {
    if (isFavorites) return 'Favoritos';
    if (isTrash) return 'Papelera';
    if (isSearch) return `Búsqueda`;
    if (isProjectView) return 'Notas';
    return 'Notas';
  };

  const togglePin = (noteId) => {
    setPinnedNotes((prev) => {
      const next = prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId];
      localStorage.setItem('pinned-notes', JSON.stringify(next));
      return next;
    });
  };

  // Sort notes: pinned first, then by date
  const sortedNotes = [...notes].sort((a, b) => {
    const aPinned = pinnedNotes.includes(a.id);
    const bPinned = pinnedNotes.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  // Apply manual drag order on top of default sort
  const orderedNotes = React.useMemo(() => {
    if (!Object.keys(manualOrder).length) return sortedNotes;
    return [...sortedNotes].sort((a, b) => {
      const oa = manualOrder[a.id] ?? 999999;
      const ob = manualOrder[b.id] ?? 999999;
      return oa - ob;
    });
  }, [sortedNotes, manualOrder]);

  // Tags disponibles en las notas cargadas (para los chips de filtro)
  const allTags = React.useMemo(() => {
    const set = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [notes]);

  const isFiltering = isProjectView && (Boolean(filterText.trim()) || Boolean(filterTag));

  // Filtro local: aplica sobre las notas cargadas (texto en título/contenido y/o tag)
  const visibleNotes = isFiltering
    ? orderedNotes.filter((n) => {
        if (filterTag && !(n.tags || []).includes(filterTag)) return false;
        const q = filterText.trim().toLowerCase();
        if (q) {
          const haystack = `${n.title || ''} ${getPlainText(n.content, '')}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
    : orderedNotes;

  // Agrupación para Tablero Kanban
  const kanbanGroups = React.useMemo(() => {
    const todo = [];
    const doing = [];
    const done = [];
    const other = [];

    visibleNotes.forEach((n) => {
      const tagsLower = (n.tags || []).map((t) => (t || '').toLowerCase());
      if (tagsLower.some((t) => ['done', 'terminado', 'completado', 'listo', 'finalizado'].includes(t))) {
        done.push(n);
      } else if (tagsLower.some((t) => ['doing', 'progreso', 'proceso', 'en curso', 'wip'].includes(t))) {
        doing.push(n);
      } else if (tagsLower.some((t) => ['todo', 'pendiente', 'por hacer', 'hacer'].includes(t))) {
        todo.push(n);
      } else {
        other.push(n);
      }
    });

    return [
      { id: 'todo', title: 'Por Hacer', color: '#f39c12', count: todo.length, notes: todo },
      { id: 'doing', title: 'En Progreso', color: '#3498db', count: doing.length, notes: doing },
      { id: 'done', title: 'Terminado', color: '#2ecc71', count: done.length, notes: done },
      ...(other.length > 0 ? [{ id: 'other', title: 'General / Otras', color: '#8e44ad', count: other.length, notes: other }] : []),
    ];
  }, [visibleNotes]);

  return (
    <Box
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      sx={{
        width: isCollapsed ? 60 : (notesViewMode === 'kanban' || notesViewMode === 'checklist-kanban') ? { xs: '100%', md: 440, lg: 560 } : { xs: '100%', md: 320 },
        minWidth: isCollapsed ? 60 : (notesViewMode === 'kanban' || notesViewMode === 'checklist-kanban') ? { xs: '100%', md: 440, lg: 560 } : { xs: '100%', md: 320 },
        height: '100%',
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
        transition: 'width 0.2s ease-in-out, min-width 0.2s ease-in-out',
      }}
    >
      {isLoading ? (
        <NoteListSkeleton />
      ) : (
        <>
      {/* Header */}
      <Box sx={{ p: isCollapsed ? 1 : 1.5, display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', borderBottom: '1px solid', borderColor: 'divider', minHeight: 56, gap: 1 }}>
        {isCollapsed ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.2, width: '100%' }}>
            {/* Si estamos dentro de un proyecto, mostrar creador y colaboradores en círculos */}
            {isProjectView && (() => {
              const activeProj = projects.find((p) => p.id === currentProjectId);
              const creator = activeProj?.creator;
              const collabs = activeProj?.collaborators || [];
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, width: '100%' }}>
                  {/* Creador del proyecto */}
                  {creator && (
                    <Tooltip title={`Creador: ${creator.name}`} placement="right" arrow>
                      <Box
                        onClick={() => setProfileMember(creator)}
                        sx={{ cursor: 'pointer', position: 'relative', '&:hover': { transform: 'scale(1.1)' }, transition: 'transform 0.2s' }}
                      >
                        <Avatar
                          src={creator.avatar ? getAssetUrl(creator.avatar) : undefined}
                          sx={{
                            width: 38,
                            height: 38,
                            bgcolor: 'warning.main',
                            border: '2px solid',
                            borderColor: 'warning.main',
                            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                          }}
                        >
                          {creator.name?.charAt(0)?.toUpperCase() || 'C'}
                        </Avatar>
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            bgcolor: 'warning.main',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '8px',
                            fontWeight: 900,
                            border: '1.5px solid',
                            borderColor: 'background.default',
                          }}
                        >
                          ★
                        </Box>
                      </Box>
                    </Tooltip>
                  )}

                  {/* Colaboradores del proyecto */}
                  {collabs.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      {collabs.slice(0, 3).map((collab) => (
                        <Tooltip key={collab.id} title={`Colaborador: ${collab.name}`} placement="right" arrow>
                          <Avatar
                            src={collab.avatar ? getAssetUrl(collab.avatar) : undefined}
                            onClick={() => setProfileMember(collab)}
                            sx={{
                              width: 28,
                              height: 28,
                              cursor: 'pointer',
                              bgcolor: 'primary.main',
                              border: '1.5px solid',
                              borderColor: 'divider',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              '&:hover': { transform: 'scale(1.15)', borderColor: 'primary.main' },
                              transition: 'all 0.2s',
                            }}
                          >
                            {collab.name?.charAt(0)?.toUpperCase() || 'U'}
                          </Avatar>
                        </Tooltip>
                      ))}
                      {collabs.length > 3 && (
                        <Tooltip title={`+${collabs.length - 3} colaboradores más`} placement="right">
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              bgcolor: 'action.selected',
                              color: 'text.secondary',
                            }}
                          >
                            +{collabs.length - 3}
                          </Avatar>
                        </Tooltip>
                      )}
                    </Box>
                  )}

                  <Divider sx={{ width: '80%', my: 0.5 }} />
                </Box>
              );
            })()}

            {/* Badge de conteo de notas */}
            <Tooltip title={`Expandir lista de notas (${totalCount} notas)`} placement="right">
              <Box
                onClick={() => setIsCollapsed(false)}
                sx={{ cursor: 'pointer', '&:hover': { transform: 'scale(1.08)' }, transition: 'transform 0.2s ease' }}
              >
                <Badge
                  badgeContent={totalCount}
                  color="primary"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.6rem',
                      height: 18,
                      minWidth: 18,
                      fontWeight: 700,
                    },
                  }}
                >
                  <IconButton
                    size="small"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'primary.main', color: '#fff' },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <MaximizeIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Badge>
              </Box>
            </Tooltip>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              <Tooltip title="Volver a Proyectos">
                <IconButton
                  size="small"
                  onClick={() => setCurrentProject(null)}
                  sx={{
                    p: 0.6,
                    borderRadius: 2,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ArrowBackIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" noWrap sx={{ fontSize: '0.82rem' }}>
                {getHeaderTitle().toUpperCase()} ({isFiltering ? `${visibleNotes.length} / ${totalCount}` : totalCount})
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexShrink: 0 }}>
              <ToggleButtonGroup
                size="small"
                value={notesViewMode}
                exclusive
                onChange={(_, val) => val && setNotesViewMode(val)}
                sx={{ height: 28 }}
              >
                <ToggleButton value="masonry" sx={{ px: 0.6, py: 0.2 }}>
                  <Tooltip title="Galería / Tarjetas"><MasonryIcon sx={{ fontSize: 15 }} /></Tooltip>
                </ToggleButton>
                <ToggleButton value="list" sx={{ px: 0.6, py: 0.2 }}>
                  <Tooltip title="Lista Compacta"><ListIcon sx={{ fontSize: 15 }} /></Tooltip>
                </ToggleButton>
                <ToggleButton value="kanban" sx={{ px: 0.6, py: 0.2 }}>
                  <Tooltip title="Tablero Kanban"><KanbanIcon sx={{ fontSize: 15 }} /></Tooltip>
                </ToggleButton>
                <ToggleButton value="checklist-kanban" sx={{ px: 0.6, py: 0.2 }}>
                  <Tooltip title="Kanban por Checklists"><ChecklistKanbanIcon sx={{ fontSize: 15 }} /></Tooltip>
                </ToggleButton>
                <ToggleButton value="calendar" sx={{ px: 0.6, py: 0.2 }}>
                  <Tooltip title="Calendario / Timeline"><CalendarIcon sx={{ fontSize: 15 }} /></Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>

              {isProjectView && (
                <Tooltip title="Minimizar lista de notas">
                  <IconButton
                    size="small"
                    onClick={() => setIsCollapsed(true)}
                    sx={{
                      p: 0.6,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
                    }}
                  >
                    <MinimizeIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}

              {isProjectView && (
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => createNoteMutation.mutate()}
                    disabled={createNoteMutation.isPending}
                    sx={{ textTransform: 'none', borderRadius: 2, py: 0.4, minHeight: 30, fontSize: '0.75rem', px: 1.2 }}
                  >
                    Añadir
                  </Button>
                </motion.div>
              )}
              {isProjectView && Object.keys(manualOrder).length > 0 && (
                <Button
                  size="small"
                  variant="text"
                  sx={{ textTransform: 'none', fontSize: '0.68rem', color: 'text.disabled', minHeight: 0, py: 0.2, px: 0.8 }}
                  onClick={() => {
                    setManualOrder({});
                    if (typeof currentProjectId === 'number') {
                      try { localStorage.removeItem(`notitas-note-order-${currentProjectId}`); } catch {}
                    }
                  }}
                >
                  Restablecer orden
                </Button>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Filtro local (solo en vista de proyecto) */}
      {isProjectView && !isCollapsed && (
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            size="small"
           placeholder="Filtrar notas…"
             inputProps={{ 'aria-label': 'Filtrar notas' }}
             value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} color="action" />
                </InputAdornment>
              ),
              endAdornment: filterText ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Limpiar filtro" onClick={() => setFilterText('')}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: { borderRadius: 2.5, bgcolor: 'background.paper', fontSize: '0.85rem' },
            }}
            sx={{ '& .MuiOutlinedInput-root': { py: 0.4 } }}
          />
          {allTags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              {allTags.slice(0, 8).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  color={filterTag === tag ? 'primary' : 'default'}
                  variant={filterTag === tag ? 'filled' : 'outlined'}
                  sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
                />
              ))}
              {allTags.length > 8 && (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>
                  +{allTags.length - 8} más
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Manage Members Banner (owner only, when project has collaborators) */}
      {isProjectView && !isCollapsed && (() => {
        const activeProject = projects.find((p) => p.id === currentProjectId);
        const isOwner = activeProject?.currentUserRole === 'OWNER';
        const collaboratorCount = activeProject?.collaborators?.length || 0;
        if (!isOwner || collaboratorCount === 0) return null;
        return (
          <Box sx={{ px: 2, pt: 0.5, pb: 0.5 }}>
            <Box
              component="button"
              onClick={() => setManageMembersOpen(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                width: '100%',
                p: 1.2,
                borderRadius: 2.5,
                border: `1.5px solid ${activeProject?.color || '#386c5f'}50`,
                bgcolor: `${activeProject?.color || '#386c5f'}10`,
                color: activeProject?.color || 'primary.main',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: `${activeProject?.color || '#386c5f'}20`,
                  borderColor: activeProject?.color || 'primary.main',
                  transform: 'scale(1.01)',
                  boxShadow: `0 2px 12px ${activeProject?.color || '#386c5f'}25`,
                },
              }}
            >
              <GroupIcon sx={{ fontSize: 18, flexShrink: 0 }} />
              <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.2, color: 'inherit' }}>
                  {collaboratorCount} colaborador{collaboratorCount !== 1 ? 'es' : ''} en este proyecto
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.2 }}>
                  Toca para gestionar y eliminar miembros
                </Typography>
              </Box>
            </Box>
            {activeProject && (
              <ManageMembersDialog
                project={activeProject}
                open={manageMembersOpen}
                onClose={() => setManageMembersOpen(false)}
              />
            )}
          </Box>
        );
      })()}

      {/* Notes Cards List */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: isCollapsed ? 0 : 2, pt: isCollapsed ? 1 : 2, pb: { xs: 10, md: 2 } }}>
        {!currentProjectId ? (
          <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary', p: 2 }}>
            <Typography variant="body2">
              Selecciona un proyecto a la izquierda para ver sus notas o crea uno nuevo.
            </Typography>
          </Box>
        ) : notes.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary', p: 2 }}>
            <EditNoteIcon sx={{ fontSize: 42, color: 'primary.main', mb: 1 }} />
            <Typography variant="subtitle2" fontWeight={700}>
              Este proyecto todavía no tiene notas
            </Typography>
            {isProjectView && (
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ mt: 1.5, borderRadius: 2, minHeight: 40 }}
                onClick={() => createNoteMutation.mutate()}
                disabled={createNoteMutation.isPending}
              >
                Crear primera nota
              </Button>
            )}
          </Box>
        ) : isFiltering && visibleNotes.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary', p: 2 }}>
            <Typography variant="body2">Sin resultados para el filtro.</Typography>
            <Button
              size="small"
              sx={{ mt: 1 }}
              onClick={() => {
                setFilterText('');
                setFilterTag(null);
              }}
            >
              Limpiar filtro
            </Button>
          </Box>
        ) : isCollapsed ? (
          /* Collapsed view: circular note avatars with cover or inline images */
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, px: 0.5 }}>
            {visibleNotes.slice(0, 15).map((note, index) => {
              const isSelected = currentNoteId === note.id;
              const project = projects.find((p) => p.id === note.projectId);
              const color = project?.color || '#386c5f';
              const hasCover = Boolean(note.coverImage);
              // Si no tiene coverImage explícita, extraemos la primera imagen insertada en el contenido
              const inlineImg = !hasCover ? extractFirstImage(note.content) : null;
              const effectiveImgUrl = hasCover
                ? getAssetUrl(note.coverImage)
                : inlineImg
                  ? getAssetUrl(inlineImg)
                  : null;

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.04, type: 'spring', stiffness: 300 }}
                  whileHover={{ scale: 1.15, x: 4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Tooltip
                    title={
                      <Box sx={{ p: 0.5, textAlign: 'center' }}>
                        <Typography variant="caption" fontWeight={700} display="block">
                          {note.icon ? `${note.icon} ` : ''}{note.title || 'Sin título'}
                        </Typography>
                        {note.tags && note.tags.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            #{note.tags.slice(0, 2).join(' #')}
                          </Typography>
                        )}
                      </Box>
                    }
                    placement="right"
                    arrow
                  >
                    <Avatar
                      src={effectiveImgUrl || undefined}
                      onClick={() => setCurrentNote(note.id)}
                      sx={{
                        width: 38,
                        height: 38,
                        cursor: 'pointer',
                        bgcolor: effectiveImgUrl ? 'transparent' : `${color}20`,
                        border: '2px solid',
                        borderColor: isSelected ? color : `${color}40`,
                        boxShadow: isSelected ? `0 0 0 3px ${color}40, 0 4px 12px ${color}30` : '0 2px 6px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: color,
                          boxShadow: `0 4px 14px ${color}40`,
                        },
                      }}
                    >
                      {effectiveImgUrl ? null : note.icon ? (
                        <Box component="span" sx={{ fontSize: '1rem', lineHeight: 1 }}>
                          {note.icon}
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color }}>
                          {(note.title || 'N').charAt(0).toUpperCase()}
                        </Typography>
                      )}
                    </Avatar>
                  </Tooltip>
                </motion.div>
              );
            })}
            {visibleNotes.length > 15 && (
              <Tooltip title={`+${visibleNotes.length - 15} notas más`} placement="right">
                <Avatar
                  onClick={() => setIsCollapsed(false)}
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    bgcolor: 'action.selected',
                    color: 'text.secondary',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'primary.main', color: '#fff' },
                  }}
                >
                  +{visibleNotes.length - 15}
                </Avatar>
              </Tooltip>
            )}
          </Box>
        ) : notesViewMode === 'kanban' ? (
          /* Kanban Board View con Drag & Drop Interactivo */
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', p: 1.5, height: '100%', alignItems: 'flex-start' }}>
            {kanbanGroups.map((col) => {
              const isDropTarget = activeDropCol === col.id;
              return (
                <Box
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (activeDropCol !== col.id) setActiveDropCol(col.id);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget)) return;
                    setActiveDropCol(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const noteId = e.dataTransfer.getData('text/plain');
                    handleDropOnColumn(col.id, noteId);
                  }}
                  sx={{
                    width: 240,
                    minWidth: 240,
                    bgcolor: isDropTarget ? 'action.selected' : 'action.hover',
                    border: isDropTarget ? '2px dashed' : '2px solid transparent',
                    borderColor: isDropTarget ? col.color : 'transparent',
                    borderRadius: 3,
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '100%',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color }} />
                      <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>
                        {col.title}
                      </Typography>
                    </Box>
                    <Chip label={col.count} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                  </Box>
                  <Box sx={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, pr: 0.5, flexGrow: 1, minHeight: 80 }}>
                    {col.notes.length === 0 ? (
                      <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', py: 3, textAlign: 'center' }}>
                        Arrastra notas aquí
                      </Typography>
                    ) : (
                      col.notes.map((note) => {
                        const isSelected = currentNoteId === note.id;
                        const isDragging = draggingNoteId === note.id;
                        return (
                          <Card
                            key={note.id}
                            variant="outlined"
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', String(note.id));
                              setDraggingNoteId(note.id);
                            }}
                            onDragEnd={() => {
                              setDraggingNoteId(null);
                              setActiveDropCol(null);
                            }}
                            onClick={() => setCurrentNote(note.id)}
                            sx={{
                              cursor: 'grab',
                              borderRadius: 2.5,
                              p: 1.5,
                              bgcolor: isSelected ? 'action.selected' : 'background.paper',
                              borderColor: isSelected ? 'primary.main' : 'divider',
                              opacity: isDragging ? 0.45 : 1,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              },
                              '&:active': {
                                cursor: 'grabbing',
                              },
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              noWrap
                              sx={{
                                mb: 0.5,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.6,
                              }}
                            >
                              {note.icon && (
                                <Box component="span" sx={{ fontSize: '1.05rem', lineHeight: 1, flexShrink: 0 }}>
                                  {note.icon}
                                </Box>
                              )}
                              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {note.title || 'Sin título'}
                              </Box>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1, fontSize: '0.72rem' }}>
                              {getPlainText(note.content, 'Sin contenido')}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                {formatRelativeTime(note.updatedAt || note.createdAt)}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.3 }}>
                                <Tooltip title="Duplicar">
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); duplicateNoteMutation.mutate(note.id); }} sx={{ p: 0.3 }}>
                                    <DuplicateIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Eliminar">
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteNoteMutation.mutate(note.id); }} sx={{ p: 0.3 }}>
                                    <DeleteIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          </Card>
                        );
                      })
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : notesViewMode === 'checklist-kanban' ? (
          /* Checklist-based Kanban View */
          <KanbanView notes={visibleNotes} onNoteClick={setCurrentNote} />
        ) : notesViewMode === 'calendar' ? (
          /* Calendar and Timeline View */
          <CalendarTimelineView
            notes={visibleNotes}
            onNoteClick={setCurrentNote}
            onCreateNote={isProjectView ? () => createNoteMutation.mutate() : undefined}
          />
        ) : notesViewMode === 'list' ? (
          /* Compact List View */
          <InfiniteScroll hasMore={hasNextPage} loading={isFetchingNextPage} onLoadMore={fetchNextPage}>
            <Stack spacing={0.8} sx={{ px: 0.5 }}>
              {visibleNotes.map((note) => {
                const isSelected = currentNoteId === note.id;
                const project = projects.find((p) => p.id === note.projectId);
                const color = project?.color || '#386c5f';
                return (
                  <Box
                    key={note.id}
                    onClick={() => setCurrentNote(note.id)}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('note-reorder', String(note.id)); setDragNoteId(note.id); }}
                    onDragEnd={() => { setDragNoteId(null); setDragOverNoteId(null); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverNoteId(note.id); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = Number(e.dataTransfer.getData('note-reorder'));
                      if (!sourceId || sourceId === note.id) return;
                      const ids = orderedNotes.map(x => x.id);
                      const from = ids.indexOf(sourceId);
                      const to = ids.indexOf(note.id);
                      if (from === -1 || to === -1) return;
                      const newIds = [...ids];
                      newIds.splice(from, 1);
                      newIds.splice(to, 0, sourceId);
                      const newOrder = Object.fromEntries(newIds.map((id, i) => [id, i]));
                      setManualOrder(newOrder);
                      saveOrder(newOrder);
                      setDragNoteId(null);
                      setDragOverNoteId(null);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.2,
                      px: 1.5,
                      borderRadius: 2,
                      cursor: 'grab',
                      opacity: dragNoteId === note.id ? 0.5 : 1,
                      outline: dragOverNoteId === note.id && dragNoteId !== note.id ? '2px dashed' : 'none',
                      outlineColor: 'primary.main',
                      bgcolor: isSelected ? 'action.selected' : 'background.paper',
                      border: '1px solid',
                      borderColor: isSelected ? color : 'divider',
                      borderLeft: `4px solid ${color}`,
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        transform: 'translateX(3px)',
                      },
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        {note.icon && (
                          <Box component="span" sx={{ fontSize: '1.05rem', lineHeight: 1, flexShrink: 0 }}>
                            {note.icon}
                          </Box>
                        )}
                        <Typography variant="body2" fontWeight={isSelected ? 700 : 600} noWrap sx={{ fontSize: '0.84rem' }}>
                          {note.title || 'Sin título'}
                        </Typography>
                        {pinnedNotes.includes(note.id) && (
                          <PinIcon sx={{ fontSize: 12, color: 'primary.main', transform: 'rotate(45deg)' }} />
                        )}
                        {note.favorite && (
                          <StarIcon sx={{ fontSize: 13, color: '#fbc02d' }} />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                          {formatRelativeTime(note.updatedAt || note.createdAt)}
                        </Typography>
                        {note.tags && note.tags.length > 0 && (
                          <Chip label={note.tags[0]} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                      <Tooltip title="Duplicar">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); duplicateNoteMutation.mutate(note.id); }} sx={{ p: 0.4 }}>
                          <DuplicateIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteNoteMutation.mutate(note.id); }} sx={{ p: 0.4 }}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </InfiniteScroll>
        ) : (
          /* Masonry Cards View */
          <InfiniteScroll hasMore={hasNextPage} loading={isFetchingNextPage} onLoadMore={fetchNextPage}>
            <AnimatePresence mode="popLayout">
            <Stack spacing={isCollapsed ? 0.5 : 2}>
              {visibleNotes.map((note) => {
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
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Card
                      variant="outlined"
                      onClick={() => setCurrentNote(note.id)}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('note-reorder', String(note.id)); setDragNoteId(note.id); }}
                      onDragEnd={() => { setDragNoteId(null); setDragOverNoteId(null); }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverNoteId(note.id); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceId = Number(e.dataTransfer.getData('note-reorder'));
                        if (!sourceId || sourceId === note.id) return;
                        const ids = orderedNotes.map(x => x.id);
                        const from = ids.indexOf(sourceId);
                        const to = ids.indexOf(note.id);
                        if (from === -1 || to === -1) return;
                        const newIds = [...ids];
                        newIds.splice(from, 1);
                        newIds.splice(to, 0, sourceId);
                        const newOrder = Object.fromEntries(newIds.map((id, i) => [id, i]));
                        setManualOrder(newOrder);
                        saveOrder(newOrder);
                        setDragNoteId(null);
                        setDragOverNoteId(null);
                      }}
                      sx={{
                        cursor: 'grab',
                        opacity: dragNoteId === note.id ? 0.5 : 1,
                        outline: dragOverNoteId === note.id && dragNoteId !== note.id ? '2px dashed' : 'none',
                        outlineColor: 'primary.main',
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
                        '&::after': !hasCover ? {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: 24,
                          height: 24,
                          background: 'linear-gradient(225deg, transparent 50%, rgba(0,0,0,0.06) 50%)',
                          borderBottomLeftRadius: 6,
                          pointerEvents: 'none',
                          zIndex: 1,
                        } : {},
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
                          <CoverImage src={coverUrl} alt={note.title} sx={{ width: '100%', height: 132 }} zoomOnHover />
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
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.6,
                            }}
                          >
                            {note.icon && (
                              <Box component="span" sx={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>
                                {note.icon}
                              </Box>
                            )}
                            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isSearch ? (
                                <HighlightText text={note.title || 'Sin Título'} query={searchQuery} />
                              ) : (
                                note.title || 'Sin Título'
                              )}
                            </Box>
                          </Typography>

                          {/* Favorite star + Pin + hover actions */}
                          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <Tooltip title={pinnedNotes.includes(note.id) ? 'Desfijar nota' : 'Fijar nota'}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePin(note.id);
                                }}
                                sx={{ p: 0.4, flexShrink: 0 }}
                              >
                                {pinnedNotes.includes(note.id) ? (
                                  <PinIcon fontSize="small" sx={{ color: 'primary.main', transform: 'rotate(45deg)' }} />
                                ) : (
                                  <PinOutlinedIcon fontSize="small" color="action" />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={note.favorite ? 'Quitar Favorito' : 'Marcar Favorito'}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavoriteMutation.mutate({ id: note.id, favorite: note.favorite });
                                }}
                                sx={{ p: 0.4, flexShrink: 0 }}
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
                              <Tooltip title="Duplicar nota">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateNoteMutation.mutate(note.id);
                                  }}
                                  sx={{ p: 0.4, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                >
                                  <DuplicateIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
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
                          {isSearch ? (
                            <HighlightText text={getPlainText(note.content, 'Sin contenido...')} query={searchQuery} />
                          ) : (
                            getPlainText(note.content, 'Sin contenido...')
                          )}
                        </Typography>

                        {/* Pinned indicator */}
                        {pinnedNotes.includes(note.id) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <PinIcon sx={{ fontSize: 12, color: 'primary.main', transform: 'rotate(45deg)' }} />
                            <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.62rem', fontWeight: 600 }}>
                              Fijada
                            </Typography>
                          </Box>
                        )}

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
                            pt: 0.5,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                            <AuthorAvatars
                              creator={project?.creator}
                              collaborators={project?.collaborators}
                              noteMembers={note?.noteMembers}
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
                            {formatRelativeTime(note.updatedAt || note.createdAt)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                </motion.div>
              );
            })}
            </Stack>
            </AnimatePresence>
          </InfiniteScroll>
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
