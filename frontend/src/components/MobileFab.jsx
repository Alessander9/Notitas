import React, { useState } from 'react';
import { Box, Tooltip, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import { NoteAdd as NoteAddIcon } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';

/**
 * FAB contextual en móvil: solo muestra "Nueva nota aquí" cuando hay un
 * proyecto seleccionado. Las demás acciones (nota rápida, nuevo proyecto,
 * tema) ya están en la Navbar y en el Sidebar móvil, así que este FAB
 * se limita a la única acción contextual no duplicada.
 */
export default function MobileFab() {
  const { currentProjectId, setCurrentNote } = useUiStore();
  const queryClient = useQueryClient();

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

  // Solo mostrar el FAB cuando hay un proyecto seleccionado
  if (typeof currentProjectId !== 'number') return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 20,
        zIndex: 1200,
      }}
    >
      <Tooltip title="Nueva nota aquí" placement="left">
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <IconButton
            onClick={() => createNoteMutation.mutate()}
            aria-label="Nueva nota"
            sx={{
              width: 54,
              height: 54,
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
              color: '#fff',
              boxShadow: '0 8px 32px rgba(56,108,95,0.45)',
              '&:hover': {
                background: 'linear-gradient(135deg, #6a968c 0%, #386c5f 100%)',
                boxShadow: '0 12px 40px rgba(56,108,95,0.55)',
              },
              transition: 'all 0.25s ease',
            }}
          >
            <NoteAddIcon sx={{ fontSize: 26 }} />
          </IconButton>
        </motion.div>
      </Tooltip>
    </Box>
  );
}
