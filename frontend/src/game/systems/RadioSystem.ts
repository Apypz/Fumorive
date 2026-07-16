/**
 * RadioSystem
 * ===========
 * GTA-style in-car radio.
 *
 * Stations (cycle with R):
 *   OFF → Ngawi FM → Radio Kota → Smooth Jazz → OFF → ...
 *
 *   Ngawi FM    : MP3 files dari /assets/radio/Ngawi FM/
 *   Radio Kota  : MP3 files dari /assets/radio/Radio kota/
 *   Smooth Jazz : Procedural Web Audio (mellow jazz)
 */

export type RadioStation = 'off' | 'ngawi-fm' | 'radio-kota' | 'smooth-jazz'

export interface RadioStationInfo {
  id: RadioStation
  name: string
  genre: string
  color: string
}

export interface RadioTrackInfo {
  title: string
  artist: string
}

export const RADIO_STATIONS: RadioStationInfo[] = [
  { id: 'off',         name: 'Radio: OFF',  genre: '',               color: '#64748b' },
  { id: 'ngawi-fm',    name: 'Ngawi FM',    genre: 'Pop Indonesia',  color: '#f59e0b' },
  { id: 'radio-kota',  name: 'Radio Kota',  genre: 'Electronic',     color: '#6366f1' },
  { id: 'smooth-jazz', name: 'Smooth Jazz', genre: 'Jazz',           color: '#10b981' },
]

// ─── track lists ──────────────────────────────────────────────────────────────

const NGAWI_FM_TRACKS = [
  '/assets/radio/Ngawi%20FM/Denny%20Caknan%20-%20Wirang.mp3',
  '/assets/radio/Ngawi%20FM/Chrisye%20-%20Kisah%20Kasih%20di%20Sekolah.mp3',
]

const RADIO_KOTA_TRACKS = [
  '/assets/radio/Radio%20kota/Billy%20Idol%20-%20Eyes%20Without%20A%20Face.mp3',
  '/assets/radio/Radio%20kota/The%20Weeknd%20-%20Blinding%20Lights.mp3',
]

/** Parse "Artist - Title.mp3" filenames into structured info. */
function parseTrackInfo(filePath: string): RadioTrackInfo {
  // Decode any %20 / URL escapes back to human-readable spaces first.
  const decoded = decodeURIComponent(filePath)
  const base = decoded.replace(/\.mp3$/i, '').replace(/^.*\//, '')
  const sep = base.indexOf(' - ')
  if (sep !== -1) {
    return { artist: base.slice(0, sep).trim(), title: base.slice(sep + 3).trim() }
  }
  return { artist: '', title: base }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12)
}

function scheduleNote(
  ctx: AudioContext, dest: AudioNode, freq: number,
  startTime: number, duration: number, volume: number,
  type: OscillatorType = 'sawtooth', detune = 0,
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
  osc.connect(filter); filter.connect(gain); gain.connect(dest)
  const attackEnd = startTime + 0.02
  const decayEnd  = startTime + 0.08
  const relStart  = startTime + duration - 0.04
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(volume, attackEnd)
  gain.gain.linearRampToValueAtTime(volume * 0.7, decayEnd)
  gain.gain.setValueAtTime(volume * 0.7, relStart)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)
  osc.start(startTime); osc.stop(startTime + duration)
}

function scheduleKick(ctx: AudioContext, dest: AudioNode, t: number, vol = 0.6): void {
  const osc = ctx.createOscillator(); const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  osc.connect(gain); gain.connect(dest); osc.start(t); osc.stop(t + 0.2)
}

function scheduleHat(ctx: AudioContext, dest: AudioNode, t: number, vol = 0.12): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource(); src.buffer = buf
  const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 8000
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
  src.connect(filter); filter.connect(gain); gain.connect(dest); src.start(t)
}

function scheduleSnare(ctx: AudioContext, dest: AudioNode, t: number, vol = 0.25): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03))
  const src = ctx.createBufferSource(); src.buffer = buf
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  src.connect(gain); gain.connect(dest); src.start(t)
}

// ─── procedural Smooth Jazz ───────────────────────────────────────────────────

