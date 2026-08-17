import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as ResetZoomIcon,
  Search as SearchIcon,
  Hub as GraphIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useUiStore } from '../store/uiStore';

/**
 * Vista de Grafo de Conocimiento 2D interactiva.
 * Modela notas como nodos y enlaces wikilinks / tags como aristas con física de resortes y repulsión.
 */
export default function GraphView({ open, onClose, notes = [], currentProjectId = null }) {
  const { setCurrentNote, setCurrentProject } = useUiStore();
  const canvasRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [filterTagsOnly, setFilterTagsOnly] = useState(false);
  const nodeRepulsion = 180;

  // Construir Nodos y Enlaces a partir de las notas
  const { nodes, links } = useMemo(() => {
    const safeNotes = Array.isArray(notes) ? notes : [];
    const validNotes = safeNotes.filter((n) => !n.deleted);
    const nodeMap = new Map();

    validNotes.forEach((n, i) => {
      // Posición inicial en espiral
      const angle = i * 0.5;
      const radius = 40 + i * 15;
      nodeMap.set(n.id, {
        id: n.id,
        title: n.title || 'Sin título',
        projectId: n.projectId,
        tags: n.tags || [],
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: Math.min(24, Math.max(12, 10 + (n.tags?.length || 0) * 2)),
        color: n.favorite ? '#f59e0b' : '#386c5f',
      });
    });

    const linkList = [];
    const linkSet = new Set();

    validNotes.forEach((n) => {
      // 1. Extraer enlaces wikilink del contenido (data-note-id="X")
      const matches = [...(n.content || '').matchAll(/data-note-id=["'](\d+)["']/g)];
      matches.forEach((m) => {
        const targetId = Number(m[1]);
        if (nodeMap.has(targetId) && targetId !== n.id) {
          const key = `${Math.min(n.id, targetId)}-${Math.max(n.id, targetId)}`;
          if (!linkSet.has(key)) {
            linkSet.add(key);
            linkList.push({ source: n.id, target: targetId, type: 'wikilink' });
          }
        }
      });

      // 2. Enlaces por etiquetas compartidas si no hay wikilinks directos
      if (filterTagsOnly && n.tags && n.tags.length > 0) {
        validNotes.forEach((other) => {
          if (other.id !== n.id && other.tags) {
            const hasSharedTag = n.tags.some((t) => other.tags.includes(t));
            if (hasSharedTag) {
              const key = `${Math.min(n.id, other.id)}-${Math.max(n.id, other.id)}`;
              if (!linkSet.has(key)) {
                linkSet.add(key);
                linkList.push({ source: n.id, target: other.id, type: 'tag' });
              }
            }
          }
        });
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links: linkList,
    };
  }, [notes, filterTagsOnly]);

  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Simulación de física Force-Directed en Canvas
  useEffect(() => {
    if (!open) return;
    let animationFrameId;

    const simulate = () => {
      const currentNodes = nodesRef.current;
      const nodeObjMap = new Map(currentNodes.map((n) => [n.id, n]));

      // 1. Fuerza de repulsión entre nodos (Coulomb)
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const n1 = currentNodes[i];
          const n2 = currentNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          if (dist < 400) {
            const force = (nodeRepulsion * 50) / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Fuerza de atracción por enlaces (Hooke / Resortes)
      links.forEach((link) => {
        const source = nodeObjMap.get(link.source);
        const target = nodeObjMap.get(link.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = link.type === 'wikilink' ? 90 : 140;
        const force = (dist - targetDist) * 0.04;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      });

      // 3. Fuerza de gravedad hacia el centro
      currentNodes.forEach((n) => {
        n.vx -= n.x * 0.015;
        n.vy -= n.y * 0.015;

        // Fricción / Amortiguación
        n.vx *= 0.85;
        n.vy *= 0.85;

        n.x += n.vx;
        n.y += n.vy;
      });

      // Dibujar en el Canvas
      draw();

      iterations++;
      animationFrameId = requestAnimationFrame(simulate);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Aplicar pan y zoom centrados
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);

      const nodeObjMap = new Map(nodesRef.current.map((n) => [n.id, n]));

      // Dibujar enlaces (aristas)
      links.forEach((l) => {
        const s = nodeObjMap.get(l.source);
        const t = nodeObjMap.get(l.target);
        if (!s || !t) return;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = l.type === 'wikilink' ? 'rgba(56, 108, 95, 0.45)' : 'rgba(160, 174, 192, 0.25)';
        ctx.lineWidth = l.type === 'wikilink' ? 2 : 1;
        if (l.type === 'tag') ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Dibujar nodos
      const q = searchQuery.toLowerCase().trim();

      nodesRef.current.forEach((node) => {
        const isMatch = q && node.title.toLowerCase().includes(q);
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;

        // Halo si hace match con búsqueda o está hovered
        if (isMatch || isHovered || isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = isMatch ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 108, 95, 0.3)';
          ctx.fill();
        }

        // Círculo del nodo
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isMatch ? '#f59e0b' : node.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        // Texto del título
        ctx.font = `${isHovered ? 'bold ' : ''}${Math.max(10, 12 / Math.sqrt(zoom))}px Inter, sans-serif`;
        ctx.fillStyle = isHovered ? '#0f172a' : '#475569';
        ctx.textAlign = 'center';
        ctx.fillText(node.title.length > 20 ? `${node.title.slice(0, 18)}…` : node.title, node.x, node.y + node.radius + 14);
      });

      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [open, links, pan, zoom, searchQuery, hoveredNode, selectedNode, nodeRepulsion]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    // Transformar a coordenadas del grafo centradas y escaladas
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const x = (screenX - (canvas.width / 2 + pan.x)) / zoom;
    const y = (screenY - (canvas.height / 2 + pan.y)) / zoom;
    return { x, y, screenX, screenY };
  };

  const findNodeAt = (graphCoords) => {
    return nodesRef.current.find((n) => {
      const dx = n.x - graphCoords.x;
      const dy = n.y - graphCoords.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    const clicked = findNodeAt(coords);
    if (clicked) {
      setSelectedNode(clicked);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    const coords = getCanvasCoords(e);
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else {
      const node = findNodeAt(coords);
      setHoveredNode(node || null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNodeClick = (node) => {
    if (node) {
      if (node.projectId && node.projectId !== currentProjectId) {
        setCurrentProject(node.projectId);
      }
      setCurrentNote(node.id);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundImage: 'none',
        },
      }}
    >
      {/* Cabecera */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(56, 108, 95, 0.3)',
            }}
          >
            <GraphIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Grafo de Conocimiento ({nodes.length} notas · {links.length} conexiones)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Explora las relaciones visuales entre tus notas y wikilinks
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Buscar nota en el grafo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: { height: 36, fontSize: '0.8rem', borderRadius: 2.5, width: 220 },
            }}
          />
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Contenedor del Canvas y controles flotantes */}
      <DialogContent sx={{ p: 0, position: 'relative', flexGrow: 1, overflow: 'hidden', bgcolor: '#f8fafc' }}>
        <canvas
          ref={canvasRef}
          width={1100}
          height={650}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => hoveredNode && handleNodeClick(hoveredNode)}
          style={{
            width: '100%',
            height: '100%',
            cursor: hoveredNode ? 'pointer' : isDragging ? 'grabbing' : 'grab',
            display: 'block',
          }}
        />

        {/* Barra de Controles de Zoom y Filtros */}
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            p: 0.75,
            borderRadius: 3,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Tooltip title="Acercar">
            <IconButton size="small" onClick={() => setZoom((z) => Math.min(3, z * 1.2))}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Alejar">
            <IconButton size="small" onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Restablecer vista">
            <IconButton
              size="small"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <ResetZoomIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ width: 1, height: 20, bgcolor: 'divider', mx: 0.5 }} />
          <Chip
            label={filterTagsOnly ? 'Por Tags' : 'Wikilinks'}
            size="small"
            color={filterTagsOnly ? 'secondary' : 'primary'}
            onClick={() => setFilterTagsOnly(!filterTagsOnly)}
            icon={<FilterIcon sx={{ fontSize: '13px !important' }} />}
            sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
          />
        </Paper>

        {/* Tarjeta Flotante Informativa del Nodo al pasar el cursor */}
        {hoveredNode && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: 20,
              right: 20,
              p: 1.5,
              borderRadius: 2.5,
              maxWidth: 240,
              bgcolor: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(10px)',
              border: '1px solid',
              borderColor: 'primary.main',
              pointerEvents: 'none',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ color: 'primary.main', mb: 0.5 }}>
              {hoveredNode.title}
            </Typography>
            {hoveredNode.tags && hoveredNode.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.8 }}>
                {hoveredNode.tags.slice(0, 3).map((t) => (
                  <Chip key={t} label={`#${t}`} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                ))}
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem' }}>
              Clic para abrir nota
            </Typography>
          </Paper>
        )}
      </DialogContent>
    </Dialog>
  );
}
