import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Camera,
    CameraOff,
    Activity,
    Eye,
    Smile,
    Brain,
    ArrowLeft,
    AlertCircle,
    AlertTriangle,
    X
} from 'lucide-react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
import {
    calculateEAR,
    calculateMAR,
    areEyesClosed,
    isYawning,
    calculateHeadPose,
    PERCLOSCalculator,
    BlinkDetector,
    calculateFatigueScore,
    getFatigueLevel
} from '../../utils/faceUtils';
import { faceApi } from '../../api/face';
import { sessionApi } from '../../api/session';
import './FaceRecognition.css';

const FaceRecognition = () => {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const faceMeshRef = useRef<FaceMesh | null>(null);
    const cameraRef = useRef<MediaPipeCamera | null>(null);

    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // Real-time metrics
    const [ear, setEar] = useState<number>(0);
    const [mar, setMar] = useState<number>(0);
    const [eyesClosed, setEyesClosed] = useState(false);
    const [yawning, setYawning] = useState(false);
    const [perclos, setPERCLOS] = useState(0);
    const [fatigueScore, setFatigueScore] = useState(0);
    const [blinkCount, setBlinkCount] = useState(0);
    const [blinkRate, setBlinkRate] = useState(0);

    // Alert tracking
    const lastAlertTime = useRef<number>(0);
    const alertCooldown = 10000; // 10 seconds cooldown between alerts

    // Detection helpers
    const perclosCalc = useRef(new PERCLOSCalculator());
    const blinkDetector = useRef(new BlinkDetector());

    // Session ID - will be set when session is created
    const sessionId = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            setError(null);

            // Create a new session
            try {
                const session = await sessionApi.create({
                    session_name: `Face Recognition - ${new Date().toLocaleString()}`,
                    device_type: 'MediaPipe Face Mesh'
                });
                sessionId.current = session.id;
                console.log('✅ Session created:', session.id);
            } catch (sessionError: any) {
                console.error('Failed to create session:', sessionError);
                setError('Failed to create session. Please make sure you are logged in.');
                return; // Don't start camera if session creation fails
            }

            // Initialize MediaPipe Face Mesh
            faceMeshRef.current = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            faceMeshRef.current.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            faceMeshRef.current.onResults(onResults);

            // Start camera
            if (videoRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 }
                });

                videoRef.current.srcObject = stream;
                await videoRef.current.play();

                cameraRef.current = new MediaPipeCamera(videoRef.current, {
                    onFrame: async () => {
                        if (faceMeshRef.current && videoRef.current) {
                            await faceMeshRef.current.send({ image: videoRef.current });
                        }
                    },
                    width: 640,
                    height: 480
                });

                cameraRef.current.start();
                setIsActive(true);
            }
        } catch (err: any) {
            console.error('Error starting camera:', err);
            setError(err.message || 'Failed to access camera. Please check permissions.');
        }
    };

    const stopCamera = async () => {
        if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
        }

        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }

        if (faceMeshRef.current) {
            faceMeshRef.current.close();
            faceMeshRef.current = null;
        }

        setIsActive(false);

        // End session if exists
        if (sessionId.current) {
            try {
                await sessionApi.end(sessionId.current);
                console.log('✅ Session ended:', sessionId.current);
            } catch (err) {
                console.error('Failed to end session:', err);
            }
        }

        // Reset detectors
        perclosCalc.current.reset();
        blinkDetector.current.reset();
    };

    const onResults = async (results: any) => {
        if (!canvasRef.current || !results.multiFaceLandmarks) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            // Draw face mesh
            drawFaceMesh(ctx, landmarks);

            // Calculate metrics
            const currentEAR = calculateEAR(landmarks);
            const currentMAR = calculateMAR(landmarks);
            const currentEyesClosed = areEyesClosed(currentEAR);
            const currentYawning = isYawning(currentMAR);
            const headPose = calculateHeadPose(landmarks);

            // Update PERCLOS
            perclosCalc.current.addMeasurement(currentEyesClosed);
            const currentPERCLOS = perclosCalc.current.getPERCLOS();

            // Detect blink
            blinkDetector.current.detectBlink(currentEyesClosed);
            const currentBlinkCount = blinkDetector.current.getBlinkCount();
            const currentBlinkRate = blinkDetector.current.getBlinkRate();

            // Calculate fatigue
            const currentFatigue = calculateFatigueScore(
                currentEAR,
                currentPERCLOS,
                currentBlinkRate,
                currentYawning
            );

            // Update state
            setEar(currentEAR);
            setMar(currentMAR);
            setEyesClosed(currentEyesClosed);
            setYawning(currentYawning);
            setPERCLOS(currentPERCLOS);
            setFatigueScore(currentFatigue);
            setBlinkCount(currentBlinkCount);
            setBlinkRate(currentBlinkRate);

            // Check for drowsiness and show alert
            checkDrowsinessAlert(currentFatigue, currentPERCLOS, currentEAR);

            // Send to backend (throttled - every 1 second)
            if (Math.random() < 0.033) { // ~1/30 = 3.3% at 30 FPS = once per second
                // Only log if session exists
                if (sessionId.current) {
                    try {
                        await faceApi.logEvent({
                            session_id: sessionId.current,
                            timestamp: new Date().toISOString(),
                            eye_aspect_ratio: currentEAR,
                            mouth_aspect_ratio: currentMAR,
                            eyes_closed: currentEyesClosed,
                            yawning: currentYawning,
                            blink_count: currentBlinkCount,
                            blink_rate: currentBlinkRate,
                            head_yaw: headPose.yaw,
                            head_pitch: headPose.pitch,
                            head_roll: headPose.roll,
                            face_fatigue_score: currentFatigue
                        });
                    } catch (err) {
                        console.error('Failed to send face data:', err);
                    }
                }
            }
        }
    };

    const drawFaceMesh = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
        // Draw face contour
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;

        // Draw landmarks
        landmarks.forEach((landmark: any) => {
            const x = landmark.x * ctx.canvas.width;
            const y = landmark.y * ctx.canvas.height;

            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw eyes (left and right)
        const leftEyeIndices = [33, 160, 158, 133, 153, 144, 33];
        const rightEyeIndices = [362, 385, 387, 263, 373, 380, 362];

        ctx.strokeStyle = eyesClosed ? '#ef4444' : '#10b981';
        ctx.lineWidth = 2;

        drawPath(ctx, landmarks, leftEyeIndices);
        drawPath(ctx, landmarks, rightEyeIndices);

        // Draw mouth
        const mouthIndices = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61];
        ctx.strokeStyle = yawning ? '#f59e0b' : '#3b82f6';
        drawPath(ctx, landmarks, mouthIndices);
    };

    const drawPath = (ctx: CanvasRenderingContext2D, landmarks: any[], indices: number[]) => {
        ctx.beginPath();
        indices.forEach((idx, i) => {
            const x = landmarks[idx].x * ctx.canvas.width;
            const y = landmarks[idx].y * ctx.canvas.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    };

    const checkDrowsinessAlert = (fatigue: number, perclosValue: number, earValue: number) => {
        const now = Date.now();

        // Only show alert if cooldown has passed
        if (now - lastAlertTime.current < alertCooldown) return;

        let shouldAlert = false;
        let message = '';

        if (fatigue >= 75) {
            shouldAlert = true;
            message = '⚠️ PERINGATAN! Anda sangat mengantuk! Segera istirahat!';
        } else if (fatigue >= 50) {
            shouldAlert = true;
            message = '⚠️ PERHATIAN! Anda terlihat lelah. Pertimbangkan untuk istirahat.';
        } else if (perclosValue > 30) {
            shouldAlert = true;
            message = '👁️ Mata Anda sering tertutup. Mohon tetap waspada!';
        } else if (earValue < 0.15 && perclosValue > 20) {
            shouldAlert = true;
            message = '😴 Terdeteksi tanda-tanda mengantuk. Jaga konsentrasi!';
        }

        if (shouldAlert) {
            setAlertMessage(message);
            setShowAlert(true);
            lastAlertTime.current = now;

            // Play alert sound (optional)
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAo=');
                audio.volume = 0.3;
                audio.play().catch(() => { }); // Ignore if audio fails
            } catch (e) {
                // Ignore audio errors
            }
        }
    };

    const fatigueLevel = getFatigueLevel(fatigueScore);

    return (
        <div className="face-recognition-page">
            <div className="face-header">
                <button className="back-button" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </button>
                <h1>Face Recognition - Fatigue Detection</h1>
                <p>Test kamera dan deteksi kelelahan real-time</p>
            </div>

            <div className="face-content">
                {/* Camera View */}
                <div className="camera-section">
                    <div className="camera-container">
                        <video
                            ref={videoRef}
                            className="video-feed"
                        />
                        <canvas
                            ref={canvasRef}
                            width={640}
                            height={480}
                            className="canvas-overlay"
                        />

                        {!isActive && (
                            <div className="camera-placeholder">
                                <CameraOff size={64} />
                                <p>Camera inactive</p>
                            </div>
                        )}

                        {error && (
                            <div className="error-overlay">
                                <AlertCircle size={32} />
                                <p>{error}</p>
                            </div>
                        )}
                    </div>

                    <div className="camera-controls">
                        {!isActive ? (
                            <button className="btn-start" onClick={startCamera}>
                                <Camera size={20} />
                                Start Camera
                            </button>
                        ) : (
                            <button className="btn-stop" onClick={stopCamera}>
                                <CameraOff size={20} />
                                Stop Camera
                            </button>
                        )}
                    </div>
                </div>

                {/* Metrics Panel */}
                <div className="metrics-panel">
                    <div className="fatigue-display">
                        <div className="fatigue-circle" style={{ borderColor: fatigueLevel.color }}>
                            <span className="fatigue-score" style={{ color: fatigueLevel.color }}>
                                {fatigueScore}
                            </span>
                            <span className="fatigue-label">{fatigueLevel.level}</span>
                        </div>
                    </div>

                    <div className="metrics-grid">
                        <div className="metric-card">
                            <div className="metric-icon" style={{ background: '#dbeafe' }}>
                                <Eye size={20} color="#3b82f6" />
                            </div>
                            <div className="metric-info">
                                <span className="metric-label">Eye Aspect Ratio</span>
                                <span className="metric-value">{ear.toFixed(3)}</span>
                                <span className="metric-status" style={{ color: eyesClosed ? '#ef4444' : '#10b981' }}>
                                    {eyesClosed ? 'Eyes Closed' : 'Eyes Open'}
                                </span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon" style={{ background: '#fef3c7' }}>
                                <Smile size={20} color="#f59e0b" />
                            </div>
                            <div className="metric-info">
                                <span className="metric-label">Mouth Aspect Ratio</span>
                                <span className="metric-value">{mar.toFixed(3)}</span>
                                <span className="metric-status" style={{ color: yawning ? '#f59e0b' : '#10b981' }}>
                                    {yawning ? 'Yawning' : 'Normal'}
                                </span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon" style={{ background: '#dcfce7' }}>
                                <Activity size={20} color="#10b981" />
                            </div>
                            <div className="metric-info">
                                <span className="metric-label">Blink Detection</span>
                                <span className="metric-value">{blinkCount} blinks</span>
                                <span className="metric-status">{blinkRate.toFixed(1)} bpm</span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon" style={{ background: '#fee2e2' }}>
                                <Brain size={20} color="#ef4444" />
                            </div>
                            <div className="metric-info">
                                <span className="metric-label">PERCLOS</span>
                                <span className="metric-value">{perclos.toFixed(1)}%</span>
                                <span className="metric-status">
                                    {perclos > 20 ? 'Drowsy' : 'Alert'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="info-box">
                        <AlertCircle size={16} />
                        <p>
                            <strong>Session Status:</strong> {sessionId.current ?
                                `Active - ID: ${sessionId.current}` :
                                'No active session - Click Start Camera to begin'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Drowsiness Alert Modal */}
            {showAlert && (
                <div className="alert-overlay" onClick={() => setShowAlert(false)}>
                    <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="alert-icon">
                            <AlertTriangle size={48} color="#ef4444" />
                        </div>
                        <h2 className="alert-title">Peringatan Kelelahan</h2>
                        <p className="alert-message">{alertMessage}</p>
                        <div className="alert-actions">
                            <button className="alert-btn-primary" onClick={() => setShowAlert(false)}>
                                Saya Mengerti
                            </button>
                            <button className="alert-btn-secondary" onClick={() => {
                                setShowAlert(false);
                                stopCamera();
                            }}>
                                <X size={16} />
                                Hentikan Kamera
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaceRecognition;

