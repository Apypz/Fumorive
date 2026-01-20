import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Activity, Shield, Zap, Layers, Play, CheckCircle, ArrowRight, Mail, Github, Linkedin, Database, Wifi, ChevronDown } from 'lucide-react';
import './LandingPage.css';
import heroBg from '../../assets/hero_bg.png';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    return (
        <div className="landing-container">
            <Navbar />
            <HeroSection />
            <ProblemSection />
            <SolutionSection />
            <DemoSection />
            <FeaturesSection />
            <ValidationSection />
            <PricingSection />
            <FAQSection />
            <FooterSection />
        </div>
    );
};

// --- Sub-components ---

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            const offset = window.scrollY;
            if (offset > 20) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="container navbar-container">
                <div
                    className="navbar-logo"
                    onClick={() => window.scrollTo(0, 0)}
                >
                    Fumorive
                </div>

                <div className="navbar-links">
                    <div className="nav-item">
                        <a href="#hero">Home</a>
                    </div>

                    <div className="nav-item">
                        <span>Solutions</span>
                        <ChevronDown size={16} className="chevron-icon" />
                        <div className="submenu">
                            <a href="#" className="submenu-link">For Researchers</a>
                            <a href="#" className="submenu-link">For Enterprise</a>
                            <a href="#" className="submenu-link">Hardware Integration</a>
                        </div>
                    </div>

                    <div className="nav-item">
                        <span>Resources</span>
                        <ChevronDown size={16} className="chevron-icon" />
                        <div className="submenu">
                            <a href="#" className="submenu-link">Documentation</a>
                            <a href="#" className="submenu-link">API Reference</a>
                            <a href="#" className="submenu-link">Case Studies</a>
                        </div>
                    </div>

                    <a href="#pricing" className="nav-link">Pricing</a>
                </div>

                <button
                    className="btn btn-solid navbar-btn"
                    onClick={() => navigate('/session')}
                >
                    Get Started
                </button>
            </div>
        </nav>
    )
}

