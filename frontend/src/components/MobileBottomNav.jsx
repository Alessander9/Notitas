import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import {
  GridView as DashboardIcon,
  Star as StarIcon,
  Add as AddIcon,
  DeleteOutline as TrashIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { useUiStore } from '../store/uiStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from '../store/toastStore';

export default function MobileBottomNav({ onOpenQuickNote }) {
  const { currentProjectId, setCurrentProject, setCurrentNote, toggleAiDrawer, aiDrawerOpen } = useUiStore();
  const queryClient = useQueryClient();

  const isProjectView = typeof currentProjectId === 'number';

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
      toast.success('Nota creada');
    },
    onError: () => toast.error('No se pudo crear la nota'),
  });

  const handleAddClick = () => {
    if (isProjectView) {
      createNoteMutation.mutate();
    } else if (onOpenQuickNote) {
      onOpenQuickNote();
    } else {
      window.dispatchEvent(new CustomEvent('notitas:quick-note'));
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Proyectos',
      icon: <DashboardIcon sx={{ fontSize: 22 }} />,
      active: currentProjectId === null && !aiDrawerOpen,
      onClick: () => {
        setCurrentProject(null);
        setCurrentNote(null);
      },
    },
    {
      id: 'favorites',
      label: 'Favoritos',
      icon: <StarIcon sx={{ fontSize: 22 }} />,
      active: currentProjectId === 'favorites' && !aiDrawerOpen,
      onClick: () => {
        setCurrentProject('favorites');
        setCurrentNote(null);
      },
    },
    {
      id: 'add',
      label: isProjectView ? 'Nota' : 'Rápida',
      isAction: true,
      onClick: handleAddClick,
    },
    {
      id: 'trash',
      label: 'Papelera',
      icon: <TrashIcon sx={{ fontSize: 22 }} />,
      active: currentProjectId === 'trash' && !aiDrawerOpen,
      onClick: () => {
        setCurrentProject('trash');
        setCurrentNote(null);
      },
    },
    {
      id: 'ai',
      label: 'CleoBot',
      icon: <BotIcon sx={{ fontSize: 22 }} />,
      active: aiDrawerOpen,
      onClick: toggleAiDrawer,
      color: '#10b981',
    },
  ];

  return (
    <Box
      component="nav"
      aria-label="Navegación inferior móvil"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        pb: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        pt: 0.5,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(15, 15, 35, 0.94)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        px: 1,
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.12)',
      }}
    >
      {navItems.map((item) => {
        if (item.isAction) {
          return (
            <Box key={item.id} sx={{ position: 'relative', top: -12 }}>
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                <IconButton
                  onClick={item.onClick}
                  aria-label="Añadir nota"
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #386c5f 50%, #153830 100%)',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.45)',
                    border: '2px solid rgba(255, 255, 255, 0.25)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #34d399 0%, #386c5f 100%)',
                      boxShadow: '0 10px 28px rgba(16, 185, 129, 0.6)',
                    },
                  }}
                >
                  <AddIcon sx={{ fontSize: 28 }} />
                </IconButton>
              </motion.div>
            </Box>
          );
        }

        const activeColor = item.color || 'primary.main';

        return (
          <Box
            key={item.id}
            component="button"
            onClick={item.onClick}
            sx={{
              background: 'none',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 0.5,
              px: { xs: 0.8, sm: 1.5 },
              minWidth: 54,
              borderRadius: 2.5,
              color: item.active ? activeColor : 'text.secondary',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            <motion.div
              animate={{
                scale: item.active ? 1.15 : 1,
                y: item.active ? -2 : 0,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.id === 'ai' ? (
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    bgcolor: item.active ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <BotIcon
                    sx={{
                      fontSize: 22,
                      color: item.active ? '#10b981' : 'text.secondary',
                      filter: item.active ? 'drop-shadow(0 2px 6px rgba(16, 185, 129, 0.5))' : 'none',
                    }}
                  />
                </Box>
              ) : (
                item.icon
              )}
            </motion.div>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.67rem',
                fontWeight: item.active ? 700 : 500,
                color: item.active ? activeColor : 'text.secondary',
                mt: 0.3,
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                letterSpacing: '0.01em',
              }}
            >
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