function scheduleSmoothJazz(ctx: AudioContext, dest: AudioNode, loopStart: number): number {
  const bpm = 80; const beat = 60 / bpm; const loopLen = beat * 8
  const walkBass = [48, 50, 51, 53, 53, 55, 56, 51]
  walkBass.forEach((note, i) => {
    scheduleNote(ctx, dest, midiToHz(note), loopStart + i * beat, beat * 0.85, 0.30, 'triangle')
  })
  const cm7 = [60, 63, 67, 70]; const fm7 = [65, 68, 72, 75]; const g7 = [67, 71, 74, 77]
  const chords: [number, number[]][] = [
    [loopStart + beat * 0.5, cm7], [loopStart + beat * 2.5, fm7],
    [loopStart + beat * 4.5, g7],  [loopStart + beat * 6.5, cm7],
  ]
  chords.forEach(([t, chord]) => chord.forEach((note, ni) => {
    scheduleNote(ctx, dest, midiToHz(note), t, beat * 0.7, 0.09, 'sine', ni * 2)
  }))
  for (let i = 0; i < 8; i++) {
    const t = loopStart + i * beat
    scheduleHat(ctx, dest, t, 0.09); scheduleHat(ctx, dest, t + beat * 0.5, 0.05)
    if (i % 4 === 0 || i % 4 === 2) scheduleKick(ctx, dest, t, 0.30)
    if (i % 4 === 1 || i % 4 === 3) scheduleSnare(ctx, dest, t, 0.12)
  }
  return loopLen
}

// ─── main class ───────────────────────────────────────────────────────────────

export class RadioSystem {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private currentStation: RadioStation = 'off'
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null
  private nextLoopStart = 0
  private onStationChange: ((station: RadioStation) => void) | null = null
  private onTrackChange: ((station: RadioStation, track: RadioTrackInfo | null) => void) | null = null

  private readonly SCHEDULE_AHEAD = 0.15

  // ── Ngawi FM ──────────────────────────────────────────────────────────────
  private ngawiFmAudio: HTMLAudioElement | null = null
  private ngawiFmTrackIndex = 0

  // ── Radio Kota ────────────────────────────────────────────────────────────
  private radioKotaAudio: HTMLAudioElement | null = null
  private radioKotaTrackIndex = 0

  constructor() {}

  setOnStationChange(cb: (station: RadioStation) => void): void {
    this.onStationChange = cb
  }

  setOnTrackChange(cb: (station: RadioStation, track: RadioTrackInfo | null) => void): void {
    this.onTrackChange = cb
  }

  getCurrentStation(): RadioStation { return this.currentStation }

  getStationInfo(): RadioStationInfo {
    return RADIO_STATIONS.find(s => s.id === this.currentStation) ?? RADIO_STATIONS[0]
  }

  getCurrentTrackInfo(): RadioTrackInfo | null {
    if (this.currentStation === 'ngawi-fm') {
      return parseTrackInfo(NGAWI_FM_TRACKS[this.ngawiFmTrackIndex % NGAWI_FM_TRACKS.length])
    }
    if (this.currentStation === 'radio-kota') {
      return parseTrackInfo(RADIO_KOTA_TRACKS[this.radioKotaTrackIndex % RADIO_KOTA_TRACKS.length])
    }
    return null
  }

  cycleStation(): void {
    const order: RadioStation[] = ['off', 'ngawi-fm', 'radio-kota', 'smooth-jazz']
    const idx = order.indexOf(this.currentStation)
    this.setStation(order[(idx + 1) % order.length])
  }

  /** Skip to next track (Radio Kota or Ngawi FM). */
  nextTrack(): void {
    if (this.currentStation === 'radio-kota') {
      this.radioKotaTrackIndex = (this.radioKotaTrackIndex + 1) % RADIO_KOTA_TRACKS.length
      this.stopRadioKota(); this.playRadioKota()
    } else if (this.currentStation === 'ngawi-fm') {
      this.ngawiFmTrackIndex = (this.ngawiFmTrackIndex + 1) % NGAWI_FM_TRACKS.length
      this.stopNgawiFm(); this.playNgawiFm()
    }
  }

  /** Go back to previous track (Radio Kota or Ngawi FM). */
  prevTrack(): void {
    if (this.currentStation === 'radio-kota') {
      this.radioKotaTrackIndex = (this.radioKotaTrackIndex - 1 + RADIO_KOTA_TRACKS.length) % RADIO_KOTA_TRACKS.length
      this.stopRadioKota(); this.playRadioKota()
    } else if (this.currentStation === 'ngawi-fm') {
      this.ngawiFmTrackIndex = (this.ngawiFmTrackIndex - 1 + NGAWI_FM_TRACKS.length) % NGAWI_FM_TRACKS.length
      this.stopNgawiFm(); this.playNgawiFm()
    }
  }

