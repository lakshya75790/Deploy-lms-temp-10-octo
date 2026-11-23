import React, { useState } from 'react';
import {
  LayoutTemplate,
  Type,
  Shapes,
  Image as ImageIcon,
  FileSignature,
  Sparkles,
  Palette,
  Plus,
  Upload,
  CheckCircle2,
  Loader2,
  X,
  PenTool
} from 'lucide-react';
import {
  DYNAMIC_TOKENS,
  SHAPE_PRESETS,
  TEMPLATE_PRESETS,
  BLANK_CANVAS_DESIGN
} from './designerConstants';
import { BORDER_DESIGNS, renderCertificateBorder } from './borderDesigns';
import { uploadImage } from '../../../services/api';
import { processTransparentSignature } from '../../../utils/signatureProcessor';
import { useNotification } from '../../../context/NotificationContext';
import { DrawSignatureModal } from './DrawSignatureModal';

export const EditorLeftSidebar = ({
  activeTab,
  onSelectTab,
  design,
  onApplyTemplate,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onReorderElement,
  selectedElementId,
  onSelectElement,
  onUpdateBackground,
  onClose
}) => {
  const { addToast } = useNotification();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [signerNameInput, setSignerNameInput] = useState('');
  const [signerTitleInput, setSignerTitleInput] = useState('');
  const [drawSigModalOpen, setDrawSigModalOpen] = useState(false);

  const handleSaveDrawnSignature = (dataUrl) => {
    onAddElement({
      type: 'signature',
      src: dataUrl,
      signerName: signerNameInput.trim() || 'Authorized Signatory',
      signerTitle: signerTitleInput.trim() || 'Organization Administrator',
      showLine: true,
      lineColor: '#94a3b8',
      width: 250,
      height: 100
    });
    addToast('success', 'Handwritten signature added to canvas.');
  };

  // Duplicate Dynamic Placeholder check: Each dynamic placeholder can only appear ONCE on canvas
  const isPlaceholderOnCanvas = (token) => {
    if (!design?.elements || !Array.isArray(design.elements)) return false;
    const tokenLower = token.toLowerCase();
    return design.elements.some((el) => {
      if (el.type !== 'text' || typeof el.content !== 'string') return false;
      const contentLower = el.content.toLowerCase();
      if (tokenLower === '{{adminname}}') {
        return contentLower.includes('{{adminname}}') || contentLower.includes('{{instructorname}}');
      }
      return contentLower.includes(tokenLower);
    });
  };

  const handleAddPlaceholder = (tokenObj) => {
    if (isPlaceholderOnCanvas(tokenObj.token)) {
      addToast('warning', 'This placeholder has already been added to the certificate.');
      return;
    }

    onAddElement({
      type: 'text',
      content: tokenObj.token,
      fontSize: tokenObj.token.includes('Name') ? 36 : 16,
      fontFamily: tokenObj.token.includes('Name') ? 'Playfair Display, serif' : 'Inter, sans-serif',
      fontWeight: '700',
      color: '#0f172a',
      width: 500,
      height: 50,
      textAlign: 'center'
    });
  };

  // Add Custom Text Field: simple editable text element directly placed on canvas
  const handleAddCustomTextField = () => {
    onAddElement({
      type: 'text',
      content: 'Enter Text',
      fontSize: 18,
      fontFamily: 'Inter, sans-serif',
      fontWeight: '500',
      color: '#0f172a',
      width: 400,
      height: 40,
      textAlign: 'center'
    });
  };

  // Handle Image Upload onto Canvas (Standard graphic asset or logo)
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file (PNG, JPG, JPEG, SVG, WebP)');
      e.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadImage(formData);
      const url = res.data?.data?.url || res.data?.url;

      if (url) {
        onAddElement({
          type: 'image',
          src: url,
          alt: file.name || 'Uploaded Graphic',
          width: 140,
          height: 100,
          rotation: 0,
          opacity: 1,
          lockAspectRatio: true
        });
      }
    } catch (err) {
      console.warn('Backend image upload fallback to local dataURL:', err);
      // Fallback: local DataURL so user is never blocked
      const reader = new FileReader();
      reader.onload = (event) => {
        onAddElement({
          type: 'image',
          src: event.target.result,
          alt: file.name,
          width: 140,
          height: 100,
          rotation: 0,
          opacity: 1,
          lockAspectRatio: true
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Handle Signature Upload with Automatic Transparency Processing & Server Storage
  const handleSignatureFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file (PNG, JPG, JPEG, WebP)');
      e.target.value = '';
      return;
    }

    setUploadingSig(true);
    try {
      // 1. Process transparency removal client-side (extracts clean ink on transparent canvas)
      const processedFile = await processTransparentSignature(file);

      let finalUrl = null;

      // 2. Upload to backend media API
      try {
        const formData = new FormData();
        formData.append('file', processedFile);
        const res = await uploadImage(formData);
        finalUrl = res.data?.data?.url || res.data?.url;
      } catch (uploadErr) {
        console.warn('Backend signature upload failed, falling back to local dataUrl:', uploadErr);
      }

      // 3. Fallback to base64 Data URL if server upload had an issue
      if (!finalUrl) {
        finalUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(processedFile);
        });
      }

      if (finalUrl) {
        onAddElement({
          type: 'signature',
          src: finalUrl,
          signerName: signerNameInput.trim() || 'Authorized Signatory',
          signerTitle: signerTitleInput.trim() || 'Organization Administrator',
          showLine: true,
          lineColor: '#94a3b8',
          width: 240,
          height: 110,
          rotation: 0,
          opacity: 1
        });
      }
    } catch (err) {
      console.error('Signature processing failed:', err);
    } finally {
      setUploadingSig(false);
      e.target.value = '';
    }
  };

  // 7 Primary Editing Tabs (Layers removed per requirement 2)
  const TABS = [
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'shapes', label: 'Shapes', icon: Shapes },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'signatures', label: 'Signatures', icon: FileSignature },
    { id: 'dynamic', label: 'Fields', icon: Sparkles },
    { id: 'background', label: 'Background', icon: Palette }
  ];

  return (
    <aside className="w-[330px] sm:w-[360px] lg:w-[380px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex h-full shrink-0 select-none overflow-hidden z-20">
      {/* 1. Left Vertical Icon Strip (Fixed w-20 to ensure 'Background' fits with generous margin) */}
      <nav className="w-20 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-3 space-y-1.5 shrink-0 overflow-y-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`w-16 h-14 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
              title={tab.label}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="text-[10px] mt-1 font-medium leading-none text-center truncate w-full px-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 2. Sub-Panel Content */}
      <div className="flex-1 p-4 overflow-y-auto max-h-full">
        {/* Header with mobile close option */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 lg:hidden">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
            {activeTab} Tools
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Close Tools Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* TAB 1: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Certificate Presets
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Select a professionally pre-composed certificate design or start blank.
              </p>
            </div>

            {/* Option A: Blank Canvas Option */}
            <button
              type="button"
              onClick={() => onApplyTemplate(BLANK_CANVAS_DESIGN)}
              className="w-full p-3.5 rounded-xl border-2 border-dashed border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 whitespace-nowrap">
                  <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Start Blank Canvas
                </span>
                <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap shadow-2xs">
                  Option A
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                Create a customized certificate entirely from scratch with an empty canvas.
              </p>
            </button>

            {/* Option B: Pre-made Templates (Guaranteed single horizontal line alignment) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">
                  OPTION B – PRE-MADE TEMPLATES
                </span>
                <span className="text-[10px] bg-blue-600 text-white font-bold px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap shadow-2xs">
                  Option B
                </span>
              </div>

              {TEMPLATE_PRESETS.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => onApplyTemplate(tmpl.design)}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-800 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                      {tmpl.name}
                    </span>
                    <div className="flex items-center space-x-1">
                      {tmpl.previewColors.map((c, i) => (
                        <span
                          key={i}
                          className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {tmpl.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: TEXT */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Add Typography
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click any heading or body style to add it to the center of your canvas.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() =>
                  onAddElement({
                    type: 'text',
                    content: 'CERTIFICATE OF COMPLETION',
                    fontSize: 38,
                    fontFamily: 'Playfair Display, serif',
                    fontWeight: '800',
                    color: '#1e3a8a',
                    width: 700,
                    height: 55,
                    textAlign: 'center'
                  })
                }
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-left bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50/30 transition-all cursor-pointer"
              >
                <p className="text-base font-serif font-bold text-slate-800 dark:text-slate-100">
                  Add Certificate Title
                </p>
                <p className="text-[10px] text-slate-400">Large display serif text</p>
              </button>

              <button
                type="button"
                onClick={() =>
                  onAddElement({
                    type: 'text',
                    content: '{{learnerName}}',
                    fontSize: 44,
                    fontFamily: 'Playfair Display, serif',
                    fontWeight: '700',
                    color: '#0f172a',
                    width: 700,
                    height: 65,
                    textAlign: 'center'
                  })
                }
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-left bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50/30 transition-all cursor-pointer"
              >
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  Add Recipient Name Block
                </p>
                <p className="text-[10px] text-slate-400">Dynamic &#123;&#123;learnerName&#125;&#125; token</p>
              </button>

              <button
                type="button"
                onClick={() =>
                  onAddElement({
                    type: 'text',
                    content: 'THIS CREDENTIAL IS PROUDLY CONFERRED UPON',
                    fontSize: 13,
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: '600',
                    color: '#64748b',
                    letterSpacing: 2.5,
                    width: 600,
                    height: 30,
                    textAlign: 'center'
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-left bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50/30 transition-all cursor-pointer"
              >
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-200">
                  Add Subheading / Label
                </p>
                <p className="text-[10px] text-slate-400">Conferred upon / In recognition of</p>
              </button>

              <button
                type="button"
                onClick={() =>
                  onAddElement({
                    type: 'text',
                    content: 'for successfully completing all accredited curriculum requirements and demonstrating outstanding mastery in',
                    fontSize: 15,
                    fontFamily: 'Merriweather, serif',
                    fontStyle: 'italic',
                    fontWeight: '400',
                    color: '#475569',
                    width: 800,
                    height: 44,
                    textAlign: 'center'
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-left bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50/30 transition-all cursor-pointer"
              >
                <p className="text-xs italic text-slate-700 dark:text-slate-200">
                  Add Description Paragraph
                </p>
                <p className="text-[10px] text-slate-400">Body text explaining accomplishment</p>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SHAPES & DECORATIONS */}
        {activeTab === 'shapes' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Shapes & Ornaments
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Borders, frames, divider lines, and official embossed seals.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {SHAPE_PRESETS.map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => onAddElement({ type: 'shape', ...shape.defaultProps })}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50/30 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 mt-1">
                    {shape.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: IMAGES & LOGOS */}
        {activeTab === 'images' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Logos & Graphic Assets
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload company logos, partner badges, accreditation seals, or watermark icons.
              </p>
            </div>

            {/* Upload Logo / Graphic */}
            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50/20 transition-all cursor-pointer group">
              {uploadingImage ? (
                <Loader2 className="w-7 h-7 text-emerald-600 animate-spin my-1" />
              ) : (
                <Upload className="w-7 h-7 text-slate-400 group-hover:text-emerald-600 transition-colors my-1" />
              )}
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 mt-1">
                {uploadingImage ? 'Uploading Image...' : 'Click to Upload Image'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG or WebP</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* TAB 5: SIGNATURES */}
        {activeTab === 'signatures' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Signatures & Signatories
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload handwritten signature. White paper backgrounds are removed automatically.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Signer Name
                </label>
                <input
                  type="text"
                  value={signerNameInput}
                  onChange={(e) => setSignerNameInput(e.target.value)}
                  placeholder="e.g. Johnathan Vance"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Signer Designation / Title
                </label>
                <input
                  type="text"
                  value={signerTitleInput}
                  onChange={(e) => setSignerTitleInput(e.target.value)}
                  placeholder="e.g. Authorized Organization Administrator"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600"
                />
              </div>

              {/* Draw Signature Manually Option */}
              <button
                type="button"
                onClick={() => setDrawSigModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <PenTool className="w-4 h-4" />
                <span>Draw Signature</span>
              </button>

              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50/20 transition-all cursor-pointer group">
                {uploadingSig ? (
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin my-1" />
                ) : (
                  <FileSignature className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 transition-colors my-1" />
                )}
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 mt-1">
                  {uploadingSig ? 'Processing & Uploading Signature...' : 'Upload Signature Image (PNG, JPG)'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Applies automatic transparent ink extraction and saves to storage
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleSignatureFileChange}
                  disabled={uploadingSig}
                  className="hidden"
                />
              </label>

              {/* Add Generic Signature Line Block */}
              <button
                type="button"
                onClick={() =>
                  onAddElement({
                    type: 'signature',
                    src: null,
                    signerName: signerNameInput.trim() || 'Authorized Signatory',
                    signerTitle: signerTitleInput.trim() || 'Organization Administrator',
                    showLine: true,
                    lineColor: '#94a3b8',
                    width: 250,
                    height: 100
                  })
                }
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Add Signature Line Block</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: DYNAMIC PLACEHOLDERS */}
        {activeTab === 'dynamic' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Dynamic Placeholders
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click any placeholder to insert a dynamic token that automatically populates when certificates are issued.
              </p>
            </div>

            <div className="space-y-2.5">
              {DYNAMIC_TOKENS.map((tokenObj) => {
                const isAdded = isPlaceholderOnCanvas(tokenObj.token);
                return (
                  <button
                    key={tokenObj.token}
                    type="button"
                    onClick={() => handleAddPlaceholder(tokenObj)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
                      isAdded
                        ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 group-hover:underline">
                        {tokenObj.token}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isAdded && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            Added
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold">{tokenObj.label}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Sample: <span className="font-medium text-slate-700 dark:text-slate-200">{tokenObj.sample}</span>
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Single Add Custom Text Field Button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleAddCustomTextField}
                className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-emerald-500/80 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Add Custom Text Field</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: BACKGROUND & BORDERS */}
        {activeTab === 'background' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Canvas Background & Border
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure base canvas fill, gradient shading, and decorative certificate borders.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Fill Style
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => onUpdateBackground({ type: 'solid' })}
                    className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      design.background?.type !== 'gradient'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Solid Color
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBackground({
                        type: 'gradient',
                        gradientStart: '#ffffff',
                        gradientEnd: '#fafaf9'
                      })
                    }
                    className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      design.background?.type === 'gradient'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Gradient
                  </button>
                </div>
              </div>

              {design.background?.type === 'gradient' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Gradient Start
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="color"
                        value={design.background?.gradientStart || '#ffffff'}
                        onChange={(e) => onUpdateBackground({ gradientStart: e.target.value })}
                        className="w-7 h-7 rounded-lg border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={design.background?.gradientStart || '#ffffff'}
                        onChange={(e) => onUpdateBackground({ gradientStart: e.target.value })}
                        className="w-full px-2 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Gradient End
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="color"
                        value={design.background?.gradientEnd || '#f8fafc'}
                        onChange={(e) => onUpdateBackground({ gradientEnd: e.target.value })}
                        className="w-7 h-7 rounded-lg border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={design.background?.gradientEnd || '#f8fafc'}
                        onChange={(e) => onUpdateBackground({ gradientEnd: e.target.value })}
                        className="w-full px-2 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Canvas Base Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={design.background?.color || '#ffffff'}
                      onChange={(e) => onUpdateBackground({ color: e.target.value })}
                      className="w-8 h-8 rounded-lg border-none cursor-pointer"
                    />
                    <input
                      type="text"
                      value={design.background?.color || '#ffffff'}
                      onChange={(e) => onUpdateBackground({ color: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* 20+ Outer Inset Border Designs */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    Outer Inset Border (20+ Styles)
                  </label>
                  {design.background?.borderStyle && design.background.borderStyle !== 'none' && (
                    <button
                      type="button"
                      onClick={() => onUpdateBackground({ borderStyle: 'none' })}
                      className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                    >
                      Remove Border
                    </button>
                  )}
                </div>

                {/* Border Color & Width */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Border Color
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="color"
                        value={design.background?.borderColor || '#d97706'}
                        onChange={(e) => onUpdateBackground({ borderColor: e.target.value })}
                        className="w-7 h-7 rounded-lg border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={design.background?.borderColor || '#d97706'}
                        onChange={(e) => onUpdateBackground({ borderColor: e.target.value })}
                        className="w-full px-2 py-1 text-[11px] font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Width: {design.background?.borderWidth || 3}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={design.background?.borderWidth || 3}
                      onChange={(e) => onUpdateBackground({ borderWidth: Number(e.target.value) })}
                      className="w-full mt-1.5 accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Visual Border Selector Grid */}
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {BORDER_DESIGNS.map((b) => {
                    const isSelected = (design.background?.borderStyle || 'none') === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onUpdateBackground({ borderStyle: b.id })}
                        className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-emerald-500 hover:bg-slate-50 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          {/* Mini SVG Preview */}
                          <div className="w-10 h-7 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
                            <svg viewBox="0 0 120 85" className="w-full h-full p-0.5">
                              {renderCertificateBorder(b.id, 120, 85, design.background?.borderColor || '#d97706', 2, `mini-${b.id}`)}
                            </svg>
                          </div>
                          <div className="truncate min-w-0">
                            <p className="text-xs truncate font-medium">{b.name}</p>
                            <span className="text-[9px] text-slate-400 font-normal">{b.category}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <DrawSignatureModal
        isOpen={drawSigModalOpen}
        onClose={() => setDrawSigModalOpen(false)}
        onSave={handleSaveDrawnSignature}
        initialTitle="Draw Signature"
      />
    </aside>
  );
};
