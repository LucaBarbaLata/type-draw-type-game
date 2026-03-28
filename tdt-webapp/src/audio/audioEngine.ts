let ctx: AudioContext | null = null;
let muted = false;

function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

export function playRoundStart(): void {
  if (muted) return;
  const ac = getAudioContext();
  const now = ac.currentTime;

  const notes = [293.66, 440.0];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq * 0.5, now + i * 0.12);
    osc.frequency.exponentialRampToValueAtTime(freq, now + i * 0.12 + 0.08);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, now + i * 0.12);
    filter.frequency.exponentialRampToValueAtTime(4000, now + i * 0.12 + 0.25);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.5);
  });
}

export function playUrgentStart(): void {
  if (muted) return;
  const ac = getAudioContext();
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

export function playUrgentTick(): void {
  if (muted) return;
  const ac = getAudioContext();
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.08);

  const bufferSize = Math.floor(ac.sampleRate * 0.02);
  const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  const noiseGain = ac.createGain();
  const noiseFilter = ac.createBiquadFilter();
  noise.buffer = noiseBuffer;
  noiseFilter.type = "highpass";
  noiseFilter.frequency.setValueAtTime(3000, now);
  noiseGain.gain.setValueAtTime(0.15, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.02);
}

export function playTimerExpire(): void {
  if (muted) return;
  const ac = getAudioContext();
  const now = ac.currentTime;

  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.18;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, t);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  const bufferSize = Math.floor(ac.sampleRate * 0.6);
  const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  const noiseGain = ac.createGain();
  const noiseFilter = ac.createBiquadFilter();
  noise.buffer = noiseBuffer;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(200, now);
  noiseFilter.Q.setValueAtTime(0.5, now);
  noiseGain.gain.setValueAtTime(0.3, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.6);
}

export function playSubmitSuccess(): void {
  if (muted) return;
  const ac = getAudioContext();
  const now = ac.currentTime;

  const bufferSize = Math.floor(ac.sampleRate * 0.35);
  const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const noiseGain = ac.createGain();
  noise.buffer = noiseBuffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(8000, now + 0.3);
  filter.Q.setValueAtTime(2, now);
  noiseGain.gain.setValueAtTime(0.3, now);
  noiseGain.gain.linearRampToValueAtTime(0.4, now + 0.1);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.35);

  const osc = ac.createOscillator();
  const oscGain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now + 0.2);
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.4);
  oscGain.gain.setValueAtTime(0, now + 0.2);
  oscGain.gain.linearRampToValueAtTime(0.2, now + 0.25);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  osc.connect(oscGain);
  oscGain.connect(ac.destination);
  osc.start(now + 0.2);
  osc.stop(now + 0.55);
}

export function playRevealPop(): void {
  if (muted) return;
  const ac = getAudioContext();
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.2);

  const osc2 = ac.createOscillator();
  const gain2 = ac.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(1200, now);
  gain2.gain.setValueAtTime(0.15, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc2.connect(gain2);
  gain2.connect(ac.destination);
  osc2.start(now);
  osc2.stop(now + 0.1);
}

export function playFanfare(): void {
  if (muted) return;
  const ac = getAudioContext();
  const now = ac.currentTime;

  const freqs = [261.63, 329.63, 392.0, 523.25];
  freqs.forEach((freq, i) => {
    const t = now + i * 0.1;
    const osc = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(freq * 1.003, t);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
    gain.gain.setValueAtTime(0.15, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.9);
    osc2.stop(t + 0.9);
  });
}

export function playExplosionPop(): void {
  if (muted) return;
  const ac = getAudioContext();
  const now = ac.currentTime;

  const basePitch = 80 + Math.random() * 60;
  const bufferSize = Math.floor(ac.sampleRate * 0.15);
  const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const noiseGain = ac.createGain();
  noise.buffer = noiseBuffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(basePitch * 30, now);
  filter.frequency.exponentialRampToValueAtTime(basePitch * 5, now + 0.1);
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.15);
}

export function playMuteToggle(unmuting: boolean): void {
  const ac = getAudioContext();
  const now = ac.currentTime;
  const freq = unmuting ? 880 : 220;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}
