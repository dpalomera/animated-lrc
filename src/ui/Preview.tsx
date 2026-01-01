import { useEffect, useRef, useCallback } from 'react';
import { KaraokeRenderer } from '../renderer/KaraokeRenderer';
import { audioManager } from '../audio/AudioManager';
import { useAppStore } from '../state/store';
import { parseA2LRC, generateSampleLRC } from '../lrc/parser';
import { VideoExporter } from '../export/VideoExporter';

export function Preview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<KaraokeRenderer | null>(null);
  const animationRef = useRef<number>(0);

  const {
    audioFile,
    lrcFile,
    backgroundFile,
    timeline,
    settings,
    isPlaying,
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

    const renderer = new KaraokeRenderer(settings);
    renderer.init(canvasRef.current).then(() => {
      rendererRef.current = renderer;
      
      // Load sample LRC if no file provided
      if (!timeline) {
        const sampleTimeline = parseA2LRC(generateSampleLRC());
        setTimeline(sampleTimeline);
        renderer.setTimeline(sampleTimeline);
        setAudioDuration(sampleTimeline.duration);
      }
    });

    return () => {
      renderer.dispose();
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
    };
    reader.readAsText(lrcFile);
  }, [lrcFile, setTimeline]);

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

  // Handle timeline changes
  useEffect(() => {
    if (!timeline || !rendererRef.current) return;
    rendererRef.current.setTimeline(timeline);
  }, [timeline]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (isPlaying) {
        const time = audioManager.getCurrentTime();
        setCurrentTime(time);
        rendererRef.current?.update(time);
        rendererRef.current?.render();
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, setCurrentTime]);

  const handlePlay = useCallback(() => {
    const currentTime = useAppStore.getState().currentTime;
    audioManager.play(currentTime);
    setIsPlaying(true);
    setMode('preview');
  }, [setIsPlaying, setMode]);

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
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setMode('idle');
      setExportProgress(0);
    }
  }, [timeline, settings, audioFile, setMode, setIsPlaying, setExportProgress]);

  return {
    canvasRef,
    handlePlay,
    handlePause,
    handleSeek,
    handleExport,
  };
}
