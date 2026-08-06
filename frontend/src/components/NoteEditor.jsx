import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Chip,
  Button,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  AddPhotoAlternate as AddCoverIcon,
  AttachFile as AttachFileIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatStrikethrough as StrikeIcon,
  Code as CodeIcon,
  Title as TitleIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberedListIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Share as ShareIcon,
  Image as ImageIcon,
  Check as CheckIcon,
  Edit as EditIcon,
  DriveFileMove as MoveIcon,
  Lock as LockIcon,
  GridOn as TableIcon,
  PlaylistAddCheck as ChecklistIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  Description as DescriptionIcon,
  Add as AddIcon,
  EditNote as EditNoteIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import NoteEditorSkeleton from './skeletons/NoteEditorSkeleton';
import CoverImage from './CoverImage';
import AuthorAvatars from './AuthorAvatars';
import MemberProfileDialog from './MemberProfileDialog';
import NoteHistoryDialog from './NoteHistoryDialog';
import { getAssetUrl } from '../utils/text';

// Extend TipTap Image to support alignment classes dynamically
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: 'center',
        renderHTML: (attributes) => {
          return {
            class: `align-${attributes.alignment}`,
          };
        },
        parseHTML: (element) => {
          const className = element.getAttribute('class') || '';
          const match = className.match(/align-(\w+)/);
          return match ? match[1] : 'center';
        },
      },
    };
  },
});

