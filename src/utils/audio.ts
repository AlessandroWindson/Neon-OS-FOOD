// Web Audio API Sound Synthesizer for Neon Food OS

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

export function playBeep(freq = 880, duration = 0.08, type: OscillatorType = 'sine') {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio safe fallback
  }
}

export function playKitchenBell() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // High impact fast-food order chime (two harmonic bells with resonant decay)
    const now = ctx.currentTime;
    
    // Note 1 (High bell chime)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1318.51, now); // E6
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.35);
    gain1.gain.setValueAtTime(0.45, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Note 2 (Resonant golden chime - McDonald's order alert style)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now + 0.12); // A6
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.65);
    gain2.gain.setValueAtTime(0.5, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.7);
  } catch (e) {}
}

export function playLoudOrderAlert() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Energetic Triple Ding fast-food alert
    [
      { freq: 1046.50, time: 0, dur: 0.18, vol: 0.5 },   // C6
      { freq: 1318.51, time: 0.15, dur: 0.22, vol: 0.55 }, // E6
      { freq: 2093.00, time: 0.32, dur: 0.5, vol: 0.6 }   // C7 (High ringing chime)
    ].forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.time);
      gain.gain.setValueAtTime(note.vol, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur);
    });
  } catch (e) {}
}

export function playCashRegister() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Two rapid cheerful notes
    playBeep(987.77, 0.1, 'sine');
    setTimeout(() => {
      playBeep(1318.51, 0.25, 'triangle');
    }, 100);
  } catch (e) {}
}

export function playAlert() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(330, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}

export function playLevelUp() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        playBeep(freq, 0.12, 'triangle');
      }, i * 75);
    });
  } catch (e) {}
}

export function playSoftClickSound(pitchModifier = 1.0) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    
    // High click transient (snappy and soft tactile haptic tick)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1350 * pitchModifier, now);
    osc.frequency.exponentialRampToValueAtTime(300 * pitchModifier, now + 0.024);
    
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.024);

    // Warm organic body impulse for a smooth, high-end switch feel
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(260 * pitchModifier, now);
    subOsc.frequency.exponentialRampToValueAtTime(80, now + 0.032);

    subGain.gain.setValueAtTime(0.06, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.032);
  } catch (e) {}
}

export function playCategoryToggleSound(opening = true) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startFreq = opening ? 480 : 720;
    const endFreq = opening ? 760 : 480;
    const duration = 0.08;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {}
}

export function playPageTransitionSound(viewType?: string) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let startFreq = 659.25; // E5
    let endFreq = 880.00;   // A5
    let duration = 0.08;
    let waveType: OscillatorType = 'sine';

    if (viewType === 'cardapio_digital' || viewType === 'cardapio_bcg') {
      startFreq = 880;
      endFreq = 1318.51; // High crisp golden chime
      duration = 0.11;
      waveType = 'triangle';
    } else if (viewType === 'pdv') {
      startFreq = 987.77;
      endFreq = 1479.98; // Upbeat cash register chirp
      duration = 0.09;
    } else if (viewType === 'kds') {
      startFreq = 1174.66;
      endFreq = 880.00; // Resonant kitchen bell tone
      duration = 0.12;
      waveType = 'triangle';
    } else if (viewType === 'central_pedidos') {
      startFreq = 783.99;
      endFreq = 1046.50; // Dynamic order notification chirp
      duration = 0.08;
    } else if (viewType === 'mesas_comandas') {
      startFreq = 587.33;
      endFreq = 880.00;
      duration = 0.08;
    } else if (viewType === 'atendente_mobile') {
      startFreq = 740.0;
      endFreq = 1108.73;
      duration = 0.08;
    } else if (viewType === 'delivery_gestao') {
      startFreq = 659.25;
      endFreq = 987.77;
      duration = 0.09;
    } else if (viewType === 'financeiro_dre') {
      startFreq = 523.25;
      endFreq = 783.99;
      duration = 0.10;
    } else if (viewType === 'meu_plano') {
      startFreq = 523.25;
      endFreq = 1046.50; // Royal ascending chime
      duration = 0.14;
      waveType = 'triangle';
    }

    osc.type = waveType;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {}
}

