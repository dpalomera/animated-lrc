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

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
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
    const videoStream = canvas.captureStream(this.settings.fps);
    
    // Create combined stream with audio if available
    let combinedStream: MediaStream;
    let audioContext: AudioContext | null = null;
    let audioSource: AudioBufferSourceNode | null = null;
    
    if (this.audioFile) {
      try {
        audioContext = new AudioContext();
        const arrayBuffer = await this.audioFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        
        const destination = audioContext.createMediaStreamDestination();
        audioSource.connect(destination);
        
        // Combine video and audio tracks
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);
        
        console.log('Audio stream created, tracks:', combinedStream.getTracks().length);
      } catch (e) {
        console.warn('Could not add audio, exporting video only:', e);
        combinedStream = videoStream;
      }
    } else {
      combinedStream = videoStream;
    }
    
    const mimeType = this.getSupportedMimeType();
    console.log('Using mimeType:', mimeType);
    console.log('Stream tracks:', combinedStream.getTracks().map(t => `${t.kind}: ${t.label}`));

    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
      audioBitsPerSecond: 128_000,
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
        
        // Clean up audio
        if (audioSource) {
          try { audioSource.stop(); } catch {}
        }
        if (audioContext) {
          audioContext.close();
        }
        
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
        if (audioSource) {
          try { audioSource.stop(); } catch {}
        }
        if (audioContext) {
          audioContext.close();
        }
        reject(e);
      };

      // Start audio playback if available
      if (audioSource) {
        audioSource.start(0);
        console.log('Audio playback started');
      }

      mediaRecorder.start(100);
      console.log('MediaRecorder started');

      let frame = 0;
      let lastTime = performance.now();
      
      // Helper to apply timing offset
      const getAdjustedTime = (time: number) => {
        return time - this.settings.offsetMs / 1000;
      };

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
          const adjustedTime = getAdjustedTime(time);
          this.renderer.update(adjustedTime);
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
      this.renderer.update(getAdjustedTime(0));
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
