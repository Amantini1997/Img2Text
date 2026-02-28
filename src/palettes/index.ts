import type { Palette } from './types';
import { asciiPalette } from './ascii';
import { asciiDetailedPalette } from './ascii-detailed';
import { bwEmojiPalette } from './bw-emoji';
import { rgbEmojiPalette } from './rgb-emoji';
import { skinTonesPalette } from './skin-tones';

export type { Palette, GrayscalePalette, RgbPalette } from './types';

export const palettes: Palette[] = [
  asciiPalette,
  asciiDetailedPalette,
  bwEmojiPalette,
  rgbEmojiPalette,
  skinTonesPalette,
];

export function getPaletteById(id: string): Palette | undefined {
  return palettes.find(p => p.id === id);
}
