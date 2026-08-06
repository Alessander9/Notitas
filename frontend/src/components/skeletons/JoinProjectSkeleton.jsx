import React from 'react';
import { Box, Skeleton } from '@mui/material';

// Renders skeleton content for the JoinProject card while the invitation is
// being processed.
export default function JoinProjectSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Icon */}
      <Skeleton variant="circular" width={60} height={60} />

      {/* Title */}
      <Skeleton variant="text" width={210} height={32} />

      {/* Body text */}
      <Skeleton variant="text" width="85%" height={16} />
      <Skeleton variant="text" width="70%" height={16} />

      {/* Action button */}
      <Skeleton variant="rounded" height={48} sx={{ width: '100%', borderRadius: 2, mt: 2 }} />
    </Box>
  );
}
