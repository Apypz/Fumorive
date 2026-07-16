/**
 * RadioSystem
 * ===========
 * GTA-style in-car radio with synthetic procedural music per station.
 * Uses Web Audio API — no audio files needed.
 *
 * Stations (cycle with R):
 *   OFF → Ngawi FM → Radio Kota → Smooth Jazz → OFF → ...
 *
 * Each station is a lightweight procedural music engine:
 *   Ngawi FM   : Upbeat Indonesian pop / dangdut feel (major, fast)
 *   Radio Kota : Electronic / synthwave (driving beat, synth bass)
 *   Smooth Jazz: Mellow jazz (slow, minor 7th chords)
 */

export type RadioStation = 'off' | 'ngawi-fm' | 'radio-kota' | 'smooth-jazz'

export interface RadioStationInfo {
  id: RadioStation
  name: string
  genre: string
  color: string // accent color for HUD
}

export const RADIO_STATIONS: RadioStationInfo[] = [
  { id: 'off',         name: 'Radio: OFF',    genre: '',               color: '#64748b' },
  { id: 'ngawi-fm',    name: 'Ngawi FM',      genre: 'Pop Indonesia',  color: '#f59e0b' },
  { id: 'radio-kota',  name: 'Radio Kota',    genre: 'Electronic',     color: '#6366f1' },
  { id: 'smooth-jazz', name: 'Smooth Jazz',   genre: 'Jazz',           color: '#10b981' },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert MIDI note number to Hz */
function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12)
}

/** Schedule a single note (oscillator + gain envelope) */
function scheduleNote(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sawtooth',
  detune = 0,
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  osc.detune.setValueAtTime(detune, startTime)

  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(2200, startTime)
  filter.Q.setValueAtTime(1.2, startTime)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  // ADSR-lite envelope
  const attackEnd  = startTime + 0.02
  const decayEnd   = startTime + 0.08
  const releaseStart = startTime + duration - 0.04

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(volume, attackEnd)
  gain.gain.linearRampToValueAtTime(volume * 0.7, decayEnd)
  gain.gain.setValueAtTime(volume * 0.7, releaseStart)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

/** Schedule a kick drum pulse */
function scheduleKick(ctx: AudioContext, dest: AudioNode, t: number, vol = 0.6): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(t)
  osc.stop(t + 0.2)
}

/** Schedule a hi-hat tick */
function scheduleHat(ctx: AudioContext, dest: AudioNode, t: number, vol = 0.12): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 8000
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  src.start(t)
}

/** Schedule a snare hit */
function scheduleSnare(ctx: AudioContext, dest: AudioNode, t: number, vol = 0.25): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03))
  const src = ctx.createBufferSource()
  src.buffer = buf
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  src.connect(gain)
  gain.connect(dest)
  src.start(t)
}

// ─── station schedulers ───────────────────────────────────────────────────────

/**
 * Radio Kota — Electronic / synthwave.
 * A minor, 130 BPM, 8-beat loop. Driving bass + arpeggiated lead.
 */
function scheduleRadioKota(ctx: AudioContext, dest: AudioNode, loopStart: number): number {
  const bpm = 130
  const beat = 60 / bpm
  const loopLen = beat * 8

  // Bass line: A minor (A2→C3→E3→G3)
  const bassLine = [45, 48, 52, 55, 52, 48, 45, 43]
  bassLine.forEach((note, i) => {
    const t = loopStart + i * beat
    scheduleNote(ctx, dest, midiToHz(note), t, beat * 0.9, 0.38, 'sawtooth', 0)
  })

  // Arpeggio: A3 C4 E4 G4 repeating
  const arpNotes = [57, 60, 64, 67]
  const arpStep = beat / 2
  for (let i = 0; i < 16; i++) {
    const t = loopStart + i * arpStep
    const note = arpNotes[i % arpNotes.length]
    scheduleNote(ctx, dest, midiToHz(note), t, arpStep * 0.7, 0.14, 'square', 12)
  }

  // Pad chord (Am7) sustained
  const padNotes = [57, 60, 64, 67] // A3 C4 E4 G4
  padNotes.forEach((note, ni) => {
    scheduleNote(ctx, dest, midiToHz(note), loopStart, loopLen * 0.95, 0.07, 'sine', ni * 3)
  })

  // Drums: 4-on-the-floor kick, snare 2&4, 16th hi-hats
  for (let i = 0; i < 8; i++) {
    const t = loopStart + i * beat
    scheduleKick(ctx, dest, t, 0.60)
    if (i % 4 === 1 || i % 4 === 3) scheduleSnare(ctx, dest, t, 0.22)
    // 16th hi-hats
    for (let s = 0; s < 4; s++) {
      scheduleHat(ctx, dest, t + s * beat * 0.25, s % 2 === 0 ? 0.12 : 0.07)
    }
  }

  return loopLen
}

