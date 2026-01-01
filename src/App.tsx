import { useEffect, useRef, useCallback, useState } from 'react';
import { KaraokeRenderer } from './renderer/KaraokeRenderer';
import { audioManager } from './audio/AudioManager';
import { useAppStore } from './state/store';
import { parseA2LRC, generateSampleLRC } from './lrc/parser';
import { VideoExporter } from './export/VideoExporter';
import { FileUpload } from './ui/FileUpload';
import { Controls } from './ui/Controls';
import { Settings } from './ui/Settings';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<KaraokeRenderer | null>(null);
  const animationRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    audioFile,
    lrcFile,
    backgroundFile,
    timeline,
    audioDuration,
    settings,
    isPlaying,
    setAudioFile,
    setLrcFile,
    setBackgroundFile,
    setTimeline,
    setAudioDuration,
    setCurrentTime,
    setIsPlaying,
    setMode,
    setExportProgress,
  } = useAppStore();

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const initRenderer = async () => {
      try {
        console.log('Initializing renderer...');
        const renderer = new KaraokeRenderer(settings);
        await renderer.init(canvasRef.current!);
        rendererRef.current = renderer;
        
        // Load sample LRC
        console.log('Loading sample LRC...');
        const sampleTimeline = parseA2LRC(generateSampleLRC());
        setTimeline(sampleTimeline);
        renderer.setTimeline(sampleTimeline);
        setAudioDuration(sampleTimeline.duration);
        
        // Initial render
        renderer.update(0);
        renderer.render();
        setIsReady(true);
        console.log('Renderer ready!');
      } catch (err) {
        console.error('Failed to initialize renderer:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    initRenderer();

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Handle LRC file changes
  useEffect(() => {
    if (!lrcFile || !rendererRef.current) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsedTimeline = parseA2LRC(text);
      setTimeline(parsedTimeline);
      rendererRef.current?.setTimeline(parsedTimeline);
      setAudioDuration(parsedTimeline.duration);
      
      // Reset and render
      setCurrentTime(0);
      rendererRef.current?.update(0);
      rendererRef.current?.render();
    };
    reader.readAsText(lrcFile);
  }, [lrcFile, setTimeline, setAudioDuration, setCurrentTime]);

  // Handle audio file changes
  useEffect(() => {
    if (!audioFile) return;

    audioManager.loadAudio(audioFile).then((duration) => {
      setAudioDuration(duration);
    });
  }, [audioFile, setAudioDuration]);

  // Handle background file changes
  useEffect(() => {
    if (!backgroundFile || !rendererRef.current) return;
    rendererRef.current.setBackground(backgroundFile);
  }, [backgroundFile]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (isPlaying && rendererRef.current) {
        const time = audioManager.getCurrentTime();
        setCurrentTime(time);
        rendererRef.current.update(time);
        rendererRef.current.render();
        
        // Check if playback ended
        if (time >= audioDuration && audioDuration > 0) {
          audioManager.pause();
          setIsPlaying(false);
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, audioDuration, setCurrentTime, setIsPlaying]);

  const handlePlay = useCallback(() => {
    const currentTime = useAppStore.getState().currentTime;
    if (audioFile) {
      audioManager.play(currentTime);
    }
    setIsPlaying(true);
    setMode('preview');
  }, [audioFile, setIsPlaying, setMode]);

  const handlePause = useCallback(() => {
    audioManager.pause();
    setIsPlaying(false);
  }, [setIsPlaying]);

  const handleSeek = useCallback((time: number) => {
    audioManager.seek(time);
    setCurrentTime(time);
    rendererRef.current?.update(time);
    rendererRef.current?.render();
  }, [setCurrentTime]);

  const handleExport = useCallback(async () => {
    if (!rendererRef.current || !timeline) return;

    setMode('exporting');
    setIsPlaying(false);
    audioManager.pause();

    const exporter = new VideoExporter(
      rendererRef.current,
      settings,
      timeline.duration
    );

    if (audioFile) {
      exporter.setAudioFile(audioFile);
    }

    try {
      const blob = await exporter.export((progress) => {
        setExportProgress(progress.percentage);
      });
      exporter.downloadBlob(blob);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setMode('idle');
      setExportProgress(0);
    }
  }, [timeline, settings, audioFile, setMode, setIsPlaying, setExportProgress]);

  const duration = timeline?.duration ?? audioDuration;

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>🎤 Karaoke Video Renderer</h1>
          <p style={{ color: 'red' }}>Error: {error}</p>
        </header>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎤 Karaoke Video Renderer</h1>
        <p>Upload audio, LRC lyrics, and create karaoke videos in your browser</p>
      </header>

      <main className="app-main">
        <div className="sidebar">
          <section className="upload-section">
            <h2>📁 Files</h2>
            <FileUpload
              label="Audio File"
              accept="audio/*"
              onFileSelect={setAudioFile}
              selectedFile={audioFile}
            />
            <FileUpload
              label="LRC Lyrics"
              accept=".lrc,.txt"
              onFileSelect={setLrcFile}
              selectedFile={lrcFile}
            />
            <FileUpload
              label="Background Image"
              accept="image/*"
              onFileSelect={setBackgroundFile}
              selectedFile={backgroundFile}
            />
          </section>

          <Settings />
        </div>

        <div className="preview-section">
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              width={settings.width}
              height={settings.height}
            />
            {!isReady && <div className="loading">Loading renderer...</div>}
          </div>

          <Controls
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onExport={handleExport}
            duration={duration}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>Built with PixiJS + GSAP | Fully client-side, no server required</p>
      </footer>
    </div>
  );
}

export default App;
