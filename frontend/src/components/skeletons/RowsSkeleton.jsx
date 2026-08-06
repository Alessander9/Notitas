import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

/** Filas de lista skeleton (para la Papelera y listados similares). */
export default function RowsSkeleton({ count = 5 }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2.5,
            p: 2.5,
            bgcolor: 'background.paper',
          }}
        >
          <Skeleton variant="circular" width={20} height={20} animation="wave" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="40%" height={20} animation="wave" />
            <Skeleton variant="text" width="25%" height={12} animation="wave" />
          </Box>
          <Skeleton variant="rounded" width={110} height={24} animation="wave" />
          <Skeleton variant="circular" width={30} height={30} animation="wave" />
          <Skeleton variant="circular" width={30} height={30} animation="wave" />
        </Box>
      ))}
    </Stack>
  );
}
