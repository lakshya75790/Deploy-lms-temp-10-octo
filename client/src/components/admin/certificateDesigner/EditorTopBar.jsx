import React, { useState, useEffect, useRef } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid,
  Magnet,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Download,
  Loader2,
  LayoutTemplate,
  ChevronDown,
  FileImage,
  FileText,
  SlidersHorizontal,
  Maximize2,
  Minimize2
} from 'lucide-react';

export const EditorTopBar = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  showGrid,
  onToggleGrid,
  snapToGrid,
  onToggleSnap,
  previewMode,
  onTogglePreview,
  onReset,
  onSave,
  saving,
  onOpenTemplates,
  onExportPNG,
  onExportPDF,
  onToggleInspector,
  onToggleSidebar,
  hasSelectedElement = false,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef(null);

  // Close download dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setDownloadMenuOpen(false);
      }
    };
    if (downloadMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [downloadMenuOpen]);

  return (
    <header className="h-16 px-3 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 shadow-xs z-30 overflow-visible relative">
      {/* Left: Templates Switcher & Fixed Landscape Badge */}
      <div className="flex items-center space-x-2 shrink-0">
        <button
          type="button"
          onClick={onOpenTemplates}
          className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Browse & switch templates"
        >
          <LayoutTemplate className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="hidden xs:inline">Templates</span>
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Locked Landscape orientation badge */}
        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 text-[11px] font-bold hidden sm:inline-flex items-center gap-1">
          Landscape (1200×850)
        </span>
      </div>

      {/* Center: History, Zoom & Alignment Tools */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/80 dark:border-slate-700">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* Zoom Controls */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/80 dark:border-slate-700">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onZoomFit}
            className="px-2 py-1 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
            title="Fit to Screen"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* Grid & Snap Helpers */}
        <button
          type="button"
          onClick={onToggleGrid}
          className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            showGrid
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle Canvas Grid"
        >
          <Grid className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleSnap}
          className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            snapToGrid
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Snap to 10px Grid"
        >
          <Magnet className="w-4 h-4" />
        </button>

        {/* Mobile/Tablet Sidebar Tools Drawer Toggle Button */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer lg:hidden flex items-center gap-1.5"
            title="Toggle Design Tools Drawer"
          >
            <LayoutTemplate className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden xs:inline text-xs font-bold">Tools</span>
          </button>
        )}

        {/* Mobile/Tablet Inspector Toggle Button */}
        {onToggleInspector && (
          <button
            type="button"
            onClick={onToggleInspector}
            className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer lg:hidden flex items-center gap-1.5 ${
              hasSelectedElement
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Element Inspector"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden xs:inline text-xs">Inspect</span>
          </button>
        )}
      </div>

      {/* Right: Preview Mode, Full Screen Highlight, Reset, Export & Save */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {/* Toggle Preview Mode */}
        <button
          type="button"
          onClick={onTogglePreview}
          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            previewMode
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={previewMode ? 'Exit preview mode' : 'Preview certificate with sample recipient data'}
        >
          {previewMode ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span className="hidden sm:inline">Editing Mode</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Preview Data</span>
            </>
          )}
        </button>

        {/* Full Screen Mode Toggle */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-[0.98] ${
              isFullscreen
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Open Full Screen for a Better Editing Experience'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Open Full Screen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-white shrink-0" />
                <span className="hidden sm:inline font-bold">Exit Full Screen</span>
                <kbd className="hidden md:inline px-1.5 py-0.5 text-[9px] bg-emerald-700/90 dark:bg-emerald-800/90 rounded font-mono text-emerald-100 border border-emerald-500/40">
                  ESC
                </kbd>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="hidden sm:inline font-bold">Full Screen</span>
              </>
            )}
          </button>
        )}

        {/* Reset Button */}
        <button
          type="button"
          onClick={onReset}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          title="Reset to Template Defaults"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Download Sample Dropdown */}
        <div className="relative" ref={downloadMenuRef}>
          <button
            type="button"
            onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Export a sample certificate"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Test Export</span>
            <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {downloadMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 z-[100] animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  setDownloadMenuOpen(false);
                  onExportPNG();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FileImage className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Download Sample PNG</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDownloadMenuOpen(false);
                  onExportPDF();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Download Sample PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Save Template Primary Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-3.5 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden xs:inline">Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Design</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
