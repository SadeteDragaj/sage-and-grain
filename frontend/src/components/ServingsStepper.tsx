import { Icon } from './Icon';

export function ServingsStepper({ value, onChange, label = 'servings', min = 1, max = 24 }: { value: number; onChange: (n: number) => void; label?: string; min?: number; max?: number }) {
  return (
    <fieldset className="stepper">
      <legend className="sr-only">Servings</legend>
      <button type="button" aria-label="Decrease servings" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Icon name="minus" size={18} />
      </button>
      <output aria-live="polite">
        {value} <span className="stepper-unit">{label}</span>
      </output>
      <button type="button" aria-label="Increase servings" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Icon name="plus" size={18} />
      </button>
    </fieldset>
  );
}
