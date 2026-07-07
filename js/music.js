// ═══════════════════════════════════════════════════════════
// music.js — Generative background-music ENGINE (Tone.js)
//
// This is the machinery. It reads the per-vibe params you own in
// music-config.js and turns them into endless, evolving music —
// no audio files, no loop seams. You should rarely need to edit
// this file; tune the sound from music-config.js instead.
//
// Public API:
//   toggleMusic()     → Promise<boolean>  starts/stops, returns new on/off state
//   isMusicPlaying()  → boolean
//   setMusicVibe(name)→ void              re-tune to a vibe (glides, no hard cut)
//
// Browser note: audio can't begin until a user gesture, so the
// first toggle-on is what unlocks the audio context. Default = off.
// ═══════════════════════════════════════════════════════════

import * as Tone from 'tone'
import { MUSIC, MASTER_VOLUME_DB, DEFAULT_VIBE } from './music-config.js'
import { getActiveVibe } from './vibes.js'


// ─────────────────────────────────────────────────────────────
// SCALES — semitone offsets from the root
// ─────────────────────────────────────────────────────────────

const SCALES = {
  major:           [0, 2, 4, 5, 7, 9, 11],
  minor:           [0, 2, 3, 5, 7, 8, 10],
  dorian:          [0, 2, 3, 5, 7, 9, 10],
  phrygian:        [0, 1, 3, 5, 7, 8, 10],
  lydian:          [0, 2, 4, 6, 7, 9, 11],
  mixolydian:      [0, 2, 4, 5, 7, 9, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  harmonicMinor:   [0, 2, 3, 5, 7, 8, 11],   // the raised 7th gives it that eerie, spooky pull
}


// ─────────────────────────────────────────────────────────────
// SYNTH PRESETS — each returns a Tone instrument supporting
// .triggerAttackRelease(note, duration, time, velocity)
// ─────────────────────────────────────────────────────────────

function makeSynth(preset) {
  switch (preset) {
    case 'warmPad':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope:   { attack: 0.6, decay: 0.3, sustain: 0.7, release: 2.5 },
        volume: -4,
      })
    case 'airyPad':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope:   { attack: 1.2, decay: 0.4, sustain: 0.8, release: 3.5 },
        volume: -3,
      })
    case 'pluck':
      return new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.9 })
    case 'lonePiano':
      return new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope:   { attack: 0.005, decay: 0.5, sustain: 0.08, release: 1.4 },
      })
    case 'sine':
      return new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope:   { attack: 0.02, decay: 0.2, sustain: 0.5, release: 1.2 },
      })
    case 'square':
      return new Tone.Synth({
        oscillator: { type: 'square' },
        envelope:   { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.4 },
        volume: -8,   // square waves are hot — trim so arcade doesn't pierce
      })
    case 'softBell':
      return new Tone.FMSynth({
        harmonicity: 3, modulationIndex: 6,
        envelope: { attack: 0.01, decay: 0.6, sustain: 0.1, release: 1.6 },
        volume: -4,
      })
    case 'strings':
      // Mellow, bowed pad — sawtooth tamed by a low-pass filter so it
      // reads as calm/haunting strings rather than a buzzy synth.
      return new Tone.PolySynth(Tone.MonoSynth, {
        oscillator:     { type: 'sawtooth' },
        filter:         { type: 'lowpass', rolloff: -24 },
        filterEnvelope: { attack: 0.6, decay: 0.4, sustain: 0.6, release: 2.0, baseFrequency: 300, octaves: 3 },
        envelope:       { attack: 0.7, decay: 0.3, sustain: 0.8, release: 2.6 },
        volume: -7,
      })
    default:
      return new Tone.Synth()
  }
}


// ─────────────────────────────────────────────────────────────
// ENGINE STATE
// ─────────────────────────────────────────────────────────────

let _started  = false   // audio graph built (context unlocked)
let _playing  = false
let _params   = MUSIC[DEFAULT_VIBE]
let _vibe     = DEFAULT_VIBE
let _preset   = null     // current lead synth preset

let _master, _vibeVol, _reverb, _bass, _lead, _loop
let _step   = 0          // eighth-note counter
let _degree = 0          // current scale-degree of the melodic walk


// ─────────────────────────────────────────────────────────────
// NOTE MATH
// ─────────────────────────────────────────────────────────────

function degreeToMidi(degree, scale, rootMidi) {
  const n   = scale.length
  const oct = Math.floor(degree / n)
  const idx = ((degree % n) + n) % n
  return rootMidi + oct * 12 + scale[idx]
}

function midiToNote(midi) {
  return Tone.Frequency(midi, 'midi').toNote()
}


// ─────────────────────────────────────────────────────────────
// PER-STEP GENERATOR — a melodic random walk over the scale,
// gated by density, with a gentle pull back toward center range.
// ─────────────────────────────────────────────────────────────

