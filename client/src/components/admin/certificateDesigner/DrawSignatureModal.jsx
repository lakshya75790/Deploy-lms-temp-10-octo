import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Trash2, Check, PenTool, Undo2 } from 'lucide-react';

const PEN_WIDTHS = [
  { label: 'Fine', value: 1.5 },
  { label: 'Medium', value: 2.5 },
  { label: 'Bold', value: 4.0 }
];

const PEN_COLORS = [
  { label: 'Navy Blue', value: '#1e3a8a', bgClass: 'bg-blue-900' },
  { label: 'Classic Black', value: '#0f172a', bgClass: 'bg-slate-900' },
  { label: 'Dark Slate', value: '#334155', bgClass: 'bg-slate-700' },
  { label: 'Royal Blue', value: '#1d4ed8', bgClass: 'bg-blue-700' }
];

export const DrawSignatureModal = ({ isOpen, onClose, onSave, initialTitle = 'Draw Signature' }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penWidth, setPenWidth] = useState(2.5);
  const [penColor, setPenColor] = useState('#1e3a8a');
  const [history, setHistory] = useState([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Save current canvas state to history stack for Undo
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-20), imageData]);
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!isOpen) return;

    setHistory([]);
    setHasDrawn(false);
    setWarningMessage('');

    // Setup canvas size with HiDPI ratio
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;
      canvas.width = (rect.width || 600) * dpr;
      canvas.height = (rect.height || 220) * dpr;
      ctx.scale(dpr, dpr);

      // Clear with transparent pixels
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    // Only handle primary button / touch / pen
    if (e.button !== undefined && e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setWarningMessage('');
    pushHistory();

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture fails on older browsers
    }

    setIsDrawing(true);
    setHasDrawn(true);

    const { x, y } = getCanvasCoords(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Draw a single dot in case it's a tap
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();

    try {
      if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    pushHistory();
    const rect = canvas.getBoundingClientRect();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasDrawn(false);
    setWarningMessage('');
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    const previousState = newHistory.pop();
    setHistory(newHistory);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
    }
    ctx.restore();

    // Check if remaining canvas has ink
    if (newHistory.length === 0) {
      setHasDrawn(false);
    }
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas is empty
    const ctx = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    const hasInk = pixelBuffer.some((pixel) => (pixel & 0xff000000) !== 0);

    if (!hasInk) {
      setWarningMessage('Please draw your signature before saving.');
      return;
    }

    // Export high-resolution transparent PNG Data URL
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {initialTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Draw using your mouse, tablet stylus, or touch screen. Signature background is 100% transparent.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Pen width & Ink color */}
        <div className="px-5 py-2.5 bg-slate-50/40 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Pen Width */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Pen:
            </span>
            {PEN_WIDTHS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setPenWidth(item.value)}
                className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all cursor-pointer border ${
                  penWidth === item.value
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Pen Color */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Ink:
            </span>
            {PEN_COLORS.map((col) => (
              <button
                key={col.label}
                type="button"
                onClick={() => setPenColor(col.value)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer border-2 ${
                  penColor === col.value
                    ? 'border-emerald-500 scale-110 shadow-xs'
                    : 'border-transparent hover:scale-105'
                }`}
                title={col.label}
              >
                <span className={`w-4 h-4 rounded-full ${col.bgClass}`} />
              </button>
            ))}
          </div>

          {/* Quick Undo & Clear */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
              title="Undo last stroke"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex items-center gap-1 cursor-pointer"
              title="Clear signature pad"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="p-5 flex flex-col items-center">
          <div className="relative w-full h-52 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] dark:bg-[linear-gradient(45deg,#0f172a_25%,transparent_25%),linear-gradient(-45deg,#0f172a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#0f172a_75%),linear-gradient(-45deg,transparent_75%,#0f172a_75%)] bg-[size:16px_16px] overflow-hidden select-none">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-full cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-600 text-xs font-medium">
                Sign above line with mouse, stylus, or finger
              </div>
            )}
            {/* Signature guideline line */}
            <div className="absolute bottom-9 left-6 right-6 border-b border-slate-300/60 dark:border-slate-700/60 pointer-events-none" />
          </div>

          {warningMessage && (
            <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 animate-in fade-in">
              {warningMessage}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveSignature}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            <span>Save Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
};

