import { DIETS, DIET_LABELS, DIFFICULTIES, DIFFICULTY_LABELS, MEALS, MEAL_LABELS, TIME_OPTIONS } from '../lib/content';
import type { Filters } from '../lib/content';

export interface FilterVisibility {
  diet?: boolean;
  meal?: boolean;
}

interface Props {
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  hide?: FilterVisibility;
  idPrefix: string;
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterPanel({ filters: f, onChange, hide = {}, idPrefix }: Props) {
  return (
    <div className="filters">
      {!hide.diet && (
        <fieldset>
          <legend>Diet</legend>
          {DIETS.map((d) => (
            <label key={d} className="opt">
              <input type="checkbox" checked={f.diets.includes(d)} onChange={() => onChange({ diets: toggle(f.diets, d) })} />
              {DIET_LABELS[d]}
            </label>
          ))}
          <label className="opt opt-note">
            <input type="checkbox" checked={f.gfOptions} onChange={() => onChange({ gfOptions: !f.gfOptions })} />
            Include “GF option” recipes
          </label>
        </fieldset>
      )}
      {!hide.meal && (
        <fieldset>
          <legend>Meal</legend>
          <label className="opt">
            <input type="radio" name={`${idPrefix}-meal`} checked={!f.meal} onChange={() => onChange({ meal: null })} />
            Any meal
          </label>
          {MEALS.map((m) => (
            <label key={m} className="opt">
              <input type="radio" name={`${idPrefix}-meal`} checked={f.meal === m} onChange={() => onChange({ meal: m })} />
              {MEAL_LABELS[m]}
            </label>
          ))}
        </fieldset>
      )}
      <fieldset>
        <legend>Time</legend>
        <label className="opt">
          <input type="radio" name={`${idPrefix}-time`} checked={!f.time} onChange={() => onChange({ time: null })} />
          Any time
        </label>
        {TIME_OPTIONS.map((t) => (
          <label key={t} className="opt">
            <input type="radio" name={`${idPrefix}-time`} checked={f.time === t} onChange={() => onChange({ time: t })} />
            Under {t} min
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Difficulty</legend>
        {DIFFICULTIES.map((d) => (
          <label key={d} className="opt">
            <input type="checkbox" checked={f.difficulties.includes(d)} onChange={() => onChange({ difficulties: toggle(f.difficulties, d) })} />
            {DIFFICULTY_LABELS[d]}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
