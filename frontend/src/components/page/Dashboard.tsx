import { useState } from 'react';
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
    Zap
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
        { icon: <Gamepad2 size={20} />, label: 'Live Session', path: '/session' },
        { icon: <History size={20} />, label: 'History', path: '/history' },
        { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
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
                    {navItems.map((item) => (
                        <div
                            key={item.path}
                            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
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
                        <h1>Welcome Back, Driver</h1>
                        <p>Monday, 20 January 2026</p>
                    </div>

                    <div className="header-actions">
                        <div className="user-profile">
                            <div className="user-avatar"><User size={18} /></div>
                            <span className="user-name">Guest User</span>
                        </div>
                    </div>
                </header>

                {/* Dashboard Widgets Placeholder */}
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
                                <span style={{ fontSize: '2rem', fontWeight: 700 }}>--</span>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Fatigue</span>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0' }}>Ready to Start</h3>
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
                                    <span>EEG Headset</span>
                                </div>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1' }}></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <Zap size={18} color="#64748b" />
                                    <span>Connection</span>
                                </div>
                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Offline</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
