import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { generatePathData } from '../utils/circularSystem';
import { Layer } from '../types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface CurveCanvasProps {
  layers: Layer[];
  activeLayerId: string | null;
  onLayerMove: (id: string, dx: number, dy: number) => void;
  theme: 'light' | 'dark';
}

export const CurveCanvas: React.FC<CurveCanvasProps> = ({ layers, activeLayerId, onLayerMove, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction States
  const [dragState, setDragState] = useState<{ id: string, startX: number, startY: number } | null>(null);
  const [panState, setPanState] = useState<{ startX: number, startY: number, startViewBox: number[] } | null>(null);
  
  // Camera State
  const [viewBox, setViewBox] = useState<string>("-50 -50 100 100");
  const [isAutoFit, setIsAutoFit] = useState(true);

  // Optimization: Memoize path generation so it doesn't run on every pan/zoom frame
  const preparedLayers = useMemo(() => {
    return layers.map(layer => {
      if (!layer.visible) return null;
      const { pathData, bounds } = generatePathData(layer.text, layer.segmentLength);
      return {
        ...layer,
        pathData,
        bounds
      };
    });
  }, [layers]);

  // Calculate content bounds based on memoized data
  const contentBounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let hasVisible = false;

    preparedLayers.forEach(layer => {
      if (!layer || !layer.bounds) return;
      
      const lx = layer.x;
      const ly = layer.y;
      
      minX = Math.min(minX, layer.bounds.minX + lx);
      maxX = Math.max(maxX, layer.bounds.maxX + lx);
      minY = Math.min(minY, layer.bounds.minY + ly);
      maxY = Math.max(maxY, layer.bounds.maxY + ly);
      hasVisible = true;
    });

    if (!hasVisible) {
      return { minX: -50, maxX: 50, minY: -50, maxY: 50, width: 100, height: 100 };
    }

    return { 
      minX, maxX, minY, maxY, 
      width: maxX - minX, 
      height: maxY - minY 
    };
  }, [preparedLayers]);

  // Auto-fit Logic
  useEffect(() => {
    if (!isAutoFit) return;

    const paddingX = Math.max(100, contentBounds.width * 0.15); // 15% padding
    const paddingY = Math.max(100, contentBounds.height * 0.15);
    
    const vx = contentBounds.minX - paddingX;
    const vy = contentBounds.minY - paddingY;
    const vw = contentBounds.width + (paddingX * 2);
    const vh = contentBounds.height + (paddingY * 2);

    setViewBox(`${vx} ${vy} ${Math.max(vw, 100)} ${Math.max(vh, 100)}`);
  }, [contentBounds, isAutoFit]);


  // --- Zoom Logic ---
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setIsAutoFit(false);

    const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    const newW = vw * zoomFactor;
    const newH = vh * zoomFactor;
    const dx = (vw - newW) / 2;
    const dy = (vh - newH) / 2;

    setViewBox(`${vx + dx} ${vy + dy} ${newW} ${newH}`);
  }, [viewBox]);

  // --- Manual Pan Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsAutoFit(false);
      setPanState({
        startX: e.clientX,
        startY: e.clientY,
        startViewBox: viewBox.split(' ').map(Number)
      });
    }
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (panState) {
      const dxPx = e.clientX - panState.startX;
      const dyPx = e.clientY - panState.startY;

      const svg = containerRef.current?.querySelector('svg');
      if (!svg) return;
      
      const rect = svg.getBoundingClientRect();
      const [vx, vy, vw, vh] = panState.startViewBox;
      
      const scaleX = vw / rect.width;
      const scaleY = vh / rect.height;

      const newVx = vx - (dxPx * scaleX);
      const newVy = vy - (dyPx * scaleY);

      setViewBox(`${newVx} ${newVy} ${vw} ${vh}`);
    } else if (dragState) {
       const dx = e.clientX - dragState.startX;
       const dy = e.clientY - dragState.startY;

       const svg = containerRef.current?.querySelector('svg');
       if (svg) {
          const ctm = svg.getScreenCTM();
          if (ctm) {
            const scaledDx = dx / ctm.a;
            const scaledDy = dy / ctm.d;
            onLayerMove(dragState.id, scaledDx, scaledDy);
          }
       }
       setDragState(prev => prev ? { ...prev, startX: e.clientX, startY: e.clientY } : null);
    }
  }, [panState, dragState, onLayerMove]);

  const handleGlobalMouseUp = useCallback(() => {
    setPanState(null);
    setDragState(null);
  }, []);

  useEffect(() => {
    if (panState || dragState) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [panState, dragState, handleGlobalMouseMove, handleGlobalMouseUp]);


  // --- Layer Interaction ---
  const onLayerMouseDown = (e: React.MouseEvent, layerId: string, layerLocked: boolean) => {
    if (layerLocked) return;
    if (e.button !== 0) return; 
    e.stopPropagation();
    setDragState({ id: layerId, startX: e.clientX, startY: e.clientY });
  };

  const bgClass = theme === 'light' 
    ? 'bg-[#f6f5f0] border-[#e2e0d6]' 
    : 'bg-[#0a0a0a] border-[#262626]';

  return (
    <div 
      ref={containerRef} 
      className={`flex-1 w-full h-full relative overflow-hidden flex items-center justify-center border rounded-lg shadow-inner group transition-colors duration-500 ${bgClass}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        className={`w-full h-full ${panState ? 'cursor-grabbing' : 'cursor-grab'}`}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="geometricPrecision"
      >
        {preparedLayers.map((layer) => {
          if (!layer) return null;
          const isActive = layer.id === activeLayerId;
          
          return (
            <g 
              key={layer.id} 
              transform={`translate(${layer.x}, ${layer.y})`}
              className={`${layer.locked ? '' : 'cursor-move'}`}
              onMouseDown={(e) => onLayerMouseDown(e, layer.id, layer.locked)}
              style={{ opacity: dragState && dragState.id !== layer.id ? 0.4 : 1, transition: 'opacity 0.2s' }}
            >
              {/* Hit target for easier dragging */}
              <path 
                 d={layer.pathData} 
                 stroke="transparent" 
                 strokeWidth={Math.max(10, layer.segmentLength * 2)} 
                 fill="none" 
                 className="pointer-events-auto"
              />
              
              {/* Main Path - Clean Vector Line */}
              <path
                d={layer.pathData}
                stroke={layer.color}
                strokeWidth={isActive ? Math.max(0.75, layer.segmentLength * 0.1) : Math.max(0.5, layer.segmentLength * 0.075)}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="transition-colors duration-200"
                style={{ strokeOpacity: 0.9 }}
              />
            </g>
          );
        })}
      </svg>
      
      {/* Floating Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 items-end pointer-events-none">
         <div className="bg-white/90 p-1.5 rounded-lg shadow border border-slate-200 pointer-events-auto flex gap-1">
            <button 
              onClick={() => setIsAutoFit(true)}
              className={`p-1.5 rounded hover:bg-slate-100 ${isAutoFit ? 'text-brand-500 bg-brand-50' : 'text-slate-600'}`}
              title="Auto-Fit View"
            >
              <Maximize className="w-4 h-4" />
            </button>
            <div className="w-px bg-slate-200 mx-0.5"></div>
            <button 
               onClick={() => {
                  setIsAutoFit(false);
                  const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);
                  setViewBox(`${vx + vw*0.1} ${vy + vh*0.1} ${vw*0.8} ${vh*0.8}`);
               }}
               className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
               title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
               onClick={() => {
                  setIsAutoFit(false);
                  const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);
                  setViewBox(`${vx - vw*0.1} ${vy - vh*0.1} ${vw*1.2} ${vh*1.2}`);
               }}
               className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
               title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
         </div>

         <div className="bg-white/80 backdrop-blur px-2 py-1 rounded border border-slate-200 shadow-sm text-[10px] text-slate-500">
            {layers.filter(l => l.visible).length} layers • Right-click to Pan • Scroll to Zoom
         </div>
      </div>
    </div>
  );
};