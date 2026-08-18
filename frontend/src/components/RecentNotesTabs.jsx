import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  VerticalSplit as SplitIcon,
} from '@mui/icons-material';
import { useUiStore } from '../store/uiStore';

const TABS_STORAGE_KEY = 'notitas-recent-tabs';

export default function RecentNotesTabs({
  notes = [],
  onToggleSplit,
  splitActive = false,
}) {
  const { currentNoteId, setCurrentNote } = useUiStore();

  const [openTabs, setOpenTabs] = useState(() => {
    try {
      const saved = localStorage.getItem(TABS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Guardar en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(openTabs));
    } catch {}
  }, [openTabs]);

  // Actualizar pestañas cuando cambia la nota activa
  useEffect(() => {
    if (!currentNoteId) return;
    const note = notes.find((n) => n.id === currentNoteId);
    if (!note) return;

    setOpenTabs((prev) => {
      const exists = prev.find((t) => t.id === note.id);
      if (exists) {
        // Actualizar título si cambió
        return prev.map((t) => (t.id === note.id ? { ...t, title: note.title || 'Sin título', icon: note.icon } : t));
      }
      // Agregar pestaña al inicio y limitar a 6 pestañas
      return [{ id: note.id, title: note.title || 'Sin título', icon: note.icon, projectId: note.projectId }, ...prev].slice(0, 6);
    });
  }, [currentNoteId, notes]);

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(remaining);

    // Si cerramos la pestaña activa, cambiar a la primera disponible o null
    if (currentNoteId === tabId) {
      if (remaining.length > 0) {
        setCurrentNote(remaining[0].id);
      } else {
        setCurrentNote(null);
      }
    }
  };

  if (openTabs.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        py: 0.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minHeight: 38,
        gap: 1,
        overflowX: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexGrow: 1, overflowX: 'auto' }}>
        {openTabs.map((tab) => {
          const isActive = currentNoteId === tab.id;
          return (
            <Paper
              key={tab.id}
              elevation={0}
              onClick={() => setCurrentNote(tab.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                px: 1.2,
                py: 0.4,
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor: isActive ? 'action.selected' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'primary.main' : 'transparent',
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: isActive ? 'action.selected' : 'action.hover',
                },
              }}
            >
              {tab.icon && <Typography sx={{ fontSize: '0.85rem', lineHeight: 1 }}>{tab.icon}</Typography>}
              <Typography
                variant="caption"
                fontWeight={isActive ? 700 : 500}
                sx={{
                  color: isActive ? 'primary.main' : 'text.secondary',
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.title}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => handleCloseTab(e, tab.id)}
                sx={{
                  p: 0.2,
                  opacity: isActive ? 0.8 : 0.4,
                  '&:hover': { opacity: 1, color: 'error.main' },
                }}
              >
                <CloseIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Paper>
          );
        })}
      </Box>

      {/* Botones de acción rápida en la barra de pestañas */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {onToggleSplit && (
          <Tooltip title={splitActive ? 'Cerrar editor dividido' : 'Abrir nota en pantalla dividida'}>
            <IconButton
              size="small"
              onClick={onToggleSplit}
              color={splitActive ? 'primary' : 'default'}
              sx={{ p: 0.6, borderRadius: 1.5 }}
            >
              <SplitIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
