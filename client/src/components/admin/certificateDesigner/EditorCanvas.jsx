import React, { useRef, useState, useEffect } from 'react';
import { replaceTokens, renderSvgShape, clamp } from './designerUtils';
import { renderCertificateBorder } from './borderDesigns';
import { Lock, EyeOff } from 'lucide-react';

export const EditorCanvas = ({
  design,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onCommitHistory,
  zoom = 1,
  showGrid = true,
  snapToGrid = false,
  previewMode = false,
  sampleData = {},
  svgRef
}) => {
  const containerRef = useRef(null);
  const [interaction, setInteraction] = useState(null); 
  // interaction: { type: 'drag'|'resize'|'rotate', elementId, startMouseX, startMouseY, initialElem, handle }

  const width = design.width || 1200;
  const height = design.height || 850;
  const elements = design.elements || [];

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Convert client viewport coordinates (mouse or touch) to SVG canvas internal coordinates
  const getCanvasCoords = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const clientX = e.clientX !== undefined
      ? e.clientX
      : (e.touches && e.touches[0] ? e.touches[0].clientX : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0));
    const clientY = e.clientY !== undefined
      ? e.clientY
      : (e.touches && e.touches[0] ? e.touches[0].clientY : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0));
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Mouse Down for Dragging an Element
  const handleElementMouseDown = (e, element) => {
    if (previewMode) return;
    e.stopPropagation();
    onSelectElement(element.id);

    if (element.locked) return;

    const coords = getCanvasCoords(e);
    setInteraction({
      type: 'drag',
      elementId: element.id,
      startCoords: coords,
      initialElem: { ...element },
      hasMoved: false
    });
  };

  // Mouse Down on Resize Handles
  const handleResizeMouseDown = (e, handle) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.locked || previewMode) return;

    const coords = getCanvasCoords(e);
    setInteraction({
      type: 'resize',
      elementId: selectedElement.id,
      handle,
      startCoords: coords,
      initialElem: { ...selectedElement },
      hasMoved: false
    });
  };

  // Mouse Down on Rotate Handle
  const handleRotateMouseDown = (e) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.locked || previewMode) return;

    const coords = getCanvasCoords(e);
    setInteraction({
      type: 'rotate',
      elementId: selectedElement.id,
      startCoords: coords,
      initialElem: { ...selectedElement },
      hasMoved: false
    });
  };

  // Global Mouse Move and Mouse Up handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!interaction) return;
      if (e.touches && e.cancelable) {
        e.preventDefault();
      }

      const currentCoords = getCanvasCoords(e);
      const dx = currentCoords.x - interaction.startCoords.x;
      const dy = currentCoords.y - interaction.startCoords.y;
      const initial = interaction.initialElem;

      if (interaction.type === 'drag') {
        let newX = Math.round(initial.x + dx);
        let newY = Math.round(initial.y + dy);

        if (snapToGrid) {
          newX = Math.round(newX / 10) * 10;
          newY = Math.round(newY / 10) * 10;
        }

        onUpdateElement(interaction.elementId, { x: newX, y: newY }, false);
        interaction.hasMoved = true;
      } else if (interaction.type === 'resize') {
        const handle = interaction.handle;
        let newX = initial.x;
        let newY = initial.y;
        let newW = initial.width;
        let newH = initial.height;

        const isLockAspect = initial.type === 'image' || initial.shapeType === 'gold-seal' || initial.shapeType === 'circle';
        const aspectRatio = initial.width / (initial.height || 1);

        if (handle.includes('e')) {
          newW = Math.max(20, initial.width + dx);
        }
        if (handle.includes('s')) {
          newH = Math.max(10, initial.height + dy);
        }
        if (handle.includes('w')) {
          const potentialW = initial.width - dx;
          if (potentialW >= 20) {
            newW = potentialW;
            newX = initial.x + dx;
          }
        }
        if (handle.includes('n')) {
          const potentialH = initial.height - dy;
          if (potentialH >= 10) {
            newH = potentialH;
            newY = initial.y + dy;
          }
        }

        if (isLockAspect && (handle === 'se' || handle === 'sw' || handle === 'ne' || handle === 'nw')) {
          newH = Math.round(newW / aspectRatio);
        }

        if (snapToGrid) {
          newW = Math.round(newW / 10) * 10;
          newH = Math.round(newH / 10) * 10;
        }

        onUpdateElement(interaction.elementId, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH)
        }, false);
        interaction.hasMoved = true;
      } else if (interaction.type === 'rotate') {
        const centerX = initial.x + initial.width / 2;
        const centerY = initial.y + initial.height / 2;
        const rad = Math.atan2(currentCoords.y - centerY, currentCoords.x - centerX);
        let deg = Math.round((rad * 180) / Math.PI + 90);

        if (deg < -180) deg += 360;
        if (deg > 180) deg -= 360;

        // Snap near 0, 90, -90, 180
        if (Math.abs(deg) <= 3) deg = 0;
        if (Math.abs(deg - 90) <= 3) deg = 90;
        if (Math.abs(deg + 90) <= 3) deg = -90;
        if (Math.abs(deg - 180) <= 3 || Math.abs(deg + 180) <= 3) deg = 180;

        onUpdateElement(interaction.elementId, { rotation: deg }, false);
        interaction.hasMoved = true;
      }
    };

    const handleMouseUp = () => {
      if (interaction) {
        if (interaction.hasMoved) {
          onCommitHistory();
        }
        setInteraction(null);
      }
    };

    if (interaction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
      window.addEventListener('touchcancel', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchcancel', handleMouseUp);
    };
  }, [interaction, snapToGrid, onUpdateElement, onCommitHistory]);

  // Handle Canvas background click (deselect)
  const handleBackgroundClick = (e) => {
    if (e.target === svgRef.current || e.target.id === 'canvas-bg-rect') {
      onSelectElement(null);
    }
  };

  // Render an individual element
  const renderElement = (el) => {
    if (el.hidden && previewMode) return null;

    const isSelected = selectedElementId === el.id && !previewMode;
    const opacity = el.hidden ? 0.35 : el.opacity !== undefined ? el.opacity : 1;
    const transform = `translate(${el.x}, ${el.y}) rotate(${el.rotation || 0}, ${el.width / 2}, ${el.height / 2})`;

    let contentNode = null;

    if (el.type === 'text') {
      const rawText = el.content || '';
      const displayText = previewMode ? replaceTokens(rawText, sampleData) : rawText;
      const lines = displayText.split('\n');
      const fontSize = el.fontSize || 16;
      const lineHeightMultiplier = el.lineHeight || 1.3;
      const stepY = fontSize * lineHeightMultiplier;

      // Text Anchor based on textAlign
      let textAnchor = 'middle';
      let textX = el.width / 2;
      if (el.textAlign === 'left') {
        textAnchor = 'start';
        textX = 0;
      } else if (el.textAlign === 'right') {
        textAnchor = 'end';
        textX = el.width;
      }

      contentNode = (
        <text
          x={textX}
          y={fontSize}
          textAnchor={textAnchor}
          fill={el.color || '#0f172a'}
          fontSize={fontSize}
          fontFamily={el.fontFamily || 'Inter, sans-serif'}
          fontWeight={el.fontWeight || 'normal'}
          fontStyle={el.fontStyle || 'normal'}
          textDecoration={el.textDecoration || 'none'}
          letterSpacing={el.letterSpacing ? `${el.letterSpacing}px` : undefined}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {lines.map((line, idx) => (
            <tspan key={idx} x={textX} dy={idx === 0 ? 0 : stepY}>
              {line || ' '}
            </tspan>
          ))}
        </text>
      );
    } else if (el.type === 'shape') {
      contentNode = renderSvgShape(el);
    } else if (el.type === 'image') {
      contentNode = (
        <image
          href={el.src}
          xlinkHref={el.src}
          x={0}
          y={0}
          width={el.width}
          height={el.height}
          preserveAspectRatio={el.objectFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
          style={{ pointerEvents: 'none' }}
        />
      );
    } else if (el.type === 'signature') {
      contentNode = (
        <g>
          {el.src ? (
            <image
              href={el.src}
              xlinkHref={el.src}
              x={0}
              y={0}
              width={el.width}
              height={el.height - (el.showLine ? 40 : 0)}
              preserveAspectRatio="xMidYMid meet"
              style={{ pointerEvents: 'none' }}
            />
          ) : (
            <rect
              x={0}
              y={0}
              width={el.width}
              height={el.height - 40}
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeDasharray="4 4"
            />
          )}

          {el.showLine !== false && (
            <line
              x1={0}
              y1={el.height - 35}
              x2={el.width}
              y2={el.height - 35}
              stroke={el.lineColor || '#94a3b8'}
              strokeWidth={1.5}
            />
          )}

          <text
            x={el.width / 2}
            y={el.height - 18}
            textAnchor="middle"
            fill="#334155"
            fontSize={13}
            fontWeight="bold"
            fontFamily="Inter, sans-serif"
            style={{ pointerEvents: 'none' }}
          >
            {el.signerName || 'Authorized Signatory'}
          </text>
          {el.signerTitle && (
            <text
              x={el.width / 2}
              y={el.height - 4}
              textAnchor="middle"
              fill="#64748b"
              fontSize={11}
              fontFamily="Inter, sans-serif"
              style={{ pointerEvents: 'none' }}
            >
              {el.signerTitle}
            </text>
          )}
        </g>
      );
    }

    return (
      <g
        key={el.id}
        id={`element-${el.id}`}
        transform={transform}
        opacity={opacity}
        onMouseDown={(e) => handleElementMouseDown(e, el)}
        onTouchStart={(e) => handleElementMouseDown(e, el)}
        className={`cursor-pointer transition-opacity ${el.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
        style={{ pointerEvents: previewMode ? 'none' : 'auto' }}
      >
        {/* Invisible hit-area bounding box to ensure effortless clicking */}
        <rect
          x={-4}
          y={-4}
          width={el.width + 8}
          height={el.height + 8}
          fill="transparent"
          stroke="transparent"
        />

        {contentNode}

        {/* Selected Bounding Box & Handles */}
        {isSelected && (
          <g className="selection-box" style={{ pointerEvents: 'auto' }}>
            <rect
              x={-2}
              y={-2}
              width={el.width + 4}
              height={el.height + 4}
              fill="none"
              stroke="#059669"
              strokeWidth={2}
              strokeDasharray={el.locked ? '4 4' : 'none'}
            />

            {/* If Locked, show small lock badge */}
            {el.locked ? (
              <g transform={`translate(${el.width / 2 - 12}, -24)`}>
                <rect x={0} y={0} width={24} height={20} rx={4} fill="#dc2626" />
                <text x={12} y={14} fill="#ffffff" fontSize={10} textAnchor="middle" fontWeight="bold">
                  🔒
                </text>
              </g>
            ) : (
              <>
                {/* Rotate Handle */}
                <g
                  transform={`translate(${el.width / 2}, -24)`}
                  onMouseDown={handleRotateMouseDown}
                  onTouchStart={handleRotateMouseDown}
                  className="cursor-grab"
                >
                  <line x1={0} y1={24} x2={0} y2={6} stroke="#059669" strokeWidth={1.5} />
                  <circle cx={0} cy={0} r={7} fill="#ffffff" stroke="#059669" strokeWidth={2} />
                  <circle cx={0} cy={0} r={2.5} fill="#059669" />
                </g>

                {/* 8 Resize Handles */}
                {/* Top-Left */}
                <rect
                  x={-6}
                  y={-6}
                  width={10}
                  height={10}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={2}
                  className="cursor-nwse-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
                  onTouchStart={(e) => handleResizeMouseDown(e, 'nw')}
                />
                {/* Top-Center */}
                <rect
                  x={el.width / 2 - 5}
                  y={-6}
                  width={10}
                  height={10}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={2}
                  className="cursor-ns-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
                  onTouchStart={(e) => handleResizeMouseDown(e, 'n')}
                />
                {/* Top-Right */}
                <rect
                  x={el.width - 4}
                  y={-6}
                  width={10}
                  height={10}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={2}
                  className="cursor-nesw-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
                  onTouchStart={(e) => handleResizeMouseDown(e, 'ne')}
                />
                {/* Middle-Right */}
                <rect
                  x={el.width - 4}
                  y={el.height / 2 - 5}
                  width={10}
                  height={10}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={2}
                  className="cursor-ew-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
                  onTouchStart={(e) => handleResizeMouseDown(e, 'e')}
                />
                {/* Bottom-Right */}
                <rect
                  x={el.width - 4}
                  y={el.height - 4}
                  width={10}
                  height={10}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={2}
                  className="cursor-nwse-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                  onTouchStart={(e) => handleResizeMouseDown(e, 'se')}
                />
                {/* Bottom-Center */}
                <rect
                  x={el.width / 2 - 5}
                  y={el.height - 4}
                  width={10}
                  height={10}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={2}
                  className="cursor-ns-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 's')}
                  onTouchStart={(e) => handleResizeMouseDown(e, 's')}
                />
                {/* Bottom-Left */}
                <rect
                  x={-6}
                  y={el.height - 4}
                  width={10}
                  height={10}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={2}
                  className="cursor-nesw-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
                  onTouchStart={(e) => handleResizeMouseDown(e, 'sw')}
                />
                {/* Middle-Left */}
                <rect
                  x={-6}
                  y={el.height / 2 - 5}
                  width={10}
                  height={10}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={2}
                  className="cursor-ew-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
                  onTouchStart={(e) => handleResizeMouseDown(e, 'w')}
                />

                {/* Dimension label badge below element */}
                <g transform={`translate(${el.width / 2}, ${el.height + 18})`}>
                  <rect
                    x={-40}
                    y={-10}
                    width={80}
                    height={18}
                    rx={4}
                    fill="#0f172a"
                    opacity={0.85}
                  />
                  <text
                    x={0}
                    y={3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={10}
                    fontFamily="monospace"
                  >
                    {Math.round(el.width)} × {Math.round(el.height)}
                  </text>
                </g>
              </>
            )}
          </g>
        )}
      </g>
    );
  };

  // Sort elements by zIndex before rendering
  const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  const bg = design.background || {};
  const isGradient = bg.type === 'gradient';

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full min-h-[360px] p-2 sm:p-4 md:p-6 overflow-auto select-none bg-slate-200/50 dark:bg-slate-950/60"
      onClick={handleBackgroundClick}
    >
      <div
        className="transition-transform duration-100 ease-out flex items-center justify-center drop-shadow-2xl"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        <svg
          ref={svgRef}
          id="advanced-certificate-canvas"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="bg-white rounded-lg shadow-2xl overflow-hidden block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Dynamic Background Gradient */}
            {isGradient && (
              <linearGradient id="canvas-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={bg.gradientStart || '#ffffff'} />
                <stop offset="100%" stopColor={bg.gradientEnd || '#f8fafc'} />
              </linearGradient>
            )}

            {/* Grid Pattern for Canvas Alignment */}
            {showGrid && !previewMode && (
              <pattern id="editor-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
              </pattern>
            )}
          </defs>

          {/* Background Surface */}
          <rect
            id="canvas-bg-rect"
            x={0}
            y={0}
            width={width}
            height={height}
            fill={isGradient ? 'url(#canvas-bg-grad)' : bg.color || '#ffffff'}
          />

          {/* Optional Grid Overlay */}
          {showGrid && !previewMode && (
            <rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill="url(#editor-grid)"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* 20+ Outer Inset Border Designs */}
          {renderCertificateBorder(
            bg.borderStyle,
            width,
            height,
            bg.borderColor || '#d97706',
            bg.borderWidth || 3,
            'editor-canvas-border'
          )}

          {/* Center Guide Crosshair in Edit Mode when moving elements */}
          {interaction && (
            <g style={{ pointerEvents: 'none' }} opacity={0.4}>
              <line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke="#059669" strokeWidth={1} strokeDasharray="4 4" />
              <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#059669" strokeWidth={1} strokeDasharray="4 4" />
            </g>
          )}

          {/* Render Elements in Z-Index Order */}
          {sortedElements.map(renderElement)}
        </svg>
      </div>
    </div>
  );
};

