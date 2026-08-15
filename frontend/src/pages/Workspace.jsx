import React, { Suspense, lazy, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Drawer, useMediaQuery, useTheme, Tooltip, IconButton, Typography } from '@mui/material';
import { FullscreenExit as ZenExitIcon } from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ProjectsDashboard from '../components/ProjectsDashboard';
import TrashView from '../components/TrashView';
import FavoritesView from '../components/FavoritesView';
import ArchivedView from '../components/ArchivedView';
import MobileFab from '../components/MobileFab';

// NoteList + NoteEditor se cargan bajo demanda: TipTap y el editor son el
// chunk más pesado de la app y no hacen falta al abrir el dashboard.
const NoteList = lazy(() => import('../components/NoteList'));
const NoteEditor = lazy(() => import('../components/NoteEditor'));

export default function Workspace() {
  const { isAuthenticated } = useAuthStore();
  const {
    currentProjectId,
    currentNoteId,
    sidebarMobileOpen,
    setSidebarMobileOpen,
    zenMode,
    toggleZenMode,
    setZenMode,
    toggleAiDrawer,
    aiDrawerOpen,
  } = useUiStore();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch projects to resolve ambient glow color
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const activeProject = projects.find((p) => p.id === currentProjectId);
  const activeColor = activeProject?.color || '#386c5f';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Atajos de teclado para Modo Zen (Ctrl/Cmd+Shift+F o Escape) y Asistente IA (Ctrl/Cmd+J)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        if (currentNoteId) {
          toggleZenMode();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        toggleAiDrawer();
      } else if (e.key === 'Escape') {
        if (aiDrawerOpen) {
          toggleAiDrawer();
        } else if (zenMode) {
          setZenMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNoteId, zenMode, toggleZenMode, setZenMode, toggleAiDrawer, aiDrawerOpen]);

  if (!isAuthenticated) return null;

  const isZenActive = Boolean(zenMode && currentNoteId && !isMobile);

  const showDashboard = currentProjectId === null;
  const showTrashList = currentProjectId === 'trash' && !currentNoteId;
  const showFavorites = currentProjectId === 'favorites' && !currentNoteId;
  const showArchived = currentProjectId === 'archived' && !currentNoteId;
  const showSearch = currentProjectId === 'search' && !currentNoteId;

  const viewKey = showDashboard
    ? 'dashboard'
    : showTrashList
      ? 'trash'
      : showFavorites
        ? 'favorites'
        : showArchived
          ? 'archived'
          : showSearch
            ? 'search'
            : isZenActive
              ? 'zen-editor'
              : 'editor';

  const closeSidebar = () => setSidebarMobileOpen(false);

  return (
    <Box
      sx={{
        height: '100vh',
        '@supports (height: 100dvh)': { height: '100dvh' },
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        // Ambient Glow radial background based on project color
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-15%',
          right: '-10%',
          width: '650px',
          height: '650px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${activeColor}22 0%, transparent 70%)`,
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 0.6s ease',
        },
        '&::after': isZenActive
          ? {
              content: '""',
              position: 'absolute',
              bottom: '-20%',
              left: '10%',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${activeColor}15 0%, transparent 65%)`,
              filter: 'blur(80px)',
              pointerEvents: 'none',
              zIndex: 0,
            }
          : undefined,
      }}
    >
      {/* Botón flotante para salir de Modo Zen */}
      {isZenActive && (
        <Box
          sx={{
            position: 'fixed',
            top: 20,
            right: 24,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            px: 1.5,
            py: 0.5,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
            Modo Zen (Esc)
          </Typography>
          <Tooltip title="Salir del Modo Concentración">
            <IconButton size="small" onClick={() => setZenMode(false)} sx={{ p: 0.3 }}>
              <ZenExitIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Navbar (se oculta en Modo Zen) */}
      {!isZenActive && <Navbar />}

      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden', zIndex: 1 }}>
        {/* Sidebar fija en escritorio (se oculta en Modo Zen) */}
        {!isMobile && !isZenActive && <Sidebar />}

        {/* Sidebar como drawer en móvil */}
        {isMobile && (
          <Drawer
            variant="temporary"
            open={sidebarMobileOpen}
            onClose={closeSidebar}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              zIndex: 1300,
              '& .MuiBackdrop-root': {
                backdropFilter: 'blur(6px)',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(10, 10, 25, 0.65)' : 'rgba(20, 30, 45, 0.28)',
                transition: 'all 0.3s ease-out !important',
              },
              '& .MuiDrawer-paper': {
                width: 300,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(26, 26, 53, 0.88)' : 'rgba(244, 246, 250, 0.94)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                borderRight: '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(215, 222, 232, 0.85)',
                borderTopRightRadius: '24px',
                borderBottomRightRadius: '24px',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 24px 60px rgba(0, 0, 0, 0.75)'
                    : '0 24px 60px rgba(56, 108, 95, 0.22)',
                overflow: 'hidden',
              },
            }}
          >
            <Sidebar embedded />
          </Drawer>
        )}

        {/* Acciones rápidas flotantes (solo móvil) */}
        {isMobile && <MobileFab />}

        {/* Transición de vistas */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewKey}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ flexGrow: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}
          >
            {showDashboard && <ProjectsDashboard />}
            {showTrashList && <TrashView />}
            {showFavorites && <FavoritesView />}
            {showArchived && <ArchivedView />}
            {/* Vista de Proyecto o Búsqueda / Favoritos en detalle */}
            {!showDashboard && !showTrashList && !showFavorites && !showArchived && (
              <>
                {/* En Modo Zen de escritorio: se muestra exclusivamente el Editor centrado */}
                {isZenActive ? (
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                    <Suspense fallback={null}>
                      <NoteEditor />
                    </Suspense>
                  </Box>
                ) : isMobile ? (
                  !currentNoteId ? (
                    <Suspense fallback={null}>
                      <NoteList />
                    </Suspense>
                  ) : (
                    <Suspense fallback={null}>
                      <NoteEditor />
                    </Suspense>
                  )
                ) : (
                  /* En escritorio normal: muestra lista de notas + editor lado a lado */
                  <>
                    <Suspense fallback={null}>
                      <NoteList />
                    </Suspense>
                    <Suspense fallback={null}>
                      <NoteEditor />
                    </Suspense>
                  </>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
