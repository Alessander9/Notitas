import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  FileUpload as ImportIcon,
  FolderZip as ZipIcon,
  Description as NoteIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { parseSingleFile, parseZipArchive } from '../utils/universalImporter';
import { toast } from '../store/toastStore';

export default function UniversalNoteImporterModal({ open, onClose, defaultProjectId }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parsedNotes, setParsedNotes] = useState([]);
  const [targetProjectId, setTargetProjectId] = useState(defaultProjectId || '');
  const createFoldersAsProjects = true;

  // Fetch proyectos existentes
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/projects')).data,
    enabled: open,
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParsing(true);
    setParseProgress(0);
    setParsedNotes([]);

    try {
      if (file.name.endsWith('.zip')) {
        const notes = await parseZipArchive(file, (p) => setParseProgress(p));
        setParsedNotes(notes);
        toast.info(`Se detectaron ${notes.length} notas en el archivo ZIP`);
      } else {
        const singleNote = await parseSingleFile(file);
        setParsedNotes([singleNote]);
      }
    } catch (err) {
      console.error('Error al procesar archivo:', err);
      toast.error('Error al leer el archivo. Asegúrate de que sea un .md, .txt o .zip válido.');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (parsedNotes.length === 0) return;

    setImporting(true);
    let successCount = 0;

    try {
      // Map para almacenar proyectos creados en tiempo de ejecución por subcarpeta
      const createdProjectsMap = new Map();

      for (const note of parsedNotes) {
        let destProjectId = targetProjectId;

        // Si la nota venía dentro de una subcarpeta en el ZIP y la opción está activa
        if (createFoldersAsProjects && note.folderName) {
          if (createdProjectsMap.has(note.folderName)) {
            destProjectId = createdProjectsMap.get(note.folderName);
          } else {
            // Verificar si ya existe un proyecto con ese nombre
            const existingProj = projects.find(
              (p) => p.name.toLowerCase() === note.folderName.toLowerCase()
            );
            if (existingProj) {
              destProjectId = existingProj.id;
              createdProjectsMap.set(note.folderName, destProjectId);
            } else {
              // Crear nuevo proyecto
              const newProjRes = await api.post('/projects', {
                name: note.folderName,
                description: `Importado desde archivo ${selectedFile?.name}`,
                color: '#386c5f',
                icon: '📁',
              });
              destProjectId = newProjRes.data.id;
              createdProjectsMap.set(note.folderName, destProjectId);
            }
          }
        }

        // Si aún no hay proyecto de destino, usar el primero disponible o el seleccionado
        if (!destProjectId) {
          destProjectId = projects[0]?.id;
        }

        if (!destProjectId) {
          throw new Error('No se encontró un proyecto de destino válido.');
        }

        // Crear la nota en el backend
        await api.post(`/projects/${destProjectId}/notes`, {
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          favorite: false,
        });

        successCount++;
      }

      // Invalidar caches
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-notes-mention'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-graph-notes'] });

      toast.success(`¡Se importaron ${successCount} notas exitosamente!`);
      onClose();
    } catch (err) {
      console.error('Error durante la importación por lotes:', err);
      toast.error('Ocurrió un problema al importar algunas notas.');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedNotes([]);
    setParseProgress(0);
  };

  return (
    <Dialog
      open={open}
      onClose={() => !importing && onClose()}
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
              width: 38,
              height: 38,
              borderRadius: 2.5,
              bgcolor: '#0ea5e9',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)',
            }}
          >
            <ImportIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Importador Universal de Notas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Importa colecciones desde Obsidian, Notion, Markdown o ZIP
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={importing} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
        <input
          type="file"
          ref={fileInputRef}
          accept=".md,.markdown,.txt,.zip"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Zona de carga / Drag & Drop */}
        {!selectedFile ? (
          <Paper
            elevation={0}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              p: 4,
              borderRadius: 3,
              border: '2px dashed',
              borderColor: 'primary.main',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.08)' : 'rgba(56, 108, 95, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.15)' : 'rgba(56, 108, 95, 0.08)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <ZipIcon sx={{ fontSize: 44, color: 'primary.main', mb: 1 }} />
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Haz clic o arrastra aquí tu archivo .ZIP o .MD
            </Typography>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Compatible con exportaciones completas de <strong>Obsidian</strong>, <strong>Notion</strong> y archivos <strong>Markdown</strong>.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ZipIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {parsedNotes.length} notas detectadas
                  </Typography>
                </Box>
              </Box>
              <Button size="small" onClick={handleReset} disabled={importing} color="inherit">
                Cambiar
              </Button>
            </Paper>

            {/* Selector de proyecto de destino */}
            <FormControl fullWidth size="small">
              <InputLabel id="target-project-label">Proyecto de Destino</InputLabel>
              <Select
                labelId="target-project-label"
                value={targetProjectId || (projects[0]?.id || '')}
                label="Proyecto de Destino"
                onChange={(e) => setTargetProjectId(e.target.value)}
                disabled={importing}
                sx={{ borderRadius: 2 }}
              >
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Progreso de parseo o importación */}
            {(parsing || importing) && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                  {parsing ? `Analizando archivos... ${parseProgress}%` : `Importando notas al servidor...`}
                </Typography>
                <LinearProgress variant={parsing ? 'determinate' : 'indeterminate'} value={parseProgress} sx={{ borderRadius: 1 }} />
              </Box>
            )}

            {/* Lista de notas detectadas */}
            {parsedNotes.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  p: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <List dense disablePadding>
                  {parsedNotes.slice(0, 15).map((n, idx) => (
                    <ListItem key={idx} sx={{ py: 0.3, px: 1 }}>
                      <ListItemIcon sx={{ minWidth: 26, color: 'text.secondary' }}>
                        <NoteIcon sx={{ fontSize: 16 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={n.title}
                        primaryTypographyProps={{ variant: 'caption', fontWeight: 600, noWrap: true }}
                        secondary={n.folderName ? `📁 ${n.folderName}` : null}
                      />
                    </ListItem>
                  ))}
                  {parsedNotes.length > 15 && (
                    <Typography variant="caption" color="text.disabled" sx={{ p: 1, display: 'block', textAlign: 'center' }}>
                      ... y {parsedNotes.length - 15} notas más
                    </Typography>
                  )}
                </List>
              </Paper>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={importing} sx={{ borderRadius: 2, color: 'text.secondary' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={parsedNotes.length === 0 || parsing || importing}
          startIcon={<SuccessIcon />}
          sx={{
            borderRadius: 2.5,
            px: 3,
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)',
          }}
        >
          {importing ? 'Importando...' : `Importar ${parsedNotes.length} Notas`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
