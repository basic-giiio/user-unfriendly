const SOUND_NOTES = {
  click: [880, 660],
  start: [523, 659, 784],
  keep: [659, 784, 988],
  delete: [784, 587, 392],
  blocked: [220, 196, 164],
  trash: [660, 523, 392, 294],
};

export function synthesizeRetroSound(context, kind = 'click') {
  const notes = SOUND_NOTES[kind] ?? SOUND_NOTES.click;
  const spacing = kind === 'trash' ? 0.075 : kind === 'start' ? 0.07 : 0.045;
  const duration = kind === 'trash' ? 0.095 : 0.055;
  const startAt = context.currentTime;
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const at = startAt + index * spacing;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.035, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + duration);
  });
  return notes.length;
}

export const RETRO_SOUND_NOTES = SOUND_NOTES;

let audioContext;

export function playRetroSound(kind = 'click', Context = globalThis.AudioContext ?? globalThis.webkitAudioContext) {
  if (!Context) return false;
  try {
    audioContext ??= new Context();
    if (audioContext.state === 'suspended') void audioContext.resume();
    synthesizeRetroSound(audioContext, kind);
    return true;
  } catch {
    return false;
  }
}