  setStation(station: RadioStation): void {
    this.stopScheduler()
    this.currentStation = station
    this.onStationChange?.(station)

    if (station === 'off') {
      this.fadeOutMaster(); this.stopNgawiFm(); this.stopRadioKota()
      this.onTrackChange?.(station, null)
      return
    }

    if (station === 'ngawi-fm') {
      this.fadeOutMaster(); this.stopNgawiFm(); this.stopRadioKota()
      this.playNgawiFm()
      return
    }

    if (station === 'radio-kota') {
      this.fadeOutMaster(); this.stopNgawiFm(); this.stopRadioKota()
      this.playRadioKota()
      return
    }

    // Smooth Jazz — procedural
    this.stopNgawiFm(); this.stopRadioKota()
    this.onTrackChange?.(station, null)
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime)
    this.masterGain.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 0.3)
    this.nextLoopStart = this.ctx.currentTime + 0.05
    this.scheduleLoop()
  }

  // ── Ngawi FM player ───────────────────────────────────────────────────────

  private playNgawiFm(): void {
    const src = NGAWI_FM_TRACKS[this.ngawiFmTrackIndex % NGAWI_FM_TRACKS.length]
    const audio = new Audio(src)
    audio.volume = 0.7
    audio.preload = 'auto'
    this.onTrackChange?.('ngawi-fm', parseTrackInfo(src))
    audio.addEventListener('ended', () => {
      if (this.currentStation !== 'ngawi-fm') return
      this.ngawiFmTrackIndex = (this.ngawiFmTrackIndex + 1) % NGAWI_FM_TRACKS.length
      this.playNgawiFm()
    })
    audio.play().catch(() => {
      const retry = () => { audio.play().catch(() => {}); window.removeEventListener('click', retry); window.removeEventListener('keydown', retry) }
      window.addEventListener('click', retry, { once: true })
      window.addEventListener('keydown', retry, { once: true })
    })
    this.ngawiFmAudio = audio
  }

  private stopNgawiFm(): void {
    if (this.ngawiFmAudio) { this.ngawiFmAudio.pause(); this.ngawiFmAudio.src = ''; this.ngawiFmAudio = null }
  }

  // ── Radio Kota MP3 player ─────────────────────────────────────────────────

  private playRadioKota(): void {
    const src = RADIO_KOTA_TRACKS[this.radioKotaTrackIndex % RADIO_KOTA_TRACKS.length]
    const audio = new Audio(src)
    audio.volume = 0.7
    audio.preload = 'auto'
    this.onTrackChange?.('radio-kota', parseTrackInfo(src))
    audio.addEventListener('ended', () => {
      if (this.currentStation !== 'radio-kota') return
      this.radioKotaTrackIndex = (this.radioKotaTrackIndex + 1) % RADIO_KOTA_TRACKS.length
      this.playRadioKota()
    })
    audio.play().catch(() => {
      const retry = () => { audio.play().catch(() => {}); window.removeEventListener('click', retry); window.removeEventListener('keydown', retry) }
      window.addEventListener('click', retry, { once: true })
      window.addEventListener('keydown', retry, { once: true })
    })
    this.radioKotaAudio = audio
  }

  private stopRadioKota(): void {
    if (this.radioKotaAudio) { this.radioKotaAudio.pause(); this.radioKotaAudio.src = ''; this.radioKotaAudio = null }
  }

  // ── Procedural scheduler (Smooth Jazz only) ───────────────────────────────

  private scheduleLoop(): void {
    if (!this.ctx || this.currentStation === 'off') return
    const now = this.ctx.currentTime
    while (this.nextLoopStart < now + this.SCHEDULE_AHEAD + 0.5) {
      const loopLen = this.currentStation === 'smooth-jazz'
        ? scheduleSmoothJazz(this.ctx, this.masterGain!, this.nextLoopStart)
        : 1
      this.nextLoopStart += loopLen
    }
    const delay = Math.max(50, (this.nextLoopStart - now - this.SCHEDULE_AHEAD) * 1000 - 200)
    this.schedulerTimer = setTimeout(() => this.scheduleLoop(), delay)
  }

  private stopScheduler(): void {
    if (this.schedulerTimer !== null) { clearTimeout(this.schedulerTimer); this.schedulerTimer = null }
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
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  dispose(): void {
    this.stopScheduler(); this.stopNgawiFm(); this.stopRadioKota(); this.fadeOutMaster()
    setTimeout(() => { this.ctx?.close(); this.ctx = null; this.masterGain = null }, 500)
  }
}
