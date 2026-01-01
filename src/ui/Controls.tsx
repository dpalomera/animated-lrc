import { useAppStore } from '../state/store';

interface ControlsProps {
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onExport: () => void;
  duration: number;
}

export function Controls({ onPlay, onPause, onSeek, onExport, duration }: ControlsProps) {
  const { isPlaying, currentTime, mode, exportProgress } = useAppStore();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="controls">
      <div className="controls-playback">
        <button
          className="control-button"
          onClick={isPlaying ? onPause : onPlay}
          disabled={mode === 'exporting'}
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        
        <input
          type="range"
          className="seek-bar"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          disabled={mode === 'exporting'}
        />
        
        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="controls-export">
        <button
          className="export-button"
          onClick={onExport}
          disabled={mode === 'exporting' || duration === 0}
        >
          {mode === 'exporting' ? `Exporting... ${exportProgress.toFixed(0)}%` : '📹 Export Video'}
        </button>
      </div>
    </div>
  );
}
