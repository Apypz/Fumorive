/**
 * AmbientSoundSystem
 * ==================
 * Suara ambient kota untuk Ngawi City:
 *
 * 1. AMBIENT KOTA — suara latar kota (keramaian, angin, dsb.)
 *    Dibuat secara PROSEDURAL dengan Web Audio API — tidak butuh file audio.
 *
 * 2. SUARA BURUNG — chirping ringan di siang hari.
 *    Juga prosedural (tone burst).
 *
 * 3. SUARA ANGIN — low-frequency filtered noise.
 *
 * 4. AMBIENCE BUS / MOTOR — occasional passing sound dari arah random.
 *
 * Seluruh sistem menggunakan Web Audio API murni tanpa file eksternal,
 * sehingga tidak tergantung pada ketersediaan asset audio.
 */

const MASTER_AMBIENT_VOL = 0.35
const WIND_VOL           = 0.08
const BIRD_INTERVAL_MIN  = 6.0   // detik antara siulan burung
const BIRD_INTERVAL_MAX  = 18.0

export class AmbientSoundSystem {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private windSource: AudioBufferSourceNode | null = null
  private windGain: GainNode | null = null
  private citySource: AudioBufferSourceNode | null = null
  private cityGain: GainNode | null = null
  private unlocked = false

  private birdTimer = 0
  private nextBirdTime = this.randomBirdInterval()

  private unlockHandler: (() => void) | null = null

  constructor() {
    this.attachUnlock()
  }

  // ── Public API ───────────────────────────────────────────────────────────

  start(): void {
    this.ensureCtx()
    if (!this.ctx || !this.masterGain) return
    if (!this.unlocked) return
    this.startWind()
    this.startCityAmbience()
  }

  update(dt: number): void {
    if (!this.unlocked) return
    this.ensureCtx()
    if (!this.ctx) return

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.unlocked = true
        this.start()
      }).catch(() => {})
      return
    }

    // Avian calls
    this.birdTimer += dt
    if (this.birdTimer >= this.nextBirdTime) {
      this.birdTimer = 0
      this.nextBirdTime = this.randomBirdInterval()
      this.playBirdChirp()
    }
  }

  dispose(): void {
    if (this.unlockHandler) {
      document.removeEventListener('click',     this.unlockHandler)
      document.removeEventListener('keydown',   this.unlockHandler)
      document.removeEventListener('touchstart',this.unlockHandler)
    }
    try {
      this.windSource?.stop()
      this.citySource?.stop()
    } catch (_) {}
    try { this.ctx?.close() } catch (_) {}
    this.ctx = null; this.masterGain = null
    this.windSource = null; this.citySource = null
  }

  // ── Private: setup ───────────────────────────────────────────────────────

  private attachUnlock(): void {
    const handler = () => {
      this.ensureCtx()
      if (!this.ctx) return
      const resume = this.ctx.state === 'suspended'
        ? this.ctx.resume()
        : Promise.resolve()
      resume.then(() => {
        this.unlocked = true
        this.start()
        console.log('[AmbientSoundSystem] Unlocked & started')
      }).catch(() => {})
    }
    this.unlockHandler = handler
    document.addEventListener('click',      handler, { once: false })
    document.addEventListener('keydown',    handler, { once: false })
    document.addEventListener('touchstart', handler, { once: false })
  }

  private ensureCtx(): void {
    if (this.ctx) return
    try {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = MASTER_AMBIENT_VOL
      this.masterGain.connect(this.ctx.destination)
      if (this.ctx.state === 'running') this.unlocked = true
    } catch (_) {}
  }

  // ── Wind ─────────────────────────────────────────────────────────────────

  private startWind(): void {
    if (!this.ctx || !this.masterGain || this.windSource) return
    const bufDur = 4
    const rate   = this.ctx.sampleRate
    const buf    = this.ctx.createBuffer(1, rate * bufDur, rate)
    const data   = buf.getChannelData(0)
    // Brown-ish noise: cumulative random walk
    let last = 0
    for (let i = 0; i < data.length; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.04)
      last = Math.max(-1, Math.min(1, last))
      data[i] = last
    }

    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop   = true

    // Low-pass filter for a muffled wind feel
    const lpf = this.ctx.createBiquadFilter()
    lpf.type            = 'lowpass'
    lpf.frequency.value = 350
    lpf.Q.value         = 0.5

    const gain = this.ctx.createGain()
    gain.gain.value = WIND_VOL

    src.connect(lpf)
    lpf.connect(gain)
    gain.connect(this.masterGain)
    src.start()

    this.windSource = src
    this.windGain   = gain
  }

  // ── City hum ─────────────────────────────────────────────────────────────

  private startCityAmbience(): void {
    if (!this.ctx || !this.masterGain || this.citySource) return
    // Modulated noise simulating a busy street
    const bufDur = 6
    const rate   = this.ctx.sampleRate
    const buf    = this.ctx.createBuffer(2, rate * bufDur, rate)

    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      let v = 0
      for (let i = 0; i < data.length; i++) {
        v = v * 0.995 + (Math.random() * 2 - 1) * 0.02
        // Slow amplitude modulation to simulate ebb/flow of traffic noise
        const t   = i / rate
        const mod = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.07 * t + ch)
        data[i] = v * mod
      }
    }

    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop   = true

    const bpf = this.ctx.createBiquadFilter()
    bpf.type            = 'bandpass'
    bpf.frequency.value = 800
    bpf.Q.value         = 0.4

    const gain = this.ctx.createGain()
    gain.gain.value = 0.18

    src.connect(bpf)
    bpf.connect(gain)
    gain.connect(this.masterGain)
    src.start()

    this.citySource = src
    this.cityGain   = gain
  }

  // ── Bird chirp ───────────────────────────────────────────────────────────

  private playBirdChirp(): void {
    if (!this.ctx || !this.masterGain) return
    const numNotes = 2 + Math.floor(Math.random() * 4)
    const baseFreq = 2200 + Math.random() * 1600
    const now = this.ctx.currentTime

    for (let n = 0; n < numNotes; n++) {
      const t = now + n * 0.09
      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(baseFreq + Math.random() * 400, t)
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.75, t + 0.06)

      const env = this.ctx.createGain()
      env.gain.setValueAtTime(0,    t)
      env.gain.linearRampToValueAtTime(0.07, t + 0.01)
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.07)

      osc.connect(env)
      env.connect(this.masterGain)
      osc.start(t)
      osc.stop(t + 0.08)
      osc.onended = () => { try { osc.disconnect(); env.disconnect() } catch (_) {} }
    }
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  private randomBirdInterval(): number {
    return BIRD_INTERVAL_MIN + Math.random() * (BIRD_INTERVAL_MAX - BIRD_INTERVAL_MIN)
  }
}
