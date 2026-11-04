import { useCallback, useEffect, useRef, useState } from 'react';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

const ALARM_EVERY_MS = 3000;
const ALARM_FOR_MS = 60_000;

let audio: AudioContext | null = null;

function chime() {
  try {
    navigator.vibrate?.([200, 100, 200]);
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    // One shared context: browsers cap how many can be open at once.
    audio ??= new Ctx();
    const ctx = audio;
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.32);
    });
  } catch {
    // Sound is a nice-to-have.
  }
}

/**
 * Countdown that stays accurate when the tab is throttled (it tracks the end time).
 * When it reaches zero the alarm repeats until stopAlarm() or reset(), for up to a minute.
 * Changing `resetKey` (e.g. the step number) starts it over.
 */
export function useTimer(totalSeconds: number, resetKey?: unknown) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [ringing, setRinging] = useState(false);
  const endAt = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(totalSeconds);
    setStatus('idle');
    setRinging(false);
    endAt.current = null;
  }, [totalSeconds, resetKey]);

  useEffect(() => {
    if (status !== 'running') return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round(((endAt.current ?? 0) - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setStatus('done');
        setRinging(true);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (!ringing) return;
    chime();
    const repeat = window.setInterval(chime, ALARM_EVERY_MS);
    const stop = window.setTimeout(() => setRinging(false), ALARM_FOR_MS);
    return () => {
      window.clearInterval(repeat);
      window.clearTimeout(stop);
    };
  }, [ringing]);

  const start = useCallback(() => {
    endAt.current = Date.now() + remaining * 1000;
    setStatus('running');
  }, [remaining]);

  const pause = useCallback(() => setStatus('paused'), []);

  const stopAlarm = useCallback(() => setRinging(false), []);

  const reset = useCallback(() => {
    endAt.current = null;
    setRinging(false);
    setRemaining(totalSeconds);
    setStatus('idle');
  }, [totalSeconds]);

  return { remaining, status, ringing, start, pause, resume: start, reset, stopAlarm, total: totalSeconds };
}
