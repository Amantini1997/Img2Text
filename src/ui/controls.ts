import { palettes } from '../palettes';

export interface Settings {
  width: number;
  paletteId: string;
  dither: boolean;
  edgeDetect: boolean;
}

export function setupControls(onChange: (settings: Settings) => void): Settings {
  const widthSlider = document.getElementById('width-slider') as HTMLInputElement;
  const widthValue = document.getElementById('width-value') as HTMLElement;
  const paletteSelect = document.getElementById('palette-select') as HTMLSelectElement;
  const ditherToggle = document.getElementById('dither-toggle') as HTMLInputElement;
  const edgeToggle = document.getElementById('edge-toggle') as HTMLInputElement;

  // Populate palette dropdown
  for (const palette of palettes) {
    const option = document.createElement('option');
    option.value = palette.id;
    option.textContent = palette.name;
    paletteSelect.appendChild(option);
  }

  function getSettings(): Settings {
    return {
      width: parseInt(widthSlider.value, 10),
      paletteId: paletteSelect.value,
      dither: ditherToggle.checked,
      edgeDetect: edgeToggle.checked,
    };
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleChange() {
    widthValue.textContent = widthSlider.value;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onChange(getSettings());
    }, 150);
  }

  widthSlider.addEventListener('input', handleChange);
  paletteSelect.addEventListener('change', handleChange);
  ditherToggle.addEventListener('change', handleChange);
  edgeToggle.addEventListener('change', handleChange);

  return getSettings();
}
