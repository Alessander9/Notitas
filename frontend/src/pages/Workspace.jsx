import React, { Suspense, lazy, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ProjectsDashboard from '../components/ProjectsDashboard';
import TrashView from '../components/TrashView';
import FavoritesView from '../components/FavoritesView';
import MobileFab from '../components/MobileFab';

// NoteList + NoteEditor se cargan bajo demanda: TipTap y el editor son el
// chunk más pesado de la app y no hacen falta al abrir el dashboard.
const NoteList = lazy(() => import('../components/NoteList'));
const NoteEditor = lazy(() => import('../components/NoteEditor'));

export default function Workspace() {
  const { isAuthenticated } = useAuthStore();
  const { currentProjectId, currentNoteId, sidebarMobileOpen, setSidebarMobileOpen } = useUiStore();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const showDashboard = currentProjectId === null;
  const showTrashList = currentProjectId === 'trash' && !currentNoteId;
  const showFavorites = currentProjectId === 'favorites' && !currentNoteId;
  const showSearch = currentProjectId === 'search' && !currentNoteId;

  const viewKey = showDashboard
    ? 'dashboard'
    : showTrashList
      ? 'trash'
      : showFavorites
        ? 'favorites'
        : showSearch
          ? 'search'
          : 'editor';

  const closeSidebar = () => setSidebarMobileOpen(false);

  return (
    <Box
      sx={{
        height: '100vh',
        '@supports (height: 100dvh)': { height: '100dvh' },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar />
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar fija en escritorio */}
        {!isMobile && <Sidebar />}

        {/* Sidebar como drawer en móvil */}
        {isMobile && (
          <Drawer
            variant="temporary"
            open={sidebarMobileOpen}
            onClose={closeSidebar}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                width: 300,
                bgcolor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider',
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
            {/* Búsqueda global: lista de resultados + editor (antes los
                resultados nunca se mostraban: la vista caía en el editor vacío) */}
            {showSearch && (
              <>
                <Suspense fallback={null}>
                  <NoteList />
                </Suspense>
                <Suspense fallback={null}>
                  <NoteEditor />
                </Suspense>
              </>
            )}
            {!showDashboard && !showTrashList && !showFavorites && !showSearch && (
              <Suspense fallback={null}>
                <NoteEditor />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
