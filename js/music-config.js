// ═══════════════════════════════════════════════════════════
// music-config.js — YOUR creative controls for the background music
//
// This is the authorship surface. The engine in music.js reads
// these values and generates endless, evolving music — no audio
// files, no loops. Tune everything freely; this is yours.
//
// Per-vibe fields:
//   scale    : which scale the melody is drawn from.
//              One of: major, minor, dorian, phrygian, lydian,
//              mixolydian, majorPentatonic, minorPentatonic, harmonicMinor
//   root     : tonic note name — C D E F G A B (add # for sharps, e.g. 'F#')
//   octave   : base octave of the melody (higher = brighter, thinner)
//   bpm      : tempo in beats per minute
//   density  : 0..1 — chance each step plays a note vs. rests
//              (0.2 = sparse & spacious, 0.8 = busy & active)
//   synth    : timbre preset. One of:
//              warmPad, airyPad, pluck, lonePiano, sine, square, softBell, strings
//   reverb   : 0..1 — wet amount (0 = dry/close, 1 = huge/washy space)
//   volume   : per-vibe level trim in dB (0 = default, -6 = quieter, +3 = louder)
//
// Keys MUST match the vibe keys used across the app:
//   suave · carnival · noir · blueprint · midnight_arcade · pastel · aurora
// ═══════════════════════════════════════════════════════════

export const MUSIC = {
  suave:           { scale: 'minorPentatonic', root: 'C',  octave: 3, bpm: 68,  density: 0.40, synth: 'warmPad',   reverb: 0.50, volume: 0 },
  carnival:        { scale: 'harmonicMinor',    root: 'A',  octave: 3, bpm: 60,  density: 0.30, synth: 'strings',   reverb: 0.60, volume: 0 },
  noir:            { scale: 'phrygian',        root: 'A',  octave: 3, bpm: 56,  density: 0.25, synth: 'lonePiano', reverb: 0.60, volume: 0 },
  blueprint:       { scale: 'dorian',          root: 'E',  octave: 3, bpm: 88,  density: 0.50, synth: 'sine',      reverb: 0.30, volume: 0 },
  midnight_arcade: { scale: 'majorPentatonic', root: 'G',  octave: 4, bpm: 124, density: 0.60, synth: 'pluck',     reverb: 0.25, volume: 0 },
  pastel:          { scale: 'majorPentatonic', root: 'G',  octave: 4, bpm: 76,  density: 0.45, synth: 'softBell',  reverb: 0.45, volume: 0 },
  aurora:          { scale: 'lydian',          root: 'D',  octave: 4, bpm: 64,  density: 0.35, synth: 'airyPad',   reverb: 0.70, volume: 0 },
}

// Master level for the whole system, in dB. Lower = quieter overall.
export const MASTER_VOLUME_DB = -9

// Fallback vibe if the engine starts before any vibe is known.
export const DEFAULT_VIBE = 'suave'
