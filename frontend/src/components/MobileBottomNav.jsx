import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import {
  GridView as DashboardIcon,
  Star as StarIcon,
  Add as AddIcon,
  DeleteOutline as TrashIcon,
  AutoAwesome as SparklesIcon,
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
      active: currentProjectId === null,
      onClick: () => {
        setCurrentProject(null);
        setCurrentNote(null);
      },
    },
    {
      id: 'favorites',
      label: 'Favoritos',
      icon: <StarIcon sx={{ fontSize: 22 }} />,
      active: currentProjectId === 'favorites',
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
      active: currentProjectId === 'trash',
      onClick: () => {
        setCurrentProject('trash');
        setCurrentNote(null);
      },
    },
    {
      id: 'ai',
      label: 'CleoBot',
      icon: <SparklesIcon sx={{ fontSize: 22 }} />,
      active: aiDrawerOpen,
      onClick: toggleAiDrawer,
      color: '#845EC2',
    },
  ];

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        pb: 'env(safe-area-inset-bottom, 0px)',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(26, 26, 53, 0.94)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        px: 1,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
      }}
    >
      {navItems.map((item) => {
        if (item.isAction) {
          return (
            <Box key={item.id} sx={{ position: 'relative', top: -10 }}>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <IconButton
                  onClick={item.onClick}
                  aria-label="Añadir nota"
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
                    color: '#fff',
                    boxShadow: '0 6px 20px rgba(56, 108, 95, 0.45)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #6a968c 0%, #386c5f 100%)',
                    },
                  }}
                >
                  <AddIcon sx={{ fontSize: 26 }} />
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
              px: 1.2,
              borderRadius: 2,
              color: item.active ? activeColor : 'text.secondary',
              transition: 'all 0.2s ease',
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            <motion.div
              animate={{ scale: item.active ? 1.15 : 1, y: item.active ? -2 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {item.icon}
            </motion.div>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.68rem',
                fontWeight: item.active ? 700 : 500,
                color: item.active ? activeColor : 'text.secondary',
                mt: 0.2,
                lineHeight: 1,
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
