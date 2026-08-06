import React from 'react';
import { Box, Divider, Skeleton } from '@mui/material';

// Renders skeleton content for the Sidebar. It lives inside the Sidebar's
// own container, so it does not include width/border/background chrome.
export default function SidebarSkeleton({ collapsed = false }) {
  return (
    <>
      {/* Collapse toggle header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          p: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: '52px',
        }}
      >
        {!collapsed && <Skeleton variant="text" width={110} height={16} sx={{ ml: 1 }} />}
        <Skeleton variant="circular" width={28} height={28} />
      </Box>

      {/* Action Button */}
      <Box sx={{ p: collapsed ? 1.5 : 2, display: 'flex', justifyContent: 'center' }}>
        {collapsed ? (
          <Skeleton variant="rounded" width={42} height={42} sx={{ borderRadius: 2 }} />
        ) : (
          <Skeleton variant="rounded" height={40} sx={{ borderRadius: 2.5, width: '100%' }} />
        )}
      </Box>

      <Divider />

      {/* Primary Navigation */}
      <Box sx={{ px: collapsed ? 1 : 1.5, py: 1 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 1.5,
              py: 1,
              px: 1,
              borderRadius: 2,
            }}
          >
            <Skeleton variant="circular" width={20} height={20} />
            {!collapsed && <Skeleton variant="text" width={140} height={20} />}
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Projects Title */}
      {!collapsed && (
        <Box sx={{ px: 2, py: 1 }}>
          <Skeleton variant="text" width={120} height={14} />
        </Box>
      )}

      {/* Projects List */}
      <Box sx={{ flexGrow: 1, overflowY: 'hidden', px: collapsed ? 1 : 1.5, pb: 2 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 1.5,
              py: 1,
              px: collapsed ? 0 : 1,
              borderRadius: 2.5,
            }}
          >
            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1.5 }} />
            {!collapsed && (
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" width={`${85 - i * 8}%`} height={16} />
                <Skeleton variant="text" width="55%" height={12} />
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </>
  );
}
