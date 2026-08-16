import React from 'react';
import { Box, Tooltip, Fab } from '@mui/material';
import { AutoAwesome as SparklesIcon, SmartToy as BotIcon } from '@mui/icons-material';
import { useUiStore } from '../store/uiStore';

export default function AiFloatingButton() {
  const { aiDrawerOpen, toggleAiDrawer } = useUiStore();

  if (aiDrawerOpen) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 20, sm: 28 },
        right: { xs: 18, sm: 28 },
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
            px: { xs: 2, sm: 2.5 },
            py: 1.5,
            height: { xs: 48, sm: 52 },
            borderRadius: '28px',
            boxShadow: '0 8px 30px rgba(16, 185, 129, 0.55), 0 4px 12px rgba(0,0,0,0.3) !important',
            border: '2px solid rgba(255, 255, 255, 0.45)',
            textTransform: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
            transition: 'all 0.25s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #34d399 0%, #386c5f 50%, #0d2b23 100%) !important',
              transform: 'scale(1.06)',
              boxShadow: '0 12px 36px rgba(16, 185, 129, 0.75), 0 6px 16px rgba(0,0,0,0.4) !important',
            },
          }}
        >
          <BotIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
          <Box component="span" sx={{ fontWeight: 800, letterSpacing: '0.02em' }}>
            CleoBot
          </Box>
          <SparklesIcon sx={{ fontSize: 16, color: '#fef08a' }} />
        </Fab>
      </Tooltip>
    </Box>
  );
}
