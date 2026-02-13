import React, { useState, useEffect, useRef } from 'react';
import { CurveCanvas } from './components/CurveCanvas';
import { Layer } from './types';
import { generatePathData, DEFAULT_SEGMENT_LENGTH } from './utils/circularSystem';
import { 
  Layers, Plus, Trash2, Eye, EyeOff, Lock, Unlock, 
  Play, Square, RefreshCw, Palette, Settings2, Target,
  Sun, Moon
} from 'lucide-react';

const COLORS = [
  '#1e293b', // Slate 800
  '#ef4444', // Red 500
  '#f97316', // Orange 500
  '#eab308', // Yellow 500
  '#22c55e', // Green 500
  '#06b6d4', // Cyan 500
  '#3b82f6', // Blue 500
  '#a855f7', // Purple 500
  '#ec4899', // Pink 500
  '#64748b', // Slate 500
];

export default function App() {
  const [layers, setLayers] = useState<Layer[]>([
    { 
      id: '1', 
      name: 'Base Layer', 
      text: 'Hello World', 
      color: '#1e293b', 
      x: 0, 
      y: 0, 
      locked: false, 
      visible: true,
      segmentLength: DEFAULT_SEGMENT_LENGTH
    }
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('1');
  const [isLooping, setIsLooping] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const loopIntervalRef = useRef<number | null>(null);
  const loopSeedRef = useRef<string>('');
  const loopIndexRef = useRef<number>(0);

  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0];

  const handleUpdateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleAddLayer = () => {
    const newId = crypto.randomUUID();
    const newLayer: Layer = {
      id: newId,
      name: `Layer ${layers.length + 1}`,
      text: '',
      color: COLORS[layers.length % COLORS.length],
      x: 0,
      y: 0,
      locked: false,
      visible: true,
      segmentLength: DEFAULT_SEGMENT_LENGTH
    };
    setLayers([...layers, newLayer]);
    setActiveLayerId(newId);
  };

  const handleDeleteLayer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (layers.length === 1) return;
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    if (activeLayerId === id) {
      setActiveLayerId(newLayers[0].id);
    }
  };

  const handleLayerMove = (id: string, dx: number, dy: number) => {
    setLayers(prev => prev.map(l => {
      if (l.id !== id) return l;
      return { ...l, x: l.x + dx, y: l.y + dy };
    }));
  };

  const handleCenterLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    const { bounds } = generatePathData(layer.text, layer.segmentLength);
    const centerX = bounds.minX + bounds.width / 2;
    const centerY = bounds.minY + bounds.height / 2;
    // Move layer such that center of shape is at 0,0
    handleUpdateLayer(id, { x: -centerX, y: -centerY });
  };

  // --- Loop Logic ---
  const startLoop = () => {
    if (!activeLayer) return;
    if (isLooping) return;

    // Use current text as seed
    loopSeedRef.current = activeLayer.text;
    loopIndexRef.current = 0;
    setIsLooping(true);
  };

  const stopLoop = () => {
    setIsLooping(false);
    if (loopIntervalRef.current) {
      window.clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (isLooping && activeLayer) {
      loopIntervalRef.current = window.setInterval(() => {
        const seed = loopSeedRef.current;
        if (!seed) return;

        // Next char to append
        const charToAdd = seed[loopIndexRef.current % seed.length];
        loopIndexRef.current += 1;

        // Functional update to ensure we have latest state
        setLayers(currentLayers => {
          const currentLayer = currentLayers.find(l => l.id === activeLayerId);
          if (!currentLayer) return currentLayers;

          const newText = currentLayer.text + charToAdd;
          
          // Check if we hit origin
          const { endPoint } = generatePathData(newText, currentLayer.segmentLength);
          const dist = Math.sqrt(endPoint.x ** 2 + endPoint.y ** 2);
          
          // Conditions for stopping:
          const minLen = Math.max(seed.length * 4, 40); 
          
          // Tightened threshold from (segmentLength * 0.5) to 0.5px for strict closure
          if (newText.length > minLen && dist < 0.5) {
            // Reached origin!
            stopLoop();
            
            // Auto-center the layer upon completion
            const { bounds } = generatePathData(newText, currentLayer.segmentLength);
            const cx = bounds.minX + bounds.width / 2;
            const cy = bounds.minY + bounds.height / 2;

            return currentLayers.map(l => l.id === activeLayerId ? { 
                ...l, 
                text: newText,
                x: -cx,
                y: -cy 
            } : l);
          }
          
          // Safety break
          if (newText.length > 8000) {
            stopLoop();
          }

          return currentLayers.map(l => l.id === activeLayerId ? { ...l, text: newText } : l);
        });

      }, 15); // Fast speed (15ms)
    } else {
      if (loopIntervalRef.current) {
        window.clearInterval(loopIntervalRef.current);
      }
    }
    return () => {
      if (loopIntervalRef.current) window.clearInterval(loopIntervalRef.current);
    };
  }, [isLooping, activeLayerId]);

  return (
    <div 
      className="flex flex-col md:flex-row h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden"
      onClick={() => setIsColorPickerOpen(false)} // Close picker on background click
    >
      
      {/* Sidebar */}
      <aside 
        className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent closing picker when clicking sidebar
      >
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
          <div className="p-2 bg-brand-500/10 rounded-lg border border-brand-500/20">
            <Layers className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100">Layer Composer</h1>
            <p className="text-xs text-slate-500">Multilayer 52-Degree System</p>
          </div>
        </div>

        {/* Layers List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Layers</span>
            <button 
              onClick={handleAddLayer}
              className="p-1 hover:bg-slate-800 rounded text-brand-400 hover:text-brand-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {layers.map(layer => (
            <div 
              key={layer.id}
              onClick={() => setActiveLayerId(layer.id)}
              className={`group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                activeLayerId === layer.id 
                  ? 'bg-slate-800 border-brand-500/50 shadow-md' 
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); handleUpdateLayer(layer.id, { visible: !layer.visible }); }}
                className={`p-1 rounded ${layer.visible ? 'text-slate-400 hover:text-slate-200' : 'text-slate-700'}`}
              >
                {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: layer.color }} />
                  <span className={`text-sm font-medium truncate ${activeLayerId === layer.id ? 'text-brand-100' : 'text-slate-400'}`}>
                    {layer.name}
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 truncate mt-0.5">
                   {layer.text.substring(0, 15) || "(empty)"}...
                </div>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); handleUpdateLayer(layer.id, { locked: !layer.locked }); }}
                className={`p-1 rounded ${layer.locked ? 'text-amber-500/80' : 'text-slate-700 hover:text-slate-400'}`}
              >
                {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>

              <button 
                onClick={(e) => handleDeleteLayer(layer.id, e)}
                className="p-1 rounded text-slate-700 hover:text-red-400 hover:bg-red-900/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Selected Layer Properties */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
           {activeLayer ? (
             <div className="space-y-4">
               {/* Name & Color */}
               <div className="flex gap-2 relative">
                  <input 
                    type="text" 
                    value={activeLayer.name}
                    onChange={(e) => handleUpdateLayer(activeLayer.id, { name: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:border-brand-500 outline-none"
                  />
                  <div className="relative">
                    <button 
                      onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                      className="w-8 h-8 rounded border border-slate-700 flex items-center justify-center bg-slate-950 hover:bg-slate-800 transition-colors"
                    >
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: activeLayer.color }} />
                    </button>
                    
                    {/* Color Popup - Click triggered now */}
                    {isColorPickerOpen && (
                      <div className="absolute bottom-full right-0 mb-2 p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl grid grid-cols-5 gap-1 w-[160px] z-50">
                        {COLORS.map(c => (
                          <button 
                            key={c}
                            onClick={() => {
                              handleUpdateLayer(activeLayer.id, { color: c });
                              setIsColorPickerOpen(false);
                            }}
                            className={`w-6 h-6 rounded-full border border-transparent hover:scale-110 transition-transform ${activeLayer.color === c ? 'ring-2 ring-white' : ''}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
               </div>

               {/* Segment Length Slider & Center Button */}
               <div className="space-y-1">
                 <div className="flex justify-between items-center text-xs text-slate-500">
                   <label className="flex items-center gap-1"><Settings2 className="w-3 h-3" /> Line Length</label>
                   
                   <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleCenterLayer(activeLayer.id)}
                      className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors border border-slate-700"
                      title="Center layer in view"
                    >
                      <Target className="w-3 h-3" /> Center
                    </button>
                    <span>{activeLayer.segmentLength}px</span>
                   </div>
                 </div>
                 <input 
                   type="range" 
                   min="2" 
                   max="50" 
                   step="1"
                   value={activeLayer.segmentLength}
                   onChange={(e) => handleUpdateLayer(activeLayer.id, { segmentLength: parseInt(e.target.value) })}
                   className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                 />
               </div>

               {/* Text Input */}
               <div className="space-y-1">
                 <textarea
                   value={activeLayer.text}
                   onChange={(e) => handleUpdateLayer(activeLayer.id, { text: e.target.value })}
                   placeholder="Type layer text..."
                   className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm font-mono focus:border-brand-500 outline-none resize-none"
                   spellCheck={false}
                   disabled={isLooping}
                 />
               </div>

               {/* Loop Controls */}
               <div className="space-y-2 pt-2 border-t border-slate-800/50">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Auto-Loop Generator
                  </label>
                  <div className="flex gap-2">
                    {!isLooping ? (
                      <button 
                        onClick={startLoop}
                        disabled={!activeLayer.text}
                        className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs py-2 px-3 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Play className="w-3 h-3" fill="currentColor" /> Play Loop
                      </button>
                    ) : (
                      <button 
                        onClick={stopLoop}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs py-2 px-3 rounded flex items-center justify-center gap-2 animate-pulse"
                      >
                        <Square className="w-3 h-3" fill="currentColor" /> Stop
                      </button>
                    )}
                  </div>
               </div>
             </div>
           ) : (
             <div className="text-center text-slate-500 text-sm py-4">Select a layer to edit</div>
           )}
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 bg-slate-100 relative shadow-inner">
        <CurveCanvas 
          layers={layers} 
          activeLayerId={activeLayerId}
          onLayerMove={handleLayerMove}
          theme={theme}
        />
        
        {/* Helper Overlay */}
        <div className="absolute top-4 left-4 pointer-events-none">
           <div className="bg-white/80 backdrop-blur px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-xs text-slate-600">
             <p className="font-semibold text-slate-800 mb-1">Interactions</p>
             <ul className="space-y-1 list-disc list-inside opacity-80">
               <li>Select layer in sidebar to edit text</li>
               <li>Drag visible curves to reposition</li>
               <li>Lock layers to prevent movement</li>
               <li>Use "Play Loop" to find symmetry</li>
             </ul>
           </div>
        </div>

        {/* Theme Toggle Overlay */}
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            className={`p-2 rounded-full border shadow-sm transition-colors ${theme === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100'}`}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </main>
    </div>
  );
}