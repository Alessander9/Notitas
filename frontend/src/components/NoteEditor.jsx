import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  IconButton,
  Chip,
  CircularProgress,
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
  ListItemText,
  ListItemIcon,
  Breadcrumbs,
  Link,
  Slider,
  Popover,
  useTheme,
  useMediaQuery,
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
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  FileDownload as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Article as ArticleIcon,
  Html as HtmlIcon,
  TextSnippet as TextSnippetIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  PeopleAlt as PeopleAltIcon,
  ContentCopy as DuplicateIcon,
  FileUpload as ImportFileIcon,
  AlarmAdd as AlarmAddIcon,
  Gesture as DrawIcon,
  Calculate as CalcIcon,
  Slideshow as PresentationIcon,
  AccountTree as MermaidIcon,
  Mic as VoiceIcon,
  SettingsVoice as LiveVoiceIcon,
  FormatLineSpacing as LineSpacingIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import FloatingSelectionToolbar from './FloatingSelectionToolbar';
import WikiLinkMenu from './WikiLinkMenu';
import BacklinksPanel from './BacklinksPanel';
import { mergeAttributes } from '@tiptap/core';
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
import { saveReminder, removeReminder, getReminderForNote } from '../hooks/useNoteReminders';
import { confirm } from '../store/confirmStore';
import { useAuthStore } from '../store/authStore';
import { useProjectNotes } from '../hooks/useProjectNotes';
import NoteEditorSkeleton from './skeletons/NoteEditorSkeleton';
import CoverImage from './CoverImage';
import AuthorAvatars from './AuthorAvatars';
import ActiveEditorsIndicator from './ActiveEditorsIndicator';
import MemberProfileDialog from './MemberProfileDialog';
import FloatingImageNodeView from './FloatingImageNodeView';
import { getAssetUrl } from '../utils/text';
import { compressImage } from '../utils/imageCompression';
import {
  exportNoteAsDocx,
  exportNoteAsMarkdown,
  exportNoteAsPdf,
  exportNoteAsPng,
} from '../utils/exportNote';
import CommentsSection from './CommentsSection';
import EmojiPickerPopover from './EmojiPickerPopover';
import SlashCommandsMenu from './SlashCommandsMenu';
import ZenAmbientSoundPlayer from './ZenAmbientSoundPlayer';
import {
  CenterFocusStrong as ZenIcon,
  Animation as GifIcon,
  EmojiEmotions as EmojiIcon,
  AutoAwesome as TemplateIcon,
  AutoAwesome as SparklesIcon,
  Headphones as AmbientIcon,
} from '@mui/icons-material';

// Modales secundarios cargados bajo demanda para aligerar el árbol principal de renderizado
const CanvasModal = React.lazy(() => import('./CanvasModal'));
const CalculatorModal = React.lazy(() => import('./CalculatorModal'));
const SpeechDictationModal = React.lazy(() => import('./SpeechDictationModal'));
const NoteHistoryDialog = React.lazy(() => import('./NoteHistoryDialog'));
const NoteCollaboratorsDialog = React.lazy(() => import('./NoteCollaboratorsDialog'));
const MediaPickerModal = React.lazy(() => import('./MediaPickerModal'));
const NoteTemplatesDialog = React.lazy(() => import('./NoteTemplatesDialog'));
const PresentationModal = React.lazy(() => import('./PresentationModal'));
const MermaidModal = React.lazy(() => import('./MermaidModal'));
const AudioRecorderModal = React.lazy(() => import('./AudioRecorderModal'));

