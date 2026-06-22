import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Gamepad2, Play, CheckCircle, TriangleAlert, Mail, Github, Linkedin, Database, Wifi, ChevronDown, Eye, Brain, Activity, ArrowRight } from 'lucide-react';
import './LandingPage.css';
import fumoLogo from '../../assets/fumo.png';
import heroBg from '../../assets/hero.jpg';
import card6 from '../../assets/card3.jpg';
import card5 from '../../assets/face.jpg';
import card4 from '../../assets/muse.png';
import card3 from '../../assets/card3.jpg';
import card2 from '../../assets/card2.jpg';
import card1 from '../../assets/card.jpg';
import img1 from '../../assets/img1.jpg';
import img2 from '../../assets/img2.jpg';
import img3 from '../../assets/img3.jpg';
import img4 from '../../assets/img4.jpg';
import img5 from '../../assets/img5.jpg';
import img6 from '../../assets/img6.jpg';
import lg1 from '../../assets/lg1.png';
import lg2 from '../../assets/lg2.png';
import lg3 from '../../assets/lg3.jpeg';
import lg4 from '../../assets/lg4.jpeg';
import demoVideo from '../../assets/0219.mp4';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    return (
        <div className="landing-container">
            <Navbar />
            <HeroSection />
            <ProblemSection />
            <FeaturesShowcaseSection />
            <SolutionSection />
            <DemoSection />
            <PartnersSection />
            <CTASection />
            {/* <FeaturesSection /> */}
            {/* <ValidationSection />
            <FAQSection /> */}
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
                    style={{ cursor: 'pointer' }}
                >
                    <img
                        src={fumoLogo}
                        alt="Fumorive Logo"
                        style={{
                            height: '20px',
                            width: 'auto',
                            objectFit: 'contain'
                        }}
                    />
                </div>

                <div className="navbar-links">
                    <a className="nav-link" onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>Beranda</a>
                    <a className="nav-link" onClick={() => document.getElementById('fitur')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>Fitur</a>
                    <a className="nav-link" onClick={() => document.getElementById('cara-kerja')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>Cara Kerja</a>
                    <a className="nav-link" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>Demo</a>
                </div>

                <button
                    className="btn btn-solid navbar-btn"
                    onClick={() => navigate('/login')}
                >
                    Mulai Sekarang
                </button>
            </div>
        </nav>
    )
}

const HeroSection = () => {
    const navigate = useNavigate();
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
                    <h2>Simulasi Berkendara yang<br />Menghadirkan Analisa <br /> Tingkat <span style={{ color: 'var(--color-accent-blue)' }}>Kelelahan</span></h2>
                    <p style={{ fontSize: '17px' }}>
                        Teknologi ergonomis untuk mendeteksi kelelahan dini bagi pengemudi<br />ketika berkendara dalam waktu lama.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <motion.button
                            onClick={() => navigate('/login')}
                            className="btn btn-solid"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Mulai Sekarang
                        </motion.button>
                        <motion.button
                            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                            className="btn btn-primary"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Lihat Demo
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};



const PartnersSection = () => {
    const logoImages = [
        { src: lg2,      height: '60px' },  // ← ubah ukuran lg1 di sini
        { src: lg1,      height: '70px' },  // ← ubah ukuran lg2 di sini
        { src: lg4,      height: '70px' },  // ← ubah ukuran lg3 di sini
        { src: lg3,      height: '90px' },  // ← ubah ukuran fumo di sini
    ];
    // Duplicate for infinite scroll
    const logos = [...logoImages, ...logoImages, ...logoImages];

    return (
        <section className="partners-section">
            <div className="container" style={{ maxWidth: '100%' }}>
                <p style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Mitra Kami</p>
                <div className="partners-slider">
                    <div className="partners-track">
                        {logos.map((logo, index) => (
                            <div key={index} className="partner-logo-item">
                                <img
                                    src={logo.src}
                                    alt={`partner-${index}`}
                                    style={{ height: logo.height, width: 'auto', objectFit: 'contain', opacity: 0.75 }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

const ProblemSection = () => {
    const [activeCard, setActiveCard] = useState(0);

    const features = [
        {
            icon: <Eye size={60} color="#ffffff" />,
            title: "Mendeteksi Kelelahan Lebih Awal",
            description: "Dilengkapi dengan notifikasi popup dan suara yang memberikan informasi terkait kelelahan yang dialami",
            image: card1,
        },
        {
            icon: <Gamepad2 size={60} color="#ffffff" />,
            title: "Simulasi Berkendara dengan Game",
            description: "Simulasi bermain game untuk mengukur tingkat kelelahan pengemudi",
            image: card2,
        },
        {
            icon: <TriangleAlert size={60} color="#ffffff" />,
            title: "Mengurangi Risiko Kecelakaan",
            description: "Mengurangi risiko kecelakaan dengan mencegah pengendara yang lelah untuk berkendara",
            image: card3,
        },
    ];

    return (
        <section id="kenapa" className="section problem-section">
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    style={{ marginBottom: '3rem' }}
                >
                    <h2 className="section-title">Kenapa Fumorive?</h2>
                    <p className="section-subtitle">Fumorive hadir dalam mendeteksi kelelahan dini khususnya bagi pengendara jarak jauh dan dengan intensitas berat</p>
                </motion.div>

                <div className="expandable-cards-container">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            className={`expandable-card ${activeCard === index ? 'active' : ''}`}
                            onClick={() => setActiveCard(index)}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            style={{
                                backgroundImage: `url(${feature.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                position: 'relative'
                            }}
                        >
                            {/* Dark overlay */}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.6)',
                                borderRadius: '24px',
                                zIndex: 1
                            }}></div>

                            {/* Content */}
                            <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {activeCard === index ? (
                                    <motion.div
                                        className="card-content-expanded"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3, delay: 0.2 }}
                                    >
                                        <div className="card-expanded-text">
                                            <h3>{feature.title}</h3>
                                            <p>{feature.description}</p>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="card-content-collapsed">
                                        <div className="card-icon">
                                            {feature.icon}
                                        </div>
                                        <h4>{feature.title}</h4>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const FeaturesShowcaseSection = () => {
    const features = [
        {
            title: "Pemantauan EEG Real-Time",
            description: "Headband Muse2 merekam aktivitas otak secara real-time. Pantau gelombang Alpha, Beta, Theta, dan Delta untuk mendeteksi kantuk sebelum menjadi berbahaya.",
            image: card4,
            highlights: ["4 Jenis Gelombang Otak", "Latensi di Bawah 1 Detik", "Akurasi Klinis"]
        },
        {
            title: "Deteksi Computer Vision",
            description: "AI canggih melacak penutupan mata (PERCLOS), frekuensi kedipan, menguap, dan posisi kepala. Penggabungan multimodal antara data visual dan EEG menghasilkan akurasi 98%.",
            image: card5,
            highlights: ["Rasio Aspek Mata", "Analisis Posisi Kepala", "Deteksi Menguap"]
        },
        {
            title: "Sistem Peringatan Cerdas",
            description: "Sistem peringatan bertingkat memicu alert audio dan visual berdasarkan tingkat kelelahan. Dapatkan notifikasi sebelum microsleep terjadi, bukan sesudahnya.",
            image: card6,
            highlights: ["3 Tingkat Peringatan", "Peringatan Audio", "Metrik Dashboard"]
        }
    ];

    return (
        <section id="fitur" className="section features-showcase-section">
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    style={{ textAlign: 'center', marginBottom: '4rem' }}
                >
                    <h2 className="section-title">Fitur Unggulan</h2>
                    <p className="section-subtitle">
                        Menggabungkan teknologi mutakhir untuk menjaga keselamatan pengemudi di jalan
                    </p>
                </motion.div>

                {features.map((feature, index) => (
                    <motion.div
                        key={index}
                        className={`feature-showcase-item ${index % 2 === 0 ? 'layout-left' : 'layout-right'}`}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: index * 0.2 }}
                    >
                        <div className="feature-image-card" style={{
                            backgroundImage: `url(${feature.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}>
                        </div>

                        <div className="feature-content-card">
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>

                            <div className="feature-highlights">
                                {feature.highlights.map((highlight, idx) => (
                                    <div key={idx} className="highlight-item">
                                        <CheckCircle size={18} color="#10b981" />
                                        <span>{highlight}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

const SolutionSection = () => {
    return (
        <section id="cara-kerja" className="section" style={{ background: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    style={{ textAlign: 'center', marginBottom: '5rem' }}
                >
                    <h2 className="section-title">Cara Kerjanya</h2>
                    <p className="section-subtitle">Bagaimana sistem Fumorive bekerja di balik layar</p>
                </motion.div>

                <div style={{ position: 'relative' }}>
                    {/* Connecting Line (Desktop) */}
                    <div className="solution-line" style={{
                        position: 'absolute',
                        top: '90px',
                        left: '10%',
                        right: '10%',
                        height: '2px',
                        background: 'var(--color-accent-blue)',
                        zIndex: 0,
                        opacity: 0.3
                    }}></div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '3rem',
                        position: 'relative',
                        zIndex: 1
                    }}>
                        <SolutionStep
                            number="01"
                            title="Hubungkan & Kalibrasi"
                            desc="Sambungkan headset EEG kamu via Bluetooth. Sistem kami akan otomatis mengkalibrasi aktivitas otak dasar kamu dalam kurang dari 30 detik."
                            icon={<Wifi size={28} color="white" />}
                            delay={0.1}
                        />
                        <SolutionStep
                            number="02"
                            title="Simulasi Berkendara"
                            desc="Masuki lingkungan simulasi berkendara berkualitas tinggi. Kami merekam telemetri tingkat milidetik yang disinkronkan dengan data neurologis kamu."
                            icon={<Gamepad2 size={28} color="white" />}
                            delay={0.3}
                        />
                        <SolutionStep
                            number="03"
                            title="Analisis & Tingkatkan"
                            desc="Dapatkan umpan balik langsung mengenai tingkat kelelahan. Tinjau ulang sesi dengan peta panas perhatian dan waktu reaksi yang ditampilkan."
                            icon={<Activity size={28} color="white" />}
                            delay={0.5}
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}

const DemoSection = () => {
    // Ganti dengan URL embed YouTube: "https://www.youtube.com/embed/VIDEO_ID"
    // Kosongkan string ("") untuk menampilkan placeholder
    const videoEmbedUrl = ""; // YouTube embed URL (kosongkan untuk pakai video lokal)
    const localVideo = demoVideo; // video lokal .mp4

    const galleryItems = [img1, img2, img3, img4, img5, img6];

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => setLightboxOpen(false);

    const prevImage = () => setLightboxIndex(i => (i - 1 + galleryItems.length) % galleryItems.length);
    const nextImage = () => setLightboxIndex(i => (i + 1) % galleryItems.length);

    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) closeLightbox();
    };

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (!lightboxOpen) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'ArrowRight') nextImage();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [lightboxOpen]);

    return (
        <section id="demo" className="section">
            <div className="container" style={{ textAlign: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="section-title">Dokumentasi Demo</h2>

                    {/* Main Video Area */}
                    <div style={{
                        marginTop: '3rem',
                        width: '100%',
                        aspectRatio: '16 / 9',
                        background: '#0f172a',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(37, 99, 235, 0.15)'
                    }}>
                        {videoEmbedUrl ? (
                            <iframe
                                src={videoEmbedUrl}
                                title="Demo Video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '20px'
                                }}
                            />
                        ) : localVideo ? (
                            <video
                                src={localVideo}
                                autoPlay
                                loop
                                muted
                                playsInline
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '20px',
                                    objectFit: 'contain',
                                    background: '#0f172a'
                                }}
                            />
                        ) : (
                            <>
                                <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'linear-gradient(45deg, #0f172a, #1e293b)' }}></div>
                                <Play size={80} fill="white" style={{ position: 'relative', cursor: 'pointer', zIndex: 10, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))', transition: 'transform 0.3s ease' }} />
                                <p style={{ position: 'absolute', bottom: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>Pratinjau Overlay EEG Langsung</p>
                            </>
                        )}
                    </div>

                    {/* Gallery Thumbnails — 2 rows x 3 cols */}
                    <div style={{
                        marginTop: '2rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '1.5rem'
                    }}>
                        {galleryItems.map((imgSrc, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 + (index * 0.08), duration: 0.5 }}
                                whileHover={{ scale: 1.03 }}
                                onClick={() => openLightbox(index)}
                                style={{
                                    height: '160px',
                                    borderRadius: '16px',
                                    backgroundImage: `url(${imgSrc})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.12)'
                                }}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <div
                    onClick={handleBackdropClick}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.88)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '24px',
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            color: 'white',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(8px)'
                        }}
                    >✕</button>

                    {/* Prev button */}
                    <button
                        onClick={prevImage}
                        style={{
                            position: 'absolute',
                            left: '20px',
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '50px',
                            height: '50px',
                            color: 'white',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(8px)'
                        }}
                    >‹</button>

                    {/* Image */}
                    <motion.img
                        key={lightboxIndex}
                        src={galleryItems[lightboxIndex]}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '85vh',
                            borderRadius: '16px',
                            objectFit: 'contain',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.5)'
                        }}
                    />

                    {/* Next button */}
                    <button
                        onClick={nextImage}
                        style={{
                            position: 'absolute',
                            right: '20px',
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '50px',
                            height: '50px',
                            color: 'white',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(8px)'
                        }}
                    >›</button>

                    {/* Dot indicators */}
                    <div style={{ position: 'absolute', bottom: '20px', display: 'flex', gap: '8px' }}>
                        {galleryItems.map((_, i) => (
                            <div
                                key={i}
                                onClick={() => setLightboxIndex(i)}
                                style={{
                                    width: i === lightboxIndex ? '24px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: i === lightboxIndex ? 'white' : 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}

const CTASection = () => {
    const navigate = useNavigate();
    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{
                padding: '4rem 0',
                background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-neon))',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                textAlign: 'center'
            }}
        >
            <div className="container" style={{ position: 'relative', zIndex: 2 }}>
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                        Siap Merevolusi<br />Keselamatan Pengemudi?
                    </h2>
                    <p style={{ fontSize: '1rem', maxWidth: '600px', margin: '0 auto 2rem', opacity: 0.95, lineHeight: 1.6, fontWeight: 400 }}>
                        Bergabunglah dengan lembaga penelitian dan operator armada terkemuka yang sudah menggunakan Fumorive untuk menyelamatkan nyawa.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn"
                        style={{
                            background: 'white',
                            color: 'var(--color-accent-blue)',
                            padding: '14px 35px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            border: 'none',
                            borderRadius: '50px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                            cursor: 'pointer'
                        }}
                    >
                        Mulai Uji Coba
                    </button>
                </motion.div>
            </div>

            {/* Decorative Background Elements */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-10%',
                width: '600px',
                height: '600px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '50%',
            }}></div>
            <div style={{
                position: 'absolute',
                bottom: '-50%',
                right: '-10%',
                width: '500px',
                height: '500px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '50%',
            }}></div>
        </motion.section>
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
        <footer style={{ padding: '2rem 0', background: 'rgba(255, 255, 255, 0.6)', borderTop: '1px solid rgba(37, 99, 235, 0.1)', backdropFilter: 'blur(10px)' }}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                {/* Logo */}
                <div>
                    <img
                        src={fumoLogo}
                        alt="Fumorive Logo"
                        style={{
                            height: '20px',
                            width: 'auto',
                            objectFit: 'contain'
                        }}
                    />
                </div>

                {/* Copyright */}
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                    &copy; 2026 Fumorive Inc. Hak cipta dilindungi.
                </div>

                {/* Socials */}
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <Github size={20} color="var(--color-text-secondary)" style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} />
                    <Linkedin size={20} color="var(--color-text-secondary)" style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} />
                    <Mail size={20} color="var(--color-text-secondary)" style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} />
                </div>
            </div>
        </footer>
    )
}

// Helpers
const SolutionStep = ({ number, title, desc, icon, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        style={{
            background: 'white',
            borderRadius: '24px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.05)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100%'
        }}
        whileHover={{
            y: -10,
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
        }}
    >
        <div style={{
            width: '100px',
            height: '100px',
            background: 'var(--color-accent-blue)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.3)',
            position: 'relative',
            flexShrink: 0
        }}>
            {icon}
            <div style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: 'white',
                color: 'var(--color-accent-blue)',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: '800',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
                {number}
            </div>
        </div>

        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>{title}</h3>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>{desc}</p>
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
