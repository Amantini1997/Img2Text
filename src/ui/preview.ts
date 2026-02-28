export function showPreview(
  file: File,
  previewImg: HTMLImageElement,
  dropZone: HTMLElement,
  previewContainer: HTMLElement,
): void {
  const url = URL.createObjectURL(file);
  previewImg.onload = () => {
    URL.revokeObjectURL(url);
  };
  previewImg.src = url;
  dropZone.hidden = true;
  previewContainer.hidden = false;
}

export function setupChangeImage(
  changeBtn: HTMLElement,
  fileInput: HTMLInputElement,
  dropZone: HTMLElement,
  previewContainer: HTMLElement,
): void {
  changeBtn.addEventListener('click', () => {
    previewContainer.hidden = true;
    dropZone.hidden = false;
    fileInput.click();
  });
}
