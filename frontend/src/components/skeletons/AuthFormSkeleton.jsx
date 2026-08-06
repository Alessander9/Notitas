import React from 'react';
import { Box, Skeleton } from '@mui/material';

// Renders skeleton content for the Login/Register cards while the form is
// being submitted. `fields` controls how many input placeholders to show.
export default function AuthFormSkeleton({ fields = 2 }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* App title */}
      <Skeleton variant="text" width={120} height={44} sx={{ mb: 0.5 }} />

      {/* Subtitle */}
      <Skeleton variant="text" width={230} height={18} sx={{ mb: 4 }} />

      {/* Form fields */}
      {Array.from({ length: fields }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={56} sx={{ width: '100%', borderRadius: 2, mb: 2.5 }} />
      ))}

      {/* Submit button */}
      <Skeleton variant="rounded" height={48} sx={{ width: '100%', borderRadius: 2, mt: 1, mb: 2.5 }} />

      {/* Bottom link */}
      <Skeleton variant="text" width={170} height={18} />
    </Box>
  );
}
