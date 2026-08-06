import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { WarningAmber as WarningIcon } from '@mui/icons-material';
import { useConfirmStore } from '../store/confirmStore';

export default function ConfirmDialog() {
  const { state, close } = useConfirmStore();
  const open = Boolean(state);
  const color = state?.color || 'error';

  const handleCancel = () => close();

  const handleConfirm = () => {
    const onConfirm = state?.onConfirm;
    close();
    if (onConfirm) onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      <Box sx={{ p: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 3.5 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}.main`,
            color: `${color}.contrastText`,
            mb: 2,
            boxShadow: 4,
            animation: 'confirmPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '@keyframes confirmPop': {
              '0%': { transform: 'scale(0.5)', opacity: 0 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        >
          <WarningIcon sx={{ fontSize: 30 }} />
        </Box>
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pt: 0, pb: 1, fontSize: '1.1rem' }}>
          {state?.title || '¿Estás seguro?'}
        </DialogTitle>
        <DialogContent sx={{ pt: '0 !important', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {state?.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1, width: '100%' }}>
          <Button onClick={handleCancel} variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
            {state?.cancelLabel || 'Cancelar'}
          </Button>
          <Button onClick={handleConfirm} color={color} variant="contained" sx={{ flex: 1, borderRadius: 2 }}>
            {state?.confirmLabel || 'Confirmar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
