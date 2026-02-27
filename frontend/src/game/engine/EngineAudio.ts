/**
 * Engine Audio Manager
 * ====================
 * Manages car engine sound effects including idle, acceleration, and deceleration.
 * Uses Web Audio API for seamless looping without gaps.
 * Uses configuration from audio.config.ts for all volume and pitch settings.
 */

import {
  AUDIO_PATHS,
  ENGINE_AUDIO_CONFIG,
  HORN_AUDIO_CONFIG,
  CRASH_AUDIO_CONFIG,
  AUDIO_BEHAVIOR,
} from '../config/audio.config'

export class EngineAudio {
  // Web Audio API components
  private audioContext: AudioContext | null = null
  private audioBuffer: AudioBuffer | null = null
  private startBuffer: AudioBuffer | null = null
  private hornBuffer: AudioBuffer | null = null
  private crashBuffer: AudioBuffer | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private hornSourceNode: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private startGainNode: GainNode | null = null
  private hornGainNode: GainNode | null = null
  private crashGainNode: GainNode | null = null
  
  // State
  private isPlaying: boolean = false
  private isHornPlaying: boolean = false
  private isLoaded: boolean = false
  private currentVolume: number = 0
  private currentPitch: number = 1
  private lastSpeed: number = 0
  private isAccelerating: boolean = false
  private lastCrashTime: number = 0

  constructor() {
    this.initAudio()
  }

