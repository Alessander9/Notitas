import React from 'react';
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
  Tooltip,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  Close as CloseIcon,
  PersonRemove as PersonRemoveIcon,
  PeopleAlt as PeopleIcon,
  PersonAdd as EmptyIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import { getAvatarUrl } from '../utils/text';

/**
 * Diálogo de colaboradores por-nota: lista los usuarios que se unieron vía
 * el enlace de invitación a colaborar (note_members). Solo el creador de la
 * nota (dueño del proyecto) puede expulsarlos; el backend lo protege.
 */
export default function NoteCollaboratorsDialog({ noteId, open, onClose, canRemove }) {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['note-members', noteId],
    queryFn: async () => {
      const res = await api.get(`/notes/${noteId}/members`);
      return res.data;
    },
    enabled: Boolean(noteId) && open,
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      await api.put(`/notes/${noteId}/members/${userId}`, { role });
    },
    onSuccess: (_, { userId, role }) => {
      queryClient.setQueryData(['note-members', noteId], (old = []) =>
        old.map((m) => (m.userId === userId ? { ...m, role } : m))
      );
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
      await api.delete(`/notes/${noteId}/members/${userId}`);
    },
    onSuccess: (_, userId) => {
      queryClient.setQueryData(['note-members', noteId], (old = []) =>
        old.filter((m) => m.userId !== userId)
      );
      // La expulsión regenera el shareToken en el backend: recarga la nota
      // para que el diálogo de compartir muestre el enlace nuevo.
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      toast.success('Colaborador eliminado de la nota');
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
      message: `¿Seguro que quieres eliminar a "${member.name}" de esta nota? Perderá el acceso a la nota de inmediato.`,
      confirmText: 'Eliminar',
      confirmColor: 'error',
      onConfirm: () => removeMemberMutation.mutate(member.userId),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3.5, overflow: 'hidden' } }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'relative',
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0bb 100%)',
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -20,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.12)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -50,
            left: -10,
            width: 120,
            height: 120,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.08)',
          }}
        />
        <Box sx={{ position: 'relative', minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} color="#fff" sx={{ letterSpacing: '-0.01em' }}>
            Colaboradores de la nota
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }} noWrap>
            {members.length} {members.length === 1 ? 'colaborador' : 'colaboradores'} por invitación
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

      <DialogContent sx={{ px: 2.5, py: 2.5, minHeight: 180 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={28} />
          </Box>
        ) : members.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1.5,
              }}
            >
              <EmptyIcon sx={{ fontSize: 26, color: 'text.secondary' }} />
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Sin colaboradores todavía
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
              Comparte el enlace de invitación a colaborar para añadir personas a esta nota.
            </Typography>
          </Box>
        ) : (
          <AnimatePresence initial={false}>
            {members.map((member) => {
              const busy =
                removeMemberMutation.isPending &&
                removeMemberMutation.variables?.userId === member.userId;
              const roleBusy =
                changeRoleMutation.isPending &&
                changeRoleMutation.variables?.userId === member.userId;
              const isViewer = member.role === 'VIEWER';
              return (
                <motion.div
                  key={member.userId}
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
                    <Avatar
                      src={getAvatarUrl(member.avatar)}
                      sx={{
                        width: 40,
                        height: 40,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        bgcolor: 'primary.main',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {(member.name || 'U')[0]?.toUpperCase()}
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {member.name}
                        </Typography>
                        <Chip
                          label={isViewer ? 'Visor' : 'Editor'}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            bgcolor: isViewer ? 'action.hover' : 'primary.main22',
                            color: isViewer ? 'text.secondary' : 'primary.main',
                            flexShrink: 0,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {member.email}
                      </Typography>
                      {member.joinedAt && (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                          Se unió el{' '}
                          {new Date(member.joinedAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Typography>
                      )}
                    </Box>

                    {canRemove && (
                      <>
                        <FormControl size="small" sx={{ minWidth: 92, flexShrink: 0 }}>
                          <Select
                            value={member.role || 'EDITOR'}
                            disabled={roleBusy}
                            onChange={(e) => changeRoleMutation.mutate({ userId: member.userId, role: e.target.value })}
                            size="small"
                            sx={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              borderRadius: 2,
                              height: 30,
                              '& .MuiSelect-select': { py: 0.5 },
                            }}
                          >
                            <MenuItem value="EDITOR">Editor</MenuItem>
                            <MenuItem value="VIEWER">Visor</MenuItem>
                          </Select>
                        </FormControl>
                        <Tooltip title="Eliminar de la nota">
                          <IconButton
                            size="small"
                            disabled={busy}
                            onClick={() => handleRemove(member)}
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
                      </>
                    )}
                  </Box>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Los <b>Editores</b> pueden modificar la nota; los <b>Visores</b> solo leerla. Al eliminar un colaborador se regenera el enlace de invitación.
          </Typography>
        </Box>

        <Button fullWidth variant="outlined" onClick={onClose} sx={{ mt: 2, borderRadius: 2, fontWeight: 700 }}>
          Cerrar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
