import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Gif as GifIcon,
  Animation as AnimationIcon,
} from '@mui/icons-material';
import MediaPickerModal from './MediaPickerModal';

export const COLOR_OPTIONS = [
  // Violetas
  '#845EC2', '#6a4aa3', '#B39CD0', '#A855F7', '#7C3AED',
  // Azules
  '#6366F1', '#296073', '#3596B5', '#3B82F6', '#0EA5E9', '#ADC5CF',
  // Verdes
  '#386c5f', '#6a968c', '#264e44', '#10B981', '#22C55E', '#84CC16',
  // Cálidos
  '#F59E0B', '#F97316', '#E63946', '#EC4899', '#F472B6',
  // Neutros
  '#92400E', '#6B7280', '#475569', '#0F172A',
];

export const ICON_OPTIONS = [
  { id: 'folder', label: 'Carpeta', icon: '📁' },
  { id: 'code', label: 'Código', icon: '💻' },
  { id: 'rocket', label: 'Proyecto', icon: '🚀' },
  { id: 'book', label: 'Estudios', icon: '📚' },
  { id: 'work', label: 'Trabajo', icon: '💼' },
  { id: 'palette', label: 'Diseño', icon: '🎨' },
  { id: 'bolt', label: 'Ideas', icon: '⚡' },
  { id: 'brain', label: 'IA / Mente', icon: '🧠' },
  { id: 'coffee', label: 'Personal', icon: '☕' },
  { id: 'science', label: 'Ciencia', icon: '🔬' },
  { id: 'game', label: 'Juegos', icon: '🎮' },
  { id: 'security', label: 'Seguridad', icon: '🔒' },
  { id: 'web', label: 'Web', icon: '🌐' },
  { id: 'globe', label: 'Mundo', icon: '🌎' },
  { id: 'star', label: 'Estrella', icon: '⭐' },
  { id: 'heart', label: 'Salud', icon: '❤️' },
  { id: 'music', label: 'Música', icon: '🎵' },
  { id: 'chart', label: 'Gráfico', icon: '📈' },
  { id: 'cloud', label: 'Nube', icon: '☁️' },
  { id: 'lightbulb', label: 'Ideas', icon: '💡' },
  { id: 'graduation', label: 'Educación', icon: '🎓' },
  { id: 'database', label: 'Base de Datos', icon: '🗄️' },
  { id: 'key', label: 'Claves', icon: '🔑' },
  { id: 'wrench', label: 'Herramientas', icon: '🛠️' },
  { id: 'home', label: 'Hogar', icon: '🏠' },
  { id: 'shopping', label: 'Compras', icon: '🛒' },
  { id: 'calendar', label: 'Calendario', icon: '📅' },
  { id: 'trophy', label: 'Logros', icon: '🏆' },
  { id: 'target', label: 'Objetivos', icon: '🎯' },
  { id: 'terminal', label: 'Consola', icon: '📟' },
  { id: 'weather', label: 'Clima', icon: '🌧️' },
  { id: 'pin', label: 'Fijados', icon: '📌' },
  { id: 'dollar', label: 'Finanzas', icon: '💵' },
  { id: 'meditation', label: 'Salud Mental', icon: '🧘' },
  { id: 'gift', label: 'Especial', icon: '🎁' },
];

export const getProjectIcon = (iconId) => {
  const found = ICON_OPTIONS.find((opt) => opt.id === iconId);
  return found ? found.icon : '📁';
};

const SectionLabel = ({ color, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
    <Box
      sx={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        bgcolor: color,
        boxShadow: `0 0 8px ${color}88`,
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }}
    />
    <Typography
      variant="caption"
      fontWeight={800}
      letterSpacing="1.1px"
      color="text.secondary"
      sx={{ textTransform: 'uppercase' }}
    >
      {children}
    </Typography>
  </Box>
);