export default function NoteEditor() {
  const { currentNoteId, setCurrentNote, currentProjectId, setCurrentProject } = useUiStore();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [shareToken, setShareToken] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [historyOpen, setHistoryOpen] = useState(false);

  // Menu state for moving note to project
  const [projectMenuAnchor, setProjectMenuAnchor] = useState(null);

  // Menu state for table operations
  const [tableMenuAnchor, setTableMenuAnchor] = useState(null);

  // States for editing attachment tags
  const [editingAttachmentId, setEditingAttachmentId] = useState(null);
  const [attachmentTagValue, setAttachmentTagValue] = useState('');

  // Member whose profile is open (clicked avatar)
  const [profileMember, setProfileMember] = useState(null);

  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const inlineImageInputRef = useRef(null);

  // Fetch Note Details
  const { data: note, isLoading } = useQuery({
    queryKey: ['note', currentNoteId],
    queryFn: async () => {
      if (!currentNoteId) return null;
      const res = await api.get(`/notes/${currentNoteId}`);
      return res.data;
    },
    enabled: Boolean(currentNoteId),
  });

  // Fetch Projects List (to resolve roles and move notes to)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
  });

  const activeProject = projects.find((p) => p.id === note?.projectId);
  const userRole = activeProject?.currentUserRole || 'OWNER'; // Default to OWNER
  const isReadOnly = userRole === 'VIEWER';

  // Word count + reading time micro-interaction
  const wordCount = React.useMemo(() => {
    if (!note?.content) return 0;
    const text = note.content
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
    return text ? text.split(/\s+/).length : 0;
  }, [note?.content]);
  const readingMinutes = wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : 0;

  // Upload image to backend and return full url
  const uploadInlineImage = async (file, alignment = 'center') => {
    if (!currentNoteId || isReadOnly) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/notes/${currentNoteId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imageUrl = getAssetUrl(res.data.url);

      // Insert image inside TipTap Editor with custom alignment attribute
      editor.chain().focus().setImage({ src: imageUrl, alignment }).run();
    } catch (e) {
      console.error('Error uploading inline image', e);
      toast.error('No se pudo subir la imagen.');
    }
  };

  // Initialize TipTap Editor with all advanced extensions
  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomImage,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Escribe tu nota aquí (soporta Markdown, copiar/pegar y arrastrar imágenes, checklists, tablas, código...)...',
      }),
    ],
    content: '',
    editorProps: {
      handleDOMEvents: {
        paste: (view, event) => {
          if (isReadOnly) return false;
          const items = Array.from(event.clipboardData?.items || []);
          const imageItem = items.find((item) => item.type.startsWith('image/'));

          if (imageItem) {
            event.preventDefault();
            const file = imageItem.getAsFile();
            if (file) {
              uploadInlineImage(file);
              return true;
            }
          }
          return false;
        },
        drop: (view, event) => {
          if (isReadOnly) return false;
          const files = Array.from(event.dataTransfer?.files || []);
          const imageFile = files.find((file) => file.type.startsWith('image/'));

          if (imageFile) {
            event.preventDefault();
            uploadInlineImage(imageFile);
            return true;
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      if (!isReadOnly) {
        contentRef.current = editor.getHTML();
        scheduleSave(titleRef.current, editor.getHTML());
      }
    },
  });

  // Update title and editor content when note changes. El segundo argumento
  // (emitUpdate = false) evita que al cargar/restaurar una nota se dispare el
  // auto-guardado, lo que crearía versiones duplicadas en el historial.
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      titleRef.current = note.title || '';
      contentRef.current = note.content || '';
      if (editor && editor.getHTML() !== note.content) {
        editor.commands.setContent(note.content || '', false);
      }
    }
  }, [note, editor]);

  // Set editor read-only state dynamically
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly);
    }
  }, [editor, isReadOnly]);

  // Auto-guardado con un ÚNICO debounce para título y contenido. Cualquier
  // cambio programa un guardado que envía AMBOS campos con los valores
  // capturados en el cierre (no se leen refs al dispararse, para no perder
  // ediciones si una refetch sobreescribe las refs antes de tiempo).
  // Ventajas frente al diseño anterior (timers separados): no se pierde el
  // título al editar el cuerpo, y una edición crea UNA versión en el
  // historial (no dos) porque el payload siempre lleva título + contenido.
  const titleRef = useRef('');
  const contentRef = useRef('');
  const saveTimeoutRef = useRef(null);

  const clearPendingSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  };

  const scheduleSave = (titleValue, contentValue) => {
    if (!currentNoteId || isReadOnly) return;
    setSaveStatus('unsaved');
    clearPendingSave();
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saving');
      updateNoteMutation.mutate({ title: titleValue, content: contentValue });
    }, 800);
  };

  const handleTitleChange = (e) => {
    if (isReadOnly) return;
    const newTitle = e.target.value;
    setTitle(newTitle);
    titleRef.current = newTitle;
    scheduleSave(newTitle, editor ? editor.getHTML() : contentRef.current);
  };

  // Cancela guardados pendientes al desmontar
  React.useEffect(() => () => clearPendingSave(), []);

  // Al cambiar de nota se cancelan los guardados pendientes de la nota anterior
  React.useEffect(() => {
    clearPendingSave();
  }, [currentNoteId]);

  // Update Note Mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put(`/notes/${currentNoteId}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
      queryClient.invalidateQueries({ queryKey: ['note', currentNoteId] });
      if (data.projectId && currentProjectId !== data.projectId && currentProjectId !== 'favorites' && currentProjectId !== 'trash') {
        setCurrentProject(data.projectId);
      }
      // If restoring from trash, navigate to the note's project
      if (currentProjectId === 'trash' && data.deleted === false && data.projectId) {
        setCurrentProject(data.projectId);
      }
      setSaveStatus('saved');
    },
  });

  // Update Attachment Tag Mutation
  const updateAttachmentTagMutation = useMutation({
    mutationFn: async ({ attachmentId, tag }) => {
      const res = await api.put(`/notes/${currentNoteId}/attachments/${attachmentId}/tag`, null, {
        params: { tag },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', currentNoteId] });
      setEditingAttachmentId(null);
      setAttachmentTagValue('');
    },
  });

  // Toggle Favorite
  const toggleFavorite = () => {
    if (!note || isReadOnly) return;
    updateNoteMutation.mutate({ favorite: !note.favorite });
  };

  // Move to Trash / Restore / Delete Permanently
  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/notes/${currentNoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
      setCurrentNote(null);
      toast.success('Nota movida a la papelera');
    },
    onError: () => toast.error('No se pudo eliminar la nota'),
  });

  const restoreNote = () => {
    if (!note || isReadOnly) return;
    updateNoteMutation.mutate(
      { deleted: false },
      {
        onSuccess: () => toast.success('Nota restaurada'),
        onError: () => toast.error('No se pudo restaurar la nota'),
      }
    );
  };

  // Create Note Mutation (for the "Crear nota" button in empty state)
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/projects/${currentProjectId}/notes`, {
        title: 'Nueva Nota',
        content: '',
      });
      return res.data;
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setCurrentNote(newNote.id);
    },
  });

  // Upload Cover Image
  const uploadCoverMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/notes/${currentNoteId}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', currentNoteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Delete Cover Image
  const deleteCoverMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/notes/${currentNoteId}/cover`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', currentNoteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Upload Attachment
  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/notes/${currentNoteId}/attachment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', currentNoteId] });
    },
  });

  // Share Note Link Generation
  const handleOpenShareDialog = async () => {
    try {
      const res = await api.post(`/notes/${currentNoteId}/share-token`);
      setShareToken(res.data.shareToken);
      setCopySuccess(false);
      setOpenShareDialog(true);
    } catch (e) {
      console.error('Error getting share token', e);
      toast.error('Error al generar el enlace de compartir.');
    }
  };

  const handleCopyShareLink = () => {
    const fullLink = `${window.location.origin}/shared/note/${shareToken}`;
    navigator.clipboard.writeText(fullLink);
    setCopySuccess(true);
    toast.success('Enlace de la nota copiado');
  };

  // Tag Management
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim() && !isReadOnly) {
      e.preventDefault();
      const currentTags = note?.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        const newTags = [...currentTags, tagInput.trim()];
        updateNoteMutation.mutate({ tags: newTags });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    if (isReadOnly) return;
    const currentTags = note?.tags || [];
    const newTags = currentTags.filter((t) => t !== tagToRemove);
    updateNoteMutation.mutate({ tags: newTags });
  };

  const startEditTag = (att) => {
    if (isReadOnly) return;
    setEditingAttachmentId(att.id);
    setAttachmentTagValue(att.tag || '');
  };

  const saveAttachmentTag = (attachmentId) => {
    updateAttachmentTagMutation.mutate({ attachmentId, tag: attachmentTagValue });
  };

  const handleMoveNoteClick = (event) => {
    setProjectMenuAnchor(event.currentTarget);
  };

  const handleMoveNoteClose = () => {
    setProjectMenuAnchor(null);
  };

  const handleMoveToProject = (targetProjectId) => {
    handleMoveNoteClose();
    updateNoteMutation.mutate({ projectId: targetProjectId });
  };

  const handleTableMenuClick = (event) => {
    setTableMenuAnchor(event.currentTarget);
  };

  const handleTableMenuClose = () => {
    setTableMenuAnchor(null);
  };

  const handleInsertTable = () => {
    handleTableMenuClose();
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleAddRowBefore = () => {
    handleTableMenuClose();
    editor.chain().focus().addRowBefore().run();
  };

  const handleAddRowAfter = () => {
    handleTableMenuClose();
    editor.chain().focus().addRowAfter().run();
  };

  const handleAddColumnBefore = () => {
    handleTableMenuClose();
    editor.chain().focus().addColumnBefore().run();
  };

  const handleAddColumnAfter = () => {
    handleTableMenuClose();
    editor.chain().focus().addColumnAfter().run();
  };

  const handleDeleteRow = () => {
    handleTableMenuClose();
    editor.chain().focus().deleteRow().run();
  };

  const handleDeleteColumn = () => {
    handleTableMenuClose();
    editor.chain().focus().deleteColumn().run();
  };

  const handleDeleteTable = () => {
    handleTableMenuClose();
    editor.chain().focus().deleteTable().run();
  };

  const changeSelectedImageAlignment = (alignment) => {
    if (editor) {
      editor.chain().focus().updateAttributes('image', { alignment }).run();
    }
  };

  if (!currentNoteId) {
    return (
      <Box
        sx={{
          flexGrow: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          color: 'text.secondary',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: '28%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
            opacity: 0.8,
          }}
        >
          <DescriptionIcon sx={{ fontSize: 52, color: '#ffffff' }} />
        </Box>
        <Typography variant="h5" fontWeight={700} color="text.primary">
          Selecciona una nota
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 360 }}>
          Expande un proyecto en el panel lateral y haz clic en una nota para abrirla, o crea una nueva nota.
        </Typography>
        {typeof currentProjectId === 'number' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => createNoteMutation.mutate()}
            disabled={createNoteMutation.isPending}
            sx={{ mt: 1, borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3, py: 1 }}
          >
            {createNoteMutation.isPending ? 'Creando...' : 'Crear nueva nota'}
          </Button>
        )}
      </Box>
    );
  }

  if (isLoading) {
    return <NoteEditorSkeleton />;
  }

  const coverUrl = getAssetUrl(note?.coverImage);

  const currentProjectName = projects.find((p) => p.id === note?.projectId)?.name || 'Proyecto';

  // Last editor resolution (same as the note list)
  const members = activeProject ? [activeProject.creator, ...(activeProject.collaborators || [])] : [];
  const lastEditor = note?.updatedBy != null ? members.find((m) => m?.id === note.updatedBy) : null;

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflowY: 'auto',
      }}
    >
      {/* Unified header: breadcrumbs + actions */}
      <Box
        sx={{
          px: { xs: 1.5, sm: 3 },
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Breadcrumbs
          separator="›"
          sx={{
            fontSize: '0.8rem',
            minWidth: 0,
            overflow: 'hidden',
            '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' },
          }}
        >
          <Link
            component="button"
            variant="body2"
            onClick={() => { setCurrentProject(null); setCurrentNote(null); }}
            sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
          >
            Proyectos
          </Link>
          <Link
            component="button"
            variant="body2"
            onClick={() => setCurrentNote(null)}
            sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
          >
            {currentProjectName}
          </Link>
          <Typography variant="body2" color="text.primary" fontWeight={600} noWrap>
            {note?.title || 'Sin título'}
          </Typography>
        </Breadcrumbs>

        {/* Actions: status (moved to the sticky formatting bar) + icon group */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {isReadOnly && (
            <Chip
              icon={<LockIcon sx={{ fontSize: '0.85rem' }} />}
              label="Sólo Lectura"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ mr: 0.75, height: 24 }}
            />
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              px: 0.5,
              py: 0.25,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            {!isReadOnly && (
              <>
                <Tooltip title={coverUrl ? 'Cambiar portada' : 'Agregar portada'}>
                  <IconButton size="small" onClick={() => coverInputRef.current?.click()} sx={{ p: 0.6 }}>
                    <AddCoverIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Adjuntar archivo">
                  <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ p: 0.6 }}>
                    <AttachFileIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title={`Mover a otro proyecto (${currentProjectName})`}>
                  <IconButton size="small" onClick={handleMoveNoteClick} sx={{ p: 0.6 }}>
                    <MoveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}

            <Tooltip title="Compartir nota">
              <IconButton size="small" onClick={handleOpenShareDialog} sx={{ p: 0.6 }}>
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Historial de versiones">
              <IconButton size="small" onClick={() => setHistoryOpen(true)} sx={{ p: 0.6 }}>
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {!isReadOnly && (
              <Tooltip title={note?.favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}>
                <IconButton size="small" onClick={toggleFavorite} sx={{ p: 0.6 }}>
                  {note?.favorite ? (
                    <StarIcon fontSize="small" sx={{ color: '#fbc02d' }} />
                  ) : (
                    <StarBorderIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}

            {!isReadOnly &&
              (note?.deleted ? (
                <Tooltip title="Restaurar nota">
                  <IconButton size="small" onClick={restoreNote} sx={{ p: 0.6, color: 'success.main' }}>
                    <RestoreIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Mover a papelera">
                  <IconButton
                    size="small"
                    onClick={() => {
                      confirm({
                        title: 'Mover a la papelera',
                        message: `¿Mover "${note?.title || 'Sin título'}" a la papelera? Podrás restaurarla más tarde.`,
                        confirmLabel: 'Mover',
                        cancelLabel: 'Cancelar',
                        color: 'error',
                        onConfirm: () => deleteNoteMutation.mutate(),
                      });
                    }}
                    sx={{ p: 0.6, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ))}
          </Box>

          {/* Hidden file inputs + move menu */}
          {!isReadOnly && (
            <>
              <input
                type="file"
                accept="image/*"
                hidden
                ref={coverInputRef}
                onChange={(e) => e.target.files[0] && uploadCoverMutation.mutate(e.target.files[0])}
              />
              <input
                type="file"
                hidden
                ref={fileInputRef}
                onChange={(e) => e.target.files[0] && uploadAttachmentMutation.mutate(e.target.files[0])}
              />
            </>
          )}

          <Menu
            anchorEl={projectMenuAnchor}
            open={Boolean(projectMenuAnchor)}
            onClose={handleMoveNoteClose}
          >
            <MenuItem disabled sx={{ fontWeight: 'bold' }}>
              Mover nota a...
            </MenuItem>
            {projects.map((p) => (
              <MenuItem
                key={p.id}
                selected={p.id === note?.projectId}
                onClick={() => handleMoveToProject(p.id)}
              >
                {p.name}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      {/* Note Content Area */}
      <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 850, width: '100%', mx: 'auto' }}>
        {/* Cover Image Banner */}
        {coverUrl && (
          <Box sx={{ position: 'relative', mb: 3.5 }}>
            <CoverImage
              src={coverUrl}
              alt="Cover"
              sx={{ width: '100%', height: 240, borderRadius: 3.5, boxShadow: 2 }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: 3.5,
                background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.28))',
                pointerEvents: 'none',
              }}
            />
            <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
              <Chip
                label="Portada"
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: 'rgba(15,15,35,0.55)',
                  color: '#fff',
                  backdropFilter: 'blur(6px)',
                }}
              />
            </Box>
            {!isReadOnly && (
              <Box sx={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 0.75 }}>
                <Tooltip title="Cambiar portada">
                  <IconButton
                    size="small"
                    onClick={() => coverInputRef.current?.click()}
                    sx={{
                      bgcolor: 'rgba(15,15,35,0.6)',
                      color: '#fff',
                      backdropFilter: 'blur(6px)',
                      '&:hover': { bgcolor: 'rgba(15,15,35,0.85)' },
                    }}
                  >
                    <AddCoverIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Quitar portada">
                  <IconButton
                    size="small"
                    onClick={() => deleteCoverMutation.mutate()}
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
              </Box>
            )}
          </Box>
        )}

        {/* Title Input */}
        <TextField
          variant="standard"
          placeholder="Título de la nota"
          fullWidth
          value={title}
          onChange={handleTitleChange}
          disabled={isReadOnly}
          InputProps={{
            disableUnderline: true,
            sx: {
              fontSize: { xs: '1.85rem', sm: '2.4rem' },
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              '&::placeholder': { opacity: 0.38 },
            },
          }}
          sx={{ mb: 1.5 }}
        />

        {/* Meta row: tags + members + last editor + date */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            mb: 3,
            pb: 2.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', minWidth: 0 }}>
            {note?.tags?.map((t) => (
              <Chip
                key={t}
                label={t}
                size="small"
                onDelete={isReadOnly ? undefined : () => handleRemoveTag(t)}
                sx={{
                  height: 22,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  opacity: 0.88,
                  '&:hover': { opacity: 1 },
                }}
              />
            ))}
            {!isReadOnly && (
              <TextField
                variant="standard"
                placeholder="+ Etiqueta"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                InputProps={{
                  disableUnderline: true,
                  sx: { fontSize: '0.8rem' },
                }}
                sx={{ minWidth: 110 }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: 'auto', flexShrink: 0 }}>
            <AuthorAvatars
              creator={activeProject?.creator}
              collaborators={activeProject?.collaborators}
              size={20}
              onMemberClick={setProfileMember}
            />
            {lastEditor && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.4, fontSize: '0.7rem' }}
              >
                <EditNoteIcon sx={{ fontSize: 13, opacity: 0.7 }} />
                {lastEditor.name}
              </Typography>
            )}
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
              {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Typography>
            {wordCount > 0 && (
              <Tooltip title="Tiempo de lectura aproximado">
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.4,
                    fontWeight: 600,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    px: 0.9,
                    py: 0.25,
                    borderRadius: '8px',
                  }}
                >
                  {wordCount} palabras · {readingMinutes} min
                </Typography>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* TipTap Formatting Bar */}
        {editor && !isReadOnly && (
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 5,
              p: 0.5,
              mb: 2,
              display: 'flex',
              gap: 0.25,
              flexWrap: 'wrap',
              borderRadius: 2.5,
              bgcolor: 'background.default',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            }}
          >
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleBold().run()}
              color={editor.isActive('bold') ? 'primary' : 'default'}
            >
              <BoldIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              color={editor.isActive('italic') ? 'primary' : 'default'}
            >
              <ItalicIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              color={editor.isActive('strike') ? 'primary' : 'default'}
            >
              <StrikeIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              color={editor.isActive('codeBlock') ? 'primary' : 'default'}
            >
              <CodeIcon fontSize="small" />
            </IconButton>
            <Divider orientation="vertical" flexItem />
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              color={editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'}
            >
              <TitleIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              color={editor.isActive('bulletList') ? 'primary' : 'default'}
            >
              <BulletListIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              color={editor.isActive('orderedList') ? 'primary' : 'default'}
            >
              <NumberedListIcon fontSize="small" />
            </IconButton>
            
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              color={editor.isActive('taskList') ? 'primary' : 'default'}
            >
              <Tooltip title="Lista de Tareas (Checklist)">
                <ChecklistIcon fontSize="small" />
              </Tooltip>
            </IconButton>
            
            <Divider orientation="vertical" flexItem />

            {/* Table Manipulator Menu Button */}
            <IconButton size="small" onClick={handleTableMenuClick}>
              <Tooltip title="Opciones de Tabla">
                <TableIcon fontSize="small" />
              </Tooltip>
            </IconButton>
            
            <Menu
              anchorEl={tableMenuAnchor}
              open={Boolean(tableMenuAnchor)}
              onClose={handleTableMenuClose}
            >
              <MenuItem onClick={handleInsertTable}>Insertar Tabla (3x3)</MenuItem>
              <Divider />
              <MenuItem onClick={handleAddRowBefore}>Añadir Fila Arriba</MenuItem>
              <MenuItem onClick={handleAddRowAfter}>Añadir Fila Abajo</MenuItem>
              <MenuItem onClick={handleAddColumnBefore}>Añadir Columna Izquierda</MenuItem>
              <MenuItem onClick={handleAddColumnAfter}>Añadir Columna Derecha</MenuItem>
              <Divider />
              <MenuItem onClick={handleDeleteRow}>Eliminar Fila</MenuItem>
              <MenuItem onClick={handleDeleteColumn}>Eliminar Columna</MenuItem>
              <MenuItem onClick={handleDeleteTable} sx={{ color: 'error.main' }}>Eliminar Tabla</MenuItem>
            </Menu>

            <Divider orientation="vertical" flexItem />

            {/* Alignment Controls for Images */}
            <IconButton size="small" onClick={() => changeSelectedImageAlignment('left')}>
              <Tooltip title="Alinear Imagen Izquierda">
                <AlignLeftIcon fontSize="small" />
              </Tooltip>
            </IconButton>
            <IconButton size="small" onClick={() => changeSelectedImageAlignment('center')}>
              <Tooltip title="Alinear Imagen Centro">
                <AlignCenterIcon fontSize="small" />
              </Tooltip>
            </IconButton>
            <IconButton size="small" onClick={() => changeSelectedImageAlignment('right')}>
              <Tooltip title="Alinear Imagen Derecha">
                <AlignRightIcon fontSize="small" />
              </Tooltip>
            </IconButton>

            <Divider orientation="vertical" flexItem />

            {/* Inline Image Upload Button */}
            <input
              type="file"
              accept="image/*"
              hidden
              ref={inlineImageInputRef}
              onChange={(e) => e.target.files[0] && uploadInlineImage(e.target.files[0])}
            />
            <Tooltip title="Insertar Imagen Local">
              <IconButton size="small" onClick={() => inlineImageInputRef.current?.click()}>
                <ImageIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem />

            <IconButton size="small" onClick={() => editor.chain().focus().undo().run()}>
              <UndoIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => editor.chain().focus().redo().run()}>
              <RedoIcon fontSize="small" />
            </IconButton>

            {/* Auto-save status (always visible thanks to the sticky bar) */}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', pl: 1 }}>
              <Chip
                size="small"
                label={saveStatus === 'saved' ? 'Guardado' : saveStatus === 'saving' ? 'Guardando...' : 'Sin guardar'}
                color={saveStatus === 'saved' ? 'success' : saveStatus === 'saving' ? 'secondary' : 'warning'}
                variant="outlined"
                sx={{
                  height: 22,
                  fontSize: '0.66rem',
                  '& .MuiChip-label': { px: 1 },
                  animation: saveStatus === 'unsaved' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }}
              />
            </Box>
          </Paper>
        )}

        {/* TipTap Rich Editor */}
        <Box
          sx={{
            minHeight: 400,
            '& .tiptap': {
              outline: 'none',
              minHeight: 400,
              fontSize: '1.05rem',
              lineHeight: 1.75,
              '& p.is-editor-empty:first-of-type::before': {
                color: 'text.disabled',
                content: 'attr(data-placeholder)',
                float: 'left',
                height: 0,
                pointerEvents: 'none',
              },
              '& pre': {
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                padding: 2,
                borderRadius: 2,
                fontFamily: 'monospace',
              },
              // Image alignment classes
              '& img.align-left': {
                float: 'left',
                margin: '12px 16px 12px 0',
                maxWidth: '45%',
                height: 'auto',
                borderRadius: '8px',
                display: 'block',
              },
              '& img.align-center': {
                display: 'block',
                margin: '20px auto',
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
              },
              '& img.align-right': {
                float: 'right',
                margin: '12px 0 12px 16px',
                maxWidth: '45%',
                height: 'auto',
                borderRadius: '8px',
                display: 'block',
              },
              '& img': {
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  outline: '2px solid #0288d1',
                },
              },
              // Table styles
              '& table': {
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                width: '100%',
                margin: '20px 0',
                overflow: 'hidden',
                '& td, & th': {
                  border: '2px solid',
                  borderColor: 'divider',
                  boxSizing: 'border-box',
                  minWidth: '1em',
                  padding: '6px 8px',
                  position: 'relative',
                  verticalAlign: 'top',
                  '& > *': {
                    marginBottom: 0,
                  },
                },
                '& th': {
                  backgroundColor: 'action.hover',
                  fontWeight: 'bold',
                  textAlign: 'left',
                },
              },
              // Checklist styles
              '& ul[data-type="taskList"]': {
                listStyle: 'none',
                padding: 0,
                '& li': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '4px 0',
                  '& > label': {
                    display: 'flex',
                    alignItems: 'center',
                    userSelect: 'none',
                  },
                  '& > div': {
                    flex: '1 1 auto',
                  },
                  '& input[type="checkbox"]': {
                    cursor: 'pointer',
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    accentColor: '#0288d1',
                  },
                },
              },
              // Clean float flows
              '& p, & h1, & h2, & h3, & h4, & h5, & h6': {
                clear: 'both',
              },
            },
          }}
        >
          <EditorContent editor={editor} />
        </Box>

        {/* Attachments & Images Section */}
        {note?.attachments && note.attachments.length > 0 && (
          <Box sx={{ mt: 5 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Imágenes y Archivos Adjuntos ({note.attachments.length})
            </Typography>
            <Stack spacing={1.5}>
              {note.attachments.map((att) => {
                const isImage = att.type?.startsWith('image/');
                const isEditingThis = editingAttachmentId === att.id;

                return (
                  <Paper
                    key={att.id}
                    variant="outlined"
                    sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 3 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                        {isImage ? (
                          <CoverImage
                            src={getAssetUrl(att.url)}
                            alt={att.name}
                            sx={{ width: 44, height: 44, borderRadius: 2 }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: '1.5rem' }}>📎</Typography>
                        )}
                        <Box sx={{ overflow: 'hidden' }}>
                          <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 300 }}>
                            {att.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {att.type}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Tag Input or Chip */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isEditingThis ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TextField
                              size="small"
                              variant="outlined"
                              placeholder="Tag/Etiqueta..."
                              value={attachmentTagValue}
                              onChange={(e) => setAttachmentTagValue(e.target.value)}
                              sx={{
                                '& .MuiOutlinedInput-input': { py: 0.5, px: 1, fontSize: '0.8rem' },
                                width: 120,
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && saveAttachmentTag(att.id)}
                              autoFocus
                            />
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => saveAttachmentTag(att.id)}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {att.tag ? (
                              <Chip
                                label={att.tag}
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={isReadOnly ? undefined : () => startEditTag(att)}
                                sx={{ height: 22, fontSize: '0.75rem' }}
                              />
                            ) : (
                              !isReadOnly && (
                                <Button
                                  size="small"
                                  onClick={() => startEditTag(att)}
                                  startIcon={<EditIcon sx={{ fontSize: 12 }} />}
                                  sx={{ fontSize: '0.7rem', py: 0.2 }}
                                >
                                  Añadir Tag
                                </Button>
                              )
                            )}
                          </Box>
                        )}
                        
                        <Button
                          size="small"
                          component="a"
                          href={getAssetUrl(att.url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Descargar
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Member profile (clicked avatar) */}
      {profileMember && (
        <MemberProfileDialog member={profileMember} onClose={() => setProfileMember(null)} />
      )}

      {/* Note History Dialog */}
      <NoteHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        noteId={currentNoteId}
        members={members}
        canRestore={!isReadOnly}
        onRestoreStart={clearPendingSave}
      />

      {/* Share Note Dialog */}
      <Dialog open={openShareDialog} onClose={() => setOpenShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Compartir Nota Públicamente</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Cualquier persona que reciba este enlace de invitación podrá ver el título, la imagen de portada y el contenido completo de esta nota, sin necesidad de tener una cuenta de usuario.
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={`${window.location.origin}/shared/note/${shareToken}`}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleCopyShareLink}
                  sx={{ ml: 1, minWidth: 100 }}
                >
                  {copySuccess ? 'Copiado!' : 'Copiar'}
                </Button>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenShareDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
