import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
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
  Group as GroupIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import ManageMembersDialog from './ManageMembersDialog';
import CoverImage from './CoverImage';
import { getProjectIcon } from '../constants/projectOptions';
import InfiniteScroll from './InfiniteScroll';
import { useProjectNotes } from '../hooks/useProjectNotes';
import { getPlainText, getAssetUrl } from '../utils/text';

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
  const [manageMembersOpen, setManageMembersOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isOwner = project.currentUserRole === 'OWNER';
  const hasCollaborators = (project.collaborators?.length ?? 0) > 0;
  const hasCover = Boolean(project.coverImage);
  const coverUrl = hasCover ? getAssetUrl(project.coverImage) : null;

  // Notas paginadas con scroll infinito (ya no hay límite fijo de 50).
  const { notes, totalCount, isLoading: notesLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useProjectNotes(project.id, !isCollapsed);

  const recentNotes = [...notes].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  );

  const accentColor = project.color || '#386c5f';

  return (
    <motion.div
      layout
      layoutId={`sidebar-project-${project.id}`}
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
              <Box sx={{ minWidth: 0, flexGrow: 1, ml: 0.5, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: '0.88rem',
                      color: 'text.primary',
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
                          minWidth: 22,
                          height: 22,
                          borderRadius: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: `${accentColor}18`,
                          flexShrink: 0,
                          border: `1px solid ${accentColor}28`,
                        }}
                      >
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: accentColor, lineHeight: 1 }}>
                          {totalCount}
                        </Typography>
                      </Box>
                    </motion.div>
                  )}
                </Box>
                {project.description && (
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      fontSize: '0.72rem',
                      color: 'text.secondary',
                      display: 'block',
                      mt: 0.1,
                      opacity: 0.7,
                    }}
                  >
                    {project.description}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Tooltip>

        {/* Action buttons: hover on desktop, persistent ⋮ on mobile when selected */}
        {!isCollapsed && (
          <Box
            className="project-hover-actions"
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: 0.2,
              opacity: isMobile ? (isSelected ? 1 : 0) : 0,
              pointerEvents: isMobile ? (isSelected ? 'auto' : 'none') : 'none',
              transition: 'all 0.2s ease',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(26, 26, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              p: 0.25,
              zIndex: 2,
            }}
          >
            {/* Mobile: show ⋮ context menu instead of individual icons */}
            {isMobile ? (
              <>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
                  sx={{
                    p: 0.7,
                    color: 'text.secondary',
                    borderRadius: 1.5,
                    minWidth: 36,
                    minHeight: 36,
                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                  }}
                >
                  <MoreIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                  onClick={(e) => e.stopPropagation()}
                  slotProps={{ paper: { sx: { minWidth: 180, borderRadius: 2, mt: 0.5 } } }}
                >
                  <MenuItem onClick={() => { setAnchorEl(null); onTogglePin(project.id); }}>
                    <ListItemIcon><PinIcon sx={{ fontSize: 18, color: isPinned ? 'primary.main' : 'inherit' }} /></ListItemIcon>
                    <ListItemText>{isPinned ? 'Desfijar' : 'Fijar'}</ListItemText>
                  </MenuItem>
                  {isOwner && hasCollaborators && (
                    <MenuItem onClick={() => { setAnchorEl(null); setManageMembersOpen(true); }}>
                      <ListItemIcon><GroupIcon sx={{ fontSize: 18 }} /></ListItemIcon>
                      <ListItemText>Miembros</ListItemText>
                    </MenuItem>
                  )}
                  <MenuItem onClick={(e) => { setAnchorEl(null); onShare(project, e); }}>
                    <ListItemIcon><ShareIcon sx={{ fontSize: 18 }} /></ListItemIcon>
                    <ListItemText>Compartir</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={(e) => { setAnchorEl(null); onEdit(project, e); }}>
                    <ListItemIcon><EditIcon sx={{ fontSize: 18 }} /></ListItemIcon>
                    <ListItemText>Editar</ListItemText>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={(e) => { setAnchorEl(null); onDelete(project, e); }} sx={{ color: 'error.main' }}>
                    <ListItemIcon><DeleteIcon sx={{ fontSize: 18, color: 'error.main' }} /></ListItemIcon>
                    <ListItemText>Eliminar</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
            <Tooltip title={isPinned ? 'Desfijar' : 'Fijar'} placement="top" arrow>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onTogglePin(project.id); }}
                  sx={{
                    p: 0.5,
                    color: isPinned ? 'primary.main' : 'text.secondary',
                    borderRadius: 1.5,
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: `${accentColor}15`, color: 'primary.main' },
                  }}
                >
                  {isPinned ? <PinIcon sx={{ fontSize: 15, transform: 'rotate(45deg)' }} /> : <PinOutlinedIcon sx={{ fontSize: 15 }} />}
                </IconButton>
              </motion.div>
            </Tooltip>
            {isOwner && hasCollaborators && (
              <Tooltip title="Gestionar miembros" placement="top" arrow>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setManageMembersOpen(true); }}
                    sx={{
                      p: 0.5,
                      color: 'text.secondary',
                      borderRadius: 1.5,
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.12)', color: 'secondary.main' },
                    }}
                  >
                    <GroupIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </motion.div>
              </Tooltip>
            )}
            <Tooltip title="Compartir" placement="top" arrow>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onShare(project, e); }}
                  sx={{
                    p: 0.5,
                    color: 'text.secondary',
                    borderRadius: 1.5,
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: `${accentColor}15`, color: 'primary.main' },
                  }}
                >
                  <ShareIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </motion.div>
            </Tooltip>
            <Tooltip title="Editar" placement="top" arrow>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onEdit(project, e); }}
                  sx={{
                    p: 0.5,
                    color: 'text.secondary',
                    borderRadius: 1.5,
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: `${accentColor}15`, color: 'primary.main' },
                  }}
                >
                  <EditIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </motion.div>
            </Tooltip>
            <Tooltip title="Eliminar" placement="top" arrow>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <IconButton
                  size="small"
                  onClick={(e) => onDelete(project, e)}
                  sx={{
                    p: 0.5,
                    color: 'text.secondary',
                    borderRadius: 1.5,
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main' },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </motion.div>
            </Tooltip>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Manage Members Dialog */}
      {isOwner && hasCollaborators && (
        <ManageMembersDialog
          project={project}
          open={manageMembersOpen}
          onClose={() => setManageMembersOpen(false)}
        />
      )}

      {/* ── Expanded Notes List ───────────────────────────── */}
      {!isCollapsed && (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="notes"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <Box
                sx={{
                  ml: 4,
                  pl: 1.5,
                  borderLeft: `2px solid ${accentColor}30`,
                  mt: 0.5,
                  mb: 1,
                  pr: 0.5,
                  '& > div:last-child': { mb: 0 },
                }}
              >
                <InfiniteScroll hasMore={hasNextPage} loading={isFetchingNextPage} onLoadMore={fetchNextPage}>
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
                          gap: 1,
                          px: 1.2,
                          py: 0.8,
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          minHeight: 48,
                          bgcolor: 'transparent',
                          '&:hover': {
                            bgcolor: `${accentColor}10`,
                            transform: 'translateX(4px)',
                            '& .note-icon': {
                              color: accentColor,
                              transform: 'scale(1.1)',
                            },
                          },
                          '&:active': {
                            transform: 'scale(0.98)',
                          },
                        }}
                      >
                        {note.icon ? (
                          <Box component="span" sx={{ fontSize: 13, flexShrink: 0, mt: 0.1, lineHeight: 1 }}>
                            {note.icon}
                          </Box>
                        ) : (
                          <NoteIcon
                            className="note-icon"
                            sx={{
                              fontSize: 14,
                              color: `${accentColor}80`,
                              flexShrink: 0,
                              mt: 0.25,
                              transition: 'all 0.2s ease',
                            }}
                          />
                        )}
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              fontSize: '0.78rem',
                              fontWeight: 500,
                              lineHeight: 1.3,
                              color: 'text.primary',
                            }}
                          >
                            {note.title || 'Sin título'}
                          </Typography>
                          {excerpt && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{
                                fontSize: '0.65rem',
                                display: 'block',
                                lineHeight: 1.2,
                                mt: 0.2,
                                opacity: 0.7,
                              }}
                            >
                              {excerpt.slice(0, 45)}
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

                </InfiniteScroll>

                {/* "Crear nota" button */}
                {onCreateNote && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Box
                      onClick={() => onCreateNote(project.id)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.8,
                        px: 1.2,
                        py: 0.8,
                        mt: 0.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        color: 'text.secondary',
                        transition: 'all 0.2s ease',
                        minHeight: 48,
                        border: '1px dashed',
                        borderColor: `${accentColor}30`,
                        bgcolor: `${accentColor}08`,
                        '&:hover': {
                          bgcolor: `${accentColor}15`,
                          color: accentColor,
                          borderColor: `${accentColor}50`,
                          transform: 'translateX(4px)',
                          '& .add-icon': {
                            transform: 'rotate(90deg)',
                          },
                        },
                        '&:active': {
                          transform: 'scale(0.98)',
                        },
                      }}
                    >
                      <AddIcon
                        className="add-icon"
                        sx={{ fontSize: 15, transition: 'transform 0.2s ease' }}
                      />
                      <Typography variant="caption" sx={{ fontSize: '0.74rem', fontWeight: 600 }}>
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
