'use client';
import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import api from '@/utils/api';

function DocumentViewer({ isOpen, onClose, document: doc, filePath }) {
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (isOpen && filePath) {
      loadFile();
    }
    return () => {
      setFileData(null);
      setError(null);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isOpen, filePath]);

  async function loadFile() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.files.getBase64(filePath);
      if (data && typeof data === 'string' && data.startsWith('data:')) {
        setFileData(data);
      } else {
        setError('Fichier introuvable. Veuillez régénérer le document.');
      }
    } catch (err) {
      console.error('Error loading file:', err);
      setError('Erreur lors du chargement du fichier.');
    } finally {
      setLoading(false);
    }
  }

  function getFileType() {
    if (!filePath) return 'unknown';
    const ext = filePath.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'other';
  }

  function makeBlobUrl() {
    if (!fileData) return null;
    if (blobUrlRef.current) return blobUrlRef.current;
    try {
      const parts = fileData.split(',');
      const mime = parts[0].match(/:(.*?);/)[1];
      const raw = atob(parts[1]);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      return url;
    } catch {
      return null;
    }
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

  function handleOpenNewTab() {
    const url = makeBlobUrl() || fileData;
    if (!url) return;
    // Navigate directly to the blob/data URL — avoids X-Frame-Options and CSP issues
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handlePrint() {
    if (!fileData) return;
    // Open PDF/image directly in new tab and let user print from there
    handleOpenNewTab();
  }

  const fileType = getFileType();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={doc?.name || 'Document'} size="xl">
      <div className="min-h-[400px] flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Chargement...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div className="text-red-500 text-center">{error}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex justify-end gap-2 pb-2 border-b flex-wrap">
              {fileType === 'pdf' && (
                <button onClick={handleOpenNewTab} className="btn btn-primary btn-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Ouvrir le PDF
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

            {/* Content */}
            <div className="flex justify-center">
              {fileType === 'image' && (
                <img
                  src={fileData}
                  alt={doc?.name || 'Document'}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                />
              )}

              {fileType === 'pdf' && (
                <div className="w-full text-center py-8">
                  <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                  </svg>
                  <p className="text-gray-700 font-medium mb-1">{doc?.name || 'Document PDF'}</p>
                  <p className="text-sm text-gray-500 mb-4">Cliquez sur "Ouvrir le PDF" pour visualiser le document.</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={handleOpenNewTab} className="btn btn-primary">
                      Ouvrir le PDF
                    </button>
                    <button onClick={handleDownload} className="btn btn-secondary">
                      Télécharger
                    </button>
                  </div>
                </div>
              )}

              {fileType === 'other' && (
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
