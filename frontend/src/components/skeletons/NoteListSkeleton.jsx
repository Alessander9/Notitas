import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

// Renders skeleton content for the NoteList. It lives inside the NoteList's
// own container, so it does not include width/border/background chrome.
export default function NoteListSkeleton() {
  return (
    <>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Skeleton variant="text" width={110} height={22} />
        <Skeleton variant="rounded" width={82} height={32} sx={{ borderRadius: 2 }} />
      </Box>

      {/* Notes Cards */}
      <Box sx={{ flexGrow: 1, overflowY: 'hidden', px: 2, py: 2 }}>
        <Stack spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Box
              key={i}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}
            >
              {/* Some cards show a cover image */}
              {i % 2 === 0 && <Skeleton variant="rectangular" height={115} />}

              <Box sx={{ p: 2 }}>
                <Skeleton variant="text" width="75%" height={22} />
                <Skeleton variant="text" width="100%" height={13} />
                <Skeleton variant="text" width="90%" height={13} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                  <Skeleton variant="rounded" width={54} height={18} sx={{ borderRadius: 1 }} />
                  <Skeleton variant="text" width={52} height={12} />
                </Box>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    </>
  );
}