  /**
   * Initialize Web Audio API context and load audio buffer
   */
  private async initAudio(): Promise<void> {
    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create gain node for engine loop
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = 0
      this.gainNode.connect(this.audioContext.destination)
      
      // Create gain node for engine start sound
      this.startGainNode = this.audioContext.createGain()
      this.startGainNode.gain.value = ENGINE_AUDIO_CONFIG.gainMultiplier
      this.startGainNode.connect(this.audioContext.destination)
      
      // Create gain node for horn
      this.hornGainNode = this.audioContext.createGain()
      this.hornGainNode.gain.value = 0
      this.hornGainNode.connect(this.audioContext.destination)
      
      // Create gain node for crash sound
      this.crashGainNode = this.audioContext.createGain()
      this.crashGainNode.gain.value = 0
      this.crashGainNode.connect(this.audioContext.destination)
      
      // Load audio files
      await this.loadAudioBuffers()
      
      console.log('[EngineAudio] Initialized with Web Audio API')
    } catch (error) {
      console.error('[EngineAudio] Failed to initialize Web Audio API:', error)
    }
  }

  /**
   * Load all audio files into buffers
   */
  private async loadAudioBuffers(): Promise<void> {
    if (!this.audioContext) return

    try {
      // Load engine loop
      const loopResponse = await fetch(AUDIO_PATHS.engine.loop)
      const loopArrayBuffer = await loopResponse.arrayBuffer()
      this.audioBuffer = await this.audioContext.decodeAudioData(loopArrayBuffer)
      
      // Load engine start sound
      const startResponse = await fetch(AUDIO_PATHS.engine.start)
      const startArrayBuffer = await startResponse.arrayBuffer()
      this.startBuffer = await this.audioContext.decodeAudioData(startArrayBuffer)
      
      // Load horn sound
      const hornResponse = await fetch(AUDIO_PATHS.vehicle.horn)
      const hornArrayBuffer = await hornResponse.arrayBuffer()
      this.hornBuffer = await this.audioContext.decodeAudioData(hornArrayBuffer)
      
      // Load crash sound
      const crashResponse = await fetch(AUDIO_PATHS.vehicle.crash)
      const crashArrayBuffer = await crashResponse.arrayBuffer()
      this.crashBuffer = await this.audioContext.decodeAudioData(crashArrayBuffer)
      
      this.isLoaded = true
      console.log('[EngineAudio] All audio buffers loaded')
    } catch (error) {
      console.error('[EngineAudio] Failed to load audio buffers:', error)
    }
  }

  /**
   * Play engine start sound (one-shot with fade out at the end)
   */
  private playStartSound(): void {
    if (!this.audioContext || !this.startBuffer || !this.startGainNode) return

    try {
      const config = ENGINE_AUDIO_CONFIG
      const now = this.audioContext.currentTime
      
      // Create source node
      const startSource = this.audioContext.createBufferSource()
      startSource.buffer = this.startBuffer
      startSource.connect(this.startGainNode)
      
      // Set initial volume (startVolume * gainMultiplier)
      const startVolume = config.startVolume * config.gainMultiplier
      this.startGainNode.gain.setValueAtTime(startVolume, now)
      
      // Schedule fade out at the end
      const fadeOutDelay = config.startFadeOutDelay / 1000 // Convert to seconds
      const fadeOutDuration = config.startFadeOutDuration / 1000 // Convert to seconds
      
      // Start fade out after delay
      this.startGainNode.gain.setValueAtTime(startVolume, now + fadeOutDelay)
      this.startGainNode.gain.exponentialRampToValueAtTime(
        0.001, 
        now + fadeOutDelay + fadeOutDuration
      )
      
      // Start playing
      startSource.start(0)
      
      console.log('[EngineAudio] Engine start sound played with fade out')
    } catch (error) {
      console.error('[EngineAudio] Failed to play start sound:', error)
    }
  }

  /**
   * Create and configure a new source node
   */
  private createSourceNode(): AudioBufferSourceNode | null {
    if (!this.audioContext || !this.audioBuffer || !this.gainNode) return null

    const source = this.audioContext.createBufferSource()
    source.buffer = this.audioBuffer
    source.loop = AUDIO_BEHAVIOR.loopEngine
    source.playbackRate.value = ENGINE_AUDIO_CONFIG.minPitch
    source.connect(this.gainNode)

    source.onended = () => {
      if (!source.loop) {
        this.isPlaying = false
      }
    }

    return source
  }

  /**
   * Start the engine (play engine sound)
   */
  async startEngine(): Promise<void> {
    if (this.isPlaying) return
    
    if (!this.isLoaded) {
      console.log('[EngineAudio] Waiting for audio to load...')
      await this.loadAudioBuffers()
    }

    if (!this.audioContext || !this.audioBuffer || !this.gainNode) {
      console.error('[EngineAudio] Audio not initialized')
      return
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Play engine start sound first
      this.playStartSound()

      this.sourceNode = this.createSourceNode()
      if (!this.sourceNode) return

      this.sourceNode.playbackRate.value = ENGINE_AUDIO_CONFIG.minPitch
      this.currentPitch = ENGINE_AUDIO_CONFIG.minPitch

      this.gainNode.gain.value = 0
      
      this.sourceNode.start(0)
      this.isPlaying = true

      // Calculate target gain (can exceed 1.0)
      const baseGain = ENGINE_AUDIO_CONFIG.baseVolume * ENGINE_AUDIO_CONFIG.gainMultiplier
      this.fadeIn(baseGain, ENGINE_AUDIO_CONFIG.fadeInDuration)

      console.log('[EngineAudio] Engine started')
    } catch (error) {
      console.error('[EngineAudio] Failed to start engine sound:', error)
    }
  }

  /**
   * Stop the engine
   */
  stopEngine(): void {
    if (!this.isPlaying || !this.sourceNode || !this.gainNode || !this.audioContext) return

    this.fadeOut(ENGINE_AUDIO_CONFIG.fadeOutDuration, () => {
      if (this.sourceNode) {
        try {
          this.sourceNode.stop()
        } catch (e) {}
        this.sourceNode.disconnect()
        this.sourceNode = null
      }
      this.isPlaying = false
      this.currentVolume = 0
      this.currentPitch = ENGINE_AUDIO_CONFIG.minPitch
      console.log('[EngineAudio] Engine stopped')
    })
  }

  /**
   * Toggle engine on/off
   */
  async toggleEngine(): Promise<boolean> {
    if (this.isPlaying) {
      this.stopEngine()
      return false
    } else {
      await this.startEngine()
      return true
    }
  }

  // ============================================
  // HORN METHODS
  // ============================================

  /**
   * Start playing horn sound
   */
  playHorn(): void {
    if (this.isHornPlaying || !this.audioContext || !this.hornBuffer || !this.hornGainNode) return

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }

      const config = HORN_AUDIO_CONFIG
      const now = this.audioContext.currentTime

      // Create horn source node
      this.hornSourceNode = this.audioContext.createBufferSource()
      this.hornSourceNode.buffer = this.hornBuffer
      this.hornSourceNode.loop = config.loop
      this.hornSourceNode.connect(this.hornGainNode)

      // Handle when horn ends (if not looping)
      this.hornSourceNode.onended = () => {
        if (!config.loop) {
          this.isHornPlaying = false
        }
      }

      // Calculate volume
      const targetVolume = config.volume * config.gainMultiplier

      // Fade in
      this.hornGainNode.gain.setValueAtTime(0.001, now)
      this.hornGainNode.gain.exponentialRampToValueAtTime(
        targetVolume,
        now + config.fadeInDuration / 1000
      )

      // Start playing
      this.hornSourceNode.start(0)
      this.isHornPlaying = true

      console.log('[EngineAudio] Horn started')
    } catch (error) {
      console.error('[EngineAudio] Failed to play horn:', error)
    }
  }

  /**
   * Stop playing horn sound
   */
  stopHorn(): void {
    if (!this.isHornPlaying || !this.hornSourceNode || !this.hornGainNode || !this.audioContext) return

    try {
      const config = HORN_AUDIO_CONFIG
      const now = this.audioContext.currentTime
      const currentValue = this.hornGainNode.gain.value

      // Fade out
      this.hornGainNode.gain.cancelScheduledValues(now)
      this.hornGainNode.gain.setValueAtTime(Math.max(0.001, currentValue), now)
      this.hornGainNode.gain.exponentialRampToValueAtTime(
        0.001,
        now + config.fadeOutDuration / 1000
      )

      // Stop after fade out
      setTimeout(() => {
        if (this.hornSourceNode) {
          try {
            this.hornSourceNode.stop()
          } catch (e) {}
          this.hornSourceNode.disconnect()
          this.hornSourceNode = null
        }
        this.isHornPlaying = false
        console.log('[EngineAudio] Horn stopped')
      }, config.fadeOutDuration)
    } catch (error) {
      console.error('[EngineAudio] Failed to stop horn:', error)
    }
  }

  /**
   * Check if horn is playing
   */
  isHornActive(): boolean {
    return this.isHornPlaying
  }

  // ============================================
  // CRASH SOUND METHODS
  // ============================================

  /**
   * Play crash sound when collision occurs
   * @param impactVelocity The velocity of impact (m/s)
   */
  playCrashSound(impactVelocity: number): void {
    if (!this.audioContext || !this.crashBuffer || !this.crashGainNode) return

    const config = CRASH_AUDIO_CONFIG
    const now = Date.now()

    // Check minimum impact velocity
    if (Math.abs(impactVelocity) < config.minImpactVelocity) {
      return
    }

    // Check cooldown
    if (now - this.lastCrashTime < config.cooldown) {
      return
    }
    this.lastCrashTime = now

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }

      const audioNow = this.audioContext.currentTime

      // Create crash source node
      const crashSource = this.audioContext.createBufferSource()
      crashSource.buffer = this.crashBuffer
      crashSource.loop = false
      crashSource.connect(this.crashGainNode)

      // Calculate volume based on impact
      let volume = config.volume
      if (config.scaleVolumeByImpact) {
        const impactFactor = Math.min(1, Math.abs(impactVelocity) / config.maxImpactVelocity)
        volume = config.volume * (0.5 + 0.5 * impactFactor) // Range from 50% to 100%
      }
      const finalVolume = volume * config.gainMultiplier

      // Set volume
      this.crashGainNode.gain.setValueAtTime(finalVolume, audioNow)

      // Start playing
      crashSource.start(0)

      console.log(`[EngineAudio] Crash sound played (impact: ${Math.abs(impactVelocity).toFixed(1)} m/s)`)
    } catch (error) {
      console.error('[EngineAudio] Failed to play crash sound:', error)
    }
  }

  /**
   * Update engine sound based on speed and throttle
   */
  updateEngineSound(speedKmh: number, throttle: number): void {
    if (!this.isPlaying || !this.sourceNode || !this.gainNode) return

    const config = ENGINE_AUDIO_CONFIG

    const speedDelta = speedKmh - this.lastSpeed
    this.isAccelerating = speedDelta > 0.5 && Math.abs(throttle) > 0.1
    this.lastSpeed = speedKmh

    const speedFactor = Math.min(1, speedKmh / config.maxSpeedForPitch)
    
    // === VOLUME ===
    let targetRawVolume: number = config.baseVolume
    targetRawVolume += Math.abs(throttle) * config.throttleVolumeBoost
    targetRawVolume += speedFactor * config.speedVolumeBoost
    
    if (this.isAccelerating) {
      targetRawVolume += 0.1
    }
    
    targetRawVolume = Math.min(config.maxVolume, targetRawVolume)
    
    // Apply gain multiplier - this is what makes it louder
    const targetGain = targetRawVolume * config.gainMultiplier
    
    // Smooth transition
    this.currentVolume += (targetGain - this.currentVolume) * config.volumeSmoothness
    this.gainNode.gain.value = Math.max(0, this.currentVolume)

    // === PITCH ===
    const speedPitchFactor = Math.pow(speedFactor, 0.8)
    let targetPitch = config.minPitch + speedPitchFactor * (config.maxPitch - config.minPitch)
    targetPitch += Math.abs(throttle) * config.throttlePitchBoost
    
    if (this.isAccelerating && throttle > 0) {
      targetPitch += config.accelerationPitchBoost
    }
    
    if (throttle < -0.1 && speedKmh > 10) {
      targetPitch -= 0.1
    }
    
    targetPitch = Math.max(0.5, Math.min(2.5, targetPitch))
    
    const pitchSmooth = this.isAccelerating ? config.pitchSmoothness * 1.5 : config.pitchSmoothness
    this.currentPitch += (targetPitch - this.currentPitch) * pitchSmooth
    this.sourceNode.playbackRate.value = this.currentPitch
  }

  isEngineRunning(): boolean {
    return this.isPlaying
  }

  setVolumeMultiplier(multiplier: number): void {
    if (this.gainNode && this.isPlaying) {
      this.gainNode.gain.value = ENGINE_AUDIO_CONFIG.baseVolume * multiplier * ENGINE_AUDIO_CONFIG.gainMultiplier
    }
  }

  getCurrentVolume(): number {
    return this.currentVolume
  }

  getCurrentPitch(): number {
    return this.currentPitch
  }

  private fadeIn(targetGain: number, duration: number): void {
    if (!this.gainNode || !this.audioContext) return

    const now = this.audioContext.currentTime
    const durationSec = duration / 1000

    this.gainNode.gain.setValueAtTime(0.001, now)
    this.gainNode.gain.exponentialRampToValueAtTime(
      Math.max(0.001, targetGain),
      now + durationSec
    )
    
    this.currentVolume = targetGain
  }

  private fadeOut(duration: number, onComplete?: () => void): void {
    if (!this.gainNode || !this.audioContext) {
      onComplete?.()
      return
    }

    const now = this.audioContext.currentTime
    const durationSec = duration / 1000
    const currentValue = this.gainNode.gain.value

    this.gainNode.gain.cancelScheduledValues(now)
    this.gainNode.gain.setValueAtTime(Math.max(0.001, currentValue), now)
    this.gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec)

    setTimeout(() => {
      if (this.gainNode) {
        this.gainNode.gain.value = 0
      }
      this.currentVolume = 0
      onComplete?.()
    }, duration)
  }

  dispose(): void {
    // Stop engine source
    if (this.sourceNode) {
      try {
        this.sourceNode.stop()
      } catch (e) {}
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    // Stop horn source
    if (this.hornSourceNode) {
      try {
        this.hornSourceNode.stop()
      } catch (e) {}
      this.hornSourceNode.disconnect()
      this.hornSourceNode = null
    }

    // Disconnect gain nodes
    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }

    if (this.startGainNode) {
      this.startGainNode.disconnect()
      this.startGainNode = null
    }

    if (this.hornGainNode) {
      this.hornGainNode.disconnect()
      this.hornGainNode = null
    }

    if (this.crashGainNode) {
      this.crashGainNode.disconnect()
      this.crashGainNode = null
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    // Clear buffers and state
    this.audioBuffer = null
    this.startBuffer = null
    this.hornBuffer = null
    this.crashBuffer = null
    this.isPlaying = false
    this.isHornPlaying = false
    this.isLoaded = false
    this.currentVolume = 0
    this.currentPitch = 1
    this.lastSpeed = 0
    this.isAccelerating = false
    this.lastCrashTime = 0
    
    console.log('[EngineAudio] Disposed')
  }
}
