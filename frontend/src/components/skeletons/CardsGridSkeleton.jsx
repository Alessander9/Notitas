import React from 'react';
import { Box, Skeleton } from '@mui/material';

/** Rejilla de tarjetas skeleton (para vistas tipo cuadrícula: Favoritos, etc.). */
export default function CardsGridSkeleton({ count = 6 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 2,
        px: { xs: 2, sm: 4 },
        pb: 4,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}
        >
          <Skeleton variant="rectangular" height={110} animation="wave" />
          <Box sx={{ p: 2 }}>
            <Skeleton variant="text" width="70%" height={22} animation="wave" />
            <Skeleton variant="text" width="100%" height={13} animation="wave" />
            <Skeleton variant="text" width="90%" height={13} animation="wave" />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
              <Skeleton variant="rounded" width={64} height={20} sx={{ borderRadius: 1 }} animation="wave" />
              <Skeleton variant="text" width={50} height={12} animation="wave" />
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
