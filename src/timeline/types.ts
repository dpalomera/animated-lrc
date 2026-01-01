export interface Syllable {
  text: string;
  start: number;
  end: number;
  xStart?: number;
  xEnd?: number;
}

export interface Line {
  text: string;
  start: number;
  end: number;
  centerTime: number;
  syllables: Syllable[];
  y?: number;
}

export interface LyricsTimeline {
  lines: Line[];
  duration: number;
}

export interface RenderSettings {
  width: number;
  height: number;
  fps: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  baseColor: number;
  highlightColor: number;
  backgroundColor: number;
}

export const DEFAULT_SETTINGS: RenderSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  fontFamily: 'Arial',
  fontSize: 48,
  lineHeight: 80,
  baseColor: 0x888888,
  highlightColor: 0xffff00,
  backgroundColor: 0x1a1a2e,
};
