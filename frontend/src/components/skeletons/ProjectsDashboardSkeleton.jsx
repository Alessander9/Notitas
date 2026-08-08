import React from 'react';
import { Grid, Box, Skeleton, Divider } from '@mui/material';

export default function ProjectsDashboardSkeleton() {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Grid item xs={12} sm={6} md={4} lg={4} xl={4} key={i}>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 4,
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            {/* Card cover */}
            <Skeleton variant="rectangular" height={125} />

            <Box sx={{ p: 2.5 }}>
              {/* Icon + actions */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Skeleton variant="rounded" width={38} height={38} sx={{ borderRadius: '10px' }} />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Skeleton variant="circular" width={28} height={28} />
                  <Skeleton variant="circular" width={28} height={28} />
                  <Skeleton variant="circular" width={28} height={28} />
                </Box>
              </Box>

              {/* Title + description */}
              <Skeleton variant="text" width="70%" height={26} />
              <Skeleton variant="text" width="100%" height={14} />
              <Skeleton variant="text" width="85%" height={14} />

              <Divider sx={{ my: 1.5 }} />

              {/* Footer: date + avatars */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton variant="text" width={90} height={12} />
                <Box sx={{ display: 'flex' }}>
                  <Skeleton variant="circular" width={24} height={24} sx={{ mr: -0.8 }} />
                  <Skeleton variant="circular" width={24} height={24} sx={{ mr: -0.8 }} />
                  <Skeleton variant="circular" width={24} height={24} />
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
