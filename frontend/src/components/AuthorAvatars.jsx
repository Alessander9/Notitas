import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { WorkspacePremium as CreatorBadgeIcon } from '@mui/icons-material';
import { getAvatarUrl } from '../utils/text';

const MAX_VISIBLE = 3;

/**
 * Apilado de avatares circulares de los miembros implicados en una nota:
 * el creador del proyecto primero (con corona) y luego los colaboradores.
 * Si hay más de MAX_VISIBLE, se muestra un badge "+N".
 * Cada avatar es clicable si se pasa onMemberClick.
 */
export default function AuthorAvatars({ creator, collaborators = [], size = 22, onMemberClick }) {
  const members = [
    ...(creator ? [{ ...creator, isCreator: true }] : []),
    ...(collaborators || []).map((c) => ({ ...c, isCreator: false })),
  ];

  if (members.length === 0) return null;

  const visible = members.slice(0, MAX_VISIBLE);
  const extra = members.length - visible.length;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((m, i) => (
        <Tooltip key={m.id ?? m.email ?? i} title={m.isCreator ? `Creador · ${m.name}` : m.name} placement="top">
          <Box
            role={onMemberClick ? 'button' : undefined}
            tabIndex={onMemberClick ? 0 : undefined}
            aria-label={onMemberClick ? `Ver perfil de ${m.name}` : undefined}
            onClick={onMemberClick ? (e) => { e.stopPropagation(); onMemberClick(m); } : undefined}
            onKeyDown={
              onMemberClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onMemberClick(m);
                    }
                  }
                : undefined
            }
            sx={{
              position: 'relative',
              width: size,
              height: size,
              borderRadius: '50%',
              ml: i === 0 ? 0 : -0.7,
              zIndex: visible.length - i,
              flexShrink: 0,
              cursor: onMemberClick ? 'pointer' : 'default',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 1,
              },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid',
                borderColor: 'background.paper',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: Math.max(9, size * 0.42),
                fontWeight: 700,
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              }}
            >
              {/* Initial fallback (shown if the image fails or there is none) */}
              <Typography component="span" sx={{ lineHeight: 1 }}>
                {(m.name?.charAt(0) || '?').toUpperCase()}
              </Typography>
              {m.avatar && (
                <Box
                  component="img"
                  src={getAvatarUrl(m.avatar)}
                  alt={m.name}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </Box>

            {/* Creator badge on the creator's avatar */}
            {m.isCreator && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -3,
                  right: -4,
                  width: size * 0.55,
                  height: size * 0.55,
                  borderRadius: '50%',
                  bgcolor: '#fbc02d',
                  border: '1.5px solid',
                  borderColor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }}
              >
                <CreatorBadgeIcon sx={{ fontSize: size * 0.32, color: '#fff' }} />
              </Box>
            )}
          </Box>
        </Tooltip>
      ))}

      {extra > 0 && (
        <Box
          sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            ml: -0.7,
            border: '2px solid',
            borderColor: 'background.paper',
            bgcolor: 'action.hover',
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.max(9, size * 0.38),
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          +{extra}
        </Box>
      )}
    </Box>
  );
}
