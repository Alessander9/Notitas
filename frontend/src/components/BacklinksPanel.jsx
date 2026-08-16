import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';

export default function BacklinksPanel({ currentNoteId, notes, onNoteClick }) {
  const backlinks = (notes || []).filter(n => {
    if (!n || n.id === currentNoteId) return false;
    return n.content && n.content.includes(`data-note-id="${currentNoteId}"`);
  });

  if (backlinks.length === 0) return null;

  return (
    <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem', display: 'block', mb: 1.5 }}
      >
        Mencionada en {backlinks.length} nota{backlinks.length !== 1 ? 's' : ''}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {backlinks.map(n => (
          <Tooltip key={n.id} title={`Abrir "${n.title || 'Sin título'}"`}>
            <Chip
              label={n.icon ? `${n.icon} ${n.title || 'Sin título'}` : (n.title || 'Sin título')}
              size="small"
              variant="outlined"
              onClick={() => onNoteClick(n.id)}
              sx={{
                height: 24,
                fontSize: '0.72rem',
                fontWeight: 500,
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
              }}
            />
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
