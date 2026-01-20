import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Chrome, Instagram, Youtube, Twitter } from 'lucide-react'; // Using Lucide for partners too as placeholders
import './Login.css';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true); // Default to True (Login)
    const [showPassword, setShowPassword] = useState(false);

    // const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log(isLogin ? 'Logging in...' : 'Registering...');
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
                        <p className="visual-tag">You can easily</p>
                        <h2 className="visual-heading">
                            Speed up your work<br />with our Web App
                        </h2>
                    </div>

                    <div className="partners-section">
                        <p className="partners-label">Our partners</p>
                        <div className="logos-marquee-container">
                            <div className="logos-marquee">
                                {/* Duplicate items for seamless scroll */}
                                <span className="partner-logo"><span style={{ fontWeight: 800 }}>Discord</span></span>
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
                    </div>

                    <div className="abstract-bg"></div>
                </div>

                {/* Right Side: Form (White) */}
                <div className="login-form-container">
                    <div className="form-header">
                        <h2 className="form-title">{isLogin ? 'Welcome Back' : 'Get Started Now'}</h2>
                        <p className="form-subtitle">
                            {isLogin ? 'Please log in to your account to continue.' : 'Please enter your details to create account.'}
                        </p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: '1.25rem' }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="input-group"
                                    style={{ overflow: 'hidden' }}
                                >
                                    <label className="input-label">Name</label>
                                    <input type="text" placeholder="Enter your name..." className="custom-input" required={!isLogin} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="input-group">
                            <label className="input-label">Email address</label>
                            <input type="email" placeholder="workmail@gmail.com" className="custom-input" required />
                        </div>

                        <div className="input-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label className="input-label">Password</label>
                                <span className="forgot-pass">Forgot Password?</span>
                            </div>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="............"
                                    className="custom-input"
                                    required
                                />
                                <div
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </div>
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="checkbox-group">
                                <label className="custom-checkbox">
                                    <input type="checkbox" required />
                                    <span className="checkmark"></span>
                                    <span className="checkbox-text">I agree to the <a href="#">Terms & Privacy</a></span>
                                </label>
                            </div>
                        )}

                        <button type="submit" className="login-btn-primary">
                            {isLogin ? 'Log In' : 'Sign Up'}
                        </button>

                        <div className="toggle-text">
                            {isLogin ? "Don't have an account? " : "Have an account? "}
                            <span onClick={() => setIsLogin(!isLogin)}>
                                {isLogin ? 'Signup' : 'Log in'}
                            </span>
                        </div>

                        <div className="divider-or">
                            <span>Or</span>
                        </div>

                        <div className="social-row">
                            <button type="button" className="social-btn-box" style={{ width: '100%' }}>
                                <Chrome size={20} className="social-icon" />
                                <span>Login with Google</span>
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
