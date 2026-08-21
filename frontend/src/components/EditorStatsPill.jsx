import React, { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { getPlainText } from '../utils/text';

export default function EditorStatsPill({ content = '', isSaving = false, lastSavedAt = null }) {
  const { words, readingTime } = useMemo(() => {
    const plain = getPlainText(content, '').trim();
    if (!plain) return { words: 0, readingTime: 1 };
    const wordList = plain.split(/\s+/).filter(Boolean);
    const count = wordList.length;
    const time = Math.max(1, Math.ceil(count / 200));
    return { words: count, readingTime: time };
  }, [content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1.2,
          px: 1.4,
          py: 0.4,
          borderRadius: 4,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(26, 26, 53, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 4px 16px rgba(0, 0, 0, 0.35)'
              : '0 4px 14px rgba(56, 108, 95, 0.08)',
          fontSize: '0.72rem',
          userSelect: 'none',
        }}
      >
        {/* Status indicator (Pulsing dot) */}
        <Tooltip title={isSaving ? 'Guardando cambios...' : 'Todos los cambios están guardados en la nube'}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: isSaving ? '#f59e0b' : '#10b981',
                boxShadow: isSaving
                  ? '0 0 8px rgba(245, 158, 11, 0.7)'
                  : '0 0 8px rgba(16, 185, 129, 0.7)',
                animation: isSaving ? 'pulse 1s infinite alternate' : 'none',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(0.8)', opacity: 0.6 },
                  '100%': { transform: 'scale(1.2)', opacity: 1 },
                },
              }}
            />
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{
                fontSize: '0.7rem',
                color: isSaving ? 'warning.main' : 'success.main',
              }}
            >
              {isSaving ? 'Guardando…' : 'Guardado'}
            </Typography>
          </Box>
        </Tooltip>

        <Box sx={{ width: 1, height: 12, bgcolor: 'divider' }} />

        {/* Word count & Reading time */}
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
          {words} {words === 1 ? 'palabra' : 'palabras'} · ⏱️ {readingTime} min
        </Typography>
      </Box>
    </motion.div>
  );
}
