export interface RainSettings {
  gravityY: number;
  /** End-of-ramp wind strength, in 1e-4 units for slider friendliness. */
  windMax10k: number;
  dropCap: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'storm-shelter.settings';

export function readSettings(storage: StorageLike, defaults: RainSettings): RainSettings {
  const raw = storage.getItem(KEY);
  if (raw === null) return { ...defaults };
  try {
    const p = JSON.parse(raw) as Partial<RainSettings>;
    return {
      gravityY: typeof p.gravityY === 'number' ? p.gravityY : defaults.gravityY,
      windMax10k: typeof p.windMax10k === 'number' ? p.windMax10k : defaults.windMax10k,
      dropCap: typeof p.dropCap === 'number' ? p.dropCap : defaults.dropCap,
    };
  } catch {
    return { ...defaults };
  }
}

export function writeSettings(storage: StorageLike, settings: RainSettings): void {
  storage.setItem(KEY, JSON.stringify(settings));
}

/** Sliders for gravity, wind ceiling, and drop count. */
export function buildSettingsPanel(
  panel: HTMLElement,
  toggleButton: HTMLElement,
  settings: RainSettings,
  onChange: (settings: RainSettings) => void,
): void {
  panel.innerHTML = '';

  const addSlider = (
    labelText: string,
    min: number,
    max: number,
    step: number,
    value: number,
    apply: (v: number) => void,
  ): void => {
    const label = document.createElement('label');
    const readout = document.createElement('strong');
    readout.textContent = ` ${value}`;
    label.append(`${labelText}:`, readout);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      readout.textContent = ` ${v}`;
      apply(v);
      onChange(settings);
    });
    label.append(input);
    panel.append(label);
  };

  addSlider('Gravity', 0.4, 2, 0.1, settings.gravityY, (v) => {
    settings.gravityY = v;
  });
  addSlider('Max wind (×10⁻⁴)', 0, 20, 1, settings.windMax10k, (v) => {
    settings.windMax10k = v;
  });
  addSlider('Drop count', 40, 140, 10, settings.dropCap, (v) => {
    settings.dropCap = v;
  });

  toggleButton.addEventListener('click', () => {
    const nowHidden = !panel.hidden;
    panel.hidden = nowHidden;
    toggleButton.setAttribute('aria-expanded', String(!nowHidden));
  });
}
