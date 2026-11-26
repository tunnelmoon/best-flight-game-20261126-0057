// Ridgeline Run: procedural sound, no audio files.
// One clear job: engine drone, wind, chimes and thuds, all synthesized.

export function makeAudio() {
  const audio = {
    ctx: null,
    engineOsc: null,
    engineGain: null,
    windSource: null,
    windGain: null,
    windFilter: null,
    enabled: false,
    muted: false,
  };
  return audio;
}

export function unlockAudio(audio) {
  if (audio.ctx || audio.enabled) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.enabled = true;
  } catch {
    audio.enabled = false;
  }
  if (!audio.enabled) return;
  const ctx = audio.ctx;

  // Engine: two detuned sawtooth oscillators through a low-pass filter.
  audio.engineOsc = ctx.createOscillator();
  audio.engineOsc.type = 'sawtooth';
  audio.engineOsc.frequency.value = 62;
  const engineOsc2 = ctx.createOscillator();
  engineOsc2.type = 'sawtooth';
  engineOsc2.frequency.value = 93;
  audio.engineGain = ctx.createGain();
  audio.engineGain.gain.value = 0;
  const engineFilter = ctx.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 320;
  audio.engineOsc.connect(engineFilter);
  engineOsc2.connect(engineFilter);
  engineFilter.connect(audio.engineGain);
  audio.engineGain.connect(ctx.destination);
  audio.engineOsc.start();
  engineOsc2.start();
  audio.engineOsc2 = engineOsc2;

  // Wind: looped noise through a band-pass filter.
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;
  audio.windSource = ctx.createBufferSource();
  audio.windSource.buffer = buffer;
  audio.windSource.loop = true;
  audio.windFilter = ctx.createBiquadFilter();
  audio.windFilter.type = 'bandpass';
  audio.windFilter.frequency.value = 700;
  audio.windFilter.Q.value = 0.6;
  audio.windGain = ctx.createGain();
  audio.windGain.gain.value = 0;
  audio.windSource.connect(audio.windFilter);
  audio.windFilter.connect(audio.windGain);
  audio.windGain.connect(ctx.destination);
  audio.windSource.start();
}

// Called every frame with the plane's state; keeps the drone in step.
export function updateAudio(audio, plane) {
  if (!audio.enabled || !audio.ctx) return;
  const t = audio.ctx.currentTime;
  const throttle = plane.throttle;
  const speed = plane.speed;
  audio.engineOsc.frequency.setTargetAtTime(58 + throttle * 55 + speed * 0.35, t, 0.1);
  audio.engineOsc2.frequency.setTargetAtTime(87 + throttle * 82 + speed * 0.5, t, 0.1);
  audio.engineGain.gain.setTargetAtTime(plane.onGround && speed < 2 ? 0.012 : 0.02 + throttle * 0.05, t, 0.15);
  audio.windGain.gain.setTargetAtTime(Math.min(0.09, speed * 0.0011), t, 0.2);
  audio.windFilter.frequency.setTargetAtTime(400 + speed * 9, t, 0.2);
}

function blip(audio, freq, dur, type, vol, when = 0) {
  if (!audio.enabled || !audio.ctx) return;
  const ctx = audio.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + when;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function chimeRing(audio) {
  blip(audio, 880, 0.5, 'sine', 0.16);
  blip(audio, 1318, 0.6, 'sine', 0.1, 0.08);
}

export function chimeParcel(audio) {
  blip(audio, 660, 0.4, 'sine', 0.14);
  blip(audio, 990, 0.5, 'sine', 0.12, 0.1);
}

export function thud(audio) {
  blip(audio, 70, 0.35, 'triangle', 0.3);
  blip(audio, 48, 0.5, 'sine', 0.25, 0.02);
}

export function fanfare(audio) {
  [523, 659, 784, 1046].forEach((f, i) => blip(audio, f, 0.45, 'triangle', 0.12, i * 0.11));
}
