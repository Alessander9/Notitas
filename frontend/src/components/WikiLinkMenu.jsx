import React, { useEffect, useRef } from 'react';
import { Paper, List, ListItemButton, ListItemText, Typography, Box } from '@mui/material';

export default function WikiLinkMenu({ open, query, notes = [], position, onSelect, onClose }) {
  const ref = useRef(null);
  const safeNotes = Array.isArray(notes) ? notes : [];
  const filtered = safeNotes
    .filter(n => !query || (n.title || '').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open || filtered.length === 0) return null;

  return (
    <Paper
      ref={ref}
      elevation={8}
      sx={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9998,
        minWidth: 240,
        maxWidth: 320,
        maxHeight: 280,
        overflow: 'auto',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          Enlazar nota
        </Typography>
      </Box>
      <List dense disablePadding>
        {filtered.map(n => (
          <ListItemButton
            key={n.id}
            onMouseDown={(e) => { e.preventDefault(); onSelect(n); }}
            sx={{ py: 0.75, px: 1.5 }}
          >
            <ListItemText
              primary={n.icon ? String(n.icon) + ' ' + (n.title || 'Sin título') : (n.title || 'Sin título')}
              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
