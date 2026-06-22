import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  Brain,
  CheckCircle2,
  Lightbulb,
  Car,
  ArrowLeft,
  Download,
  BarChart3,
  Activity,
  Gauge,
  Navigation,
} from "lucide-react";

interface Violation {
  id?: string;
  type: string;
  points: number;
  timestamp: Date;
  description?: string;
}

interface EEGData {
  attention: number;
  fatigue: number;
  timestamp?: Date;
  eegFatigueScore?: number;
  alphaPower?: number;
  thetaPower?: number;
  betaPower?: number;
  deltaPower?: number;
  gammaPower?: number;
}

interface FaceRecognitionData {
  drowsiness: number;
  distraction: number;
  eyesClosed: number;
  yawning: number;
  lookingAway: number;
  timestamp?: Date;
}

interface SessionData {
  sessionId: string;
  routeName: string;
  startTime: Date;
  endTime: Date;
  checkpointsReached: number;
  totalCheckpoints: number;
  violations: Violation[];
  eegData: EEGData[];
  faceData: FaceRecognitionData[];
  totalViolationPoints: number;
  averageSpeed?: number;
  maxSpeed?: number;
  totalDistance?: number;
  duration?: number;
  completionTime?: number;
  reachedCount?: number;
  totalWaypoints?: number;
  missedCount?: number;
  collisions?: number;
  laneDeviations?: number;
}