// Imágenes con posición libre (arrastrar a cualquier punto del lienzo) y
// redimensionables desde la esquina (mantienen proporciones). La posición y
// el tamaño se persisten como atributos del nodo y se serializan a style/data
// en el HTML de la nota.
const CustomImage = Image.extend({
  draggable: false, // el NodeView gestiona el arrastre (evita el drag nativo de ProseMirror)
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
      width: {
        default: null,
        parseHTML: (element) => {
          const v = parseFloat(element.style.width);
          return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
        },
      },
      left: {
        default: null,
        parseHTML: (element) => {
          const v = parseFloat(element.style.left);
          return Number.isFinite(v) ? Math.round(v) : null;
        },
      },
      top: {
        default: null,
        parseHTML: (element) => {
          const v = parseFloat(element.style.top);
          return Number.isFinite(v) ? Math.round(v) : null;
        },
      },
      ratio: {
        default: null,
        parseHTML: (element) => {
          const v = parseFloat(element.dataset.ratio);
          return Number.isFinite(v) && v > 0 ? v : null;
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    // `width` se extrae para que no se serialice además como atributo HTML
    const { width, left, top, ratio, ...rest } = HTMLAttributes;
    const style = [];
    if (width) style.push(`width:${width}px`);
    if (left != null) style.push(`left:${left}px`);
    if (top != null) style.push(`top:${top}px`);

    const attrs = { ...rest };
    if (style.length) attrs.style = style.join(';');
    if (ratio) attrs['data-ratio'] = ratio;
    if (left != null && top != null) attrs['data-notitas-float'] = 'true';
    return ['img', mergeAttributes(attrs)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FloatingImageNodeView);
  },
});

export default function NoteEditor({ noteIdOverride = null } = {}) {
  // Espera a que el usuario termine una ráfaga de escritura antes de enviar
  // otra petición. El guardado pendiente se fuerza al cambiar de nota o salir.
  const AUTOSAVE_DELAY = 2500;
  const { currentNoteId: storeNoteId, setCurrentNote, currentProjectId, setCurrentProject } = useUiStore();
  const currentNoteId = noteIdOverride || storeNoteId;
  const queryClient = useQueryClient();

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('El dictado por voz no está soportado en este navegador. Usa Chrome, Edge o Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('Dictado activo. Empieza a hablar...');
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast.error(`Error en dictado: ${event.error}`);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript;
        if (editor && transcript) {
          editor.chain().focus().insertContent(transcript + ' ').run();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  // Limpiar recurso al desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const [title, setTitle] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const [shareToken, setShareToken] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
   const [copyJoinSuccess, setCopyJoinSuccess] = useState(false);
   const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
   const saveStatusRef = useRef(saveStatus);
   saveStatusRef.current = saveStatus;
   const [historyOpen, setHistoryOpen] = useState(false);
   const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
   const [exporting, setExporting] = useState(null); // formato en curso: 'pdf' | 'png' | 'docx' | 'md'
   const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [wikiOpen, setWikiOpen] = useState(false);
  const [wikiQuery, setWikiQuery] = useState('');
  const [mentionTrigger, setMentionTrigger] = useState('@');
  const [wikiMenuPos, setWikiMenuPos] = useState({ top: 0, left: 0 });

  // Notas de todos los proyectos del usuario para autocompletar menciones (@)
  const { data: allUserNotes = [] } = useQuery({
    queryKey: ['all-user-notes-mention'],
    queryFn: async () => {
      const res = await api.get('/notes/search?size=300');
      return res.data?.content || [];
    },
    staleTime: 30000,
  });

  const { data: userProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/projects')).data,
    staleTime: 60000,
  });
  const [canvasModalOpen, setCanvasModalOpen] = useState(false);
  const [calculatorModalOpen, setCalculatorModalOpen] = useState(false);
  const [presentationModalOpen, setPresentationModalOpen] = useState(false);
  const [mermaidModalOpen, setMermaidModalOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [dictationModalOpen, setDictationModalOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileToolsAnchor, setMobileToolsAnchor] = useState(null);

  // Menu state for moving note to project
  const [projectMenuAnchor, setProjectMenuAnchor] = useState(null);

  // Menu state for table operations
  const [tableMenuAnchor, setTableMenuAnchor] = useState(null);

  // States for editing attachment tags
  const [editingAttachmentId, setEditingAttachmentId] = useState(null);
  const [attachmentTagValue, setAttachmentTagValue] = useState('');

  // Member whose profile is open (clicked avatar)
  const [profileMember, setProfileMember] = useState(null);

  // Modal para selección de GIFs animados (GIPHY) / Gradientes / Portadas
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState('cover'); // 'cover' | 'inline'
  const [mediaPickerTab, setMediaPickerTab] = useState('gifs');

  // Estados de Emoji Picker, Plantillas, Slash Commands, Modo Zen y Asistente IA
  const { zenMode, toggleZenMode, toggleAiDrawer, editorLineHeight, setEditorLineHeight } = useUiStore();
  const [lineSpacingAnchor, setLineSpacingAnchor] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [ambientAnchor, setAmbientAnchor] = useState(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashPosition, setSlashPosition] = useState(null);

  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const inlineImageInputRef = useRef(null);
  const importFileInputRef = useRef(null);

  // Estados de Protección de Notas con PIN
  const [unlockedNotes, setUnlockedNotes] = useState(() => new Set());
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState('unlock'); // 'unlock' | 'set' | 'remove'
  const [pinInputValue, setPinInputValue] = useState('');
  const [pinPending, setPinPending] = useState(false);

  const handleUnlockNote = async (e) => {
    e?.preventDefault();
    if (!pinInputValue.trim()) return;
    setPinPending(true);
    try {
      const res = await api.post(`/notes/${currentNoteId}/verify-pin`, { pin: pinInputValue });
      if (res.data?.verified) {
        setUnlockedNotes((prev) => new Set([...prev, currentNoteId]));
        setPinModalOpen(false);
        setPinInputValue('');
        toast.success('Nota desbloqueada');
      } else {
        toast.error('PIN incorrecto');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'PIN incorrecto');
    } finally {
      setPinPending(false);
    }
  };

  const handleSavePin = async (e) => {
    e?.preventDefault();
    if (!pinInputValue.trim() || pinInputValue.length < 4) {
      toast.error('El PIN debe tener al menos 4 dígitos');
      return;
    }
    setPinPending(true);
    try {
      const res = await api.post(`/notes/${currentNoteId}/pin`, { pin: pinInputValue });
      queryClient.setQueryData(['note', currentNoteId], res.data);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setUnlockedNotes((prev) => new Set([...prev, currentNoteId]));
      setPinModalOpen(false);
      setPinInputValue('');
      toast.success('Nota protegida con PIN');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar el PIN');
    } finally {
      setPinPending(false);
    }
  };

  const handleRemovePin = async (e) => {
    e?.preventDefault();
    setPinPending(true);
    try {
      const res = await api.delete(`/notes/${currentNoteId}/pin`, { data: { pin: pinInputValue } });
      queryClient.setQueryData(['note', currentNoteId], res.data);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setPinModalOpen(false);
      setPinInputValue('');
      toast.success('Protección por PIN removida');
    } catch (err) {
      toast.error(err.response?.data?.message || 'PIN incorrecto');
    } finally {
      setPinPending(false);
    }
  };

  const updateIconMutation = useMutation({
    mutationFn: async (newIcon) => {
      const res = await api.put(`/notes/${currentNoteId}`, { icon: newIcon });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['note', currentNoteId], data);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success(data.icon ? 'Icono actualizado' : 'Icono removido');
    },
    onError: () => toast.error('No se pudo actualizar el icono'),
  });

  const handleSelectEmoji = (emoji) => {
    updateIconMutation.mutate(emoji);
  };

  const handleSelectTemplate = (template) => {
    if (!editor || isReadOnly) return;
    const newTitle = title.trim() ? title : template.title;
    setTitle(newTitle);
    editor.commands.setContent(template.content);
    scheduleSave(newTitle, template.content);
    if (template.icon && !note?.icon) {
      updateIconMutation.mutate(template.icon);
    }
    toast.success(`Plantilla "${template.title}" aplicada`);
  };

  const handleEditorFileDrop = (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result || '';
          if (editor) {
            const formatted = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');
            editor.commands.setContent(`<p>${formatted}</p>`);
            scheduleSave(title || file.name.replace(/\.[^/.]+$/, ''), `<p>${formatted}</p>`);
            toast.success(`Archivo "${file.name}" importado con éxito`);
          }
        };
        reader.readAsText(file);
      }
    }
  };

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/notes/${currentNoteId}/duplicate`);
      return res.data;
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setCurrentNote(newNote.id);
      toast.success('Nota duplicada con éxito');
    },
    onError: () => toast.error('No se pudo duplicar la nota'),
  });

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || isReadOnly) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      if (editor) {
        const formatted = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');
        editor.commands.setContent(`<p>${formatted}</p>`);
        scheduleSave(title || file.name.replace(/\.[^/.]+$/, ''), `<p>${formatted}</p>`);
        toast.success(`Archivo "${file.name}" importado con éxito`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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

  const isNoteLocked = Boolean(note?.hasPin && !unlockedNotes.has(currentNoteId));

  // Fetch Projects List (to resolve roles and move notes to)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
  });

  // Fetch all notes in the current project to build tag autocomplete options & backlinks
  const { notes = [] } = useProjectNotes(
    typeof currentProjectId === 'number' ? currentProjectId : null,
    Boolean(currentProjectId && typeof currentProjectId === 'number')
  );
  const projectTags = React.useMemo(
    () => [...new Set((Array.isArray(notes) ? notes : []).flatMap((n) => n.tags || []))].sort(),
    [notes],
  );

  const activeProject = projects.find((p) => p.id === note?.projectId);
  const userRole = activeProject?.currentUserRole || 'OWNER'; // Default to OWNER
  // Rol del usuario actual como colaborador por-nota: un NoteMember EDITOR
  // puede editar aunque su rol de proyecto sea VIEWER (no es miembro del
  // proyecto). Un NoteMember VIEWER es de solo lectura.
  const currentUserId = useAuthStore((s) => s.user?.id);
  const myNoteRole = note?.noteMembers?.find((nm) => nm.userId === currentUserId)?.role;
  const isReadOnly = userRole === 'VIEWER' && myNoteRole !== 'EDITOR';
  const isCreator = userRole === 'OWNER';
  // TipTap conserva sus callbacks entre renders. Mantener estos valores en refs
  // evita que onUpdate use el currentNoteId/isReadOnly del primer render.
  const currentNoteIdRef = useRef(currentNoteId);
  const isReadOnlyRef = useRef(isReadOnly);
  const scheduleSaveRef = useRef(() => {});
  currentNoteIdRef.current = currentNoteId;
  isReadOnlyRef.current = isReadOnly;

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
    await flushPendingSave();
    try {
      const optimizedFile = await compressImage(file);
      const formData = new FormData();
      formData.append('file', optimizedFile);
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

  // Expande el alto del lienzo del editor para que las imágenes flotantes
  // colocadas bajo el texto no queden cortadas al hacer scroll.
  const updateCanvasHeight = (ed) => {
    if (!ed?.view?.dom) return;
    const dom = ed.view.dom;
    let maxBottom = 400;
    ed.state.doc.descendants((node) => {
      if (node.type.name === 'image' && node.attrs.left != null && node.attrs.top != null) {
        const w = node.attrs.width || 300;
        const r = node.attrs.ratio || 0.66;
        maxBottom = Math.max(maxBottom, (node.attrs.top || 0) + w * r + 48);
      }
    });
    // Se recalcula siempre (también puede encoger al borrar imágenes)
    dom.style.minHeight = `${Math.ceil(maxBottom)}px`;
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

          const docFile = files.find((file) => file.name.endsWith('.md') || file.name.endsWith('.txt'));
          if (docFile) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const text = e.target?.result || '';
              if (editor) {
                const formatted = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');
                editor.commands.insertContent(`<p>${formatted}</p>`);
                toast.success(`Contenido de "${docFile.name}" insertado`);
              }
            };
            reader.readAsText(docFile);
            return true;
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!isReadOnlyRef.current) {
        contentRef.current = ed.getHTML();
        scheduleSaveRef.current(titleRef.current, ed.getHTML());

        // Detección diferida de slash commands y wikilinks para no bloquear el tipeo a 60fps
        window.requestAnimationFrame(() => {
          try {
            if (!ed || ed.isDestroyed) return;
            const { selection } = ed.state;
            const { $from } = selection;
            const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, '\uFFFC');
            const slashMatch = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/);
            if (slashMatch) {
              setSlashQuery(slashMatch[0].trim());
              setSlashOpen(true);
              const coords = ed.view.coordsAtPos($from.pos);
              setSlashPosition({ x: coords.left, y: coords.bottom });
            } else {
              setSlashOpen(false);
            }

            // Detección de menciones @ o enlaces wiki [[
            const mentionMatch = textBefore.match(/(?:^|\s)@([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]*)$/);
            const wikiMatch = textBefore.match(/\[\[([^\]]*)$/);

            if (mentionMatch) {
              setMentionTrigger('@');
              setWikiQuery(mentionMatch[1] || '');
              setWikiOpen(true);
              try {
                const coords = ed.view.coordsAtPos($from.pos);
                setWikiMenuPos({ top: coords.bottom + 8, left: coords.left });
              } catch {}
            } else if (wikiMatch) {
              setMentionTrigger('[[');
              setWikiQuery(wikiMatch[1] || '');
              setWikiOpen(true);
              try {
                const coords = ed.view.coordsAtPos($from.pos);
                setWikiMenuPos({ top: coords.bottom + 8, left: coords.left });
              } catch {}
            } else if (wikiOpen) {
              setWikiOpen(false);
            }
          } catch {
            setSlashOpen(false);
            setWikiOpen(false);
          }
        });
      }
    },
    // Mantiene el lienzo a la altura de las imágenes flotantes
    onTransaction: ({ editor: ed }) => {
      updateCanvasHeight(ed);
    },
  });

  // Escuchar inserciones automáticas generadas por CleoBot
  useEffect(() => {
    const handleAiInsert = (e) => {
      const { content, mode = 'insert' } = e.detail || {};
      if (!editor || !content || isReadOnlyRef.current) return;

      if (mode === 'replace') {
        editor.commands.setContent(content);
        scheduleSaveRef.current(titleRef.current, content);
      } else if (mode === 'append') {
        const isDocEmpty = editor.isEmpty;
        if (isDocEmpty) {
          editor.chain().focus('end').insertContent(content).run();
        } else {
          editor.chain().focus('end').insertContent(`<p></p>${content}`).run();
        }
      } else {
        editor.chain().focus().insertContent(content).run();
      }
    };
    window.addEventListener('notitas-ai-insert', handleAiInsert);
    return () => window.removeEventListener('notitas-ai-insert', handleAiInsert);
  }, [editor]);

  // Update title and editor content when note changes. El segundo argumento
  // (emitUpdate = false) evita que al cargar/restaurar una nota se dispare el
  // auto-guardado, lo que crearía versiones duplicadas en el historial.
  // Update title and editor content when note changes. El segundo argumento
  // (emitUpdate = false) evita que al cargar/restaurar una nota se dispare el
  // auto-guardado, lo que crearía versiones duplicadas en el historial.
  useEffect(() => {
    if (note) {
      const hasLocalChanges = Boolean(
        pendingSaveRef.current || saveStatusRef.current === 'unsaved' || saveStatusRef.current === 'saving'
      );
      const incomingTitle = note.title || '';
      if (!hasLocalChanges && incomingTitle !== titleRef.current && incomingTitle !== lastSavedTitleRef.current) {
        setTitle(incomingTitle);
        lastSavedTitleRef.current = incomingTitle;
      }
      if (editor) {
        const currentHTML = editor.getHTML();
        const incomingContent = note.content || '';
        if (!hasLocalChanges && incomingContent !== currentHTML && incomingContent !== lastSavedContentRef.current) {
          editor.commands.setContent(incomingContent, false);
          lastSavedContentRef.current = incomingContent;
        }

        // No reemplazar las refs locales mientras existe texto pendiente o un
        // guardado en curso. Un refetch de React Query puede llegar en mitad
        // de la escritura y, si sobrescribe estas refs, el siguiente save
        // enviaría contenido antiguo y perdería caracteres.
        if (!hasLocalChanges) {
          titleRef.current = incomingTitle;
          contentRef.current = incomingContent;
        }
      } else if (!hasLocalChanges) {
        titleRef.current = incomingTitle;
        contentRef.current = incomingContent;
      }
      updateCanvasHeight(editor);
    }
  }, [note, editor]);

  // Set editor read-only state dynamically. `false` evita que setEditable
  // emita un evento 'update' al montar (emitUpdate por defecto en TipTap), lo
  // que dispararía onUpdate con contenido vacío y guardaría/borraría la nota.
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly, false);
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
  const lastSavedContentRef = useRef('');
  const lastSavedTitleRef = useRef('');
  const saveTimeoutRef = useRef(null);
  const saveRevisionRef = useRef(0);
  const saveQueueRef = useRef(Promise.resolve());
  const pendingSaveRef = useRef(null);

  const clearPendingSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  };
  const clearPendingSaveRef = useRef(clearPendingSave);
  clearPendingSaveRef.current = clearPendingSave;

  const scheduleSave = (titleValue, contentValue) => {
    if (!currentNoteIdRef.current || isReadOnlyRef.current) return;
    const revision = ++saveRevisionRef.current;
    const noteId = currentNoteIdRef.current;
    pendingSaveRef.current = { noteId, title: titleValue, content: contentValue, revision };
    setSaveStatus('unsaved');
    clearPendingSave();
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saving');
      lastSavedContentRef.current = contentValue;
      lastSavedTitleRef.current = titleValue;
      const save = () => updateNoteMutation.mutateAsync({
        noteId,
        title: titleValue,
        content: contentValue,
        revision,
      });
      // Serializar peticiones evita que una respuesta lenta anterior llegue
      // después y deje el contenido persistido en un estado antiguo.
      saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(save);
      pendingSaveRef.current = null;
    }, AUTOSAVE_DELAY);
  };
  scheduleSaveRef.current = scheduleSave;

  const flushPendingSave = () => {
    const pending = pendingSaveRef.current;
    if (pending) {
      clearPendingSave();
      lastSavedContentRef.current = pending.content;
      lastSavedTitleRef.current = pending.title;
      setSaveStatus('saving');
      saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(() =>
        updateNoteMutation.mutateAsync(pending)
      );
      pendingSaveRef.current = null;
    }
    return saveQueueRef.current;
  };
  const flushPendingSaveRef = useRef(flushPendingSave);
  flushPendingSaveRef.current = flushPendingSave;

  const handleTitleChange = (e) => {
    if (isReadOnly) return;
    const newTitle = e.target.value;
    setTitle(newTitle);
    titleRef.current = newTitle;
    scheduleSave(newTitle, editor ? editor.getHTML() : contentRef.current);
  };

  // No perder los últimos caracteres al cambiar de nota o desmontar el editor.
  React.useEffect(() => () => flushPendingSaveRef.current(), []);

  // Al cambiar de nota se cancelan los guardados pendientes de la nota anterior.
  // Los refs de "último guardado" se invalidan con null (no con '') para que la
  // nota entrante SIEMPRE se sincronice, incluso si llega vacía: con '' el guard
  // `incoming !== lastSaved` ('' !== '') bloqueaba limpiar el editor y se seguía
  // viendo el contenido de la nota anterior.
  // El saveStatus se restaura a 'saved': si había un guardado en vuelo de la nota
  // anterior, flushPendingSave lo deja en 'saving' y el onSuccess lo descarta
  // (por el guard de noteId), quedando el estado 'saving' para siempre y
  // bloqueando la sincronización de la nueva nota.
  React.useEffect(() => {
    flushPendingSaveRef.current();
    clearPendingSaveRef.current();
    lastSavedContentRef.current = null;
    lastSavedTitleRef.current = null;
    setSaveStatus('saved');
  }, [currentNoteId]);

  // Advertencia antes de salir si hay cambios sin guardar o guardados en curso
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveStatus]);

  // Update Note Mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (payload) => {
      const { noteId = currentNoteIdRef.current, revision: _revision, ...notePayload } = payload;
      const res = await api.put(`/notes/${noteId}`, notePayload);
      return res.data;
    },
    onSuccess: (data, variables) => {
      // Una respuesta vieja no puede sobrescribir el resultado de una edición
      // más reciente si las peticiones se cruzan en la red.
      if (variables.revision != null &&
          (variables.noteId !== currentNoteIdRef.current || variables.revision !== saveRevisionRef.current)) return;
      lastSavedContentRef.current = data.content || '';
      lastSavedTitleRef.current = data.title || '';
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
      // No refetch de ['note', id] aquí: mientras el usuario escribe, una
      // respuesta vieja del servidor puede hidratar TipTap y borrar caracteres.
      // Actualizamos la caché con la respuesta más reciente sin desmontar el
      // contenido local del editor.
      queryClient.setQueryData(['note', variables.noteId || currentNoteIdRef.current], data);
      if (data.projectId && currentProjectId !== data.projectId && currentProjectId !== 'favorites' && currentProjectId !== 'trash') {
        setCurrentProject(data.projectId);
      }
      // If restoring from trash, navigate to the note's project
      if (currentProjectId === 'trash' && data.deleted === false && data.projectId) {
        setCurrentProject(data.projectId);
      }
      if (variables.revision != null) setSaveStatus('saved');
    },
    onError: (error, variables) => {
      console.error('Error auto-saving note:', error);
      if (!variables?.noteId || variables.noteId === currentNoteIdRef.current) {
        setSaveStatus('error');
      }
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
  const toggleFavorite = async () => {
    if (!note || isReadOnly) return;
    try {
      await flushPendingSave();
      updateNoteMutation.mutate({ noteId: currentNoteIdRef.current, favorite: !note.favorite });
    } catch (error) {
      console.error('Error saving note before favorite update:', error);
      toast.error('No se pudo guardar la nota antes de actualizarla.');
    }
  };

  // Move to Trash / Restore / Delete Permanently
  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/notes/${currentNoteId}`);
    },
    onSuccess: () => {
      const deletedNoteId = currentNoteId;
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'trash'] });
      setCurrentNote(null);
      toast.success('Nota movida a la papelera', {
        duration: 6000,
        action: {
          label: 'Deshacer',
          onClick: () => {
            api
              .put(`/notes/${deletedNoteId}`, { deleted: false })
              .then(() => queryClient.invalidateQueries({ queryKey: ['notes'] }))
              .catch(() => {});
          },
        },
      });
    },
    onError: () => toast.error('No se pudo eliminar la nota'),
  });

  const updateAttachmentTag = async (payload) => {
    try {
      await flushPendingSave();
      updateAttachmentTagMutation.mutate(payload);
    } catch (error) {
      console.error('Error saving note before attachment update:', error);
      toast.error('No se pudo guardar la nota antes de actualizar el adjunto.');
    }
  };

  const deleteNote = async () => {
    if (!note || isReadOnly) return;
    try {
      await flushPendingSave();
      deleteNoteMutation.mutate();
    } catch (error) {
      console.error('Error saving note before delete:', error);
      toast.error('No se pudo guardar la nota antes de enviarla a la papelera.');
    }
  };

  const restoreNote = async () => {
    if (!note || isReadOnly) return;
    try {
      await flushPendingSave();
      updateNoteMutation.mutate(
        { noteId: currentNoteIdRef.current, deleted: false },
        {
          onSuccess: () => toast.success('Nota restaurada'),
          onError: () => toast.error('No se pudo restaurar la nota'),
        }
      );
    } catch (error) {
      console.error('Error saving note before restore:', error);
      toast.error('No se pudo guardar la nota antes de restaurarla.');
    }
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
      const optimizedFile = await compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85 });
      const formData = new FormData();
      formData.append('file', optimizedFile);
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

  // Set Cover Image from GIF or external URL
  const setCoverUrlMutation = useMutation({
    mutationFn: async (url) => {
      const res = await api.put(`/notes/${currentNoteId}`, { coverImage: url });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['note', currentNoteId], data);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Portada actualizada');
    },
    onError: () => toast.error('No se pudo actualizar la portada'),
  });

  const handleSelectMedia = (url) => {
    if (mediaPickerTarget === 'cover') {
      setCoverUrlMutation.mutate(url);
    } else if (mediaPickerTarget === 'inline' && editor) {
      editor.chain().focus().setImage({ src: url, alignment: 'center' }).run();
    }
  };

  const handleUploadFromPicker = (file) => {
    if (mediaPickerTarget === 'cover') {
      uploadCoverMutation.mutate(file);
    } else if (mediaPickerTarget === 'inline') {
      uploadInlineImage(file);
    }
  };

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
  const handleOpenShareDialog = () => {
    setShareToken(note?.shareToken || '');
    setCopySuccess(false);
    setCopyJoinSuccess(false);
    setOpenShareDialog(true);
  };

  const handleActivateShare = async () => {
    flushPendingSave();
    try {
      const res = await api.post(`/notes/${currentNoteId}/share-token`);
      setShareToken(res.data.shareToken);
      queryClient.invalidateQueries({ queryKey: ['note', currentNoteId] });
      toast.success('Compartido activado con éxito.');
    } catch (e) {
      console.error('Error activating share', e);
      toast.error('Error al activar el compartido.');
    }
  };

  const handleRevokeShare = async () => {
    flushPendingSave();
    try {
      await api.delete(`/notes/${currentNoteId}/share-token`);
      setShareToken('');
      queryClient.invalidateQueries({ queryKey: ['note', currentNoteId] });
      toast.success('Compartido desactivado y enlaces revocados.');
    } catch (e) {
      console.error('Error revoking share', e);
      toast.error('Error al desactivar el compartido.');
    }
  };

  const handleCopyShareLink = () => {
    const fullLink = `${window.location.origin}/shared/note/${shareToken}`;
    navigator.clipboard.writeText(fullLink);
    setCopySuccess(true);
    toast.success('Enlace de lectura copiado');
  };

  const handleCopyJoinLink = () => {
    const fullLink = `${window.location.origin}/join/note/${shareToken}`;
    navigator.clipboard.writeText(fullLink);
    setCopyJoinSuccess(true);
    toast.success('Enlace de invitación a colaborar copiado');
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

  const handleAddTagValue = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed || isReadOnly) return;
    const currentTags = note?.tags || [];
    if (!currentTags.includes(trimmed)) {
      updateNoteMutation.mutate({ tags: [...currentTags, trimmed] });
    }
    setTagInput('');
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
    updateAttachmentTag({ attachmentId, tag: attachmentTagValue });
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
      // Alinear devuelve la imagen al flujo del texto (limpia la posición libre)
      editor.chain().focus().updateAttributes('image', { alignment, left: null, top: null }).run();
    }
  };

  const exportAsTxt = () => {
    setExportMenuAnchor(null);
    const textContent = `${title || 'Sin título'}\n\n${editor ? editor.getText() : ''}`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title || 'nota'}.txt`;
    link.click();
    toast.success('Nota exportada a TXT');
  };

  const exportAsHtml = () => {
    setExportMenuAnchor(null);
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title || 'Nota'}</title></head><body><h1>${title || ''}</h1>${editor ? editor.getHTML() : ''}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title || 'nota'}.html`;
    link.click();
    toast.success('Nota exportada a HTML (Word)');
  };

  // Archivar / desarchivar nota: oculta la nota de las listas activas sin
  // borrarla (vista "Archivadas" en el sidebar). No crea versión en el historial.
  const handleToggleArchive = () => {
    if (!note || isReadOnly) return;
    const wasArchived = note.archived;
    updateNoteMutation.mutate(
      { archived: !wasArchived },
      {
        onSuccess: () => {
          if (!wasArchived) {
            // Al archivar se vuelve a la lista (la nota deja de verse en el proyecto)
            setCurrentNote(null);
            toast.success('Nota archivada', {
              duration: 6000,
              action: {
                label: 'Deshacer',
                onClick: () => {
                  api
                    .put(`/notes/${note.id}`, { archived: false })
                    .then(() => queryClient.invalidateQueries({ queryKey: ['notes'] }))
                    .catch(() => {});
                },
              },
            });
          } else {
            toast.success('Nota restaurada de archivadas');
          }
        },
      }
    );
  };

  // Exportación a archivo: PDF, PNG, Word (.docx) y Markdown (.md). Las
  // librerías pesadas se cargan bajo demanda la primera vez que se usan.
  const handleExport = (format) => async () => {
    setExportMenuAnchor(null);
    if (!editor) return;
    const coverUrl = note?.coverImage ? getAssetUrl(note.coverImage) : null;
    const payload = { title: title || 'Sin título', html: editor.getHTML(), coverUrl };
    try {
      setExporting(format);
      if (format === 'pdf') {
        await exportNoteAsPdf(payload);
        toast.success('Nota exportada a PDF');
      } else if (format === 'png') {
        await exportNoteAsPng(payload);
        toast.success('Nota exportada a imagen PNG');
      } else if (format === 'docx') {
        await exportNoteAsDocx(payload);
        toast.success('Nota exportada a Word (.docx)');
      } else if (format === 'md') {
        await exportNoteAsMarkdown(payload);
        toast.success('Nota exportada a Markdown (.md)');
      }
    } catch (e) {
      console.error('Error exportando la nota:', e);
      toast.error('No se pudo exportar la nota. Inténtalo de nuevo.');
    } finally {
      setExporting(null);
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

  const showSkeleton = isLoading || !editor;
  if (showSkeleton) {
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexGrow: 1 }}>
          <Tooltip title="Volver a la lista de notas">
            <IconButton
              size="small"
              onClick={() => setCurrentNote(null)}
              sx={{
                p: { xs: 0.6, sm: 0.8 },
                borderRadius: 2,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ArrowBackIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
            </IconButton>
          </Tooltip>

          <Breadcrumbs
            separator="›"
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              minWidth: 0,
              overflow: 'hidden',
              '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap', overflow: 'hidden' },
              '& .MuiBreadcrumbs-li': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            }}
          >
            <Link
              component="button"
              variant="body2"
              onClick={() => { setCurrentProject(null); setCurrentNote(null); }}
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
                display: { xs: 'none', sm: 'inline-block' },
                fontSize: '0.75rem',
              }}
            >
              Proyectos
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => setCurrentNote(null)}
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
                maxWidth: { xs: 110, sm: 180 },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
              }}
            >
              {currentProjectName}
            </Link>
            <Typography
              variant="body2"
              color="text.primary"
              fontWeight={600}
              noWrap
              sx={{ maxWidth: { xs: 120, sm: 220 }, fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
            >
              {note?.title || 'Sin título'}
            </Typography>
          </Breadcrumbs>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {isReadOnly && (
            <Chip
              icon={<LockIcon sx={{ fontSize: '0.85rem' }} />}
              label="Sólo Lectura"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ mr: 0.5, height: 22, fontSize: '0.7rem' }}
            />
          )}

          {/* Desktop Toolbar (md+) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
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

            {note?.shareToken && (
              <Tooltip title={isCreator ? 'Gestionar colaboradores' : 'Ver colaboradores de la nota'}>
                <IconButton size="small" onClick={() => setCollaboratorsOpen(true)} sx={{ p: 0.6 }}>
                  <PeopleAltIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

             <Tooltip title="Historial de versiones">
              <IconButton size="small" onClick={() => setHistoryOpen(true)} sx={{ p: 0.6 }}>
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Pizarra de dibujo / Diagrama (/canvas)">
              <IconButton
                size="small"
                onClick={() => setCanvasModalOpen(true)}
                disabled={isReadOnly}
                sx={{ p: 0.6, color: 'info.main' }}
              >
                <DrawIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Calculadora integrada (/calc)">
              <IconButton
                size="small"
                onClick={() => setCalculatorModalOpen(true)}
                disabled={isReadOnly}
                sx={{ p: 0.6, color: 'success.main' }}
              >
                <CalcIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Diagrama Mermaid.js (/mermaid)">
              <IconButton
                size="small"
                onClick={() => setMermaidModalOpen(true)}
                disabled={isReadOnly}
                sx={{ p: 0.6, color: '#845EC2' }}
              >
                <MermaidIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Dictado por voz en vivo (/dictado)">
              <IconButton
                size="small"
                onClick={() => setDictationModalOpen(true)}
                disabled={isReadOnly}
                sx={{ p: 0.6, color: '#0ea5e9' }}
              >
                <LiveVoiceIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Nota de voz / Audio (/audio)">
              <IconButton
                size="small"
                onClick={() => setAudioModalOpen(true)}
                disabled={isReadOnly}
                sx={{ p: 0.6, color: '#e11d48' }}
              >
                <VoiceIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Modo Presentación / Diapositivas (/slides)">
              <IconButton
                size="small"
                onClick={() => setPresentationModalOpen(true)}
                sx={{ p: 0.6, color: '#0284c7' }}
              >
                <PresentationIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={getReminderForNote(currentNoteId) ? `Recordatorio: ${new Date(getReminderForNote(currentNoteId).remindAt).toLocaleString()}` : 'Agregar recordatorio'}>
              <IconButton
                size="small"
                onClick={() => setReminderDialogOpen(true)}
                sx={{ p: 0.6, color: getReminderForNote(currentNoteId) ? 'warning.main' : 'inherit' }}
              >
                <AlarmAddIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Duplicar nota">
              <IconButton
                size="small"
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
                sx={{ p: 0.6 }}
              >
                {duplicateMutation.isPending ? (
                  <CircularProgress size={15} thickness={5} />
                ) : (
                  <DuplicateIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="Exportar o importar nota">
              <IconButton
                size="small"
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                disabled={Boolean(exporting)}
                sx={{ p: 0.6 }}
              >
                {exporting ? (
                  <CircularProgress size={15} thickness={5} />
                ) : (
                  <DownloadIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="Sonidos de concentración (Lluvia, Olas, Café...)">
              <IconButton
                size="small"
                onClick={(e) => setAmbientAnchor(e.currentTarget)}
                sx={{ p: 0.6, color: ambientAnchor ? 'primary.main' : 'inherit' }}
              >
                <AmbientIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={zenMode ? 'Salir de Modo Zen (Esc)' : 'Modo Concentración (Ctrl+Shift+F)'}>
              <IconButton
                size="small"
                onClick={toggleZenMode}
                sx={{ p: 0.6, color: zenMode ? 'primary.main' : 'inherit' }}
              >
                <ZenIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {!isReadOnly && (
              <Tooltip title={note?.archived ? 'Restaurar de archivadas' : 'Archivar nota'}>
                <IconButton size="small" onClick={handleToggleArchive} sx={{ p: 0.6 }}>
                  {note?.archived ? (
                    <UnarchiveIcon fontSize="small" />
                  ) : (
                    <ArchiveIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}

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
                         onConfirm: deleteNote,
                      });
                    }}
                    sx={{ p: 0.6, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ))}
          </Box>

          {/* Mobile Toolbar (< md): Sleek 3-button compact bar */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.5 }}>
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

            <Tooltip title="Compartir nota">
              <IconButton size="small" onClick={handleOpenShareDialog} sx={{ p: 0.6 }}>
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Herramientas y opciones">
              <IconButton
                size="small"
                onClick={(e) => setMobileToolsAnchor(e.currentTarget)}
                sx={{
                  p: 0.6,
                  bgcolor: mobileToolsAnchor ? 'action.selected' : 'action.hover',
                  borderRadius: 2,
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Mobile Tools Menu */}
            <Menu
              anchorEl={mobileToolsAnchor}
              open={Boolean(mobileToolsAnchor)}
              onClose={() => setMobileToolsAnchor(null)}
              PaperProps={{
                sx: {
                  mt: 1,
                  width: 290,
                  maxWidth: 'calc(100vw - 32px)',
                  maxHeight: 'calc(100vh - 120px)',
                  borderRadius: 3,
                  boxShadow: '0 16px 36px rgba(0,0,0,0.25)',
                  p: 0.5,
                },
              }}
            >
              <Typography variant="overline" sx={{ px: 2, py: 0.4, fontWeight: 800, color: 'text.secondary', display: 'block', fontSize: '0.65rem' }}>
                Edición y Estructura
              </Typography>

              {!isReadOnly && (
                <MenuItem
                  onClick={() => {
                    setMobileToolsAnchor(null);
                    setMediaPickerTarget('cover');
                    setMediaPickerTab('gifs');
                    setMediaPickerOpen(true);
                  }}
                  sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
                >
                  <AddCoverIcon sx={{ fontSize: 19, color: 'primary.main' }} />
                  <ListItemText
                    primary={coverUrl ? 'Cambiar portada' : 'Agregar portada'}
                    secondary="GIF animado o fondo HD"
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </MenuItem>
              )}

              {!isReadOnly && (
                <MenuItem
                  onClick={(e) => {
                    setMobileToolsAnchor(null);
                    setEmojiAnchor(e.currentTarget);
                  }}
                  sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
                >
                  <EmojiIcon sx={{ fontSize: 19, color: '#f59e0b' }} />
                  <ListItemText
                    primary="Icono / Emoji"
                    secondary={note?.icon ? `Actual: ${note.icon}` : 'Personalizar icono'}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </MenuItem>
              )}

              {!isReadOnly && (
                <MenuItem
                  onClick={() => {
                    setMobileToolsAnchor(null);
                    setTemplatesOpen(true);
                  }}
                  sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
                >
                  <TemplateIcon sx={{ fontSize: 19, color: '#f39c12' }} />
                  <ListItemText
                    primary="Plantillas de notas"
                    secondary="15 plantillas disponibles"
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  setMobileToolsAnchor(null);
                  toggleAiDrawer();
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <SparklesIcon sx={{ fontSize: 19, color: '#845EC2' }} />
                <ListItemText
                  primary="Asistente IA CleoBot"
                  secondary="Resumir, redactar y consultar"
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </MenuItem>

              <Divider sx={{ my: 0.5 }} />
              <Typography variant="overline" sx={{ px: 2, py: 0.4, fontWeight: 800, color: 'text.secondary', display: 'block', fontSize: '0.65rem' }}>
                Herramientas Creativas
              </Typography>

              <MenuItem
                disabled={isReadOnly}
                onClick={() => {
                  setMobileToolsAnchor(null);
                  setCanvasModalOpen(true);
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <DrawIcon sx={{ fontSize: 19, color: 'info.main' }} />
                <ListItemText primary="Pizarra de dibujo" secondary="Dibujar a mano (/canvas)" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <MenuItem
                disabled={isReadOnly}
                onClick={() => {
                  setMobileToolsAnchor(null);
                  setCalculatorModalOpen(true);
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <CalcIcon sx={{ fontSize: 19, color: 'success.main' }} />
                <ListItemText primary="Calculadora" secondary="Cálculos matemáticos (/calc)" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <MenuItem
                disabled={isReadOnly}
                onClick={() => {
                  setMobileToolsAnchor(null);
                  setMermaidModalOpen(true);
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <MermaidIcon sx={{ fontSize: 19, color: '#845EC2' }} />
                <ListItemText primary="Diagrama Mermaid" secondary="Diagramas y flujos (/mermaid)" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <MenuItem
                disabled={isReadOnly}
                onClick={() => {
                  setMobileToolsAnchor(null);
                  setDictationModalOpen(true);
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <LiveVoiceIcon sx={{ fontSize: 19, color: '#0ea5e9' }} />
                <ListItemText primary="Dictado por voz" secondary="Transcribe voz a texto" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <MenuItem
                disabled={isReadOnly}
                onClick={() => {
                  setMobileToolsAnchor(null);
                  setAudioModalOpen(true);
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <VoiceIcon sx={{ fontSize: 19, color: '#e11d48' }} />
                <ListItemText primary="Grabar nota de audio" secondary="Adjuntar grabación de voz" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <MenuItem
                onClick={() => {
                  setMobileToolsAnchor(null);
                  setPresentationModalOpen(true);
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <PresentationIcon sx={{ fontSize: 19, color: '#0284c7' }} />
                <ListItemText primary="Modo Presentación" secondary="Ver como diapositivas" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <Divider sx={{ my: 0.5 }} />
              <Typography variant="overline" sx={{ px: 2, py: 0.4, fontWeight: 800, color: 'text.secondary', display: 'block', fontSize: '0.65rem' }}>
                Gestión y Opciones
              </Typography>

              {!isReadOnly && (
                <MenuItem
                  onClick={() => {
                    setMobileToolsAnchor(null);
                    fileInputRef.current?.click();
                  }}
                  sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
                >
                  <AttachFileIcon sx={{ fontSize: 19 }} />
                  <ListItemText primary="Adjuntar archivo" secondary="Documentos, PDFs, imágenes" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
                </MenuItem>
              )}

              {!isReadOnly && (
                <MenuItem
                  onClick={(e) => {
                    setMobileToolsAnchor(null);
                    handleMoveNoteClick(e);
                  }}
                  sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
                >
                  <MoveIcon sx={{ fontSize: 19 }} />
                  <ListItemText primary="Mover a otro proyecto" secondary={`Actual: ${currentProjectName}`} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
                </MenuItem>
              )}

              {note?.shareToken && (
                <MenuItem
                  onClick={() => {
                    setMobileToolsAnchor(null);
                    setCollaboratorsOpen(true);
                  }}
                  sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
                >
                  <PeopleAltIcon sx={{ fontSize: 19 }} />
                  <ListItemText primary="Colaboradores" secondary="Gestionar permisos" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  setMobileToolsAnchor(null);
                  setHistoryOpen(true);
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <HistoryIcon sx={{ fontSize: 19 }} />
                <ListItemText primary="Historial de versiones" secondary="Ver y restaurar cambios" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <MenuItem
                onClick={() => {
                  setMobileToolsAnchor(null);
                  setReminderDialogOpen(true);
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <AlarmAddIcon sx={{ fontSize: 19, color: getReminderForNote(currentNoteId) ? 'warning.main' : 'inherit' }} />
                <ListItemText primary="Recordatorio" secondary={getReminderForNote(currentNoteId) ? `Programado: ${new Date(getReminderForNote(currentNoteId).remindAt).toLocaleString()}` : 'Añadir alarma'} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <MenuItem
                onClick={() => {
                  setMobileToolsAnchor(null);
                  duplicateMutation.mutate();
                }}
                disabled={duplicateMutation.isPending}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <DuplicateIcon sx={{ fontSize: 19 }} />
                <ListItemText primary="Duplicar nota" secondary="Crear una copia exacta" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <MenuItem
                onClick={(e) => {
                  setMobileToolsAnchor(null);
                  setExportMenuAnchor(e.currentTarget);
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <DownloadIcon sx={{ fontSize: 19 }} />
                <ListItemText primary="Exportar / Importar" secondary="PDF, Word, Markdown, HTML, PNG" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <MenuItem
                onClick={(e) => {
                  setMobileToolsAnchor(null);
                  setAmbientAnchor(e.currentTarget);
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <AmbientIcon sx={{ fontSize: 19 }} />
                <ListItemText primary="Sonidos de concentración" secondary="Lluvia, Olas, Café..." primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              <MenuItem
                onClick={() => {
                  setMobileToolsAnchor(null);
                  toggleZenMode();
                }}
                sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
              >
                <ZenIcon sx={{ fontSize: 19, color: zenMode ? 'primary.main' : 'inherit' }} />
                <ListItemText primary="Modo Concentración (Zen)" secondary="Ocultar distracciones" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
              </MenuItem>

              {!isReadOnly && (
                <MenuItem
                  onClick={() => {
                    setMobileToolsAnchor(null);
                    setPinModalMode(note?.hasPin ? 'remove' : 'set');
                    setPinInputValue('');
                    setPinModalOpen(true);
                  }}
                  sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
                >
                  <LockIcon sx={{ fontSize: 19, color: note?.hasPin ? 'error.main' : 'primary.main' }} />
                  <ListItemText primary={note?.hasPin ? 'Quitar protección PIN' : 'Proteger con PIN'} secondary="Bloqueo de seguridad" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} secondaryTypographyProps={{ variant: 'caption' }} />
                </MenuItem>
              )}

              {!isReadOnly && (
                <MenuItem
                  onClick={() => {
                    setMobileToolsAnchor(null);
                    handleToggleArchive();
                  }}
                  sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5 }}
                >
                  {note?.archived ? <UnarchiveIcon sx={{ fontSize: 19 }} /> : <ArchiveIcon sx={{ fontSize: 19 }} />}
                  <ListItemText primary={note?.archived ? 'Restaurar de archivadas' : 'Archivar nota'} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
                </MenuItem>
              )}

              {!isReadOnly && (
                <MenuItem
                  onClick={() => {
                    setMobileToolsAnchor(null);
                    confirm({
                      title: 'Mover a la papelera',
                      message: `¿Mover "${note?.title || 'Sin título'}" a la papelera? Podrás restaurarla más tarde.`,
                      confirmLabel: 'Mover',
                      cancelLabel: 'Cancelar',
                      color: 'error',
                      onConfirm: deleteNote,
                    });
                  }}
                  sx={{ borderRadius: 1.5, py: 0.7, gap: 1.5, color: 'error.main' }}
                >
                  <DeleteIcon sx={{ fontSize: 19 }} />
                  <ListItemText primary="Mover a papelera" primaryTypographyProps={{ variant: 'body2', fontWeight: 600, color: 'error.main' }} />
                </MenuItem>
              )}
            </Menu>
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
              <input
                type="file"
                accept=".md,.txt"
                hidden
                ref={importFileInputRef}
                onChange={handleImportFile}
              />
            </>
          )}

          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuItem disabled sx={{ fontWeight: 'bold' }}>
              Exportar nota como...
            </MenuItem>
            <MenuItem onClick={handleExport('pdf')}>
              <PdfIcon fontSize="small" sx={{ mr: 1 }} /> Documento PDF (.pdf)
            </MenuItem>
            <MenuItem onClick={handleExport('png')}>
              <ImageIcon fontSize="small" sx={{ mr: 1 }} /> Imagen PNG (.png)
            </MenuItem>
            <MenuItem onClick={handleExport('docx')}>
              <DescriptionIcon fontSize="small" sx={{ mr: 1 }} /> Documento Word (.docx)
            </MenuItem>
            <MenuItem onClick={handleExport('md')}>
              <ArticleIcon fontSize="small" sx={{ mr: 1 }} /> Markdown (.md)
            </MenuItem>
            <Divider />
            <MenuItem onClick={exportAsHtml}>
              <HtmlIcon fontSize="small" sx={{ mr: 1 }} /> Página HTML (.html)
            </MenuItem>
            <MenuItem onClick={exportAsTxt}>
              <TextSnippetIcon fontSize="small" sx={{ mr: 1 }} /> Texto plano (.txt)
            </MenuItem>
            {!isReadOnly && <Divider key="divider-import" />}
            {!isReadOnly && (
              <MenuItem onClick={() => { setExportMenuAnchor(null); importFileInputRef.current?.click(); }}>
                <ImportFileIcon fontSize="small" sx={{ mr: 1 }} /> Importar archivo (.md / .txt)
              </MenuItem>
            )}
            {!isReadOnly && (
              <MenuItem
                onClick={() => {
                  setExportMenuAnchor(null);
                  setPinModalMode(note?.hasPin ? 'remove' : 'set');
                  setPinInputValue('');
                  setPinModalOpen(true);
                }}
              >
                <LockIcon fontSize="small" sx={{ mr: 1, color: note?.hasPin ? 'error.main' : 'primary.main' }} />
                {note?.hasPin ? 'Quitar protección PIN' : 'Proteger nota con PIN'}
              </MenuItem>
            )}
            {!isReadOnly && (
              <MenuItem
                onClick={async () => {
                  setExportMenuAnchor(null);
                  try {
                    await api.post(`/templates/from-note/${currentNoteId}`, {});
                    queryClient.invalidateQueries({ queryKey: ['custom-templates'] });
                    toast.success('Nota guardada en "Mis Plantillas" exitosamente');
                  } catch (err) {
                    console.error('Error saving note as template:', err);
                    toast.error('No se pudo guardar la nota como plantilla');
                  }
                }}
              >
                <TemplateIcon fontSize="small" sx={{ mr: 1, color: '#f39c12' }} /> Guardar como plantilla personal
              </MenuItem>
            )}
          </Menu>

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
      <Box
        onDragOver={(e) => {
          if (e.dataTransfer?.types?.includes('Files')) {
            e.preventDefault();
          }
        }}
        onDrop={handleEditorFileDrop}
        sx={{ p: { xs: 2, sm: 4 }, pb: { xs: 12, sm: 4 }, maxWidth: 850, width: '100%', mx: 'auto' }}
        className="mobile-editor-area"
      >
        {isNoteLocked ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              px: 2,
            }}
          >
            <Paper
              elevation={3}
              sx={{
                p: { xs: 3.5, sm: 5 },
                borderRadius: 4,
                maxWidth: 420,
                width: '100%',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 2.5,
              }}
            >
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(56, 108, 95, 0.35)',
                }}
              >
                <LockIcon sx={{ fontSize: 38 }} />
              </Box>

              <Typography variant="h5" fontWeight={800}>
                Nota Protegida con PIN
              </Typography>

              <Typography variant="body2" color="text.secondary">
                El contenido de esta nota es confidencial. Ingresa el PIN de seguridad para acceder.
              </Typography>

              <Box component="form" onSubmit={handleUnlockNote} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  type="password"
                  placeholder="••••"
                  autoFocus
                  fullWidth
                  value={pinInputValue}
                  onChange={(e) => setPinInputValue(e.target.value)}
                  inputProps={{ maxLength: 10, style: { textAlign: 'center', fontSize: '1.4rem', letterSpacing: 8, fontWeight: 700 } }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={pinPending || !pinInputValue.trim()}
                  startIcon={pinPending ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
                  sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 700, textTransform: 'none' }}
                >
                  {pinPending ? 'Verificando...' : 'Desbloquear Nota'}
                </Button>
              </Box>
            </Paper>
          </Box>
        ) : (
          <>
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
                <Tooltip title="Elegir GIF animado o Fondo HD (GIPHY)">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setMediaPickerTarget('cover');
                      setMediaPickerTab('gifs');
                      setMediaPickerOpen(true);
                    }}
                    sx={{
                      bgcolor: 'rgba(15,15,35,0.6)',
                      color: '#fff',
                      backdropFilter: 'blur(6px)',
                      '&:hover': { bgcolor: 'primary.main' },
                    }}
                  >
                    <GifIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Subir portada desde archivo">
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

        {/* Botones de acción rápida sobre el título (Solo en Tablet/Escritorio) */}
        {!isReadOnly && (
          <Box sx={{ mb: 1.5, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {!coverUrl && (
              <Button
                size="small"
                startIcon={<GifIcon sx={{ fontSize: 18 }} />}
                onClick={() => {
                  setMediaPickerTarget('cover');
                  setMediaPickerTab('gifs');
                  setMediaPickerOpen(true);
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  borderRadius: 2,
                  color: 'text.secondary',
                  px: 1.2,
                  py: 0.35,
                  '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                + Agregar Portada
              </Button>
            )}

            {!note?.icon && (
              <Button
                size="small"
                startIcon={<EmojiIcon sx={{ fontSize: 18 }} />}
                onClick={(e) => setEmojiAnchor(e.currentTarget)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  borderRadius: 2,
                  color: 'text.secondary',
                  px: 1.2,
                  py: 0.35,
                  '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                + Agregar Icono
              </Button>
            )}

            <Button
              size="small"
              startIcon={<TemplateIcon sx={{ fontSize: 18, color: '#f39c12' }} />}
              onClick={() => setTemplatesOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                borderRadius: 2,
                color: 'text.secondary',
                px: 1.2,
                py: 0.35,
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              Plantillas
            </Button>

            <Button
              size="small"
              startIcon={<TemplateIcon sx={{ fontSize: 18, color: 'primary.main' }} />}
              onClick={toggleAiDrawer}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                borderRadius: 2,
                color: 'text.secondary',
                px: 1.2,
                py: 0.35,
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              Asistente IA
            </Button>
          </Box>
        )}

        {/* Note Icon + Title Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, mb: { xs: 1, sm: 1.5 } }}>
          {note?.icon && (
            <Tooltip title={isReadOnly ? undefined : 'Cambiar o quitar icono'}>
              <Box
                component={isReadOnly ? 'div' : 'button'}
                onClick={isReadOnly ? undefined : (e) => setEmojiAnchor(e.currentTarget)}
                sx={{
                  fontSize: { xs: '1.75rem', sm: '2.5rem' },
                  lineHeight: 1,
                  p: 0.5,
                  borderRadius: 2.5,
                  bgcolor: 'action.hover',
                  border: 'none',
                  cursor: isReadOnly ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  '&:hover': isReadOnly ? {} : { transform: 'scale(1.15)', bgcolor: 'action.selected' },
                }}
              >
                {note.icon}
              </Box>
            </Tooltip>
          )}

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
                fontSize: { xs: '1.35rem', sm: '2.4rem' },
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                '&::placeholder': { opacity: 0.38 },
              },
            }}
          />
        </Box>

        {/* Meta row: tags + members + last editor + date */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: { xs: 1, sm: 2 },
            flexWrap: 'wrap',
            mb: { xs: 1.5, sm: 3 },
            pb: { xs: 1.25, sm: 2.5 },
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
              <Autocomplete
                freeSolo
                disableClearable
                blurOnSelect
                size="small"
                sx={{ minWidth: 110 }}
                options={projectTags.filter((t) => !(note?.tags || []).includes(t))}
                value={tagInput}
                onInputChange={(_, val) => setTagInput(val)}
                onChange={(_, val) => { if (val) handleAddTagValue(val); }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="standard"
                    placeholder="+ Etiqueta"
                    onKeyDown={handleAddTag}
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      sx: { fontSize: '0.8rem' },
                    }}
                  />
                )}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: 'auto', flexShrink: 0 }}>
            <ActiveEditorsIndicator noteId={currentNoteId} members={members || []} />
            <AuthorAvatars
              creator={activeProject?.creator}
              collaborators={activeProject?.collaborators}
              noteMembers={note?.noteMembers}
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
              {new Date(note?.updatedAt || note?.createdAt || Date.now()).toLocaleDateString(undefined, {
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
              p: { xs: 0.35, sm: 0.5 },
              mb: { xs: 1.5, sm: 2 },
              display: 'flex',
              gap: { xs: 0.15, sm: 0.25 },
              alignItems: 'center',
              flexWrap: { xs: 'nowrap', sm: 'wrap' },
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              maxWidth: '100%',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              borderRadius: 2.5,
              bgcolor: 'background.default',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            }}
          >
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBold().run()}
                color={editor.isActive('bold') ? 'primary' : 'default'}
                aria-label="Negrita"
                sx={{ p: { xs: 0.5, sm: 0.75 }, transition: 'all 0.15s ease' }}
              >
                <BoldIcon fontSize="small" />
              </IconButton>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                color={editor.isActive('italic') ? 'primary' : 'default'}
                sx={{ transition: 'all 0.15s ease' }}
              >
                <ItalicIcon fontSize="small" />
              </IconButton>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                color={editor.isActive('strike') ? 'primary' : 'default'}
                sx={{ transition: 'all 0.15s ease' }}
              >
                <StrikeIcon fontSize="small" />
              </IconButton>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                color={editor.isActive('codeBlock') ? 'primary' : 'default'}
                sx={{ transition: 'all 0.15s ease' }}
              >
                <CodeIcon fontSize="small" />
              </IconButton>
            </motion.div>
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

            <Tooltip title="Insertar GIF Animado (GIPHY)">
              <IconButton
                size="small"
                onClick={() => {
                  setMediaPickerTarget('inline');
                  setMediaPickerTab('gifs');
                  setMediaPickerOpen(true);
                }}
                sx={{ color: 'primary.main' }}
              >
                <GifIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem />

            {/* Dictado por voz (Speech to Text) */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton
                size="small"
                onClick={toggleListening}
                color={isListening ? 'error' : 'default'}
                sx={{
                  transition: 'all 0.15s ease',
                  animation: isListening ? 'pulse-red 1.5s ease-in-out infinite' : 'none',
                  '@keyframes pulse-red': {
                    '0%, 100%': { transform: 'scale(1)', boxShadow: 'none' },
                    '50%': { transform: 'scale(1.15)', boxShadow: '0 0 8px rgba(244, 67, 54, 0.6)' },
                  }
                }}
              >
                <Tooltip title={isListening ? 'Detener dictado por voz' : 'Dictado por voz (Escribir hablando)'}>
                  {isListening ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
                </Tooltip>
              </IconButton>
            </motion.div>

            <Divider orientation="vertical" flexItem />

            {/* Interlineado */}
            <Tooltip title={`Interlineado: ${editorLineHeight.toFixed(1)}`}>
              <IconButton
                size="small"
                onClick={(e) => setLineSpacingAnchor(e.currentTarget)}
                sx={{
                  color: lineSpacingAnchor ? 'primary.main' : 'inherit',
                  transition: 'color 0.15s',
                }}
              >
                <LineSpacingIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Popover
              open={Boolean(lineSpacingAnchor)}
              anchorEl={lineSpacingAnchor}
              onClose={() => setLineSpacingAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              PaperProps={{
                sx: {
                  p: 2.5,
                  width: 240,
                  borderRadius: 2.5,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                },
              }}
            >
              <Typography variant="caption" fontWeight={700} sx={{ mb: 1.5, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Interlineado
              </Typography>
              <Slider
                value={editorLineHeight}
                min={1.0}
                max={3.0}
                step={0.1}
                marks={[
                  { value: 1.0, label: '1.0' },
                  { value: 1.5, label: '1.5' },
                  { value: 2.0, label: '2.0' },
                  { value: 2.5, label: '2.5' },
                  { value: 3.0, label: '3.0' },
                ]}
                onChange={(_, val) => setEditorLineHeight(val)}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => v.toFixed(1)}
                size="small"
                sx={{ color: 'primary.main', mt: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setEditorLineHeight(1.6)}
                  sx={{ fontSize: '0.7rem', color: 'text.secondary' }}
                >
                  Restablecer
                </Button>
              </Box>
            </Popover>

            <IconButton size="small" onClick={() => editor.chain().focus().undo().run()}>
              <UndoIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => editor.chain().focus().redo().run()}>
              <RedoIcon fontSize="small" />
            </IconButton>

            {/* Auto-save status (always visible thanks to the sticky bar) */}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
              {/* Indicador de estado con animación */}
              <motion.div
                key={saveStatus}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Chip
                  size="small"
                  icon={
                    saveStatus === 'saved' ? (
                      <motion.div
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                      >
                        <CheckIcon sx={{ fontSize: 14 }} />
                      </motion.div>
                    ) : saveStatus === 'saving' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid', borderColor: 'secondary.main', borderTopColor: 'transparent' }} />
                      </motion.div>
                    ) : saveStatus === 'error' ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                      >
                        <ErrorIcon sx={{ fontSize: 14 }} />
                      </motion.div>
                    ) : null
                  }
                  label={
                    saveStatus === 'saved'
                      ? 'Guardado'
                      : saveStatus === 'saving'
                      ? 'Guardando...'
                      : saveStatus === 'error'
                      ? 'Error al guardar'
                      : 'Sin guardar'
                  }
                  color={
                    saveStatus === 'saved'
                      ? 'success'
                      : saveStatus === 'saving'
                      ? 'secondary'
                      : saveStatus === 'error'
                      ? 'error'
                      : 'warning'
                  }
                  variant={saveStatus === 'saved' || saveStatus === 'error' ? 'filled' : 'outlined'}
                  sx={{
                    height: 24,
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    '& .MuiChip-label': { px: 1 },
                    transition: 'all 0.3s ease',
                    animation: saveStatus === 'unsaved' ? 'pulse 2s ease-in-out infinite' : 'none',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1, boxShadow: 'none' },
                      '50%': { opacity: 0.8, boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)' },
                    },
                  }}
                />
              </motion.div>
            </Box>
          </Paper>
        )}

        {/* TipTap Rich Editor */}
        <Box
          data-print-content
          sx={{
            minHeight: 400,
    '& .tiptap': {
      outline: 'none',
      minHeight: 400,
      // Lienzo de referencia para las imágenes flotantes (posición absoluta)
      position: 'relative',
      fontSize: '1.05rem',
      lineHeight: editorLineHeight,
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
              // Imágenes con posición libre: arrastrables y redimensionables
              '& img.notitas-float-img': {
                position: 'relative',
                transition: 'none',
                cursor: 'grab',
                userSelect: 'none',
                '&:hover': { outline: 'none' },
              },
              // Todas las imágenes seleccionadas muestran indicador visual
              '& .notitas-image-selected img': {
                boxShadow: '0 0 0 2px #386c5f',
              },
              '& .notitas-image-selected .notitas-float-img': {
                cursor: 'move',
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
              // Note mentions (@) & Wiki links ([[])
              '& .note-mention-badge, & .note-link': {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                px: 1,
                py: 0.2,
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.92em',
                textDecoration: 'none !important',
                cursor: 'pointer',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.35)' : 'rgba(56, 108, 95, 0.12)',
                color: (theme) =>
                  theme.palette.mode === 'dark' ? '#8be0cc' : '#386c5f',
                border: '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(106, 150, 140, 0.4)' : 'rgba(56, 108, 95, 0.25)',
                transition: 'all 0.18s ease',
                '&:hover': {
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.55)' : 'rgba(56, 108, 95, 0.22)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(56, 108, 95, 0.2)',
                },
              },
              // Clean float flows
              '& p, & h1, & h2, & h3, & h4, & h5, & h6': {
                clear: 'both',
              },
            },
          }}
          onClick={(e) => {
            const mentionLink = e.target.closest('[data-note-id]');
            if (mentionLink) {
              e.preventDefault();
              const targetNoteId = Number(mentionLink.getAttribute('data-note-id'));
              const targetProjectId = Number(mentionLink.getAttribute('data-project-id'));
              if (targetNoteId) {
                flushPendingSaveRef.current?.();
                if (targetProjectId) {
                  setCurrentProject(targetProjectId);
                }
                setCurrentNote(targetNoteId);
                toast.info('Abriendo nota vinculada...');
              }
            }
          }}
        >
          <EditorContent editor={editor} />
          <FloatingSelectionToolbar editor={editor} />
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

        {/* Backlinks de la nota */}
        <BacklinksPanel
          currentNoteId={currentNoteId}
          notes={notes || []}
          onNoteClick={(id) => setCurrentNote(id)}
        />

        {/* Comentarios de la nota */}
        <CommentsSection noteId={currentNoteId} members={members || []} />
        </>
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

      {/* Note Collaborators Dialog (solo el creador de la nota puede expulsar) */}
      {collaboratorsOpen && (
        <React.Suspense fallback={null}>
          <NoteCollaboratorsDialog
            noteId={currentNoteId}
            open={collaboratorsOpen}
            onClose={() => setCollaboratorsOpen(false)}
            canRemove={isCreator}
          />
        </React.Suspense>
      )}

      {/* Share Note Dialog */}
      <Dialog open={openShareDialog} onClose={() => setOpenShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShareIcon color="primary" /> Configuración de Compartido de la Nota
        </DialogTitle>
        <DialogContent>
          {shareToken ? (
            <Box sx={{ mt: 1 }}>
              {/* Status Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.15)' : 'rgba(56, 108, 95, 0.08)',
                  color: 'primary.main',
                  p: 1.5,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'rgba(56, 108, 95, 0.2)',
                  mb: 3,
                }}
              >
                <CheckIcon fontSize="small" />
                <Typography variant="body2" fontWeight="bold">
                  COMPARTIDO ACTIVO — Los enlaces de esta nota están funcionando.
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Elige el nivel de acceso que deseas dar a tus colaboradores:
              </Typography>

              {/* Option 1: Public Reader */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  👁️ 1. Enlace de Lectura Pública (Sin registro)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Permite a cualquier persona ver el título, portada y contenido de esta nota sin necesidad de crear una cuenta.
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
              </Box>

              {/* Option 2: Joint Editor */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  ✍️ 2. Enlace de Invitación a Colaborar (Editar y Ver)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Permite al receptor unirse como colaborador de esta nota para poder verla y editarla de forma compartida desde su Workspace (requiere iniciar sesión).
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={`${window.location.origin}/join/note/${shareToken}`}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleCopyJoinLink}
                        sx={{ ml: 1, minWidth: 100 }}
                      >
                        {copyJoinSuccess ? 'Copiado!' : 'Copiar'}
                      </Button>
                    ),
                  }}
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Revoke Action */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleRevokeShare}
                  startIcon={<LockIcon />}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    py: 1,
                    '&:hover': {
                      bgcolor: 'error.main',
                      color: '#fff',
                      borderColor: 'error.main',
                    },
                  }}
                >
                  Revocar Enlaces / Desactivar Compartido
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mt: 1, textAlign: 'center', py: 2 }}>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <LockIcon color="action" />
              </Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Compartido Desactivado
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, maxWidth: 380, mx: 'auto' }}>
                Esta nota es actualmente privada. Activa el compartido para generar los enlaces de lectura pública e invitación a colaborar.
              </Typography>
              <Button
                variant="contained"
                onClick={handleActivateShare}
                startIcon={<ShareIcon />}
                sx={{
                  px: 4,
                  py: 1.2,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 'bold',
                }}
              >
                Activar Compartido y Colaboración
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenShareDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Version History Dialog */}
      {historyOpen && (
        <React.Suspense fallback={null}>
          <NoteHistoryDialog
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            noteId={note?.id}
            currentContent={editor ? editor.getHTML() : (note?.content || '')}
            members={members}
            canRestore={!isReadOnly}
            onRestoreStart={() => clearPendingSave?.()}
          />
        </React.Suspense>
      )}

      {/* Universal Media & GIF Picker Modal */}
      {mediaPickerOpen && (
        <React.Suspense fallback={null}>
          <MediaPickerModal
            open={mediaPickerOpen}
            onClose={() => setMediaPickerOpen(false)}
            onSelectMedia={handleSelectMedia}
            onUploadFile={handleUploadFromPicker}
            initialTab={mediaPickerTab}
            title={mediaPickerTarget === 'cover' ? 'Elegir Portada o GIF Animado' : 'Insertar GIF Animado en la Nota'}
          />
        </React.Suspense>
      )}

      {/* Emoji Picker Popover */}
      <EmojiPickerPopover
        anchorEl={emojiAnchor}
        open={Boolean(emojiAnchor)}
        onClose={() => setEmojiAnchor(null)}
        onSelectEmoji={handleSelectEmoji}
        currentEmoji={note?.icon}
      />

      {/* Note Templates Catalog Dialog */}
      {templatesOpen && (
        <React.Suspense fallback={null}>
          <NoteTemplatesDialog
            open={templatesOpen}
            onClose={() => setTemplatesOpen(false)}
            onSelectTemplate={handleSelectTemplate}
          />
        </React.Suspense>
      )}

      {/* Floating Slash Commands Menu */}
      <SlashCommandsMenu
        editor={editor}
        open={slashOpen}
        anchorPosition={slashPosition}
        query={slashQuery}
        onClose={() => setSlashOpen(false)}
        onOpenMediaPicker={() => {
          setMediaPickerTarget('inline');
          setMediaPickerTab('gifs');
          setMediaPickerOpen(true);
        }}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenAi={toggleAiDrawer}
        onOpenCanvas={() => setCanvasModalOpen(true)}
        onOpenCalculator={() => setCalculatorModalOpen(true)}
        onOpenMermaid={() => setMermaidModalOpen(true)}
        onOpenAudio={() => setAudioModalOpen(true)}
        onOpenDictation={() => setDictationModalOpen(true)}
        onOpenPresentation={() => setPresentationModalOpen(true)}
        onOpenMention={() => {
          if (!editor) return;
          editor.chain().focus().insertContent('@').run();
          setMentionTrigger('@');
          setWikiQuery('');
          setWikiOpen(true);
        }}
      />

      {/* Floating Note Mention / Wiki Link Menu (@ o [[) */}
      <WikiLinkMenu
        open={wikiOpen}
        query={wikiQuery}
        triggerChar={mentionTrigger}
        notes={allUserNotes.length > 0 ? allUserNotes : (notes || [])}
        projects={userProjects || []}
        position={wikiMenuPos}
        onSelect={(selectedNote) => {
          setWikiOpen(false);
          if (!editor) return;
          const { from, $from } = editor.state.selection;
          const textInNode = $from.parent.textBetween(0, $from.parentOffset, null, '\uFFFC');

          let deleteFrom = from;
          if (mentionTrigger === '@') {
            const startIdx = textInNode.lastIndexOf('@');
            if (startIdx !== -1) {
              deleteFrom = from - (textInNode.length - startIdx);
            }
          } else {
            const startIdx = textInNode.lastIndexOf('[[');
            if (startIdx !== -1) {
              deleteFrom = from - (textInNode.length - startIdx);
            }
          }

          const noteTitle = selectedNote.title || 'Sin título';
          editor
            .chain()
            .focus()
            .deleteRange({ from: deleteFrom, to: from })
            .insertContent(
              `<a href="#note-${selectedNote.id}" data-note-id="${selectedNote.id}" data-project-id="${selectedNote.projectId || ''}" class="note-mention-badge">@${noteTitle}</a>&nbsp;`
            )
            .run();
        }}
        onClose={() => setWikiOpen(false)}
      />

      {/* PIN Configuration Dialog (Set / Remove PIN) */}
      <Dialog
        open={pinModalOpen}
        onClose={() => !pinPending && setPinModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon color="primary" />
          {pinModalMode === 'remove' ? 'Quitar protección por PIN' : 'Proteger nota con PIN'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {pinModalMode === 'remove'
              ? 'Ingresa el PIN actual de esta nota para desbloquearla y quitar la protección permanentemente.'
              : 'Establece un código PIN de 4 dígitos o más. La nota requerirá este PIN antes de mostrar su contenido.'}
          </Typography>
          <Box
            component="form"
            onSubmit={pinModalMode === 'remove' ? handleRemovePin : handleSavePin}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
          >
            <TextField
              type="password"
              label={pinModalMode === 'remove' ? 'PIN actual' : 'Nuevo PIN (mín. 4 dígitos)'}
              fullWidth
              autoFocus
              required
              value={pinInputValue}
              onChange={(e) => setPinInputValue(e.target.value)}
              inputProps={{ maxLength: 10, style: { letterSpacing: 4, fontWeight: 700 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPinModalOpen(false)} disabled={pinPending} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={pinModalMode === 'remove' ? handleRemovePin : handleSavePin}
            variant="contained"
            color={pinModalMode === 'remove' ? 'error' : 'primary'}
            disabled={pinPending || !pinInputValue.trim() || pinInputValue.length < 4}
            startIcon={pinPending ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {pinPending ? 'Guardando...' : pinModalMode === 'remove' ? 'Quitar PIN' : 'Guardar PIN'}
          </Button>
        </DialogActions>
      </Dialog>

      {reminderDialogOpen && (
        <Dialog open onClose={() => setReminderDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Recordatorio</DialogTitle>
          <DialogContent>
            <input
              type="datetime-local"
              defaultValue={getReminderForNote(currentNoteId)?.remindAt?.slice(0, 16) || ''}
              id="reminder-dt"
              style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 15 }}
              min={new Date().toISOString().slice(0, 16)}
            />
          </DialogContent>
          <DialogActions>
            {getReminderForNote(currentNoteId) && (
              <Button color="error" onClick={() => { removeReminder(currentNoteId); setReminderDialogOpen(false); toast.success('Recordatorio eliminado'); }}>
                Eliminar
              </Button>
            )}
            <Button onClick={() => setReminderDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={() => {
              const val = document.getElementById('reminder-dt')?.value;
              if (!val) return;
              saveReminder(currentNoteId, title || 'Sin titulo', val);
              setReminderDialogOpen(false);
              toast.success(`Recordatorio para ${new Date(val).toLocaleDateString()}`);
            }}>
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Pizarra de Dibujo / Canvas Modal */}
      {canvasModalOpen && (
        <React.Suspense fallback={null}>
          <CanvasModal
            open={canvasModalOpen}
            onClose={() => setCanvasModalOpen(false)}
            onInsertImage={(dataUrl) => {
              if (editor) {
                editor.chain().focus().setImage({ src: dataUrl, alt: 'Boceto' }).run();
                toast.success('Boceto incrustado');
              }
            }}
          />
        </React.Suspense>
      )}

      {/* Calculadora Integrada Modal */}
      {calculatorModalOpen && (
        <React.Suspense fallback={null}>
          <CalculatorModal
            open={calculatorModalOpen}
            onClose={() => setCalculatorModalOpen(false)}
            onInsertText={(text) => {
              if (editor) {
                editor.chain().focus().insertContent(text).run();
                toast.success('Cifra insertada');
              }
            }}
          />
        </React.Suspense>
      )}

      {/* Modo Presentación Modal */}
      {presentationModalOpen && (
        <React.Suspense fallback={null}>
          <PresentationModal
            open={presentationModalOpen}
            onClose={() => setPresentationModalOpen(false)}
            noteTitle={title || 'Presentación'}
            noteContent={editor ? editor.getHTML() : (note?.content || '')}
          />
        </React.Suspense>
      )}

      {/* Mermaid Diagram Editor Modal */}
      {mermaidModalOpen && (
        <React.Suspense fallback={null}>
          <MermaidModal
            open={mermaidModalOpen}
            onClose={() => setMermaidModalOpen(false)}
            onInsertDiagram={(imageUrl) => {
              if (editor) {
                editor.chain().focus().setImage({ src: imageUrl, alt: 'Diagrama Mermaid' }).run();
                toast.success('Diagrama Mermaid incrustado');
              }
            }}
          />
        </React.Suspense>
      )}

      {/* Audio Recorder Modal */}
      {audioModalOpen && (
        <React.Suspense fallback={null}>
          <AudioRecorderModal
            open={audioModalOpen}
            onClose={() => setAudioModalOpen(false)}
            onInsertAudio={(audioHtml) => {
              if (editor) {
                editor.chain().focus().insertContent(audioHtml).run();
                toast.success('Nota de voz incrustada');
              }
            }}
          />
        </React.Suspense>
      )}

      {/* Speech-to-Text Live Dictation Modal */}
      {dictationModalOpen && (
        <React.Suspense fallback={null}>
          <SpeechDictationModal
            open={dictationModalOpen}
            onClose={() => setDictationModalOpen(false)}
            onInsertText={(text) => {
              if (editor) {
                editor.chain().focus().insertContent(text + ' ').run();
              }
            }}
          />
        </React.Suspense>
      )}

      {/* Zen Ambient Sound Player Popover */}
      <ZenAmbientSoundPlayer
        anchorEl={ambientAnchor}
        open={Boolean(ambientAnchor)}
        onClose={() => setAmbientAnchor(null)}
      />
    </Box>
  );
}
