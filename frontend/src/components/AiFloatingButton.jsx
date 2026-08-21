import React from 'react';
import { Box, Tooltip, Fab, useTheme, useMediaQuery } from '@mui/material';
import { AutoAwesome as SparklesIcon, SmartToy as BotIcon } from '@mui/icons-material';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

export default function AiFloatingButton() {
  const { isAuthenticated } = useAuthStore();
  const { aiDrawerOpen, toggleAiDrawer, currentNoteId } = useUiStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // En móvil fuera de una nota, la barra inferior (MobileBottomNav) ya incluye el botón de CleoBot.
  if (!isAuthenticated || aiDrawerOpen || (isMobile && !currentNoteId)) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 16, sm: 28 },
        right: { xs: 14, sm: 28 },
        zIndex: 99999,
        pointerEvents: 'auto',
      }}
    >
      <Tooltip
        title="CleoBot — Asistente Virtual (Ctrl+J)"
        placement="left"
        arrow
      >
        <Fab
          variant="extended"
          onClick={toggleAiDrawer}
          aria-label="Abrir asistente de IA Notitas"
          sx={{
            background: 'linear-gradient(135deg, #10b981 0%, #386c5f 50%, #153830 100%) !important',
            color: '#ffffff !important',
            fontWeight: 800,
            fontSize: { xs: '0.85rem', sm: '0.92rem' },
            px: { xs: 0, sm: 2.5 },
            minWidth: { xs: 44, sm: 'auto' },
            width: { xs: 44, sm: 'auto' },
            height: { xs: 44, sm: 52 },
            borderRadius: { xs: '50%', sm: '28px' },
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.45), 0 4px 12px rgba(0,0,0,0.25) !important',
            border: '2px solid rgba(255, 255, 255, 0.45)',
            textTransform: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 0, sm: 1.2 },
            transition: 'all 0.25s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #34d399 0%, #386c5f 50%, #0d2b23 100%) !important',
              transform: 'scale(1.06)',
              boxShadow: '0 12px 32px rgba(16, 185, 129, 0.65), 0 6px 16px rgba(0,0,0,0.35) !important',
            },
          }}
        >
          <BotIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline-block' }, fontWeight: 800, letterSpacing: '0.02em' }}>
            CleoBot
          </Box>
          <SparklesIcon sx={{ fontSize: 16, color: '#fef08a', display: { xs: 'none', sm: 'inline-block' } }} />
        </Fab>
      </Tooltip>
    </Box>
  );
}
