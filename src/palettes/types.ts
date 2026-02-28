export interface GrayscalePalette {
  id: string;
  name: string;
  type: 'grayscale';
  characters: string[];
}

export interface RgbPalette {
  id: string;
  name: string;
  type: 'rgb';
  levels: number;
  rgbMap: Record<string, string>;
  fallback: string;
}

export type Palette = GrayscalePalette | RgbPalette;
