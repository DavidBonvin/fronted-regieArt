const MUTE_KEY = 'regieart_notif_muted';

let ctx: AudioContext | null = null;

export function isNotificationMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export function setNotificationMuted(muted: boolean): void {
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
}

/** Two soft sine notes. Synthesised so no audio asset ships with the bundle. */
export function playNotificationChime(): void {
  if (isNotificationMuted()) return;

  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    // Browsers keep the context suspended until the page has been interacted with.
    if (ctx.state === 'suspended') void ctx.resume();

    const start = ctx.currentTime;
    [
      { freq: 880, at: 0 },
      { freq: 1174.66, at: 0.09 },
    ].forEach(({ freq, at }) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const t = start + at;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);

      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  } catch { /* audio unavailable */ }
}
