import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Line, RenderSettings, Syllable } from '../../timeline/types';
import { defaultEffect, KaraokeEffect, SyllableVisuals } from '../effects/KaraokeEffect';

interface SyllableData {
  syllable: Syllable;
  xStart: number;
  xEnd: number;
}

export class LineRenderer {
  container: Container;
  private baseText: Text;
  private highlightText: Text;
  private mask: Graphics;
  private line: Line;
  private settings: RenderSettings;
  private syllableData: SyllableData[] = [];
  private effect: KaraokeEffect;

  constructor(line: Line, settings: RenderSettings, effect: KaraokeEffect = defaultEffect) {
    this.line = line;
    this.settings = settings;
    this.effect = effect;
    this.container = new Container();

    const style = new TextStyle({
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      fill: settings.baseColor,
      align: 'center',
    });

    const highlightStyle = new TextStyle({
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      fill: settings.highlightColor,
      align: 'center',
    });

    // Create base text (gray)
    this.baseText = new Text({ text: line.text, style });
    this.baseText.anchor.set(0.5, 0.5);
    this.container.addChild(this.baseText);

    // Create highlight text (colored)
    this.highlightText = new Text({ text: line.text, style: highlightStyle });
    this.highlightText.anchor.set(0.5, 0.5);
    this.container.addChild(this.highlightText);

    // Create mask for highlight
    this.mask = new Graphics();
    this.highlightText.mask = this.mask;
    this.container.addChild(this.mask);

    // Calculate syllable positions
    this.calculateSyllablePositions();
  }

  private calculateSyllablePositions(): void {
    const textWidth = this.baseText.width;
    const startX = -textWidth / 2;
    
    let currentX = startX;
    
    // Create a temporary text to measure each syllable
    const tempStyle = new TextStyle({
      fontFamily: this.settings.fontFamily,
      fontSize: this.settings.fontSize,
    });

    for (const syllable of this.line.syllables) {
      const syllableStartX = currentX;
      
      // Measure the syllable width
      const tempText = new Text({ text: syllable.text, style: tempStyle });
      const syllableWidth = tempText.width;
      tempText.destroy();
      
      const syllableEndX = currentX + syllableWidth;
      
      this.syllableData.push({
        syllable,
        xStart: syllableStartX,
        xEnd: syllableEndX,
      });

      currentX = syllableEndX;
    }
  }

  update(currentTime: number): void {
    // Calculate mask width based on current time
    let maskWidth = -this.baseText.width / 2; // Start from left edge

    for (const data of this.syllableData) {
      const { syllable, xStart, xEnd } = data;
      
      if (currentTime < syllable.start) {
        // Syllable hasn't started yet
        break;
      } else if (currentTime >= syllable.end) {
        // Syllable is complete
        maskWidth = xEnd;
      } else {
        // Syllable is active - calculate progress
        const progress = (currentTime - syllable.start) / (syllable.end - syllable.start);
        const visuals: SyllableVisuals = {
          maskWidth: xStart,
          xStart,
          xEnd,
        };
        this.effect.onSyllableUpdate(syllable, progress, visuals);
        maskWidth = visuals.maskWidth;
        break;
      }
    }

    // Update mask
    this.mask.clear();
    this.mask.rect(
      -this.baseText.width / 2 - 10,
      -this.settings.fontSize,
      maskWidth + this.baseText.width / 2 + 10,
      this.settings.fontSize * 2
    );
    this.mask.fill({ color: 0xffffff });
  }

  setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
