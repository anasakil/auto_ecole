'use client';
import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import api from '@/utils/api';

function DocumentViewer({ isOpen, onClose, document: doc, filePath }) {
  const [fileData, setFileData] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfFailed, setPdfFailed] = useState(false);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (isOpen && filePath) {
      setPdfFailed(false);
      loadFile();
    }
    return () => {
      setFileData(null);
      setError(null);
      setPdfFailed(false);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setBlobUrl(null);
    };
  }, [isOpen, filePath]);

  async function loadFile() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.files.getBase64(filePath);
      if (data && typeof data === 'string' && data.startsWith('data:')) {
        setFileData(data);
        if (data.startsWith('data:application/pdf')) {
          try {
            const parts = data.split(',');
            const mime = parts[0].match(/:(.*?);/)[1];
            const raw = atob(parts[1]);
            const arr = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
            const blob = new Blob([arr], { type: mime });
            const url = URL.createObjectURL(blob);
            blobUrlRef.current = url;
            setBlobUrl(url);
          } catch {
            // blob URL failed — will use data URI directly
          }
        }
      } else {
        setError('Fichier introuvable. Veuillez régénérer le document.');
      }
    } catch (err) {
      console.error('Error loading file:', err);
      setError('Erreur lors du chargement du fichier');
    } finally {
      setLoading(false);
    }
  }

  function getFileType() {
    if (!filePath) return 'unknown';
    const ext = filePath.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['odf', 'odt', 'ods', 'odp'].includes(ext)) return 'odf';
    return 'unknown';
  }

  function handleDownload() {
    if (!fileData) return;
    const link = window.document.createElement('a');
    link.href = fileData;
    link.download = doc?.name || 'document';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }

  function handlePrint() {
    if (!fileData) return;
    const fileType = getFileType();
    const printWindow = window.open('', '_blank');
    if (fileType === 'image') {
      printWindow.document.write(`<html><head><title>${doc?.name || 'Document'}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;}img{max-width:100%;max-height:100vh;}</style></head><body><img src="${fileData}" /><script>window.onload=function(){window.print();}<\/script></body></html>`);
    } else if (fileType === 'pdf') {
      printWindow.document.write(`<html><head><title>${doc?.name || 'Document'}</title></head><body style="margin:0;"><embed src="${blobUrl || fileData}" type="application/pdf" width="100%" height="100%" /><script>setTimeout(function(){window.print();},1000);<\/script></body></html>`);
    }
    printWindow.document.close();
  }

  function openInNewTab() {
    if (!fileData) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>${doc?.name || 'PDF'}</title></head><body style="margin:0;"><embed src="${blobUrl || fileData}" type="application/pdf" width="100%" height="100%" /></body></html>`);
    win.document.close();
  }

  const fileType = getFileType();
  const pdfSrc = blobUrl || fileData;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={doc?.name || 'Document'} size="xl">
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Chargement...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-red-500">{error}</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end gap-2 pb-2 border-b flex-wrap">
              {fileType === 'pdf' && (
                <button onClick={openInNewTab} className="btn btn-secondary btn-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Ouvrir
                </button>
              )}
              <button onClick={handlePrint} className="btn btn-secondary btn-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimer
              </button>
              <button onClick={handleDownload} className="btn btn-secondary btn-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Télécharger
              </button>
            </div>

            <div className="flex justify-center">
              {fileType === 'image' && fileData && (
                <img
                  src={fileData}
                  alt={doc?.name || 'Document'}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                />
              )}

              {fileType === 'pdf' && fileData && !pdfFailed && (
                <iframe
                  src={pdfSrc}
                  title={doc?.name || 'PDF'}
                  className="w-full h-[60vh] rounded-lg border"
                  onError={() => setPdfFailed(true)}
                />
              )}

              {fileType === 'pdf' && (pdfFailed || !fileData) && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 mb-2">Le PDF ne peut pas être affiché dans le navigateur.</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={openInNewTab} className="btn btn-primary">Ouvrir dans un nouvel onglet</button>
                    <button onClick={handleDownload} className="btn btn-secondary">Télécharger</button>
                  </div>
                </div>
              )}

              {fileType === 'doc' && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 mb-4">Les fichiers Word ne peuvent pas être prévisualisés directement.</p>
                  <button onClick={handleDownload} className="btn btn-primary">Télécharger pour ouvrir</button>
                </div>
              )}

              {fileType === 'odf' && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 mb-2">Document OpenDocument Format</p>
                  <p className="text-sm text-gray-500 mb-4">Ouvrir avec LibreOffice ou une application compatible</p>
                  <button onClick={handleDownload} className="btn btn-primary">Télécharger pour ouvrir</button>
                </div>
              )}

              {fileType === 'unknown' && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 mb-4">Format de fichier non supporté pour la prévisualisation.</p>
                  <button onClick={handleDownload} className="btn btn-primary">Télécharger</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DocumentViewer;
