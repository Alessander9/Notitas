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
  TextField,
  Chip,
  Paper,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as SparklesIcon,
  Save as SaveIcon,
  PlayArrow as ApplyIcon,
  Refresh as RetryIcon,
  Lightbulb as IdeaIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { toast } from '../store/toastStore';

const QUICK_PROMPTS = [
  'Auditoría y Checklist de SEO para sitio web',
  'Plan de Onboarding para nuevo empleado',
  'Análisis DAFO / FODA Estratégico',
  'Plan de Entrenamiento para Maratón (12 semanas)',
  'Minuta y Acuerdos de Sprint Retrospective',
  'Presupuesto y Planificador de Boda o Evento',
  'Estrategia de Lanzamiento en Redes Sociales',
  'Plan de Estudio para Certificación Técnica',
];

export default function AiTemplateGeneratorModal({
  open,
  onClose,
  onApplyTemplate,
  onSaveToCustomTemplates,
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState(null);

  const handleGenerate = async (promptToUse) => {
    const queryText = (promptToUse || prompt).trim();
    if (!queryText) {
      toast.error('Por favor escribe qué tipo de plantilla necesitas');
      return;
    }

    setLoading(true);
    setGeneratedTemplate(null);

    const systemInstruction = `Eres CleoBot, un asistente de IA de élite especializado en diseño de plantillas de notas estructuradas y productivas para la app Notitas.
Diseña una plantilla profesional, estética y completa para la siguiente solicitud del usuario.
IMPORTANTE: Debes responder EXCLUSIVAMENTE con un JSON válido parseable (sin texto antes ni después, sin etiquetas markdown \`\`\`json).
El JSON debe tener exactamente estos campos:
{
  "icon": "emoji adecuado (ej: 🚀, 📊, 🎯, 💡, 📝)",
  "title": "Título corto y atractivo",
  "category": "Trabajo | Productividad | Vida Diaria | Salud | Bienestar | Finanzas | Estudio | Creatividad",
  "description": "Descripción concisa en 1 frase",
  "content": "Contenido en HTML limpio estructurado para TipTap (usa <h2>, <h3>, <p>, <strong>, <hr />, <blockquote> y listas interactivas <ul data-type=\\"taskList\\"><li data-type=\\"taskItem\\" data-checked=\\"false\\"><label><input type=\\"checkbox\\"><span></span></label><div><p>Tarea pendiente</p></div></li></ul>)"
}`;

    try {
      const res = await api.post('/ai/chat', {
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Crea una plantilla para: ${queryText}` },
        ],
      });

      let rawContent = res.data?.message || '';
      // Limpiar posibles bloques markdown envolventes ```json ... ```
      rawContent = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(rawContent);
      if (!parsed.title || !parsed.content) {
        throw new Error('Estructura de plantilla inválida');
      }

      setGeneratedTemplate({
        id: `ai-${Date.now()}`,
        icon: parsed.icon || '✨',
        title: parsed.title,
        category: parsed.category || 'Personalizadas',
        description: parsed.description || `Generada con CleoBot para: "${queryText}"`,
        content: parsed.content,
      });

      toast.success('¡Plantilla generada con éxito!');
    } catch (err) {
      console.warn('Error al parsear o llamar a la API de IA:', err);
      // Plantilla de contingencia creativa basada en el prompt
      const fallbackTitle = queryText.charAt(0).toUpperCase() + queryText.slice(1);
      setGeneratedTemplate({
        id: `ai-${Date.now()}`,
        icon: '✨',
        title: fallbackTitle,
        category: 'Personalizadas',
        description: `Plantilla estructurada para: ${queryText}`,
        content: `
          <h2>✨ ${fallbackTitle}</h2>
          <p><strong>Fecha de creación:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
          <hr />
          <h3>🎯 1. Objetivos Principales</h3>
          <ul data-type="taskList">
            <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Definir los entregables clave y alcance inicial</p></div></li>
            <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Asignar responsables y cronograma de hitos</p></div></li>
          </ul>
          <h3>📋 2. Plan de Acción y Pasos Críticos</h3>
          <p>Detalla aquí la metodología, recursos y métricas de éxito...</p>
          <blockquote>"El éxito consiste en convertir las ideas estructuradas en ejecución diaria."</blockquote>
          <h3>✅ 3. Checklist de Verificación y Cierre</h3>
          <ul data-type="taskList">
            <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Validación de calidad y revisión de resultados</p></div></li>
            <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Documentar aprendizajes para futuras iteraciones</p></div></li>
          </ul>
        `,
      });
      toast.info('Plantilla generada con estructura inteligente');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedTemplate) return;
    onApplyTemplate(generatedTemplate);
    onClose();
  };

  const handleSave = () => {
    if (!generatedTemplate) return;
    onSaveToCustomTemplates({
      title: generatedTemplate.title,
      description: generatedTemplate.description,
      icon: generatedTemplate.icon,
      category: generatedTemplate.category,
      content: generatedTemplate.content,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: 1,
          border: '1px solid',
          borderColor: 'divider',
          backgroundImage: 'none',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
              background: 'linear-gradient(135deg, #386c5f 0%, #6a968c 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(56, 108, 95, 0.4)',
            }}
          >
            <SparklesIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Generador de Plantillas con CleoBot
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Describe lo que necesitas y la IA creará la estructura ideal
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '10px !important' }}>
        {/* Input de descripción */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ej: Plan de entrenamiento para 5K, Auditoría de ciberseguridad, Minuta ejecutiva..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                bgcolor: 'background.paper',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={() => handleGenerate()}
            disabled={loading || !prompt.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SparklesIcon />}
            sx={{
              borderRadius: 2.5,
              px: 3,
              fontWeight: 700,
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(56, 108, 95, 0.3)',
            }}
          >
            {loading ? 'Generando...' : 'Generar'}
          </Button>
        </Box>

        {/* Chips de ideas rápidas */}
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IdeaIcon sx={{ fontSize: 14, color: 'warning.main' }} /> Ideas rápidas:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 0.5 }}>
            {QUICK_PROMPTS.map((qp, idx) => (
              <Chip
                key={idx}
                label={qp}
                size="small"
                onClick={() => {
                  setPrompt(qp);
                  handleGenerate(qp);
                }}
                disabled={loading}
                sx={{
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(56,108,95,0.06)',
                  '&:hover': {
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(56,108,95,0.14)',
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Vista previa de la plantilla generada */}
        {generatedTemplate && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'primary.main',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.1)' : 'rgba(56, 108, 95, 0.04)',
              maxHeight: 320,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '1.6rem', lineHeight: 1 }}>{generatedTemplate.icon}</Typography>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {generatedTemplate.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {generatedTemplate.category} • {generatedTemplate.description}
                  </Typography>
                </Box>
              </Box>
              <Tooltip title="Regenerar con otra variación">
                <IconButton size="small" onClick={() => handleGenerate()} disabled={loading} color="primary">
                  <RetryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Renderizado del HTML con tipografía adecuada */}
            <Box
              sx={{
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'text.primary',
                '& h2': { fontSize: '1.2rem', fontWeight: 800, mt: 1, mb: 0.5 },
                '& h3': { fontSize: '1rem', fontWeight: 700, mt: 1.5, mb: 0.5 },
                '& p': { my: 0.5 },
                '& blockquote': {
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                  pl: 1.5,
                  py: 0.5,
                  my: 1,
                  fontStyle: 'italic',
                  color: 'text.secondary',
                },
                '& hr': { border: 'none', borderTop: '1px solid', borderColor: 'divider', my: 1.5 },
                '& ul[data-type="taskList"]': {
                  listStyle: 'none',
                  p: 0,
                  m: 0,
                  '& li': { display: 'flex', alignItems: 'center', gap: 1, my: 0.3 },
                },
              }}
              dangerouslySetInnerHTML={{ __html: generatedTemplate.content }}
            />
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, color: 'text.secondary' }}>
          Cerrar
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleSave}
            disabled={!generatedTemplate || loading}
            startIcon={<SaveIcon />}
            sx={{ borderRadius: 2.5, fontWeight: 600 }}
          >
            Guardar en Mis Plantillas
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={!generatedTemplate || loading}
            startIcon={<ApplyIcon />}
            sx={{
              borderRadius: 2.5,
              px: 3,
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(56, 108, 95, 0.3)',
            }}
          >
            Aplicar a la Nota
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
