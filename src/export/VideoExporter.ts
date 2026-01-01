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
  private audioFile: File | null = null;

  constructor(renderer: KaraokeRenderer, settings: RenderSettings, duration: number) {
    this.renderer = renderer;
    this.settings = settings;
    this.duration = duration;
  }

  setAudioFile(file: File): void {
    this.audioFile = file;
  }

  async exportWithWebCodecs(onProgress?: ExportProgressCallback): Promise<Blob> {
    // Check WebCodecs support
    if (!('VideoEncoder' in window)) {
      throw new Error('WebCodecs not supported, falling back to MediaRecorder');
    }

    const { width, height, fps } = this.settings;
    const totalFrames = Math.ceil(this.duration * fps);
    const frameDuration = 1000000 / fps; // microseconds

    const chunks: Uint8Array[] = [];

    const encoder = new VideoEncoder({
      output: (chunk) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        chunks.push(data);
      },
      error: (e) => console.error('Encoder error:', e),
    });

    encoder.configure({
      codec: 'vp8',
      width,
      height,
      bitrate: 5_000_000,
      framerate: fps,
    });

    const canvas = this.renderer.getCanvas();

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / fps;
      
      // Update renderer to current time
      this.renderer.update(time);
      this.renderer.render();

      // Create video frame
      const videoFrame = new VideoFrame(canvas, {
        timestamp: frame * frameDuration,
        duration: frameDuration,
      });

      encoder.encode(videoFrame, { keyFrame: frame % 30 === 0 });
      videoFrame.close();

      if (onProgress) {
        onProgress({
          currentFrame: frame + 1,
          totalFrames,
          percentage: ((frame + 1) / totalFrames) * 100,
        });
      }

      // Yield to prevent blocking
      if (frame % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    await encoder.flush();
    encoder.close();

    // Create WebM blob (simplified - in production use a proper muxer)
    return new Blob(chunks, { type: 'video/webm' });
  }

  async exportWithMediaRecorder(onProgress?: ExportProgressCallback): Promise<Blob> {
    const canvas = this.renderer.getCanvas();
    const stream = canvas.captureStream(this.settings.fps);
    
    // Add audio track if available
    if (this.audioFile) {
      try {
        const audioContext = new AudioContext();
        const arrayBuffer = await this.audioFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        
        for (const track of destination.stream.getAudioTracks()) {
          stream.addTrack(track);
        }
        
        source.start();
      } catch (e) {
        console.warn('Could not add audio track:', e);
      }
    }

    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5_000_000,
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };

      mediaRecorder.onerror = (e) => {
        reject(e);
      };

      mediaRecorder.start(100); // Collect data every 100ms

      const totalFrames = Math.ceil(this.duration * this.settings.fps);
      let frame = 0;

      const renderFrame = () => {
        if (frame >= totalFrames) {
          mediaRecorder.stop();
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
        requestAnimationFrame(renderFrame);
      };

      renderFrame();
    });
  }

  async export(onProgress?: ExportProgressCallback): Promise<Blob> {
    try {
      return await this.exportWithWebCodecs(onProgress);
    } catch {
      console.log('WebCodecs not available, using MediaRecorder fallback');
      return await this.exportWithMediaRecorder(onProgress);
    }
  }

  downloadBlob(blob: Blob, filename: string = 'karaoke-video.webm'): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
