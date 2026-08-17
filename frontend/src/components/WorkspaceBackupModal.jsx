import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudDownload as ExportIcon,
  CloudUpload as ImportIcon,
  Inventory2 as BackupIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import JSZip from 'jszip';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import api from '../services/api';
import { toast } from '../store/toastStore';
import { useQueryClient } from '@tanstack/react-query';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});
turndownService.use(gfm);

export default function WorkspaceBackupModal({ open, onClose, projects = [] }) {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedStats, setImportedStats] = useState(null);

  // Exportar todo el workspace a un archivo .ZIP estructurado por carpetas de proyectos
  const handleExportWorkspace = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();

      // Recorrer todos los proyectos
      for (const project of projects) {
        const folderName = (project.name || `Proyecto_${project.id}`).replace(/[/\\?%*:|"<>]/g, '_');
        const projFolder = zip.folder(folderName);

        // Metadata del proyecto
        projFolder.file(
          '_proyecto.json',
          JSON.stringify(
            {
              id: project.id,
              name: project.name,
              description: project.description,
              color: project.color,
              icon: project.icon,
            },
            null,
            2
          )
        );

        // Obtener notas del proyecto
        try {
          const res = await api.get(`/projects/${project.id}/notes`);
          const notes = res.data?.notes || res.data || [];

          for (const note of notes) {
            const fileName = `${(note.title || 'Sin_titulo').replace(/[/\\?%*:|"<>]/g, '_')}.md`;
            let mdContent = `# ${note.title || 'Sin título'}\n\n`;

            if (note.tags && note.tags.length > 0) {
              mdContent += `tags: [${note.tags.join(', ')}]\n\n`;
            }

            if (note.content) {
              mdContent += turndownService.turndown(note.content);
            }

            projFolder.file(fileName, mdContent);
          }
        } catch (e) {
          console.error(`Error exportando notas de proyecto ${project.id}`, e);
        }
      }

      // Generar ZIP y descargar
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Notitas_Respaldo_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Respaldo de Workspace descargado en .ZIP');
      setIsExporting(false);
      onClose();
    } catch (err) {
      console.error('Error al exportar workspace', err);
      toast.error('Error al generar respaldo');
      setIsExporting(false);
    }
  };

  // Importar archivos .md o .zip de Notion / Obsidian
  const handleImportFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsImporting(true);
    let createdProjects = 0;
    let createdNotes = 0;

    try {
      // 1. Si es archivo .zip
      const zipFile = files.find((f) => f.name.endsWith('.zip'));
      if (zipFile) {
        const zip = await JSZip.loadAsync(zipFile);

        // Crear proyecto importado
        const projRes = await api.post('/projects', {
          name: `Importado ${zipFile.name.replace('.zip', '')}`,
          description: 'Proyecto restaurado desde archivo ZIP',
          color: '#386c5f',
        });
        const targetProjId = projRes.data.id;
        createdProjects++;

        for (const [path, fileObj] of Object.entries(zip.files)) {
          if (!fileObj.dir && (path.endsWith('.md') || path.endsWith('.txt'))) {
            const text = await fileObj.async('text');
            const cleanTitle = path.split('/').pop().replace(/\.(md|txt)$/, '');
            await api.post(`/projects/${targetProjId}/notes`, {
              title: cleanTitle,
              content: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
            });
            createdNotes++;
          }
        }
      } else {
        // 2. Si son múltiples archivos .md individuales
        const projRes = await api.post('/projects', {
          name: `Importación Markdown (${new Date().toLocaleDateString()})`,
          description: 'Notas importadas desde archivos locales',
          color: '#845EC2',
        });
        const targetProjId = projRes.data.id;
        createdProjects++;

        for (const file of files) {
          const text = await file.text();
          const cleanTitle = file.name.replace(/\.(md|txt)$/, '');
          await api.post(`/projects/${targetProjId}/notes`, {
            title: cleanTitle,
            content: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
          });
          createdNotes++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });

      setImportedStats({ projects: createdProjects, notes: createdNotes });
      toast.success(`Importación completada: ${createdNotes} notas creadas`);
      setIsImporting(false);
    } catch (err) {
      console.error('Error al importar archivos', err);
      toast.error('Error al procesar archivos importados');
      setIsImporting(false);
    }
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
            <BackupIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Respaldo, Exportación & Importación
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Copia completa de tu espacio de trabajo sin ataduras
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2 }}>
        {/* Opción 1: Exportar Workspace completo en ZIP */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <ExportIcon color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={800}>
                Exportar todo el Workspace en .ZIP
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
              Descarga todas tus notas formateadas en Markdown (`.md`) organizadas en carpetas por proyecto con metadatos completos.
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={handleExportWorkspace}
            disabled={isExporting || isImporting}
            startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : <ExportIcon />}
            sx={{
              borderRadius: 2.5,
              fontWeight: 700,
              textTransform: 'none',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(56, 108, 95, 0.3)',
            }}
          >
            {isExporting ? 'Empaquetando...' : 'Descargar ZIP'}
          </Button>
        </Paper>

        <Divider />

        {/* Opción 2: Importar desde Markdown / Notion / ZIP */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: '1px dashed',
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImportIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={800}>
              Importar Notas desde Markdown o Notion (.ZIP / .md)
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            Sube un archivo `.zip` exportado de Notion/Obsidian o arrastra múltiples archivos `.md`. Se creará un proyecto con todas las notas restauradas automáticamente.
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
            <Button
              variant="outlined"
              component="label"
              disabled={isImporting || isExporting}
              startIcon={isImporting ? <CircularProgress size={16} /> : <ImportIcon />}
              sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
            >
              {isImporting ? 'Procesando archivos...' : 'Seleccionar archivos (.zip / .md)'}
              <input
                type="file"
                hidden
                multiple
                accept=".zip,.md,.txt"
                onChange={handleImportFiles}
              />
            </Button>

            {importedStats && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                <SuccessIcon sx={{ fontSize: 18 }} />
                <Typography variant="caption" fontWeight={700}>
                  {importedStats.notes} notas importadas
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
