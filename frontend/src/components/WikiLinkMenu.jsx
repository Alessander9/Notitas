import React, { useEffect, useRef, useState } from 'react';
import {
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import {
  Description as NoteIcon,
  AlternateEmail as AtIcon,
  Folder as ProjectIcon,
} from '@mui/icons-material';

export default function WikiLinkMenu({
  open,
  query = '',
  triggerChar = '@',
  notes = [],
  projects = [],
  position,
  onSelect,
  onClose,
}) {
  const ref = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const projectMap = React.useMemo(() => {
    const map = new Map();
    if (Array.isArray(projects)) {
      projects.forEach((p) => map.set(p.id, p));
    }
    return map;
  }, [projects]);

  const safeNotes = Array.isArray(notes) ? notes : [];
  const cleanQuery = query.toLowerCase().trim();

  const filtered = safeNotes
    .filter((n) => {
      if (!cleanQuery) return true;
      const titleMatch = (n.title || '').toLowerCase().includes(cleanQuery);
      const project = projectMap.get(n.projectId);
      const projectNameMatch = project && project.name.toLowerCase().includes(cleanQuery);
      return titleMatch || projectNameMatch;
    })
    .slice(0, 10);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Teclado: flechas arriba/abajo, Enter para seleccionar, Escape para cerrar
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e) => {
      if (filtered.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, filtered, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open || filtered.length === 0) return null;

  return (
    <Paper
      ref={ref}
      elevation={12}
      sx={{
        position: 'fixed',
        top: Math.min(position?.top || 100, window.innerHeight - 320),
        left: Math.min(position?.left || 100, window.innerWidth - 340),
        zIndex: 9998,
        minWidth: 280,
        maxWidth: 360,
        maxHeight: 320,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        border: '1px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(56,108,95,0.2)',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(26, 26, 53, 0.95)' : 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)',
      }}
    >
      <Box
        sx={{
          px: 1.75,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(56,108,95,0.05)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <AtIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="caption" color="text.primary" fontWeight={700}>
            {triggerChar === '@' ? 'Mencionar nota' : 'Enlazar nota wiki'}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
          ↑↓ para navegar • Enter
        </Typography>
      </Box>

      <List dense disablePadding sx={{ overflowY: 'auto', p: 0.5, flexGrow: 1 }}>
        {filtered.map((n, index) => {
          const project = projectMap.get(n.projectId);
          const isSelected = index === selectedIndex;

          return (
            <ListItemButton
              key={n.id}
              selected={isSelected}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(n);
              }}
              sx={{
                py: 0.8,
                px: 1.2,
                borderRadius: 2,
                mb: 0.3,
                transition: 'all 0.15s ease',
                '&.Mui-selected': {
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(56, 108, 95, 0.3)'
                      : 'rgba(56, 108, 95, 0.12)',
                  '&:hover': {
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(56, 108, 95, 0.4)'
                        : 'rgba(56, 108, 95, 0.18)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 28, color: 'primary.main' }}>
                <NoteIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary={n.title || 'Sin título'}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: isSelected ? 700 : 600,
                  noWrap: true,
                }}
                secondary={
                  project ? (
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                      <ProjectIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography component="span" variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                        {project.name}
                      </Typography>
                    </Box>
                  ) : null
                }
              />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
