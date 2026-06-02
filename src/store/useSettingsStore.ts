import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { KeyMap, DEFAULT_KEY_MAP, UIMode, LayoutMode, LogoStyle, FocusEffect, Top10Style } from '../types';

interface SettingsState {
  uiMode: UIMode;
  themeColor: string;
  layoutMode: LayoutMode;
  logoStyle: LogoStyle;
  focusEffect: FocusEffect;
  posterOrientation: 'landscape' | 'portrait';
  clockStyle: 'original' | 'horizontal' | 'minimal' | 'retro' | 'modern';
  top10Style: Top10Style;
  profilePic: string;
  deviceType: 'pc' | 'tv' | 'tablet' | 'phone';
  dynamicThemeEnabled: boolean;
  voiceControlEnabled: boolean;
  cinemaModeEnabled: boolean;
  sportsTickerEnabled: boolean;
  newsTickerEnabled: boolean;
  tmdbEnabled: boolean;
  tmdbApiKey: string;
  geminiApiKey: string;
  customProxyUrl: string;
  playerEngine: 'hls' | 'shaka';
  ambilightMode: 'none' | 'simple' | 'advanced' | 'soft' | 'vibrant' | 'cinema';
  mixColor1: string;
  mixColor2: string;
  keyMap: KeyMap;
  remoteControlEnabled: boolean;
  playbackSpeed: number;
  autoPlay: boolean;
  lowLatency: boolean;
  showFPS: boolean;
  autoPreviewEnabled: boolean;
  channelSurfEnabled: boolean;
  loadingStyle: 'default' | 'glow' | 'minimal' | 'fire';
  
  // Actions
  setUiMode: (mode: UIMode | ((prev: UIMode) => UIMode)) => void;
  setThemeColor: (color: string | ((prev: string) => string)) => void;
  setLayoutMode: (mode: LayoutMode | ((prev: LayoutMode) => LayoutMode)) => void;
  setLogoStyle: (style: LogoStyle | ((prev: LogoStyle) => LogoStyle)) => void;
  setFocusEffect: (effect: FocusEffect | ((prev: FocusEffect) => FocusEffect)) => void;
  setPosterOrientation: (orient: 'landscape' | 'portrait' | ((prev: 'landscape' | 'portrait') => 'landscape' | 'portrait')) => void;
  setClockStyle: (style: any) => void;
  setTop10Style: (style: Top10Style | ((prev: Top10Style) => Top10Style)) => void;
  setProfilePic: (pic: string | ((prev: string) => string)) => void;
  setDeviceType: (type: any | ((prev: any) => any)) => void;
  setDynamicThemeEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setVoiceControlEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setCinemaModeEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setSportsTickerEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setNewsTickerEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setTmdbEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setTmdbApiKey: (key: string | ((prev: string) => string)) => void;
  setGeminiApiKey: (key: string | ((prev: string) => string)) => void;
  setCustomProxyUrl: (url: string | ((prev: string) => string)) => void;
  setPlayerEngine: (engine: any) => void;
  setAmbilightMode: (mode: any) => void;
  setMixColor1: (color: string | ((prev: string) => string)) => void;
  setMixColor2: (color: string | ((prev: string) => string)) => void;
  setKeyMap: (map: KeyMap | ((prev: KeyMap) => KeyMap)) => void;
  setRemoteControlEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setPlaybackSpeed: (speed: number | ((prev: number) => number)) => void;
  setAutoPlay: (auto: boolean | ((prev: boolean) => boolean)) => void;
  setLowLatency: (low: boolean | ((prev: boolean) => boolean)) => void;
  setShowFPS: (show: boolean | ((prev: boolean) => boolean)) => void;
  setAutoPreviewEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setChannelSurfEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setLoadingStyle: (style: 'default' | 'glow' | 'minimal' | 'fire' | 'classic' | 'pulse' | 'glitch' | 'bars' | 'orbit' | ((prev: any) => any)) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      uiMode: 'modern',
      themeColor: '#dc2626',
      layoutMode: 'scroll',
      logoStyle: 'default',
      focusEffect: 'default',
      posterOrientation: 'landscape',
      clockStyle: 'original',
      top10Style: 'original',
      profilePic: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix',
      deviceType: 'pc',
      dynamicThemeEnabled: false,
      voiceControlEnabled: true,
      cinemaModeEnabled: true,
      sportsTickerEnabled: true,
      newsTickerEnabled: true,
      tmdbEnabled: true,
      tmdbApiKey: '',
      geminiApiKey: '',
      customProxyUrl: '',
      playerEngine: 'hls',
      ambilightMode: 'soft',
      mixColor1: '#dc2626',
      mixColor2: '#2563eb',
      keyMap: DEFAULT_KEY_MAP,
      remoteControlEnabled: false,
      playbackSpeed: 1,
      autoPlay: true,
      lowLatency: false,
      showFPS: false,
      autoPreviewEnabled: true,
      channelSurfEnabled: false,
      loadingStyle: 'default',

