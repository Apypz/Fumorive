import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Brain,
  Eye,
  Activity,
  BarChart3,
  Target,
  Zap,
  AlertOctagon,
  Timer,
  Route,
  Calendar,
  ArrowLeft,
  Download,
  Share2,
  Flag,
} from "lucide-react";

interface Violation {
  type: string;
  points: number;
  timestamp: Date;
  description?: string;
}

interface EEGData {
  attention: number;
  fatigue: number;
  timestamp?: Date;
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
}

// Violation type mapping
const VIOLATION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  drowsiness: { label: "Kantuk Terdeteksi", icon: "😴", color: "#f59e0b" },
  distraction: { label: "Distraksi", icon: "⚠️", color: "#eab308" },
  fatigue: { label: "Kelelahan", icon: "🧠", color: "#ef4444" },
  low_attention: { label: "Perhatian Rendah", icon: "🎯", color: "#a855f7" },
  eyes_closed: { label: "Mata Tertutup", icon: "👁️", color: "#dc2626" },
  yawning: { label: "Menguap", icon: "🥱", color: "#ea580c" },
  looking_away: { label: "Melihat ke Arah Lain", icon: "👀", color: "#eab308" },
  speed_violation: { label: "Pelanggaran Kecepatan", icon: "⚡", color: "#ef4444" },
};