export default function SessionResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [savedToHistory, setSavedToHistory] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // --- ALL HOOKS MUST BE BEFORE ANY EARLY RETURN ---

  // Parse incoming session data
  useEffect(() => {
    const data = location.state as SessionData;
    if (data) {
      const processedData: SessionData = {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        violations: data.violations?.map(v => ({
          ...v,
          timestamp: new Date(v.timestamp)
        })) || [],
        eegData: data.eegData || [],
        faceData: data.faceData || [],
      };
      setSessionData(processedData);
    }
  }, [location.state]);

  // Calculate EEG statistics
  const eegStats = useMemo(() => {
    if (!sessionData?.eegData?.length) {
      return {
        avgFatigue: 0,
        maxFatigue: 0,
        minFatigue: 0,
        alertCount: 0,
        drowsyCount: 0,
        fatiguedCount: 0,
        avgAlpha: 0,
        avgTheta: 0,
        avgBeta: 0,
        avgDelta: 0,
        avgGamma: 0,
        durationMinutes: 0,
        fatigueTimeline: [] as { value: number; status: 'alert' | 'drowsy' | 'fatigued' }[]
      };
    }

    const eegData = sessionData.eegData;
    const fatigueScores = eegData.map(d => d.eegFatigueScore ?? d.fatigue ?? 0);
    const avgFatigue = fatigueScores.reduce((a, b) => a + b, 0) / fatigueScores.length;
    const maxFatigue = Math.max(...fatigueScores);
    const minFatigue = Math.min(...fatigueScores);

    const alertCount = fatigueScores.filter(f => f < 3).length;
    const drowsyCount = fatigueScores.filter(f => f >= 3 && f < 6).length;
    const fatiguedCount = fatigueScores.filter(f => f >= 6).length;

    const avgAlpha = eegData.reduce((a, d) => a + (d.alphaPower || 0), 0) / eegData.length;
    const avgTheta = eegData.reduce((a, d) => a + (d.thetaPower || 0), 0) / eegData.length;
    const avgBeta = eegData.reduce((a, d) => a + (d.betaPower || 0), 0) / eegData.length;
    const avgDelta = eegData.reduce((a, d) => a + (d.deltaPower || 0), 0) / eegData.length;
    const avgGamma = eegData.reduce((a, d) => a + (d.gammaPower || 0), 0) / eegData.length;

    const duration = sessionData.duration || sessionData.completionTime || 
      Math.floor((sessionData.endTime.getTime() - sessionData.startTime.getTime()) / 1000);
    const durationMinutes = duration / 60;

    // Timeline data for chart
    const fatigueTimeline = fatigueScores.map(f => ({
      value: f,
      status: (f < 3 ? 'alert' : f < 6 ? 'drowsy' : 'fatigued') as 'alert' | 'drowsy' | 'fatigued'
    }));

    return {
      avgFatigue: Number(avgFatigue.toFixed(2)),
      maxFatigue: Number(maxFatigue.toFixed(2)),
      minFatigue: Number(minFatigue.toFixed(2)),
      alertCount,
      drowsyCount,
      fatiguedCount,
      avgAlpha: Number(avgAlpha.toFixed(2)),
      avgTheta: Number(avgTheta.toFixed(2)),
      avgBeta: Number(avgBeta.toFixed(2)),
      avgDelta: Number(avgDelta.toFixed(2)),
      avgGamma: Number(avgGamma.toFixed(2)),
      durationMinutes: Number(durationMinutes.toFixed(1)),
      fatigueTimeline
    };
  }, [sessionData]);

  // Calculate violation stats
  const violationStats = useMemo(() => {
    const violations = sessionData?.violations || [];
    const byType: Record<string, number> = {};
    violations.forEach(v => {
      byType[v.type] = (byType[v.type] || 0) + 1;
    });
    return {
      total: violations.length,
      totalPoints: sessionData?.totalViolationPoints || violations.reduce((a, v) => a + v.points, 0),
      byType
    };
  }, [sessionData]);

  // Save session to history function
  const saveToHistory = useCallback(() => {
    if (!sessionData || savedToHistory) return;

    try {
      const existingSessions = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
      const newSession = {
        ...sessionData,
        savedAt: new Date().toISOString(),
        stats: eegStats,
        violationStats
      };

      const exists = existingSessions.some((s: SessionData) => s.sessionId === sessionData.sessionId);
      if (!exists) {
        existingSessions.unshift(newSession);
        if (existingSessions.length > 50) existingSessions.pop();
        localStorage.setItem('sessionHistory', JSON.stringify(existingSessions));
      }
      setSavedToHistory(true);
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  }, [sessionData, savedToHistory, eegStats, violationStats]);

  // Auto-save to history
  useEffect(() => {
    if (sessionData && !savedToHistory) {
      const timer = setTimeout(saveToHistory, 1000);
      return () => clearTimeout(timer);
    }
  }, [sessionData, savedToHistory, saveToHistory]);

  // Export handler (JSON)
  const handleExport = useCallback(() => {
    if (!sessionData) return;
    setShowExportMenu(false);

    const exportData = {
      sessionId: sessionData.sessionId,
      routeName: sessionData.routeName,
      startTime: sessionData.startTime.toISOString(),
      endTime: sessionData.endTime.toISOString(),
      duration: `${eegStats.durationMinutes} menit`,
      eegStats,
      violationStats,
      metrics: {
        averageSpeed: sessionData.averageSpeed || 0,
        collisions: sessionData.collisions || violationStats.byType['collision'] || 0,
        laneDeviations: sessionData.laneDeviations || violationStats.byType['lane_deviation'] || 0,
        totalDistance: sessionData.totalDistance || 0
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${sessionData.sessionId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sessionData, eegStats, violationStats]);

  // CSV Export handler
  const handleExportCSV = useCallback(() => {
    if (!sessionData) return;
    setShowExportMenu(false);

    const rows: string[][] = [];

    // ---- Summary section ----
    rows.push(['=== RINGKASAN SESI ===']);
    rows.push(['Session ID', sessionData.sessionId]);
    rows.push(['Rute', sessionData.routeName || '-']);
    rows.push(['Mulai', sessionData.startTime.toISOString()]);
    rows.push(['Selesai', sessionData.endTime.toISOString()]);
    rows.push(['Durasi (menit)', String(eegStats.durationMinutes)]);
    rows.push(['Rata-rata Kecepatan (km/h)', String((sessionData.averageSpeed || 0).toFixed(1))]);
    rows.push(['Total Jarak (km)', String((sessionData.totalDistance || 0).toFixed(1))]);
    rows.push(['Tabrakan', String(sessionData.collisions || violationStats.byType['collision'] || 0)]);
    rows.push(['Penyimpangan Jalur', String(sessionData.laneDeviations || violationStats.byType['lane_deviation'] || 0)]);
    rows.push([]);

    // ---- EEG Stats ----
    rows.push(['=== STATISTIK EEG ===']);
    rows.push(['Avg Fatigue Score', String(eegStats.avgFatigue)]);
    rows.push(['Max Fatigue Score', String(eegStats.maxFatigue)]);
    rows.push(['Min Fatigue Score', String(eegStats.minFatigue)]);
    rows.push(['Waktu Alert (detik)', String(eegStats.alertCount)]);
    rows.push(['Waktu Drowsy (detik)', String(eegStats.drowsyCount)]);
    rows.push(['Waktu Fatigued (detik)', String(eegStats.fatiguedCount)]);
    rows.push(['Avg Alpha Power', String(eegStats.avgAlpha)]);
    rows.push(['Avg Theta Power', String(eegStats.avgTheta)]);
    rows.push(['Avg Beta Power', String(eegStats.avgBeta)]);
    rows.push(['Avg Delta Power', String(eegStats.avgDelta)]);
    rows.push(['Avg Gamma Power', String(eegStats.avgGamma)]);
    rows.push([]);

    // ---- Violations ----
    rows.push(['=== PELANGGARAN ===']);
    rows.push(['Total Pelanggaran', String(violationStats.total)]);
    rows.push(['Total Poin', String(violationStats.totalPoints)]);
    rows.push(['Jenis', 'Jumlah']);
    Object.entries(violationStats.byType).forEach(([type, count]) => {
      rows.push([type, String(count)]);
    });
    rows.push([]);

    // ---- EEG Timeline ----
    if (sessionData.eegData?.length) {
      rows.push(['=== DATA EEG (TIMELINE) ===']);
      rows.push(['Timestamp', 'FatigueScore', 'AlphaPower', 'ThetaPower', 'BetaPower', 'DeltaPower', 'GammaPower', 'Attention', 'Fatigue']);
      sessionData.eegData.forEach((d) => {
        rows.push([
          d.timestamp ? new Date(d.timestamp).toISOString() : '-',
          String(d.eegFatigueScore ?? d.fatigue ?? 0),
          String(d.alphaPower ?? 0),
          String(d.thetaPower ?? 0),
          String(d.betaPower ?? 0),
          String(d.deltaPower ?? 0),
          String(d.gammaPower ?? 0),
          String(d.attention ?? 0),
          String(d.fatigue ?? 0),
        ]);
      });
      rows.push([]);
    }

    // ---- Serialize to CSV ----
    const csvContent = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${sessionData.sessionId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sessionData, eegStats, violationStats]);

  // --- ALL HOOKS ABOVE, EARLY RETURN BELOW ---

  if (!sessionData) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 48, height: 48, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', 
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: '#64748b' }}>Memuat hasil sesi...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Generate analysis summary text
  const generateSummary = () => {
    const fatigueLevel = eegStats.avgFatigue < 3 ? 'sangat baik' : eegStats.avgFatigue < 5 ? 'cukup baik' : 'perlu diperbaiki';
    const dominantWave = [
      { name: 'Alpha', value: eegStats.avgAlpha },
      { name: 'Beta', value: eegStats.avgBeta },
      { name: 'Theta', value: eegStats.avgTheta },
      { name: 'Delta', value: eegStats.avgDelta },
      { name: 'Gamma', value: eegStats.avgGamma }
    ].sort((a, b) => b.value - a.value)[0];

    const waveAnalysis = dominantWave.name === 'Beta' ? 'mengindikasikan konsentrasi tinggi' :
                        dominantWave.name === 'Alpha' ? 'mengindikasikan ketenangan' :
                        dominantWave.name === 'Theta' ? 'mengindikasikan kantuk' : 
                        'perlu perhatian lebih';

    return `Sesi Anda menunjukkan tingkat kewaspadaan yang ${fatigueLevel} dengan rata-rata fatigue score ${eegStats.avgFatigue}. Anda mampu mempertahankan fokus sepanjang ${eegStats.durationMinutes} menit bermain. Status Brain Wave menunjukkan aktivitas ${dominantWave.name} yang dominan, ${waveAnalysis}.`;
  };

  // Get drowsy detection status
  const hasDrowsiness = eegStats.drowsyCount > 0 || eegStats.fatiguedCount > 0;
  const collisionCount = sessionData.collisions || violationStats.byType['collision'] || 0;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                background: 'transparent', border: 'none', color: '#64748b', 
                cursor: 'pointer', fontSize: 14
              }}
            >
              <ArrowLeft size={16} />
              Kembali
            </button>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Hasil Analisis Sesi
            </h1>
          </div>
          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
                color: '#475569', cursor: 'pointer', fontSize: 14
              }}
            >
              <Download size={16} />
              Export ▾
            </button>
            {showExportMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                  onClick={() => setShowExportMenu(false)}
                />
                <div style={{
                  position: 'absolute', right: 0, top: '110%', zIndex: 100,
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 160,
                }}>
                  <button
                    onClick={handleExportCSV}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', border: 'none', background: 'transparent',
                      cursor: 'pointer', fontSize: 13, color: '#1e293b', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Download size={14} color="#22c55e" />
                    <span>Export CSV</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>Spreadsheet</span>
                  </button>
                  <div style={{ height: 1, background: '#f1f5f9' }} />
                  <button
                    onClick={handleExport}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', border: 'none', background: 'transparent',
                      cursor: 'pointer', fontSize: 13, color: '#1e293b', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Download size={14} color="#3b82f6" />
                    <span>Export JSON</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>Raw data</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {/* Durasi Sesi */}
          <div style={{ 
            background: 'white', borderRadius: 16, padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #3b82f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Clock size={18} color="#3b82f6" />
              <span style={{ fontSize: 13, color: '#64748b' }}>Durasi Sesi</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1e293b' }}>
              {eegStats.durationMinutes}m
            </div>
          </div>

          {/* Fatigue Rata-rata */}
          <div style={{ 
            background: 'white', borderRadius: 16, padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #f59e0b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TrendingUp size={18} color="#f59e0b" />
              <span style={{ fontSize: 13, color: '#64748b' }}>Fatigue Rata-rata</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1e293b' }}>
              {eegStats.avgFatigue}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Min: {eegStats.minFatigue} | Max: {eegStats.maxFatigue}
            </div>
          </div>

          {/* Status Pengamatan */}
          <div style={{ 
            background: 'white', borderRadius: 16, padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #ef4444'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={18} color="#ef4444" />
              <span style={{ fontSize: 13, color: '#64748b' }}>Status Pengamatan</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 12, height: 12, background: '#22c55e', borderRadius: '50%', margin: '0 auto 4px' }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>Alert</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{eegStats.alertCount} detik</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: '50%', margin: '0 auto 4px' }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>Drowsy</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{eegStats.drowsyCount} detik</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: '50%', margin: '0 auto 4px' }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>Fatigued</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{eegStats.fatiguedCount} detik</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 12, background: '#f8fafc', padding: 8, borderRadius: 6 }}>
              <strong>Penjelasan:</strong> Alert = Waspada | Drowsy = Mengantuk | Fatigued = Lelah
            </div>
          </div>
        </div>

        {/* Timeline Skor Fatigue */}
        <div style={{ 
          background: 'white', borderRadius: 16, padding: 24, marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BarChart3 size={20} color="#6366f1" />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Timeline Skor Fatigue</span>
          </div>
          
          {/* Chart */}
          <div style={{ 
            background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16,
            height: 120, display: 'flex', alignItems: 'flex-end', gap: 2, overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Flat baseline line */}
            <div style={{
              position: 'absolute', bottom: 16, left: 16, right: 16,
              height: 1, background: '#e2e8f0', pointerEvents: 'none'
            }} />
            {eegStats.fatigueTimeline.length > 0 ? (
              eegStats.fatigueTimeline.slice(-100).map((item, idx) => {
                const color = item.status === 'alert' ? '#22c55e' : 
                              item.status === 'drowsy' ? '#f59e0b' : '#ef4444';
                // If value is 0 or near-zero, show a tiny flat bar (4px) in gray
                const hasValue = item.value > 0.05;
                const height = hasValue ? Math.max(8, (item.value / 10) * 100) : 4;
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      minWidth: 3,
                      maxWidth: 8,
                      height: `${height}%`,
                      background: hasValue ? color : '#cbd5e1',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s'
                    }}
                  />
                );
              })
            ) : (
              /* No data: show 60 flat gray bars as baseline */
              Array.from({ length: 60 }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    minWidth: 3,
                    maxWidth: 8,
                    height: '4%',
                    background: '#cbd5e1',
                    borderRadius: '2px 2px 0 0'
                  }}
                />
              ))
            )}
          </div>
          {eegStats.fatigueTimeline.length === 0 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
              Tidak ada data EEG — grafik menampilkan baseline kosong
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, background: '#22c55e', borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>Alert (0-3)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>Drowsy (3-6)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>Fatigued (6-10)</span>
            </div>
          </div>
        </div>

        {/* Analisis Brain Wave */}
        <div style={{ 
          background: 'white', borderRadius: 16, padding: 24, marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Activity size={20} color="#8b5cf6" />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Analisis Brain Wave</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              { name: 'Delta', hz: '0-4 Hz', value: eegStats.avgDelta, color: '#ef4444' },
              { name: 'Theta', hz: '4-8 Hz', value: eegStats.avgTheta, color: '#f59e0b' },
              { name: 'Alpha', hz: '8-12 Hz', value: eegStats.avgAlpha, color: '#22c55e' },
              { name: 'Beta', hz: '12-30 Hz', value: eegStats.avgBeta, color: '#3b82f6' },
              { name: 'Gamma', hz: '30-100 Hz', value: eegStats.avgGamma, color: '#8b5cf6' }
            ].map((wave) => (
              <div key={wave.name} style={{ 
                background: '#f8fafc', borderRadius: 12, padding: 16, textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{wave.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{wave.hz}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: wave.color }}>{wave.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ringkasan Analisis */}
        <div style={{ 
          background: 'white', borderRadius: 16, padding: 24, marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <CheckCircle2 size={20} color="#22c55e" />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Ringkasan Analisis</span>
          </div>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
            {generateSummary()}
          </p>

          {/* Performance Grade */}
          {(() => {
            const hasEEG = sessionData.eegData.length > 0;
            const fatiguePenalty = eegStats.avgFatigue > 5 ? 20 : eegStats.avgFatigue > 3 ? 10 : 0;
            const collisionPenalty = (sessionData.collisions || violationStats.byType['collision'] || 0) * 8;
            const drowsyPenalty = eegStats.fatiguedCount * 0.5;
            const score = hasEEG ? Math.max(0, Math.min(100, Math.round(100 - fatiguePenalty - collisionPenalty - drowsyPenalty))) : null;
            const grade = score === null ? null : score >= 85 ? { label: 'A', color: '#22c55e', bg: '#f0fdf4', text: 'Sangat Baik' } :
                          score >= 70 ? { label: 'B', color: '#3b82f6', bg: '#eff6ff', text: 'Baik' } :
                          score >= 55 ? { label: 'C', color: '#f59e0b', bg: '#fffbeb', text: 'Cukup' } :
                          { label: 'D', color: '#ef4444', bg: '#fef2f2', text: 'Perlu Perbaikan' };
            if (!grade) return null;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: grade.bg, borderRadius: 12, padding: 16 }}>
                <div style={{ 
                  width: 56, height: 56, borderRadius: 12, background: grade.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 800, color: 'white', flexShrink: 0
                }}>{grade.label}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Nilai Performa: {score}/100 — {grade.text}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Berdasarkan skor fatigue, jumlah tabrakan, dan durasi kondisi mengantuk selama sesi.
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Analisis Pelanggaran */}
        {violationStats.total > 0 && (
        <div style={{ 
          background: 'white', borderRadius: 16, padding: 24, marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={20} color="#ef4444" />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Analisis Pelanggaran</span>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
              {violationStats.total} pelanggaran · {violationStats.totalPoints} poin
            </span>
          </div>

          {/* Violation bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(violationStats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const labels: Record<string, { label: string; color: string }> = {
                collision: { label: 'Tabrakan', color: '#ef4444' },
                lane_deviation: { label: 'Penyimpangan Jalur', color: '#f59e0b' },
                drowsiness: { label: 'Mengantuk', color: '#f59e0b' },
                fatigue: { label: 'Kelelahan', color: '#ef4444' },
                distraction: { label: 'Distraksi', color: '#eab308' },
                eyes_closed: { label: 'Mata Tertutup', color: '#dc2626' },
                yawning: { label: 'Menguap', color: '#ea580c' },
                looking_away: { label: 'Melihat Arah Lain', color: '#eab308' },
                speed_violation: { label: 'Pelanggaran Kecepatan', color: '#ef4444' },
                low_attention: { label: 'Perhatian Rendah', color: '#a855f7' },
              };
              const info = labels[type] || { label: type, color: '#6b7280' };
              const pct = Math.round((count / violationStats.total) * 100);
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: '#374151', fontWeight: 500 }}>{info.label}</span>
                    <span style={{ color: info.color, fontWeight: 600 }}>{count}x ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', width: `${pct}%`, background: info.color,
                      borderRadius: 4, transition: 'width 0.5s'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insight */}
          <div style={{ marginTop: 16, background: '#fef2f2', borderRadius: 10, padding: 12, fontSize: 13, color: '#7f1d1d' }}>
            ⚠️ <strong>Insight:</strong>{' '}
            {(() => {
              const topType = Object.entries(violationStats.byType).sort((a, b) => b[1] - a[1])[0];
              const insights: Record<string, string> = {
                collision: 'Frekuensi tabrakan tinggi — pertimbangkan untuk mengurangi kecepatan dan tingkatkan fokus pada lingkungan.',
                lane_deviation: 'Sering keluar jalur — pastikan kondisi tubuh prima sebelum berkendara.',
                drowsiness: 'Kondisi mengantuk terdeteksi dominan — istirahat cukup sebelum berkendara.',
                fatigue: 'Kelelahan mendominasi sesi — hindari berkendara jarak jauh tanpa istirahat.',
                distraction: 'Distraksi sering terjadi — minimalisir gangguan selama berkendara.',
                eyes_closed: 'Mata sering tertutup — waspadai microsleep.',
                low_attention: 'Tingkat perhatian rendah dominan — hindari berkendara saat kurang tidur.',
              };
              return insights[topType?.[0]] || `Pelanggaran terbanyak adalah ${topType?.[0]} sebanyak ${topType?.[1]}x — perhatikan faktor ini untuk sesi berikutnya.`;
            })()}
          </div>
        </div>
        )}

        {/* Rekomendasi & Tips */}
        <div style={{ 
          background: 'white', borderRadius: 16, padding: 24, marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Lightbulb size={20} color="#f59e0b" />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Rekomendasi & Tips</span>
          </div>
          
          {hasDrowsiness && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                  ⚠️ Status Mengantuk Terdeteksi
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14, lineHeight: 1.8 }}>
                <li>Lakukan aktivitas ringan seperti berjalan atau minum air dingin saat merasa mengantuk</li>
                <li>Kurangi durasi perjalanan dan ambil istirahat setiap 2 jam berkendara</li>
                <li>Pastikan posisi berkendara ergonomis untuk menghindari ketegangan otot yang menyebabkan kantuk</li>
              </ul>
            </div>
          )}

          {collisionCount > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                  ⚠️ Keselamatan Berkendara
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14, lineHeight: 1.8 }}>
                <li>Tabrakan terdeteksi {collisionCount}x - tingkatkan awareness terhadap lingkungan sekitar</li>
                <li>Fokus pada prediksi dan antisipasi pergerakan kendaraan lain</li>
                <li>Kurangi kecepatan saat kondisi fatigue meningkat untuk menjaga keselamatan</li>
              </ul>
            </div>
          )}

          {!hasDrowsiness && collisionCount === 0 && (
            <div style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} />
              <span style={{ fontSize: 14 }}>Performa mengemudi Anda sudah baik! Pertahankan kebiasaan ini.</span>
            </div>
          )}
        </div>

        {/* Metrik Kendaraan */}
        <div style={{ 
          background: 'white', borderRadius: 16, padding: 24, marginBottom: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Car size={20} color="#6366f1" />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Metrik Kendaraan</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div style={{ 
              background: '#f0fdf4', borderRadius: 12, padding: 16, 
              borderLeft: '3px solid #22c55e'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Gauge size={16} color="#22c55e" />
                <span style={{ fontSize: 12, color: '#64748b' }}>Kecepatan Rata-rata</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
                {(sessionData.averageSpeed || 0).toFixed(1)} km/h
              </div>
            </div>

            <div style={{ 
              background: '#fef2f2', borderRadius: 12, padding: 16, 
              borderLeft: '3px solid #ef4444'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <AlertTriangle size={16} color="#ef4444" />
                <span style={{ fontSize: 12, color: '#64748b' }}>Tabrakan</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>
                {collisionCount}x
              </div>
            </div>

            <div style={{ 
              background: '#fffbeb', borderRadius: 12, padding: 16, 
              borderLeft: '3px solid #f59e0b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Navigation size={16} color="#f59e0b" />
                <span style={{ fontSize: 12, color: '#64748b' }}>Penyimpangan Jalur</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>
                {sessionData.laneDeviations || violationStats.byType['lane_deviation'] || 0}x
              </div>
            </div>

            <div style={{ 
              background: '#f0f9ff', borderRadius: 12, padding: 16, 
              borderLeft: '3px solid #3b82f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Brain size={16} color="#3b82f6" />
                <span style={{ fontSize: 12, color: '#64748b' }}>Total Jarak</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
                {(sessionData.totalDistance || 0).toFixed(1)} km
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button
            onClick={() => {
              saveToHistory();
              navigate('/dashboard', { state: { tab: 'history' } });
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
              background: '#22c55e', border: 'none', borderRadius: 12,
              color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <CheckCircle2 size={18} />
            {savedToHistory ? '✓ Tersimpan di History' : 'Tersimpan di History'}
          </button>

          <button
            onClick={() => navigate('/game')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
              background: '#3b82f6', border: 'none', borderRadius: 12,
              color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}
          >
            Main Lagi
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
              background: 'white', border: '2px solid #e2e8f0', borderRadius: 12,
              color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