const HeroSection = () => {
    return (
        <section id="hero" className="hero-section" style={{
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Image with Light Overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${heroBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                zIndex: -2
            }}></div>
            <div className="hero-overlay"></div>

            <div className="container hero-content">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1>Driving Simulation that<br />Reads Your <span style={{ color: 'var(--color-accent-blue)' }}>Mind</span></h1>
                    <p>
                        Integrated EEG and telemetry for next-generation driver training, UX research, and cognitive analysis.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <motion.a
                            href="#"
                            className="btn btn-solid"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Try Live Demo
                        </motion.a>
                        <motion.a
                            href="#"
                            className="btn btn-primary"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Watch Video
                        </motion.a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

const ProblemSection = () => {
    return (
        <section className="section">
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="section-title">Why Legacy Training Fails</h2>
                    <p className="section-subtitle">Conventional simulators miss the most important variable: the driver's cognitive state.</p>
                </motion.div>

                <div className="grid-3">
                    <FeatureCard
                        icon={<Activity size={40} color="var(--color-accent-blue)" />}
                        title="Lack of Cognitive Data"
                        description="Traditional simulators track the car, not the driver. We track focus, stress, and fatigue in real-time."
                        delay={0.1}
                    />
                    <FeatureCard
                        icon={<Shield size={40} color="var(--color-accent-blue)" />}
                        title="Safety Risks"
                        description="Training for dangerous scenarios on real roads is reckless. Simulate extreme conditions safely."
                        delay={0.2}
                    />
                    <FeatureCard
                        icon={<Layers size={40} color="var(--color-accent-blue)" />}
                        title="Subjective Feedback"
                        description="Eliminate guesswork. Get objective, neurological metrics on driver performance."
                        delay={0.3}
                    />
                </div>
            </div>
        </section>
    )
}

const SolutionSection = () => {
    return (
        <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="section-title">The Fumorive Solution</h2>
                    <p className="section-subtitle">A seamless integration of brain-computer interface (BCI) and high-fidelity driving simulation.</p>
                </motion.div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', marginTop: '4rem' }}>
                    <Step number="1" title="Connect EEG" desc="Wear the headset. Auto-calibration takes < 30s." delay={0.1} />
                    <ArrowRight size={30} style={{ color: 'var(--color-text-secondary)' }} />
                    <Step number="2" title="Drive Simulation" desc="Navigate realistic scenarios while we record telemetry." delay={0.2} />
                    <ArrowRight size={30} style={{ color: 'var(--color-text-secondary)' }} />
                    <Step number="3" title="Analyze Insights" desc="Review heatmaps, focus levels, and stress spikes." delay={0.3} />
                </div>
            </div>
        </section>
    )
}

const DemoSection = () => {
    return (
        <section className="section">
            <div className="container" style={{ textAlign: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="section-title">See It In Action</h2>
                    <div style={{
                        marginTop: '2rem',
                        width: '100%',
                        height: '500px',
                        background: '#0f172a',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(37, 99, 235, 0.15)'
                    }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'linear-gradient(45deg, #0f172a, #1e293b)' }}></div>
                        <Play size={80} fill="white" style={{ position: 'relative', cursor: 'pointer', zIndex: 10, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))', transition: 'transform 0.3s ease' }} />
                        <p style={{ position: 'absolute', bottom: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>Live EEG Overlay Preview</p>
                    </div>
                </motion.div>

                <div style={{ marginTop: '2rem' }}>
                    <button className="btn btn-solid">Request Full Trial</button>
                </div>
            </div>
        </section>
    )
}

const FeaturesSection = () => {
    return (
        <section id="features" className="section" style={{ background: 'var(--color-bg-secondary)' }}>
            <div className="container">
                <motion.h2
                    className="section-title"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    Technical Specifications
                </motion.h2>

                <div className="grid-3" style={{ marginTop: '3rem' }}>
                    <div className="card">
                        <h3><Zap size={24} style={{ marginRight: '10px', color: 'var(--color-accent-blue)' }} /> Low Latency</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Under 20ms round-trip time for real-time neurofeedback loops.</p>
                    </div>
                    <div className="card">
                        <h3><Brain size={24} style={{ marginRight: '10px', color: 'var(--color-accent-blue)' }} /> EEG Sync</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Millisecond-precise synchronization between telemetry and brainwaves.</p>
                    </div>
                    <div className="card">
                        <h3><Activity size={24} style={{ marginRight: '10px', color: 'var(--color-accent-blue)' }} /> Open API</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Full REST & WebSocket API access for custom research integrations.</p>
                    </div>
                </div>

                {/* Architecture Diagram */}
                <motion.div
                    style={{ marginTop: '5rem', background: 'white', padding: '3rem', borderRadius: '20px', boxShadow: 'var(--glass-shadow)', border: '1px solid var(--glass-border)' }}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h3 style={{ textAlign: 'center', marginBottom: '3rem', color: 'var(--color-text-primary)' }}>System Architecture</h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>

                        {/* Driver */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ border: '2px solid var(--color-accent-blue)', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', background: 'var(--color-bg-secondary)' }}>
                                <Brain size={40} color="var(--color-accent-blue)" />
                            </div>
                            <p style={{ fontWeight: 600 }}>Driver (EEG)</p>
                        </div>

                        <ArrowRight size={24} color="var(--color-text-secondary)" />

                        {/* Local Client */}
                        <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}><Wifi size={30} color="var(--color-accent-neon)" /></div>
                            <strong>Fumorive Client</strong>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Telemetry Sync<br />Data Buffering</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>WebSocket</span>
                            <div style={{ width: '50px', height: '2px', background: 'var(--color-text-secondary)' }}></div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>&lt; 20ms</span>
                        </div>

                        {/* Server */}
                        <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}><Database size={30} color="var(--color-accent-blue)" /></div>
                            <strong>Processing Node</strong>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Analytics Engine<br />Session Storage</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}



const ValidationSection = () => {
    return (
        <section className="section">
            <div className="container">
                <h2 className="section-title">Validated Excellence</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', marginTop: '3rem' }}>
                    <div style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.75)', borderRadius: '16px', boxShadow: 'var(--glass-shadow)', border: '1px solid rgba(37, 99, 235, 0.08)', backdropFilter: 'blur(10px)' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Research Backed</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', lineHeight: 1.8 }}>
                            "Fumorive's platform allowed us to correlate driver distraction with alpha-wave bursts with 95% accuracy in our latest study."
                        </p>
                        <div style={{ marginTop: '1.5rem', fontWeight: 600, color: 'var(--color-accent-blue)', fontSize: '0.95rem' }}>- Dr. Sarah Chen, Neuro-Ergonomics Lab</div>
                    </div>
                    <div style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.75)', borderRadius: '16px', boxShadow: 'var(--glass-shadow)', border: '1px solid rgba(37, 99, 235, 0.08)', backdropFilter: 'blur(10px)' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Industry Ready</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', lineHeight: 1.8 }}>
                            "The most seamless integration of hardware and software we've seen in the driver training space."
                        </p>
                        <div style={{ marginTop: '1.5rem', fontWeight: 600, color: 'var(--color-accent-blue)', fontSize: '0.95rem' }}>- AutoSafety Solutions Inc.</div>
                    </div>
                </div>
            </div>
        </section>
    )
}

const PricingSection = () => {
    return (
        <section id="pricing" className="section">
            <div className="container">
                <h2 className="section-title">Pricing Plans</h2>
                <div className="grid-3" style={{ marginTop: '3rem' }}>
                    <PricingCard
                        title="Researcher"
                        price="$299"
                        period="/mo"
                        features={['Single User License', 'Raw EEG Data Export', 'Basic Scenarios', 'Email Support']}
                    />
                    <PricingCard
                        title="Institution"
                        price="$899"
                        period="/mo"
                        highlight={true}
                        features={['5 User Licenses', 'Advanced Analytics Dashboard', 'Custom Scenarios Editor', 'Priority Support', 'API Access']}
                    />
                    <PricingCard
                        title="Enterprise"
                        price="Custom"
                        period=""
                        features={['Unlimited Licenses', 'On-Premise Deployment', 'Custom Hardware Integration', '24/7 SLA Support']}
                    />
                </div>
            </div>
        </section>
    )
}

