import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  FileText,
  Image as ImageIcon,
  Download,
  AlertCircle,
  RefreshCw,
  FileQuestion,
  Loader2,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import {
  fetchMediaPdfBlob,
  fetchSubmissionPdfBlob,
  fetchAssignmentPdfBlob,
  downloadAssignmentSubmission,
  getSubmissionDownloadUrl
} from '../../services/api';

/**
 * Universal In-App Document & PDF Preview Modal
 * 
 * Strict specifications:
 * 1. Closes ONLY through dedicated Close (X) button.
 * 2. Background/backdrop click and ESC key do NOT close the modal.
 * 3. Securely fetches documents via backend authenticated endpoints to eliminate Cloudinary errors.
 * 4. Supports multi-page PDFs, images, and offers clean download fallbacks for unsupported formats.
 */
export const DocumentPreviewModal = ({
  isOpen,
  onClose,
  fileUrl,
  submissionId,
  assignmentId,
  fileName,
  title,
  fileType,
  onDownload
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [detectedType, setDetectedType] = useState('pdf');
  const [downloading, setDownloading] = useState(false);
  const blobUrlRef = useRef(null);

  // Derive meaningful display filename
  const getCleanFileName = () => {
    if (fileName && fileName.trim()) return fileName.trim();
    if (title && title.trim()) {
      return title.trim().toLowerCase().endsWith('.pdf') ? title.trim() : `${title.trim()}.pdf`;
    }
    if (fileUrl) {
      try {
        const parts = fileUrl.split('/');
        let raw = decodeURIComponent(parts[parts.length - 1] || '').split('?')[0];
        if (raw && raw.length > 2) {
          return raw.replace(/_\d{10,14}(\.[a-zA-Z0-9]+)$/i, '$1');
        }
      } catch {}
    }
    return 'Document.pdf';
  };

  const displayFileName = getCleanFileName();

  // Detect file extension and format type
  const detectFileType = () => {
    if (fileType) {
      const ft = fileType.toLowerCase();
      if (ft === 'pdf' || ft.includes('pdf')) return 'pdf';
      if (['image', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].some(t => ft.includes(t))) return 'image';
    }

    const nameToCheck = (displayFileName || fileUrl || '').toLowerCase();
    if (nameToCheck.endsWith('.pdf')) return 'pdf';
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].some(ext => nameToCheck.endsWith(ext))) return 'image';
    if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.tar', '.7z', '.csv'].some(ext => nameToCheck.endsWith(ext))) {
      return 'unsupported';
    }
    // Default to PDF for assignments and resources
    return 'pdf';
  };

  const currentType = detectFileType();

  // Clean up object URLs to prevent browser memory leaks
  const cleanupBlob = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setBlobUrl(null);
  };

  // Prevent background scroll and suppress ESC key closure
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.overflow = 'hidden';

      const suppressEsc = (e) => {
        if (e.key === 'Escape') {
          // Explicitly prevent ESC from closing the modal
          e.preventDefault();
          e.stopPropagation();
        }
      };

      window.addEventListener('keydown', suppressEsc, true);
      return () => {
        document.body.style.overflow = 'unset';
        if (mainEl) mainEl.style.overflow = 'auto';
        window.removeEventListener('keydown', suppressEsc, true);
      };
    }
  }, [isOpen]);

  // Load document content whenever modal opens or document identifier changes
  const loadDocument = async () => {
    if (!isOpen || (!fileUrl && !submissionId && !assignmentId)) return;

    setLoading(true);
    setError(null);
    cleanupBlob();

    const type = detectFileType();
    setDetectedType(type);

    if (type === 'unsupported') {
      setLoading(false);
      return;
    }

    try {
      let response;
      if (submissionId) {
        response = await fetchSubmissionPdfBlob(submissionId);
      } else if (assignmentId) {
        response = await fetchAssignmentPdfBlob(assignmentId);
      } else if (fileUrl) {
        // If fileUrl is already a local blob
        if (fileUrl.startsWith('blob:')) {
          setBlobUrl(fileUrl);
          setLoading(false);
          return;
        }
        response = await fetchMediaPdfBlob(fileUrl);
      }

      if (!response || !response.data) {
        throw new Error('No document content received from server');
      }

      let rawData = response.data;
      if (rawData instanceof Blob && (rawData.type?.includes('application/json') || rawData.type === 'text/plain')) {
        const text = await rawData.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || 'Server returned an error');
        } catch (e) {
          if (text && text.includes('message')) {
            throw new Error(text);
          }
        }
      }

      const mimeType = type === 'image'
        ? (displayFileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')
        : 'application/pdf';

      let blob;
      if (rawData instanceof Blob) {
        // Ensure PDF blob has application/pdf MIME type so browser treats it as PDF
        if (type === 'pdf') {
          blob = rawData.type === 'application/pdf' ? rawData : rawData.slice(0, rawData.size, 'application/pdf');
        } else {
          blob = rawData;
        }
      } else if (rawData instanceof ArrayBuffer) {
        blob = new Blob([rawData], { type: mimeType });
      } else if (typeof rawData === 'string') {
        blob = new Blob([rawData], { type: mimeType });
      } else {
        throw new Error('Invalid document format received from server');
      }

      if (blob.size === 0) {
        throw new Error('The document file is empty');
      }

      // If PDF, verify it begins with '%PDF-' magic bytes
      if (type === 'pdf') {
        const header = await blob.slice(0, 5).text();
        if (!header.startsWith('%PDF-')) {
          if (header.startsWith('{')) {
            const errText = await blob.text();
            try {
              const parsed = JSON.parse(errText);
              throw new Error(parsed.message || 'Failed to load PDF document');
            } catch {
              throw new Error('Failed to load PDF document. File is corrupted or not a valid PDF.');
            }
          }
          throw new Error('The document received is not a valid PDF file.');
        }
      }

      const createdUrl = URL.createObjectURL(blob);
      blobUrlRef.current = createdUrl;
      setBlobUrl(createdUrl);
    } catch (err) {
      console.error('[DocumentPreviewModal] Failed to load preview:', err);
      // Fallback: If image and media stream failed, try direct fileUrl if safe
      if (type === 'image' && fileUrl && !fileUrl.startsWith('blob:')) {
        setBlobUrl(fileUrl);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load document preview. Please check your connection or download the file directly.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDocument();
    } else {
      cleanupBlob();
      setError(null);
      setLoading(true);
    }
    return () => {
      cleanupBlob();
    };
  }, [isOpen, fileUrl, submissionId]);

  // Unified Download Handler
  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    setDownloading(true);
    try {
      const finalDownloadName = displayFileName.toLowerCase().endsWith('.pdf') ? displayFileName : `${displayFileName}.pdf`;

      // 1. If we already have the local decrypted blob loaded in preview, download immediately
      if (blobUrl && blobUrl.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = finalDownloadName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      // 2. If submissionId is available, fetch the original PDF blob from the backend
      if (submissionId) {
        const res = await downloadAssignmentSubmission(submissionId);
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
        const dlUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = finalDownloadName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
        return;
      }

      // 3. If fileUrl is a general media resource, fetch via media view endpoint
      if (fileUrl) {
        const res = await fetchMediaPdfBlob(fileUrl);
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
        const dlUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = finalDownloadName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
        return;
      }
    } catch (err) {
      console.error('[DocumentPreviewModal] Download error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to download original file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  const fileExt = (displayFileName.split('.').pop() || 'FILE').toUpperCase();

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs animate-fade-in"
      // Backdrop click intentionally does NOT close the modal
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-5xl lg:max-w-6xl h-[92vh] max-h-[960px] min-h-[480px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-fade-in"
        // Outside click intentionally does NOT close the modal
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex-shrink-0 gap-3">
          {/* File Icon & Info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className={`p-2 rounded-xl shrink-0 ${
              detectedType === 'pdf'
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : detectedType === 'image'
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                  : 'bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
            }`}>
              {detectedType === 'pdf' ? (
                <FileText className="w-5 h-5" />
              ) : detectedType === 'image' ? (
                <ImageIcon className="w-5 h-5" />
              ) : (
                <FileQuestion className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h3
                  className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate"
                  title={displayFileName}
                >
                  {displayFileName}
                </h3>
                <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {fileExt}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                In-App Document Viewer • Secure LMS Stream
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Download Original File Action */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Download Original File"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* DEDICATED CLOSE (X) BUTTON - ONLY WAY TO CLOSE THE MODAL */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Preview"
              title="Close Preview (X)"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors focus:outline-none cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY: DOCUMENT PREVIEW CANVAS */}
        <div className="flex-1 bg-slate-100/80 dark:bg-slate-950/80 overflow-hidden relative flex items-center justify-center p-2 sm:p-4">
          {/* 1. Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Loading Document Preview...
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Decrypting and preparing your document for secure in-app viewing
                </p>
              </div>
            </div>
          )}

          {/* 2. Error State */}
          {!loading && error && (
            <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-lg text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Unable to Display Document Preview
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {error}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={loadDocument}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download Original File
                </button>
              </div>
            </div>
          )}

          {/* 3. Unsupported Document State */}
          {!loading && !error && detectedType === 'unsupported' && (
            <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <FileQuestion className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Preview Not Supported for {fileExt} Files
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This file format cannot be rendered directly in the web browser. You can download the original file to view it on your device.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download Original File
                </button>
              </div>
            </div>
          )}

          {/* 4. Active PDF Preview */}
          {!loading && !error && detectedType === 'pdf' && blobUrl && (
            <div className="w-full h-full rounded-xl overflow-hidden shadow-sm border border-slate-300/70 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col">
              <object
                data={blobUrl}
                type="application/pdf"
                className="w-full h-full rounded-xl border-0"
              >
                <embed
                  src={blobUrl}
                  type="application/pdf"
                  className="w-full h-full rounded-xl"
                />
                <iframe
                  src={blobUrl}
                  title={displayFileName}
                  className="w-full h-full border-0 rounded-xl"
                />
              </object>
            </div>
          )}

          {/* 5. Active Image Preview */}
          {!loading && !error && detectedType === 'image' && blobUrl && (
            <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-auto">
              <img
                src={blobUrl}
                alt={displayFileName}
                className="max-h-full max-w-full object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Format:</span>
            <span>{fileExt} Document</span>
            <span>•</span>
            <span>Encrypted In-App Stream</span>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Press the (X) button above to close
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

