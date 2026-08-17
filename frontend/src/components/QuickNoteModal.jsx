import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Bolt as QuickIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { getProjectIcon } from '../constants/projectOptions';

/**
 * Modal para creación ultra-rápida de notas desde cualquier lugar de la app.
 * Permite seleccionar el proyecto de destino, asignar título, contenido breve,
 * etiquetas y marcar como favorita de forma inmediata.
 */
export default function QuickNoteModal({
  open,
  onClose,
  defaultProjectId = null,
  initialTitle = '',
  initialContent = '',
  initialTags = [],
}) {
  const queryClient = useQueryClient();
  const { setCurrentProject, setCurrentNote } = useUiStore();

  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState(initialTitle || '');
  const [content, setContent] = useState(initialContent || '');
  const [tags, setTags] = useState(initialTags || []);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const titleInputRef = useRef(null);

  // Cargar proyectos disponibles donde el usuario pueda crear notas
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data || [];
    },
    enabled: open,
  });

  // Filtrar proyectos donde no sea sólo VIEWER
  const writableProjects = React.useMemo(() => {
    return projects.filter((p) => p.currentUserRole !== 'VIEWER');
  }, [projects]);

  // Inicializar campos al abrir
  useEffect(() => {
    if (open) {
      setTitle(initialTitle || '');
      setContent(initialContent || '');
      setTags(initialTags || []);
      setTagInput('');
      setIsFavorite(false);
      if (defaultProjectId && typeof defaultProjectId === 'number') {
        setProjectId(defaultProjectId);
      } else if (writableProjects.length > 0) {
        setProjectId(writableProjects[0].id);
      } else {
        setProjectId('');
      }
    }
  }, [open, defaultProjectId, writableProjects, initialTitle, initialContent, initialTags]);

  // Autofocus al abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  const createNoteMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/projects/${payload.projectId}/notes`, {
        title: payload.title.trim() || 'Nueva Nota',
        content: payload.content ? `<p>${payload.content.replace(/\n/g, '<br/>')}</p>` : '',
        favorite: payload.favorite,
        tags: payload.tags,
      });
      return res.data;
    },
    onSuccess: (newNote, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCurrentProject(variables.projectId);
      setCurrentNote(newNote.id);
      toast.success('Nota creada');
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'No se pudo crear la nota';
      toast.error(msg);
    },
  });

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!projectId) {
      toast.error('Selecciona un proyecto para la nota');
      return;
    }
    createNoteMutation.mutate({
      projectId: Number(projectId),
      title,
      content,
      favorite: isFavorite,
      tags,
    });
  };

  const handleAddTag = (newTag) => {
    const clean = newTag.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: 0.5,
          backgroundImage: 'none',
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(56, 108, 95, 0.3)',
              }}
            >
              <QuickIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                Creación rápida de nota
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Guarda ideas al instante en el proyecto que elijas
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {/* Selector de Proyecto */}
          <FormControl fullWidth size="small" required error={!loadingProjects && writableProjects.length === 0}>
            <InputLabel id="quick-note-project-label">Proyecto de destino</InputLabel>
            <Select
              labelId="quick-note-project-label"
              value={projectId}
              label="Proyecto de destino"
              onChange={(e) => setProjectId(e.target.value)}
              disabled={loadingProjects || writableProjects.length === 0}
            >
              {loadingProjects ? (
                <MenuItem disabled value="">
                  <CircularProgress size={16} sx={{ mr: 1 }} /> Cargando proyectos...
                </MenuItem>
              ) : writableProjects.length === 0 ? (
                <MenuItem disabled value="">
                  No tienes proyectos para crear notas
                </MenuItem>
              ) : (
                writableProjects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, width: '100%' }}>
                      <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>{getProjectIcon(p.icon)}</Typography>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ flexGrow: 1 }}>
                        {p.name}
                      </Typography>
                      {p.color && (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: p.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Título y Botón Favorito */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              inputRef={titleInputRef}
              fullWidth
              size="small"
              placeholder="Título de la nota (ej. Ideas de reunión, Tareas de hoy...)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              inputProps={{ maxLength: 100 }}
            />
            <Tooltip title={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorita'}>
              <IconButton
                onClick={() => setIsFavorite(!isFavorite)}
                color={isFavorite ? 'warning' : 'default'}
                sx={{
                  border: '1px solid',
                  borderColor: isFavorite ? 'warning.main' : 'divider',
                  borderRadius: 2,
                  p: 0.9,
                }}
              >
                {isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Contenido rápido / Descripción */}
          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            placeholder="Escribe el contenido o apunte rápido aquí..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Etiquetas */}
          <Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: tags.length > 0 ? 1 : 0 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Agregar etiqueta y presiona Enter (ej. importante, sprint)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleAddTag(tagInput)}
                disabled={!tagInput.trim()}
                sx={{ minWidth: 80, height: 40, borderRadius: 2 }}
              >
                Agregar
              </Button>
            </Box>
            {tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {tags.map((t) => (
                  <Chip
                    key={t}
                    label={`#${t}`}
                    size="small"
                    onDelete={() => handleRemoveTag(t)}
                    color="primary"
                    variant="outlined"
                    sx={{ height: 24, fontSize: '0.72rem' }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={onClose} sx={{ borderRadius: 2, color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createNoteMutation.isPending || !projectId}
            startIcon={createNoteMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            sx={{
              borderRadius: 2.5,
              px: 3,
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(56, 108, 95, 0.3)',
            }}
          >
            {createNoteMutation.isPending ? 'Creando...' : 'Crear y Abrir'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
