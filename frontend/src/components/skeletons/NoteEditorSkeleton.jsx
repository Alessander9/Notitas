import React from 'react';
import { Box, Skeleton, Paper } from '@mui/material';

export default function NoteEditorSkeleton() {
  return (
    <Box
      sx={{
        flexGrow: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {/* Top Toolbar */}
      <Box
        sx={{
          p: 1.5,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" width={112} height={32} sx={{ borderRadius: 1.5 }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={36} height={36} />
          <Skeleton variant="circular" width={36} height={36} />
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 4, maxWidth: 850, width: '100%', mx: 'auto', flexGrow: 1 }}>
        {/* Cover banner */}
        <Skeleton variant="rounded" height={220} sx={{ mb: 3, borderRadius: 3 }} />

        {/* Title */}
        <Skeleton variant="text" width="60%" height={52} sx={{ mb: 2 }} />

        {/* Tags */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <Skeleton variant="rounded" width={72} height={26} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" width={60} height={26} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" width={84} height={26} sx={{ borderRadius: 2 }} />
        </Box>

        {/* Formatting toolbar */}
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 0.5, mb: 2, display: 'flex', gap: 0.5, borderRadius: 2, bgcolor: 'background.default' }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5 }} />
          ))}
        </Paper>

        {/* Content lines */}
        {[100, 92, 96, 60, 88].map((w, i) => (
          <Skeleton key={i} variant="text" width={`${w}%`} height={18} sx={{ mb: 1.5 }} />
        ))}
      </Box>
    </Box>
  );
}
