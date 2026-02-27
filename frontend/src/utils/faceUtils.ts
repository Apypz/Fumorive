/**
 * Face Detection Utility Functions
 * Calculate EAR, MAR, Fatigue Score, dan metrics lainnya
 */

export interface FaceLandmarks {
    x: number;
    y: number;
    z?: number;
}

/**
 * Calculate Eye Aspect Ratio (EAR)
 * EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
 * 
 * Eye indices for MediaPipe Face Mesh:
 * Left Eye: 33, 160, 158, 133, 153, 144
 * Right Eye: 362, 385, 387, 263, 373, 380
 */
export function calculateEAR(landmarks: FaceLandmarks[]): number {
    // Left eye landmarks
    const leftEye = [33, 160, 158, 133, 153, 144].map(i => landmarks[i]);
    // Right eye landmarks
    const rightEye = [362, 385, 387, 263, 373, 380].map(i => landmarks[i]);

    const leftEAR = getEyeAspectRatio(leftEye);
    const rightEAR = getEyeAspectRatio(rightEye);

    return (leftEAR + rightEAR) / 2;
}

function getEyeAspectRatio(eye: FaceLandmarks[]): number {
    // Vertical distances
    const v1 = euclideanDistance(eye[1], eye[5]);
    const v2 = euclideanDistance(eye[2], eye[4]);
    
    // Horizontal distance
    const h = euclideanDistance(eye[0], eye[3]);
    
    return (v1 + v2) / (2 * h);
}

/**
 * Calculate Mouth Aspect Ratio (MAR)
 * Untuk detect yawning
 * 
 * Mouth landmarks: 61, 291, 0, 17, 78, 308
 */
export function calculateMAR(landmarks: FaceLandmarks[]): number {
    const mouth = [61, 291, 0, 17, 78, 308].map(i => landmarks[i]);
    
    // Vertical distance
    const v = euclideanDistance(mouth[2], mouth[3]);
    
    // Horizontal distance
    const h = euclideanDistance(mouth[0], mouth[1]);
    
    return v / h;
}

/**
 * Euclidean distance between two points
 */
function euclideanDistance(p1: FaceLandmarks, p2: FaceLandmarks): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Detect if eyes are closed based on EAR threshold
 */
export function areEyesClosed(ear: number, threshold: number = 0.2): boolean {
    return ear < threshold;
}

/**
 * Detect if person is yawning based on MAR threshold
 */
export function isYawning(mar: number, threshold: number = 0.6): boolean {
    return mar > threshold;
}

/**
 * Calculate head pose (yaw, pitch, roll)
 * Simplified version using face landmarks
 */
export function calculateHeadPose(landmarks: FaceLandmarks[]): {
    yaw: number;
    pitch: number;
    roll: number;
} {
    // Nose tip
    const nose = landmarks[1];
    
    // Left and right face landmarks
    const leftFace = landmarks[234];
    const rightFace = landmarks[454];
    
    // Calculate yaw (rotation around Y axis)
    const yaw = Math.atan2(rightFace.x - leftFace.x, rightFace.z || 0);
    
    // Calculate pitch (rotation around X axis)
    const forehead = landmarks[10];
    const chin = landmarks[152];
    const pitch = Math.atan2(chin.y - forehead.y, chin.z || 0);
    
    // Calculate roll (rotation around Z axis)
    const roll = Math.atan2(rightFace.y - leftFace.y, rightFace.x - leftFace.x);
    
    return { yaw, pitch, roll };
}

/**
 * Calculate PERCLOS (Percentage of Eye Closure)
 * percentage of time eyes are closed over a time window
 */
export class PERCLOSCalculator {
    private closureHistory: boolean[] = [];
    private maxHistory: number = 90; // 3 seconds at 30 FPS

    addMeasurement(eyesClosed: boolean) {
        this.closureHistory.push(eyesClosed);
        if (this.closureHistory.length > this.maxHistory) {
            this.closureHistory.shift();
        }
    }

    getPERCLOS(): number {
        if (this.closureHistory.length === 0) return 0;
        const closedCount = this.closureHistory.filter(c => c).length;
        return (closedCount / this.closureHistory.length) * 100;
    }

    reset() {
        this.closureHistory = [];
    }
}

/**
 * Blink Detection
 */
export class BlinkDetector {
    private wasEyeClosed: boolean = false;
    private blinkCount: number = 0;
    private startTime: number = Date.now();

    detectBlink(eyesClosed: boolean): boolean {
        let blinked = false;
        
        if (!this.wasEyeClosed && eyesClosed) {
            // Eye just closed
            this.wasEyeClosed = true;
        } else if (this.wasEyeClosed && !eyesClosed) {
            // Eye just opened - blink detected!
            this.blinkCount++;
            this.wasEyeClosed = false;
            blinked = true;
        }
        
        return blinked;
    }

    getBlinkRate(): number {
        const elapsedMinutes = (Date.now() - this.startTime) / 60000;
        return elapsedMinutes > 0 ? this.blinkCount / elapsedMinutes : 0;
    }

    getBlinkCount(): number {
        return this.blinkCount;
    }

    reset() {
        this.blinkCount = 0;
        this.wasEyeClosed = false;
        this.startTime = Date.now();
    }
}

/**
 * Calculate Fatigue Score (0-100)
 * Based on multiple factors: EAR, PERCLOS, blink rate, yawning
 */
export function calculateFatigueScore(
    ear: number,
    perclos: number,
    blinkRate: number,
    yawning: boolean
): number {
    let score = 0;

    // EAR contribution (0-25 points)
    // Normal EAR ~0.3, drowsy <0.25
    if (ear < 0.15) score += 25;
    else if (ear < 0.2) score += 20;
    else if (ear < 0.25) score += 10;

    // PERCLOS contribution (0-35 points)
    // PERCLOS > 20% indicates drowsiness
    score += Math.min(35, perclos * 1.75);

    // Blink rate contribution (0-20 points)
    // Normal: 15-20 blinks/min, drowsy: <10 or >30
    const normalBlinkRate = 17;
    const blinkDeviation = Math.abs(blinkRate - normalBlinkRate);
    score += Math.min(20, blinkDeviation);

    // Yawning contribution (0-20 points)
    if (yawning) score += 20;

    return Math.min(100, Math.round(score));
}

/**
 * Get fatigue level label
 */
export function getFatigueLevel(score: number): {
    level: 'Alert' | 'Tired' | 'Drowsy' | 'Very Drowsy';
    color: string;
} {
    if (score < 25) return { level: 'Alert', color: '#10b981' };
    if (score < 50) return { level: 'Tired', color: '#f59e0b' };
    if (score < 75) return { level: 'Drowsy', color: '#f97316' };
    return { level: 'Very Drowsy', color: '#ef4444' };
}


