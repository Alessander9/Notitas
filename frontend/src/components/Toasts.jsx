import React, { useEffect } from 'react';
import { Box, Alert, Button } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../store/toastStore';

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
    >
      <Alert
        severity={toast.severity}
        variant="filled"
        onClose={onDismiss}
        action={
          toast.action ? (
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                toast.action.onClick();
                onDismiss();
              }}
              sx={{
                color: 'inherit',
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '0.78rem',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
              }}
            >
              {toast.action.label}
            </Button>
          ) : undefined
        }
        sx={{
          borderRadius: 2.5,
          boxShadow: 4,
          fontWeight: 500,
          '& .MuiAlert-message': { fontSize: '0.85rem' },
          '& .MuiAlert-action': { alignItems: 'center', pl: 1.5 },
        }}
      >
        {toast.message}
      </Alert>
    </motion.div>
  );
}

export default function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        bottom: { xs: 88, sm: 20 },
        right: { xs: 12, sm: 20 },
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: 380,
        width: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 40px)' },
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Box key={t.id} sx={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
          </Box>
        ))}
      </AnimatePresence>
    </Box>
  );
}
