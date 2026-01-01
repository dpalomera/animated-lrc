import { Syllable } from '../../timeline/types';

export interface SyllableVisuals {
  maskWidth: number;
  xStart: number;
  xEnd: number;
}

export interface KaraokeEffect {
  name: string;
  onSyllableUpdate(syllable: Syllable, progress: number, visuals: SyllableVisuals): void;
}

// Classic left-to-right highlight wipe effect
export class HighlightWipeEffect implements KaraokeEffect {
  name = 'Highlight Wipe';

  onSyllableUpdate(syllable: Syllable, progress: number, visuals: SyllableVisuals): void {
    // Linear interpolation from xStart to xEnd based on progress
    const clampedProgress = Math.max(0, Math.min(1, progress));
    visuals.maskWidth = visuals.xStart + (visuals.xEnd - visuals.xStart) * clampedProgress;
  }
}

export const defaultEffect = new HighlightWipeEffect();
