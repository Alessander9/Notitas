import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  InputBase,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Description as NoteIcon,
  Add as AddIcon,
  Star as StarIcon,
  DeleteOutline as TrashIcon,
  GridView as DashboardIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  KeyboardReturn as ReturnIcon,
  NoteAdd as NoteAddIcon,
  FolderOpen as FolderOpenIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { getProjectIcon } from './ProjectFormDialog';

function Hint({ kbd, label }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
      <Box
        sx={{
          px: 0.6,
          py: 0.15,
          borderRadius: 0.8,
          bgcolor: 'action.hover',
          fontSize: '0.62rem',
          fontWeight: 700,
          color: 'text.secondary',
          fontFamily: 'monospace',
        }}
      >
        {kbd}
      </Box>
      <Typography variant="caption" color="text.disabled">
        {label}
      </Typography>
    </Box>
  );
}

/**
 * Paleta de comandos (Ctrl/Cmd+K): busca notas y proyectos globalmente y
 * ejecuta acciones rápidas (nueva nota/proyecto, tema, favoritos, papelera).
 */
export default function CommandPalette() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { currentProjectId, setCurrentProject, setCurrentNote, toggleDarkMode, darkMode } = useUiStore();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  // Abrir/cerrar con Ctrl/Cmd+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key || '').toLowerCase() === 'k') {
        e.preventDefault();
        if (!isAuthenticated) return;
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAuthenticated]);

  // Al abrir: resetear y enfocar el input
  useEffect(() => {
    if (open) {
      setQuery('');
      setDebounced('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  // Debounce de la búsqueda
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Proyectos (caché compartida con sidebar/dashboard)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
    enabled: open,
  });

  const trimmed = debounced.trim();

  // Resultados de notas (solo cuando hay búsqueda)
  const { data: notes = [], isFetching: searching } = useQuery({
    queryKey: ['palette-search', trimmed],
    queryFn: async () => {
      const res = await api.get('/notes/search', { params: { query: trimmed } });
      return res.data?.content || res.data || [];
    },
    enabled: open && trimmed.length > 0,
  });

  // Reiniciar la selección cuando cambian los resultados
  // (searching se incluye para re-posicionar al llegar las notas asíncronas)
  useEffect(() => {
    setActive(0);
  }, [debounced, open, searching]);

  const createNote = async () => {
    if (typeof currentProjectId !== 'number') return;
    try {
      const res = await api.post(`/projects/${currentProjectId}/notes`, {
        title: 'Nueva Nota',
        content: '',
      });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setCurrentNote(res.data.id);
      toast.success('Nota creada');
    } catch {
      toast.error('No se pudo crear la nota');
    }
  };

  // Lista plana de resultados: acciones + proyectos + notas
  const buildItems = () => {
    const list = [];

    if (trimmed.length === 0) {
      list.push(
        {
          key: 'action-panel',
          kind: 'action',
          label: 'Ir al panel de proyectos',
          hint: 'Inicio',
          icon: <DashboardIcon />,
          run: () => setCurrentProject(null),
        },
        ...(typeof currentProjectId === 'number'
          ? [
              {
                key: 'action-note',
                kind: 'action',
                label: 'Nueva nota en este proyecto',
                hint: 'Nota',
                icon: <NoteAddIcon />,
                run: () => createNote(),
              },
            ]
          : []),
        {
          key: 'action-project',
          kind: 'action',
          label: 'Nuevo proyecto',
          hint: 'Proyecto',
          icon: <AddIcon />,
          run: () => {
            window.dispatchEvent(new CustomEvent('notitas:new-project'));
          },
        },
        {
          key: 'action-favs',
          kind: 'action',
          label: 'Ver favoritos',
          hint: 'Favoritos',
          icon: <StarIcon />,
          run: () => setCurrentProject('favorites'),
        },
        {
          key: 'action-trash',
          kind: 'action',
          label: 'Ver papelera',
          hint: 'Papelera',
          icon: <TrashIcon />,
          run: () => setCurrentProject('trash'),
        },
        {
          key: 'action-theme',
          kind: 'action',
          label: darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
          hint: 'Tema',
          icon: darkMode ? <LightModeIcon /> : <DarkModeIcon />,
          run: () => toggleDarkMode(),
        }
      );

      [...projects]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 8)
        .forEach((p) => {
          list.push({
            key: `proj-${p.id}`,
            kind: 'project',
            label: p.name,
            hint: p.description || 'Proyecto',
            icon: <Typography sx={{ fontSize: '1.15rem', lineHeight: 1 }}>{getProjectIcon(p.icon)}</Typography>,
            color: p.color || '#386c5f',
            run: () => setCurrentProject(p.id),
          });
        });
    } else {
      const q = trimmed.toLowerCase();

      projects
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, 4)
        .forEach((p) => {
          list.push({
            key: `proj-${p.id}`,
            kind: 'project',
            label: p.name,
            hint: p.description || 'Proyecto',
            icon: <Typography sx={{ fontSize: '1.15rem', lineHeight: 1 }}>{getProjectIcon(p.icon)}</Typography>,
            color: p.color || '#386c5f',
            run: () => setCurrentProject(p.id),
          });
        });

      notes.slice(0, 8).forEach((n) => {
        const proj = projects.find((p) => p.id === n.projectId);
        list.push({
          key: `note-${n.id}`,
          kind: 'note',
          label: n.title || 'Sin título',
          hint: proj?.name || 'Nota',
          icon: <NoteIcon sx={{ fontSize: 20 }} />,
          color: proj?.color || '#386c5f',
          run: () => {
            setCurrentProject(n.projectId);
            setCurrentNote(n.id);
          },
        });
      });

      if (list.length === 0 && !searching) {
        list.push({
          key: 'empty',
          kind: 'empty',
          label: 'Sin resultados',
          hint: `Nada coincide con "${trimmed}"`,
          icon: <SearchIcon />,
          run: null,
        });
      }
    }

    return list;
  };

  const items = buildItems();

  const handleKeyDown = (e) => {
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      const item = items[active];
      if (item?.run) {
        setOpen(false);
        item.run();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh',
            background: 'rgba(10,10,25,0.45)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'calc(100% - 32px)',
              maxWidth: 600,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '62vh',
              }}
            >
              {/* Input */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2.5,
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <SearchIcon color="action" />
                <InputBase
                  inputRef={inputRef}
                  placeholder="Buscar notas, proyectos o ejecutar una acción..."
                  aria-label="Búsqueda rápida"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  sx={{ flex: 1, fontSize: '0.95rem' }}
                />
                <Box
                  sx={{
                    px: 0.8,
                    py: 0.3,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: 'text.secondary',
                    fontFamily: 'monospace',
                  }}
                >
                  ESC
                </Box>
              </Box>

              {/* Resultados */}
              <Box sx={{ overflowY: 'auto', py: 1, minHeight: 120 }}>
                {searching && trimmed ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={22} />
                  </Box>
                ) : (
                  <List dense disablePadding>
                    {items.map((item, i) => (
                      <ListItemButton
                        key={item.key}
                        selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => {
                          if (item.run) {
                            setOpen(false);
                            item.run();
                          }
                        }}
                        sx={{
                          borderRadius: 2,
                          mx: 1,
                          px: 1.5,
                          py: 0.9,
                          '&.Mui-selected': {
                            bgcolor: 'action.selected',
                          },
                          '&.Mui-selected:hover': {
                            bgcolor: 'action.selected',
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 38,
                            color: item.color || 'action',
                          }}
                        >
                          <Box sx={{ fontSize: '1.15rem', lineHeight: 1, display: 'flex' }}>{item.icon}</Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          secondary={item.hint}
                          primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem', noWrap: true }}
                          secondaryTypographyProps={{ fontSize: '0.72rem', noWrap: true }}
                        />
                        {i === active && <ReturnIcon sx={{ fontSize: 15, color: 'text.disabled' }} />}
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Box>

              {/* Footer con atajos */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  gap: 2,
                  alignItems: 'center',
                }}
              >
                <Hint kbd="↑↓" label="navegar" />
                <Hint kbd="↵" label="abrir" />
                <Hint kbd="esc" label="cerrar" />
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FolderOpenIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.disabled">
                    Ctrl K
                  </Typography>
                </Box>
              </Box>
            </Box>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
