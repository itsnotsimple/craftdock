/**
 * Sound Effects utility using Web Audio API
 * Generates authentic, clean Minecraft-style sound effects directly in the browser/Chromium
 * without requiring external sound files or third-party audio libraries.
 * 100% cross-platform (Windows & macOS).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.error('[SoundEffects] Failed to initialize AudioContext:', e);
    return null;
  }
}

/**
 * Play an authentic Minecraft Level-Up / Ding celebratory chime
 * A sequence of crisp, bell-like ascending notes with harmonic decay
 */
export function playMinecraftStartupSound(volume = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz), E6 (1318.51Hz)
  const notes = [
    { freq: 523.25, time: 0.00, dur: 0.25 },
    { freq: 659.25, time: 0.08, dur: 0.25 },
    { freq: 783.99, time: 0.16, dur: 0.25 },
    { freq: 1046.5, time: 0.24, dur: 0.45 },
    { freq: 1318.51, time: 0.32, dur: 0.65 },
  ];

  notes.forEach(({ freq, time, dur }) => {
    const startTime = now + time;

    // Primary bell tone (sine)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Exponential decay envelope
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + dur);

    // Harmonic sparkle (octave + 5th overtone)
    const sparkleOsc = ctx.createOscillator();
    const sparkleGain = ctx.createGain();

    sparkleOsc.type = 'triangle';
    sparkleOsc.frequency.setValueAtTime(freq * 2, startTime);

    sparkleGain.gain.setValueAtTime(0.0001, startTime);
    sparkleGain.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.01);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur * 0.7);

    sparkleOsc.connect(sparkleGain);
    sparkleGain.connect(ctx.destination);

    sparkleOsc.start(startTime);
    sparkleOsc.stop(startTime + dur * 0.7);
  });
}

/**
 * Play classic Minecraft Experience Orb pickup sound (quick crystal pop)
 */
export function playMinecraftOrbSound(volume = 0.25): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * Play Backup Completed confirmation chime (pleasant ascending dual crystal pop)
 */
export function playMinecraftBackupSound(volume = 0.28): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 783.99, time: 0.00, dur: 0.18 }, // G5
    { freq: 1174.66, time: 0.10, dur: 0.35 }, // D6
  ];

  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0.0001, now + time);
    gain.gain.linearRampToValueAtTime(volume, now + time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });
}

/**
 * Play welcoming Player Join chime (two ascending soft bell tones)
 */
export function playMinecraftJoinSound(volume = 0.25): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 659.25, time: 0.00, dur: 0.20 }, // E5
    { freq: 987.77, time: 0.10, dur: 0.35 }, // B5
  ];

  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0.0001, now + time);
    gain.gain.linearRampToValueAtTime(volume, now + time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });
}

/**
 * Play Crash / Error warning tone (two soft low warning pulses)
 */
export function playMinecraftCrashSound(volume = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 329.63, time: 0.00, dur: 0.25 }, // E4
    { freq: 261.63, time: 0.15, dur: 0.40 }, // C4
  ];

  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0.0001, now + time);
    gain.gain.linearRampToValueAtTime(volume, now + time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });
}
