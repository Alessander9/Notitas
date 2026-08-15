import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  Avatar,
  Chip,
  Button,
  Select,
  MenuItem,
  Divider,
  Tooltip,
  CircularProgress,
  FormControl,
} from '@mui/material';
import {
  Close as CloseIcon,
  WorkspacePremium as CreatorBadgeIcon,
  PersonRemove as PersonRemoveIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import { getAvatarUrl } from '../utils/text';

const ROLE_LABELS = { OWNER: 'Creador', EDITOR: 'Editor', VIEWER: 'Visor' };

/**
 * Diálogo de gestión de miembros de un proyecto: permite al propietario
 * cambiar el rol (Editor/Visor) y expulsar colaboradores, además de
 * copiar el enlace de invitación.
 */
export default function ManageMembersDialog({ project, open, onClose }) {
  const queryClient = useQueryClient();
  const isOwner = project?.currentUserRole === 'OWNER';
  const [copySuccess, setCopySuccess] = useState(false);

  const invalidate = () => queryClient.invalidateQueries(['projects']);

  const patchCache = (data) => {
    queryClient.setQueryData(['projects'], (old) =>
      old ? old.map((p) => (p.id === data.id ? data : p)) : old
    );
  };

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const res = await api.put(`/projects/${project.id}/members/${userId}`, { role });
      return res.data;
    },
    onSuccess: (data) => {
      patchCache(data);
      invalidate();
      toast.success('Rol actualizado');
    },
    onError: (err) =>
      toast.error(
        typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : 'No se pudo actualizar el rol'
      ),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await api.delete(`/projects/${project.id}/members/${userId}`);
      return res.data;
    },
    onSuccess: (data) => {
      patchCache(data);
      invalidate();
      toast.success('Colaborador eliminado del proyecto');
    },
    onError: (err) =>
      toast.error(
        typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : 'No se pudo eliminar al colaborador'
      ),
  });

  const handleRemove = (member) => {
    confirm({
      title: 'Eliminar colaborador',
      message: `¿Seguro que quieres eliminar a "${member.name}" del proyecto "${project.name}"? Perderá el acceso a todas las notas del proyecto.`,
      confirmText: 'Eliminar',
      confirmColor: 'error',
      onConfirm: () => removeMemberMutation.mutate(member.id),
    });
  };

  const handleCopyInvite = async () => {
    try {
      const res = await api.post(`/projects/${project.id}/invite-token`);
      await navigator.clipboard.writeText(
        `${window.location.origin}/join/project/${res.data.inviteToken}`
      );
      setCopySuccess(true);
      toast.success('Enlace de invitación copiado');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace de invitación');
    }
  };

  const color = project?.color || '#1976d2';
  const count = 1 + (project?.collaborators?.length || 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3.5, overflow: 'hidden' } }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'relative',
          background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.12)' }} />
        <Box sx={{ position: 'absolute', bottom: -50, left: -10, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
        <Box sx={{ position: 'relative', minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} color="#fff" sx={{ letterSpacing: '-0.01em' }}>
            Miembros del proyecto
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }} noWrap>
            {project?.name} · {count} {count === 1 ? 'miembro' : 'miembros'}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            ml: 'auto',
            color: '#fff',
            bgcolor: 'rgba(255,255,255,0.18)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.32)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 2.5, py: 2.5 }}>
        {/* Invite link (solo propietario: el resto de miembros no puede invitar) */}
        {isOwner && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              mb: 2.5,
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: 'action.hover',
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <LinkIcon sx={{ fontSize: 19, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              Invita por enlace: cualquiera que acceda se une como <b>Editor</b>
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={copySuccess ? <CheckIcon /> : <ContentCopyIcon />}
              onClick={handleCopyInvite}
              sx={{ borderRadius: 2, fontWeight: 700, flexShrink: 0 }}
            >
              {copySuccess ? 'Copiado' : 'Copiar enlace'}
            </Button>
          </Box>
        )}

        <Divider sx={{ mb: 1.5 }} />

        {/* Member list */}
        {project?.creator && (
          <MemberRow
            user={project.creator}
            role="OWNER"
            isOwner={isOwner}
            color={color}
          />
        )}
        <AnimatePresence initial={false}>
          {project?.collaborators?.map((member) => (
            <MemberRow
              key={member.id}
              user={member}
              role={member.role}
              isOwner={isOwner}
              color={color}
              onRoleChange={(role) => changeRoleMutation.mutate({ userId: member.id, role })}
              onRemove={() => handleRemove(member)}
              busy={
                (changeRoleMutation.isPending && changeRoleMutation.variables?.userId === member.id) ||
                (removeMemberMutation.isPending && removeMemberMutation.variables?.userId === member.id)
              }
            />
          ))}
        </AnimatePresence>

        {isOwner && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            El creador no se puede modificar ni eliminar. Los <b>Visores</b> solo pueden leer las notas.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({ user, role, isOwner, color, onRoleChange, onRemove, busy }) {
  const isCreator = role === 'OWNER';
  const firstName = (user.name || 'Usuario').trim().split(/\s+/)[0] || 'Usuario';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 1.25,
          px: 1.25,
          borderRadius: 2.5,
          mb: 0.5,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {/* Avatar */}
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Avatar
            src={getAvatarUrl(user.avatar)}
            sx={{
              width: 42,
              height: 42,
              fontSize: '0.95rem',
              fontWeight: 700,
              bgcolor: isCreator ? color || 'primary.main' : 'primary.main',
              color: '#fff',
              border: isCreator ? `2px solid ${color || 'primary.main'}` : 'none',
            }}
          >
            {firstName[0]?.toUpperCase()}
          </Avatar>
          {isCreator && (
            <Box
              sx={{
                position: 'absolute',
                bottom: -3,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: '#fbc02d',
                border: '2px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreatorBadgeIcon sx={{ fontSize: 11, color: '#fff' }} />
            </Box>
          )}
        </Box>

        {/* Name + email */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {user.name}
            </Typography>
            {isCreator && (
              <Chip
                label="Creador"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  bgcolor: '#fbc02d22',
                  color: '#b45309',
                  flexShrink: 0,
                }}
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {user.email}
          </Typography>
        </Box>

        {/* Role control */}
        {isCreator ? (
          <Chip label={ROLE_LABELS.OWNER} size="small" color="warning" variant="filled" sx={{ fontWeight: 600 }} />
        ) : isOwner ? (
          <FormControl size="small" sx={{ minWidth: 96 }}>
            <Select
              value={role}
              disabled={busy}
              onChange={(e) => onRoleChange(e.target.value)}
              size="small"
              sx={{
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: 2,
                height: 32,
                '& .MuiSelect-select': { py: 0.5 },
              }}
            >
              <MenuItem value="EDITOR">Editor</MenuItem>
              <MenuItem value="VIEWER">Visor</MenuItem>
            </Select>
          </FormControl>
        ) : (
          <Chip
            label={ROLE_LABELS[role] || role}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, height: 24 }}
          />
        )}

        {/* Remove */}
        {!isCreator && isOwner && (
          <Tooltip title="Eliminar del proyecto">
            <IconButton
              size="small"
              disabled={busy}
              onClick={onRemove}
              sx={{
                flexShrink: 0,
                color: 'text.secondary',
                borderRadius: 2,
                '&:hover': { color: 'error.main', bgcolor: 'rgba(239, 68, 68, 0.12)' },
              }}
            >
              {busy ? <CircularProgress size={16} /> : <PersonRemoveIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </motion.div>
  );
}
