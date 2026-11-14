import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';
import { ConfirmationModal } from '../../common/ConfirmationModal';
import { EditorTopBar } from './EditorTopBar';
import { EditorLeftSidebar } from './EditorLeftSidebar';
import { EditorCanvas } from './EditorCanvas';
import { EditorPropertiesPanel } from './EditorPropertiesPanel';
import {
  TEMPLATE_PRESETS,
  BLANK_CANVAS_DESIGN,
  SAMPLE_DATA
} from './designerConstants';
import {
  cloneDeep,
  generateElementId
} from './designerUtils';
import {
  exportCertificatePNG,
  exportCertificatePDF
} from '../../common/CertificateCanvas';

export const AdvancedCertificateEditor = ({
  initialDesign,
  initialTemplateSettings,
  onSaveDesign,
  saving = false,
  sampleData = SAMPLE_DATA
}) => {
  // Initialize canvas design from passed template settings or default classic gold
  const getInitialDesign = () => {
    let base = null;
    if (initialDesign && initialDesign.elements && initialDesign.elements.length > 0) {
      base = cloneDeep(initialDesign);
    } else if (initialTemplateSettings?.customDesign && initialTemplateSettings.customDesign.elements) {
      base = cloneDeep(initialTemplateSettings.customDesign);
    } else {
      base = cloneDeep(TEMPLATE_PRESETS[0].design);
    }

    // Always enforce landscape 1200x850
    base.orientation = 'landscape';
    base.width = 1200;
    base.height = 850;
    return base;
  };

  const [design, setDesign] = useState(getInitialDesign);
  const [history, setHistory] = useState(() => [getInitialDesign()]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedElementId, setSelectedElementId] = useState(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState('templates');
  const [zoom, setZoom] = useState(0.75);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const svgRef = useRef(null);
  const editorContainerRef = useRef(null);
  const rootContainerRef = useRef(null);

  // Dynamic responsive auto-fit zoom
  const updateFitZoom = useCallback(() => {
    if (editorContainerRef.current) {
      const containerWidth = editorContainerRef.current.clientWidth - 40;
      const containerHeight = editorContainerRef.current.clientHeight - 40;
      const targetWidth = 1200;
      const targetHeight = 850;
      if (containerWidth > 60 && containerHeight > 60) {
        const scaleW = containerWidth / targetWidth;
        const scaleH = containerHeight / targetHeight;
        const optimal = Math.min(scaleW, scaleH);
        setZoom(Math.max(0.2, Math.min(1.4, optimal)));
      }
    }
  }, []);

  // Listen for resize and container dimension changes
  useEffect(() => {
    updateFitZoom();
    window.addEventListener('resize', updateFitZoom);

    let observer = null;
    if (editorContainerRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateFitZoom();
      });
      observer.observe(editorContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateFitZoom);
      if (observer) observer.disconnect();
    };
  }, [updateFitZoom]);

  // Full Screen Mode Handlers
  const handleExitFullscreen = useCallback(async () => {
    try {
      if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch {
      // Graceful fallback for non-native or interrupted exit
    }
    setIsFullscreen(false);
  }, []);

  const handleEnterFullscreen = useCallback(async () => {
    try {
      const el = rootContainerRef.current || document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
    } catch {
      // Non-blocking fallback to CSS-based viewport fullscreen
    }
    setIsFullscreen(true);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      handleExitFullscreen();
    } else {
      handleEnterFullscreen();
    }
  }, [isFullscreen, handleExitFullscreen, handleEnterFullscreen]);

  // Sync state if user exits native fullscreen with browser default controls
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNative = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      if (!isNative && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Lock body scroll and trigger smooth fit zoom when fullscreen changes
  useEffect(() => {
    updateFitZoom();
    const t1 = setTimeout(updateFitZoom, 60);
    const t2 = setTimeout(updateFitZoom, 200);

    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isFullscreen, updateFitZoom]);

  // Push new state to history
  const pushHistory = useCallback(
    (newDesign) => {
      const cloned = cloneDeep(newDesign);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const next = [...sliced, cloned];
        if (next.length > 30) next.shift(); // Max 30 history frames
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 29));
      setDesign(cloned);
    },
    [historyIndex]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetState = cloneDeep(history[targetIndex]);
      setDesign(targetState);
      setHistoryIndex(targetIndex);
    }
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetState = cloneDeep(history[targetIndex]);
      setDesign(targetState);
      setHistoryIndex(targetIndex);
    }
  }, [historyIndex, history]);

  // Selected element object
  const selectedElement = (design.elements || []).find((el) => el.id === selectedElementId);

  // Update an element (with or without committing to history)
  const handleUpdateElement = useCallback(
    (elementId, partialProps, commit = true) => {
      setDesign((prev) => {
        const elements = (prev.elements || []).map((el) => {
          if (el.id === elementId) {
            return { ...el, ...partialProps };
          }
          return el;
        });
        const updated = { ...prev, elements };
        if (commit) {
          pushHistory(updated);
        }
        return updated;
      });
    },
    [pushHistory]
  );

  // Add a new element to the canvas
  const handleAddElement = useCallback(
    (elemProps) => {
      const id = generateElementId(elemProps.type || 'el');
      const currentElements = design.elements || [];
      const highestZ = currentElements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);

      const centerX = Math.round((1200 - (elemProps.width || 200)) / 2);
      const centerY = Math.round((850 - (elemProps.height || 60)) / 2);

      const newElem = {
        id,
        x: elemProps.x !== undefined ? elemProps.x : centerX,
        y: elemProps.y !== undefined ? elemProps.y : centerY,
        width: elemProps.width || 200,
        height: elemProps.height || 60,
        rotation: elemProps.rotation || 0,
        opacity: elemProps.opacity !== undefined ? elemProps.opacity : 1,
        zIndex: highestZ + 1,
        locked: false,
        hidden: false,
        ...elemProps
      };

      const nextDesign = {
        ...design,
        elements: [...currentElements, newElem]
      };

      pushHistory(nextDesign);
      setSelectedElementId(id);
      setMobileInspectorOpen(true);
    },
    [design, pushHistory]
  );

  // Delete element
  const handleDeleteElement = useCallback(
    (elementId) => {
      const nextDesign = {
        ...design,
        elements: (design.elements || []).filter((el) => el.id !== elementId)
      };
      pushHistory(nextDesign);
      if (selectedElementId === elementId) {
        setSelectedElementId(null);
        setMobileInspectorOpen(false);
      }
    },
    [design, selectedElementId, pushHistory]
  );

  // Duplicate element
  const handleDuplicateElement = useCallback(
    (elementId) => {
      const target = (design.elements || []).find((el) => el.id === elementId);
      if (!target) return;

      const newId = generateElementId(target.type);
      const highestZ = (design.elements || []).reduce((max, el) => Math.max(max, el.zIndex || 0), 0);

      const clonedElem = {
        ...cloneDeep(target),
        id: newId,
        x: target.x + 20,
        y: target.y + 20,
        zIndex: highestZ + 1,
        locked: false
      };

      const nextDesign = {
        ...design,
        elements: [...design.elements, clonedElem]
      };

      pushHistory(nextDesign);
      setSelectedElementId(newId);
    },
    [design, pushHistory]
  );

  // Reorder layer depth
  const handleReorderElement = useCallback(
    (elementId, direction) => {
      const elements = [...(design.elements || [])];
      const index = elements.findIndex((el) => el.id === elementId);
      if (index === -1) return;

      if (direction === 'up' && index < elements.length - 1) {
        const temp = elements[index];
        elements[index] = elements[index + 1];
        elements[index + 1] = temp;
      } else if (direction === 'down' && index > 0) {
        const temp = elements[index];
        elements[index] = elements[index - 1];
        elements[index - 1] = temp;
      } else if (direction === 'top') {
        const item = elements.splice(index, 1)[0];
        elements.push(item);
      } else if (direction === 'bottom') {
        const item = elements.splice(index, 1)[0];
        elements.unshift(item);
      }

      // Re-normalize zIndex 1..N
      const updatedElements = elements.map((el, i) => ({ ...el, zIndex: i + 1 }));
      const nextDesign = { ...design, elements: updatedElements };
      pushHistory(nextDesign);
    },
    [design, pushHistory]
  );

  // Update background settings
  const handleUpdateBackground = useCallback(
    (partialBg) => {
      const nextDesign = {
        ...design,
        background: {
          ...(design.background || {}),
          ...partialBg
        }
      };
      pushHistory(nextDesign);
    },
    [design, pushHistory]
  );

  // Apply a new template (Option A or Option B)
  const handleApplyTemplate = useCallback(
    (newDesign) => {
      const cloned = cloneDeep(newDesign);
      cloned.orientation = 'landscape';
      cloned.width = 1200;
      cloned.height = 850;
      setDesign(cloned);
      setHistory([cloned]);
      setHistoryIndex(0);
      setSelectedElementId(null);
      setMobileInspectorOpen(false);
    },
    []
  );

  // Reset to original preset
  const handleResetDesign = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const handleConfirmResetDesign = useCallback(() => {
    handleApplyTemplate(TEMPLATE_PRESETS[0].design);
    setShowResetConfirm(false);
  }, [handleApplyTemplate]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedElementId) {
          handleDuplicateElement(selectedElementId);
        }
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteElement(selectedElementId);
        }
        return;
      }

      // Escape: If in Full Screen Mode, exit Full Screen; otherwise close drawers or deselect
      if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          handleExitFullscreen();
          return;
        }
        if (mobileSidebarOpen) {
          setMobileSidebarOpen(false);
          return;
        }
        if (mobileInspectorOpen) {
          setMobileInspectorOpen(false);
          return;
        }
        setSelectedElementId(null);
        return;
      }

      // Arrow keys: Nudge selected element position
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedElementId) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        const el = (design.elements || []).find((elem) => elem.id === selectedElementId);
        if (el && !el.locked) {
          handleUpdateElement(selectedElementId, { x: el.x + dx, y: el.y + dy }, true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    selectedElementId,
    handleDuplicateElement,
    handleDeleteElement,
    handleUpdateElement,
    design.elements,
    isFullscreen,
    handleExitFullscreen
  ]);

  // Export handlers
  const handleExportPNG = () => {
    exportCertificatePNG('advanced-certificate-canvas', 'Certificate-Sample.png');
  };

  const handleExportPDF = () => {
    exportCertificatePDF('advanced-certificate-canvas', 'Certificate-Sample.pdf');
  };

  return (
    <div
      ref={rootContainerRef}
      className={`
        flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden
        ${
          isFullscreen
            ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none border-none shadow-none m-0'
            : 'h-[calc(100vh-140px)] min-h-[600px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md animate-in fade-in duration-200'
        }
      `}
    >
      {/* 1. Top Control Bar (Landscape Locked & Full Screen Enabled) */}
      <EditorTopBar
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(1.6, z + 0.1))}
        onZoomOut={() => setZoom((z) => Math.max(0.25, z - 0.1))}
        onZoomFit={updateFitZoom}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode(!previewMode)}
        onReset={handleResetDesign}
        onSave={() => onSaveDesign(design)}
        saving={saving}
        onOpenTemplates={() => setActiveSidebarTab('templates')}
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
        onToggleInspector={() => setMobileInspectorOpen((prev) => !prev)}
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        hasSelectedElement={Boolean(selectedElementId)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Full Screen Information Highlight Card */}
      {!isFullscreen && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50/40 dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-emerald-950/30 border-b border-emerald-200/80 dark:border-emerald-800/60 px-4 py-2.5 flex items-center justify-between gap-3 text-xs shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/50 shrink-0">
              <Maximize2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="font-bold text-slate-800 dark:text-slate-100">
                Open Full Screen for a Better Editing Experience
              </span>
              <span className="hidden sm:inline text-slate-500 dark:text-slate-400 text-[11px]">
                • Expands your design canvas and gives you unobstructed space to format text and graphics.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
            title="Open Full Screen (Esc to exit)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Open Full Screen</span>
          </button>
        </div>
      )}

      {/* 2. Main Work Area (Left Tools Drawer | Central Canvas | Right Properties Drawer) */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* Mobile/Tablet Backdrop for Left Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Mobile/Tablet Backdrop for Right Inspector Drawer */}
        {mobileInspectorOpen && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 lg:hidden animate-fade-in"
            onClick={() => setMobileInspectorOpen(false)}
          />
        )}

        {/* Left Toolbar & Sub-panel Drawer (Fixed drawer on mobile/tablet, docked on desktop) */}
        <div
          className={`
            fixed lg:static inset-y-0 left-0 z-50 lg:z-20 flex
            transition-transform duration-200 ease-in-out
            ${mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <EditorLeftSidebar
            activeTab={activeSidebarTab}
            onSelectTab={setActiveSidebarTab}
            design={design}
            onApplyTemplate={(newDesign) => {
              handleApplyTemplate(newDesign);
              setMobileSidebarOpen(false);
            }}
            onAddElement={(elemProps) => {
              handleAddElement(elemProps);
              if (window.innerWidth < 1024) {
                setMobileSidebarOpen(false);
              }
            }}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onReorderElement={handleReorderElement}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => {
              setSelectedElementId(id);
              if (id) setMobileInspectorOpen(true);
            }}
            onUpdateBackground={handleUpdateBackground}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </div>

        {/* Central Design Canvas (Gets 100% available width on mobile/tablet) */}
        <div ref={editorContainerRef} className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
          <EditorCanvas
            design={design}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => {
              setSelectedElementId(id);
              if (id) setMobileInspectorOpen(true);
            }}
            onUpdateElement={handleUpdateElement}
            onCommitHistory={() => pushHistory(design)}
            zoom={zoom}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            previewMode={previewMode}
            sampleData={sampleData}
            svgRef={svgRef}
          />
        </div>

        {/* Right Properties Panel (Desktop: Docked, Mobile/Tablet: Slide-in Drawer) */}
        <div
          className={`
            fixed lg:static inset-y-0 right-0 z-40 lg:z-20 flex
            transition-transform duration-200 ease-in-out
            ${mobileInspectorOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'}
            ${!selectedElementId && 'lg:block hidden'}
          `}
        >
          <EditorPropertiesPanel
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicateElement}
            onReorderElement={handleReorderElement}
            onClose={() => setMobileInspectorOpen(false)}
          />
        </div>
      </div>

      {/* Confirmation Modal for Resetting Design */}
      <ConfirmationModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleConfirmResetDesign}
        title="Reset Certificate Design"
        message="Reset current certificate design to template defaults? All unsaved modifications will be reverted."
        confirmText="Reset Defaults"
        cancelText="Cancel"
        variant="danger"
        closeOnBackdropClick={false}
        closeOnEscape={false}
        showCloseButton={false}
      />
    </div>
  );
};
