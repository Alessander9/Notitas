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
  Chip,
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
  History as HistoryIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { getProjectIcon } from '../constants/projectOptions';
import HighlightText from './HighlightText';

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const getSnippet = (content = '', query = '') => {
  const plain = stripHtml(content);
  if (!plain) return '';
  const lq = query.toLowerCase();
  const idx = plain.toLowerCase().indexOf(lq);
  if (idx > -1) {
    const start = Math.max(0, idx - 30);
    return (start > 0 ? '…' : '') + plain.slice(start, start + 90) + (plain.length > start + 90 ? '…' : '');
  }
  return plain.slice(0, 90) + (plain.length > 90 ? '…' : '');
};

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

// Animación staggered para listas
const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.2, ease: 'easeOut' },
  }),
};

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
  const [filterProjectId, setFilterProjectId] = useState(null);
  const [filterTag, setFilterTag] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notitas-recent-searches') || '[]'); }
    catch { return []; }
  });
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
      setFilterProjectId(null);
      setFilterTag(null);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  // Debounce de la búsqueda
  useEffect(() => {
    setFilterProjectId(null);
    setFilterTag(null);
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

  const saveSearch = (q) => {
    if (!q.trim() || q.length < 2) return;
    const next = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5);
    setRecentSearches(next);
    try { localStorage.setItem('notitas-recent-searches', JSON.stringify(next)); } catch {}
  };

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
          secondary: getSnippet(n.content, trimmed),
          icon: <NoteIcon sx={{ fontSize: 20 }} />,
          color: proj?.color || '#386c5f',
          projectId: n.projectId,
          tags: n.tags || [],
          run: () => {
            saveSearch(trimmed);
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

  const allItems = buildItems();
  const items = allItems.filter(item => {
    if (item.kind !== 'note') return true;
    if (filterProjectId && item.projectId !== filterProjectId) return false;
    if (filterTag && !item.tags?.includes(filterTag)) return false;
    return true;
  });

  // Chip data derived from raw note results (before filtering)
  const noteItems = allItems.filter(i => i.kind === 'note');
  const availableProjects = (() => {
    const seen = new Map();
    noteItems.forEach(i => {
      if (i.projectId && !seen.has(i.projectId)) {
        const proj = projects.find(p => p.id === i.projectId);
        if (proj) seen.set(i.projectId, proj);
      }
    });
    return [...seen.values()];
  })();
  const availableTags = (() => {
    const freq = {};
    noteItems.forEach(i => (i.tags || []).forEach(t => { freq[t] = (freq[t] || 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  })();

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
            background: 'rgba(10,10,25,0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'calc(100% - 32px)',
              maxWidth: 620,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(20, 24, 38, 0.85)' : 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: 3.5,
                border: '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '65vh',
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

              {/* Filter chips */}
              {trimmed && notes.length > 0 && (availableProjects.length > 1 || availableTags.length > 0) && (
                <Box sx={{ px: 2, py: 1, display: 'flex', gap: 0.75, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}>
                  {availableProjects.map(p => (
                    <Chip
                      key={p.id}
                      label={p.name}
                      size="small"
                      variant={filterProjectId === p.id ? 'filled' : 'outlined'}
                      color={filterProjectId === p.id ? 'primary' : 'default'}
                      onClick={() => setFilterProjectId(prev => prev === p.id ? null : p.id)}
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                  ))}
                  {availableTags.map(tag => (
                    <Chip
                      key={tag}
                      label={`#${tag}`}
                      size="small"
                      variant={filterTag === tag ? 'filled' : 'outlined'}
                      color={filterTag === tag ? 'secondary' : 'default'}
                      onClick={() => setFilterTag(prev => prev === tag ? null : tag)}
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                  ))}
                </Box>
              )}

              {/* Resultados */}
              <Box sx={{ overflowY: 'auto', py: 1, minHeight: 120 }}>
                {/* Recent searches */}
                {!trimmed && recentSearches.length > 0 && (
                  <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <HistoryIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.62rem' }}>
                          Recientes
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ fontSize: '0.62rem', cursor: 'pointer', '&:hover': { color: 'text.secondary' } }}
                        onClick={() => {
                          setRecentSearches([]);
                          try { localStorage.removeItem('notitas-recent-searches'); } catch {}
                        }}
                      >
                        Limpiar
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
                      {recentSearches.map(s => (
                        <Chip
                          key={s}
                          label={s}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.72rem', cursor: 'pointer' }}
                          onClick={() => { setQuery(s); inputRef.current?.focus(); }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                {searching && trimmed ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, gap: 1.5 }}>
                    <CircularProgress size={18} thickness={3} />
                    <Typography variant="body2" color="text.secondary">Buscando...</Typography>
                  </Box>
                ) : items.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
                    <SearchIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      Sin resultados para "{trimmed}"
                    </Typography>
                  </Box>
                ) : (
                  <List dense disablePadding>
                    {items.map((item, i) => (
                      <motion.div
                        key={item.key}
                        custom={i}
                        variants={staggerItem}
                        initial="hidden"
                        animate="visible"
                      >
                        <ListItemButton
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
                            transition: 'all 0.15s ease-out',
                            '&.Mui-selected': {
                              bgcolor: (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(109, 74, 255, 0.12)' : 'rgba(56, 108, 95, 0.08)',
                              '&:hover': {
                                bgcolor: (theme) =>
                                  theme.palette.mode === 'dark' ? 'rgba(109, 74, 255, 0.18)' : 'rgba(56, 108, 95, 0.12)',
                              },
                            },
                            '&:hover': {
                              transform: 'translateX(4px)',
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
                            primary={
                              <>
                                <HighlightText text={item.label} query={trimmed} />
                                {item.secondary && (
                                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block', mt: 0.2, fontWeight: 400, whiteSpace: 'normal' }}>
                                    {item.secondary}
                                  </Typography>
                                )}
                              </>
                            }
                            secondary={item.hint}
                            primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem', noWrap: !item.secondary }}
                            secondaryTypographyProps={{ fontSize: '0.72rem', noWrap: true, color: 'text.secondary' }}
                          />
                          {i === active && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 0.8,
                                py: 0.3,
                                borderRadius: 1,
                                bgcolor: 'action.hover',
                              }}
                            >
                              <ReturnIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                            </Box>
                          )}
                        </ListItemButton>
                      </motion.div>
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
