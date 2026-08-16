import React from 'react';
import { Box, Tooltip, Typography, Avatar } from '@mui/material';
import { Circle as CircleIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getAvatarUrl } from '../utils/text';

/**
 * Shows avatars of collaborators who recently edited the note (last 5 min).
 * Uses the note's version history as a proxy — no socket needed.
 */
export default function ActiveEditorsIndicator({ noteId, members = [] }) {
  const { user } = useAuthStore();

  const { data: versions = [] } = useQuery({
    queryKey: ['activeEditors', noteId],
    queryFn: async () => {
      const res = await api.get(`/notes/${noteId}/versions`);
      return res.data || [];
    },
    enabled: Boolean(noteId),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const recentEditorIds = [...new Set(
    versions
      .filter((v) => new Date(v.createdAt).getTime() > fiveMinAgo && v.userId !== user?.id)
      .map((v) => v.userId),
  )];

  const recentEditors = recentEditorIds
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean)
    .slice(0, 3);

  if (recentEditors.length === 0) return null;

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="caption" fontWeight={700}>Editando ahora:</Typography>
          {recentEditors.map((m) => (
            <Typography key={m.id} variant="caption" display="block">{m.name}</Typography>
          ))}
        </Box>
      }
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <CircleIcon sx={{ fontSize: 8, color: '#22c55e', animation: 'pulse 2s infinite' }} />
        <Box sx={{ display: 'flex' }}>
          {recentEditors.map((m, i) => (
            <Avatar
              key={m.id}
              src={getAvatarUrl(m.avatar)}
              sx={{
                width: 20,
                height: 20,
                fontSize: '0.6rem',
                bgcolor: 'primary.main',
                ml: i > 0 ? -0.8 : 0,
                border: '1.5px solid',
                borderColor: 'background.paper',
              }}
            >
              {(m.name || '?').charAt(0)}
            </Avatar>
          ))}
        </Box>
        <Typography variant="caption" color="success.main" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
          editando
        </Typography>
      </Box>
    </Tooltip>
  );
}
