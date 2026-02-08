import { useState, useRef, useEffect } from 'react';
import { CameraOff, AlertTriangle, Eye, Zap, Minimize2, Maximize2, GripVertical } from 'lucide-react';
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
} from '../utils/faceUtils';
import { faceApi } from '../api/face';
import { sessionApi } from '../api/session';
import './CameraFatigueMonitor.css';

interface CameraFatigueMonitorProps {
    isEnabled: boolean;
    onToggle: () => void;
}

export function CameraFatigueMonitor({ isEnabled, onToggle }: CameraFatigueMonitorProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const faceMeshRef = useRef<FaceMesh | null>(null);
    const cameraRef = useRef<MediaPipeCamera | null>(null);

    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    // Real-time metrics
    const [eyesClosed, setEyesClosed] = useState(false);
    const [yawning, setYawning] = useState(false);
    const [perclos, setPERCLOS] = useState(0);
    const [fatigueScore, setFatigueScore] = useState(0);
    const [blinkRate, setBlinkRate] = useState(0);

    // Position state (default: top-left)
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

    // Alert tracking
    const lastAlertTime = useRef<number>(0);
    const alertCooldown = 10000;
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // Detection helpers
    const perclosCalc = useRef(new PERCLOSCalculator());
    const blinkDetector = useRef(new BlinkDetector());

    // Session ID
    const sessionId = useRef<string | null>(null);

    // Auto start/stop based on isEnabled
    useEffect(() => {
        if (isEnabled && !isActive) {
            startCamera();
        } else if (!isEnabled && isActive) {
            stopCamera();
        }

        return () => {
            if (isActive) {
                stopCamera();
            }
        };
    }, [isEnabled]);

    const startCamera = async () => {
        try {
            setError(null);

            // Try to create a new session (will fail silently if not authenticated)
            try {
                const session = await sessionApi.create({
                    session_name: `Game Session - Fatigue Detection - ${new Date().toLocaleString()}`,
                    device_type: 'MediaPipe Face Mesh'
                });
                sessionId.current = session.id;
                console.log('✅ Face Session created:', session.id);
            } catch (sessionError: any) {
                console.warn('⚠️ Session creation skipped (not authenticated):', sessionError.message);
                // Don't stop - we can still use face detection without backend session
                // setError('Failed to create session');
                // return;
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
                    video: { width: 320, height: 240 }
                });

                videoRef.current.srcObject = stream;
                await videoRef.current.play();

                cameraRef.current = new MediaPipeCamera(videoRef.current, {
                    onFrame: async () => {
                        if (faceMeshRef.current && videoRef.current) {
                            await faceMeshRef.current.send({ image: videoRef.current });
                        }
                    },
                    width: 320,
                    height: 240
                });

                cameraRef.current.start();
                setIsActive(true);
            }
        } catch (err: any) {
            console.error('Error starting camera:', err);
            setError('Camera error');
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
                console.log('✅ Face Session ended:', sessionId.current);
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
            setEyesClosed(currentEyesClosed);
            setYawning(currentYawning);
            setPERCLOS(currentPERCLOS);
            setFatigueScore(currentFatigue);
            setBlinkRate(currentBlinkRate);

            // Check for drowsiness alert
            checkDrowsinessAlert(currentFatigue, currentPERCLOS);

            // Send to backend (throttled - every 1 second)
            if (Math.random() < 0.033) {
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
        // Draw eyes (left and right)
        const leftEyeIndices = [33, 160, 158, 133, 153, 144, 33];
        const rightEyeIndices = [362, 385, 387, 263, 373, 380, 362];

        ctx.strokeStyle = eyesClosed ? '#ef4444' : '#10b981';
        ctx.lineWidth = 1.5;

        drawPath(ctx, landmarks, leftEyeIndices);
        drawPath(ctx, landmarks, rightEyeIndices);

        // Draw mouth
        const mouthIndices = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61];
        ctx.strokeStyle = yawning ? '#f59e0b' : '#3b82f6';
        ctx.lineWidth = 1;
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

    const checkDrowsinessAlert = (fatigue: number, perclosValue: number) => {
        const now = Date.now();

        if (now - lastAlertTime.current < alertCooldown) return;

        let shouldAlert = false;
        let message = '';

        if (fatigue >= 75) {
            shouldAlert = true;
            message = '⚠️ SANGAT MENGANTUK! Istirahat sekarang!';
        } else if (fatigue >= 50) {
            shouldAlert = true;
            message = '⚠️ Anda terlihat lelah!';
        } else if (perclosValue > 30) {
            shouldAlert = true;
            message = '👁️ Mata sering tertutup!';
        }

        if (shouldAlert) {
            setAlertMessage(message);
            setShowAlert(true);
            lastAlertTime.current = now;

            // Auto-hide alert after 3 seconds
            setTimeout(() => setShowAlert(false), 3000);
        }
    };

    const fatigueLevel = getFatigueLevel(fatigueScore);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDraggingRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            posX: position.x,
            posY: position.y,
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;

            const deltaX = e.clientX - dragStartRef.current.x;
            const deltaY = e.clientY - dragStartRef.current.y;

            setPosition({
                x: dragStartRef.current.posX + deltaX,
                y: dragStartRef.current.posY + deltaY,
            });
        };

        const handleMouseUp = () => {
            isDraggingRef.current = false;
        };

        if (isDraggingRef.current) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [position]);

    if (!isEnabled) {
        return (
            <div className="camera-monitor-disabled" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
                <button className="camera-toggle-btn" onClick={onToggle} title="Enable Camera">
                    <CameraOff size={16} />
                </button>
            </div>
        );
    }

    return (
        <div 
            className="camera-fatigue-monitor"
            style={{ 
                left: `${position.x}px`, 
                top: `${position.y}px`,
                width: isMinimized ? '200px' : '240px',
            }}
        >
            {/* Drag Handle & Header */}
            <div 
                className="monitor-header"
                onMouseDown={handleMouseDown}
                style={{ cursor: 'grab' }}
            >
                <div className="monitor-title">
                    <GripVertical size={14} className="grip-icon" />
                    <span>Camera Monitor</span>
                </div>
                <div className="monitor-controls">
                    <button
                        className="header-btn"
                        onClick={() => setIsMinimized(!isMinimized)}
                        title={isMinimized ? 'Expand' : 'Minimize'}
                    >
                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                    <button
                        className="header-btn close-btn"
                        onClick={onToggle}
                        title="Close Camera"
                    >
                        <CameraOff size={14} />
                    </button>
                </div>
            </div>

            {/* Content - Hidden when minimized */}
            {!isMinimized && (
                <>
                    {/* Camera feed */}
                    <div className="monitor-camera-container">
                        <video
                            ref={videoRef}
                            className="monitor-video-feed"
                        />
                        <canvas
                            ref={canvasRef}
                            width={320}
                            height={240}
                            className="monitor-canvas-overlay"
                        />

                        {!isActive && (
                            <div className="monitor-camera-placeholder">
                                <CameraOff size={20} />
                            </div>
                        )}

                        {error && (
                            <div className="monitor-error">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Fatigue Indicator */}
                    <div className="monitor-fatigue-indicator" style={{ borderColor: fatigueLevel.color }}>
                        <div className="fatigue-score" style={{ color: fatigueLevel.color }}>
                            {Math.round(fatigueScore)}
                        </div>
                        <div className="fatigue-level-text">{fatigueLevel.level}</div>
                    </div>

                    {/* Quick Stats */}
                    <div className="monitor-stats">
                        <div className="stat-item">
                            <Eye size={12} />
                            <span className="stat-value">{Math.round(blinkRate)}</span>
                            <span className="stat-label">blinks/min</span>
                        </div>
                        <div className="stat-item">
                            <Zap size={12} />
                            <span className="stat-value">{Math.round(perclos)}%</span>
                            <span className="stat-label">PERCLOS</span>
                        </div>
                    </div>

                    {/* Alert */}
                    {showAlert && (
                        <div className="monitor-alert" style={{ borderColor: fatigueLevel.color }}>
                            <AlertTriangle size={14} />
                            <span>{alertMessage}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