export default function ProjectFormDialog({
  open,
  onClose,
  isEditing,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  color,
  onColorChange,
  icon,
  onIconChange,
  previewUrl,
  onFileChange,
  onSelectMediaUrl,
  onRemoveCover,
  canRemoveCover = true,
  isPending,
  onSubmit,
}) {
  const fileRef = useRef(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Los padres pasan setters de useState (setName/setDescription) directamente
  // como onNameChange/onDescriptionChange. MUI invoca onChange(event), así que
  // sin esta normalización el estado recibiría el objeto SyntheticEvent y
  // name.trim() explotaría en el render (ErrorBoundary -> "Algo salió mal").
  const handleNameChange = (e) => onNameChange(e.target.value);
  const handleDescriptionChange = (e) => onDescriptionChange(e.target.value);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3.5, overflow: 'hidden' } }}
    >
      {/* Header with gradient using the selected color and live icon preview */}
      <Box
        sx={{
          position: 'relative',
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 60%, ${color}55 100%)`,
          pt: 3,
          pb: 2.5,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -35, right: -25, width: 130, height: 130, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.14)' }} />
        <Box sx={{ position: 'absolute', bottom: -50, left: 80, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
        <Box
          sx={{
            position: 'relative',
            width: 54,
            height: 54,
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          {getProjectIcon(icon)}
        </Box>
        <Box sx={{ position: 'relative', minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} color="#fff" sx={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)', lineHeight: 1.2 }}>
            {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
            {isEditing ? 'Actualiza la información de tu proyecto' : 'Crea un espacio para organizar tus notas y tareas'}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'relative',
            ml: 'auto',
            color: '#fff',
            bgcolor: 'rgba(255,255,255,0.18)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.32)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pt: 2.75, pb: 1 }}>
        <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.75 }}>
          {/* Detalles */}
          <Box>
            <SectionLabel color={color}>Detalles</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Nombre del proyecto"
                fullWidth
                required
                autoFocus
                value={name}
                onChange={handleNameChange}
                placeholder="Ej. Plan de estudios 2026"
              />
              <TextField
                label="Descripción (opcional)"
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                value={description}
                onChange={handleDescriptionChange}
                placeholder="¿De qué trata este proyecto?"
              />
            </Box>
          </Box>

          {/* Foto de portada */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <SectionLabel color={color}>Foto de portada</SectionLabel>
              <Button
                size="small"
                startIcon={<AnimationIcon sx={{ fontSize: 16 }} />}
                onClick={() => setMediaPickerOpen(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  borderRadius: 2,
                  py: 0.2,
                  px: 1,
                }}
              >
                Buscar GIFs en GIPHY / Fondos
              </Button>
            </Box>
            <Box
              sx={{
                position: 'relative',
                height: 132,
                borderRadius: 3,
                overflow: 'hidden',
                border: '1.5px dashed',
                borderColor: previewUrl ? 'divider' : 'primary.main',
                bgcolor: 'action.hover',
                transition: 'all 0.25s ease',
              }}
            >
              {previewUrl ? (
                <>
                  <Box
                    component="img"
                    src={previewUrl}
                    alt="Vista previa de la portada"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent 55%)' }} />
                  <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 1 }}>
                    <Tooltip title="Cambiar foto">
                      <IconButton
                        size="small"
                        onClick={() => fileRef.current?.click()}
                        sx={{
                          bgcolor: 'rgba(15,15,35,0.6)',
                          color: '#fff',
                          backdropFilter: 'blur(6px)',
                          '&:hover': { bgcolor: 'rgba(15,15,35,0.85)' },
                        }}
                      >
                        <PhotoCameraIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canRemoveCover && (
                      <Tooltip title="Quitar foto">
                        <IconButton
                          size="small"
                          onClick={onRemoveCover}
                          sx={{
                            bgcolor: 'rgba(15,15,35,0.6)',
                            color: '#fff',
                            backdropFilter: 'blur(6px)',
                            '&:hover': { bgcolor: 'error.main' },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 10,
                      left: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.6,
                      bgcolor: 'rgba(15,15,35,0.55)',
                      color: '#fff',
                      px: 1.1,
                      py: 0.45,
                      borderRadius: 1.5,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <GifIcon sx={{ fontSize: 13 }} /> GIF soportado
                  </Box>
                </>
              ) : (
                <Box
                  role="button"
                  tabIndex={0}
                  aria-label="Subir foto de portada"
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileRef.current?.click();
                    }
                  }}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    '&:hover': { bgcolor: 'action.selected' },
                    '&:focus-visible': {
                      bgcolor: 'action.selected',
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: -2,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '14px',
                      bgcolor: (t) => `${t.palette.primary.main}1F`,
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PhotoCameraIcon fontSize="small" />
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" fontWeight={600}>
                      Subir foto de portada
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      JPG, PNG o GIF · máx. 10 MB
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
            <input ref={fileRef} hidden type="file" accept="image/*,image/gif" onChange={onFileChange} />
          </Box>

          {/* Icono */}
          <Box>
            <SectionLabel color={color}>Icono</SectionLabel>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                  gap: 0.75,
                  p: 1.25,
                  maxHeight: 148,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2.5,
                  bgcolor: 'background.default',
                }}
              >
                {ICON_OPTIONS.map((opt) => {
                  const selected = icon === opt.id;
                  return (
                    <Tooltip key={opt.id} title={opt.label} placement="top">
                      <motion.div whileHover={{ scale: 1.12, y: -1 }} whileTap={{ scale: 0.9 }} style={{ display: 'flex' }}>
                        <Box
                          data-testid={`icon-${opt.id}`}
                          onClick={() => onIconChange(opt.id)}
                          sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            lineHeight: 1,
                            cursor: 'pointer',
                            py: 0.75,
                            borderRadius: 2,
                            border: '1.5px solid',
                            borderColor: selected ? color : 'transparent',
                            bgcolor: selected ? `${color}20` : 'transparent',
                            transition: 'all 0.15s ease',
                            '&:hover': { bgcolor: selected ? `${color}20` : 'action.hover' },
                          }}
                        >
                          {opt.icon}
                        </Box>
                      </motion.div>
                    </Tooltip>
                  );
                })}
              </Box>
          </Box>

          {/* Color */}
          <Box>
            <SectionLabel color={color}>Color</SectionLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 0.75 }}>
                {COLOR_OPTIONS.map((c) => {
                  const selected = color === c;
                  return (
                    <Tooltip key={c} title={c}>
                      <motion.div whileHover={{ scale: 1.12, y: -2 }} whileTap={{ scale: 0.9 }} style={{ display: 'flex', justifyContent: 'center' }}>
                        <Box
                          data-testid={`color-${c}`}
                          onClick={() => onColorChange(c)}
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            bgcolor: c,
                            cursor: 'pointer',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '3px solid',
                            borderColor: 'background.paper',
                            boxShadow: selected
                              ? `0 0 0 2px ${c}, 0 4px 14px ${c}66`
                              : '0 2px 6px rgba(0,0,0,0.18)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <AnimatePresence>
                            {selected && (
                              <motion.div
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              >
                                <CheckIcon
                                  sx={{ fontSize: 17, color: '#fff', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Box>
                      </motion.div>
                    </Tooltip>
                  );
                })}
              </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2 }}>
          Cancelar
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={!name.trim() || isPending}
          startIcon={isPending ? <CircularProgress size={15} color="inherit" /> : undefined}
          sx={{ minWidth: 150, borderRadius: 2 }}
        >
          {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear proyecto'}
        </Button>
      </DialogActions>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelectMedia={(url) => {
          if (onSelectMediaUrl) onSelectMediaUrl(url);
        }}
        onUploadFile={(file) => {
          if (onFileChange) onFileChange({ target: { files: [file] } });
        }}
        title="Elegir Portada o GIF Animado para el Proyecto"
      />
    </Dialog>
  );
}
