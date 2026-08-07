import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { WarningAmber as WarningIcon } from '@mui/icons-material';
import { useConfirmStore } from '../store/confirmStore';

const colorMap = {
  error: { main: '#ef4444', light: '#fef2f2', dark: '#dc2626' },
  warning: { main: '#f59e0b', light: '#fffbeb', dark: '#d97706' },
  info: { main: '#3b82f6', light: '#eff6ff', dark: '#2563eb' },
  success: { main: '#386c5f', light: '#f0fdf4', dark: '#264e44' },
};

export default function ConfirmDialog() {
  const { state, close } = useConfirmStore();
  const open = Boolean(state);
  const color = state?.color || 'error';
  const colors = colorMap[color] || colorMap.error;

  const handleCancel = () => close();

  const handleConfirm = () => {
    const onConfirm = state?.onConfirm;
    close();
    if (onConfirm) onConfirm();
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={handleCancel}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              overflow: 'hidden',
              bgcolor: 'background.paper',
              boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
              border: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Box sx={{ p: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4, pb: 1 }}>
              {/* Icono animado con onda pulsante */}
              <Box sx={{ position: 'relative', mb: 2.5 }}>
                {/* Ondas de pulso */}
                <motion.div
                  animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `2px solid ${colors.main}`,
                    pointerEvents: 'none',
                  }}
                />
                <motion.div
                  animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
                  transition={{ duration: 1.5, delay: 0.3, repeat: Infinity, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `2px solid ${colors.main}`,
                    pointerEvents: 'none',
                  }}
                />
                {/* Icono principal */}
                <motion.div
                  animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${colors.main} 0%, ${colors.dark} 100%)`,
                    color: '#fff',
                    boxShadow: `0 10px 30px ${colors.main}50`,
                  }}
                >
                  <WarningIcon sx={{ fontSize: 34 }} />
                </motion.div>
              </Box>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <DialogTitle
                  sx={{
                    fontWeight: 800,
                    textAlign: 'center',
                    pt: 0,
                    pb: 1,
                    fontSize: '1.15rem',
                    color: 'text.primary',
                  }}
                >
                  {state?.title || '¿Estás seguro?'}
                </DialogTitle>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <DialogContent sx={{ pt: '0 !important', textAlign: 'center', px: 4 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {state?.message}
                  </Typography>
                </DialogContent>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                style={{ width: '100%' }}
              >
                <DialogActions sx={{ p: 2.5, pt: 2, gap: 1.5, width: '100%' }}>
                  <Button
                    onClick={handleCancel}
                    variant="outlined"
                    sx={{
                      flex: 1,
                      borderRadius: 2.5,
                      py: 1.2,
                      fontWeight: 600,
                      textTransform: 'none',
                      borderWidth: 2,
                      '&:hover': { borderWidth: 2, transform: 'translateY(-1px)' },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {state?.cancelLabel || 'Cancelar'}
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    variant="contained"
                    sx={{
                      flex: 1,
                      borderRadius: 2.5,
                      py: 1.2,
                      fontWeight: 700,
                      textTransform: 'none',
                      background: `linear-gradient(135deg, ${colors.main} 0%, ${colors.dark} 100%)`,
                      boxShadow: `0 6px 20px ${colors.main}40`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${colors.main} 0%, ${colors.main} 100%)`,
                        boxShadow: `0 10px 28px ${colors.main}55`,
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {state?.confirmLabel || 'Confirmar'}
                  </Button>
                </DialogActions>
              </motion.div>
            </Box>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
