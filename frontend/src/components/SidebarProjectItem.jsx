import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  Share as ShareIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronRight as ChevronRightIcon,
  Description as NoteIcon,
  Add as AddIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
} from '@mui/icons-material';
import CoverImage from './CoverImage';
import { getProjectIcon } from './ProjectFormDialog';
import { useProjectNotes } from '../hooks/useProjectNotes';
import { getPlainText, getAssetUrl } from '../utils/text';

const MAX_NOTES = 50;

export default function SidebarProjectItem({
  project,
  isSelected,
  isCollapsed,
  expanded,
  onToggleExpand,
  onSelect,
  onOpenNote,
  onShare,
  onEdit,
  onDelete,
  onCreateNote,
  isPinned,
  onTogglePin,
}) {
  const hasCover = Boolean(project.coverImage);
  const coverUrl = hasCover ? getAssetUrl(project.coverImage) : null;

  const { data: notes = [], isLoading: notesLoading } = useProjectNotes(project.id, !isCollapsed);

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, MAX_NOTES);

  const accentColor = project.color || '#386c5f';

  return (
    <motion.div
      layout
      layoutId={`project-${project.id}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 250, damping: 24 }}
      style={{ marginBottom: 4 }}
    >
      {/* ── Project Header Row ───────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: 2.5,
          transition: 'all 0.2s ease',
          bgcolor: isSelected ? `${accentColor}0d` : 'transparent',
          '&:hover': {
            bgcolor: isSelected ? `${accentColor}12` : 'action.hover',
            '& .project-hover-actions': { opacity: 1, pointerEvents: 'auto' },
          },
        }}
      >
        <Tooltip title={isCollapsed ? project.name : ''} placement="right">
          <Box
            onClick={onSelect}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: isCollapsed ? 1 : 1.5,
              py: 1.2,
              cursor: 'pointer',
              minHeight: 48,
              borderRadius: 2.5,
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Selected accent bar */}
            {isSelected && !isCollapsed && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: 2,
                  bgcolor: accentColor,
                }}
              />
            )}

            {/* Expand chevron */}
            {!isCollapsed && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                aria-label={expanded ? 'Contraer notas' : 'Expandir notas'}
                sx={{
                  p: 0.2,
                  flexShrink: 0,
                  color: expanded ? 'primary.main' : 'text.disabled',
                  transition: 'all 0.2s ease',
                  '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
                }}
              >
                <ChevronRightIcon
                  sx={{
                    fontSize: 16,
                    transform: expanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </IconButton>
            )}

            {/* Project icon / cover thumbnail */}
            {isCollapsed ? (
              <Box
                sx={{
                  position: 'relative',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1.5,
                  bgcolor: hasCover ? 'transparent' : `${accentColor}18`,
                  '& .project-icon-view': { display: 'flex' },
                  '& .project-edit-view': { display: 'none' },
                  '&:hover': {
                    '& .project-icon-view': { display: 'none' },
                    '& .project-edit-view': { display: 'flex', color: 'primary.main' },
                  },
                }}
              >
                <Box className="project-icon-view" sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  {coverUrl ? (
                    <Avatar variant="rounded" src={coverUrl} alt={project.name} sx={{ width: 28, height: 28, borderRadius: 1.5 }} />
                  ) : (
                    <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>{getProjectIcon(project.icon)}</Typography>
                  )}
                </Box>
                <Box
                  className="project-edit-view"
                  onClick={(e) => { e.stopPropagation(); onEdit(project, e); }}
                  sx={{ alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  flexShrink: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: hasCover ? 'transparent' : `${accentColor}18`,
                  border: hasCover ? 'none' : `1px solid ${accentColor}25`,
                }}
              >
                {coverUrl ? (
                  <CoverImage src={coverUrl} alt={project.name} sx={{ width: '100%', height: '100%', borderRadius: 0 }} />
                ) : (
                  <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{getProjectIcon(project.icon)}</Typography>
                )}
              </Box>
            )}

            {/* Project name + note count */}
            {!isCollapsed && (
              <Box sx={{ minWidth: 0, flexGrow: 1, ml: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.87rem',
                      color: isSelected ? 'text.primary' : 'text.primary',
                      letterSpacing: '-0.01em',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {project.name}
                  </Typography>
                  {notes.length > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                    >
                      <Box
                        sx={{
                          minWidth: 20,
                          height: 20,
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: `${accentColor}20`,
                          flexShrink: 0,
                          border: `1px solid ${accentColor}30`,
                        }}
                      >
                        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: accentColor, lineHeight: 1 }}>
                          {notes.length}
                        </Typography>
                      </Box>
                    </motion.div>
                  )}
                </Box>
                {project.description && (
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ fontSize: '0.7rem', color: 'text.disabled', display: 'block', mt: -0.1 }}
                  >
                    {project.description}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Tooltip>

        {/* Hover action buttons (non-collapsed only) */}
        {!isCollapsed && (
          <Box
            className="project-hover-actions"
            sx={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: 0.1,
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.15s ease',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              p: 0.15,
              zIndex: 2,
            }}
          >
            <Tooltip title={isPinned ? 'Desfijar proyecto' : 'Fijar proyecto'}>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onTogglePin(project.id); }}
                sx={{ p: 0.4, color: isPinned ? 'primary.main' : 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                {isPinned ? <PinIcon sx={{ fontSize: 14, transform: 'rotate(45deg)' }} /> : <PinOutlinedIcon sx={{ fontSize: 14 }} />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Compartir">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onShare(project, e); }} sx={{ p: 0.4, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                <ShareIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(project, e); }} sx={{ p: 0.4, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton size="small" onClick={(e) => onDelete(project, e)} sx={{ p: 0.4, color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* ── Expanded Notes List ───────────────────────────── */}
      {!isCollapsed && (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="notes"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <Box
                sx={{
                  ml: 3.8,
                  pl: 1.5,
                  borderLeft: '2px solid',
                  borderColor: `${accentColor}25`,
                  mt: 0.3,
                  mb: 0.8,
                  pr: 0.5,
                }}
              >
                {notesLoading ? (
                  <Box sx={{ py: 0.8, pl: 0.5 }}>
                    <CircularProgress size={14} />
                  </Box>
                ) : recentNotes.length === 0 ? (
                  <Typography variant="caption" color="text.disabled" sx={{ pl: 0.5, fontSize: '0.7rem', fontStyle: 'italic' }}>
                    Sin notas
                  </Typography>
                ) : (
                  recentNotes.map((note, index) => {
                    const excerpt = getPlainText(note.content);
                    return (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                      >
                      <Box
                        onClick={() => onOpenNote(project, note)}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 0.8,
                          px: 1.2,
                          py: 0.7,
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          minHeight: 40,
                          '&:hover': {
                            bgcolor: `${accentColor}12`,
                            transform: 'translateX(4px)',
                          },
                          '&:active': {
                            transform: 'scale(0.98)',
                          },
                        }}
                      >
                        <NoteIcon sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0, mt: 0.3 }} />
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontSize: '0.76rem', fontWeight: 500, lineHeight: 1.3 }}
                          >
                            {note.title || 'Sin título'}
                          </Typography>
                          {excerpt && (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              noWrap
                              sx={{ fontSize: '0.62rem', display: 'block', lineHeight: 1.2, mt: 0.1 }}
                            >
                              {excerpt.slice(0, 50)}
                            </Typography>
                          )}
                        </Box>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ fontSize: '0.58rem', flexShrink: 0, mt: 0.3, whiteSpace: 'nowrap' }}
                        >
                          {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Typography>
                      </Box>
                      </motion.div>
                    );
                  })
                )}

                {/* "Crear nota" button */}
                {onCreateNote && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Box
                      onClick={() => onCreateNote(project.id)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.8,
                        px: 1.2,
                        py: 0.7,
                        mt: 0.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        color: 'text.disabled',
                        transition: 'all 0.2s ease',
                        minHeight: 36,
                        border: '1px dashed',
                        borderColor: 'divider',
                        '&:hover': {
                          bgcolor: `${accentColor}10`,
                          color: 'primary.main',
                          borderColor: `${accentColor}40`,
                          transform: 'translateX(4px)',
                        },
                        '&:active': {
                          transform: 'scale(0.98)',
                        },
                      }}
                    >
                      <AddIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 500 }}>
                        Nueva nota
                      </Typography>
                    </Box>
                  </motion.div>
                )}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
