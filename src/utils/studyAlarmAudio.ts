/**
 * Alarme sonoro local via Web Audio API (sem arquivos externos ou dependências).
 */

let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

/**
 * Libera o AudioContext a partir de uma interação explícita do usuário
 * (ex: clique em "Iniciar estudo", "Retomar" ou "Testar som").
 */
export async function unlockStudyAlarmAudio(): Promise<boolean> {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

/**
 * Toca sequência curta de 3 bipes distintos e suaves quando uma fase zera.
 * Retorna { played, blocked }.
 */
export async function playStudyAlarmChime(): Promise<{ played: boolean; blocked: boolean }> {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return { played: false, blocked: true };

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return { played: false, blocked: true };
      }
    }

    if (ctx.state !== 'running') {
      return { played: false, blocked: true };
    }

    const now = ctx.currentTime;
    const notes = [880, 1108.73, 1318.51]; // A5 -> C#6 -> E6

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.22;
      const stop = start + 0.18;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(stop + 0.01);
    });

    return { played: true, blocked: false };
  } catch {
    return { played: false, blocked: true };
  }
}