/**
 * Smooth Jazz — Mellow Cm7 vibe.
 * C minor, 80 BPM, 8-beat loop. Walking bass + soft chord comping.
 */
function scheduleSmoothJazz(ctx: AudioContext, dest: AudioNode, loopStart: number): number {
  const bpm = 80
  const beat = 60 / bpm
  const loopLen = beat * 8

  // Walking bass: Cm7 → Fm7 → G7 → Cm
  const walkBass = [48, 50, 51, 53, 53, 55, 56, 51] // C D Eb F F G Ab Eb
  walkBass.forEach((note, i) => {
    const t = loopStart + i * beat
    scheduleNote(ctx, dest, midiToHz(note), t, beat * 0.85, 0.30, 'triangle', 0)
  })

  // Chord comping (Cm7 stabs on beats 2 & 4 off-beats)
  const cm7 = [60, 63, 67, 70]  // C4 Eb4 G4 Bb4
  const fm7 = [65, 68, 72, 75]  // F4 Ab4 C5 Eb5
  const g7  = [67, 71, 74, 77]  // G4 B4 D5 F5

  const chordSchedule: [number, number[]][] = [
    [loopStart + beat * 0.5, cm7],
    [loopStart + beat * 2.5, fm7],
    [loopStart + beat * 4.5, g7],
    [loopStart + beat * 6.5, cm7],
  ]
  chordSchedule.forEach(([t, chord]) => {
    chord.forEach((note, ni) => {
      scheduleNote(ctx, dest, midiToHz(note), t, beat * 0.7, 0.09, 'sine', ni * 2)
    })
  })

  // Soft brushed drums: ride on every beat, light kick on 1 & 3, soft snare on 2 & 4
  for (let i = 0; i < 8; i++) {
    const t = loopStart + i * beat
    scheduleHat(ctx, dest, t, 0.09)
    scheduleHat(ctx, dest, t + beat * 0.5, 0.05)
    if (i % 4 === 0 || i % 4 === 2) scheduleKick(ctx, dest, t, 0.30)
    if (i % 4 === 1 || i % 4 === 3) scheduleSnare(ctx, dest, t, 0.12)
  }

  return loopLen
}

// ─── main class ──────────────────────────────────────────────────────────────

export class RadioSystem {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private currentStation: RadioStation = 'off'
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null
  private nextLoopStart = 0
  private onStationChange: ((station: RadioStation) => void) | null = null

  /** How many seconds ahead to schedule audio (keeps playback gapless) */
  private readonly SCHEDULE_AHEAD = 0.15

  // ── Ngawi FM: real MP3 files via HTMLAudioElement ──────────────────────────
  private readonly NGAWI_FM_TRACKS = [
    '/assets/radio/Ngawi FM/Denny Caknan - Wirang.mp3',
  ]
  private ngawiFmAudio: HTMLAudioElement | null = null
  private ngawiFmTrackIndex = 0

  constructor() {}

  setOnStationChange(cb: (station: RadioStation) => void): void {
    this.onStationChange = cb
  }

  getCurrentStation(): RadioStation {
    return this.currentStation
  }

  getStationInfo(): RadioStationInfo {
    return RADIO_STATIONS.find(s => s.id === this.currentStation) ?? RADIO_STATIONS[0]
  }