function _tick(time) {
  const p        = _params
  const scale    = SCALES[p.scale] || SCALES.major
  const rootMidi = Tone.Frequency(`${p.root}${p.octave}`).toMidi()
  _step++

  // Bass root once per bar (8 eighth-notes) for harmonic grounding
  if (_bass && _step % 8 === 1) {
    _bass.triggerAttackRelease(midiToNote(rootMidi - 12), '2n', time, 0.5)
  }

  // Melody — density decides note vs. rest
  if (Math.random() >= p.density) return

  // Walk: mostly steps, occasional small/large leaps
  const r = Math.random()
  const dir = Math.random() < 0.5 ? -1 : 1
  let move
  if      (r < 0.55) move = dir * 1
  else if (r < 0.85) move = dir * 2
  else               move = dir * 3
  _degree += move

  // Keep within roughly two octaves of the tonic
  const span = scale.length * 2
  if (_degree >  span)            _degree -= scale.length
  if (_degree < -scale.length)    _degree += scale.length

  const note = midiToNote(degreeToMidi(_degree, scale, rootMidi))
  const dur  = r < 0.7 ? '8n' : (r < 0.9 ? '4n' : '16n')
  const vel  = 0.4 + Math.random() * 0.35

  _lead.triggerAttackRelease(note, dur, time, vel)
}


// ─────────────────────────────────────────────────────────────
// AUDIO GRAPH
// ─────────────────────────────────────────────────────────────

function _buildLead(preset) {
  _lead   = makeSynth(preset)
  _lead.connect(_reverb)
  _preset = preset
}

function _swapLead(preset) {
  const old = _lead
  _buildLead(preset)
  // Let the old voice's tails ring out, then release it
  if (old) setTimeout(() => old.dispose(), 2500)
}

function _build() {
  _master  = new Tone.Volume(MASTER_VOLUME_DB).toDestination()
  _vibeVol = new Tone.Volume(_params.volume ?? 0).connect(_master)
  _reverb  = new Tone.Reverb({ decay: 4, wet: _params.reverb ?? 0.4 }).connect(_vibeVol)

  _bass = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope:   { attack: 0.05, decay: 0.4, sustain: 0.6, release: 1.5 },
    volume: -11,
  }).connect(_vibeVol)

  _buildLead(_params.synth)

  _loop = new Tone.Loop(_tick, '8n')
  _loop.humanize = true
  _started = true
}


// ─────────────────────────────────────────────────────────────
// VIBE SYNC
// ─────────────────────────────────────────────────────────────

function _safeActiveVibe() {
  try {
    const v = getActiveVibe()
    return MUSIC[v] ? v : DEFAULT_VIBE
  } catch {
    return DEFAULT_VIBE
  }
}

/** Re-tune the music to a vibe. Glides tempo/space/level; swaps timbre. */
export function setMusicVibe(name) {
  if (!MUSIC[name]) return
  _vibe   = name
  _params = MUSIC[name]
  if (!_started || !_playing) return   // will take effect on next start

  Tone.getTransport().bpm.rampTo(_params.bpm, 2.5)
  if (_reverb)  _reverb.wet.rampTo(_params.reverb ?? 0.4, 2)
  if (_vibeVol) _vibeVol.volume.rampTo(_params.volume ?? 0, 1.5)
  if (_preset !== _params.synth) _swapLead(_params.synth)
}


// ─────────────────────────────────────────────────────────────
// TRANSPORT CONTROL
// ─────────────────────────────────────────────────────────────

async function _start() {
  await Tone.start()   // unlock audio context (must be inside a user gesture)

  // Begin in sync with whatever vibe the world is currently showing
  _vibe   = _safeActiveVibe()
  _params = MUSIC[_vibe]

  if (!_started)                       _build()
  else if (_preset !== _params.synth)  _swapLead(_params.synth)

  const t = Tone.getTransport()
  t.bpm.value       = _params.bpm
  _reverb.wet.value = _params.reverb ?? 0.4
  _vibeVol.volume.value = _params.volume ?? 0

  _step   = 0
  _degree = 0
  _loop.start(0)
  t.start()

  // Fade in so it doesn't slam on
  _master.volume.value = -60
  _master.volume.rampTo(MASTER_VOLUME_DB, 1.5)
  _playing = true
}

function _stop() {
  _playing = false
  if (!_started) return
  _master.volume.rampTo(-60, 0.6)
  setTimeout(() => {
    if (_playing) return   // toggled back on during the fade — leave it running
    _loop.stop()
    Tone.getTransport().stop()
  }, 700)
}


// ─────────────────────────────────────────────────────────────
// PUBLIC TOGGLE
// ─────────────────────────────────────────────────────────────

/** Toggle music. Returns the new playing state (true = now playing). */
export async function toggleMusic() {
  if (_playing) {
    _stop()
    return false
  }
  await _start()
  return true
}

export function isMusicPlaying() {
  return _playing
}
