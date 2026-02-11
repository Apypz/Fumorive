import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, BarChart3, TrendingUp, Brain, Clock, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import './Dashboard.css';

interface SessionData {
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in seconds
  eegData: Array<{
    timestamp: string;
    eegFatigueScore: number;
    deltaPower: number;
    thetaPower: number;
    alphaPower: number;
    betaPower: number;
    gammaPower: number;
  }>;
  gameMetrics?: {
    averageSpeed: number;
    maxSpeed: number;
    collisions: number;
    laneDeviations: number;
    totalDistance: number;
  };
}

export default function SessionResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionData = location.state as SessionData | null;
  const [savedToHistory, setSavedToHistory] = useState(false);

  // If no session data, show empty state
  if (!sessionData) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No session data available</p>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Calculate statistics
  const stats = useMemo(() => {
    if (!sessionData.eegData || sessionData.eegData.length === 0) {
      return {
        avgFatigue: 0,
        maxFatigue: 0,
        minFatigue: 10,
        alertCount: 0,
        drowsyCount: 0,
        fatiguedCount: 0,
        avgAlpha: 0,
        avgTheta: 0,
        avgBeta: 0,
        durationMinutes: 0
      };
    }

    const fatigueScores = sessionData.eegData.map(d => d.eegFatigueScore);
    const avgFatigue = (fatigueScores.reduce((a, b) => a + b, 0) / fatigueScores.length).toFixed(2);
    const maxFatigue = Math.max(...fatigueScores).toFixed(2);
    const minFatigue = Math.min(...fatigueScores).toFixed(2);
    
    const alertCount = fatigueScores.filter(f => f < 3).length;
    const drowsyCount = fatigueScores.filter(f => f >= 3 && f < 6).length;
    const fatiguedCount = fatigueScores.filter(f => f >= 6).length;

    const avgAlpha = (sessionData.eegData.reduce((a, d) => a + d.alphaPower, 0) / sessionData.eegData.length).toFixed(2);
    const avgTheta = (sessionData.eegData.reduce((a, d) => a + d.thetaPower, 0) / sessionData.eegData.length).toFixed(2);
    const avgBeta = (sessionData.eegData.reduce((a, d) => a + d.betaPower, 0) / sessionData.eegData.length).toFixed(2);

    const durationMinutes = sessionData.duration ? ((sessionData.duration / 60).toFixed(2)) : 0;

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

  const handleSaveToHistory = () => {
    // Save session to local storage or backend
    const existingSessions = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
    const newSession = {
      ...sessionData,
      savedAt: new Date().toISOString(),
      stats: stats
    };
    existingSessions.push(newSession);
    localStorage.setItem('sessionHistory', JSON.stringify(existingSessions));
    setSavedToHistory(true);
    
    setTimeout(() => {
      navigate('/dashboard', { state: { tab: 'history' } });
    }, 1500);
  };

  return (
    <div style={{ 
      background: '#f3f4f6',
      minHeight: '100vh',
      padding: '2rem 1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                color: '#374151',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                fontSize: '0.9rem'
              }}
            >
              <ArrowLeft size={18} />
              Kembali
            </button>
            <h1 style={{ margin: 0, color: '#1f2937', fontSize: '1.75rem', fontWeight: 'bold' }}>
              Hasil Analisis Sesi
            </h1>
          </div>
          <button
            onClick={() => window.print()}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              color: '#374151',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              fontSize: '0.9rem'
            }}
          >
            <Download size={18} />
            Export
          </button>
        </div>

        {/* Key Metrics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Clock size={18} color="#3b82f6" />
              <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>Durasi Sesi</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
              {stats.durationMinutes}m
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <TrendingUp size={18} color="#f59e0b" />
              <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>Fatigue Rata-rata</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
              {stats.avgFatigue}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              Min: {stats.minFatigue} | Max: {stats.maxFatigue}
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={18} color="#ef4444" />
              <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>Status Pengamatan</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🟢</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>Alert</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{stats.alertCount} detik</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🟡</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>Drowsy</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{stats.drowsyCount} detik</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🔴</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>Fatigued</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{stats.fatiguedCount} detik</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#6b7280', background: '#f9fafb', padding: '0.75rem', borderRadius: '6px' }}>
              <strong>Penjelasan:</strong> Alert = Waspada | Drowsy = Mengantuk | Fatigued = Lelah
            </div>
          </div>
        </div>

        {/* Main Visualizations */}
        <div style={{ background: 'white', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <BarChart3 size={20} color="#3b82f6" />
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>Timeline Skor Fatigue</h2>
          </div>
          <div style={{ 
            position: 'relative', 
            height: '200px', 
            background: '#f9fafb', 
            padding: '1rem', 
            borderRadius: '8px', 
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '100%',
              gap: '2px'
            }}>
              {sessionData.eegData.map((item: any, idx: number) => {
                const score = item.eegFatigueScore || 0;
                const height = Math.max((score / 10) * 100, 5);
                const color = score < 3 ? '#10b981' : score < 6 ? '#f59e0b' : '#ef4444';
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: `${height}%`,
                      background: color,
                      borderRadius: '2px',
                      opacity: 0.8
                    }}
                    title={`Score: ${score.toFixed(2)}`}
                  />
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '2px' }}></span>
              <span style={{ color: '#6b7280' }}>Alert (0-3)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#f59e0b', borderRadius: '2px' }}></span>
              <span style={{ color: '#6b7280' }}>Drowsy (3-6)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '2px' }}></span>
              <span style={{ color: '#6b7280' }}>Fatigued (6-10)</span>
            </div>
          </div>
        </div>

        {/* Brain Wave Analysis */}
        <div style={{ background: 'white', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Brain size={20} color="#3b82f6" />
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>Analisis Brain Wave</h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem'
          }}>
            {[
              { name: 'Delta', freq: '0-4 Hz', avg: sessionData.eegData.reduce((a: any, d: any) => a + d.deltaPower, 0) / sessionData.eegData.length, color: '#8b5cf6' },
              { name: 'Theta', freq: '4-8 Hz', avg: sessionData.eegData.reduce((a: any, d: any) => a + d.thetaPower, 0) / sessionData.eegData.length, color: '#06b6d4' },
              { name: 'Alpha', freq: '8-12 Hz', avg: sessionData.eegData.reduce((a: any, d: any) => a + d.alphaPower, 0) / sessionData.eegData.length, color: '#10b981' },
              { name: 'Beta', freq: '12-30 Hz', avg: sessionData.eegData.reduce((a: any, d: any) => a + d.betaPower, 0) / sessionData.eegData.length, color: '#f59e0b' },
              { name: 'Gamma', freq: '30-100 Hz', avg: sessionData.eegData.reduce((a: any, d: any) => a + d.gammaPower, 0) / sessionData.eegData.length, color: '#ef4444' }
            ].map((wave) => (
              <div key={wave.name} style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', borderLeft: `3px solid ${wave.color}` }}>
                <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                  {wave.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                  {wave.freq}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: wave.color }}>
                  {wave.avg.toFixed(2)}
                </div>
                <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((wave.avg / 3) * 100, 100)}%`, background: wave.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Section */}
        <div style={{ background: 'white', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle size={20} color="#3b82f6" />
            Ringkasan Analisis
          </h2>
          <div style={{ color: '#4b5563', lineHeight: '1.8', fontSize: '0.95rem' }}>
            {(() => {
              const avgFatigue = parseFloat(String(stats.avgFatigue));
              let summary = '';

              if (avgFatigue < 3) {
                summary = `Sesi Anda menunjukkan tingkat kewaspadaan yang sangat baik dengan rata-rata fatigue score ${stats.avgFatigue}. Anda mampu mempertahankan fokus sepanjang ${stats.durationMinutes} menit bermain. Status Brain Wave menunjukkan aktivitas Beta yang dominan, mengindikasikan konsentrasi tinggi.`;
              } else if (avgFatigue < 6) {
                summary = `Sesi Anda menunjukkan tingkat kewaspadaan yang moderat dengan rata-rata fatigue score ${stats.avgFatigue}. Meskipun Anda sempat mengalami beberapa periode mengantuk (drowsy), namun tetap mampu mengendalikan kendaraan selama ${stats.durationMinutes} menit. Aktivitas Theta yang meningkat menunjukkan penurunan konsentrasi di beberapa momen.`;
              } else {
                summary = `Sesi Anda menunjukkan tingkat kelelahan yang signifikan dengan rata-rata fatigue score ${stats.avgFatigue}. Anda mengalami ${stats.fatiguedCount} periode kelelahan (fatigued) dan ${stats.drowsyCount} periode mengantuk selama sesi. Ini mengindikasikan Anda perlu istirahat sebelum melakukan aktivitas berkendara yang sesungguhnya.`;
              }

              return <p style={{ margin: 0 }}>{summary}</p>;
            })()}
          </div>
        </div>

        {/* Recommendations/Tips Section */}
        <div style={{ background: 'white', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Lightbulb size={20} color="#f59e0b" />
            Rekomendasi & Tips
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(() => {
              const recommendations = [];

              if (stats.fatiguedCount > stats.drowsyCount * 0.5) {
                recommendations.push({
                  title: '😴 Tingkat Kelelahan Tinggi',
                  tips: [
                    'Ambil istirahat minimal 15-20 menit sebelum berkendara kembali',
                    'Hindari berkendara di malam hari ketika tingkat kelelahan biasanya meningkat',
                    'Pertahankan jadwal tidur yang teratur (7-9 jam per malam)'
                  ]
                });
              }

              if (stats.drowsyCount > stats.alertCount * 0.7) {
                recommendations.push({
                  title: '😑 Status Mengantuk Terdeteksi',
                  tips: [
                    'Lakukan aktivitas ringan seperti berjalan atau minum air dingin saat merasa mengantuk',
                    'Kurangi durasi perjalanan dan ambil istirahat setiap 2 jam berkendara',
                    'Pastikan posisi berkendara ergonomis untuk menghindari ketegangan otot yang menyebabkan kantuk'
                  ]
                });
              }

              if (stats.alertCount > stats.fatiguedCount + stats.drowsyCount) {
                recommendations.push({
                  title: '✨ Performa Sangat Baik',
                  tips: [
                    'Pertahankan rutinitas ini di masa depan untuk hasil optimal',
                    'Tingkatkan durasi sesi secara bertahap untuk build stamina',
                    'Perhatikan faktor eksternal yang membantu performa (waktu, lingkungan, dll)'
                  ]
                });
              }

              if (sessionData.gameMetrics && sessionData.gameMetrics.collisions > 2) {
                recommendations.push({
                  title: '⚠️ Keselamatan Berkendara',
                  tips: [
                    `Tabrakan terdeteksi ${sessionData.gameMetrics.collisions}x - tingkatkan awareness terhadap lingkungan sekitar`,
                    'Fokus pada prediksi dan antisipasi pergerakan kendaraan lain',
                    'Kurangi kecepatan saat kondisi fatigue meningkat untuk menjaga keselamatan'
                  ]
                });
              }

              const avgTheta = parseFloat(String(stats.avgTheta));
              const avgAlpha = parseFloat(String(stats.avgAlpha));
              const thetaAlphaRatio = avgAlpha > 0 ? avgTheta / avgAlpha : 0;
              if (thetaAlphaRatio > 1.5) {
                recommendations.push({
                  title: '🧠 Pola Brain Wave',
                  tips: [
                    'Rasio Theta/Alpha tinggi mengindikasikan penurunan konsentrasi',
                    'Coba teknik mindfulness atau breathing exercise untuk meningkatkan fokus',
                    'Pastikan lingkungan berkendara nyaman dan bebas dari distraksi'
                  ]
                });
              }

              if (recommendations.length === 0) {
                recommendations.push({
                  title: '✓ Performa Normal',
                  tips: [
                    'Terus pantau kondisi Anda secara berkala',
                    'Lakukan sesi latihan secara rutin untuk maintain skill berkendara',
                    'Perhatikan pola fatigue Anda dari waktu ke waktu'
                  ]
                });
              }

              return recommendations.map((rec, idx) => (
                <div key={idx} style={{ borderLeft: '4px solid #f59e0b', paddingLeft: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#1f2937' }}>
                    {rec.title}
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {rec.tips.map((tip, tidx) => (
                      <li key={tidx} style={{ color: '#4b5563', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Game Metrics */}
        {sessionData.gameMetrics && (
          <div style={{ background: 'white', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>Metrik Kendaraan</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>Kecepatan Rata-rata</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                  {sessionData.gameMetrics.averageSpeed.toFixed(1)} km/h
                </div>
              </div>
              <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>Tabrakan</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                  {sessionData.gameMetrics.collisions}x
                </div>
              </div>
              <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>Penyimpangan Jalur</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                  {sessionData.gameMetrics.laneDeviations}x
                </div>
              </div>
              <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Jarak</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {sessionData.gameMetrics.totalDistance.toFixed(1)} km
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
          <button
            onClick={handleSaveToHistory}
            disabled={savedToHistory}
            style={{
              padding: '0.75rem 2rem',
              background: savedToHistory ? '#10b981' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: savedToHistory ? 'default' : 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease'
            }}
          >
            {savedToHistory ? '✓ Tersimpan di History' : 'Simpan ke History'}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '0.75rem 2rem',
              background: 'white',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem'
            }}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
