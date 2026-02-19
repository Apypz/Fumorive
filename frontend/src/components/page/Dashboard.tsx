import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Gamepad2,
    History,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    User,
    Activity,
    Brain,
    Eye,
    Timer,
    TrendingUp,
    AlertTriangle,
    Target,
    Gauge,
    Calendar,
    Clock,
    Search,
    BarChart3,
    Sliders,
    Bell,
    Shield,
    Database,
    Info,
    Camera,
    Trash2,
    Flag
} from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useEEGStore } from '../../stores/eegStore';
import { useSessionStore } from '../../stores/sessionStore';
import './Dashboard.css';

type TabView = 'overview' | 'history' | 'profile' | 'settings';

interface SavedSession {
    sessionId: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    routeName?: string;
    totalWaypoints?: number;
    reachedCount?: number;
    missedCount?: number;
    completionTime?: number;
    violations?: any[];
    totalViolationPoints?: number;
    eegData?: any[];
    gameMetrics?: any;
    savedAt: string;
    stats?: any;
    violationStats?: any;
}

const Dashboard = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<TabView>('overview');
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useUserStore();
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [isSaving, setIsSaving] = useState(false);
    
    // History state
    const [sessionHistory, setSessionHistory] = useState<SavedSession[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // EEG Store
    const isConnected = useEEGStore((state) => state.isConnected);
    const currentMetrics = useEEGStore((state) => state.currentMetrics);
    const dataHistory = useEEGStore((state) => state.dataHistory);
    const getAverageMetrics = useEEGStore((state) => state.getAverageMetrics);

    // Session Store
    const sessionId = useSessionStore((state) => state.sessionId);
    const [sessionIdCopied, setSessionIdCopied] = useState(false);
    
    // Average metrics state
    const [avgMetrics, setAvgMetrics] = useState<any>(null);
    const [graphData, setGraphData] = useState<any[]>([]);

    // Generate sample data for demo
    const generateSampleData = () => {
        const samples = [];
        for (let i = 0; i < 100; i++) {
            samples.push({
                timestamp: new Date(Date.now() - (100 - i) * 1000).toISOString(),
                eegFatigueScore: 2 + Math.sin(i / 10) * 3 + (Math.random() - 0.5) * 1,
                deltaPower: 1 + Math.sin(i / 15) * 0.5 + (Math.random() - 0.5) * 0.3,
                thetaPower: 1.5 + Math.sin(i / 12) * 0.7 + (Math.random() - 0.5) * 0.4,
                alphaPower: 2.5 + Math.sin(i / 8) * 1 + (Math.random() - 0.5) * 0.5,
                betaPower: 2 + Math.sin(i / 10) * 0.8 + (Math.random() - 0.5) * 0.4,
                gammaPower: 1.2 + Math.sin(i / 20) * 0.6 + (Math.random() - 0.5) * 0.3,
            });
        }
        return samples;
    };

    const generateSampleSessionData = () => {
        const startTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
        const eegData = [];
        
        // Generate 300 samples for 30-minute session
        for (let i = 0; i < 300; i++) {
            eegData.push({
                timestamp: new Date(startTime.getTime() + (i * 6000)).toISOString(), // Every 6 seconds
                eegFatigueScore: 2 + Math.sin(i / 30) * 4 + (Math.random() - 0.5) * 1.5,
                deltaPower: 0.8 + Math.sin(i / 50) * 0.6 + (Math.random() - 0.5) * 0.3,
                thetaPower: 1.2 + Math.sin(i / 40) * 0.8 + (Math.random() - 0.5) * 0.4,
                alphaPower: 2 + Math.sin(i / 35) * 1.2 + (Math.random() - 0.5) * 0.6,
                betaPower: 2.5 + Math.sin(i / 30) * 1 + (Math.random() - 0.5) * 0.5,
                gammaPower: 1 + Math.sin(i / 60) * 0.7 + (Math.random() - 0.5) * 0.3,
            });
        }

        return {
            sessionId: `session_${Date.now()}`,
            startTime: startTime.toISOString(),
            endTime: new Date().toISOString(),
            duration: 30 * 60, // 30 minutes in seconds
            eegData: eegData,
            gameMetrics: {
                averageSpeed: 65 + Math.random() * 20,
                maxSpeed: 120 + Math.random() * 20,
                collisions: Math.floor(Math.random() * 5),
                laneDeviations: Math.floor(Math.random() * 15),
                totalDistance: 32.5 + Math.random() * 5,
            }
        };
    };

    const handleViewSampleResults = () => {
        const sampleData = generateSampleSessionData();
        navigate('/session-results', { state: sampleData });
    };

    // Sync state with user data when it loads
    useEffect(() => {
        if (user?.full_name) {
            setFullName(user.full_name);
        }
    }, [user?.full_name]);

    // Load session history from localStorage
    useEffect(() => {
        const loadHistory = () => {
            try {
                const saved = localStorage.getItem('sessionHistory');
                if (saved) {
                    const sessions = JSON.parse(saved) as SavedSession[];
                    setSessionHistory(sessions);
                }
            } catch (error) {
                console.error('Failed to load session history:', error);
            }
        };
        loadHistory();
        
        // Listen for storage changes (in case another tab updates)
        window.addEventListener('storage', loadHistory);
        return () => window.removeEventListener('storage', loadHistory);
    }, []);

    // Check if navigated with tab state
    useEffect(() => {
        const state = location.state as { tab?: TabView } | null;
        if (state?.tab) {
            setActiveTab(state.tab);
            // Clear the state
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Calculate history statistics
    const historyStats = useMemo(() => {
        if (sessionHistory.length === 0) {
            return {
                totalSessions: 0,
                totalHours: '0',
                avgFatigue: '--',
                totalAlerts: 0
            };
        }

        const totalDuration = sessionHistory.reduce((sum, s) => sum + (s.duration || s.completionTime || 0), 0);
        const totalHours = (totalDuration / 3600).toFixed(1);
        
        const allFatigueScores = sessionHistory
            .filter(s => s.stats?.avgFatigue)
            .map(s => parseFloat(s.stats.avgFatigue));
        const avgFatigue = allFatigueScores.length > 0 
            ? (allFatigueScores.reduce((a, b) => a + b, 0) / allFatigueScores.length).toFixed(2)
            : '--';
        
        const totalAlerts = sessionHistory.reduce((sum, s) => sum + (s.violations?.length || 0), 0);

        return {
            totalSessions: sessionHistory.length,
            totalHours,
            avgFatigue,
            totalAlerts
        };
    }, [sessionHistory]);

    // Filter sessions by search
    const filteredSessions = useMemo(() => {
        if (!searchQuery.trim()) return sessionHistory;
        const query = searchQuery.toLowerCase();
        return sessionHistory.filter(s => 
            s.routeName?.toLowerCase().includes(query) ||
            s.sessionId.toLowerCase().includes(query) ||
            new Date(s.startTime).toLocaleDateString().includes(query)
        );
    }, [sessionHistory, searchQuery]);

    // Handle view session details
    const handleViewSession = (session: SavedSession) => {
        navigate('/session-results', { state: session });
    };

    // Handle delete session
    const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Apakah Anda yakin ingin menghapus sesi ini?')) {
            const updated = sessionHistory.filter(s => s.sessionId !== sessionId);
            setSessionHistory(updated);
            localStorage.setItem('sessionHistory', JSON.stringify(updated));
        }
    };

    // Update average metrics and graph data from EEG store
    useEffect(() => {
        const avg = getAverageMetrics(5000); // Average over last 5 seconds
        setAvgMetrics(avg);
        
        // Use real data if available, otherwise use sample data
        const historyToUse = dataHistory.length > 0 ? dataHistory : generateSampleData();
        
        // Prepare graph data from history (last 100 samples)
        const recentHistory = historyToUse.slice(-100);
        const graphPoints = recentHistory.map((item: any) => ({
            timestamp: new Date(item.timestamp).getTime(),
            delta: item.deltaPower || 0,
            theta: item.thetaPower || 0,
            alpha: item.alphaPower || 0,
            beta: item.betaPower || 0,
            gamma: item.gammaPower || 0,
        }));
        setGraphData(graphPoints);
    }, [currentMetrics, dataHistory, getAverageMetrics]);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await useUserStore.getState().updateProfile({ full_name: fullName });
            alert('Profile updated successfully!');
        } catch (error: any) {
            console.error('Update profile error:', error);
            alert(`Failed to update profile: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Overview', tab: 'overview' as TabView },
        { icon: <History size={20} />, label: 'History', tab: 'history' as TabView },
        { icon: <User size={20} />, label: 'Profile', tab: 'profile' as TabView },
        { icon: <Settings size={20} />, label: 'Settings', tab: 'settings' as TabView },
        // { icon: <Camera size={20} />, label: 'Face Recognition', action: () => navigate('/face-recognition') },
        { icon: <Gamepad2 size={20} />, label: 'Live Session', action: () => navigate('/session') },
    ];

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'expanded' : 'collapsed'}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">Fumorive</div>
                    <button className="sidebar-toggle" onClick={toggleSidebar}>
                        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item, index) => (
                        <div
                            key={index}
                            className={`nav-item ${item.tab && activeTab === item.tab ? 'active' : ''}`}
                            onClick={() => {
                                if (item.tab) {
                                    setActiveTab(item.tab);
                                } else if (item.action) {
                                    item.action();
                                }
                            }}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </div>
                    ))}

                    <div style={{ flex: 1 }}></div>

                    <div className="nav-item" onClick={async () => {
                        await logout();
                        navigate('/login');
                    }} style={{ color: '#ef4444' }}>
                        <span className="nav-icon"><LogOut size={20} /></span>
                        <span className="nav-label">Logout</span>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="header-title">
                        <h1>
                            {activeTab === 'overview' && `Halo, ${user?.full_name || 'Driver'}`}
                            {activeTab === 'history' && 'Session History'}
                            {activeTab === 'profile' && 'User Profile'}
                            {activeTab === 'settings' && 'Settings'}
                        </h1>
                        <p>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <div className="header-actions">
                        <div
                            className="user-profile"
                            onClick={() => setActiveTab('profile')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="user-avatar" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: user?.profile_picture ? '#e0e7ff' : '#f1f5f9',
                                fontSize: user?.profile_picture ? '1.2rem' : '1rem'
                            }}>
                                {user?.profile_picture || <User size={18} />}
                            </div>
                            <span className="user-name">{user?.full_name || 'Guest User'}</span>
                        </div>
                    </div>
                </header>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* ── WELCOME BANNER ────────────────────────────────────── */}
                        

                        {/* ── STAT SUMMARY CARDS ────────────────────────────────── */}
                        

                        {/* ── ACTIVE SESSION ID (contextual) ────────────────────── */}
                        {sessionId && (
                            <div className="widget-card" style={{ background: '#0f172a', border: '1.5px solid #3b82f6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '10px',
                                        background: '#1e3a5f', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                                    }}>🧠</div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Session ID</div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Paste ID ini ke terminal EEG untuk menghubungkan Muse 2</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                                    <code style={{ flex: 1, fontSize: '0.95rem', color: '#38bdf8', fontFamily: '"Cascadia Code", "Fira Code", monospace', wordBreak: 'break-all', userSelect: 'all' }}>
                                        {sessionId}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(sessionId);
                                            setSessionIdCopied(true);
                                            setTimeout(() => setSessionIdCopied(false), 2000);
                                        }}
                                        style={{
                                            background: sessionIdCopied ? '#059669' : '#3b82f6',
                                            color: 'white', border: 'none', borderRadius: '8px',
                                            padding: '8px 16px', cursor: 'pointer', fontWeight: 600,
                                            fontSize: '0.85rem', display: 'flex', alignItems: 'center',
                                            gap: '6px', transition: 'all 0.2s', flexShrink: 0
                                        }}
                                    >
                                        {sessionIdCopied ? '✓ Copied!' : '📋 Copy ID'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── SECTION: CARA MENJALANKAN SISTEM ─────────────────── */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Cara Menjalankan Sistem</span>
                                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                            </div>
                            <div className="widget-card" style={{ padding: '1.5rem 2rem', border: '2px dashed #cbd5e1', background: '#f8fafc', boxShadow: 'none' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {[
                                        {
                                            step: '01',
                                            icon: '🧠',
                                            title: 'Pasang EEG Headset',
                                            desc: 'Kenakan Muse 2 headset, pastikan sensor menempel di dahi dan belakang telinga. Nyalakan dan buka aplikasi Lab Streaming Layer (LSL).',
                                            color: '#4f46e5',
                                            bg: '#eef2ff',
                                            border: '#c7d2fe'
                                        },
                                        {
                                            step: '02',
                                            icon: '📷',
                                            title: 'Aktifkan Kamera',
                                            desc: 'Pastikan webcam terhubung dan izin kamera sudah diberikan. Posisikan wajah agar terlihat jelas untuk face & eye detection.',
                                            color: '#0891b2',
                                            bg: '#ecfeff',
                                            border: '#a5f3fc'
                                        },
                                        {
                                            step: '03',
                                            icon: '🎮',
                                            title: 'Mulai Sesi Game',
                                            desc: 'Klik tombol "Mulai Sesi" untuk membuka simulasi mengemudi. Sistem akan otomatis menghubungkan EEG dan memulai monitoring.',
                                            color: '#7c3aed',
                                            bg: '#f5f3ff',
                                            border: '#ddd6fe'
                                        },
                                        {
                                            step: '04',
                                            icon: '🚨',
                                            title: 'Pantau & Respons Alert',
                                            desc: 'Sistem akan menganalisis brain waves + visual cues secara real-time. Segera berhenti & istirahat jika alert kelelahan muncul.',
                                            color: '#dc2626',
                                            bg: '#fff1f2',
                                            border: '#fecdd3'
                                        }
                                    ].map((s, i, arr) => (
                                        <div key={s.step} style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
                                            {/* Left: number + vertical line */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                    background: s.bg, border: `1.5px solid ${s.border}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.8rem', fontWeight: 800, color: s.color, flexShrink: 0
                                                }}>
                                                    {s.step}
                                                </div>
                                                {i < arr.length - 1 && (
                                                    <div style={{ width: '1.5px', flex: 1, background: '#e2e8f0', margin: '4px 0' }} />
                                                )}
                                            </div>
                                            {/* Right: content */}
                                            <div style={{ paddingBottom: i < arr.length - 1 ? '1.25rem' : 0, paddingTop: '0.3rem' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.2rem' }}>{s.title}</div>
                                                <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── SECTION: STATUS SISTEM ────────────────────────────── */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Status Sistem</span>
                                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                            </div>
                            <div className="stats-row">
                            {[
                                {
                                    label: 'Total Sesi',
                                    value: String(historyStats.totalSessions),
                                    sub: 'sesi tercatat',
                                    icon: <History size={20} />,
                                    bg: '#ede9fe', iconColor: '#7c3aed', valColor: '#4c1d95'
                                },
                                {
                                    label: 'Total Waktu',
                                    value: historyStats.totalHours + 'j',
                                    sub: 'jam berkendara',
                                    icon: <Clock size={20} />,
                                    bg: '#dbeafe', iconColor: '#2563eb', valColor: '#1e3a8a'
                                },
                                {
                                    label: 'Avg. Fatigue',
                                    value: historyStats.avgFatigue === '--' ? '--' : historyStats.avgFatigue,
                                    sub: 'rata-rata skor',
                                    icon: <Brain size={20} />,
                                    bg: '#fef3c7', iconColor: '#d97706', valColor: '#78350f'
                                },
                                {
                                    label: 'EEG Status',
                                    value: isConnected ? 'Online' : 'Offline',
                                    sub: isConnected ? 'sedang terhubung' : 'belum terhubung',
                                    icon: <Activity size={20} />,
                                    bg: isConnected ? '#dcfce7' : '#fee2e2',
                                    iconColor: isConnected ? '#16a34a' : '#dc2626',
                                    valColor: isConnected ? '#14532d' : '#7f1d1d'
                                }
                            ].map((s) => (
                                <div key={s.label} className="widget-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '14px',
                                        background: s.bg, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, color: s.iconColor
                                    }}>
                                        {s.icon}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.valColor, lineHeight: 1.2 }}>{s.value}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                            
                        </div>

                        {/* ── SECTION: MONITORING REAL-TIME ─────────────────────── */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Monitoring Real-time</span>
                                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                            </div>
                            <div className="dashboard-grid">
                                {/* Brain Waves */}
                                <div className="widget-card span-2">
                                    <div className="widget-title">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Brain size={18} color="#2563eb" />
                                            <span>Brain Wave Activity (Muse 2 EEG)</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: currentMetrics ? '#dcfce7' : '#f1f5f9', color: currentMetrics ? '#15803d' : '#64748b', borderRadius: '999px', fontWeight: 600 }}>
                                            {currentMetrics ? '● Live' : '○ No Data'}
                                        </span>
                                    </div>

                                    {/* Mini bar chart */}
                                    {graphData.length > 0 && (
                                        <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                                            <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                                                {graphData.slice(-80).map((point: any, idx: number) => {
                                                    const maxVal = Math.max(...graphData.map((p: any) => Math.max(p.alpha, p.beta, p.theta)));
                                                    const h = Math.max((point.alpha / (maxVal || 1)) * 100, 5);
                                                    return (
                                                        <div key={idx} style={{ flex: 1, height: `${h}%`, background: `hsl(${140 + (point.alpha / (maxVal || 1)) * 60}, 60%, 50%)`, borderRadius: '1px', opacity: 0.85 }} />
                                                    );
                                                })}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.4rem', textAlign: 'center' }}>Alpha Power — últimas 80 amostras</div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                                        {[
                                            { name: 'Delta', range: '1-4Hz', key: 'deltaPower', color: '#8b5cf6', desc: 'Deep Sleep', bg: '#f5f3ff' },
                                            { name: 'Theta', range: '4-8Hz', key: 'thetaPower', color: '#06b6d4', desc: 'Drowsy', bg: '#ecfeff' },
                                            { name: 'Alpha', range: '8-13Hz', key: 'alphaPower', color: '#10b981', desc: 'Relaxed', bg: '#f0fdf4' },
                                            { name: 'Beta',  range: '13-30Hz', key: 'betaPower',  color: '#f59e0b', desc: 'Focused', bg: '#fffbeb' },
                                            { name: 'Gamma', range: '30-50Hz', key: 'gammaPower', color: '#ef4444', desc: 'Alert',   bg: '#fff1f2' }
                                        ].map((wave) => {
                                            const val = currentMetrics && currentMetrics[wave.key as keyof typeof currentMetrics]
                                                ? (currentMetrics[wave.key as keyof typeof currentMetrics] as number).toFixed(2)
                                                : '--';
                                            return (
                                                <div key={wave.name} style={{ padding: '0.75rem', background: wave.bg, borderRadius: '10px', textAlign: 'center', border: `1.5px solid ${wave.color}22` }}>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: wave.color, marginBottom: '0.2rem' }}>{val}</div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{wave.name}</div>
                                                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{wave.range}</div>
                                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>{wave.desc}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Fatigue Analysis */}
                                <div className="widget-card span-1">
                                    <div className="widget-title">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Eye size={18} color="#d97706" />
                                            <span>Analisis Kelelahan</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: currentMetrics ? '#dcfce7' : '#f1f5f9', color: currentMetrics ? '#15803d' : '#64748b', borderRadius: '999px', fontWeight: 600 }}>
                                            {currentMetrics ? '● Live' : '○ Standby'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ padding: '1rem', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.25rem', fontWeight: 600 }}>EEG Fatigue Score</div>
                                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b45309' }}>{currentMetrics?.eegFatigueScore ? (currentMetrics.eegFatigueScore as number).toFixed(2) : '--'}</div>
                                            <div style={{ height: '6px', background: '#fef9c3', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
                                                <div style={{ width: `${currentMetrics?.eegFatigueScore ? Math.min((currentMetrics.eegFatigueScore as number) * 10, 100) : 0}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)', transition: 'width 0.5s' }} />
                                            </div>
                                        </div>
                                        <div style={{ padding: '1rem', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.25rem', fontWeight: 600 }}>Attention (Beta Power)</div>
                                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d' }}>{currentMetrics?.betaPower ? (currentMetrics.betaPower as number).toFixed(2) : '--'}</div>
                                        </div>
                                        <div style={{ padding: '1rem', borderRadius: '12px', background: '#dbeafe', border: '1px solid #bfdbfe' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.25rem', fontWeight: 600 }}>Theta / Alpha Ratio</div>
                                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1d4ed8' }}>{currentMetrics?.thetaAlphaRatio ? (currentMetrics.thetaAlphaRatio as number).toFixed(2) : '--'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── FATIGUE TIMELINE ──────────────────────────────────── */}
                        {(isConnected || dataHistory.length > 0) && (
                            <div className="widget-card">
                                <div className="widget-title">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendingUp size={18} color="#dc2626" />
                                        <span>Fatigue Score Timeline {!isConnected && '(Data Sesi)'}</span>
                                    </div>
                                </div>
                                <div style={{ height: '160px', display: 'flex', alignItems: 'flex-end', gap: '1px', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                                    {dataHistory.slice(-100).map((item: any, idx: number) => {
                                        const score = item.eegFatigueScore || 0;
                                        const height = Math.max((score / 10) * 100, 5);
                                        const color = score < 3 ? '#10b981' : score < 6 ? '#f59e0b' : '#ef4444';
                                        return (
                                            <div key={idx} title={`Score: ${score.toFixed(2)} — ${new Date(item.timestamp).toLocaleTimeString('id-ID')}`}
                                                style={{ flex: 1, height: `${height}%`, background: color, borderRadius: '2px', opacity: 0.75, cursor: 'pointer' }} />
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
                                    <span>5 menit lalu</span>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {[['#10b981','Alert'],['#f59e0b','Drowsy'],['#ef4444','Fatigued']].map(([c,l]) => (
                                            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span style={{ width: '10px', height: '10px', background: c, borderRadius: '2px', display: 'inline-block' }} />{l}
                                            </span>
                                        ))}
                                    </div>
                                    <span>Sekarang</span>
                                </div>
                            </div>
                        )}

                        {(!isConnected && dataHistory.length === 0) && (
                            <div className="widget-card" style={{ background: '#f9fafb', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <TrendingUp size={36} color="#cbd5e1" style={{ marginBottom: '0.75rem' }} />
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Fatigue Score Timeline</p>
                                    <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>Hubungkan EEG atau mulai sesi game untuk melihat grafik</p>
                                </div>
                            </div>
                        )}

                        {/* ── SECTION: AKSI & SESI TERAKHIR ────────────────────── */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Aksi & Sesi Terakhir</span>
                                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                            </div>
                            <div className="dashboard-grid">

                                {/* Driving Performance */}
                                <div className="widget-card span-2">
                                    <div className="widget-title">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Gauge size={18} color="#7c3aed" />
                                            <span>Performa Mengemudi</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: '#fef2f2', color: '#991b1b', borderRadius: '999px', fontWeight: 600 }}>Awaiting Session</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                                        {[
                                            { label: 'Lane Deviation', value: '-- cm',  icon: <Target size={16} />,        color: '#3b82f6', bg: '#eff6ff' },
                                            { label: 'Speed Consist.', value: '-- %',   icon: <Gauge size={16} />,          color: '#10b981', bg: '#f0fdf4' },
                                            { label: 'Reaction Time',  value: '-- ms',  icon: <Timer size={16} />,          color: '#f59e0b', bg: '#fffbeb' },
                                            { label: 'Alert Count',    value: '--',      icon: <AlertTriangle size={16} />,  color: '#ef4444', bg: '#fff1f2' }
                                        ].map((m) => (
                                            <div key={m.label} style={{ padding: '1rem', background: m.bg, borderRadius: '12px' }}>
                                                <div style={{ color: m.color, marginBottom: '0.5rem' }}>{m.icon}</div>
                                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>{m.value}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>{m.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                        <button onClick={() => navigate('/session')} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <Gamepad2 size={16} /> Mulai Sesi Baru
                                        </button>
                                        <button onClick={handleViewSampleResults} style={{ flex: 1, padding: '10px', background: 'white', color: '#6366f1', border: '1.5px solid #6366f1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <BarChart3 size={16} /> Lihat Contoh Hasil
                                        </button>
                                    </div>
                                </div>

                                {/* Last Session */}
                                <div className="widget-card span-1">

                        {/* Fatigue Score Timeline Graph */}
                        {(isConnected || dataHistory.length > 0) && (
                            <div className="widget-card" style={{ gridColumn: 'span 3' }}>
                                <div className="widget-title">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <TrendingUp size={20} color="#ef4444" />
                                        <span>Fatigue Score Timeline {!isConnected && '(Session Data)'}</span>
                                    </div>
                                </div>
                                <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '1px', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    {(() => {
                                        const historyToUse = dataHistory.length > 0 ? dataHistory : [];
                                        return historyToUse.slice(-100).map((item: any, idx: number) => {
                                            const score = item.eegFatigueScore || 0;
                                            const height = Math.max((score / 10) * 100, 5);
                                            const color = score < 3 ? '#10b981' : score < 6 ? '#f59e0b' : '#ef4444';
                                            return (
                                                <div
                                                    key={idx}
                                                    title={`Score: ${score.toFixed(2)} at ${new Date(item.timestamp).toLocaleTimeString('id-ID')}`}
                                                    style={{
                                                        flex: 1,
                                                        height: `${height}%`,
                                                        background: color,
                                                        borderRadius: '2px',
                                                        opacity: 0.7,
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            );
                                        });
                                    })()}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                                    <span>5 min ago</span>
                                    <span style={{ display: 'flex', gap: '1rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}></span>
                                            Alert
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }}></span>
                                            Drowsy
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }}></span>
                                            Fatigued
                                        </span>
                                    </span>
                                </div>
                            </div>
                        )}




                                {/* Last Session */}
                                    <div className="widget-title">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <History size={18} color="#64748b" />
                                            <span>Sesi Terakhir</span>
                                        </div>
                                    </div>
                                    {sessionHistory.length > 0 ? (() => {
                                        const last = sessionHistory[0];
                                        const durationMin = Math.floor((last.duration || last.completionTime || 0) / 60);
                                        return (
                                            <div style={{ cursor: 'pointer' }} onClick={() => handleViewSession(last)}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Flag size={20} color="white" />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last.routeName || 'Sesi Mengemudi'}</div>
                                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                            {new Date(last.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} · {durationMin} menit
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                                    {last.reachedCount !== undefined && (
                                                        <span style={{ padding: '3px 8px', background: '#f0fdf4', color: '#10b981', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                                            ✓ {last.reachedCount}/{last.totalWaypoints} checkpoint
                                                        </span>
                                                    )}
                                                    <span style={{ padding: '3px 8px', background: (last.totalViolationPoints || 0) === 0 ? '#f0fdf4' : '#fef2f2', color: (last.totalViolationPoints || 0) === 0 ? '#10b981' : '#ef4444', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                                        ⚠️ {last.totalViolationPoints || 0} pelanggaran
                                                    </span>
                                                </div>
                                                <button className="btn-primary" style={{ width: '100%', padding: '9px', fontSize: '0.85rem' }}
                                                    onClick={(e) => { e.stopPropagation(); setActiveTab('history'); }}>
                                                    Lihat Semua ({sessionHistory.length})
                                                </button>
                                            </div>
                                        );
                                    })() : (
                                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#64748b' }}>
                                            <Calendar size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
                                            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem' }}>Belum ada sesi tercatat</p>
                                            <button className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.85rem' }} onClick={() => navigate('/session')}>
                                                Mulai Sesi
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Safety Tips */}
                                <div className="widget-card span-3" style={{ background: 'linear-gradient(135deg, #fff7ed, #fef2f2)', border: '1.5px solid #fed7aa' }}>
                                    <div className="widget-title" style={{ marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <AlertTriangle size={18} color="#ea580c" />
                                            <span style={{ color: '#9a3412' }}>Tips Keselamatan Berkendara</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                                        {[
                                            { n: 1, title: 'Istirahat Teratur', desc: 'Berhenti setiap 2 jam atau 200 km' },
                                            { n: 2, title: 'Cek Signal Quality', desc: 'Pastikan headset EEG terpasang benar' },
                                            { n: 3, title: 'Respons Alert', desc: 'Segera berhenti saat peringatan muncul' },
                                            { n: 4, title: 'Fokus Berkendara', desc: 'Hindari multitasking saat monitoring' }
                                        ].map((t) => (
                                            <div key={t.n} style={{ display: 'flex', gap: '0.75rem', alignItems: 'start', padding: '0.75rem', background: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: '0.8rem', color: '#9a3412' }}>{t.n}</div>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7c2d12', marginBottom: '2px' }}>{t.title}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#9a3412', lineHeight: 1.4 }}>{t.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="dashboard-content">
                        {/* Filter & Search */}
                        <div className="widget-card" style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                    <input
                                        type="text"
                                        placeholder="Cari sesi..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 40px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                                <button 
                                    onClick={() => navigate('/session')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    <Gamepad2 size={18} />
                                    <span>Sesi Baru</span>
                                </button>
                            </div>
                        </div>

                        {/* Session Statistics Overview */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', color: '#64748b' }}>
                            {[
                                { label: 'Total Sesi', value: historyStats.totalSessions.toString(), icon: <BarChart3 size={20} />, color: '#3b82f6' },
                                { label: 'Total Jam', value: `${historyStats.totalHours}h`, icon: <Clock size={20} />, color: '#10b981' },
                                { label: 'Rata-rata Fatigue', value: historyStats.avgFatigue, icon: <TrendingUp size={20} />, color: '#f59e0b' },
                                { label: 'Total Pelanggaran', value: historyStats.totalAlerts.toString(), icon: <AlertTriangle size={20} />, color: '#ef4444' }
                            ].map((stat) => (
                                <div key={stat.label} className="widget-card" style={{ textAlign: 'center' }}>
                                    <div style={{ color: stat.color, marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: '#1e293b' }}>{stat.value}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Session List */}
                        <div className="widget-card">
                            <div className="widget-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Riwayat Sesi ({filteredSessions.length})</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {filteredSessions.length === 0 ? (
                                    /* Empty State */
                                    <div style={{
                                        padding: '3rem 2rem',
                                        textAlign: 'center',
                                        color: '#64748b'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.75rem',
                                            marginBottom: '1.5rem'
                                        }}>
                                            <div style={{
                                                width: '50px',
                                                height: '50px',
                                                borderRadius: '12px',
                                                background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '1.25rem'
                                            }}>
                                                F
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>Fumorive</h2>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Session History</p>
                                            </div>
                                        </div>
                                        <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>
                                            {searchQuery ? 'Tidak ada sesi yang cocok' : 'Belum Ada Sesi'}
                                        </h3>
                                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                                            {searchQuery ? 'Coba kata kunci lain' : 'Mulai sesi baru untuk melihat data mengemudi dan fatigue Anda di sini'}
                                        </p>
                                        {!searchQuery && (
                                            <button
                                                className="btn-primary"
                                                style={{ marginTop: '1.5rem', padding: '10px 24px' }}
                                                onClick={() => navigate('/session')}
                                            >
                                                Mulai Sesi Pertama
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    /* Session Cards */
                                    filteredSessions.map((session) => {
                                        const startDate = new Date(session.startTime);
                                        const duration = session.duration || session.completionTime || 0;
                                        const durationMin = Math.floor(duration / 60);
                                        const durationSec = Math.floor(duration % 60);
                                        const violationCount = session.violations?.length || 0;
                                        const violationPoints = session.totalViolationPoints || 0;
                                        
                                        return (
                                            <div 
                                                key={session.sessionId}
                                                onClick={() => handleViewSession(session)}
                                                style={{
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '10px',
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    background: 'white'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                                            >
                                                {/* Main Row */}
                                                <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    {/* Icon */}
                                                    <div style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '10px',
                                                        background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <Flag size={24} color="white" />
                                                    </div>
                                                    
                                                    {/* Info */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem', marginBottom: '0.25rem' }}>
                                                            {session.routeName || 'Sesi Mengemudi'}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Calendar size={14} />
                                                                {startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Clock size={14} />
                                                                {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Timer size={14} />
                                                                {durationMin}:{durationSec.toString().padStart(2, '0')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Stats Badges */}
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        {session.reachedCount !== undefined && (
                                                            <div style={{ 
                                                                padding: '0.35rem 0.75rem', 
                                                                background: '#f0fdf4', 
                                                                borderRadius: '6px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600,
                                                                color: '#10b981'
                                                            }}>
                                                                <Target size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                                                {session.reachedCount}/{session.totalWaypoints}
                                                            </div>
                                                        )}
                                                        <div style={{ 
                                                            padding: '0.35rem 0.75rem', 
                                                            background: violationPoints === 0 ? '#f0fdf4' : violationPoints < 30 ? '#fef3c7' : '#fef2f2', 
                                                            borderRadius: '6px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 600,
                                                            color: violationPoints === 0 ? '#10b981' : violationPoints < 30 ? '#f59e0b' : '#ef4444'
                                                        }}>
                                                            <AlertTriangle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                                            {violationCount}x ({violationPoints} poin)
                                                        </div>
                                                        {session.stats?.avgFatigue && (
                                                            <div style={{ 
                                                                padding: '0.35rem 0.75rem', 
                                                                background: parseFloat(session.stats.avgFatigue) < 3 ? '#eff6ff' : parseFloat(session.stats.avgFatigue) < 6 ? '#fef3c7' : '#fef2f2', 
                                                                borderRadius: '6px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600,
                                                                color: parseFloat(session.stats.avgFatigue) < 3 ? '#3b82f6' : parseFloat(session.stats.avgFatigue) < 6 ? '#f59e0b' : '#ef4444'
                                                            }}>
                                                                <Brain size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                                                {session.stats.avgFatigue}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={(e) => handleDeleteSession(session.sessionId, e)}
                                                        style={{
                                                            padding: '0.5rem',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            color: '#9ca3af',
                                                            borderRadius: '6px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
                                                        title="Hapus sesi"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                    
                                                    {/* View indicator */}
                                                    <ChevronRight size={20} color="#9ca3af" />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="dashboard-content">
                        <div className="widget-card" style={{ marginBottom: '1.5rem' }}>
                            <div className="widget-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <User size={20} color="#667eea" />
                                    <span>Profile Information</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Personal Details */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                fontSize: '1rem',
                                                transition: 'border-color 0.2s',
                                                marginBottom: '1rem'
                                            }}
                                            placeholder="Enter your name"
                                        />
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isSaving}
                                            style={{
                                                padding: '10px 20px',
                                                background: '#4f46e5',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                                fontWeight: 600,
                                                opacity: isSaving ? 0.7 : 1
                                            }}
                                        >
                                            {isSaving ? 'Saving...' : 'Save Profile'}
                                        </button>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                fontSize: '1rem',
                                                background: '#f1f5f9',
                                                color: '#94a3b8',
                                                cursor: 'not-allowed'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div className="dashboard-content">

                        {/* Device Settings */}
                        {/* Device Settings */}
                        <div className="widget-card" style={{ marginBottom: '1.5rem' }}>
                            <div className="widget-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Activity size={20} color="#3b82f6" />
                                    <span>Device Configuration</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* EEG Headset */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                                        EEG Headset (Muse2)
                                    </label>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <select style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                                            <option>Not Connected</option>
                                            <option>Muse-12AB</option>
                                            <option>Muse-34CD</option>
                                        </select>
                                        <button style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                            Connect
                                        </button>
                                    </div>
                                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                        Device will connect via LSL (Lab Streaming Layer)
                                    </p>
                                </div>

                                {/* Camera */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                                        Camera Device
                                    </label>
                                    <select style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                                        <option>Built-in Camera</option>
                                        <option>External Webcam</option>
                                    </select>
                                </div>

                                {/* Sampling Rate */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                                        EEG Sampling Rate
                                    </label>
                                    <select style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                                        <option>256 Hz (Recommended)</option>
                                        <option>512 Hz (High Quality)</option>
                                        <option>128 Hz (Low Power)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Detection Thresholds */}
                        <div className="widget-card" style={{ marginBottom: '1.5rem' }}>
                            <div className="widget-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Sliders size={20} color="#f59e0b" />
                                    <span>Detection Thresholds</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Warning Threshold</label>
                                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>60%</span>
                                    </div>
                                    <input type="range" min="0" max="100" defaultValue="60" style={{ width: '100%' }} />
                                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                        Show warning when fatigue score reaches this level
                                    </p>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Critical Threshold</label>
                                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>80%</span>
                                    </div>
                                    <input type="range" min="0" max="100" defaultValue="80" style={{ width: '100%' }} />
                                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                        Show critical alert when fatigue score reaches this level
                                    </p>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>PERCLOS Threshold</label>
                                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>80%</span>
                                    </div>
                                    <input type="range" min="0" max="100" defaultValue="80" style={{ width: '100%' }} />
                                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                        Percentage of eye closure to trigger fatigue detection
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {/* Notifications */}
                            <div className="widget-card">
                                <div className="widget-title">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Bell size={20} color="#10b981" />
                                        <span>Notifications</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <input type="checkbox" defaultChecked />
                                        <span style={{ fontSize: '0.9rem' }}>Audio Alerts</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <input type="checkbox" defaultChecked />
                                        <span style={{ fontSize: '0.9rem' }}>Visual Effects</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <input type="checkbox" />
                                        <span style={{ fontSize: '0.9rem' }}>Haptic Feedback</span>
                                    </label>
                                </div>
                            </div>

                            {/* Data & Privacy */}
                            <div className="widget-card">
                                <div className="widget-title">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Shield size={20} color="#8b5cf6" />
                                        <span>Data & Privacy</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <input type="checkbox" defaultChecked />
                                        <span style={{ fontSize: '0.9rem' }}>Save Session Data</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <input type="checkbox" />
                                        <span style={{ fontSize: '0.9rem' }}>Share Anonymous Data</span>
                                    </label>
                                    <button style={{ marginTop: '0.5rem', padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        Export All Data
                                    </button>
                                </div>
                            </div>

                            {/* System Info */}
                            <div className="widget-card">
                                <div className="widget-title">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Info size={20} color="#64748b" />
                                        <span>System Info</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>Version</span>
                                        <span style={{ fontWeight: 500 }}>1.0.0</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>Backend</span>
                                        <span style={{ fontWeight: 500, color: '#ef4444' }}>Offline</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>LSL Status</span>
                                        <span style={{ fontWeight: 500, color: '#ef4444' }}>Not Connected</span>
                                    </div>
                                </div>
                            </div>

                            {/* Database */}
                            <div className="widget-card">
                                <div className="widget-title">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Database size={20} color="#06b6d4" />
                                        <span>Database</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>Storage Used</span>
                                        <span style={{ fontWeight: 500 }}>0 MB</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>Sessions Stored</span>
                                        <span style={{ fontWeight: 500 }}>0</span>
                                    </div>
                                    <button style={{ marginTop: '0.5rem', padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '0.9rem', color: '#ef4444' }}>
                                        Clear All Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
