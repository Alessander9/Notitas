import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  WorkspacePremium as CreatorBadgeIcon,
  Badge as BadgeIcon,
  Mail as MailIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { getAvatarUrl } from '../utils/text';
import ProfileDialog from './ProfileDialog';

const getRoleInfo = (member) => {
  if (member.role === 'OWNER') return { label: 'Creador', color: 'warning' };
  if (member.role === 'VIEWER') return { label: 'Visor', color: 'default' };
  return { label: 'Editor', color: 'primary' };
};

export default function MemberProfileDialog({ member, onClose }) {
  const { user } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);

  if (!member) return null;

  const isCreator = member.role === 'OWNER';
  const isCurrentUser = user?.id === member.id;
  const role = getRoleInfo(member);
  // When it's the current user, read live data from authStore (reflects profile edits)
  const displayName = isCurrentUser && user?.name ? user.name : member.name;
  const displayEmail = isCurrentUser && user?.email ? user.email : member.email;
  const displayAvatar = isCurrentUser && user?.avatar ? user.avatar : member.avatar;
  const firstName = (displayName || 'Usuario').trim().split(/\s+/)[0] || 'Usuario';

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3.5, overflow: 'hidden' } }}
      >
        {/* Header */}
        <Box
          sx={{
            position: 'relative',
            background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
            pt: 3.5,
            pb: 7,
            px: 3,
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Box sx={{ position: 'absolute', bottom: -50, left: -20, width: 130, height: 130, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />

          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              color: '#fff',
              bgcolor: 'rgba(255,255,255,0.18)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.32)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          {/* Avatar with glow + crown */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 17 }}
            style={{ position: 'relative', display: 'inline-block' }}
          >
            <Box sx={{ position: 'relative', width: 96, height: 96 }}>
              <Box
                sx={{
                  position: 'absolute',
                  inset: -6,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.35), transparent 70%)',
                }}
              />
              {displayAvatar ? (
                <Box
                  component="img"
                  src={getAvatarUrl(displayAvatar)}
                  alt={member.name}
                  sx={{
                    position: 'relative',
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                    border: '3px solid rgba(255,255,255,0.55)',
                    boxShadow: '0 14px 34px rgba(0,0,0,0.35)',
                    bgcolor: 'rgba(255,255,255,0.2)',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    position: 'relative',
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    border: '3px solid rgba(255,255,255,0.55)',
                    boxShadow: '0 14px 34px rgba(0,0,0,0.35)',
                  }}
                >
                  {firstName[0]?.toUpperCase()}
                </Box>
              )}
              {isCreator && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    bgcolor: '#fbc02d',
                    border: '2.5px solid',
                    borderColor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  }}
                >
                  <CreatorBadgeIcon sx={{ fontSize: 15, color: '#fff' }} />
                </Box>
              )}
            </Box>
          </motion.div>
        </Box>

        {/* Body overlapping the header */}
        <DialogContent sx={{ mt: -4.5, pb: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 2.5 }}>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
              {displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              {displayEmail}
            </Typography>
            <Chip
              label={role.label}
              size="small"
              color={role.color}
              variant={isCreator ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
            {isCurrentUser && (
              <Chip
                label="Tú"
                size="small"
                variant="outlined"
                sx={{ ml: 1, fontWeight: 600, borderStyle: 'dashed' }}
              />
            )}
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          {/* Info rows */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <BadgeIcon sx={{ fontSize: 19, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                Rol en el proyecto
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {role.label}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MailIcon sx={{ fontSize: 19, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                Email
              </Typography>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>
                {displayEmail}
              </Typography>
            </Box>
          </Box>

          {isCurrentUser && (
            <>
              <Divider sx={{ my: 2.5 }} />
              <Button
                fullWidth
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                Editar mi perfil
              </Button>
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                Cambia tu nombre, email, foto o contraseña
              </Typography>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reuse the existing profile editor for the current user */}
      {editOpen && <ProfileDialog open={editOpen} onClose={() => setEditOpen(false)} />}
    </>
  );
}
