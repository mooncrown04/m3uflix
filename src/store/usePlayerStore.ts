import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { M3UChannel } from '../types';

interface PlayerState {
  currentChannel: M3UChannel | null;
  isPlaying: boolean;
  isMiniPlayer: boolean;
  volume: number;
  isMuted: boolean;
  isFullScreenshot: boolean;
  isGlobalPlaying: boolean;
  playbackProgress: Record<string, { currentTime: number; duration: number }>;
  
  // Actions
  setCurrentChannel: (channel: M3UChannel | null | ((prev: M3UChannel | null) => M3UChannel | null)) => void;
  setIsPlaying: (playing: boolean | ((prev: boolean) => boolean)) => void;
  setIsMiniPlayer: (mini: boolean | ((prev: boolean) => boolean)) => void;
  setVolume: (volume: number | ((prev: number) => number)) => void;
  setIsMuted: (muted: boolean | ((prev: boolean) => boolean)) => void;
  setIsFullScreenshot: (full: boolean | ((prev: boolean) => boolean)) => void;
  setIsGlobalPlaying: (global: boolean | ((prev: boolean) => boolean)) => void;
  setPlaybackProgress: (progress: Record<string, { currentTime: number; duration: number }> | ((prev: Record<string, { currentTime: number; duration: number }>) => Record<string, { currentTime: number; duration: number }>)) => void;
  updateProgress: (channelId: string, currentTime: number, duration: number) => void;
  togglePlay: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      currentChannel: null,
      isPlaying: false,
      isMiniPlayer: false,
      volume: 1,
      isMuted: false,
      isFullScreenshot: false,
      isGlobalPlaying: false,
      playbackProgress: {},

      setCurrentChannel: (val) => set((state) => ({ currentChannel: typeof val === 'function' ? (val as any)(state.currentChannel) : val })),
      setIsPlaying: (val) => set((state) => ({ isPlaying: typeof val === 'function' ? (val as any)(state.isPlaying) : val })),
      setIsMiniPlayer: (val) => set((state) => ({ isMiniPlayer: typeof val === 'function' ? (val as any)(state.isMiniPlayer) : val })),
      setVolume: (val) => set((state) => ({ volume: typeof val === 'function' ? (val as any)(state.volume) : val })),
      setIsMuted: (val) => set((state) => ({ isMuted: typeof val === 'function' ? (val as any)(state.isMuted) : val })),
      setIsFullScreenshot: (val) => set((state) => ({ isFullScreenshot: typeof val === 'function' ? (val as any)(state.isFullScreenshot) : val })),
      setIsGlobalPlaying: (val) => set((state) => ({ isGlobalPlaying: typeof val === 'function' ? (val as any)(state.isGlobalPlaying) : val })),
      setPlaybackProgress: (progress) => set((state) => ({ 
        playbackProgress: typeof progress === 'function' ? progress(state.playbackProgress) : progress 
      })),
      updateProgress: (channelId, currentTime, duration) => {
        if (!duration || duration < 10) return;
        set((state) => ({
          playbackProgress: {
            ...state.playbackProgress,
            [channelId]: { currentTime, duration }
          }
        }));
      },
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    }),
    {
      name: 'moon-player-storage',
    }
  )
);
