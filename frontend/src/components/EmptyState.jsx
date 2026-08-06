import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * Estado vacío ilustrado: blob orgánico con gradiente del color de marca,
 * icono flotante animado, título, descripción y CTA opcional.
 */
export default function EmptyState({ icon, title, description, actionLabel, onAction, color = '#386c5f' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 6, px: 2 }}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <Box sx={{ position: 'relative', width: 112, height: 112, mb: 2 }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '44% 56% 63% 37% / 55% 42% 58% 45%',
              background: `linear-gradient(135deg, ${color} 0%, ${color}99 55%, ${color}33 100%)`,
              animation: 'blobFloat 6s ease-in-out infinite',
              boxShadow: `0 14px 40px ${color}33`,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              '& > *': { fontSize: 46, filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.25))' },
            }}
          >
            {icon}
          </Box>
        </Box>
      </motion.div>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 2.5, borderRadius: 2, px: 3.5, py: 1 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
