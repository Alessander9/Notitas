import React from 'react';
import { Box } from '@mui/material';

/**
 * Resalta las coincidencias de `query` dentro de `text` (case-insensitive).
 * Usado por la command palette y por la vista de búsqueda del NoteList para
 * que el resaltado sea consistente en toda la app.
 */
export default function HighlightText({ text = '', query = '', sx }) {
  const trimmed = String(query || '').trim();
  if (!trimmed || !text) return <>{text}</>;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <Box
            key={i}
            component="span"
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(109, 74, 255, 0.2)' : 'rgba(56, 108, 95, 0.15)',
              borderRadius: 0.5,
              px: 0.3,
              ...sx,
            }}
          >
            {part}
          </Box>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