export default function SessionResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "violations" | "eeg" | "face">("overview");
  const [savedToHistory, setSavedToHistory] = useState(false);

  useEffect(() => {
    const data = location.state as SessionData;
    if (data) {
      // Ensure dates are Date objects
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
      saveSessionToHistory(processedData);
    }
  }, [location.state]);

  const saveSessionToHistory = (data: SessionData) => {
    try {
      const existingSessions = JSON.parse(localStorage.getItem("drivingSessionHistory") || "[]");
      const sessionExists = existingSessions.some((s: SessionData) => s.sessionId === data.sessionId);
      
      if (!sessionExists) {
        const updatedSessions = [data, ...existingSessions].slice(0, 50);
        localStorage.setItem("drivingSessionHistory", JSON.stringify(updatedSessions));
      }
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  };

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Memuat hasil sesi...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics with fallback to 0
  const duration = Math.floor((sessionData.endTime.getTime() - sessionData.startTime.getTime()) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const completionRate = sessionData.totalCheckpoints > 0 ? Math.round((sessionData.checkpointsReached / sessionData.totalCheckpoints) * 100) : 0;
  
  // EEG Statistics with fallback to 0
  const avgAttention = sessionData.eegData.length > 0
    ? Math.round(sessionData.eegData.reduce((sum, d) => sum + (d.attention || 0), 0) / sessionData.eegData.length)
    : 0;
  const avgFatigue = sessionData.eegData.length > 0
    ? Math.round(sessionData.eegData.reduce((sum, d) => sum + (d.fatigue || 0), 0) / sessionData.eegData.length)
    : 0;
  const maxFatigue = sessionData.eegData.length > 0
    ? Math.max(...sessionData.eegData.map(d => d.fatigue || 0))
    : 0;
  const minAttention = sessionData.eegData.length > 0
    ? Math.min(...sessionData.eegData.map(d => d.attention || 0))
    : 0;

  // Face Recognition Statistics with fallback to 0
  const avgDrowsiness = sessionData.faceData.length > 0
    ? Math.round(sessionData.faceData.reduce((sum, d) => sum + (d.drowsiness || 0), 0) / sessionData.faceData.length)
    : 0;
  const avgDistraction = sessionData.faceData.length > 0
    ? Math.round(sessionData.faceData.reduce((sum, d) => sum + (d.distraction || 0), 0) / sessionData.faceData.length)
    : 0;
  const eyesClosedEvents = sessionData.faceData.length > 0 ? sessionData.faceData.filter(d => (d.eyesClosed || 0) > 50).length : 0;
  const yawningEvents = sessionData.faceData.length > 0 ? sessionData.faceData.filter(d => (d.yawning || 0) > 50).length : 0;
  const lookingAwayEvents = sessionData.faceData.length > 0 ? sessionData.faceData.filter(d => (d.lookingAway || 0) > 50).length : 0;

  // Violation Statistics by Type
  const violationsByType = sessionData.violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Performance Score Calculation
  const calculatePerformanceScore = (): number => {
    let score = 100;
    score -= (sessionData.totalViolationPoints || 0) * 2;
    score -= (100 - avgAttention) * 0.3;
    score -= avgFatigue * 0.3;
    score -= avgDrowsiness * 0.2;
    score -= avgDistraction * 0.2;
    score += completionRate * 0.1;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const performanceScore = calculatePerformanceScore();
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Sangat Baik";
    if (score >= 60) return "Baik";
    if (score >= 40) return "Perlu Perbaikan";
    return "Kurang Baik";
  };

  const StatCard = ({ icon, label, value, subvalue, color = "cyan" }: { 
    icon: React.ReactNode; 
    label: string; 
    value: string | number; 
    subvalue?: string;
    color?: string;
  }) => (
    <div className={`bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-${color}-500/30 transition-all`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-${color}-500/20 text-${color}-400`}>
          {icon}
        </div>
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold text-${color}-400`}>{value}</div>
      {subvalue && <div className="text-xs text-gray-500 mt-1">{subvalue}</div>}
    </div>
  );

  const ProgressBar = ({ value, max = 100, color = "cyan", label }: { 
    value: number; 
    max?: number; 
    color?: string;
    label?: string;
  }) => (
    <div className="w-full">
      {label && <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={`text-${color}-400`}>{value}%</span>
      </div>}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-400 transition-all duration-500`}
          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        />
      </div>
    </div>
  );

  // Mini Chart Component for real data visualization
  const MiniChart = ({ data, color, label, height = 40 }: { 
    data: number[]; 
    color: string; 
    label: string; 
    height?: number;
  }) => {
    const maxValue = Math.max(...data, 1);
    const minValue = Math.min(...data, 0);
    const range = maxValue - minValue || 1;
    
    return (
      <div className="bg-slate-700/30 rounded-lg p-3">
        <div className="text-sm text-gray-400 mb-2">{label}</div>
        <div className="flex items-end gap-1" style={{ height: `${height}px` }}>
          {data.slice(-20).map((value, index) => (
            <div
              key={index}
              className={`bg-${color}-400 rounded-t`}
              style={{ 
                width: '3px',
                height: `${((value - minValue) / range) * height || 2}px`,
                minHeight: '2px'
              }}
            />
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Average: {data.length > 0 ? Math.round(data.reduce((a, b) => a + b, 0) / data.length) : 0}%
        </div>
      </div>
    );
  };

  // Calculate EEG statistics
  const eegStats = useMemo(() => {
    if (!sessionData?.eegData?.length) return null;
    const eegData = sessionData.eegData;
    
    const fatigueScores = eegData.map(d => d.eegFatigueScore || 0);
    const avgFatigue = (fatigueScores.reduce((a, b) => a + b, 0) / fatigueScores.length).toFixed(2);
    const maxFatigue = Math.max(...fatigueScores).toFixed(2);
    const minFatigue = Math.min(...fatigueScores).toFixed(2);
    
    const alertCount = fatigueScores.filter(f => f < 3).length;
    const drowsyCount = fatigueScores.filter(f => f >= 3 && f < 6).length;
    const fatiguedCount = fatigueScores.filter(f => f >= 6).length;

    const avgAlpha = (eegData.reduce((a, d) => a + (d.alphaPower || 0), 0) / eegData.length).toFixed(2);
    const avgTheta = (eegData.reduce((a, d) => a + (d.thetaPower || 0), 0) / eegData.length).toFixed(2);
    const avgBeta = (eegData.reduce((a, d) => a + (d.betaPower || 0), 0) / eegData.length).toFixed(2);

    const durationMinutes = sessionData?.duration ? ((sessionData.duration / 60).toFixed(1)) : 
                           sessionData?.completionTime ? ((sessionData.completionTime / 60).toFixed(1)) : '0';

    return {
      avgFatigue,
      maxFatigue,
      minFatigue,
      alertCount,
      drowsyCount,
      fatiguedCount,
      avgAlpha,
      avgTheta,
      avgBeta,
      durationMinutes
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

  // Auto-save to history on mount
  useEffect(() => {
    if (sessionData && !savedToHistory) {
      const timer = setTimeout(() => {
        saveToHistory();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [sessionData, savedToHistory]);

  const saveToHistory = () => {
    if (!sessionData || savedToHistory) return;
    
    // Save session to local storage
    const existingSessions = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
    const newSession = {
      ...sessionData,
      savedAt: new Date().toISOString(),
      stats: eegStats,
      violationStats: violationStats
    };
    
    // Avoid duplicates
    const exists = existingSessions.some((s: any) => s.sessionId === sessionData.sessionId);
    if (!exists) {
      existingSessions.unshift(newSession); // Add to beginning
      // Keep only last 50 sessions
      if (existingSessions.length > 50) {
        existingSessions.pop();
      }
      localStorage.setItem('sessionHistory', JSON.stringify(existingSessions));
    }
    
    setSavedToHistory(true);
  };

  const handleSaveToHistory = () => {
    saveToHistory();
    setTimeout(() => {
      navigate('/dashboard', { state: { tab: 'history' } });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Hasil Analisis Sesi</h1>
              <p className="text-gray-400 text-sm">{sessionData.routeName}</p>
              <p className="text-gray-500 text-xs mt-1 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {sessionData.startTime.toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} • {sessionData.startTime.toLocaleTimeString('id-ID', { timeStyle: 'short' })} - {sessionData.endTime.toLocaleTimeString('id-ID', { timeStyle: 'short' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Bagikan</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300 text-sm font-medium">Durasi Sesi</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {eegStats?.durationMinutes}m
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-300 text-sm font-medium">Fatigue Rata-rata</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {eegStats?.avgFatigue}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-gray-300 text-sm font-medium">Total Pelanggaran</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {violationStats.total}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-5 h-5 text-green-400" />
                <span className="text-gray-300 text-sm font-medium">Poin Pelanggaran</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {violationStats.totalPoints}
              </div>
            </div>
          </div>

          {/* EEG Status Section */}
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-red-400">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-gray-600 font-medium">Status Pengamatan</span>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">🟢</span>
                <div>
                  <div className="font-semibold text-gray-800">Alert</div>
                  <div className="text-xs text-gray-500">{eegStats?.alertCount} detik</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🟡</span>
                <div>
                  <div className="font-semibold text-gray-800">Drowsy</div>
                  <div className="text-xs text-gray-500">{eegStats?.drowsyCount} detik</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔴</span>
                <div>
                  <div className="font-semibold text-gray-800">Fatigued</div>
                  <div className="text-xs text-gray-500">{eegStats?.fatiguedCount} detik</div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
              <strong>Penjelasan:</strong> Alert = Waspada | Drowsy = Mengantuk | Fatigued = Lelah
            </div>
          </div>
        </div>

        {/* Route Completion Summary */}
        {sessionData.routeName && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <Flag className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Ringkasan Rute: {sessionData.routeName}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
                <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <div className="text-xs text-gray-400 mb-1">Checkpoint Dicapai</div>
                <div className="text-xl font-bold text-green-400">
                  {sessionData.reachedCount || 0}/{sessionData.totalWaypoints || 0}
                </div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-4 text-center border border-yellow-500/20">
                <XCircle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <div className="text-xs text-gray-400 mb-1">Checkpoint Terlewat</div>
                <div className="text-xl font-bold text-yellow-400">
                  {sessionData.missedCount || 0}
                </div>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-4 text-center border border-blue-500/20">
                <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <div className="text-xs text-gray-400 mb-1">Waktu Penyelesaian</div>
                <div className="text-xl font-bold text-blue-400">
                  {sessionData.completionTime ? `${Math.floor(sessionData.completionTime / 60)}:${Math.floor(sessionData.completionTime % 60).toString().padStart(2, '0')}` : '--:--'}
                </div>
              </div>
              <div className={`rounded-lg p-4 text-center border ${
                violationStats.totalPoints === 0 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : violationStats.totalPoints < 30 
                  ? 'bg-yellow-500/10 border-yellow-500/20' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <AlertTriangle className={`w-6 h-6 mx-auto mb-2 ${
                  violationStats.totalPoints === 0 
                    ? 'text-green-400' 
                    : violationStats.totalPoints < 30 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
                }`} />
                <div className="text-xs text-gray-400 mb-1">Total Pelanggaran</div>
                <div className={`text-xl font-bold ${
                  violationStats.totalPoints === 0 
                    ? 'text-green-400' 
                    : violationStats.totalPoints < 30 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
                }`}>
                  {violationStats.totalPoints} poin
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Violations Detail */}
        {sessionData.violations && sessionData.violations.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-bold text-gray-800">Rincian Pelanggaran ({violationStats.total}x)</h2>
            </div>
            
            {/* Violation Type Summary */}
            <div className="flex gap-4 mb-6 flex-wrap">
              {Object.entries(violationStats.byType).map(([type, count]) => {
                const config = VIOLATION_LABELS[type] || { label: type, icon: '⚠️', color: '#6b7280' };
                return (
                  <div 
                    key={type} 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200"
                  >
                    <span className="text-lg">{config.icon}</span>
                    <span className="font-semibold text-gray-800">{count}x</span>
                    <span className="text-gray-600 text-sm">{config.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Violation Timeline */}
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {sessionData.violations.map((violation, idx) => {
                const config = VIOLATION_LABELS[violation.type] || { label: violation.type, icon: '⚠️', color: '#6b7280' };
                const timeStr = new Date(violation.timestamp).toLocaleTimeString('id-ID');
                return (
                  <div 
                    key={violation.id || idx} 
                    className={`flex items-center gap-4 p-3 ${
                      idx < sessionData.violations!.length - 1 ? 'border-b border-gray-200' : ''
                    } ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <span className="text-xl">{config.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 text-sm">{violation.description}</div>
                      <div className="text-xs text-gray-500">{timeStr}</div>
                    </div>
                    <div className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-semibold">
                      +{violation.points} poin
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "violations" && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Detail Pelanggaran ({sessionData.violations.length}) 
              <span className="text-sm text-gray-400 ml-2">
                - Real Data Session {sessionData.startTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </span>
            </h3>
            {sessionData.violations.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {sessionData.violations.map((violation, index) => {
                  const config = VIOLATION_LABELS[violation.type] || { label: violation.type, icon: '⚠️', color: '#6b7280' };
                  const typeInfo = { 
                    label: config.label,
                    icon: <span>{config.icon}</span>,
                    color: 'text-orange-400'
                  };
                  return (
                    <div key={index} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg bg-slate-600/50 ${typeInfo.color}`}>
                          {typeInfo.icon}
                        </div>
                        <div>
                          <div className={`font-medium ${typeInfo.color}`}>{typeInfo.label}</div>
                          <div className="text-sm text-gray-500">
                            {violation.timestamp.toLocaleTimeString('id-ID', { timeStyle: 'medium' })}
                          </div>
                          {violation.description && (
                            <div className="text-xs text-gray-400 mt-1">{violation.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-400">-{violation.points}</div>
                        <div className="text-xs text-gray-500">poin</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-green-400 font-medium text-lg">Tidak ada pelanggaran!</p>
                <p className="text-gray-500">Sesi mengemudi berjalan dengan sempurna</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "eeg" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* EEG Overview */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Statistik EEG Real Data
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <StatCard 
                  icon={<Target className="w-5 h-5" />}
                  label="Rata-rata Perhatian"
                  value={`${avgAttention}%`}
                  subvalue={sessionData.eegData.length > 0 ? `Min: ${minAttention}%` : "Tidak ada data"}
                  color="cyan"
                />
                <StatCard 
                  icon={<Zap className="w-5 h-5" />}
                  label="Rata-rata Kelelahan"
                  value={`${avgFatigue}%`}
                  subvalue={sessionData.eegData.length > 0 ? `Max: ${maxFatigue}%` : "Tidak ada data"}
                  color="orange"
                />
              </div>
              <div className="mt-6 space-y-4">
                <ProgressBar value={avgAttention} color="cyan" label="Level Perhatian" />
                <ProgressBar value={Math.max(0, 100 - avgFatigue)} color="green" label="Level Energi" />
              </div>
            </div>

            {/* EEG Real Time Chart */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Grafik EEG Real Time
              </h3>
              {sessionData.eegData.length > 0 ? (
                <div className="space-y-4">
                  <MiniChart 
                    data={sessionData.eegData.map(d => d.attention || 0)}
                    color="cyan"
                    label="Attention Level"
                    height={60}
                  />
                  <MiniChart 
                    data={sessionData.eegData.map(d => d.fatigue || 0)}
                    color="orange"
                    label="Fatigue Level"
                    height={60}
                  />
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Data dari {sessionData.eegData.length} pengukuran selama sesi
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">Tidak ada data EEG real tersedia</p>
                  <p className="text-gray-600 text-sm">Pastikan device EEG terhubung</p>
                </div>
              )}
            </div>

            {/* EEG Analysis */}
            <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Analisis EEG Real
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${sessionData.eegData.length === 0 ? 'bg-slate-500/10 border border-slate-500/30' : avgAttention >= 70 ? 'bg-green-500/10 border border-green-500/30' : avgAttention >= 50 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className={`font-medium ${sessionData.eegData.length === 0 ? 'text-slate-400' : avgAttention >= 70 ? 'text-green-400' : avgAttention >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    Level Perhatian: {sessionData.eegData.length === 0 ? 'Tidak Ada Data' : avgAttention >= 70 ? 'Baik' : avgAttention >= 50 ? 'Sedang' : 'Rendah'}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {sessionData.eegData.length === 0 ? 'Tidak ada data EEG yang dideteksi selama sesi.' :
                      avgAttention >= 70 
                      ? 'Anda mempertahankan fokus dengan baik selama sesi.' 
                      : avgAttention >= 50 
                      ? 'Perhatian Anda cukup baik, namun bisa ditingkatkan.' 
                      : 'Perhatian Anda rendah, pertimbangkan untuk istirahat.'}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${sessionData.eegData.length === 0 ? 'bg-slate-500/10 border border-slate-500/30' : avgFatigue <= 30 ? 'bg-green-500/10 border border-green-500/30' : avgFatigue <= 60 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className={`font-medium ${sessionData.eegData.length === 0 ? 'text-slate-400' : avgFatigue <= 30 ? 'text-green-400' : avgFatigue <= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                    Level Kelelahan: {sessionData.eegData.length === 0 ? 'Tidak Ada Data' : avgFatigue <= 30 ? 'Rendah' : avgFatigue <= 60 ? 'Sedang' : 'Tinggi'}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {sessionData.eegData.length === 0 ? 'Tidak ada data kelelahan yang dideteksi.' :
                      avgFatigue <= 30 
                      ? 'Tingkat energi Anda baik selama sesi.' 
                      : avgFatigue <= 60 
                      ? 'Mulai terdeteksi kelelahan, istirahatlah jika perlu.' 
                      : 'Kelelahan tinggi terdeteksi, sangat disarankan untuk istirahat.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "face" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Face Recognition Overview */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                Statistik Face Recognition Real Data
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <StatCard 
                  icon={<Eye className="w-5 h-5" />}
                  label="Rata-rata Kantuk"
                  value={`${avgDrowsiness}%`}
                  subvalue={sessionData.faceData.length > 0 ? "Data real" : "Tidak ada data"}
                  color="yellow"
                />
                <StatCard 
                  icon={<AlertTriangle className="w-5 h-5" />}
                  label="Rata-rata Distraksi"
                  value={`${avgDistraction}%`}
                  subvalue={sessionData.faceData.length > 0 ? "Data real" : "Tidak ada data"}
                  color="red"
                />
              </div>
              <div className="mt-6 space-y-4">
                <ProgressBar value={Math.max(0, 100 - avgDrowsiness)} color="green" label="Level Kesadaran" />
                <ProgressBar value={Math.max(0, 100 - avgDistraction)} color="cyan" label="Level Fokus" />
              </div>
            </div>

            {/* Face Recognition Real Time Chart */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Grafik Face Real Time
              </h3>
              {sessionData.faceData.length > 0 ? (
                <div className="space-y-4">
                  <MiniChart 
                    data={sessionData.faceData.map(d => d.drowsiness || 0)}
                    color="yellow"
                    label="Drowsiness Level"
                    height={60}
                  />
                  <MiniChart 
                    data={sessionData.faceData.map(d => d.distraction || 0)}
                    color="red"
                    label="Distraction Level"
                    height={60}
                  />
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Data dari {sessionData.faceData.length} deteksi wajah selama sesi
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">Tidak ada data face recognition real</p>
                  <p className="text-gray-600 text-sm">Pastikan kamera terhubung dan face detection aktif</p>
                </div>
              )}
            </div>

            {/* Detection Events Real Data */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-orange-400" />
                Event Terdeteksi (Real Data)
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-red-400" />
                    <span className="text-gray-300">Mata Tertutup</span>
                  </div>
                  <span className="text-xl font-bold text-red-400">{eyesClosedEvents}x</span>
                </div>
                <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertOctagon className="w-5 h-5 text-orange-400" />
                    <span className="text-gray-300">Menguap</span>
                  </div>
                  <span className="text-xl font-bold text-orange-400">{yawningEvents}x</span>
                </div>
                <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-300">Melihat ke Arah Lain</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-400">{lookingAwayEvents}x</span>
                </div>
              </div>
              {sessionData.faceData.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-4">
                  Semua nilai menunjukkan 0 karena tidak ada data face recognition yang terdeteksi
                </div>
              )}
            </div>

            {/* Face Analysis Real Data */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Analisis Face Recognition Real
              </h3>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${sessionData.faceData.length === 0 ? 'bg-slate-500/10 border border-slate-500/30' : avgDrowsiness <= 20 ? 'bg-green-500/10 border border-green-500/30' : avgDrowsiness <= 50 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className={`font-medium ${sessionData.faceData.length === 0 ? 'text-slate-400' : avgDrowsiness <= 20 ? 'text-green-400' : avgDrowsiness <= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    Level Kantuk: {sessionData.faceData.length === 0 ? 'Tidak Ada Data' : avgDrowsiness <= 20 ? 'Rendah' : avgDrowsiness <= 50 ? 'Sedang' : 'Tinggi'}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {sessionData.faceData.length === 0 ? 'Tidak ada data face recognition yang dideteksi selama sesi.' :
                      avgDrowsiness <= 20 
                      ? 'Anda tetap terjaga dengan baik selama sesi.' 
                      : avgDrowsiness <= 50 
                      ? 'Kantuk mulai terdeteksi, pertimbangkan untuk istirahat.' 
                      : 'Kantuk tinggi terdeteksi, sangat berbahaya untuk berkendara.'}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${sessionData.faceData.length === 0 ? 'bg-slate-500/10 border border-slate-500/30' : avgDistraction <= 20 ? 'bg-green-500/10 border border-green-500/30' : avgDistraction <= 50 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className={`font-medium ${sessionData.faceData.length === 0 ? 'text-slate-400' : avgDistraction <= 20 ? 'text-green-400' : avgDistraction <= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    Level Distraksi: {sessionData.faceData.length === 0 ? 'Tidak Ada Data' : avgDistraction <= 20 ? 'Rendah' : avgDistraction <= 50 ? 'Sedang' : 'Tinggi'}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {sessionData.faceData.length === 0 ? 'Tidak ada data distraksi yang dideteksi.' :
                      avgDistraction <= 20 
                      ? 'Fokus Anda tetap pada jalan dengan baik.' 
                      : avgDistraction <= 50 
                      ? 'Beberapa distraksi terdeteksi, tetap fokus pada jalan.' 
                      : 'Distraksi tinggi terdeteksi, sangat berbahaya.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back to Dashboard Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/25"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
