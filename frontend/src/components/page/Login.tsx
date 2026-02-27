import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Chrome, Loader2, ArrowLeft, Mail, KeyRound, CheckCircle2 } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { authService } from '../../api/auth';
import './Login.css';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true); // Default to True (Login)
    const [showPassword, setShowPassword] = useState(false);
    const [showLoginLoading, setShowLoginLoading] = useState(false);

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // Forgot Password States
    const [isForgot, setIsForgot] = useState(false);
    const [forgotStep, setForgotStep] = useState<1 | 2>(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [devToken, setDevToken] = useState('');   // demo only
    const [resetCode, setResetCode] = useState('');
    const [resetNewPwd, setResetNewPwd] = useState('');
    const [resetConfirmPwd, setResetConfirmPwd] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState('');

    const navigate = useNavigate();
    const { login, loginWithGoogle, register, isLoading, error } = useUserStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (isLogin) {
                setShowLoginLoading(true);
                await login({ email, password });
                // Loading akan hilang otomatis saat navigate
                setTimeout(() => {
                    navigate('/dashboard');
                }, 500); // Small delay untuk smooth transition
            } else {
                await register({
                    email,
                    password,
                    full_name: name,
                    role: 'student'
                });
                alert('Registration successful! Please log in.');
                setIsLogin(true); // Switch to login view
            }
        } catch (err) {
            console.error("Auth error:", err);
            setShowLoginLoading(false);
            // Error is already set in the store
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            // Use the store's loginWithGoogle which handles token + user state properly
            await loginWithGoogle();
            navigate('/dashboard');
        } catch (err: any) {
            console.error("Google sign-in error:", err);
            alert(err.message || 'Failed to sign in with Google');
        }
    };

    const openForgot = () => {
        setIsForgot(true);
        setForgotStep(1);
        setForgotEmail('');
        setDevToken('');
        setResetCode('');
        setResetNewPwd('');
        setResetConfirmPwd('');
        setForgotError('');
        setForgotSuccess('');
    };

    const closeForgot = () => {
        setIsForgot(false);
        setForgotStep(1);
        setForgotError('');
        setForgotSuccess('');
    };

    const handleForgotRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError('');
        setForgotLoading(true);
        try {
            const res = await authService.forgotPassword(forgotEmail);
            setDevToken(res.dev_token || '');
            setForgotStep(2);
        } catch (err: any) {
            setForgotError(err.response?.data?.detail || 'Terjadi kesalahan. Coba lagi.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError('');
        if (resetNewPwd !== resetConfirmPwd) {
            setForgotError('Konfirmasi password tidak cocok.');
            return;
        }
        if (resetNewPwd.length < 8) {
            setForgotError('Password minimal 8 karakter.');
            return;
        }
        setForgotLoading(true);
        try {
            await authService.resetPassword(forgotEmail, resetCode, resetNewPwd);
            setForgotSuccess('Password berhasil direset! Silakan login.');
            setTimeout(() => {
                closeForgot();
            }, 2500);
        } catch (err: any) {
            setForgotError(err.response?.data?.detail || 'Kode reset tidak valid atau sudah kadaluarsa.');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="login-page">
            <motion.div
                className="split-card"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Left Side: Visual (Blue) */}
                <div className="login-visual">
                    <div className="visual-content">
                        <p className="visual-tag">Ikut serta uji coba Fumorive</p>
                        <h2 className="visual-heading">
                           Fumorive hadir untuk menjaga keamanan berkendaramu.
                        </h2>
                    </div>

                   {/* <div className="partners-section">
                        <p className="partners-label">Our partners</p>
                        <div className="logos-marquee-container">
                            <div className="logos-marquee">
                                {/* Duplicate items for seamless scroll */}
                                {/* <span className="partner-logo"><span style={{ fontWeight: 800 }}>Discord</span></span>
                                <span className="partner-logo"><Instagram size={16} style={{ marginRight: 4 }} />Instagram</span>
                                <span className="partner-logo"><span style={{ fontWeight: 800 }}>Spotify</span></span>
                                <span className="partner-logo"><Youtube size={16} style={{ marginRight: 4 }} />YouTube</span>
                                <span className="partner-logo"><Twitter size={16} /></span>

                                <span className="partner-logo"><span style={{ fontWeight: 800 }}>Discord</span></span>
                                <span className="partner-logo"><Instagram size={16} style={{ marginRight: 4 }} />Instagram</span>
                                <span className="partner-logo"><span style={{ fontWeight: 800 }}>Spotify</span></span>
                                <span className="partner-logo"><Youtube size={16} style={{ marginRight: 4 }} />YouTube</span>
                                <span className="partner-logo"><Twitter size={16} /></span>
                            </div>
                        </div>
                    </div> */}

                    <div className="abstract-bg"></div>
                </div>

                {/* Right Side: Form (White) */}
                <div className="login-form-container">
                    {/* Back to Landing */}
                    <button
                        onClick={() => isForgot ? closeForgot() : navigate('/')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary, #64748b)',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            padding: '0',
                            marginBottom: '1.5rem',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent-blue, #2563eb)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary, #64748b)')}
                    >
                        <ArrowLeft size={15} />
                        {isForgot ? 'Kembali ke Login' : 'Kembali ke Beranda'}
                    </button>

                    <AnimatePresence mode="wait">
                        {/* ── FORGOT PASSWORD FLOW ── */}
                        {isForgot ? (
                            <motion.div
                                key="forgot"
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -24 }}
                                transition={{ duration: 0.25 }}
                            >
                                {forgotSuccess ? (
                                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                        <CheckCircle2 size={56} color="#16a34a" style={{ margin: '0 auto 1rem' }} />
                                        <h2 style={{ margin: '0 0 0.5rem', color: '#15803d', fontWeight: 800 }}>Berhasil!</h2>
                                        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>{forgotSuccess}</p>
                                    </div>
                                ) : forgotStep === 1 ? (
                                    <>
                                        <div className="form-header">
                                            <h2 className="form-title">Lupa Password?</h2>
                                            <p className="form-subtitle">Masukkan email akun Anda. Kode reset akan dikirimkan.</p>
                                        </div>
                                        <form className="auth-form" onSubmit={handleForgotRequest}>
                                            {forgotError && (
                                                <div style={{ color: '#be123c', marginBottom: '1rem', fontSize: '0.9rem', background: '#fff1f2', padding: '10px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                                                    {forgotError}
                                                </div>
                                            )}
                                            <div className="input-group">
                                                <label className="input-label">Email</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="email"
                                                        placeholder="workmail@gmail.com"
                                                        className="custom-input"
                                                        required
                                                        value={forgotEmail}
                                                        onChange={e => setForgotEmail(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <button type="submit" className="login-btn-primary" disabled={forgotLoading}>
                                                {forgotLoading ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <Loader2 size={18} className="spinner-icon" /> Memproses...
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <Mail size={16} /> Kirim Kode Reset
                                                    </span>
                                                )}
                                            </button>
                                        </form>
                                    </>
                                ) : (
                                    <>
                                        <div className="form-header">
                                            <h2 className="form-title">Masukkan Kode Reset</h2>
                                            <p className="form-subtitle">Kode 6-digit dikirim ke <strong>{forgotEmail}</strong>.</p>
                                        </div>
                                        {devToken && (
                                            <div style={{ marginBottom: '1.25rem', padding: '12px 16px', background: '#fffbeb', border: '1.5px dashed #fbbf24', borderRadius: '10px', fontSize: '0.82rem', color: '#92400e', lineHeight: 1.6 }}>
                                                <strong>⚠ Mode Demo</strong> — Kode reset Anda:<br />
                                                <span style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '0.15em', color: '#b45309', display: 'block', marginTop: '4px' }}>{devToken}</span>
                                                <span style={{ fontSize: '0.75rem', color: '#a16207' }}>Berlaku 15 menit. Pada produksi, kode ini dikirim via email.</span>
                                            </div>
                                        )}
                                        <form className="auth-form" onSubmit={handleResetPassword}>
                                            {forgotError && (
                                                <div style={{ color: '#be123c', marginBottom: '1rem', fontSize: '0.9rem', background: '#fff1f2', padding: '10px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                                                    {forgotError}
                                                </div>
                                            )}
                                            <div className="input-group">
                                                <label className="input-label">Kode Reset (6 digit)</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="text"
                                                        placeholder="123456"
                                                        className="custom-input"
                                                        required
                                                        maxLength={6}
                                                        value={resetCode}
                                                        onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))}
                                                        style={{ letterSpacing: '0.2em', fontFamily: 'monospace', fontSize: '1.1rem' }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Password Baru</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="password"
                                                        placeholder="Minimal 8 karakter"
                                                        className="custom-input"
                                                        required
                                                        value={resetNewPwd}
                                                        onChange={e => setResetNewPwd(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Konfirmasi Password Baru</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="password"
                                                        placeholder="Ulangi password baru"
                                                        className="custom-input"
                                                        required
                                                        value={resetConfirmPwd}
                                                        onChange={e => setResetConfirmPwd(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <button type="submit" className="login-btn-primary" disabled={forgotLoading}>
                                                {forgotLoading ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <Loader2 size={18} className="spinner-icon" /> Menyimpan...
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <KeyRound size={16} /> Reset Password
                                                    </span>
                                                )}
                                            </button>
                                            <div className="toggle-text">
                                                <span onClick={() => { setForgotStep(1); setForgotError(''); }} style={{ cursor: 'pointer' }}>← Ganti email</span>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </motion.div>
                        ) : (
                        /* ── LOGIN / REGISTER FLOW ── */
                        <motion.div
                            key="auth"
                            initial={{ opacity: 0, x: -24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 24 }}
                            transition={{ duration: 0.25 }}
                        >
                        <div className="form-header">
                            <h2 className="form-title">{isLogin ? 'Halo Driver!' : 'Ayo Mulai Sekarang!'}</h2>
                            <p className="form-subtitle">
                                {isLogin ? 'Mohon Log In untuk melanjutkan.' : 'Masukkan detail informasi anda untuk membuat akun.'}
                            </p>
                        </div>

                        <form className="auth-form" onSubmit={handleSubmit}>
                        {error && (
                            <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem', background: '#fee2e2', padding: '10px', borderRadius: '8px' }}>
                                {error}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: '1.25rem' }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="input-group"
                                    style={{ overflow: 'hidden' }}
                                >
                                    <label className="input-label">Nama</label>
                                    <input
                                        type="text"
                                        placeholder="Masukkan namamu"
                                        className="custom-input"
                                        required={!isLogin}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="input-group">
                            <label className="input-label">Email</label>
                            <input
                                type="email"
                                placeholder="workmail@gmail.com"
                                className="custom-input"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label className="input-label">Password</label>
                                <span className="forgot-pass" onClick={openForgot} style={{ cursor: 'pointer' }}>Lupa Password?</span>
                            </div>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="............"
                                    className="custom-input password-input"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <div
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </div>
                            </div>
                        </div>

                        {/* {!isLogin && (
                            <div className="checkbox-group">
                                <label className="custom-checkbox">
                                    <input type="checkbox" required />
                                    <span className="checkmark"></span>
                                    <span className="checkbox-text">I agree to the <a href="#">Terms & Privacy</a></span>
                                </label>
                            </div>
                        )} */}

                        <button type="submit" className="login-btn-primary" disabled={isLoading}>
                            {isLoading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Loader2 size={18} className="spinner-icon" />
                                    Loading...
                                </span>
                            ) : (isLogin ? 'Log In' : 'Sign Up')}
                        </button>

                        <div className="toggle-text">
                            {isLogin ? "Tidak memiliki akun? " : "Sudah memiliki akun? "}
                            <span onClick={() => setIsLogin(!isLogin)}>
                                {isLogin ? 'Signup' : 'Log in'}
                            </span>
                        </div>

                        <div className="divider-or">
                            <span>Atau</span>
                        </div>

                        <div className="social-row">
                            <button
                                type="button"
                                className="social-btn-box"
                                style={{ width: '100%' }}
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                            >
                                <Chrome size={20} className="social-icon" />
                                <span>Login dengan Google</span>
                            </button>
                        </div>
                        </form>
                        </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Login Loading Overlay */}
            <AnimatePresence>
                {showLoginLoading && (
                    <motion.div
                        className="login-loading-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="login-loading-content">
                            <Loader2 size={48} className="login-spinner" />
                            <h3 className="login-loading-text">Logging in...</h3>
                            <p className="login-loading-subtext">Mohon tunggu sebentar</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Login;
