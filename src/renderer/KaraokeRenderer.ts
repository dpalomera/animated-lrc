import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { LyricsTimeline, RenderSettings } from '../timeline/types';
import { ScrollController } from '../scroll/ScrollController';
import { LineRenderer } from './lines/LineRenderer';

export class KaraokeRenderer {
  private app: Application;
  private settings: RenderSettings;
  private lyricsContainer: Container;
  private backgroundSprite: Sprite | null = null;
  private lineRenderers: LineRenderer[] = [];
  private scrollController: ScrollController;
  private timeline: LyricsTimeline | null = null;
  private initialized = false;

  constructor(settings: RenderSettings) {
    this.settings = settings;
    this.app = new Application();
    this.lyricsContainer = new Container();
    this.scrollController = new ScrollController(settings);
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    if (this.initialized) return;

    await this.app.init({
      canvas,
      width: this.settings.width,
      height: this.settings.height,
      backgroundColor: this.settings.backgroundColor,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.app.stage.addChild(this.lyricsContainer);
    this.initialized = true;
  }

  setTimeline(timeline: LyricsTimeline): void {
    this.timeline = timeline;
    this.clearLines();
    this.scrollController.setLines(timeline.lines);

    // Create line renderers
    for (let i = 0; i < timeline.lines.length; i++) {
      const line = timeline.lines[i];
      const renderer = new LineRenderer(line, this.settings);
      renderer.setPosition(this.settings.width / 2, i * this.settings.lineHeight);
      this.lineRenderers.push(renderer);
      this.lyricsContainer.addChild(renderer.container);
    }
  }

  async setBackground(imageFile: File): Promise<void> {
    if (this.backgroundSprite) {
      this.backgroundSprite.destroy();
      this.backgroundSprite = null;
    }

    const url = URL.createObjectURL(imageFile);
    const texture = await Texture.from(url);
    
    this.backgroundSprite = new Sprite(texture);
    this.backgroundSprite.width = this.settings.width;
    this.backgroundSprite.height = this.settings.height;
    
    // Add background behind lyrics
    this.app.stage.addChildAt(this.backgroundSprite, 0);
    
    // Add semi-transparent overlay for better text visibility
    const overlay = new Graphics();
    overlay.rect(0, 0, this.settings.width, this.settings.height);
    overlay.fill({ color: 0x000000, alpha: 0.5 });
    this.app.stage.addChildAt(overlay, 1);
  }

  update(currentTime: number): void {
    if (!this.timeline) return;

    // Update scroll position
    this.scrollController.seek(currentTime);
    this.lyricsContainer.y = this.scrollController.getContainerY();

    // Update each line's highlight
    for (const renderer of this.lineRenderers) {
      renderer.update(currentTime);
    }
  }

  render(): void {
    this.app.render();
  }

  getCanvas(): HTMLCanvasElement {
    return this.app.canvas as HTMLCanvasElement;
  }

  private clearLines(): void {
    for (const renderer of this.lineRenderers) {
      renderer.destroy();
    }
    this.lineRenderers = [];
    this.lyricsContainer.removeChildren();
  }

  resize(width: number, height: number): void {
    this.settings.width = width;
    this.settings.height = height;
    this.app.renderer.resize(width, height);
  }

  dispose(): void {
    this.clearLines();
    this.scrollController.dispose();
    if (this.backgroundSprite) {
      this.backgroundSprite.destroy();
    }
    this.app.destroy(true);
    this.initialized = false;
  }
}
