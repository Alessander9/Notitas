import React, { useState } from 'react';
import {
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Popover,
  Typography,
} from '@mui/material';
import { People as PeopleIcon } from '@mui/icons-material';
import { getAssetUrl } from '../utils/text';

function MemberRow({ user, label, color, isCreator }) {
  return (
    <ListItem disablePadding sx={{ borderRadius: 2, px: 1, py: 0.5, mb: 0.3 }}>
      <Avatar
        src={getAssetUrl(user.avatar)}
        sx={{
          width: 32,
          height: 32,
          fontSize: '0.8rem',
          bgcolor: isCreator ? color || 'primary.main' : 'action.hover',
          color: isCreator ? '#fff' : 'text.secondary',
          mr: 1.2,
          flexShrink: 0,
        }}
      >
        {(user.name || '?')[0]?.toUpperCase()}
      </Avatar>
      <ListItemText
        primary={user.name}
        secondary={user.email}
        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem', noWrap: true }}
        secondaryTypographyProps={{ fontSize: '0.7rem', noWrap: true }}
        sx={{ minWidth: 0, mr: 1 }}
      />
      <Chip
        label={label}
        size="small"
        sx={{
          height: 20,
          fontSize: '0.65rem',
          fontWeight: 700,
          flexShrink: 0,
          bgcolor: isCreator ? `${color || '#1976d2'}22` : 'action.hover',
          color: isCreator ? color || 'primary.main' : 'text.secondary',
        }}
      />
    </ListItem>
  );
}

// Members pill (creator + collaborators). Click to see the full member list.
export default function CollaboratorsChip({ project }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const count = 1 + (project?.collaborators?.length || 0);
  const color = project?.color || '#1976d2';

  const handleClose = () => setAnchorEl(null);

  const handleOpen = (e) => {
    e.stopPropagation();
    // Toggle: clicking the badge again while open closes the popover
    if (open) {
      handleClose();
      return;
    }
    setAnchorEl(e.currentTarget);
  };

  return (
    <>
      <Box
        component="span"
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-label={`${count} ${count === 1 ? 'miembro' : 'miembros'}`}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen(e);
          }
        }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.8,
          py: 0.15,
          borderRadius: '10px',
          fontSize: '0.7rem',
          fontWeight: 700,
          lineHeight: 1.5,
          bgcolor: `${color}1A`,
          color: 'text.secondary',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          '&:hover': {
            bgcolor: `${color}30`,
            color: color,
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <PeopleIcon sx={{ fontSize: 13 }} />
        {count}
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
              mt: 0.5,
              width: 280,
            },
          },
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Miembros del proyecto ({count})
          </Typography>
          <List dense disablePadding>
            {project?.creator && (
              <MemberRow user={project.creator} label="Creador" color={color} isCreator />
            )}
            {project?.collaborators?.map((user) => (
              <MemberRow
                key={user.id}
                user={user}
                label={user.role === 'VIEWER' ? 'Visor' : 'Editor'}
                color={color}
              />
            ))}
          </List>
        </Box>
      </Popover>
    </>
  );
}
