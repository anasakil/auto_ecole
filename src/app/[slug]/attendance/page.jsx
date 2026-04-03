'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import api from '@/utils/api';
import { formatDate, getStatusBadgeClass } from '@/utils/helpers';
import { useTenant } from '@/contexts/TenantContext';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/data/Pagination';

function QuickAttendance({ students, presentStudents, onQuickAttendance }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'present' | 'absent'
  const PAGE_SIZE = 18;

  const activeStudents = students.filter((s) => s.status === 'En formation');

  const filtered = activeStudents.filter((s) => {
    const matchSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.cin && s.cin.toLowerCase().includes(search.toLowerCase()));
    const isPresent = presentStudents.some((a) => a.student_id === s.id);
    if (filterStatus === 'present') return matchSearch && isPresent;
    if (filterStatus === 'absent') return matchSearch && !isPresent;
    return matchSearch;
  });

  const { page, setPage, totalPages, paginatedData } = usePagination(filtered, PAGE_SIZE);

  return (
    <div className="card mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Enregistrement Rapide</h2>
          <p className="text-xs text-gray-500 mt-0.5">Absent → Entrée &nbsp;|&nbsp; Présent → Sortie</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {activeStudents.length} étudiants
          </span>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom ou CIN..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all placeholder-gray-400"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {[['all', 'Tous'], ['absent', 'Absents'], ['present', 'Présents']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setFilterStatus(val); setPage(1); }}
              className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                filterStatus === val
                  ? val === 'present' ? 'bg-green-500 text-white border-green-500'
                    : val === 'absent' ? 'bg-red-500 text-white border-red-500'
                    : 'bg-primary-600 text-white border-primary-600'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Aucun étudiant trouvé</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {paginatedData.map((student) => {
              const isPresent = presentStudents.some((a) => a.student_id === student.id);
              return (
                <button
                  key={student.id}
                  onClick={() => onQuickAttendance(student.id)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
                    isPresent
                      ? 'bg-green-50 text-green-800 hover:bg-green-100 border-2 border-green-300 shadow-sm'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isPresent ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {student.full_name.charAt(0)}
                    </div>
                  </div>
                  <p className="truncate text-xs font-semibold leading-tight">{student.full_name}</p>
                  <p className={`text-xs mt-0.5 ${isPresent ? 'text-green-600' : 'text-gray-400'}`}>
                    {isPresent ? '✓ Présent' : 'Absent'}
                  </p>
                </button>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Attendance() {
  const [students, setStudents] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [cameraList, setCameraList] = useState([]);
  const scannerRef = useRef(null);
  const studentsRef = useRef([]);
  const todayAttendanceRef = useRef([]);
  const lastScanRef = useRef({ code: null, timestamp: 0 });
  const isProcessingRef = useRef(false);
  const { slug } = useTenant();

  useEffect(() => {
    loadData();
  }, []);

  // Keep refs in sync with state to avoid closure issues in scanner callback
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    todayAttendanceRef.current = todayAttendance;
  }, [todayAttendance]);

  useEffect(() => {
    let scanner = null;
    let mounted = true;

    async function initScanner() {
      if (!showScanner || scannerRef.current) return;

      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!mounted) return;

      try {
        // Check for camera availability first
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setCameraList(cameras);

        if (cameras.length === 0) {
          setScannerError('Aucune caméra détectée sur cet appareil');
          return;
        }

        // Request camera permission
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (permErr) {
          setScannerError('Permission caméra refusée. Veuillez autoriser l\'accès à la caméra.');
          return;
        }

        scanner = new Html5QrcodeScanner("qr-reader", {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          videoConstraints: {
            facingMode: "environment"
          }
        });

        scanner.render(onScanSuccess, onScanError);
        scannerRef.current = scanner;
        setScannerReady(true);
        setScannerError(null);
      } catch (err) {
        console.error("Scanner init error:", err);
        setScannerError(`Erreur d'initialisation: ${err.message}`);
      }
    }

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
        setScannerReady(false);
      }
    };
  }, [showScanner]);

  async function loadData() {
    try {
      // Cleanup any duplicate attendance records first
      await api.attendance.cleanupDuplicates();

      const [studentsData, attendanceData] = await Promise.all([
        api.students.getAll(),
        api.attendance.getToday(),
      ]);
      setStudents(studentsData);
      setTodayAttendance(attendanceData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function onScanSuccess(decodedText) {
    await processCode(decodedText);
  }

  function onScanError(error) {
    // Ignore scan errors (they happen continuously when no QR code is visible)
  }

  async function processCode(code) {
    // Debounce: prevent duplicate scans of same code within 5 seconds
    const now = Date.now();
    const COOLDOWN_MS = 5000; // 5 seconds cooldown

    if (lastScanRef.current.code === code &&
        (now - lastScanRef.current.timestamp) < COOLDOWN_MS) {
      return; // Ignore duplicate scan
    }

    // Prevent concurrent processing
    if (isProcessingRef.current) {
      return;
    }
    isProcessingRef.current = true;

    // Update last scan info
    lastScanRef.current = { code, timestamp: now };

    // Use refs to get current state (avoids closure issues with scanner callback)
    const currentStudents = studentsRef.current;
    const currentTodayAttendance = todayAttendanceRef.current;

    // Find student by QR code
    const student = currentStudents.find((s) => s.qr_code === code);

    if (!student) {
      setScanResult({
        success: false,
        message: `Code QR non reconnu: ${code}`,
      });
      setTimeout(() => setScanResult(null), 3000);
      isProcessingRef.current = false;
      return;
    }

    try {
      // Check if student is already present today (has entry but no exit)
      const isPresent = currentTodayAttendance.some(
        (a) => a.student_id === student.id && a.time_in && !a.time_out
      );

      let result;
      if (isPresent) {
        // Student is present, so mark exit
        result = await api.attendance.scanOut(student.id);
        result.action = 'exit';
      } else {
        // Student is not present, so mark entry
        result = await api.attendance.scanIn(student.id);
        result.action = 'entry';
      }

      setScanResult({
        ...result,
        student_name: student.full_name,
      });

      // Refresh attendance list
      loadData();

      // Auto-clear result after 3 seconds
      setTimeout(() => setScanResult(null), 3000);
    } catch (error) {
      console.error('Error processing attendance:', error);
      setScanResult({
        success: false,
        message: 'Erreur lors de l\'enregistrement',
      });
      setTimeout(() => setScanResult(null), 3000);
    } finally {
      isProcessingRef.current = false;
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    if (manualCode.trim()) {
      await processCode(manualCode.trim().toUpperCase());
      setManualCode('');
    }
  }

  async function quickAttendance(studentId) {
    try {
      // Check if student is already present today
      const isPresent = todayAttendance.some(
        (a) => a.student_id === studentId && a.time_in && !a.time_out
      );

      let result;
      if (isPresent) {
        result = await api.attendance.scanOut(studentId);
        result.action = 'exit';
      } else {
        result = await api.attendance.scanIn(studentId);
        result.action = 'entry';
      }

      setScanResult(result);
      loadData();
      setTimeout(() => setScanResult(null), 3000);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get students who are present (have entry but no exit today)
  const presentStudents = todayAttendance.filter((a) => a.time_in && !a.time_out);

  // Calculate statistics
  const activeStudents = students.filter((s) => s.status === 'En formation');
  const totalActiveStudents = activeStudents.length;
  const presentCount = presentStudents.length;
  const absentCount = totalActiveStudents - presentCount;
  const attendanceRate = totalActiveStudents > 0
    ? Math.round((presentCount / totalActiveStudents) * 100)
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Présence</h1>
        <p className="text-gray-500">{today}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Étudiants</p>
              <p className="text-2xl font-bold text-gray-900">{totalActiveStudents}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Présents Aujourd'hui</p>
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Absents Aujourd'hui</p>
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Taux de Présence</p>
              <p className={`text-2xl font-bold ${attendanceRate >= 80 ? 'text-green-600' : attendanceRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {attendanceRate}%
              </p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${attendanceRate >= 80 ? 'bg-green-100' : attendanceRate >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <svg className={`w-5 h-5 ${attendanceRate >= 80 ? 'text-green-600' : attendanceRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${attendanceRate >= 80 ? 'bg-green-500' : attendanceRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${attendanceRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <div className="space-y-6">
          {/* Auto Mode Info */}
          <div className="card bg-blue-50 border border-blue-200">
            <div className="flex items-center text-blue-800">
              <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Mode Automatique</p>
                <p className="text-sm">Premier scan = Entrée, Deuxième scan = Sortie</p>
              </div>
            </div>
          </div>

          {/* Scan Result */}
          {scanResult && (
            <div
              className={`p-4 rounded-lg ${
                scanResult.success
                  ? scanResult.action === 'entry'
                    ? 'bg-green-100 text-green-800 border-2 border-green-400'
                    : 'bg-orange-100 text-orange-800 border-2 border-orange-400'
                  : 'bg-red-100 text-red-800 border-2 border-red-400'
              }`}
            >
              <div className="flex items-center">
                {scanResult.success ? (
                  scanResult.action === 'entry' ? (
                    <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  )
                ) : (
                  <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div>
                  <p className="text-lg font-bold">{scanResult.student_name || 'Inconnu'}</p>
                  <p className="text-sm font-medium">
                    {scanResult.success
                      ? scanResult.action === 'entry'
                        ? 'ENTRÉE ENREGISTRÉE'
                        : 'SORTIE ENREGISTRÉE'
                      : scanResult.message}
                  </p>
                  {scanResult.time_in && <p className="text-sm">Heure: {scanResult.time_in}</p>}
                  {scanResult.time_out && <p className="text-sm">Heure: {scanResult.time_out}</p>}
                </div>
              </div>
            </div>
          )}

          {/* QR Scanner */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-header mb-0">Scanner QR Code</h2>
              <button
                onClick={() => {
                  if (scannerRef.current) {
                    scannerRef.current.clear().catch(console.error);
                    scannerRef.current = null;
                    setScannerReady(false);
                  }
                  setScannerError(null);
                  setShowScanner(!showScanner);
                }}
                className={`btn ${showScanner ? 'btn-danger' : 'btn-primary'}`}
              >
                {showScanner ? 'Arrêter' : 'Démarrer Caméra'}
              </button>
            </div>

            {/* Scanner Error */}
            {scannerError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center text-red-700">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{scannerError}</span>
                </div>
                <p className="mt-2 text-sm text-red-600">
                  Vérifiez que votre caméra est connectée et que vous avez autorisé l'accès.
                </p>
              </div>
            )}

            {/* Camera View */}
            {showScanner && !scannerError && (
              <div className="mb-4">
                {!scannerReady && (
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <svg className="w-12 h-12 text-primary-500 mx-auto mb-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-gray-600 font-medium">Initialisation de la caméra...</p>
                    <p className="text-sm text-gray-500 mt-1">Veuillez autoriser l'accès à la caméra si demandé</p>
                  </div>
                )}
                <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
              </div>
            )}

            {!showScanner && !scannerError && (
              <div className="bg-gray-100 rounded-lg p-8 text-center mb-4">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-500 font-medium">Cliquez sur "Démarrer Caméra" pour scanner</p>
                <p className="text-sm text-gray-400 mt-2">Ou utilisez l'entrée manuelle ci-dessous</p>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Ou entrer le code manuellement:</h3>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex: STU-ABC12345"
                  className="form-input flex-1"
                />
                <button type="submit" className="btn btn-primary">
                  Valider
                </button>
              </form>
            </div>
          </div>

          {/* Quick Actions for Present Students */}
          {presentStudents.length > 0 && (
            <div className="card">
              <h2 className="card-header">Étudiants Présents ({presentStudents.length})</h2>
              <div className="space-y-2">
                {presentStudents.map((attendance) => (
                  <div
                    key={attendance.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-green-700 font-bold">
                          {attendance.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{attendance.full_name}</p>
                        <p className="text-sm text-green-600">Entrée: {attendance.time_in}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => quickAttendance(attendance.student_id)}
                      className="btn btn-secondary btn-sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                      </svg>
                      Sortie
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Today's Attendance List */}
        <div className="card">
          <h2 className="card-header">Présence Aujourd'hui</h2>
          {todayAttendance.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune présence enregistrée aujourd'hui</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Entrée</th>
                    <th>Sortie</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAttendance.map((attendance) => (
                    <tr key={attendance.id}>
                      <td>
                        <div>
                          <p className="font-medium">{attendance.full_name}</p>
                          <p className="text-xs text-gray-500">{attendance.qr_code}</p>
                        </div>
                      </td>
                      <td>{attendance.time_in || '-'}</td>
                      <td>{attendance.time_out || '-'}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(attendance.status)}`}>
                          {attendance.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Entry for Students */}
      <QuickAttendance
        students={students}
        presentStudents={presentStudents}
        onQuickAttendance={quickAttendance}
      />
    </div>
  );
}

export default Attendance;
