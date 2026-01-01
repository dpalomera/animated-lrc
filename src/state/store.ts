import { create } from 'zustand';
import { LyricsTimeline, RenderSettings, DEFAULT_SETTINGS } from '../timeline/types';

export type AppMode = 'idle' | 'preview' | 'exporting';

interface AppState {
  // Files
  audioFile: File | null;
  lrcFile: File | null;
  backgroundFile: File | null;
  
  // Parsed data
  timeline: LyricsTimeline | null;
  audioDuration: number;
  
  // Playback state
  mode: AppMode;
  currentTime: number;
  isPlaying: boolean;
  
  // Settings
  settings: RenderSettings;
  
  // Export progress
  exportProgress: number;
  
  // Actions
  setAudioFile: (file: File | null) => void;
  setLrcFile: (file: File | null) => void;
  setBackgroundFile: (file: File | null) => void;
  setTimeline: (timeline: LyricsTimeline | null) => void;
  setAudioDuration: (duration: number) => void;
  setMode: (mode: AppMode) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setSettings: (settings: Partial<RenderSettings>) => void;
  setExportProgress: (progress: number) => void;
  reset: () => void;
}

const initialState = {
  audioFile: null,
  lrcFile: null,
  backgroundFile: null,
  timeline: null,
  audioDuration: 0,
  mode: 'idle' as AppMode,
  currentTime: 0,
  isPlaying: false,
  settings: DEFAULT_SETTINGS,
  exportProgress: 0,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  
  setAudioFile: (file) => set({ audioFile: file }),
  setLrcFile: (file) => set({ lrcFile: file }),
  setBackgroundFile: (file) => set({ backgroundFile: file }),
  setTimeline: (timeline) => set({ timeline }),
  setAudioDuration: (duration) => set({ audioDuration: duration }),
  setMode: (mode) => set({ mode }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings },
  })),
  setExportProgress: (progress) => set({ exportProgress: progress }),
  reset: () => set(initialState),
}));
