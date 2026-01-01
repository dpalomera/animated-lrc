import gsap from 'gsap';
import { Line, RenderSettings } from '../timeline/types';

export class ScrollController {
  private timeline: gsap.core.Timeline;
  private container: { y: number } = { y: 0 };
  private lines: Line[] = [];
  private settings: RenderSettings;

  constructor(settings: RenderSettings) {
    this.settings = settings;
    this.timeline = gsap.timeline({ paused: true });
  }

  setLines(lines: Line[]): void {
    this.lines = lines;
    this.buildTimeline();
  }

  private buildTimeline(): void {
    this.timeline.clear();
    this.container.y = this.settings.height / 2;

    if (this.lines.length === 0) return;

    // Calculate initial Y position (first line at center)
    const centerY = this.settings.height / 2;
    
    // Build scroll keyframes
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const lineY = i * this.settings.lineHeight;
      const targetY = centerY - lineY;
      
      // Calculate duration to next keyframe
      const nextTime = i < this.lines.length - 1 
        ? this.lines[i + 1].centerTime 
        : line.end + 2;
      const duration = Math.max(0.1, nextTime - line.centerTime);

      this.timeline.to(
        this.container,
        {
          y: targetY,
          duration,
          ease: 'none',
        },
        line.centerTime
      );
    }
  }

  seek(time: number): void {
    this.timeline.seek(time);
  }

  getContainerY(): number {
    return this.container.y;
  }

  dispose(): void {
    this.timeline.kill();
  }
}
