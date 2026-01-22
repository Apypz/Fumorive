import { useState } from 'react';
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
    Zap,
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
    Info
} from 'lucide-react';
import './Dashboard.css';

type TabView = 'overview' | 'history' | 'settings';

const Dashboard = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<TabView>('overview');
    const navigate = useNavigate();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Overview', tab: 'overview' as TabView },
        { icon: <History size={20} />, label: 'History', tab: 'history' as TabView },
        { icon: <Settings size={20} />, label: 'Settings', tab: 'settings' as TabView },
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

                    <div className="nav-item" onClick={() => navigate('/')} style={{ color: '#ef4444' }}>
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
                            {activeTab === 'overview' && 'Welcome Back, Driver'}
                            {activeTab === 'history' && 'Session History'}
                            {activeTab === 'settings' && 'Settings'}
                        </h1>
                        <p>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <div className="header-actions">
                        <div className="user-profile">
                            <div className="user-avatar"><User size={18} /></div>
                            <span className="user-name">Guest User</span>
                        </div>
                    </div>
                </header>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                <div className="dashboard-grid">
                    {/* Driver Status Card */}
                    <div className="widget-card" style={{ gridColumn: 'span 2' }}>
                        <div className="widget-title">
                            <span>Driver Status</span>
                            <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: '20px' }}>Active</span>
                        </div>
                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                            <div style={{
                                width: '120px', height: '120px',
                                borderRadius: '50%',
                                border: '8px solid #cbd5e1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column'
                            }}>
                                <span style={{ fontSize: '2rem', fontWeight: 700 , color:'#64748b'}}>--</span>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Fatigue</span>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color:'#000000'}}>Ready to Start</h3>
                                <p style={{ margin: 0, color: '#64748b' }}>Connect your headset to begin monitoring.</p>
                                <button
                                    className="btn-primary"
                                    style={{ marginTop: '1rem', padding: '10px 20px', fontSize: '0.9rem' }}
                                    onClick={() => navigate('/session')}
                                >
                                    Start New Session
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="widget-card">
                        <div className="widget-title">System Check</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <Activity size={18} color="#64748b" />
                                    <span style={{ color:'#000000'}}>EEG Headset</span>
                                </div>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1'  }}></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <Zap size={18} color="#64748b" />
                                    <span style={{ color:'#000000'}}>Connection</span>
                                </div>
                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Offline</span>
                            </div>
                        </div>
                    </div>

                    {/* EEG Brain Waves Statistics */}
                    <div className="widget-card" style={{ gridColumn: 'span 2' }}>
                        <div className="widget-title">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Brain size={20} color="#3b82f6" />
                                <span>Brain Wave Activity (Muse2)</span>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', color:'#64748b'}}>
                            {[
                                { name: 'Delta', range: '1-4Hz', value: '--', color: '#8b5cf6', desc: 'Deep Sleep' },
                                { name: 'Theta', range: '4-8Hz', value: '--', color: '#06b6d4', desc: 'Drowsiness' },
                                { name: 'Alpha', range: '8-13Hz', value: '--', color: '#10b981', desc: 'Relaxed' },
                                { name: 'Beta', range: '13-30Hz', value: '--', color: '#f59e0b', desc: 'Focused' },
                                { name: 'Gamma', range: '30-50Hz', value: '--', color: '#ef4444', desc: 'High Alert' }
                            ].map((wave) => (
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
                                        {wave.value}
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
                            ))}
                        </div>
                    </div>

                    {/* Fatigue Analysis */}
                    <div className="widget-card">
                        <div className="widget-title">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <Eye size={20} color="#f59e0b" />
                                <span>Fatigue Analysis</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>EEG Fatigue Score</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>--</span>
                                </div>
                                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: '0%', height: '100%', background: 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)' }}></div>
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Eye Closure (PERCLOS)</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>--</span>
                                </div>
                                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: '0%', height: '100%', background: '#3b82f6' }}></div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Blink Rate</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color:'#64748b'}}>-- /min</div>
                                </div>
                                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Yawn Count</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color:'#64748b'}}>--</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cognitive Status */}
                    <div className="widget-card">
                        <div className="widget-title">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <TrendingUp size={20} color="#10b981" />
                                <span>Cognitive Status</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.25rem' }}>Attention Level</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#15803d' }}>--</div>
                            </div>
                            <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
                                <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.25rem' }}>Cognitive Load</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#b45309' }}>--</div>
                            </div>
                            <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.25rem' }}>Signal Quality</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1d4ed8' }}>--</div>
                            </div>
                        </div>
                    </div>

                    {/* Driving Performance */}
                    <div className="widget-card" style={{ gridColumn: 'span 2' }}>
                        <div className="widget-title">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Gauge size={20} color="#8b5cf6" />
                                <span>Driving Performance</span>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', color:'#64748b'}}>
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

                    {/* Session Summary */}
                    <div className="widget-card">
                        <div className="widget-title">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <History size={20} color="#64748b" />
                                <span>Last Session</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Date</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color:'#64748b' }}>--</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Duration</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color:'#64748b' }}>--</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Distance</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color:'#64748b' }}>-- km</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Avg. Fatigue</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color:'#64748b' }}>--</span>
                            </div>
                            <div style={{ 
                                marginTop: '0.5rem',
                                padding: '0.75rem',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Overall Score</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem', color:'#64748b' }}>--/100</div>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', color:'#64748b'}}>
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
                            {/* Empty State */}
                            <div style={{ 
                                padding: '3rem', 
                                textAlign: 'center',
                                color: '#64748b'
                            }}>
                                <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>No Sessions Yet</h3>
                                <p style={{ margin: 0 }}>Start a new session to see your driving and fatigue data here</p>
                                <button
                                    className="btn-primary"
                                    style={{ marginTop: '1.5rem', padding: '10px 24px' }}
                                    onClick={() => navigate('/session')}
                                >
                                    Start Your First Session
                                </button>
                            </div>

                            {/* Session Card Template (akan muncul ketika ada data) */}
                            {/* <div style={{ 
                                padding: '1rem', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '12px',
                                display: 'flex',
                                gap: '1rem',
                                alignItems: 'center'
                            }}>
                                <div style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    borderRadius: '12px', 
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column',
                                    color: 'white'
                                }}>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>72</div>
                                    <div style={{ fontSize: '0.7rem' }}>Fatigue</div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.25rem 0' }}>Session #001</h4>
                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                                        January 20, 2026 • 45 minutes • 12.5 km
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#fef3c7', color: '#92400e', borderRadius: '4px' }}>
                                            Moderate Fatigue
                                        </span>
                                        <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px' }}>
                                            3 Alerts
                                        </span>
                                    </div>
                                </div>
                                <button style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>
                                    View Details
                                </button>
                            </div> */}
                        </div>
                    </div>
                </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                <div className="dashboard-content">
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
