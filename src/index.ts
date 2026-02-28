import './styles/main.css';
import './styles/controls.css';
import './styles/output.css';
import { setupDragDrop } from './ui/drag-drop';
import { showPreview, setupChangeImage } from './ui/preview';
import { setupControls, type Settings } from './ui/controls';
import { setupExport, enableExportButtons } from './ui/export';
import { setupThemeToggle } from './ui/layout';
import { showLoading, hideLoading } from './ui/loading';
import { processImage } from './workers/api';
import { renderGridToDOM } from './renderers/dom-renderer';

let currentGrid: string[][] | null = null;
let currentBitmap: ImageBitmap | null = null;
let currentSettings: Settings;

async function handleFile(file: File) {
  const dropZone = document.getElementById('drop-zone') as HTMLElement;
  const previewContainer = document.getElementById('preview-container') as HTMLElement;
  const previewImg = document.getElementById('preview-image') as HTMLImageElement;
  showPreview(file, previewImg, dropZone, previewContainer);
  currentBitmap = await createImageBitmap(file);
  await render();
}

async function render() {
  if (!currentBitmap) return;
  showLoading();
  try {
    currentGrid = await processImage(
      currentBitmap, currentSettings.width, currentSettings.paletteId,
      { edgeDetect: currentSettings.edgeDetect, dither: currentSettings.dither },
    );
    const outputContent = document.getElementById('output-content') as HTMLElement;
    renderGridToDOM(currentGrid, outputContent);
    enableExportButtons();
  } finally {
    hideLoading();
  }
}

function handleSettingsChange(settings: Settings) {
  currentSettings = settings;
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  const dropZone = document.getElementById('drop-zone') as HTMLElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const changeBtn = document.getElementById('change-image') as HTMLElement;
  const previewContainer = document.getElementById('preview-container') as HTMLElement;
  setupDragDrop(dropZone, fileInput, handleFile);
  setupChangeImage(changeBtn, fileInput, dropZone, previewContainer);
  currentSettings = setupControls(handleSettingsChange);
  setupExport(() => currentGrid);
});
