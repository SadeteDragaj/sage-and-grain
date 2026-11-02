import { useEffect, useRef, useState } from 'react';
import type { Ingredient, Recipe } from '../lib/types';
import { clock, ingredientName, scaledQuantity } from '../lib/format';
import { useTimer } from '../lib/useTimer';
import { Icon } from './Icon';

const TEXT_SIZES = [24, 28, 34];

type WakeLockSentinelLike = { release: () => Promise<void> };

type Timer = ReturnType<typeof useTimer>;

function timerLength(seconds: number) {
  const m = Math.round(seconds / 60);
  return m === 1 ? '1 minute' : `${m} minutes`;
}

/** "2 tbsp curry powder" — the short form used in "For this step". */
function shortIngredient(ing: Ingredient, factor: number) {
  return `${scaledQuantity(ing, factor)} ${ing.item}`.trim();
}

function StepTimer({ t, doneNote }: { t: Timer; doneNote: string | null }) {
  const progress = 1 - t.remaining / t.total;
  const label = { idle: 'Ready', running: 'Running', paused: 'Paused', done: "Time's up" }[t.status];

  if (t.status === 'done') {
    return (
      <section className="cook-timer is-done" aria-label="Step timer" role="alert">
        <span className="cook-timer-bell">
          <Icon name="bell" size={32} />
        </span>
        <span className="cook-timer-clock">{clock(0)}</span>
        <span className="cook-timer-title">Time's up — {timerLength(t.total)} done</span>
        <span className="cook-timer-msg">{doneNote ?? 'Check it, then move on.'}</span>
        <div className="cook-timer-actions">
          <button type="button" className="btn btn-lg btn-on-dark" onClick={t.reset} aria-label={`Restart the ${timerLength(t.total)} timer`}>
            <Icon name="reset" /> Restart
          </button>
          {t.ringing && (
            <button type="button" className="btn btn-lg btn-light grow" onClick={t.stopAlarm}>
              Stop alarm
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="cook-timer" aria-label="Step timer">
      <div className="cook-timer-ring">
        <svg viewBox="0 0 184 184" aria-hidden="true">
          <circle cx="92" cy="92" r="84" className="ring-track" />
          <circle cx="92" cy="92" r="84" className="ring-fill" strokeDasharray="527.8" strokeDashoffset={(527.8 * (1 - progress)).toFixed(1)} />
        </svg>
        <div className="cook-timer-readout" role="timer" aria-live="off">
          <span className="cook-timer-clock">{clock(t.remaining)}</span>
          <span className="cook-timer-status">{label}</span>
        </div>
      </div>
      <div className="cook-timer-actions">
        {t.status === 'idle' && (
          <button type="button" className="btn btn-primary btn-lg grow" onClick={t.start}>
            <Icon name="play" /> Start {clock(t.total)}
          </button>
        )}
        {t.status === 'running' && (
          <button type="button" className="btn btn-primary btn-lg grow" onClick={t.pause}>
            <Icon name="pause" /> Pause
          </button>
        )}
        {t.status === 'paused' && (
          <button type="button" className="btn btn-primary btn-lg grow" onClick={t.resume}>
            <Icon name="play" /> Resume
          </button>
        )}
        <button type="button" className="btn btn-lg btn-outline" onClick={t.reset} aria-label={`Reset timer to ${timerLength(t.total)}`}>
          <Icon name="reset" /> Reset
        </button>
      </div>
    </section>
  );
}

interface Props {
  recipe: Recipe;
  servings: number;
  onClose: () => void;
}

/**
 * Full-screen overlay on the recipe URL (no new indexable page). No ads, popups or login.
 */
export function CookingMode({ recipe, servings, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [size, setSize] = useState(1);
  const [sheet, setSheet] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [awake, setAwake] = useState(false);
  const [wakeSupported, setWakeSupported] = useState(true);
  const lock = useRef<WakeLockSentinelLike | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const factor = servings / recipe.servings;
  const total = recipe.steps.length;
  const current = recipe.steps[step];
  const last = step === total - 1;
  // Lives here (not in StepTimer) so it survives opening the ingredients sheet.
  const timer = useTimer(current.timer_seconds ?? 0, step);

  useEffect(() => {
    document.body.classList.add('no-scroll');
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (sheet ? setSheet(false) : onClose());
      if (e.key === 'ArrowRight') setStep((s) => Math.min(total - 1, s + 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, sheet, total]);

  // Keep screen awake (Screen Wake Lock API), with a fallback note where unsupported.
  useEffect(() => {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
    if (!wl) {
      setWakeSupported(false);
      return;
    }
    if (!awake) return;
    let cancelled = false;
    const request = () =>
      wl
        .request('screen')
        .then((s) => {
          if (cancelled) s.release();
          else lock.current = s;
        })
        .catch(() => setAwake(false));
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock.current?.release().catch(() => undefined);
      lock.current = null;
    };
  }, [awake]);

  // Turn it on by default where it's supported.
  useEffect(() => {
    if ('wakeLock' in navigator) setAwake(true);
  }, []);

  const toggleChecked = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="cook" role="dialog" aria-modal="true" aria-label={`Cooking mode: ${recipe.title}`} ref={dialog} tabIndex={-1}>
      <div className="cook-top">
        <button type="button" className="icon-btn" aria-label="Exit cooking mode, back to recipe" onClick={onClose}>
          <Icon name="close" size={24} />
        </button>
        <span className="cook-title">{recipe.title}</span>
        <div className="cook-size" role="group" aria-label="Text size">
          <button type="button" className="icon-btn" aria-label="Smaller text" disabled={size === 0} onClick={() => setSize(size - 1)}>
            A−
          </button>
          <button type="button" className="icon-btn big" aria-label="Larger text" disabled={size === TEXT_SIZES.length - 1} onClick={() => setSize(size + 1)}>
            A+
          </button>
        </div>
      </div>

      <div className="cook-layout">
        <aside className="cook-ingredients-panel" aria-label="Ingredients">
          <IngredientList recipe={recipe} factor={factor} checked={checked} onToggle={toggleChecked} servings={servings} />
        </aside>

        <div className="cook-main">
          <div className="cook-progress">
            <div className="cook-progress-row">
              <p>
                Step {step + 1} of {total}
              </p>
              <p className="muted">{last ? 'Last step' : `Serves ${servings}`}</p>
            </div>
            <div className="bar" aria-hidden="true">
              <div style={{ width: `${((step + 1) / total) * 100}%` }} />
            </div>
          </div>

          <div className="cook-body">
            <p className="cook-step" aria-live="polite" style={{ fontSize: TEXT_SIZES[size] }}>
              {current.text}
            </p>
            {current.uses.length > 0 && (
              <div className="cook-uses">
                <p className="cook-uses-label">For this step</p>
                <p>{current.uses.map((i) => shortIngredient(recipe.ingredients[i], factor)).join(' · ')}</p>
              </div>
            )}
            {current.tip && <p className="cook-tip">{current.tip}</p>}
            {current.timer_seconds && <StepTimer t={timer} doneNote={current.timer_done} />}
            {last && (
              <section className="cook-finish" aria-labelledby="enjoy-h">
                <span className="cook-finish-icon">
                  <Icon name="check" size={28} />
                </span>
                <h2 id="enjoy-h">Enjoy your meal</h2>
                {recipe.storage?.summary ? (
                  <p>{recipe.storage.summary}</p>
                ) : (
                  recipe.storage?.fridge && <p>Leftovers: {recipe.storage.fridge.toLowerCase()}</p>
                )}
                <button type="button" className="link-btn" onClick={onClose}>
                  Back to the recipe
                </button>
              </section>
            )}
          </div>

          <div className="cook-tools">
            <button type="button" className="tool-btn only-mobile-cook" onClick={() => setSheet(true)}>
              <Icon name="list" />
              Ingredients
              <span className="muted">
                {checked.size} of {recipe.ingredients.length}
              </span>
            </button>
            <button type="button" role="switch" aria-checked={awake} className="tool-btn" disabled={!wakeSupported} onClick={() => setAwake((v) => !v)} aria-describedby={wakeSupported ? undefined : 'wake-note'}>
              <Icon name="sun" />
              Keep screen awake
              <span className={`switch${awake ? ' on' : ''}`} aria-hidden="true" />
            </button>
            {!wakeSupported && (
              <p id="wake-note" className="wake-note">
                <Icon name="info" size={16} /> This browser can't keep the screen on. Set your screen timeout to “never” while you cook.
              </p>
            )}
          </div>

          <nav className="cook-nav" aria-label="Steps">
            <button type="button" className="btn btn-outline btn-xl" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <Icon name="chevronLeft" size={22} /> Previous
            </button>
            {last ? (
              <button type="button" className="btn btn-primary btn-xl grow" onClick={onClose}>
                Finish
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-xl grow" onClick={() => setStep(step + 1)}>
                Next step <Icon name="chevronRight" size={22} />
              </button>
            )}
          </nav>
        </div>
      </div>

      {sheet && (
        <div className="sheet-backdrop cook-sheet" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="cook-ing-h" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-head">
              <h2 id="cook-ing-h">Ingredients</h2>
              <button type="button" className="icon-btn" aria-label="Close ingredients" onClick={() => setSheet(false)}>
                <Icon name="close" size={24} />
              </button>
            </div>
            <div className="sheet-body">
              <IngredientList recipe={recipe} factor={factor} checked={checked} onToggle={toggleChecked} servings={servings} hideTitle />
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-primary btn-lg grow" onClick={() => setSheet(false)}>
                Back to step {step + 1}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IngredientList({ recipe, factor, checked, onToggle, servings, hideTitle }: { recipe: Recipe; factor: number; checked: Set<number>; onToggle: (i: number) => void; servings: number; hideTitle?: boolean }) {
  return (
    <>
      {!hideTitle && <h2 className="cook-ing-title">Ingredients</h2>}
      <p className="muted">
        For {servings} {recipe.yield_label} · {checked.size} of {recipe.ingredients.length} ready
      </p>
      <ul className="checklist">
        {recipe.ingredients.map((ing, i) => (
          <li key={i}>
            <label className="check">
              <input type="checkbox" checked={checked.has(i)} onChange={() => onToggle(i)} />
              <span>
                {ing.qty != null && <strong>{scaledQuantity(ing, factor)} </strong>}
                {ingredientName(ing)}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}
