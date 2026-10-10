// Generate a crisp high-priority order bell alert WAV file and save as /public/alerta-pedido.mp3
import fs from 'fs';
import path from 'path';

function generateAlertChime() {
  const sampleRate = 44100;
  const duration = 1.2; // seconds
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20);  // audio format (PCM)
  buffer.writeUInt16LE(1, 22);  // num channels (Mono)
  buffer.writeUInt32LE(sampleRate, 24); // sample rate
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Synthesize 3-tone bright ringing McDonald's / Fast-food style kitchen alert chime
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Tone 1: 1046.5 Hz (C6) at t = 0 to 0.4s
    if (t >= 0 && t < 0.45) {
      const env1 = Math.exp(-6 * t);
      sample += 0.35 * Math.sin(2 * Math.PI * 1046.5 * t) * env1;
      sample += 0.15 * Math.sin(2 * Math.PI * 2093.0 * t) * env1;
    }

    // Tone 2: 1318.5 Hz (E6) at t = 0.15 to 0.7s
    if (t >= 0.15 && t < 0.75) {
      const t2 = t - 0.15;
      const env2 = Math.exp(-5.5 * t2);
      sample += 0.4 * Math.sin(2 * Math.PI * 1318.5 * t) * env2;
      sample += 0.18 * Math.sin(2 * Math.PI * 2637.0 * t) * env2;
    }

    // Tone 3: 2093.0 Hz (C7) high bell chime at t = 0.3 to 1.2s
    if (t >= 0.3) {
      const t3 = t - 0.3;
      const env3 = Math.exp(-4 * t3);
      sample += 0.5 * Math.sin(2 * Math.PI * 2093.0 * t) * env3;
      sample += 0.25 * Math.sin(2 * Math.PI * 3135.9 * t) * env3;
      sample += 0.1 * Math.sin(2 * Math.PI * 4186.0 * t) * env3;
    }

    // Clamp to 16-bit signed integer
    const clamped = Math.max(-1, Math.min(1, sample));
    const intVal = Math.floor(clamped * 32767);
    buffer.writeInt16LE(intVal, 44 + i * 2);
  }

  const outPath = path.join(process.cwd(), 'public', 'alerta-pedido.mp3');
  fs.writeFileSync(outPath, buffer);
  console.log(`Generated high-priority order alert chime at ${outPath} (${buffer.length} bytes)`);
}

generateAlertChime();
