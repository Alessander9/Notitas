import React from 'react';
import { Box, Paper, Typography, Chip, LinearProgress, Tooltip } from '@mui/material';
import { CheckCircleOutline as CheckIcon } from '@mui/icons-material';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: '#6366f1', emptyMsg: 'Sin notas pendientes' },
  { key: 'progress', label: 'In Progress', color: '#f59e0b', emptyMsg: 'Nada en progreso' },
  { key: 'done', label: 'Done', color: '#10b981', emptyMsg: 'Nada completado aún' },
];

function parseChecklist(content = '') {
  const total = (content.match(/data-checked=/g) || []).length;
  const checked = (content.match(/data-checked="true"/g) || []).length;
  return { total, checked };
}

function classifyNote(note) {
  const { total, checked } = parseChecklist(note.content || '');
  if (total === 0) return null; // no checklist
  if (checked === 0) return 'todo';
  if (checked < total) return 'progress';
  return 'done';
}

export default function KanbanView({ notes = [], onNoteClick }) {
  const columns = {
    todo: [],
    progress: [],
    done: [],
  };
  for (const note of notes) {
    const col = classifyNote(note);
    if (col) columns[col].push(note);
  }

  const hasAny = Object.values(columns).some(col => col.length > 0);

  if (!hasAny) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <CheckIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
          <Typography variant="body2">No hay notas con checklists en este proyecto</Typography>
          <Typography variant="caption">Agregar elementos de lista de tareas en una nota para verla aquí</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, p: 2, overflowX: 'auto', height: '100%', alignItems: 'flex-start' }}>
      {COLUMNS.map(col => (
        <Box
          key={col.key}
          sx={{
            flex: '0 0 280px',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            minHeight: 100,
          }}
        >
          {/* Column header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color, flexShrink: 0 }} />
            <Typography variant="subtitle2" fontWeight={700}>{col.label}</Typography>
            <Chip
              label={columns[col.key].length}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                bgcolor: col.color + '22',
                color: col.color,
                fontWeight: 700,
                ml: 'auto',
              }}
            />
          </Box>

          {/* Cards */}
          {columns[col.key].length === 0 ? (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.disabled">{col.emptyMsg}</Typography>
            </Box>
          ) : (
            columns[col.key].map(note => {
              const { total, checked } = parseChecklist(note.content || '');
              const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
              return (
                <Paper
                  key={note.id}
                  elevation={0}
                  onClick={() => onNoteClick(note.id)}
                  sx={{
                    p: 1.75,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: col.color,
                      boxShadow: `0 4px 16px ${col.color}22`,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  {/* Title */}
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ mb: 1, lineHeight: 1.3 }}
                    noWrap
                  >
                    {note.icon && <span style={{ marginRight: 4 }}>{note.icon}</span>}
                    {note.title || 'Sin título'}
                  </Typography>

                  {/* Progress bar */}
                  {total > 0 && (
                    <Tooltip title={`${checked}/${total} tareas completadas`}>
                      <Box sx={{ mb: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': { bgcolor: col.color, borderRadius: 2 },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {checked}/{total} tareas
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {note.tags.slice(0, 3).map(tag => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              );
            })
          )}
        </Box>
      ))}
    </Box>
  );
}
