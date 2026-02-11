import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Download,
    Filter,
    Search,
    BarChart3,
    Sliders,
    Bell,
    Shield,
    Database,
    Info,
    Camera
} from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useEEGStore } from '../../stores/eegStore';
import './Dashboard.css';

type TabView = 'overview' | 'history' | 'profile' | 'settings';

const Dashboard = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<TabView>('overview');
    const navigate = useNavigate();
    const { user, logout } = useUserStore();
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [isSaving, setIsSaving] = useState(false);
    
    // EEG Store
    const isConnected = useEEGStore((state) => state.isConnected);
    const currentMetrics = useEEGStore((state) => state.currentMetrics);
    const dataHistory = useEEGStore((state) => state.dataHistory);
    const getAverageMetrics = useEEGStore((state) => state.getAverageMetrics);
    
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
        { icon: <Camera size={20} />, label: 'Face Recognition', action: () => navigate('/face-recognition') },
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
                    <div className="dashboard-gripd">
                        {/* Informasi & Tips */}
                        <div className="widget-card" style={{marginBottom: '1rem', gridColumn: 'span 3', background: '#f8fafc', border: '2px dashed #cbd5e1' }}>
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '12px',
                                    background: '#dbeafe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Info size={24} color="#3b82f6" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.1rem' }}>Cara Menggunakan Sistem</h3>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.6' }}>
                                        <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                                            <li>Hubungkan <strong>Muse 2 EEG Headset</strong> melalui LSL (Lab Streaming Layer)</li>
                                            <li>Pastikan <strong>kamera</strong> terdeteksi untuk face detection</li>
                                            <li>Klik <strong>"Mulai Sesi Baru"</strong> untuk memulai monitoring real-time</li>
                                            <li>Sistem akan menganalisis <strong>brain waves</strong> (EEG) dan <strong>visual cues</strong> (mata, yawn, head pose)</li>
                                            <li>Dapatkan <strong>alert otomatis</strong> jika terdeteksi tanda-tanda kelelahan</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* System Status Cards */}
                        <div className="widget-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '12px',
                                    background: '#dbeafe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Activity size={24} color="#3b82f6" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>EEG Headset</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Muse 2</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: isConnected ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', border: `1px solid ${isConnected ? '#bbf7d0' : '#fecaca'}` }}>
                                <span style={{ fontSize: '0.9rem', color: isConnected ? '#166534' : '#991b1b' }}>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444' }}></span>
                            </div>
                            <button
                                onClick={() => setActiveTab('settings')}
                                style={{
                                    marginTop: '1rem',
                                    width: '100%',
                                    padding: '10px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                Konfigurasi Device
                            </button>
                        </div>

                        {/* Game Session Card */}
                        <div className="widget-card" style={{ gridColumn: 'span 2' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '12px',
                                    background: '#ddd6fe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Gamepad2 size={24} color="#6366f1" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Game Session</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Simulasi Mengemudi</div>
                                </div>
                            </div>

                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>
                                Mulai sesi simulasi mengemudi untuk memantau dan menganalisis tingkat kelelahan Anda secara real-time.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => navigate('/session')}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Gamepad2 size={18} />
                                    Mulai Game
                                </button>
                                <button
                                    onClick={handleViewSampleResults}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        color: '#6366f1',
                                        border: '2px solid #6366f1',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <BarChart3 size={18} />
                                    Lihat Contoh
                                </button>
                            </div>
                        </div>


                        {/* EEG Brain Waves Statistics */}
                        <div className="widget-card" style={{ gridColumn: 'span 3' }}>
                            <div className="widget-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Brain size={20} color="#3b82f6" />
                                        <span>Real-time Brain Wave Activity (Muse2 EEG)</span>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: currentMetrics ? '#ecfdf5' : '#fef2f2', color: currentMetrics ? '#166534' : '#991b1b', borderRadius: '6px', fontWeight: 500 }}>
                                        {currentMetrics ? 'Live Data' : 'No Data'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Simple Graph */}
                            {graphData.length > 0 && (
                                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                                    <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '2px', justifyContent: 'space-around' }}>
                                        {graphData.slice(-60).map((point: any, idx: number) => {
                                            const maxVal = Math.max(...graphData.map((p: any) => Math.max(p.delta, p.theta, p.alpha, p.beta, p.gamma)));
                                            const alpha = avgMetrics?.alphaPower ? (point.alpha / maxVal) * 100 : 20;
                                            return (
                                                <div key={idx} style={{
                                                    flex: 1,
                                                    height: `${Math.max(alpha, 10)}%`,
                                                    background: `hsl(${(point.alpha / (maxVal || 1)) * 360}, 70%, 50%)`,
                                                    borderRadius: '2px',
                                                    opacity: 0.8
                                                }} />
                                            );
                                        })}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center' }}>
                                        Grafik Brain Wave (Alpha Power)
                                    </div>
                                </div>
                            )}
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', color: '#64748b' }}>
                                {[
                                    { name: 'Delta', range: '1-4Hz', key: 'deltaPower', color: '#8b5cf6', desc: 'Deep Sleep' },
                                    { name: 'Theta', range: '4-8Hz', key: 'thetaPower', color: '#06b6d4', desc: 'Drowsiness' },
                                    { name: 'Alpha', range: '8-13Hz', key: 'alphaPower', color: '#10b981', desc: 'Relaxed' },
                                    { name: 'Beta', range: '13-30Hz', key: 'betaPower', color: '#f59e0b', desc: 'Focused' },
                                    { name: 'Gamma', range: '30-50Hz', key: 'gammaPower', color: '#ef4444', desc: 'High Alert' }
                                ].map((wave) => {
                                    const value = currentMetrics && currentMetrics[wave.key as keyof typeof currentMetrics] 
                                        ? (currentMetrics[wave.key as keyof typeof currentMetrics] as number).toFixed(2) 
                                        : '--';
                                    return (
                                        <div key={wave.name} style={{
                                            padding: '1rem',
                                            background: '#f8fafc',
                                            borderRadius: '12px',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{
                                                width: '50px',
                                                height: '50px',
                                                margin: '0 auto 0.5rem',
                                                borderRadius: '50%',
                                                border: `4px solid ${wave.color}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.2rem',
                                                fontWeight: 700
                                            }}>
                                                {value}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                                                {wave.name}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                                {wave.range}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                                {wave.desc}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

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

                        {/* Placeholder - Fatigue Score Timeline */}
                        {!isConnected && dataHistory.length === 0 && (
                            <div className="widget-card" style={{ gridColumn: 'span 3', background: '#f9fafb', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '250px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <TrendingUp size={40} color="#cbd5e1" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', marginBottom: '0.5rem' }}>Fatigue Score Timeline</p>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Koneksi ke Muse atau mulai game session untuk melihat data</p>
                                </div>
                            </div>
                        )}

                        {/* Brain Wave Power Trend Graph */}
                        {(isConnected || dataHistory.length > 0) && (
                            <div className="widget-card" style={{ gridColumn: 'span 3' }}>
                                <div className="widget-title">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Brain size={20} color="#3b82f6" />
                                        <span>Brain Wave Power Trend (Last 100 samples) {!isConnected && '(Session Data)'}</span>
                                    </div>
                                </div>
                                <div style={{ position: 'relative', height: '200px', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', overflow: 'hidden' }}>
                                    {/* Render multiple layers for each brain wave */}
                                    {(() => {
                                        const historyToUse = dataHistory.length > 0 ? dataHistory : [];
                                        return [
                                            { key: 'alphaPower', color: '#10b981', name: 'Alpha', opacity: 0.4 },
                                            { key: 'thetaPower', color: '#06b6d4', name: 'Theta', opacity: 0.5 },
                                            { key: 'betaPower', color: '#f59e0b', name: 'Beta', opacity: 0.6 }
                                        ].map((wave) => {
                                            const maxVal = Math.max(
                                                ...historyToUse.slice(-100).map((d: any) => (d[wave.key as keyof typeof d] as number) || 0)
                                            ) || 1;
                                            
                                            return (
                                                <div
                                                    key={wave.key}
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: '1rem',
                                                        left: '1rem',
                                                        right: '1rem',
                                                        height: 'calc(100% - 2rem)',
                                                        display: 'flex',
                                                        alignItems: 'flex-end',
                                                        gap: '1px'
                                                    }}
                                                >
                                                    {historyToUse.slice(-100).map((item: any, idx: number) => {
                                                    const value = (item[wave.key as keyof typeof item] as number) || 0;
                                                    const height = (value / maxVal) * 100;
                                                    return (
                                                        <div
                                                            key={`${wave.key}-${idx}`}
                                                            style={{
                                                                flex: 1,
                                                                height: `${Math.max(height, 5)}%`,
                                                                background: wave.color,
                                                                borderRadius: '1px',
                                                                opacity: wave.opacity
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        );
                                    });
                                    })()}
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                                    {[
                                        { color: '#8b5cf6', label: 'Delta (Sleep)' },
                                        { color: '#06b6d4', label: 'Theta (Drowsy)' },
                                        { color: '#10b981', label: 'Alpha (Relaxed)' },
                                        { color: '#f59e0b', label: 'Beta (Focused)' },
                                        { color: '#ef4444', label: 'Gamma (Alert)' }
                                    ].map((item) => (
                                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: '12px', height: '12px', backgroundColor: item.color, borderRadius: '2px' }}></span>
                                            <span style={{ color: '#64748b' }}>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Placeholder - Brain Wave Power Trend */}
                        {!isConnected && dataHistory.length === 0 && (
                            <div className="widget-card" style={{ gridColumn: 'span 3', background: '#f9fafb', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '250px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <Brain size={40} color="#cbd5e1" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', marginBottom: '0.5rem' }}>Brain Wave Power Trend</p>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Koneksi ke Muse atau mulai game session untuk melihat data</p>
                                </div>
                            </div>
                        )}

                        {/* Fatigue Analysis */}
                        <div className="widget-card" style={{ gridColumn: 'span 2' }}>
                            <div className="widget-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Eye size={20} color="#f59e0b" />
                                        <span>Real-time Analisis Kelelahan</span>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: currentMetrics ? '#ecfdf5' : '#fef2f2', color: currentMetrics ? '#166534' : '#991b1b', borderRadius: '6px', fontWeight: 500 }}>
                                        {currentMetrics ? 'Live' : 'Standby'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem', padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e', lineHeight: '1.5' }}>
                                    <strong>💡 Fusion System:</strong> Menggabungkan data EEG (brain waves) dan Computer Vision (face detection) untuk deteksi kelelahan yang lebih akurat.
                                </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>EEG Fatigue Score</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentMetrics?.eegFatigueScore ? (currentMetrics.eegFatigueScore as number).toFixed(2) : '--'}</span>
                                    </div>
                                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${currentMetrics?.eegFatigueScore ? Math.min((currentMetrics.eegFatigueScore as number) * 10, 100) : 0}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Theta-Alpha Ratio</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentMetrics?.thetaAlphaRatio ? (currentMetrics.thetaAlphaRatio as number).toFixed(2) : '--'}</span>
                                    </div>
                                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${currentMetrics?.thetaAlphaRatio ? Math.min((currentMetrics.thetaAlphaRatio as number) * 20, 100) : 0}%`, height: '100%', background: '#3b82f6' }}></div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Signal Quality</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: '#64748b' }}>{currentMetrics?.signalQuality ? (currentMetrics.signalQuality as number).toFixed(1) : '--'}</div>
                                    </div>
                                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>State</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: '#64748b' }}>{currentMetrics?.cognitiveState || '--'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cognitive Status */}
                        <div className="widget-card">
                            <div className="widget-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <TrendingUp size={20} color="#10b981" />
                                    <span>Real-time Status Kognitif</span>
                                </div>
                            </div>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                                Metrik real-time dari analisis EEG brain waves
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.25rem' }}>Attention Level (Beta Power)</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#15803d' }}>{currentMetrics?.betaPower ? (currentMetrics.betaPower as number).toFixed(2) : '--'}</div>
                                </div>
                                <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.25rem' }}>Cognitive Load (Theta/Alpha)</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#b45309' }}>{currentMetrics?.betaAlphaRatio ? (currentMetrics.betaAlphaRatio as number).toFixed(2) : '--'}</div>
                                </div>
                                <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.25rem' }}>Signal Quality</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1d4ed8' }}>{currentMetrics?.signalQuality ? (currentMetrics.signalQuality as number).toFixed(1) : '--'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Driving Performance */}
                        <div className="widget-card" style={{ gridColumn: 'span 3' }}>
                            <div className="widget-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Gauge size={20} color="#8b5cf6" />
                                        <span>Performa Mengemudi (Simulasi)</span>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontWeight: 500 }}>
                                        Awaiting Session
                                    </span>
                                </div>
                            </div>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                                Data dari simulasi mengemudi: lane keeping, speed control, reaction time, dan alert events
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', color: '#64748b' }}>
                                {[
                                    { label: 'Lane Deviation', value: '-- cm', icon: <Target size={18} />, color: '#3b82f6' },
                                    { label: 'Speed Consistency', value: '-- %', icon: <Gauge size={18} />, color: '#10b981' },
                                    { label: 'Reaction Time', value: '-- ms', icon: <Timer size={18} />, color: '#f59e0b' },
                                    { label: 'Alert Count', value: '--', icon: <AlertTriangle size={18} />, color: '#ef4444' }
                                ].map((metric) => (
                                    <div key={metric.label} style={{
                                        padding: '1.25rem',
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem'
                                    }}>
                                        <div style={{ color: metric.color }}>{metric.icon}</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{metric.value}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{metric.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendations & Tips */}
                        <div className="widget-card" style={{ gridColumn: 'span 2', background: '#FCDCDC', color: '#802222', border: 'none' }}>
                            <div className="widget-title" style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.8)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <AlertTriangle size={20} color="#802222" />
                                    <span style={{ color: '#802222' }}>Tips Keselamatan Berkendara</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'start', padding: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>1</div>
                                    <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.5' }}>
                                        <strong>Istirahat Teratur:</strong> Berhenti setiap 2 jam atau 200 km untuk mencegah kelelahan ekstrem
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'start', padding: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>2</div>
                                    <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.5' }}>
                                        <strong>Cek Signal Quality:</strong> Pastikan headset EEG terpasang dengan benar untuk data akurat
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'start', padding: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>3</div>
                                    <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.5' }}>
                                        <strong>Respond to Alerts:</strong> Jika sistem memberikan warning, segera istirahat atau pull over
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'start', padding: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>4</div>
                                    <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.5' }}>
                                        <strong>Hindari Multitasking:</strong> Fokus pada mengemudi untuk hasil monitoring optimal
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Session Summary */}
                        <div className="widget-card">
                            <div className="widget-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <History size={20} color="#64748b" />
                                    <span>Sesi Terakhir</span>
                                </div>
                            </div>
                            <div style={{
                                padding: '2rem 1rem',
                                textAlign: 'center',
                                color: '#64748b'
                            }}>
                                <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Belum ada sesi yang dijalankan</p>
                                <button
                                    className="btn-primary"
                                    style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                                    onClick={() => setActiveTab('history')}
                                >
                                    Lihat History
                                </button>
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
                                        placeholder="Search sessions..."
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 40px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>
                                    <Filter size={18} />
                                    <span>Filter</span>
                                </button>
                                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>
                                    <Download size={18} />
                                    <span>Export</span>
                                </button>
                            </div>
                        </div>

                        {/* Session Statistics Overview */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', color: '#64748b' }}>
                            {[
                                { label: 'Total Sessions', value: '0', icon: <BarChart3 size={20} />, color: '#3b82f6' },
                                { label: 'Total Hours', value: '0h', icon: <Clock size={20} />, color: '#10b981' },
                                { label: 'Avg. Fatigue Score', value: '--', icon: <TrendingUp size={20} />, color: '#f59e0b' },
                                { label: 'Alerts Triggered', value: '0', icon: <AlertTriangle size={20} />, color: '#ef4444' }
                            ].map((stat) => (
                                <div key={stat.label} className="widget-card" style={{ textAlign: 'center' }}>
                                    <div style={{ color: stat.color, marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{stat.value}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Session List */}
                        <div className="widget-card">
                            <div className="widget-title">Recent Sessions</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Empty State with Fumorive Branding */}
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
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>No Sessions Yet</h3>
                                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Start a new session to see your driving and fatigue data here</p>
                                    <button
                                        className="btn-primary"
                                        style={{ marginTop: '1.5rem', padding: '10px 24px' }}
                                        onClick={() => navigate('/session')}
                                    >
                                        Start Your First Session
                                    </button>
                                </div>
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