const FAQSection = () => {
    return (
        <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
            <div className="container" style={{ maxWidth: '800px' }}>
                <h2 className="section-title">FAQ</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <FAQItem q="Do I need a specific EEG headset?" a="We support Muse, Emotiv, and OpenBCI headsets out of the box." />
                    <FAQItem q="Is the data private?" a="Yes, all data is locally processed by default. Cloud storage is opt-in and end-to-end encrypted." />
                    <FAQItem q="Can I export the data to CSV/MATLAB?" a="Absolutely. We provide full export capabilities in standard formats." />
                </div>
            </div>
        </section>
    )
}

const FooterSection = () => {
    return (
        <footer style={{ padding: '5rem 0 2rem', background: 'rgba(255, 255, 255, 0.6)', borderTop: '1px solid rgba(37, 99, 235, 0.1)', backdropFilter: 'blur(10px)' }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.35rem', background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-neon))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '1rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Fumorive</h2>
                        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '300px', lineHeight: 1.7, fontSize: '0.95rem' }}>
                            Future of Mobility & Driver Research
                        </p>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem' }}>
                            <Github size={20} color="var(--color-text-secondary)" style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} />
                            <Linkedin size={20} color="var(--color-text-secondary)" style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} />
                            <Mail size={20} color="var(--color-text-secondary)" style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '3rem', flexWrap: 'wrap' }}>
                        <div>
                            <h4 style={{ marginBottom: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Product</h4>
                            <ul style={{ listStyle: 'none', padding: 0, color: 'var(--color-text-secondary)', lineHeight: '2', fontSize: '0.95rem' }}>
                                <li style={{ cursor: 'pointer', transition: 'color 0.3s ease' }}>Features</li>
                                <li style={{ cursor: 'pointer', transition: 'color 0.3s ease' }}>Integration</li>
                                <li style={{ cursor: 'pointer', transition: 'color 0.3s ease' }}>Pricing</li>
                            </ul>
                        </div>
                        <div>
                            <h4 style={{ marginBottom: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Resources</h4>
                            <ul style={{ listStyle: 'none', padding: 0, color: 'var(--color-text-secondary)', lineHeight: '2', fontSize: '0.95rem' }}>
                                <li style={{ cursor: 'pointer', transition: 'color 0.3s ease' }}>Documentation</li>
                                <li style={{ cursor: 'pointer', transition: 'color 0.3s ease' }}>API Reference</li>
                                <li style={{ cursor: 'pointer', transition: 'color 0.3s ease' }}>Blog</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(37, 99, 235, 0.1)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    &copy; 2026 Fumorive Inc. All rights reserved.
                </div>
            </div>
        </footer>
    )
}

// Helpers
const FeatureCard = ({ icon, title, description, delay = 0 }: any) => (
    <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
    >
        <div style={{ marginBottom: '1rem' }}>{icon}</div>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</h3>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>{description}</p>
    </motion.div>
)

const Step = ({ number, title, desc, delay = 0 }: any) => (
    <motion.div
        style={{ textAlign: 'center', maxWidth: '250px', padding: '1rem' }}
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
    >
        <div style={{
            width: '60px', height: '60px', borderRadius: '50%', background: 'white',
            color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 'bold', margin: '0 auto 1.5rem',
            boxShadow: 'var(--glass-shadow)'
        }}>
            {number}
        </div>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
    </motion.div>
)

const PricingCard = ({ title, price, period, features, highlight }: any) => (
    <motion.div
        className="card"
        style={{
            border: highlight ? '2px solid var(--color-accent-blue)' : '1px solid rgba(37, 99, 235, 0.08)',
            transform: highlight ? 'scale(1.05)' : 'scale(1)',
            position: 'relative'
        }}
        whileHover={{ transform: highlight ? 'scale(1.08)' : 'translateY(-10px)' }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
    >
        {highlight && <div style={{
            position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-neon))',
            color: 'white',
            padding: '4px 16px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            letterSpacing: '0.5px'
        }}>POPULAR</div>}
        <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</h3>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem', color: highlight ? 'var(--color-accent-blue)' : 'var(--color-text-primary)' }}>
            {price}<span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{period}</span>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {features.map((f: string, i: number) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                    <CheckCircle size={18} color="var(--color-accent-neon)" /> {f}
                </li>
            ))}
        </ul>
        <button className={`btn ${highlight ? 'btn-solid' : 'btn-primary'}`} style={{ width: '100%', marginTop: '2rem', fontWeight: 600 }}>
            Choose Plan
        </button>
    </motion.div>
)

const FAQItem = ({ q, a }: any) => (
    <details style={{ background: 'rgba(255, 255, 255, 0.75)', padding: '1.5rem', borderRadius: '12px', cursor: 'pointer', border: '1px solid rgba(37, 99, 235, 0.08)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', transition: 'all 0.3s ease' }}>
        <summary style={{ fontWeight: 600, fontSize: '1.05rem', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-primary)' }}>
            {q}
            <ChevronDown size={20} color="var(--color-text-secondary)" />
        </summary>
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>{a}</p>
    </details>
)

export default LandingPage;
