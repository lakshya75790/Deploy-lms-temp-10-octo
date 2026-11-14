import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Sparkles,
  X
} from 'lucide-react';
import { FONT_OPTIONS, DYNAMIC_TOKENS } from './designerConstants';

export const EditorPropertiesPanel = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onClose
}) => {
  if (!selectedElement) {
    return (
      <aside className="w-72 sm:w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 shrink-0 select-none flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Element Properties
            </h3>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center space-y-2">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No element selected
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Click any text, shape, image, or signature block on the canvas to inspect and edit its properties.
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
          <p className="font-bold text-slate-600 dark:text-slate-300 mb-1">Canvas Shortcuts:</p>
          <ul className="space-y-1 list-disc pl-3">
            <li><kbd className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">Del</kbd> : Delete element</li>
            <li><kbd className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">Ctrl+D</kbd> : Duplicate</li>
            <li><kbd className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">Ctrl+Z</kbd> : Undo</li>
            <li><kbd className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">Arrow keys</kbd> : Nudge position</li>
          </ul>
        </div>
      </aside>
    );
  }

  const el = selectedElement;

  return (
    <aside className="w-72 sm:w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 shrink-0 select-none overflow-y-auto max-h-full space-y-4 z-20">
      {/* Header with Type & Quick Actions */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
            {el.type} {el.shapeType ? `(${el.shapeType})` : ''}
          </span>
          <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
            Inspector
          </h3>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => onDuplicateElement(el.id)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdateElement(el.id, { locked: !el.locked })}
            className={`p-1.5 rounded-lg cursor-pointer ${el.locked ? 'text-red-500 bg-red-50' : 'text-slate-500 hover:bg-slate-100'}`}
            title={el.locked ? 'Unlock' : 'Lock Position'}
          >
            {el.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onDeleteElement(el.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
            title="Delete (Backspace/Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
              title="Close Inspector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SPECIFIC CONTROLS FOR TEXT */}
      {el.type === 'text' && (
        <div className="space-y-3.5">
          {/* Text Content */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
              Text Content
            </label>
            <textarea
              rows={3}
              value={el.content || ''}
              onChange={(e) => onUpdateElement(el.id, { content: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600"
            />
          </div>

          {/* Quick Dynamic Tokens Pill Inserter */}
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Insert Dynamic Field
            </span>
            <div className="flex flex-wrap gap-1">
              {DYNAMIC_TOKENS.map((t) => (
                <button
                  key={t.token}
                  type="button"
                  onClick={() => onUpdateElement(el.id, { content: `${el.content || ''} ${t.token}` })}
                  className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  {t.token}
                </button>
              ))}
            </div>
          </div>

          {/* Typography Font Family */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
              Font Family
            </label>
            <select
              value={el.fontFamily || 'Inter, sans-serif'}
              onChange={(e) => onUpdateElement(el.id, { fontFamily: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size & Formatting */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                Font Size (px)
              </label>
              <input
                type="number"
                min="8"
                max="120"
                value={el.fontSize || 16}
                onChange={(e) => onUpdateElement(el.id, { fontSize: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                Font Color
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="color"
                  value={el.color || '#0f172a'}
                  onChange={(e) => onUpdateElement(el.id, { color: e.target.value })}
                  className="w-8 h-8 rounded-lg border-none cursor-pointer"
                />
                <input
                  type="text"
                  value={el.color || '#0f172a'}
                  onChange={(e) => onUpdateElement(el.id, { color: e.target.value })}
                  className="w-full px-2 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Text Styling Toggles & Alignment */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() =>
                  onUpdateElement(el.id, {
                    fontWeight: el.fontWeight === 'bold' || el.fontWeight === '700' || el.fontWeight === '800' ? 'normal' : 'bold'
                  })
                }
                className={`flex-1 py-1 rounded text-center cursor-pointer transition-all ${
                  el.fontWeight === 'bold' || el.fontWeight === '700' || el.fontWeight === '800'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs font-bold'
                    : 'text-slate-600'
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5 mx-auto" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateElement(el.id, {
                    fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic'
                  })
                }
                className={`flex-1 py-1 rounded text-center cursor-pointer transition-all ${
                  el.fontStyle === 'italic'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs font-bold'
                    : 'text-slate-600'
                }`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5 mx-auto" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateElement(el.id, {
                    textDecoration: el.textDecoration === 'underline' ? 'none' : 'underline'
                  })
                }
                className={`flex-1 py-1 rounded text-center cursor-pointer transition-all ${
                  el.textDecoration === 'underline'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs font-bold'
                    : 'text-slate-600'
                }`}
                title="Underline"
              >
                <Underline className="w-3.5 h-3.5 mx-auto" />
              </button>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => onUpdateElement(el.id, { textAlign: 'left' })}
                className={`flex-1 py-1 rounded text-center cursor-pointer transition-all ${
                  el.textAlign === 'left' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs' : 'text-slate-600'
                }`}
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5 mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateElement(el.id, { textAlign: 'center' })}
                className={`flex-1 py-1 rounded text-center cursor-pointer transition-all ${
                  (!el.textAlign || el.textAlign === 'center') ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs' : 'text-slate-600'
                }`}
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5 mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateElement(el.id, { textAlign: 'right' })}
                className={`flex-1 py-1 rounded text-center cursor-pointer transition-all ${
                  el.textAlign === 'right' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs' : 'text-slate-600'
                }`}
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5 mx-auto" />
              </button>
            </div>
          </div>

          {/* Letter Spacing & Line Height */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Letter Spacing: {el.letterSpacing || 0}px
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={el.letterSpacing || 0}
                onChange={(e) => onUpdateElement(el.id, { letterSpacing: Number(e.target.value) })}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Line Height: {el.lineHeight || 1.3}
              </label>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                value={el.lineHeight || 1.3}
                onChange={(e) => onUpdateElement(el.id, { lineHeight: Number(e.target.value) })}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* SPECIFIC CONTROLS FOR SHAPES */}
      {el.type === 'shape' && (
        <div className="space-y-3.5">
          {/* Fill Color */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
              Fill Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={el.fill === 'none' ? '#ffffff' : el.fill || '#059669'}
                onChange={(e) => onUpdateElement(el.id, { fill: e.target.value })}
                className="w-8 h-8 rounded-lg border-none cursor-pointer"
              />
              <input
                type="text"
                value={el.fill || '#059669'}
                onChange={(e) => onUpdateElement(el.id, { fill: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => onUpdateElement(el.id, { fill: 'none' })}
                className={`px-2 py-1 text-[11px] font-semibold rounded border cursor-pointer ${
                  el.fill === 'none' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold' : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                None
              </button>
            </div>
          </div>

          {/* Stroke Color & Width */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                Border Stroke
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="color"
                  value={el.stroke === 'none' ? '#d97706' : el.stroke || '#d97706'}
                  onChange={(e) => onUpdateElement(el.id, { stroke: e.target.value })}
                  className="w-7 h-7 rounded-lg border-none cursor-pointer"
                />
                <input
                  type="text"
                  value={el.stroke || '#d97706'}
                  onChange={(e) => onUpdateElement(el.id, { stroke: e.target.value })}
                  className="w-full px-2 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                Stroke Width: {el.strokeWidth || 0}px
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={el.strokeWidth || 0}
                onChange={(e) => onUpdateElement(el.id, { strokeWidth: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
              />
            </div>
          </div>

          {/* Stroke Dash Style */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
              Stroke Line Pattern
            </label>
            <select
              value={el.strokeDasharray || 'none'}
              onChange={(e) => onUpdateElement(el.id, { strokeDasharray: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
            >
              <option value="none">Solid Line</option>
              <option value="4 4">Dashed Line (4 4)</option>
              <option value="8 8">Long Dashes (8 8)</option>
              <option value="2 2">Dotted Line (2 2)</option>
            </select>
          </div>

          {el.shapeType === 'gold-seal' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                Embossed Seal Text
              </label>
              <input
                type="text"
                value={el.sealText || 'OFFICIAL'}
                onChange={(e) => onUpdateElement(el.id, { sealText: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
              />
            </div>
          )}
        </div>
      )}

      {/* SPECIFIC CONTROLS FOR SIGNATURES */}
      {el.type === 'signature' && (
        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
              Signer Name
            </label>
            <input
              type="text"
              value={el.signerName || ''}
              onChange={(e) => onUpdateElement(el.id, { signerName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
              Signer Title / Designation
            </label>
            <input
              type="text"
              value={el.signerTitle || ''}
              onChange={(e) => onUpdateElement(el.id, { signerTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Show Signature Line
            </span>
            <input
              type="checkbox"
              checked={el.showLine !== false}
              onChange={(e) => onUpdateElement(el.id, { showLine: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* COMMON POSITION, DIMENSION, ROTATION & OPACITY */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Transform & Layering
        </span>

        {/* Position X / Y */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">Position X</label>
            <input
              type="number"
              value={Math.round(el.x)}
              onChange={(e) => onUpdateElement(el.id, { x: Number(e.target.value) })}
              className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">Position Y</label>
            <input
              type="number"
              value={Math.round(el.y)}
              onChange={(e) => onUpdateElement(el.id, { y: Number(e.target.value) })}
              className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Dimensions W / H */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">Width (px)</label>
            <input
              type="number"
              value={Math.round(el.width)}
              onChange={(e) => onUpdateElement(el.id, { width: Math.max(10, Number(e.target.value)) })}
              className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">Height (px)</label>
            <input
              type="number"
              value={Math.round(el.height)}
              onChange={(e) => onUpdateElement(el.id, { height: Math.max(5, Number(e.target.value)) })}
              className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Rotation & Opacity */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Rotation: {el.rotation || 0}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              value={el.rotation || 0}
              onChange={(e) => onUpdateElement(el.id, { rotation: Number(e.target.value) })}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Opacity: {Math.round((el.opacity !== undefined ? el.opacity : 1) * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={el.opacity !== undefined ? el.opacity : 1}
              onChange={(e) => onUpdateElement(el.id, { opacity: Number(e.target.value) })}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

