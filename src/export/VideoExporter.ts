import { KaraokeRenderer } from '../renderer/KaraokeRenderer';
import { RenderSettings } from '../timeline/types';

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

export class VideoExporter {
  private renderer: KaraokeRenderer;
  private settings: RenderSettings;
  private duration: number;

  constructor(renderer: KaraokeRenderer, settings: RenderSettings, duration: number) {
    this.renderer = renderer;
    this.settings = settings;
    this.duration = duration;
  }

  // Audio file support can be added later with proper muxing
  setAudioFile(_file: File): void {
    // TODO: Implement audio muxing
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm';
  }

  async export(onProgress?: ExportProgressCallback): Promise<Blob> {
    const canvas = this.renderer.getCanvas();
    const stream = canvas.captureStream(this.settings.fps);
    
    const mimeType = this.getSupportedMimeType();
    console.log('Using mimeType:', mimeType);

    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const totalFrames = Math.ceil(this.duration * this.settings.fps);
    const frameInterval = 1000 / this.settings.fps;

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, chunks:', chunks.length);
        if (chunks.length === 0) {
          reject(new Error('No video data recorded'));
          return;
        }
        const blob = new Blob(chunks, { type: mimeType });
        console.log('Created blob, size:', blob.size);
        resolve(blob);
      };

      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        reject(e);
      };

      mediaRecorder.start(100);
      console.log('MediaRecorder started');

      let frame = 0;
      let lastTime = performance.now();

      const renderFrame = () => {
        const now = performance.now();
        const elapsed = now - lastTime;

        if (elapsed >= frameInterval) {
          lastTime = now - (elapsed % frameInterval);

          if (frame >= totalFrames) {
            console.log('Rendering complete, stopping recorder');
            // Give MediaRecorder time to process final frames
            setTimeout(() => {
              mediaRecorder.stop();
            }, 200);
            return;
          }

          const time = frame / this.settings.fps;
          this.renderer.update(time);
          this.renderer.render();

          if (onProgress) {
            onProgress({
              currentFrame: frame + 1,
              totalFrames,
              percentage: ((frame + 1) / totalFrames) * 100,
            });
          }

          frame++;
        }

        requestAnimationFrame(renderFrame);
      };

      // Initial render
      this.renderer.update(0);
      this.renderer.render();
      
      requestAnimationFrame(renderFrame);
    });
  }

  downloadBlob(blob: Blob, filename: string = 'karaoke-video.webm'): void {
    console.log('Downloading blob, size:', blob.size);
    if (blob.size === 0) {
      console.error('Cannot download empty blob');
      return;
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    
    // Use setTimeout to ensure the click happens after DOM update
    setTimeout(() => {
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }, 0);
  }
}
