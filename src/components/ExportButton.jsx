'use client';
import React, { useState, useRef, useEffect } from 'react';
import { exportToCSV, exportToPDF } from '@/utils/exportUtils';

function ExportButton({ data, columns, filename, title, subtitle, orientation }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleExportCSV() {
    exportToCSV(data, columns, filename);
    setShowMenu(false);
  }

  function handleExportPDF() {
    exportToPDF(data, columns, title, filename, { subtitle, orientation });
    setShowMenu(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="btn btn-secondary flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Exporter
        <svg className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fadeIn">
          <button onClick={handleExportCSV} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 18v-1h3v-1h-2a1 1 0 01-1-1v-1a1 1 0 011-1h3v1h-3v1h2a1 1 0 011 1v1a1 1 0 01-1 1h-3zm6 0v-5h1l1.5 2.5L18.5 13h1v5h-1v-3l-1 1.5-1-1.5v3h-1z"/>
              </svg>
            </div>
            <div>
              <div className="font-medium">Exporter CSV</div>
              <div className="text-xs text-gray-500">Fichier Excel</div>
            </div>
          </button>

          <button onClick={handleExportPDF} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 18v-5h2a1.5 1.5 0 010 3H9.5v2h-1zm2-3a.5.5 0 000-1H9.5v1h1zm3 3v-5h1.5a2 2 0 012 2v1a2 2 0 01-2 2h-1.5zm1.5-1a1 1 0 001-1v-1a1 1 0 00-1-1H15v3h1zm3 1v-5h2.5v1H18v1h1.5v1H18v2h-1z"/>
              </svg>
            </div>
            <div>
              <div className="font-medium">Exporter PDF</div>
              <div className="text-xs text-gray-500">Pour impression</div>
            </div>
          </button>

          <div className="border-t border-gray-100 my-1"></div>
          <div className="px-4 py-2 text-xs text-gray-400">
            {data?.length || 0} enregistrement(s)
          </div>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
