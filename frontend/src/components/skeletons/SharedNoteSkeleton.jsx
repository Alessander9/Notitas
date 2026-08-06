import React from 'react';
import { Paper, Box, Skeleton } from '@mui/material';

export default function SharedNoteSkeleton() {
  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 3, overflow: 'hidden' }}>
      {/* Cover banner */}
      <Skeleton variant="rounded" height={250} sx={{ borderRadius: 2, mb: 3 }} />

      {/* Title */}
      <Skeleton variant="text" width="55%" height={48} sx={{ mb: 1 }} />

      {/* Meta line */}
      <Skeleton variant="text" width="42%" height={14} sx={{ mb: 2.5 }} />

      {/* Tags */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Skeleton variant="rounded" width={66} height={24} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" width={84} height={24} sx={{ borderRadius: 2 }} />
      </Box>

      {/* Content lines */}
      <Skeleton variant="text" width="100%" height={18} sx={{ mb: 1.5 }} />
      <Skeleton variant="text" width="96%" height={18} sx={{ mb: 1.5 }} />
      <Skeleton variant="text" width="98%" height={18} sx={{ mb: 1.5 }} />
      <Skeleton variant="text" width="88%" height={18} sx={{ mb: 1.5 }} />
      <Skeleton variant="text" width="64%" height={18} />
    </Paper>
  );
}