      setUiMode: (mode) => set((state) => ({ uiMode: typeof mode === 'function' ? (mode as any)(state.uiMode) : mode })),
      setThemeColor: (color) => set((state) => ({ themeColor: typeof color === 'function' ? (color as any)(state.themeColor) : color })),
      setLayoutMode: (mode) => set((state) => ({ layoutMode: typeof mode === 'function' ? (mode as any)(state.layoutMode) : mode })),
      setLogoStyle: (style) => set((state) => ({ logoStyle: typeof style === 'function' ? (style as any)(state.logoStyle) : style })),
      setFocusEffect: (effect) => set((state) => ({ focusEffect: typeof effect === 'function' ? (effect as any)(state.focusEffect) : effect })),
      setPosterOrientation: (orient) => set((state) => ({ posterOrientation: typeof orient === 'function' ? (orient as any)(state.posterOrientation) : orient })),
      setClockStyle: (clockStyle) => set({ clockStyle }),
      setTop10Style: (style) => set((state) => ({ top10Style: typeof style === 'function' ? (style as any)(state.top10Style) : style })),
      setProfilePic: (pic) => set((state) => ({ profilePic: typeof pic === 'function' ? (pic as any)(state.profilePic) : pic })),
      setDeviceType: (type) => set((state) => ({ deviceType: typeof type === 'function' ? (type as any)(state.deviceType) : type })),
      setDynamicThemeEnabled: (enabled) => set((state) => ({ dynamicThemeEnabled: typeof enabled === 'function' ? (enabled as any)(state.dynamicThemeEnabled) : enabled })),
      setVoiceControlEnabled: (enabled) => set((state) => ({ voiceControlEnabled: typeof enabled === 'function' ? (enabled as any)(state.voiceControlEnabled) : enabled })),
      setCinemaModeEnabled: (enabled) => set((state) => ({ cinemaModeEnabled: typeof enabled === 'function' ? (enabled as any)(state.cinemaModeEnabled) : enabled })),
      setSportsTickerEnabled: (enabled) => set((state) => ({ sportsTickerEnabled: typeof enabled === 'function' ? (enabled as any)(state.sportsTickerEnabled) : enabled })),
      setNewsTickerEnabled: (enabled) => set((state) => ({ newsTickerEnabled: typeof enabled === 'function' ? (enabled as any)(state.newsTickerEnabled) : enabled })),
      setTmdbEnabled: (enabled) => set((state) => ({ tmdbEnabled: typeof enabled === 'function' ? (enabled as any)(state.tmdbEnabled) : enabled })),
      setTmdbApiKey: (key) => set((state) => ({ tmdbApiKey: typeof key === 'function' ? (key as any)(state.tmdbApiKey) : key })),
      setGeminiApiKey: (key) => set((state) => ({ geminiApiKey: typeof key === 'function' ? (key as any)(state.geminiApiKey) : key })),
      setCustomProxyUrl: (url) => set((state) => ({ customProxyUrl: typeof url === 'function' ? (url as any)(state.customProxyUrl) : url })),
      setPlayerEngine: (playerEngine) => set({ playerEngine }),
      setAmbilightMode: (ambilightMode) => set({ ambilightMode }),
      setMixColor1: (color) => set((state) => ({ mixColor1: typeof color === 'function' ? (color as any)(state.mixColor1) : color })),
      setMixColor2: (color) => set((state) => ({ mixColor2: typeof color === 'function' ? (color as any)(state.mixColor2) : color })),
      setKeyMap: (map) => set((state) => ({ 
        keyMap: typeof map === 'function' ? map(state.keyMap) : map 
      })),
      setRemoteControlEnabled: (enabled) => set((state) => ({ remoteControlEnabled: typeof enabled === 'function' ? (enabled as any)(state.remoteControlEnabled) : enabled })),
      setPlaybackSpeed: (speed) => set((state) => ({ playbackSpeed: typeof speed === 'function' ? (speed as any)(state.playbackSpeed) : speed })),
      setAutoPlay: (auto) => set((state) => ({ autoPlay: typeof auto === 'function' ? (auto as any)(state.autoPlay) : auto })),
      setLowLatency: (low) => set((state) => ({ lowLatency: typeof low === 'function' ? (low as any)(state.lowLatency) : low })),
      setShowFPS: (show) => set((state) => ({ showFPS: typeof show === 'function' ? (show as any)(state.showFPS) : show })),
      setAutoPreviewEnabled: (enabled) => set((state) => ({ autoPreviewEnabled: typeof enabled === 'function' ? (enabled as any)(state.autoPreviewEnabled) : enabled })),
      setChannelSurfEnabled: (enabled) => set((state) => ({ channelSurfEnabled: typeof enabled === 'function' ? (enabled as any)(state.channelSurfEnabled) : enabled })),
      setLoadingStyle: (style) => set((state) => ({ loadingStyle: typeof style === 'function' ? (style as any)(state.loadingStyle) : style })),
    }),
    {
      name: 'moon-settings-storage',
    }
  )
);
