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
  Difference as DiffIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import { computeWordDiff } from '../utils/diffHelper';

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
 * Incluye un comparador visual (Diff) de cambios.
 */
export default function NoteHistoryDialog({ open, onClose, noteId, currentContent = '', members = [], canRestore = true, onRestoreStart }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'diff'

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
        onRestoreStart?.();
        restoreMutation.mutate(selected.id);
      },
    });
  };

  // Cálculo del Diff entre versión seleccionada y estado actual
  const diffChunks = React.useMemo(() => {
    if (!selected) return [];
    const oldText = stripHtml(selected.content);
    const curText = stripHtml(currentContent);
    return computeWordDiff(oldText, curText);
  }, [selected, currentContent]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backdropFilter: 'blur(16px)',
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700, flexWrap: 'wrap' }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #6D4AFF 0%, #3B82F6 100%)',
            color: '#fff',
          }}
        >
          <HistoryIcon fontSize="small" />
        </Box>
        <Typography variant="h6" fontWeight={700}>Historial de versiones</Typography>
        
        {versions.length > 0 && (
          <Chip
            size="small"
            label={`${versions.length} versión${versions.length === 1 ? '' : 'es'}`}
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
        )}

        {selected && (
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            sx={{ ml: 'auto' }}
          >
            <ToggleButton value="preview" sx={{ py: 0.3, px: 1.2, textTransform: 'none', fontSize: '0.78rem', gap: 0.5 }}>
              <PreviewIcon sx={{ fontSize: 16 }} /> Vista Previa
            </ToggleButton>
            <ToggleButton value="diff" sx={{ py: 0.3, px: 1.2, textTransform: 'none', fontSize: '0.78rem', gap: 0.5 }}>
              <DiffIcon sx={{ fontSize: 16 }} /> Ver Cambios (Diff)
            </ToggleButton>
          </ToggleButtonGroup>
        )}
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
            Instantáneas cronológicas
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
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderLeft: '3px solid transparent',
                    '&.Mui-selected': {
                      borderLeftColor: 'primary.main',
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <Box sx={{ minWidth: 0, width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                      <Typography variant="body2" fontWeight={idx === 0 ? 700 : 600} noWrap sx={{ fontSize: '0.82rem' }}>
                        {v.title || 'Sin título'}
                      </Typography>
                      {idx === 0 && (
                        <Chip label="Última" size="small" color="primary" sx={{ height: 16, fontSize: '0.62rem', px: 0.4 }} />
                      )}
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
                      {stripHtml(v.content).slice(0, 55) || 'Nota vacía'}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        {/* Columna derecha: previsualización o diff */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
          {!selected ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', gap: 1, textAlign: 'center' }}>
              <HistoryIcon sx={{ fontSize: 44, opacity: 0.4 }} />
              <Typography variant="body2">Selecciona una versión para ver los detalles</Typography>
            </Box>
          ) : viewMode === 'diff' ? (
            <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Comparación con el estado actual
                </Typography>
                <Chip label="Verde: Agregado en versión actual" size="small" sx={{ bgcolor: 'rgba(46, 204, 113, 0.15)', color: '#27ae60', fontSize: '0.72rem' }} />
                <Chip label="Rojo: Eliminado respecto a esta versión" size="small" sx={{ bgcolor: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c', fontSize: '0.72rem' }} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ lineHeight: 1.8, fontSize: '0.95rem', fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
                {diffChunks.map((chunk, i) => (
                  <span
                    key={i}
                    className={
                      chunk.type === 'added'
                        ? 'diff-chunk-added'
                        : chunk.type === 'removed'
                        ? 'diff-chunk-removed'
                        : 'diff-chunk-unchanged'
                    }
                  >
                    {chunk.text}
                  </span>
                ))}
              </Box>
            </Paper>
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
