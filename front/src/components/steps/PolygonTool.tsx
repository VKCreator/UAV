import React, { useState, useRef, MouseEvent } from 'react';
import { 
  Box, 
  Paper, 
  IconButton, 
  Tooltip, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { 
  MousePointer2, 
  Pentagon, 
  Check, 
  X, 
  Trash2,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize,
  Edit,
  Layout,
  Grid3X3,
  Palette
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Polygon {
  id: string;
  name: string;
  points: Point[];
  color: string;
}

const COLORS = [
  'rgba(255, 0, 0, 0.3)',
  'rgba(0, 255, 0, 0.3)',
  'rgba(0, 0, 255, 0.3)',
  'rgba(255, 255, 0, 0.3)',
  'rgba(255, 0, 255, 0.3)',
  'rgba(0, 255, 255, 0.3)',
  'rgba(255, 255, 255, 0.3)',
  'transparent'
];

// --- GRID EDITOR COMPONENT ---
const GridEditor: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [appliedGrid, setAppliedGrid] = useState<{ rows: number; cols: number } | null>(null);
  const [cellColors, setCellColors] = useState<Record<string, string>>({});
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanningMode, setIsPanningMode] = useState(true);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const imageUrl = "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=2000";

  const handleMouseDown = (e: MouseEvent) => {
    if (isPanningMode) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isPanningMode && isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleCellClick = (row: number, col: number) => {
    if (isPanningMode) return;
    const key = `${row}-${col}`;
    setCellColors(prev => ({
      ...prev,
      [key]: selectedColor
    }));
  };

  const handleBuildGrid = () => {
    setAppliedGrid({ rows, cols });
    setCellColors({});
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen maxWidth={false}>
      <Box sx={{ display: 'flex', height: '100%', bgcolor: '#121212', color: 'white', overflow: 'hidden' }}>
        {/* Left Toolbar */}
        <Paper elevation={3} sx={{ width: 300, display: 'flex', flexDirection: 'column', p: 2, borderRadius: 0, borderRight: '1px solid rgba(255,255,255,0.1)', zIndex: 2, overflowY: 'auto' }}>
          <Typography variant="h6" gutterBottom>Grid Settings</Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Stack spacing={2}>
            <ToggleButtonGroup
              value={isPanningMode}
              exclusive
              onChange={(_, val) => val !== null && setIsPanningMode(val)}
              fullWidth
              size="small"
            >
              <ToggleButton value={true} sx={{ color: 'white' }}>
                <Hand size={18} style={{ marginRight: 8 }} /> Pan
              </ToggleButton>
              <ToggleButton value={false} sx={{ color: 'white' }}>
                <Palette size={18} style={{ marginRight: 8 }} /> Paint
              </ToggleButton>
            </ToggleButtonGroup>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Columns</Typography>
              <TextField 
                type="number" 
                size="small" 
                fullWidth 
                value={cols} 
                onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Rows</Typography>
              <TextField 
                type="number" 
                size="small" 
                fullWidth 
                value={rows} 
                onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </Box>
            
            <Button 
              variant="contained" 
              startIcon={<Grid3X3 size={18} />} 
              onClick={handleBuildGrid}
            >
              Build Grid
            </Button>
          </Stack>

          {!isPanningMode && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Cell Color</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: color === 'transparent' ? 'transparent' : color,
                      border: selectedColor === color ? '2px solid #90caf9' : '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {color === 'transparent' && <X size={14} color="white" />}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="subtitle2" gutterBottom>Zoom: {Math.round(zoom * 100)}%</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <IconButton size="small" onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}><ZoomOut size={18} /></IconButton>
            <Slider value={zoom} min={0.1} max={3} step={0.1} onChange={(_, v) => setZoom(v as number)} size="small" />
            <IconButton size="small" onClick={() => setZoom(Math.min(3, zoom + 0.1))}><ZoomIn size={18} /></IconButton>
          </Stack>
          
          <Button variant="outlined" startIcon={<Maximize size={16} />} onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>
            Reset View
          </Button>

          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Button fullWidth variant="outlined" color="inherit" onClick={onClose}>Close</Button>
          </Box>
        </Paper>

        {/* Workspace */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            position: 'relative', 
            overflow: 'auto', 
            bgcolor: '#000', 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Box 
            sx={{ 
              position: 'relative', 
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, 
              transformOrigin: 'center', 
              transition: isDragging ? 'none' : 'transform 0.1s ease-out', 
              lineHeight: 0,
              cursor: isPanningMode ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'
            }} 
            onMouseMove={handleMouseMove} 
            onMouseUp={handleMouseUp} 
            onMouseLeave={handleMouseUp} 
            onMouseDown={handleMouseDown}
          >
            <img ref={imageRef} src={imageUrl} alt="Workspace" draggable={false} style={{ display: 'block', userSelect: 'none' }} />
            
            {/* Cell Coloring Overlay */}
            {appliedGrid && (
              <Box
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${appliedGrid.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${appliedGrid.rows}, 1fr)`,
                  pointerEvents: isPanningMode ? 'none' : 'auto'
                }}
              >
                {Array.from({ length: appliedGrid.rows * appliedGrid.cols }).map((_, i) => {
                  const r = Math.floor(i / appliedGrid.cols);
                  const c = i % appliedGrid.cols;
                  const color = cellColors[`${r}-${c}`] || 'transparent';
                  return (
                    <Box
                      key={i}
                      onClick={() => handleCellClick(r, c)}
                      sx={{
                        border: `0.5px solid rgba(144, 202, 249, 0.3)`,
                        bgcolor: color,
                        '&:hover': {
                          bgcolor: !isPanningMode ? 'rgba(255, 255, 255, 0.1)' : color
                        }
                      }}
                    />
                  );
                })}
              </Box>
            )}

            {/* Grid Lines Overlay (Always on top) */}
            {appliedGrid && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {Array.from({ length: appliedGrid.cols + 1 }).map((_, i) => (
                  <line 
                    key={`v-${i}`} 
                    x1={`${(i / appliedGrid.cols) * 100}%`} 
                    y1="0" 
                    x2={`${(i / appliedGrid.cols) * 100}%`} 
                    y2="100%" 
                    stroke="rgba(144, 202, 249, 0.5)" 
                    strokeWidth={1 / zoom} 
                  />
                ))}
                {Array.from({ length: appliedGrid.rows + 1 }).map((_, i) => (
                  <line 
                    key={`h-${i}`} 
                    x1="0" 
                    y1={`${(i / appliedGrid.rows) * 100}%`} 
                    x2="100%" 
                    y2={`${(i / appliedGrid.rows) * 100}%`} 
                    stroke="rgba(144, 202, 249, 0.5)" 
                    strokeWidth={1 / zoom} 
                  />
                ))}
              </svg>
            )}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

// --- POLYGON EDITOR COMPONENT ---
const PolygonEditor: React.FC<{
  polygons: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  open: boolean;
  onClose: () => void;
}> = ({ polygons, setPolygons, open, onClose }) => {
  const [mode, setMode] = useState<'select' | 'polygon' | 'hand'>('select');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [newObjectName, setNewObjectName] = useState('');
  
  const [hoveredPolygonId, setHoveredPolygonId] = useState<string | null>(null);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  const [draggingVertex, setDraggingVertex] = useState<{ polyId: string; index: number } | null>(null);
  const [hasMovedVertex, setHasMovedVertex] = useState(false);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const imageUrl = "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=2000";

  const getCoordinates = (e: MouseEvent): Point => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (mode === 'polygon') {
      const point = getCoordinates(e);
      setCurrentPoints([...currentPoints, point]);
    } else if (mode === 'hand') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (mode === 'hand' && isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (draggingVertex) {
      const point = getCoordinates(e);
      setHasMovedVertex(true);
      setPolygons(polygons.map(p => {
        if (p.id === draggingVertex.polyId) {
          const newPoints = [...p.points];
          newPoints[draggingVertex.index] = point;
          return { ...p, points: newPoints };
        }
        return p;
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingVertex(null);
    setHasMovedVertex(false);
  };

  const savePolygon = () => {
    if (!newObjectName.trim()) return;
    const newPolygon: Polygon = {
      id: Math.random().toString(36).substr(2, 9),
      name: newObjectName,
      points: currentPoints,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    };
    setPolygons([...polygons, newPolygon]);
    setCurrentPoints([]);
    setNewObjectName('');
    setIsNameDialogOpen(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen maxWidth={false}>
      <Box sx={{ display: 'flex', height: '100%', bgcolor: '#121212', color: 'white', overflow: 'hidden' }}>
        <Paper elevation={3} sx={{ width: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 2, borderRadius: 0, borderRight: '1px solid rgba(255,255,255,0.1)', zIndex: 2 }}>
          <Tooltip title="Select" placement="right">
            <IconButton color={mode === 'select' ? 'primary' : 'default'} onClick={() => { setMode('select'); setCurrentPoints([]); }}>
              <MousePointer2 size={24} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Hand (Pan)" placement="right">
            <IconButton color={mode === 'hand' ? 'primary' : 'default'} onClick={() => setMode('hand')}>
              <Hand size={24} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Polygon Tool" placement="right">
            <IconButton color={mode === 'polygon' ? 'primary' : 'default'} onClick={() => { setMode('polygon'); setSelectedPolygonId(null); }}>
              <Pentagon size={24} />
            </IconButton>
          </Tooltip>
          <Divider sx={{ width: '80%', my: 1 }} />
          {currentPoints.length > 0 && (
            <>
              <Tooltip title="Confirm" placement="right">
                <IconButton color="success" disabled={currentPoints.length < 3} onClick={() => setIsNameDialogOpen(true)}>
                  <Check size={24} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel" placement="right">
                <IconButton color="error" onClick={() => setCurrentPoints([])}>
                  <X size={24} />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Box sx={{ mt: 'auto', pb: 2 }}>
            <Tooltip title="Close Editor" placement="right">
              <IconButton onClick={onClose} color="inherit"><X size={24} /></IconButton>
            </Tooltip>
          </Box>
        </Paper>

        <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'auto', bgcolor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <Box sx={{ position: 'relative', transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: 'center', transition: (isDragging || draggingVertex) ? 'none' : 'transform 0.1s ease-out', lineHeight: 0 }} onMouseDown={handleMouseDown}>
            <img ref={imageRef} src={imageUrl} alt="Workspace" draggable={false} style={{ display: 'block', userSelect: 'none' }} />
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {polygons.map((poly) => (
                <g key={poly.id} style={{ pointerEvents: mode === 'select' ? 'auto' : 'none' }} onMouseEnter={() => setHoveredPolygonId(poly.id)} onMouseLeave={() => setHoveredPolygonId(null)} onClick={() => setSelectedPolygonId(poly.id)}>
                  <polygon points={poly.points.map(p => `${p.x},${p.y}`).join(' ')} fill={poly.color} fillOpacity={hoveredPolygonId === poly.id || selectedPolygonId === poly.id ? "0.5" : "0.2"} stroke={poly.color} strokeWidth={selectedPolygonId === poly.id ? "3" : "1.5"} style={{ cursor: mode === 'select' ? 'pointer' : 'inherit' }} />
                  {(selectedPolygonId === poly.id || hoveredPolygonId === poly.id) && poly.points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={4 / zoom} fill="white" stroke={poly.color} strokeWidth={2 / zoom} style={{ pointerEvents: 'auto', cursor: 'move' }} onMouseDown={(e) => { e.stopPropagation(); setDraggingVertex({ polyId: poly.id, index: i }); setHasMovedVertex(false); }} onClick={(e) => { e.stopPropagation(); if (!hasMovedVertex && poly.points.length > 3) setPolygons(polygons.map(pr => pr.id === poly.id ? { ...pr, points: pr.points.filter((_, idx) => idx !== i) } : pr)); }} />
                  ))}
                </g>
              ))}
              {currentPoints.length > 0 && (
                <g>
                  <polygon points={currentPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(144, 202, 249, 0.2)" stroke="#90caf9" strokeWidth={2 / zoom} strokeDasharray="5,5" />
                  {currentPoints.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r={4 / zoom} fill="#90caf9" />))}
                </g>
              )}
            </svg>
          </Box>
        </Box>

        <Paper sx={{ width: 300, borderRadius: 0, borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', zIndex: 2 }}>
          <Box sx={{ p: 2 }}><Typography variant="h6">Controls & Objects</Typography></Box>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Zoom: {Math.round(zoom * 100)}%</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <IconButton size="small" onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}><ZoomOut size={18} /></IconButton>
              <Slider value={zoom} min={0.1} max={3} step={0.1} onChange={(_, v) => setZoom(v as number)} size="small" />
              <IconButton size="small" onClick={() => setZoom(Math.min(3, zoom + 0.1))}><ZoomIn size={18} /></IconButton>
            </Stack>
            <Button fullWidth size="small" variant="outlined" startIcon={<Maximize size={16} />} onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>Reset View</Button>
          </Box>
          <Divider />
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {polygons.length === 0 ? (<Box sx={{ p: 2, textAlign: 'center', opacity: 0.5 }}><Typography variant="body2">No objects yet.</Typography></Box>) : (
              <List dense>
                {polygons.map(poly => (
                  <ListItem key={poly.id} divider onClick={() => setSelectedPolygonId(poly.id)} sx={{ cursor: 'pointer', bgcolor: selectedPolygonId === poly.id ? 'rgba(144, 202, 249, 0.12)' : 'transparent' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: poly.color, mr: 2 }} />
                    <ListItemText primary={poly.name} secondary={`${poly.points.length} vertices`} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small" color="error" onClick={(e) => { e.stopPropagation(); setPolygons(polygons.filter(p => p.id !== poly.id)); }}><Trash2 size={16} /></IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Paper>

        <Dialog open={isNameDialogOpen} onClose={() => setIsNameDialogOpen(false)}>
          <DialogTitle>Name object</DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" label="Name" fullWidth variant="outlined" value={newObjectName} onChange={(e) => setNewObjectName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && savePolygon()} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsNameDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePolygon} variant="contained" disabled={!newObjectName.trim()}>Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Dialog>
  );
};

// --- MAIN DASHBOARD WIDGET ---
const PolygonTool: React.FC = () => {
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(false);

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
      {/* Polygon Management Widget */}
      <Paper elevation={3} sx={{ p: 3, width: 300, textAlign: 'center', borderRadius: 4, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, color: 'primary.main' }}>
          <Layout size={40} />
        </Box>
        <Typography variant="h5" gutterBottom fontWeight="bold">Polygon Widget</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Manage your image annotations.
        </Typography>
        
        <Box sx={{ bgcolor: 'rgba(144, 202, 249, 0.08)', borderRadius: 2, p: 2, mb: 3 }}>
          <Typography variant="h4" color="primary.main" fontWeight="bold">{polygons.length}</Typography>
          <Typography variant="caption" color="textSecondary">POLYGONS INSTALLED</Typography>
        </Box>

        <Button 
          variant="contained" 
          fullWidth 
          startIcon={<Edit size={18} />}
          onClick={() => setIsEditorOpen(true)}
          sx={{ borderRadius: 2, py: 1.5 }}
        >
          Edit Polygons
        </Button>
      </Paper>

      {/* Grid Configuration Widget */}
      <Paper elevation={3} sx={{ p: 3, width: 300, textAlign: 'center', borderRadius: 4, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, color: 'secondary.main' }}>
          <Grid3X3 size={40} />
        </Box>
        <Typography variant="h5" gutterBottom fontWeight="bold">Grid Widget</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Configure image grids.
        </Typography>
        
        <Box sx={{ bgcolor: 'rgba(244, 143, 177, 0.08)', borderRadius: 2, p: 2, mb: 3 }}>
          <Typography variant="h4" color="secondary.main" fontWeight="bold">Active</Typography>
          <Typography variant="caption" color="textSecondary">GRID SYSTEM READY</Typography>
        </Box>

        <Button 
          variant="contained" 
          color="secondary"
          fullWidth 
          startIcon={<Grid3X3 size={18} />}
          onClick={() => setIsGridOpen(true)}
          sx={{ borderRadius: 2, py: 1.5 }}
        >
          Configure Grid
        </Button>
      </Paper>

      {/* Dialogs */}
      <PolygonEditor 
        polygons={polygons} 
        setPolygons={setPolygons} 
        open={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
      />
      
      <GridEditor 
        open={isGridOpen} 
        onClose={() => setIsGridOpen(false)} 
      />
    </Box>
  );
};

export default PolygonTool;
