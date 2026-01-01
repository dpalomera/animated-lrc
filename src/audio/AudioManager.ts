export class AudioManager {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;

  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async loadAudio(file: File): Promise<number> {
    await this.init();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    return this.audioBuffer.duration;
  }

  async loadAudioFromUrl(url: string): Promise<number> {
    await this.init();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    return this.audioBuffer.duration;
  }

  play(offset: number = 0): void {
    if (!this.audioContext || !this.audioBuffer) return;
    
    this.stop();
    
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.audioContext.destination);
    
    this.startTime = this.audioContext.currentTime - offset;
    this.sourceNode.start(0, offset);
    this.isPlaying = true;
    
    this.sourceNode.onended = () => {
      this.isPlaying = false;
    };
  }

  pause(): void {
    if (!this.isPlaying || !this.audioContext) return;
    
    this.pauseTime = this.getCurrentTime();
    this.stop();
  }

  resume(): void {
    if (this.isPlaying) return;
    this.play(this.pauseTime);
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Ignore errors if already stopped
      }
      this.sourceNode = null;
    }
    this.isPlaying = false;
  }

  seek(time: number): void {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.pauseTime = time;
    if (wasPlaying) {
      this.play(time);
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pauseTime;
  }

  getDuration(): number {
    return this.audioBuffer?.duration ?? 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
  }
}

export const audioManager = new AudioManager();
