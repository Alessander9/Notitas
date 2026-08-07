import React, { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Add as AddIcon,
  Close as CloseIcon,
  NoteAdd as NoteAddIcon,
  FolderOpen as FolderIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';

// Animación staggered para las acciones
const fabItem = {
  hidden: { opacity: 0, scale: 0.3, y: 20 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  }),
  exit: { opacity: 0, scale: 0.3, y: 10, transition: { duration: 0.15 } },
};

/**
 * Acciones rápidas en móvil: FAB flotante con menú animado para crear
 * notas, proyectos y cambiar tema. Mejorado con framer-motion.
 */
export default function MobileFab() {
  const { currentProjectId, setCurrentNote, toggleDarkMode, darkMode } = useUiStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

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

  const actions = [
    ...(typeof currentProjectId === 'number'
      ? [
          {
            icon: <NoteAddIcon sx={{ fontSize: 22 }} />,
            name: 'Nueva nota',
            color: '#386c5f',
            onClick: () => createNoteMutation.mutate(),
          },
        ]
      : []),
    {
      icon: <FolderIcon sx={{ fontSize: 22 }} />,
      name: 'Nuevo proyecto',
      color: '#6D4AFF',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('notitas:new-project'));
      },
    },
    {
      icon: darkMode ? <LightModeIcon sx={{ fontSize: 22 }} /> : <DarkModeIcon sx={{ fontSize: 22 }} />,
      name: darkMode ? 'Modo claro' : 'Modo oscuro',
      color: darkMode ? '#f59e0b' : '#6366f1',
      onClick: () => toggleDarkMode(),
    },
  ];

  const handleAction = (action) => {
    setOpen(false);
    action.onClick();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 20,
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(10,10,25,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: -1,
            }}
          />
        )}
      </AnimatePresence>

      {/* Acciones */}
      <AnimatePresence>
        {open &&
          actions.map((action, i) => (
            <motion.div
              key={action.name}
              custom={i}
              variants={fabItem}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexDirection: 'row-reverse',
                }}
              >
                {/* Tooltip label */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 + 0.1 }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.8,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      border: '1px solid',
                      borderColor: 'divider',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Typography variant="caption" fontWeight={600} color="text.primary">
                      {action.name}
                    </Typography>
                  </Box>
                </motion.div>

                {/* Action button */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <IconButton
                    onClick={() => handleAction(action)}
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'background.paper',
                      color: action.color,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        bgcolor: `${action.color}15`,
                        boxShadow: `0 6px 24px ${action.color}30`,
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {action.icon}
                  </IconButton>
                </motion.div>
              </Box>
            </motion.div>
          ))}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <IconButton
          onClick={() => setOpen(!open)}
          aria-label="Acciones rápidas"
          sx={{
            width: 58,
            height: 58,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(56,108,95,0.5)',
            '&:hover': {
              background: 'linear-gradient(135deg, #6a968c 0%, #386c5f 100%)',
              boxShadow: '0 12px 40px rgba(56,108,95,0.6)',
            },
            transition: 'all 0.25s ease',
          }}
        >
          <AddIcon sx={{ fontSize: 28 }} />
        </IconButton>
      </motion.div>
    </Box>
  );
}
