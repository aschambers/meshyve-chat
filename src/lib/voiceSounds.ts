function playBuzz(
  ctx: AudioContext,
  startFreq: number,
  endFreq: number,
  startOffset: number,
  duration: number,
  peakGain: number
) {
  const osc = ctx.createOscillator();
  const vibratoLFO = ctx.createOscillator();
  const vibratoGain = ctx.createGain();
  const envGain = ctx.createGain();

  osc.type = 'sawtooth';
  vibratoLFO.type = 'sine';
  vibratoLFO.frequency.setValueAtTime(55, ctx.currentTime); // wing-beat rate
  vibratoGain.gain.setValueAtTime(18, ctx.currentTime); // ±18Hz pitch wobble

  vibratoLFO.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);
  osc.connect(envGain);
  envGain.connect(ctx.destination);

  const start = ctx.currentTime + startOffset;
  osc.frequency.setValueAtTime(startFreq, start);
  osc.frequency.linearRampToValueAtTime(endFreq, start + duration);

  envGain.gain.setValueAtTime(0, start);
  envGain.gain.linearRampToValueAtTime(peakGain, start + 0.01);
  envGain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.start(start);
  vibratoLFO.start(start);
  osc.stop(start + duration);
  vibratoLFO.stop(start + duration);
  return osc;
}

export async function playMuteSound(muting: boolean) {
  try {
    const ctx = new AudioContext();
    await ctx.resume();
    // Muting: buzz glides down (bee going quiet); unmuting: glides up (bee waking up)
    const osc = muting
      ? playBuzz(ctx, 300, 160, 0.05, 0.22, 0.35)
      : playBuzz(ctx, 160, 300, 0.05, 0.22, 0.35);
    osc.onended = () => ctx.close();
  } catch {}
}

export async function playDeafenSound(deafening: boolean) {
  try {
    const ctx = new AudioContext();
    await ctx.resume();
    // Three short descending buzzes for deafen, ascending for undeafen
    const pairs = deafening
      ? ([
          [300, 240],
          [240, 190],
          [190, 150],
        ] as const)
      : ([
          [150, 190],
          [190, 240],
          [240, 300],
        ] as const);
    pairs.forEach(([startF, endF], i) => {
      const osc = playBuzz(ctx, startF, endF, 0.05 + i * 0.1, 0.12, 0.3);
      if (i === 2) osc.onended = () => ctx.close();
    });
  } catch {}
}

function playNote(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  peakGain: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
  const start = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start);
  osc.stop(start + duration);
  return osc;
}

export async function playJoinSound() {
  try {
    const ctx = new AudioContext();
    await ctx.resume();
    // Two ascending notes (C5 → G5), warm triangle wave, bell-like decay
    playNote(ctx, 523.25, 0.05, 0.4, 0.4);
    const last = playNote(ctx, 783.99, 0.22, 0.5, 0.4);
    last.onended = () => ctx.close();
  } catch {}
}

export async function playLeaveSound() {
  try {
    const ctx = new AudioContext();
    await ctx.resume();
    // Two descending notes (G5 → C5), slightly softer
    playNote(ctx, 783.99, 0.05, 0.35, 0.35);
    const last = playNote(ctx, 523.25, 0.22, 0.45, 0.3);
    last.onended = () => ctx.close();
  } catch {}
}
