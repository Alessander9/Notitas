import React, { useState } from 'react';
import { Box, SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';
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

/**
 * Acciones rápidas en móvil: un FAB flotante con SpeedDial para crear
 * una nota en el proyecto actual, abrir el diálogo de nuevo proyecto
 * (viaja al Sidebar vía evento global) y cambiar el tema.
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
            icon: <NoteAddIcon />,
            name: 'Nueva nota',
            onClick: () => createNoteMutation.mutate(),
          },
        ]
      : []),
    {
      icon: <FolderIcon />,
      name: 'Nuevo proyecto',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('notitas:new-project'));
      },
    },
    {
      icon: darkMode ? <LightModeIcon /> : <DarkModeIcon />,
      name: darkMode ? 'Modo claro' : 'Modo oscuro',
      onClick: () => toggleDarkMode(),
    },
  ];

  return (
    <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1200 }}>
      <SpeedDial
        ariaLabel="Acciones rápidas"
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        icon={<SpeedDialIcon icon={<AddIcon />} openIcon={<CloseIcon />} />}
        FabProps={{
          sx: {
            background: 'linear-gradient(135deg, #386c5f 0%, #00C9A7 100%)',
            boxShadow: '0 8px 28px rgba(56,108,95,0.45)',
            '&:hover': {
              background: 'linear-gradient(135deg, #264e44 0%, #386c5f 100%)',
            },
          },
        }}
      >
        {actions.map((a) => (
          <SpeedDialAction
            key={a.name}
            icon={a.icon}
            tooltipTitle={a.name}
            tooltipOpen
            onClick={() => {
              setOpen(false);
              a.onClick();
            }}
          />
        ))}
      </SpeedDial>
    </Box>
  );
}
