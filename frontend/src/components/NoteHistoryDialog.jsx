import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  Chip,
  Divider,
  Alert,
  Paper,
} from '@mui/material';
import {
  History as HistoryIcon,
  Restore as RestoreIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';

const stripHtml = (html) =>
  (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Historial de versiones de una nota: lista las instantáneas guardadas
 * automáticamente, permite previsualizar cualquier versión y restaurarla.
 * La restauración guarda una copia del estado actual, por lo que también
 * es reversible.
 */
export default function NoteHistoryDialog({ open, onClose, noteId, members = [], canRestore = true, onRestoreStart }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);

  const { data: versions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['noteVersions', noteId],
    queryFn: async () => {
      const res = await api.get(`/notes/${noteId}/versions`);
      return res.data;
    },
    enabled: open && Boolean(noteId),
  });

  // Al abrir (o cambiar de nota) se selecciona la versión más reciente
  useEffect(() => {
    setSelectedId(null);
  }, [noteId, open]);

  useEffect(() => {
    if (versions.length > 0 && !versions.some((v) => v.id === selectedId)) {
      setSelectedId(versions[0].id);
    }
  }, [versions, selectedId]);

  const selected = versions.find((v) => v.id === selectedId) || null;

  const resolveAuthor = (userId) => members.find((m) => m?.id === userId)?.name;

  const restoreMutation = useMutation({
    mutationFn: async (versionId) => {
      const res = await api.post(`/notes/${noteId}/versions/${versionId}/restore`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['noteVersions', noteId] });
      toast.success('Versión restaurada');
      onClose();
    },
    onError: () => toast.error('No se pudo restaurar la versión'),
  });

  const handleRestore = () => {
    if (!selected) return;
    confirm({
      title: 'Restaurar versión',
      message: `¿Restaurar el título y el contenido a la versión del ${formatDateTime(selected.createdAt)}? La portada y los archivos adjuntos no se ven afectados. El estado actual se guardará como nueva versión para que puedas deshacerlo.`,
      confirmLabel: 'Restaurar',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        // Cancela cualquier auto-guardado pendiente del editor para que no
        // sobreescriba la restauración con contenido antiguo.
        onRestoreStart?.();
        restoreMutation.mutate(selected.id);
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
            color: '#fff',
          }}
        >
          <HistoryIcon fontSize="small" />
        </Box>
        Historial de versiones
        <Chip
          size="small"
          label={versions.length > 0 ? `${versions.length} versión${versions.length === 1 ? '' : 'es'}` : ''}
          sx={{ ml: 'auto', height: 22, fontSize: '0.7rem' }}
        />
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, height: '62vh', display: 'flex', flexDirection: 'row' }}>
        {/* Columna izquierda: lista de versiones */}
        <Box
          sx={{
            width: { xs: 210, sm: 290 },
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowY: 'auto',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block' }}>
            Cada guardado automático crea una versión
          </Typography>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : isError ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="error" sx={{ fontSize: '0.8rem' }}>
                No se pudo cargar el historial.
                <Button size="small" onClick={() => refetch()} sx={{ mt: 1 }}>
                  Reintentar
                </Button>
              </Alert>
            </Box>
          ) : versions.length === 0 ? (
            <Box sx={{ p: 2, color: 'text.secondary' }}>
              <Typography variant="body2">Aún no hay versiones de esta nota.</Typography>
              <Typography variant="caption">Los cambios se guardan automáticamente al editar.</Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {versions.map((v, idx) => (
                <ListItemButton
                  key={v.id}
                  selected={v.id === selectedId}
                  onClick={() => setSelectedId(v.id)}
                  sx={{ px: 2, py: 1.25, borderLeft: '3px solid transparent', '&.Mui-selected': { borderLeftColor: 'primary.main', bgcolor: 'action.selected' } }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="body2" fontWeight={idx === 0 ? 700 : 600} noWrap sx={{ fontSize: '0.82rem' }}>
                        {v.title || 'Sin título'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.3 }}>
                      <ScheduleIcon sx={{ fontSize: 12, opacity: 0.7 }} />
                      {formatDateTime(v.createdAt)}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.15 }}>
                      <PersonIcon sx={{ fontSize: 12, opacity: 0.7 }} />
                      {resolveAuthor(v.updatedBy) || 'Usuario'}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block', mt: 0.3, fontSize: '0.68rem' }}>
                      {stripHtml(v.content).slice(0, 60) || 'Nota vacía'}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        {/* Columna derecha: previsualización */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
          {!selected ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', gap: 1, textAlign: 'center' }}>
              <HistoryIcon sx={{ fontSize: 44, opacity: 0.4 }} />
              <Typography variant="body2">Selecciona una versión para previsualizarla</Typography>
            </Box>
          ) : (
            <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2, sm: 3.5 }, borderRadius: 3 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 0.75, wordBreak: 'break-word' }}>
                {selected.title || 'Sin título'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                <ScheduleIcon sx={{ fontSize: 13 }} />
                {formatDateTime(selected.createdAt)} · {resolveAuthor(selected.updatedBy) || 'Usuario'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box
                sx={{
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  '& p': { mb: 2 },
                  '& h1': { fontSize: '1.8rem', fontWeight: 'bold', mb: 2, mt: 3 },
                  '& h2': { fontSize: '1.5rem', fontWeight: 'bold', mb: 2, mt: 3 },
                  '& h3': { fontSize: '1.25rem', fontWeight: 'bold', mb: 1.5, mt: 2 },
                  '& pre': {
                    backgroundColor: 'action.hover',
                    padding: 2,
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    mb: 2,
                  },
                  '& img.align-left': { float: 'left', margin: '12px 16px 12px 0', maxWidth: '45%', height: 'auto', borderRadius: '8px', display: 'block' },
                  '& img.align-center': { display: 'block', margin: '20px auto', maxWidth: '100%', height: 'auto', borderRadius: '8px' },
                  '& img.align-right': { float: 'right', margin: '12px 0 12px 16px', maxWidth: '45%', height: 'auto', borderRadius: '8px', display: 'block' },
                  '& img': { maxWidth: '100%', maxHeight: '420px', borderRadius: '8px', margin: '16px 0', display: 'block' },
                  '& table': {
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    width: '100%',
                    margin: '20px 0',
                    '& td, & th': { border: '1px solid', borderColor: 'divider', padding: '6px 8px', verticalAlign: 'top' },
                    '& th': { backgroundColor: 'action.hover', fontWeight: 'bold', textAlign: 'left' },
                  },
                  '& ul[data-type="taskList"]': {
                    listStyle: 'none',
                    padding: 0,
                    '& li': { display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0', '& > div': { flex: 1 } },
                  },
                  '& p, & h1, & h2, & h3, & h4, & h5, & h6': { clear: 'both' },
                }}
                dangerouslySetInnerHTML={{ __html: selected.content || '<p><em>Nota vacía.</em></p>' }}
              />
            </Paper>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {!canRestore && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
            Solo lectura: no puedes restaurar versiones
          </Typography>
        )}
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          variant="contained"
          startIcon={<RestoreIcon />}
          disabled={!selected || !canRestore || restoreMutation.isPending}
          onClick={handleRestore}
          sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}
        >
          {restoreMutation.isPending ? 'Restaurando...' : 'Restaurar esta versión'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