  /** Cycle to the next station: off → ngawi-fm → radio-kota → smooth-jazz → off */
  cycleStation(): void {
    const order: RadioStation[] = ['off', 'ngawi-fm', 'radio-kota', 'smooth-jazz']
    const idx = order.indexOf(this.currentStation)
    const next = order[(idx + 1) % order.length]
    this.setStation(next)
  }

  setStation(station: RadioStation): void {
    this.stopScheduler()

    this.currentStation = station
    this.onStationChange?.(station)

    if (station === 'off') {
      this.fadeOutMaster()
      this.stopNgawiFm()
      return
    }

    if (station === 'ngawi-fm') {
      this.fadeOutMaster()
      this.stopNgawiFm()
      this.playNgawiFm()
      return
    }

    // Synthetic stations
    this.stopNgawiFm()
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return

    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime)
    this.masterGain.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 0.3)

    this.nextLoopStart = this.ctx.currentTime + 0.05
    this.scheduleLoop()
  }

  // ── Ngawi FM MP3 player ────────────────────────────────────────────────────

  private playNgawiFm(): void {
    const src = this.NGAWI_FM_TRACKS[this.ngawiFmTrackIndex % this.NGAWI_FM_TRACKS.length]
    const audio = new Audio(src)
    audio.volume = 0.7
    audio.preload = 'auto'

    // When track ends, advance to next track
    audio.addEventListener('ended', () => {
      if (this.currentStation !== 'ngawi-fm') return
      this.ngawiFmTrackIndex = (this.ngawiFmTrackIndex + 1) % this.NGAWI_FM_TRACKS.length
      this.playNgawiFm()
    })

    audio.play().catch(() => {
      // Autoplay blocked — retry on next user interaction
      const retry = () => {
        audio.play().catch(() => {})
        window.removeEventListener('click', retry)
        window.removeEventListener('keydown', retry)
      }
      window.addEventListener('click', retry, { once: true })
      window.addEventListener('keydown', retry, { once: true })
    })

    this.ngawiFmAudio = audio
  }

  private stopNgawiFm(): void {
    if (this.ngawiFmAudio) {
      this.ngawiFmAudio.pause()
      this.ngawiFmAudio.src = ''
      this.ngawiFmAudio = null
    }
  }

  private scheduleLoop(): void {
    if (!this.ctx || this.currentStation === 'off') return

    const now = this.ctx.currentTime

    // Schedule loops until we are SCHEDULE_AHEAD seconds ahead of now
    while (this.nextLoopStart < now + this.SCHEDULE_AHEAD + 0.5) {
      const loopLen = this.scheduleStation(this.currentStation, this.nextLoopStart)
      this.nextLoopStart += loopLen
    }

    // Re-schedule this function just before the next loop would run out
    const delay = Math.max(50, (this.nextLoopStart - now - this.SCHEDULE_AHEAD) * 1000 - 200)
    this.schedulerTimer = setTimeout(() => this.scheduleLoop(), delay)
  }

  private scheduleStation(station: RadioStation, start: number): number {
    if (!this.ctx || !this.masterGain) return 1
    switch (station) {
      case 'radio-kota':  return scheduleRadioKota(this.ctx, this.masterGain, start)
      case 'smooth-jazz': return scheduleSmoothJazz(this.ctx, this.masterGain, start)
      default: return 1
    }
  }

  private stopScheduler(): void {
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer)
      this.schedulerTimer = null
    }
  }

  private fadeOutMaster(): void {
    if (!this.ctx || !this.masterGain) return
    const now = this.ctx.currentTime
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
    this.masterGain.gain.linearRampToValueAtTime(0, now + 0.4)
  }

  private ensureContext(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime)
      this.masterGain.connect(this.ctx.destination)
    }
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  dispose(): void {
    this.stopScheduler()
    this.stopNgawiFm()
    this.fadeOutMaster()
    setTimeout(() => {
      this.ctx?.close()
      this.ctx = null
      this.masterGain = null
    }, 500)
  }
}
