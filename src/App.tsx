import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { GoogleGenAI } from "@google/genai";
import { Play, Search, Upload, Link as LinkIcon, Link2, Tv, List as ListIcon, Grid, X, Info, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Plus, Check, Settings, Clock, Cloud, Sun, RefreshCw, Trash2, Heart, Monitor, Smartphone, Tablet, User, Equal, Bell, FastForward, Mic, MicOff, ArrowUpDown, Calendar, Cpu, Hash, Volume2, VolumeX, Key, Globe, Mail, ExternalLink, CircleDashed, Activity, Sparkles, Copy, Database, Pipette, TrendingUp } from 'lucide-react';
import { parseM3U, M3UChannel, M3UParseResult } from './utils/m3uParser';
import { performAISearch } from './services/aiSearchService';
import { getProxiedUrl } from './utils/fetchUtils';
import { fetchAndParseEPG, EPGData } from './utils/epgParser';
import { VideoPlayer } from './components/VideoPlayer';
import { PreviewPlayer } from './components/PreviewPlayer';
import { ChannelDetail } from './components/ChannelDetail';
import { MultiPlayer } from './components/MultiPlayer';
import { motion, AnimatePresence } from 'motion/react';
import { getDominantColor } from './utils/colorExtractor';
import { FixedSizeList as List, VariableSizeList as VList } from 'react-window';
import { useVoiceControl } from './hooks/useVoiceControl';
import { useToasts } from './hooks/useToasts';
import { useRemoteControl } from './hooks/useRemoteControl';
import { useSettings } from './hooks/useSettings';
import { usePlaylists } from './hooks/usePlaylists';
import { io } from 'socket.io-client';
import { QRCodeCanvas } from 'qrcode.react';
import MobileRemote from './components/MobileRemote';

import { VoiceSearchOverlay } from './components/VoiceSearchOverlay';
import { AdvancedEPG } from './components/EPG/AdvancedEPG';
import { BentoDashboard } from './components/Layout/BentoDashboard';
import { Playlist, UIMode, LayoutMode, LogoStyle, Top10Style, FocusEffect, SortBy, Toast, NavContext, WatcherRule, WatcherNotification, LiveMatch, NewsItem, LiveSubtitle, ProgramSummary as ProgramSummaryType } from './types';
import { cn, useContainerWidth } from './lib/utils';
import { ChannelRow } from './components/Channel/ChannelRow';
import { Logo } from './components/Layout/Logo';
import { WeatherWidget } from './components/Layout/WeatherWidget';
import { DigitalClock } from './components/Layout/DigitalClock';
import { EPGTimeline } from './components/EPG/EPGTimeline';
import { ToastContainer } from './components/Layout/ToastContainer';
import { RemotePairingModal } from './components/Modals/RemotePairingModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { SportsDashboard } from './components/SportsDashboard';
import { LiveSubtitleOverlay } from './components/Player/LiveSubtitleOverlay';
import { ProgramSummary } from './components/ProgramSummary';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { DEFAULT_M3U_URL, MULTI_CATEGORIES, PROFILE_PICS } from './constants';
import { AmbientBackground } from './components/Layout/AmbientBackground';
import { QuickSettingsOverlay } from './components/Overlay/QuickSettingsOverlay';
import { RowSkeleton } from './components/Skeleton/ChannelSkeleton';
import { HeroSection } from './components/Layout/HeroSection';
import { CommandPalette } from './components/Overlay/CommandPalette';
import { MiniPlayer } from './components/Overlay/MiniPlayer';

import { cleanChannelName } from './utils/stringUtils';

import { useDebounce } from './hooks/useDebounce';
import { useChannelStore } from './store/useChannelStore';
import { useSettingsStore } from './store/useSettingsStore';
import { usePlayerStore } from './store/usePlayerStore';
import { useNavigationStore } from './store/useNavigationStore';
import { PWAManager } from './components/PWAManager';

import { useWatcher } from './hooks/useWatcher';

export default function App() {
  const { toasts, showToast } = useToasts();
  
  // Zustand Stores
  const {
    channels, setChannels,
    playlists, setPlaylists,
    recentlyWatched, setRecentlyWatched,
    favorites, setFavorites,
    toggleFavorite, addToRecentlyWatched,
    markAsBroken, brokenChannelIds,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    visibleCategories, setVisibleCategories,
    epgData, setEpgData,
    isLoading, setIsLoading,
    watcherRules, setWatcherRules,
    watcherNotifications, setWatcherNotifications,
    canliChannels, setCanliChannels,
    diziChannels, setDiziChannels,
    filmChannels, setFilmChannels,
    epgUrl, setEpgUrl,
    playlistUrl, setPlaylistUrl,
    extraUrl, setExtraUrl,
    userCount, setUserCount,
    customOrders, setCustomOrders,
    setBrokenChannelIds,
    currentPlaylistId, setCurrentPlaylistId
  } = useChannelStore();

  const {
    uiMode, setUiMode,
    themeColor, setThemeColor,
    keyMap, setKeyMap,
    ambilightMode, setAmbilightMode,
    remoteControlEnabled, setRemoteControlEnabled,
    layoutMode, setLayoutMode,
    logoStyle, setLogoStyle,
    focusEffect, setFocusEffect,
    posterOrientation, setPosterOrientation,
    clockStyle, setClockStyle,
    top10Style, setTop10Style,
    profilePic, setProfilePic,
    deviceType, setDeviceType,
    dynamicThemeEnabled, setDynamicThemeEnabled,
    voiceControlEnabled, setVoiceControlEnabled,
    cinemaModeEnabled, setCinemaModeEnabled,
    sportsTickerEnabled, setSportsTickerEnabled,
    newsTickerEnabled, setNewsTickerEnabled,
    tmdbEnabled, setTmdbEnabled,
    tmdbApiKey, setTmdbApiKey,
    geminiApiKey, setGeminiApiKey,
    customProxyUrl, setCustomProxyUrl,
    playerEngine, setPlayerEngine,
    autoPreviewEnabled, setAutoPreviewEnabled,
    channelSurfEnabled, setChannelSurfEnabled,
    loadingStyle, setLoadingStyle,
    mixColor1, setMixColor1,
    mixColor2, setMixColor2,
    customRssUrls
  } = useSettingsStore();

  const {
    currentChannel, setCurrentChannel,
    isPlaying, setIsPlaying,
    volume: globalVolume, setVolume: setGlobalVolume,
    isMuted, setIsMuted,
    isMiniPlayer, setIsMiniPlayer,
    playbackProgress, updateProgress,
    isGlobalPlaying, setIsGlobalPlaying
  } = usePlayerStore();

  const {
    settingsArea, setSettingsArea,
    settingsSection, setSettingsSection,
    settingsFocus, setSettingsFocus,
    activeSettingsTab, setActiveSettingsTab,
    activeTab, setActiveTab,
    sidebarFocus, setSidebarFocus,
    navContext, setNavContext,
    activeRow, setActiveRow,
    activeCol, setActiveCol,
    detailFocus, setDetailFocus,
    channelMenuFocus, setChannelMenuFocus,
    quickSettingsFocus, setQuickSettingsFocus,
    quickSwitchFocus, setQuickSwitchFocus,
    showSettings, setShowSettings,
    showQuickSettings, setShowQuickSettings,
    showEPGTimeline, setShowEPGTimeline,
    showCommandPalette, setShowCommandPalette,
    showDeviceInfo, setShowDeviceInfo,
    showQuickSwitch, setShowQuickSwitch,
    showSportsDashboard, setShowSportsDashboard,
    showRemotePairingModal, setShowRemotePairingModal,
    installPrompt, setInstallPrompt
  } = useNavigationStore();

  const {
    remoteRoomId,
    isRemoteConnected,
    setIsRemoteConnected,
    isTvSocketConnected,
    setIsTvSocketConnected,
    appUrl,
    setAppUrl,
    socketRef
  } = useRemoteControl();

  const [isRemoteMode, setIsRemoteMode] = useState(() => localStorage.getItem('is_remote_mode') === 'true');
  
  const urlParams = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, '?'));
  const remoteRoomIdFromUrl = urlParams.get('remote')?.trim().toUpperCase() || null;
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const globalVolumeRef = useRef(globalVolume);
  useEffect(() => {
    globalVolumeRef.current = globalVolume;
  }, [globalVolume]);

  const updateGlobalVolume = useCallback((newVolume: number) => {
    setGlobalVolume(newVolume);
    
    if (socketRef.current) {
      socketRef.current.emit('sync-state', { volume: newVolume, isMuted: false });
    }
  }, [setGlobalVolume, socketRef]);

  // AI Gözcü (Watcher) Logic
  useWatcher({ epgData, watcherRules, setWatcherNotifications });

  const [scrolled, setScrolled] = useState(false);
  const [previewChannelId, setPreviewChannelId] = useState<string | null>(null);

  const extractChannelNumbersFromM3U = (channels: M3UChannel[]) => {
    const numbers: Record<string, string> = {};
    channels.forEach(ch => {
      // Priority: tvgNumber > channel attribute
      if (ch.tvgNumber) {
        numbers[ch.id] = ch.tvgNumber.toString();
      } else if (ch.channel) {
        numbers[ch.id] = ch.channel;
      }
    });
    return numbers;
  };

  const [savedUrl, setSavedUrl] = useState<string | null>(() => {
    const saved = localStorage.getItem('m3u_url');
    if (saved) return saved;
    const isDeleted = localStorage.getItem('m3u_deleted') === 'true';
    if (isDeleted) return null;
    localStorage.setItem('m3u_url', DEFAULT_M3U_URL);
    return DEFAULT_M3U_URL;
  });

  useEffect(() => {
    if (!dynamicThemeEnabled || !currentChannel) return;

    const imageUrl = currentChannel.logo || (currentChannel.type === 'video' ? `https://picsum.photos/seed/${currentChannel.name}/800/1200` : null);
    if (!imageUrl) return;

    getDominantColor(imageUrl).then(color => {
      if (color) {
        setThemeColor(color);
        setAmbientColor(color);
      }
    });
  }, [currentChannel, dynamicThemeEnabled, setThemeColor]);

  const [multiSessions, setMultiSessions] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('multi_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to parse multi_sessions:', e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('multi_sessions', JSON.stringify(multiSessions));
  }, [multiSessions]);

  const toggleMultiChannel = (channelId: string, sessionName: string = 'Multi Kanal') => {
    setMultiSessions(prev => {
      const current = { ...prev };
      let found = false;
      Object.keys(current).forEach(key => {
        if (key === sessionName || key.startsWith(`${sessionName} `)) {
          if (current[key].includes(channelId)) {
            current[key] = current[key].filter(id => id !== channelId);
            if (current[key].length === 0) delete current[key];
            found = true;
          }
        }
      });

      if (!found) {
        let targetSession = sessionName;
        let counter = 1;
        while (current[targetSession] && current[targetSession].length >= 9) {
          counter++;
          targetSession = `${sessionName} ${counter}`;
        }
        if (!current[targetSession]) current[targetSession] = [];
        current[targetSession] = [...current[targetSession], channelId];
      }
      return current;
    });
  };

  const [isMultiPlayerOpen, setIsMultiPlayerOpen] = useState(false);
  const [multiPlayerChannels, setMultiPlayerChannels] = useState<M3UChannel[]>([]);
  const [weatherCity, setWeatherCity] = useState<string>(() => localStorage.getItem('weather_city') || 'İzmir');
  const [hasCheckedLinks, setHasCheckedLinks] = useState(() => {
    const saved = sessionStorage.getItem('has_checked_links');
    return saved === 'true';
  });
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  const [now, setNow] = useState(new Date());

  const selectCategory = useCallback((category: string) => {
    const categoryMap: Record<string, string> = {
      'top10': 'Top 10',
      'recent': 'İzlemeye Devam Et',
      'favorites': 'Favorilerim',
      'live': 'Canlı',
      'movies': 'Film',
      'series': 'Dizi'
    };
    const targetTab = categoryMap[category] || category;
    if (visibleCategories.includes(targetTab) || targetTab === 'Tümü') {
      setActiveTab(targetTab);
      setActiveRow(0);
      setActiveCol(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setVisibleCategories(prev => 
        (Array.isArray(prev) ? prev : []).includes(targetTab) 
          ? prev.filter(c => c !== targetTab) 
          : [...prev, targetTab]
      );
    }
  }, [visibleCategories, setActiveTab, setActiveRow, setActiveCol, setVisibleCategories]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [setShowCommandPalette]);

  useEffect(() => {
    const checkReminders = () => {
      const savedReminders = localStorage.getItem('epg_reminders');
      if (!savedReminders) return;
      
      try {
        const reminders: string[] = JSON.parse(savedReminders);
        const now = new Date().getTime();
        let updatedReminders = [...reminders];
        let changed = false;

        reminders.forEach(reminderId => {
          const [channelId, startTimeStr] = reminderId.split('-');
          const startTime = parseInt(startTimeStr);
          const timeDiff = startTime - now;

          if (timeDiff > 0 && timeDiff <= 5 * 60 * 1000) {
            const channel = channels.find(ch => ch.id === channelId);
            const program = epgData?.programs[channelId]?.find(p => p.start.getTime() === startTime);
            
            if (channel && program) {
              showToast(`Hatırlatıcı: "${program.title}" (${channel.name}) 5 dakika içinde başlıyor!`, 'info');
              updatedReminders = updatedReminders.filter(r => r !== reminderId);
              changed = true;
            }
          } else if (timeDiff < -30 * 60 * 1000) {
            updatedReminders = updatedReminders.filter(r => r !== reminderId);
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem('epg_reminders', JSON.stringify(updatedReminders));
        }
      } catch (e) {
        console.error('Failed to parse epg_reminders:', e);
      }
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [channels, epgData, showToast]);

  const [ambientColor, setAmbientColor] = useState<string>('rgba(0, 0, 0, 0)');
  useEffect(() => {
    // Initial mock matches
    const mockMatches: LiveMatch[] = [
      { id: '1', homeTeam: 'Galatasaray', awayTeam: 'Fenerbahçe', homeScore: 2, awayScore: 1, minute: 78, league: 'Süper Lig', status: 'Canlı' },
      { id: '2', homeTeam: 'Beşiktaş', awayTeam: 'Trabzonspor', homeScore: 0, awayScore: 0, minute: 15, league: 'Süper Lig', status: 'Canlı' },
      { id: '3', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', homeScore: 1, awayScore: 2, minute: 62, league: 'La Liga', status: 'Canlı' },
      { id: '4', homeTeam: 'Manchester City', awayTeam: 'Liverpool', homeScore: 3, awayScore: 2, minute: 88, league: 'Premier League', status: 'Canlı' },
      { id: '5', homeTeam: 'Bayern Münih', awayTeam: 'Dortmund', homeScore: 4, awayScore: 0, minute: 45, league: 'Bundesliga', status: 'Devre Arası' }
    ];
    setLiveMatches(mockMatches);

    const matchInterval = setInterval(() => {
      setLiveMatches(prev => prev.map(match => {
        if (match.status === 'Bitti') return match;
        
        const newMinute = match.minute + 1;
        const shouldScore = Math.random() < 0.05;
        const isHome = Math.random() < 0.5;

        return {
          ...match,
          minute: newMinute > 90 ? 90 : newMinute,
          homeScore: (shouldScore && isHome) ? match.homeScore + 1 : match.homeScore,
          awayScore: (shouldScore && !isHome) ? match.awayScore + 1 : match.awayScore,
          status: newMinute > 90 ? 'Bitti' : match.status
        };
      }));
    }, 30000);

    return () => clearInterval(matchInterval);
  }, []);

  const [transitionKey, setTransitionKey] = useState(0);
  const mixedColor = useMemo(() => themeColor, [themeColor]);

  const getDeviceInfo = useCallback((key?: string) => {
    const info = {
      device: (navigator as any).platform || 'unknown',
      browser: navigator.userAgent.split(' ').pop() || 'unknown',
      screenRes: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      memory: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'unknown',
      cores: (navigator as any).hardwareConcurrency || 'unknown',
      connection: navigator.onLine ? 'Online' : 'Offline',
      language: navigator.language,
      raw: navigator.userAgent
    };
    if (key) return (info as any)[key];
    return info;
  }, []);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const handleCommandChannelSelect = useCallback((channel: M3UChannel) => {
    setCurrentChannel(channel);
    setNavContext('player');
    setShowCommandPalette(false);
  }, [setCurrentChannel, setNavContext, setShowCommandPalette]);

  const handleCommandCategorySelect = useCallback((category: string) => {
    selectCategory(category);
    setShowCommandPalette(false);
  }, [selectCategory, setShowCommandPalette]);

  const [showGlobalVolumeIndicator, setShowGlobalVolumeIndicator] = useState(false);
  const volumeIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstVolumeChange = useRef(true);

  const getCurrentProgram = useCallback((channelId: string) => {
    if (!epgData) return null;
    let programs = epgData.programs[channelId];
    
    if (!programs) {
      const targetClean = cleanChannelName(channelId);
      const matchedId = Object.keys(epgData.programs).find(id => cleanChannelName(id) === targetClean);
      if (matchedId) {
        programs = epgData.programs[matchedId];
      }
    }

    if (!programs) return null;
    const now = new Date();
    return programs.find(p => p.start <= now && p.stop >= now);
  }, [epgData]);

  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [lockedCategories, setLockedCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('locked_categories');
    return saved ? JSON.parse(saved) : [];
  });
  const [parentalPin, setParentalPin] = useState(() => localStorage.getItem('parental_pin') || '');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<{ type: 'category' | 'channel', id: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('locked_categories', JSON.stringify(lockedCategories));
  }, [lockedCategories]);

  useEffect(() => {
    localStorage.setItem('parental_pin', parentalPin);
  }, [parentalPin]);

  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepTimerActive, setSleepTimerActive] = useState(false);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sleepTimerActive && sleepTimer !== null) {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      
      sleepTimerRef.current = setInterval(() => {
        setSleepTimer(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(sleepTimerRef.current!);
            setSleepTimerActive(false);
            setCurrentChannel(null);
            setIsMiniPlayer(false);
            setNavContext('browse');
            return 0;
          }
          return prev - 1;
        });
      }, 60000);
    }
    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimerActive, sleepTimer, setCurrentChannel, setIsMiniPlayer, setNavContext]);

  const [channelForDetail, setChannelForDetail] = useState<M3UChannel | null>(null);

  const handleActorFilter = useCallback((actorName: string) => {
    setSearchQuery(actorName);
    setActiveTab('Tümü');
    setChannelForDetail(null);
    setNavContext('browse');
    setActiveRow(0);
    setActiveCol(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`${actorName} için sonuçlar filtrelendi`, "info");
  }, [showToast, setSearchQuery, setActiveTab, setNavContext, setActiveRow, setActiveCol]);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitFocus, setExitFocus] = useState(0);
  const [channelNumbers, setChannelNumbers] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('moon_channel_numbers');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('moon_channel_numbers', JSON.stringify(channelNumbers));
  }, [channelNumbers]);
  const [typedNumber, setTypedNumber] = useState<string>('');
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberInputChannelId, setNumberInputChannelId] = useState<string | null>(null);
  const typedNumberTimeout = useRef<NodeJS.Timeout | null>(null);
  const [featuredChannel, setFeaturedChannel] = useState<M3UChannel | null>(null);

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const prevMatchesRef = useRef<LiveMatch[]>([]);
  const [liveNews, setLiveNews] = useState<NewsItem[]>([]);
  const [isLiveTranslationEnabled, setIsLiveTranslationEnabled] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<LiveSubtitle | null>(null);
  const [isTranslationProcessing, setIsTranslationProcessing] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<ProgramSummaryType | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [multiSessionMenuOpen, setMultiSessionMenuOpen] = useState(false);
  const [channelMenuId, setChannelMenuId] = useState<string | null>(null);
  const [channelMenuCategory, setChannelMenuCategory] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (!localStorage.getItem('device_type')) {
        if (width < 640) setDeviceType('phone');
        else if (width < 1024) setDeviceType('tablet');
        else if (width > 2000) setDeviceType('tv');
        else setDeviceType('pc');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setDeviceType]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const epgInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Theme Logic for Modern Mode
  useEffect(() => {
    if (uiMode !== 'modern') return;

    const updateThemeFromImage = async (url: string | undefined) => {
      if (!url) return;
      const color = await getDominantColor(url);
      if (color) {
        setThemeColor(color);
      }
    };

    if (navContext === 'player' && currentChannel) {
      updateThemeFromImage(currentChannel.logo);
    } else if (featuredChannel) {
      updateThemeFromImage(featuredChannel.logo);
    }
  }, [uiMode, featuredChannel, currentChannel, navContext]);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-color', themeColor);
    localStorage.setItem('theme_color', themeColor);
    
    // Update theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      (metaThemeColor as HTMLMetaElement).name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    (metaThemeColor as HTMLMetaElement).content = themeColor;
  }, [themeColor]);

  const uiClasses = useMemo(() => ({
    container: cn(
      "min-h-screen text-white font-sans selection:bg-red-600/30 overflow-x-hidden transition-all duration-1000 relative bg-[#0a0a0a]",
      layoutMode === 'fixed-focus' && "h-screen overflow-hidden",
      deviceType === 'tv' && "text-lg",
      deviceType === 'phone' && "text-sm"
    ),
    card: cn(
      "transition-all duration-300",
      uiMode === 'modern' && "rounded-2xl backdrop-blur-md bg-white/5 border border-white/10",
      uiMode === 'classic' && "rounded-lg bg-zinc-900 border border-zinc-800",
      uiMode === 'minimalist' && "rounded-none bg-transparent border-b border-white/5"
    ),
    button: cn(
      "transition-all duration-200 font-bold",
      uiMode === 'modern' && "rounded-xl",
      uiMode === 'classic' && "rounded-md",
      uiMode === 'minimalist' && "rounded-none border-b-2 border-transparent"
    ),
    input: cn(
      "outline-none transition-all",
      uiMode === 'modern' && "rounded-xl bg-black/40 border-white/10",
      uiMode === 'classic' && "rounded-md bg-zinc-900 border-zinc-700",
      uiMode === 'minimalist' && "rounded-none bg-transparent border-b border-white/20"
    )
  }), [uiMode, layoutMode, deviceType]);

  useEffect(() => {
    localStorage.setItem('weather_city', weatherCity);
  }, [weatherCity]);

  useEffect(() => {
    localStorage.setItem('recently_watched', JSON.stringify(recentlyWatched));
  }, [recentlyWatched]);

  useEffect(() => {
    if (channels.length === 0) {
      setActiveRow(0);
      setActiveCol(0);
    }
  }, [channels.length, setActiveRow, setActiveCol]);

  const handleDeleteChannel = (channelId: string) => {
    if (channelId.startsWith('multi-view-session-')) {
      const sessionName = channelId.replace('multi-view-session-', '');
      setMultiSessions(prev => {
        const next = { ...prev };
        delete next[sessionName];
        return next;
      });
      return;
    }
    setChannels(prev => prev.filter(ch => ch.id !== channelId));
    setFavorites(prev => prev.filter(id => id !== channelId));
    setCanliChannels(prev => prev.filter(id => id !== channelId));
    setDiziChannels(prev => prev.filter(id => id !== channelId));
    setFilmChannels(prev => prev.filter(id => id !== channelId));
    setRecentlyWatched(prev => prev.filter(ch => ch.id !== channelId));
  };

  const availableCategories = useMemo(() => {
    const cats = new Set<string>(['Tümü']);
    
    Object.entries(multiSessions).forEach(([sessionName, ids]) => {
      if ((ids as string[]).length > 0) {
        const baseCategory = MULTI_CATEGORIES.find(cat => sessionName.startsWith(cat)) || 'Multi Kanal';
        cats.add(`${baseCategory} (Multi)`);
      }
    });

    if (favorites.length > 0) cats.add('Favorilerim');
    if (canliChannels.length > 0) cats.add('Canlı');
    if (diziChannels.length > 0) cats.add('Dizi');
    if (filmChannels.length > 0) cats.add('Film');
    if (recentlyWatched.length > 0) cats.add('İzlemeye Devam Et');

    let hasTop10 = false;
    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      if (!hasTop10 && ch.tvgNumber !== undefined && ch.tvgNumber >= 1 && ch.tvgNumber <= 10) {
        hasTop10 = true;
        cats.add('Top 10');
      }
      if (ch.group) cats.add(ch.group);
    }

    if (brokenChannelIds.size > 0) cats.add('Çalışmayanlar');
    return Array.from(cats);
  }, [channels, multiSessions, favorites, canliChannels, diziChannels, filmChannels, recentlyWatched, brokenChannelIds]);

  useEffect(() => {
    const el = categoryScrollRef.current;
    if (el) {
      const handler = () => {
        const x = el.scrollLeft;
        // Scroll check logic
      };
      el.addEventListener('scroll', handler);
      return () => el.removeEventListener('scroll', handler);
    }
  }, [availableCategories]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Group channels by category
  const groupedChannels = useMemo<[string, M3UChannel[]][]>(() => {
    const query = debouncedSearchQuery.toLowerCase();
    const filtered = query 
      ? channels.filter(channel => 
          channel.name.toLowerCase().includes(query) ||
          String(channel.group || '').toLowerCase().includes(query)
        )
      : channels;

    if (query) {
      return [['Arama Sonuçları', filtered]];
    }

    const groups: Record<string, M3UChannel[]> = {};
    const favoriteSet = new Set(favorites);
    const canliSet = new Set(canliChannels);
    const diziSet = new Set(diziChannels);
    const filmSet = new Set(filmChannels);

    const addGroup = (title: string, matched: M3UChannel[]) => {
      if (matched.length === 0) return;
      // Multi Kanal sessions should be visible in "Tümü" OR if they match the tab name
      // Also, if a multi-channel session is categorized as "Dizi (Multi)", it should show up in "Dizi" tab
      if (
        activeTab === 'Tümü' || 
        activeTab === title || 
        (title.endsWith(' (Multi)') && title.startsWith(activeTab)) ||
        (activeTab === 'Multi Kanal' && title.endsWith(' (Multi)'))
      ) {
        groups[title] = matched;
      }
    };
    
    // Add Multi Kanal sessions
    Object.entries(multiSessions).forEach(([sessionName, sessionChannelIds]) => {
      const ids = sessionChannelIds as string[];
      if (ids.length > 0) {
        const matched = channels
          .filter(ch => ids.includes(ch.id))
          .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        
        if (matched.length > 0) {
          const baseCategory = MULTI_CATEGORIES.find(cat => sessionName.startsWith(cat)) || 'Multi Kanal';
          const groupTitle = `${baseCategory} (Multi)`;
          const multiViewChannel: M3UChannel = {
            id: `multi-view-session-${sessionName}`,
            name: sessionName,
            group: groupTitle,
            logo: matched[0]?.logo || '',
            urls: matched.map(ch => ch.urls[0]),
            description: `${matched.length} kanal bir arada izlemek için tıklayın`,
            isMultiView: true,
            sessionName: sessionName,
            sessionChannels: ids
          };
          addGroup(groupTitle, [multiViewChannel]);
        }
      }
    });

    addGroup('Popüler', channels.sort(() => Math.random() - 0.5).slice(0, 15));
    
    if (favoriteSet.size > 0) {
      addGroup('Favorilerim', channels.filter(ch => favoriteSet.has(ch.id)).sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id)));
    }

    const top10 = channels.filter(ch => ch.tvgNumber !== undefined && ch.tvgNumber >= 1 && ch.tvgNumber <= 10).sort((a, b) => (a.tvgNumber || 0) - (b.tvgNumber || 0));
    addGroup('Top 10', top10);

    if (canliSet.size > 0) {
      addGroup('Canlı', channels.filter(ch => canliSet.has(ch.id)).sort((a, b) => canliChannels.indexOf(a.id) - canliChannels.indexOf(b.id)));
    }
    if (diziSet.size > 0) {
      addGroup('Dizi', channels.filter(ch => diziSet.has(ch.id)).sort((a, b) => diziChannels.indexOf(a.id) - diziChannels.indexOf(b.id)));
    }
    if (filmSet.size > 0) {
      addGroup('Film', channels.filter(ch => filmSet.has(ch.id)).sort((a, b) => filmChannels.indexOf(a.id) - filmChannels.indexOf(b.id)));
    }

    if (recentlyWatched.length > 0) {
      addGroup('İzlemeye Devam Et', recentlyWatched);
    }

    const epgChannels = epgData ? channels.filter(ch => epgData.programs[ch.tvgId || ch.name] && epgData.programs[ch.tvgId || ch.name].length > 0) : [];
    if (epgChannels.length > 0) {
      addGroup('Yayın Akışı', epgChannels.slice(0, 50));
    }

    for (const channel of channels) {
      // If a channel is broken, it will be marked but still visible in its original group
      // unless we explicitly want to filter it out. For now, let's keep them visible.
      // if (brokenChannelIds.has(channel.id)) continue;
      const groupName = channel.group || 'General';
      if (activeTab === 'Tümü' || activeTab === groupName) {
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(channel);
      }
    }

    Object.keys(groups).forEach(groupName => {
      if (sortBy === 'name') groups[groupName].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      else if (sortBy === 'number') groups[groupName].sort((a, b) => (a.tvgNumber || 999999) - (b.tvgNumber || 999999));

      // Duplicates removal
      if (!groupName.endsWith(' (Multi)')) {
        const seenUrls = new Set<string>();
        groups[groupName] = groups[groupName].filter(channel => {
          const hasSeen = (channel.urls || []).some(url => seenUrls.has(url));
          if (hasSeen) return false;
          (channel.urls || []).forEach(url => seenUrls.add(url));
          return true;
        });
      }
    });

    return Object.entries(groups)
      .filter(([group]) => {
        const specialGroups = ['Çalışmayanlar'];
        return !specialGroups.includes(group);
      })
      .sort((a, b) => {
        const order = ['İzlemeye Devam Et', 'Popüler', 'Top 10', 'Multi Kanal', 'Favorilerim', 'Canlı', 'Film', 'Dizi', 'Yayın Akışı'];
        const getOrderIndex = (name: string) => {
          const idx = order.indexOf(name);
          if (idx !== -1) return idx;
          if (name.endsWith(' (Multi)')) return 2;
          return 100;
        };
        const aIdx = getOrderIndex(a[0]);
        const bIdx = getOrderIndex(b[0]);
        if (aIdx !== 100 || bIdx !== 100) return aIdx - bIdx;
        return b[1].length - a[1].length;
      });
  }, [channels, debouncedSearchQuery, recentlyWatched, visibleCategories, favorites, canliChannels, diziChannels, filmChannels, brokenChannelIds, multiSessions, activeTab, epgData, sortBy]);
  
  const allFlattenedChannels = useMemo(() => {
    return groupedChannels.flatMap(([_, groupChannels]) => groupChannels);
  }, [groupedChannels]);

  // Ambient UI: Update ambient color when browsing
  useEffect(() => {
    if (!dynamicThemeEnabled || navContext !== 'browse') return;

    const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
    if (!selectedChannel) return;

    const imageUrl = selectedChannel.logo || (selectedChannel.type === 'video' ? `https://picsum.photos/seed/${selectedChannel.name}/800/1200` : null);
    if (!imageUrl) return;

    const timer = setTimeout(() => {
      getDominantColor(imageUrl).then(color => {
        if (color) {
          setAmbientColor(color);
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [activeRow, activeCol, navContext, groupedChannels, dynamicThemeEnabled]);

  useEffect(() => {
    if (channels.length === 0) {
      setFeaturedChannel(null);
      return;
    }
    if (navContext === 'browse' && activeRow >= 0 && activeCol >= 0) {
      const group = groupedChannels[activeRow];
      if (group && group[1][activeCol]) {
        setFeaturedChannel(group[1][activeCol]);
        return;
      }
    }
    setFeaturedChannel(channels[0]);
  }, [channels, navContext, activeRow, activeCol, groupedChannels]);

  const toggleManualCategory = useCallback((channelId: string, type: 'canli' | 'dizi' | 'film' | 'multi', sessionName?: string) => {
    const setters: Record<string, React.Dispatch<React.SetStateAction<string[]>>> = {
      canli: setCanliChannels,
      dizi: setDiziChannels,
      film: setFilmChannels
    };
    
    if (type === 'multi') {
      toggleMultiChannel(channelId, sessionName);
      return;
    }

    const channel = channels.find(ch => ch.id === channelId);
    if (!channel) return;

    setters[type](prev => {
      const current = Array.isArray(prev) ? prev : [];
      const isAlreadyIn = current.includes(channelId);
      
      if (isAlreadyIn) {
        return current.filter(id => id !== channelId);
      } else {
        const hasSameUrl = (current || []).some(existingId => {
          const existingChannel = channels.find(ch => ch.id === existingId);
          return existingChannel && (existingChannel.urls || []).some(url => (channel.urls || []).includes(url));
        });
        
        if (hasSameUrl) return current;
        return [...current, channelId];
      }
    });
  }, [channels, toggleMultiChannel]);

  const getCategoryGroups = useCallback((type: string) => {
    const groupNames = Array.from(new Set([
      ...channels.map(ch => String(ch.group || 'General')),
      'Canlı', 'Film', 'Dizi'
    ]));
    return groupNames.filter((g: string) => {
      const gl = g.toLowerCase();
      if (type === 'live') return gl.includes('live') || gl.includes('canlı') || gl.includes('canli') || gl.includes('tv');
      if (type === 'movies') return gl.includes('movie') || gl.includes('film') || gl.includes('sinema');
      if (type === 'series') return gl.includes('series') || gl.includes('dizi') || gl.includes('show');
      if (type === 'mixed') return !gl.includes('live') && !gl.includes('canlı') && !gl.includes('canli') && !gl.includes('tv') && !gl.includes('movie') && !gl.includes('film') && !gl.includes('sinema') && !gl.includes('series') && !gl.includes('dizi') && !gl.includes('show');
      return false;
    });
  }, [channels]);

  const toggleCategory = useCallback((category: string) => {
    const labels: Record<string, string> = {
      multi: 'Multi Kanal',
      top10: 'Top 10',
      favorites: 'Favorilerim',
      recent: 'İzlemeye Devam Et',
      live: 'Canlı',
      movies: 'Film',
      series: 'Dizi',
      epg: 'Yayın Akışı'
    };
    const target = labels[category] || category;
    
    setCollapsedRows(prev => {
      const next = new Set(prev);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });

    if (mainListRef.current) {
      mainListRef.current.resetAfterIndex(0);
    }
  }, []);

  const isCategoryActive = useCallback((category: string) => {
    const labels: Record<string, string> = {
      multi: 'Multi Kanal',
      top10: 'Top 10',
      favorites: 'Favorilerim',
      recent: 'İzlemeye Devam Et',
      live: 'Canlı',
      movies: 'Film',
      series: 'Dizi'
    };
    const target = labels[category] || category;
    return collapsedRows.has(target);
  }, [collapsedRows]);

  const moveChannel = useCallback((channelId: string, direction: 'left' | 'right', category: string) => {
    if (category === 'Favorilerim') {
      setFavorites(prev => {
        const idx = prev.indexOf(channelId);
        if (idx === -1) return prev;
        const newArr = [...prev];
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
        [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
        return newArr;
      });
    } else if (category === 'Canlı') {
      setCanliChannels(prev => {
        const idx = prev.indexOf(channelId);
        if (idx === -1) return prev;
        const newArr = [...prev];
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
        [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
        return newArr;
      });
    } else if (category === 'Dizi') {
      setDiziChannels(prev => {
        const idx = prev.indexOf(channelId);
        if (idx === -1) return prev;
        const newArr = [...prev];
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
        [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
        return newArr;
      });
    } else if (category === 'Film') {
      setFilmChannels(prev => {
        const idx = prev.indexOf(channelId);
        if (idx === -1) return prev;
        const newArr = [...prev];
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
        [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
        return newArr;
      });
    } else if (category.endsWith(' (Multi)')) {
      setMultiSessions(prev => {
        const next = { ...prev };
        const sessionName = Object.keys(next).find(key => {
          const groupTitle = `${MULTI_CATEGORIES.find(cat => key.startsWith(cat)) || 'Multi Kanal'} (Multi)`;
          return groupTitle === category && next[key].includes(channelId);
        });
        
        if (sessionName) {
          const idx = next[sessionName].indexOf(channelId);
          if (idx !== -1) {
            const newArr = [...next[sessionName]];
            const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
            if (targetIdx >= 0 && targetIdx < newArr.length) {
              [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
              next[sessionName] = newArr;
            }
          }
        }
        return next;
      });
    } else {
      setCustomOrders(prev => {
        const group = groupedChannels.find(([name]) => name === category);
        if (!group) return prev;
        const currentOrder = prev[category] || group[1].map(ch => ch.id);
        const idx = currentOrder.indexOf(channelId);
        if (idx === -1) return prev;
        const newOrder = [...currentOrder];
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newOrder.length) return prev;
        [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
        return { ...prev, [category]: newOrder };
      });
    }
  }, [groupedChannels]);

  useEffect(() => {
    console.log('navContext changed to:', navContext);
  }, [navContext]);

  const handleNextFeatured = useCallback(() => {
    if (!featuredChannel || allFlattenedChannels.length === 0) return;
    const currentIndex = allFlattenedChannels.findIndex(ch => ch.id === featuredChannel.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % allFlattenedChannels.length;
    setFeaturedChannel(allFlattenedChannels[nextIndex]);
  }, [featuredChannel, allFlattenedChannels]);

  const handlePrevFeatured = useCallback(() => {
    if (!featuredChannel || allFlattenedChannels.length === 0) return;
    const currentIndex = allFlattenedChannels.findIndex(ch => ch.id === featuredChannel.id);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + allFlattenedChannels.length) % allFlattenedChannels.length;
    setFeaturedChannel(allFlattenedChannels[prevIndex]);
  }, [featuredChannel, allFlattenedChannels]);

  const handleChannelDetail = useCallback((channel: M3UChannel, category?: string) => {
    setChannelMenuId(channel.id);
    setChannelMenuCategory(category || '');
    setNavContext('channel-menu');
    setChannelMenuFocus(0);
  }, []);

  const handleChannelSelect = useCallback((channel: M3UChannel) => {
    console.log('handleChannelSelect called for:', channel.name);
    
    // Update ambient color based on channel
    const colors = [
      'rgba(59, 130, 246, 0.3)', // blue
      'rgba(16, 185, 129, 0.3)', // green
      'rgba(245, 158, 11, 0.3)', // amber
      'rgba(239, 68, 68, 0.3)',  // red
      'rgba(139, 92, 246, 0.3)', // violet
      'rgba(236, 72, 153, 0.3)', // pink
    ];
    const colorIndex = (channel.name.length + (channel.group?.length || 0)) % colors.length;
    setAmbientColor(colors[colorIndex]);
    setTransitionKey(prev => prev + 1);

    setIsMiniPlayer(false);

    if (channel.isMultiView) {
      const sessionChannelIds = channel.sessionChannels || [];
      const matched = channels.filter(ch => sessionChannelIds.includes(ch.id));
      if (matched.length > 0) {
        setMultiPlayerChannels(matched);
        setIsMultiPlayerOpen(true);
        setNavContext('player');
      }
      return;
    }
    
    setRecentlyWatched(prev => {
      const filtered = (prev || []).filter(ch => 
        ch.id !== channel.id && 
        !(ch.urls || []).some(url => (channel.urls || []).includes(url))
      );
      return [channel, ...filtered].slice(0, 20);
    });

    setCurrentChannel(channel);
    setNavContext('player');
  }, [isMiniPlayer, channels, setRecentlyWatched, setCurrentChannel, setNavContext, setIsMiniPlayer]);

  useEffect(() => {
    if (!showSportsDashboard && !sportsTickerEnabled && !newsTickerEnabled) return;

    const fetchScores = async () => {
      try {
        const response = await fetch('/api/scores');
        if (!response.ok) throw new Error('API error');
        const data: LiveMatch[] = await response.json();
        
        // Goal Alert Logic
        if (prevMatchesRef.current.length > 0) {
          data.forEach(match => {
            const prev = prevMatchesRef.current.find(m => m.id === match.id);
            if (prev) {
              if (match.homeScore > prev.homeScore) {
                showToast(`GOOOL! ${match.homeTeam} skorunu ${match.homeScore}-${match.awayScore} yaptı!`, 'success');
              } else if (match.awayScore > prev.awayScore) {
                showToast(`GOOOL! ${match.awayTeam} skorunu ${match.homeScore}-${match.awayScore} yaptı!`, 'success');
              }
            }
          });
        }
        prevMatchesRef.current = data;

        // Try to match matches with current channel list for easy navigation
        const scoresWithChannels = data.map(match => {
          const homeLower = match.homeTeam.toLowerCase();
          const awayLower = match.awayTeam.toLowerCase();
          
          const matchedChannel = channels.find(c => {
            const name = c.name.toLowerCase();
            return name.includes(homeLower) || name.includes(awayLower);
          });

          return {
            ...match,
            channelId: matchedChannel?.id
          };
        });
        
        setLiveMatches(scoresWithChannels);
      } catch (error) {
        console.error('Failed to fetch real-time scores:', error);
      }
    };

    const fetchNews = async () => {
      try {
        const queryParams = customRssUrls && customRssUrls.length > 0 
          ? `?urls=${encodeURIComponent(customRssUrls.join(','))}`
          : '';
        const response = await fetch(`/api/news${queryParams}`);
        if (!response.ok) throw new Error('API error');
        const data: NewsItem[] = await response.json();
        setLiveNews(data);
      } catch (error) {
        console.error('Failed to fetch live news:', error);
      }
    };

    fetchScores();
    fetchNews();
    const interval = setInterval(() => {
      fetchScores();
      fetchNews();
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [showSportsDashboard, sportsTickerEnabled, newsTickerEnabled, appUrl, channels, customRssUrls]);

  useEffect(() => {
    if (!isLiveTranslationEnabled || !currentChannel) {
      setCurrentSubtitle(null);
      return;
    }

    const isForeign = currentChannel.name.toLowerCase().match(/cnn|bbc|france|sky|al jazeera|discovery|nat geo|hbo|netflix|disney|fox|mtv|vh1|eurosport|espn/);
    
    if (!isForeign) {
      setIsLiveTranslationEnabled(false);
      showToast("Bu kanal için canlı çeviri şu an desteklenmiyor.", "info");
      return;
    }

    setIsTranslationProcessing(true);
    
    const generateSubtitles = async () => {
      if (!geminiApiKey) return;
      
      const channelName = currentChannel.name;
      const currentProgram = epgData?.programs[currentChannel.id]?.find(p => new Date() >= p.start && new Date() <= p.stop);
      const context = currentProgram ? `${currentProgram.title}: ${currentProgram.description}` : channelName;

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const prompt = `
        Sen bir canlı TV çevirmenisin. Şu an "${channelName}" kanalında "${context}" yayını yapılıyor.
        Bu yayının içeriğine uygun, o an konuşuluyor olabilecek 3-4 saniyelik, çok kısa ve doğal bir Türkçe çeviri cümlesi yaz.
        Sadece çeviriyi yaz, başka bir şey yazma.
        Örn: "Bugün ekonomideki son gelişmeleri aktarıyoruz." veya "Savunma oyuncusu topu kornere çeldi."
      `;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: { maxOutputTokens: 50 }
        });
        
        const text = response.text || "Ses analiz ediliyor...";
        setCurrentSubtitle({
          id: Math.random().toString(36).substr(2, 9),
          text: text.trim(),
          timestamp: Date.now()
        });
        setIsTranslationProcessing(false);
      } catch (error) {
        console.error("Subtitle generation failed:", error);
      }
    };

    generateSubtitles();
    const interval = setInterval(generateSubtitles, 6000);
    return () => clearInterval(interval);
  }, [isLiveTranslationEnabled, currentChannel, epgData, geminiApiKey]);

  const handleToggleSummary = useCallback(async () => {
    if (!currentChannel || !geminiApiKey) return;
    
    if (showSummary) {
      setShowSummary(false);
      return;
    }

    setShowSummary(true);
    setIsSummaryLoading(true);
    setCurrentSummary(null);

    try {
      const channelName = currentChannel.name;
      const currentProgram = epgData?.programs[currentChannel.id]?.find(p => new Date() >= p.start && new Date() <= p.stop);
      const context = currentProgram ? `${currentProgram.title}: ${currentProgram.description}` : channelName;

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const prompt = `
        Şu an "${channelName}" kanalında "${context}" yayını yapılıyor. 
        Bu programın içeriğini, o an ne konuşuluyor olabileceğini veya genel konusunu analiz et.
        Kullanıcıya programın gidişatı hakkında bilgi veren 3 maddelik çok kısa, öz ve samimi bir özet çıkar.
        Her madde en fazla 10-12 kelime olsun.
        Yanıtı JSON formatında ver: { "title": "Program Adı", "summary": ["madde 1", "madde 2", "madde 3"] }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          maxOutputTokens: 200 
        }
      });

      const data = JSON.parse(response.text || "{}");
      setCurrentSummary({
        id: Math.random().toString(36).substr(2, 9),
        title: data.title || currentProgram?.title || channelName,
        summary: data.summary || ["İçerik analiz edilemedi."],
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Summary generation failed:", error);
      showToast("Özet oluşturulamadı.", "error");
      setShowSummary(false);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [currentChannel, geminiApiKey, epgData, showSummary, showToast]);

  const handleAISearch = async (query: string) => {
    if (!query.trim() || !geminiApiKey) return;
    
    setIsAISearching(true);
    setAiExplanation(null);
    
    try {
      const result = await performAISearch(query, visibleCategories, geminiApiKey);
      
      if (result.category) {
        selectCategory(result.category);
      }
      
      if (result.searchQuery) {
        setSearchQuery(result.searchQuery);
      }

      // Handle System Actions
      if (result.actions) {
        if (result.actions.volume !== undefined) {
          setGlobalVolume(result.actions.volume / 100);
          setIsMuted(false);
        }
        if (result.actions.sleepTimer !== undefined) {
          setSleepTimer(result.actions.sleepTimer);
          setSleepTimerActive(true);
        }
        if (result.actions.mute === true) {
          setIsMuted(true);
        }
        if (result.actions.unmute === true) {
          setIsMuted(false);
        }
        if (result.actions.addWatcher) {
          const newRule: WatcherRule = {
            id: Math.random().toString(36).substr(2, 9),
            keyword: result.actions.addWatcher.keyword,
            type: result.actions.addWatcher.type,
            createdAt: Date.now(),
            isActive: true
          };
          setWatcherRules(prev => [...prev, newRule]);
        }
        if (result.actions.showSportsDashboard === true) {
          setShowSportsDashboard(true);
        }
        if (result.actions.toggleTranslation === true) {
          setIsLiveTranslationEnabled(prev => !prev);
        }
        if (result.actions.toggleSummary === true) {
          handleToggleSummary();
        }
      }
      
      if (result.explanation) {
        setAiExplanation(result.explanation);
        // Clear explanation after 5 seconds
        setTimeout(() => setAiExplanation(null), 5000);
      }
    } catch (error) {
      console.error('AI Search failed:', error);
    } finally {
      setIsAISearching(false);
    }
  };

  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);

  const handleVoiceCommand = useCallback((command: string, value?: string) => {
    console.log('Voice command received:', command, value);
    setVoiceTranscript(value || command);
    setTimeout(() => setVoiceTranscript(null), 3000);

    switch (command) {
      case 'play-channel':
        if (value) {
          const found = channels.find(ch => ch.name.toLowerCase().includes(value.toLowerCase()));
          if (found) {
            handleChannelSelect(found);
            speak(`${found.name} açılıyor.`);
          } else {
            speak(`${value} kanalı bulunamadı.`);
          }
        }
        break;
      case 'volume-up':
        setGlobalVolume(prev => Math.min(1, prev + 0.1));
        setIsMuted(false);
        break;
      case 'volume-down':
        setGlobalVolume(prev => Math.max(0, prev - 0.1));
        setIsMuted(false);
        break;
      case 'mute':
        setIsMuted(prev => !prev);
        break;
      case 'set-volume':
        if (value) {
          const vol = parseInt(value);
          if (!isNaN(vol)) {
            setGlobalVolume(vol / 100);
            setIsMuted(false);
          }
        }
        break;
      case 'open-settings':
        setShowSettings(true);
        setNavContext('settings');
        break;
      case 'close':
        if (navContext === 'player') {
          setCurrentChannel(null);
          setNavContext('browse');
        } else if (showSettings) {
          setShowSettings(false);
          setNavContext('browse');
        } else if (navContext === 'channel-menu') {
          setChannelMenuId(null);
          setNavContext('browse');
        }
        break;
      case 'toggle-favorite':
        if (currentChannel) {
          toggleFavorite(currentChannel.id);
        } else if (navContext === 'browse' && activeRow !== -1) {
          const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
          if (selectedChannel) toggleFavorite(selectedChannel.id);
        }
        break;
      case 'filter-category':
        if (value) {
          const categoryMap: Record<string, string> = {
            'haber': 'HABER',
            'spor': 'SPOR',
            'film': 'SİNEMA',
            'dizi': 'DİZİ',
            'ulusal': 'ULUSAL',
            'belgesel': 'BELGESEL'
          };
          const target = categoryMap[value.toLowerCase()] || value.toUpperCase();
          selectCategory(target);
        }
        break;
      case 'what-is-on':
        if (currentChannel && epgData?.[currentChannel.id]) {
          const now = new Date();
          const currentProgram = epgData[currentChannel.id].find(p => 
            new Date(p.start) <= now && new Date(p.stop) >= now
          );
          if (currentProgram) {
            speak(`${currentChannel.name} kanalında şu an ${currentProgram.title} yayında.`);
          } else {
            speak(`${currentChannel.name} kanalında şu an yayın bilgisi bulunmuyor.`);
          }
        } else {
          speak("Şu an bir kanal izlemiyorsunuz.");
        }
        break;
      case 'search':
        if (value) setSearchQuery(value);
        break;
    }
  }, [channels, handleChannelSelect, navContext, showSettings, currentChannel, toggleFavorite, activeRow, groupedChannels, activeCol]);

  const { isListening, isProcessing: isVoiceProcessing, startListening, stopListening, speak, error: voiceError } = useVoiceControl({
    onCommand: handleVoiceCommand,
    apiKey: geminiApiKey
  });

  const activeRowRef = useRef(activeRow);
  const activeColRef = useRef(activeCol);
  const groupedChannelsRef = useRef(groupedChannels);
  const navContextRef = useRef(navContext);
  const channelForDetailRef = useRef(channelForDetail);
  const currentChannelRef = useRef(currentChannel);
  const mainListRef = useRef<VList>(null);

  const rowHeightHelper = useCallback((index: number) => {
    const groupArr = groupedChannels as [string, M3UChannel[]][];
    if (!groupArr[index]) return 0;
    const [group] = groupArr[index];
    if (collapsedRows.has(group)) return 80;
    
    const isMd = typeof window !== 'undefined' && window.innerWidth >= 768;
    let itemWidth = 0;
    if (deviceType === 'tv') {
      itemWidth = posterOrientation === 'landscape' ? (isMd ? 288 : 192) : (isMd ? 224 : 160);
    } else if (deviceType === 'phone') {
      itemWidth = posterOrientation === 'landscape' ? 128 : 96;
    } else {
      itemWidth = posterOrientation === 'landscape' ? (isMd ? 224 : 160) : (isMd ? 176 : 128);
    }
    
    const extraHeight = group === 'Top 10' 
      ? (layoutMode === 'fixed-focus' ? 100 : 160) 
      : group === 'İzlemeye Devam Et'
      ? (layoutMode === 'fixed-focus' ? 70 : 100)
      : (layoutMode === 'fixed-focus' ? 60 : 90);

    const listHeight = posterOrientation === 'landscape' 
      ? (itemWidth * 9/16 + extraHeight) 
      : (itemWidth * 3/2 + extraHeight);
      
    // Total height calculation
    const headerHeight = 60;
    const marginBuffer = layoutMode === 'fixed-focus' ? 0 : (group === 'Top 10' ? 30 : 8);
    const contentPadding = 20;
    
    return listHeight + headerHeight + contentPadding + marginBuffer;
  }, [groupedChannels, collapsedRows, deviceType, posterOrientation, layoutMode]);

  useEffect(() => {
    if (navContext === 'browse' && activeRow >= 0 && mainListRef.current) {
      mainListRef.current.scrollToItem(activeRow, 'center');
    }
  }, [activeRow, navContext]);

  useEffect(() => {
    if (mainListRef.current) {
      mainListRef.current.resetAfterIndex(0);
    }
  }, [collapsedRows, deviceType, posterOrientation, layoutMode, groupedChannels]);

  useEffect(() => { activeRowRef.current = activeRow; }, [activeRow]);
  useEffect(() => { activeColRef.current = activeCol; }, [activeCol]);
  useEffect(() => { groupedChannelsRef.current = groupedChannels; }, [groupedChannels]);
  useEffect(() => { navContextRef.current = navContext; }, [navContext]);
  useEffect(() => { channelForDetailRef.current = channelForDetail; }, [channelForDetail]);
  useEffect(() => { currentChannelRef.current = currentChannel; }, [currentChannel]);

  // Scroll category filters into view when navigating via DPAD
  useEffect(() => {
    if (navContext === 'browse' && activeRow === -1 && categoryScrollRef.current) {
      const container = categoryScrollRef.current;
      const focusedElement = container.children[activeCol] as HTMLElement;
      if (focusedElement) {
        const containerWidth = container.offsetWidth;
        const elementLeft = focusedElement.offsetLeft;
        const elementWidth = focusedElement.offsetWidth;
        
        // Center the focused element
        container.scrollTo({
          left: elementLeft - (containerWidth / 2) + (elementWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  }, [activeRow, activeCol, navContext]);

  // handleRemoteCommand moved down to after handleUrlSubmit definition

  // Auto-preview logic
  useEffect(() => {
    setPreviewChannelId(null);
    if (navContext !== 'browse' || activeRow === -1 || !autoPreviewEnabled) return;

    const timer = setTimeout(() => {
      const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
      if (selectedChannel) {
        setPreviewChannelId(selectedChannel.id);
      }
    }, 2000); // 2 seconds delay

    return () => clearTimeout(timer);
  }, [activeRow, activeCol, navContext, groupedChannels]);

  useEffect(() => {
    setActiveRow(0);
    setActiveCol(0);
  }, [searchQuery]);

  useEffect(() => {
    if (channels.length > 0) {
      const categories = Array.from(new Set(channels.map(ch => ch.group || 'General')));
      setVisibleCategories(prev => {
        const combined = Array.from(new Set([...prev, ...categories]));
        return combined;
      });
    }
  }, [channels]);

  const fetchWithProxy = async (url: string) => {
    return fetch(getProxiedUrl(url, customProxyUrl));
  };

  const resolveUrl = (rawUrl: string) => {
    if (!rawUrl) return [];
    let trimmed = rawUrl.trim();
    
    // Normalize Dropbox URLs
    if (trimmed.includes('dropbox.com')) {
      trimmed = trimmed
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('dl.dropbox.com', 'dl.dropboxusercontent.com');
      
      // Handle dl=0 or dl=1
      if (trimmed.includes('dl=0')) {
        trimmed = trimmed.replace('dl=0', 'dl=1');
      } else if (!trimmed.includes('dl=1')) {
        trimmed = trimmed + (trimmed.includes('?') ? '&dl=1' : '?dl=1');
      }
    }
    
    // If it already starts with http, use it as is
    if (trimmed.startsWith('http')) return [trimmed];
    
    // If it contains a slash and looks like a shortener (e.g. cutt.ly/abc, t.ly/xyz)
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      const domain = parts[0].toLowerCase();
      const shorteners = ['cutt.ly', 't.ly', 'bit.ly', 'tinyurl.com', 'rebrand.ly', 'is.gd', 'buff.ly'];
      
      if (shorteners.includes(domain)) {
        return [`https://${trimmed}`, `http://${trimmed}`];
      }
      
      // If it has a dot in the first part, it might be a custom domain shortener or a direct server
      if (domain.includes('.')) {
        return [`https://${trimmed}`, `http://${trimmed}`];
      }
    }

    // If it doesn't look like a URL or a domain with path, treat as a cutt.ly code
    // This maintains backward compatibility with the existing logic
    return [`https://cutt.ly/${trimmed}`, trimmed];
  };

  const handleLoadEPG = useCallback(async (url?: string) => {
    const targetUrl = url || epgUrl;
    if (!targetUrl) return;

    setIsLoading(true);
    try {
      const urlsToTry = resolveUrl(targetUrl);
      let epg = null;
      let successUrl = '';
      for (const u of urlsToTry) {
        try {
          epg = await fetchAndParseEPG(u, customProxyUrl);
          if (epg) {
            successUrl = u;
            break;
          }
        } catch (e) {
          console.error(`EPG load failed for ${u}:`, e);
        }
      }
      
      if (epg) {
        setEpgData(epg);
        setEpgUrl(successUrl);
        localStorage.setItem('epg_url', successUrl);
        showToast('EPG başarıyla yüklendi!', 'success');
      } else {
        throw new Error('EPG yüklenemedi.');
      }
    } catch (err) {
      console.error('EPG loading error:', err);
      showToast(err instanceof Error ? err.message : 'EPG yüklenirken bir hata oluştu.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [epgUrl, customProxyUrl]);

  const handleUrlSubmit = async (urlOverride?: string) => {
    const rawUrl = urlOverride || playlistUrl;
    if (!rawUrl) return;

    setIsLoading(true);
    setChannels([]); // Clear current channels while loading new ones

    const urlsToTry = resolveUrl(rawUrl);

    let finalUrl = '';
    let content = '';

    try {
      for (const url of urlsToTry) {
        try {
          // Try with CapacitorHttp on native platforms first
          if (Capacitor.isNativePlatform()) {
            try {
              const response = await CapacitorHttp.get({
                url: url,
                connectTimeout: 15000,
                readTimeout: 15000,
              });
              if (response.status === 200 && response.data) {
                content = response.data;
                finalUrl = url;
                break;
              }
            } catch (e) {
              console.warn(`CapacitorHttp failed for ${url}:`, e);
            }
          }

          // Fallback to standard fetch (or if not native)
          const response = await fetch(getProxiedUrl(url, customProxyUrl));
          if (response.ok) {
            content = await response.text();
            finalUrl = url;
            break;
          }
        } catch (e) {
          console.warn(`Fetch failed for ${url}:`, e);
        }
      }

      if (!content) {
        throw new Error('Playlist içeriği alınamadı. Lütfen URL\'yi kontrol edin.');
      }

      const result = parseM3U(content);
      setChannels(result.channels);
      
      // Auto extraction of EPG if present in M3U
      if (result.epgUrl) {
        handleLoadEPG(result.epgUrl);
      }
      
      // Update channel count in playlists array
      if (currentPlaylistId) {
        setPlaylists(prev => prev.map(p => 
          p.id === currentPlaylistId ? { ...p, channelCount: result.channels.length } : p
        ));
      }
      
      // Auto extraction of channel numbers
      const extractedNumbers = extractChannelNumbersFromM3U(result.channels);
      if (Object.keys(extractedNumbers).length > 0) {
        setChannelNumbers(prev => ({ ...prev, ...extractedNumbers }));
      }

      setVisibleCategories([]); // Reset categories to show all by default on new load
      setActiveTab('Tümü'); // Reset to All tab
      
      // Auto categorization based on group names
      const canliIds: string[] = [];
      const filmIds: string[] = [];
      const diziIds: string[] = [];
      
      result.channels.forEach(ch => {
        const group = (ch.group || '').toUpperCase();
        if (group.includes('CANLI') || group.includes('LIVE')) canliIds.push(ch.id);
        else if (group.includes('FILM') || group.includes('FİLM') || group.includes('MOVIE') || group.includes('SINEMA') || group.includes('SİNEMA')) filmIds.push(ch.id);
        else if (group.includes('DIZI') || group.includes('DİZİ') || group.includes('SERIE')) diziIds.push(ch.id);
      });
      
      if (canliIds.length > 0) setCanliChannels(canliIds);
      if (filmIds.length > 0) setFilmChannels(filmIds);
      if (diziIds.length > 0) setDiziChannels(diziIds);

      // Extract and load EPG if present in M3U header and not already set
      if (result.epgUrl && !epgUrl) {
        handleLoadEPG(result.epgUrl);
      }
      
      if (!urlOverride) {
        localStorage.setItem('m3u_url', rawUrl);
        localStorage.removeItem('m3u_deleted');
        setSavedUrl(rawUrl);
      }

      showToast(`${result.channels.length} kanal başarıyla yüklendi.`, 'success');
    } catch (error) {
      console.error('Playlist loading error:', error);
      showToast(error instanceof Error ? error.message : 'Playlist yüklenirken bir hata oluştu.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const primaryHeroButtons = useMemo(() => {
    if (!featuredChannel) return [];
    const isFav = favorites.includes(featuredChannel.id);
    return [
      { id: 'play', label: 'Oynat', icon: Play, action: () => handleChannelSelect(featuredChannel) },
      { id: 'favorite', label: isFav ? 'Çıkar' : 'Ekle', icon: Heart, active: isFav, action: () => toggleFavorite(featuredChannel.id) },
      { id: 'guide', label: 'Rehber', icon: Calendar, action: () => setShowEPGTimeline(true) },
      { id: 'details', label: 'Detaylar', icon: Info, action: () => {
        setChannelForDetail(featuredChannel);
        setNavContext('channel-detail');
      } }
    ];
  }, [featuredChannel, favorites, toggleFavorite, setShowEPGTimeline, setChannelForDetail, setNavContext, handleChannelSelect]);

  const filterHeroButtons = useMemo(() => {
    if (!featuredChannel) return [];
    
    const isVisible = (name: string) => visibleCategories.includes(name);
    
    const isCategoryActive = (type: string) => {
      const groups = getCategoryGroups(type);
      if (!groups || groups.length === 0) return false;
      return (groups || []).some(g => (visibleCategories || []).includes(g));
    };

    const getCategoryChannelsCount = (type: string) => {
      const groups = getCategoryGroups(type);
      return channels.filter(ch => {
        const g = ch.group || 'General';
        if (groups.includes(g)) return true;
        if (type === 'live' && canliChannels.includes(ch.id)) return true;
        if (type === 'movies' && filmChannels.includes(ch.id)) return true;
        if (type === 'series' && diziChannels.includes(ch.id)) return true;
        return false;
      }).length;
    };

    const hasLive = getCategoryChannelsCount('live') > 0;
    const hasMovies = getCategoryChannelsCount('movies') > 0;
    const hasSeries = getCategoryChannelsCount('series') > 0;
    const hasTop10 = (channels || []).some(ch => ch.tvgNumber !== undefined && ch.tvgNumber >= 1 && ch.tvgNumber <= 10);
    const hasEPG = epgData && Object.keys(epgData).length > 0;

    return [
      { id: 'search', label: 'Ara', icon: Search, action: () => {
        const searchInput = document.getElementById('hero-search-input');
        if (searchInput) searchInput.focus();
      }, isActive: true },
      geminiApiKey && {
        id: 'ai-discovery',
        label: isAISearching ? 'Analiz Ediliyor...' : 'Yapay Zeka Keşfi',
        icon: Sparkles,
        action: () => {
          const searchInput = document.getElementById('hero-search-input');
          if (searchInput) {
            searchInput.focus();
            if (searchQuery.length > 5) {
              handleAISearch(searchQuery);
            }
          }
        },
        isActive: isAISearching
      },
      voiceControlEnabled && {
        id: 'voice',
        label: isListening ? 'Dinliyor...' : 'Sesli Kontrol',
        icon: isListening ? Mic : MicOff,
        action: isListening ? stopListening : startListening,
        isActive: isListening
      },
      {
        id: 'remote-toggle',
        label: isRemoteConnected ? 'Kumanda Bağlı' : 'Kumanda Bağla',
        icon: Smartphone,
        action: () => {
          setShowRemotePairingModal(true);
          setNavContext('browse');
        },
        isActive: remoteControlEnabled
      },
      {
        id: 'device-info',
        label: 'Cihaz',
        icon: Monitor,
        action: () => {
          setShowDeviceInfo(!showDeviceInfo);
          if (!showDeviceInfo) setNavContext('browse');
        },
        isActive: showDeviceInfo
      },
      { id: 'sort', label: `Sırala: ${sortBy === 'default' ? 'Varsayılan' : sortBy === 'name' ? 'İsim' : 'Sayı'}`, icon: ArrowUpDown, action: () => {
        const next: Record<SortBy, SortBy> = { 'default': 'name', 'name': 'number', 'number': 'default', 'added': 'default' };
        setSortBy(next[sortBy]);
      }, isActive: true },
      recentlyWatched.length > 0 && { 
        id: 'recent', 
        label: 'İzlemeye Devam Et', 
        icon: Clock, 
        action: () => toggleCategory('recent'),
        isActive: collapsedRows.has('İzlemeye Devam Et')
      },
      hasTop10 && {
        id: 'top10',
        label: 'Top 10',
        icon: Tv,
        action: () => toggleCategory('top10'),
        isActive: collapsedRows.has('Top 10')
      },
      Object.keys(multiSessions).length > 0 && {
        id: 'multi',
        label: 'Multi Kanal',
        icon: Grid,
        action: () => toggleCategory('multi'),
        isActive: collapsedRows.has('Multi Kanal')
      },
      favorites.length > 0 && { 
        id: 'favorites', 
        label: 'Favorilerim', 
        icon: Heart, 
        action: () => toggleCategory('favorites'),
        isActive: collapsedRows.has('Favorilerim')
      },
      hasLive && {
        id: 'live',
        label: 'Canlı',
        icon: Tv,
        action: () => toggleCategory('live'),
        isActive: collapsedRows.has('Canlı')
      },
      hasMovies && {
        id: 'movies',
        label: 'Film',
        icon: Play,
        action: () => toggleCategory('movies'),
        isActive: collapsedRows.has('Film')
      },
      hasSeries && {
        id: 'series',
        label: 'Dizi',
        icon: ListIcon,
        action: () => toggleCategory('series'),
        isActive: collapsedRows.has('Dizi')
      }
    ].filter((b): b is { id: string, label: string, icon: any, action: () => void, isActive: boolean } => !!b);
  }, [featuredChannel, recentlyWatched.length, favorites.length, Object.keys(multiSessions).length, themeColor, collapsedRows, channels, canliChannels.length, filmChannels.length, diziChannels.length, activeTab, epgData, sortBy, remoteControlEnabled, isRemoteConnected, isListening, voiceControlEnabled, isAISearching, aiExplanation, searchQuery]);

  // EPG Reminders check
  useEffect(() => {
    const checkReminders = () => {
      const saved = localStorage.getItem('epg_reminders');
      if (!saved) return;
      const reminders = JSON.parse(saved);
      const now = new Date();
      
      reminders.forEach((reminderId: string) => {
        const [channelId, startTimeStr] = reminderId.split('-');
        const startTime = new Date(parseInt(startTimeStr));
        
        // Notify 1 minute before
        const diff = startTime.getTime() - now.getTime();
        if (diff > 0 && diff <= 60000) {
          const channel = channels.find(ch => ch.id === channelId);
          if (channel) {
            // Show a simple alert for now as we are in an iframe
            // In a production app, we would use a proper toast system
            console.log(`Hatırlatıcı: ${channel.name} yayını başlamak üzere!`);
            
            // Remove reminder after notification
            const newReminders = reminders.filter((r: string) => r !== reminderId);
            localStorage.setItem('epg_reminders', JSON.stringify(newReminders));
          }
        }
      });
    };

    const timer = setInterval(checkReminders, 30000);
    return () => clearInterval(timer);
  }, [channels]);

  const {
    toggleSection,
    handleKeyDown,
    handleKeyUp
  } = useKeyboardNavigation({
    channels,
    groupedChannels,
    currentChannel,
    setCurrentChannel,
    showSettings,
    setShowSettings,
    showQuickSettings,
    setShowQuickSettings,
    showEPGTimeline,
    setShowEPGTimeline,
    isMiniPlayer,
    setIsMiniPlayer,
    setIsGlobalPlaying,
    globalVolume,
    updateGlobalVolume,
    setIsMuted,
    handleChannelSelect,
    toggleFavorite,
    toggleManualCategory,
    moveChannel,
    setRecentlyWatched,
    setTypedNumber,
    setChannelNumbers,
    setShowNumberInput,
    setNumberInputChannelId,
    setChannelMenuId,
    setChannelMenuCategory,
    setChannelForDetail,
    setShowRemotePairingModal,
    setShowDeviceInfo,
    showDeviceInfo,
    themeColor,
    setThemeColor,
    uiMode,
    setUiMode,
    setPlayerEngine,
    setAmbilightMode,
    setSleepTimer,
    setSleepTimerActive,
    mixedColor,
    setProfilePic,
    setDeviceType,
    setDynamicThemeEnabled,
    setVoiceControlEnabled,
    setTmdbApiKey,
    setGeminiApiKey,
    setCustomProxyUrl,
    setClockStyle,
    setTop10Style,
    setFocusEffect,
    setLogoStyle,
    setPosterOrientation,
    layoutMode,
    setLayoutMode,
    multiSessionMenuOpen,
    setMultiSessionMenuOpen,
    channelMenuId,
    channelMenuCategory,
    numberInputChannelId,
    channelForDetail,
    primaryHeroButtons,
    filterHeroButtons,
    handleUrlSubmit,
    setSavedUrl,
    setPlaylistUrl,
    setCollapsedRows,
    extraUrl,
    detailFocus,
    setDetailFocus,
    allFlattenedChannels,
    navContext,
    setNavContext,
    activeRow,
    setActiveRow,
    activeCol,
    setActiveCol,
    settingsArea,
    setSettingsArea,
    settingsSection,
    setSettingsSection,
    settingsFocus,
    setSettingsFocus,
    sidebarFocus,
    setSidebarFocus,
    channelMenuFocus,
    setChannelMenuFocus,
    quickSettingsFocus,
    setQuickSettingsFocus,
    quickSwitchFocus,
    setQuickSwitchFocus,
    showQuickSwitch,
    setShowQuickSwitch,
    recentlyWatched,
    searchQuery,
    isAISearching,
    handleAISearch,
    activeSettingsTab,
    setActiveSettingsTab,
    expandedSections,
    setExpandedSections,
    showSportsDashboard,
    setShowSportsDashboard,
    keyMap
  });

  const handleKeyDownRef = useRef(handleKeyDown);
  const handleKeyUpRef = useRef(handleKeyUp);

  useEffect(() => {
    handleKeyDownRef.current = handleKeyDown;
    handleKeyUpRef.current = handleKeyUp;
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    const onKeyUp = (e: KeyboardEvent) => handleKeyUpRef.current(e);
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (socketRef.current && isRemoteConnected && channels.length > 0) {
      socketRef.current.emit('sync-state', {
        channels: channels.slice(0, 2000).map(c => ({
          id: c.id,
          name: c.name,
          logo: c.logo,
          group: c.group
        }))
      });
    }
  }, [channels, isRemoteConnected]);

  useEffect(() => {
    if (socketRef.current && isRemoteConnected) {
      socketRef.current.emit('sync-state', {
        currentChannel: currentChannel ? { id: currentChannel.id, name: currentChannel.name } : null
      });
    }
  }, [currentChannel, isRemoteConnected]);

  const handleRemoteCommand = useCallback((command: string, value?: any) => {
    console.log('Remote command received:', command, value);
    
    switch (command) {
      case 'nav-up':
        handleKeyDown({ key: 'ArrowUp', preventDefault: () => {}, stopPropagation: () => {} } as any);
        break;
      case 'nav-down':
        handleKeyDown({ key: 'ArrowDown', preventDefault: () => {}, stopPropagation: () => {} } as any);
        break;
      case 'nav-left':
        handleKeyDown({ key: 'ArrowLeft', preventDefault: () => {}, stopPropagation: () => {} } as any);
        break;
      case 'nav-right':
        handleKeyDown({ key: 'ArrowRight', preventDefault: () => {}, stopPropagation: () => {} } as any);
        break;
      case 'nav-ok':
        handleKeyDown({ key: 'Enter', preventDefault: () => {}, stopPropagation: () => {} } as any);
        break;
      case 'volume-up':
        updateGlobalVolume(Math.min(1, globalVolumeRef.current + 0.1));
        setIsMuted(false);
        break;
      case 'volume-down':
        updateGlobalVolume(Math.max(0, globalVolumeRef.current - 0.1));
        setIsMuted(false);
        break;
      case 'channel-up':
        if (currentChannelRef.current) {
          const currentIndex = channels.findIndex(ch => ch.id === currentChannelRef.current?.id);
          if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % channels.length;
            handleChannelSelect(channels[nextIndex]);
          }
        } else {
          setActiveRow(prev => Math.max(0, prev - 1));
        }
        break;
      case 'channel-down':
        if (currentChannelRef.current) {
          const currentIndex = channels.findIndex(ch => ch.id === currentChannelRef.current?.id);
          if (currentIndex !== -1) {
            const prevIndex = (currentIndex - 1 + channels.length) % channels.length;
            handleChannelSelect(channels[prevIndex]);
          }
        } else {
          const maxRows = channels.length === 0 ? 5 : groupedChannelsRef.current.length;
          setActiveRow(prev => Math.min(maxRows - 1, prev + 1));
        }
        break;
      case 'add-favorite':
        const category = value;
        let channelToFav = null;
        if (currentChannelRef.current) {
          channelToFav = currentChannelRef.current;
        } else if (navContextRef.current === 'browse' && activeRowRef.current !== -1) {
          channelToFav = groupedChannelsRef.current[activeRowRef.current]?.[1][activeColRef.current];
        }
        
        if (channelToFav) {
          if (category === 'live') {
            toggleManualCategory(channelToFav.id, 'canli');
            showToast(`${channelToFav.name} Canlı TV listesine eklendi`, "success");
          } else if (category === 'movie') {
            toggleManualCategory(channelToFav.id, 'film');
            showToast(`${channelToFav.name} Film listesine eklendi`, "success");
          } else if (category === 'series') {
            toggleManualCategory(channelToFav.id, 'dizi');
            showToast(`${channelToFav.name} Dizi listesine eklendi`, "success");
          } else if (category === 'multi') {
            toggleManualCategory(channelToFav.id, 'multi');
            showToast(`${channelToFav.name} Multi Kanal listesine eklendi`, "success");
          } else {
            toggleFavorite(channelToFav.id);
            showToast(`${channelToFav.name} favorilere eklendi`, "success");
          }
        }
        break;
      case 'mute':
        setIsMuted(prev => !prev);
        break;
      case 'open-settings':
        setShowSettings(true);
        setNavContext('settings');
        break;
      case 'open-search':
        setNavContext('browse');
        break;
      case 'close':
        if (navContextRef.current === 'player') {
          setCurrentChannel(null);
          setNavContext('browse');
        } else if (showSettings) {
          setShowSettings(false);
          setNavContext('browse');
        } else if (navContextRef.current === 'channel-menu') {
          setChannelMenuId(null);
          setNavContext('browse');
        } else if (navContextRef.current === 'channel-detail') {
          setChannelForDetail(null);
          setNavContext('browse');
        }
        break;
      case 'toggle-favorite':
        if (currentChannelRef.current) {
          toggleFavorite(currentChannelRef.current.id);
        } else if (navContextRef.current === 'browse' && activeRowRef.current !== -1) {
          const selectedChannel = groupedChannelsRef.current[activeRowRef.current]?.[1][activeColRef.current];
          if (selectedChannel) toggleFavorite(selectedChannel.id);
        }
        break;
      case 'toggle-mini-player':
        if (currentChannelRef.current) {
          setIsMiniPlayer(prev => !prev);
        }
        break;
      case 'toggle-epg':
        setShowEPGTimeline(prev => !prev);
        break;
      case 'preview-player':
        if (navContextRef.current === 'browse' && activeRowRef.current >= 0 && activeColRef.current >= 0) {
          const selectedChannel = groupedChannelsRef.current[activeRowRef.current]?.[1][activeColRef.current];
          if (selectedChannel) {
            if (isMiniPlayer && currentChannelRef.current?.id === selectedChannel.id) {
              setIsMiniPlayer(false);
              setCurrentChannel(null);
            } else {
              setCurrentChannel(selectedChannel);
              setIsMiniPlayer(true);
            }
          }
        }
        break;
      case 'digit-0': case 'digit-1': case 'digit-2': case 'digit-3': case 'digit-4':
      case 'digit-5': case 'digit-6': case 'digit-7': case 'digit-8': case 'digit-9':
        const digit = parseInt(command.split('-')[1]);
        console.log('Digit command received:', digit);
        // We could implement channel switching by number here if we had channel numbers
        break;
      case 'type-text':
        if (typeof value === 'string') {
          setSearchQuery(value);
          setNavContext('browse');
          if (value === '') {
            setActiveRow(0);
            setActiveCol(0);
          }
        }
        break;
      case 'back':
        // Simulate Backspace key
        handleKeyDown({ key: 'Backspace', preventDefault: () => {}, stopPropagation: () => {} } as any);
        break;
      case 'exit':
        setNavContext('browse');
        setCurrentChannel(null);
        setShowSettings(false);
        setChannelMenuId(null);
        setSearchQuery('');
        break;
      case 'select-channel':
        if (value) {
          const channelToSelect = channels.find(c => c.id === value || c.name === value);
          if (channelToSelect) {
            handleChannelSelect(channelToSelect);
          }
        }
        break;
      case 'voice-trigger':
        startListening();
        break;
    }
  }, [channels, handleChannelSelect, toggleFavorite, startListening, setShowSettings, setNavContext, setCurrentChannel, setChannelMenuId, setChannelForDetail, handleUrlSubmit, extraUrl, setPlaylistUrl, setSavedUrl, handleKeyDown]);

  const handleRemoteCommandRef = useRef(handleRemoteCommand);
  useEffect(() => { handleRemoteCommandRef.current = handleRemoteCommand; }, [handleRemoteCommand]);

  useEffect(() => {
    if (!appUrl || !remoteRoomId) return;

    const normalizedAppUrl = appUrl.replace(/\/$/, '');
    console.log('TV app connecting to socket...', normalizedAppUrl);
    
    const socket = io(normalizedAppUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 120000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('TV app socket connected');
      setIsTvSocketConnected(true);
      if (remoteControlEnabled) {
        socket.emit('join-room', remoteRoomId);
      }
    });

    socket.on('user-count', (count: number) => {
      setUserCount(count);
    });

    socket.on('connect_error', (err) => {
      console.error('TV app socket connection error:', err);
      setIsTvSocketConnected(false);
    });

    socket.on('command-received', ({ command, value }: { command: string, value?: any }) => {
      console.log('TV app received remote command:', command, value);
      handleRemoteCommandRef.current(command, value);
    });

    socket.on('user-joined', (data) => {
      console.log('Remote user joined room:', data);
      setIsRemoteConnected(true);
      showToast("Mobil kumanda bağlandı", "success");
      
      // Sync initial state
      if (channels.length > 0) {
        const syncData = {
          channels: channels.slice(0, 2000).map(c => ({
            id: c.id,
            name: c.name,
            logo: c.logo,
            group: c.group
          })),
          currentChannel: currentChannel ? { id: currentChannel.id, name: currentChannel.name } : null
        };
        socket.emit('sync-state', syncData);
      }
    });

    socket.on('request-sync', () => {
      console.log('Remote requested sync');
      if (channels.length > 0) {
        const syncData = {
          channels: channels.slice(0, 2000).map(c => ({
            id: c.id,
            name: c.name,
            logo: c.logo,
            group: c.group
          })),
          currentChannel: currentChannel ? { id: currentChannel.id, name: currentChannel.name } : null
        };
        socket.emit('sync-state', syncData);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('TV app socket disconnected:', reason);
      setIsTvSocketConnected(false);
      setIsRemoteConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [remoteRoomId, showToast, appUrl, remoteControlEnabled]);

  const checkAbortController = useRef<AbortController | null>(null);

  const checkChannelLinks = async (channelsToCheck: M3UChannel[]) => {
    if (isCheckingLinks) return;
    
    if (checkAbortController.current) {
      checkAbortController.current.abort();
    }
    checkAbortController.current = new AbortController();
    const signal = checkAbortController.current.signal;
    
    setIsCheckingLinks(true);
    setCheckProgress(0);
    
    const broken = new Set<string>();
    const concurrencyLimit = 100;
    const timeoutDuration = 3000;
    
    for (let i = 0; i < channelsToCheck.length; i += concurrencyLimit) {
      if (signal.aborted) break;
      
      const chunk = channelsToCheck.slice(i, i + concurrencyLimit);
      await Promise.all(chunk.map(async (channel) => {
        if (signal.aborted) return;
        
        let atLeastOneWorks = false;
        // Check URLs for this channel
        try {
          // Try all URLs for the channel
          for (const url of channel.urls) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
              
              const response = await fetch(getProxiedUrl(url), {
                signal: controller.signal,
                headers: { 'Range': 'bytes=0-1024' }
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok || response.status === 206) {
                atLeastOneWorks = true;
                break;
              }
            } catch (e) {
              // This URL failed, try next
            }
          }
        } catch (e) {
          // Channel check failed
        }

        if (!atLeastOneWorks) {
          broken.add(channel.id);
        }
      }));
      
      if (signal.aborted) break;
      
      setCheckProgress(Math.round(((i + chunk.length) / channelsToCheck.length) * 100));
      if (broken.size > 0) {
        setBrokenChannelIds(new Set(broken));
      }
    }
    
    if (!signal.aborted) {
      setIsCheckingLinks(false);
      setHasCheckedLinks(true);
      sessionStorage.setItem('has_checked_links', 'true');
    }
  };

  const lastLoadedPlaylistIdRef = useRef<string | null>(null);
  const lastLoadedTimestampRef = useRef<number | null>(null);

  // Response to playlist switching from store (e.g. from SettingsModal)
  useEffect(() => {
    if (currentPlaylistId) {
      const pl = playlists.find(p => p.id === currentPlaylistId);
      if (pl && (currentPlaylistId !== lastLoadedPlaylistIdRef.current || pl.lastUpdated !== lastLoadedTimestampRef.current)) {
        lastLoadedPlaylistIdRef.current = currentPlaylistId;
        lastLoadedTimestampRef.current = pl.lastUpdated || null;
        handleUrlSubmit(pl.url);
      }
    }
  }, [currentPlaylistId, playlists]);

  // Auto-load saved URL on startup
  useEffect(() => {
    const autoLoad = async () => {
      const savedEpgUrl = localStorage.getItem('epg_url');
      if (savedEpgUrl) setEpgUrl(savedEpgUrl);

      if (savedUrl && channels.length === 0) {
        await handleUrlSubmit(savedUrl);
      } else {
        setIsLoading(false);
      }
    };
    autoLoad();
  }, [savedUrl]);

  // Trigger link check on initial load
  useEffect(() => {
    if (channels.length > 0 && !hasCheckedLinks && !isCheckingLinks) {
      checkChannelLinks(channels);
    }
  }, [channels, hasCheckedLinks, isCheckingLinks]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { channels: parsedChannels, epgUrl: extractedEpgUrl } = parseM3U(content);
      setChannels(parsedChannels);

      // Auto extraction of EPG if present in M3U
      if (extractedEpgUrl) {
        handleLoadEPG(extractedEpgUrl);
      }

      // Auto extraction of channel numbers
      const extractedNumbers = extractChannelNumbersFromM3U(parsedChannels);
      if (Object.keys(extractedNumbers).length > 0) {
        setChannelNumbers(prev => ({ ...prev, ...extractedNumbers }));
      }

      setVisibleCategories([]); // Reset categories to show all by default on new load
      setActiveTab('Tümü'); // Reset to All tab
      
      // Add to playlists collection
      const newPlaylist: Playlist = {
        id: 'file-' + Date.now(),
        name: file.name.replace('.m3u', '').replace('.m3u8', ''),
        url: 'local-file', // Marker for local files
        channels: parsedChannels,
        channelCount: parsedChannels.length
      };
      setPlaylists(prev => {
        const filtered = prev.filter(p => p.url !== 'local-file');
        return [...filtered, newPlaylist];
      });
      setCurrentPlaylistId(newPlaylist.id);

      // Auto categorization based on group names
      const canliIds: string[] = [];
      const filmIds: string[] = [];
      const diziIds: string[] = [];
      
      parsedChannels.forEach(ch => {
        const group = (ch.group || '').toUpperCase();
        if (group.includes('CANLI') || group.includes('LIVE')) canliIds.push(ch.id);
        else if (group.includes('FILM') || group.includes('FİLM') || group.includes('MOVIE') || group.includes('SINEMA') || group.includes('SİNEMA')) filmIds.push(ch.id);
        else if (group.includes('DIZI') || group.includes('DİZİ') || group.includes('SERIE')) diziIds.push(ch.id);
      });
      
      if (canliIds.length > 0) setCanliChannels(canliIds);
      if (filmIds.length > 0) setFilmChannels(filmIds);
      if (diziIds.length > 0) setDiziChannels(diziIds);

      setHasCheckedLinks(false);
      setBrokenChannelIds(new Set());

      // Use extracted EPG URL if provided in M3U header and not already set
      if (extractedEpgUrl && !epgUrl) {
        handleLoadEPG(extractedEpgUrl);
      }

      if (parsedChannels.length > 0) {
        showToast('Dosya başarıyla yüklendi!', 'success');
        setNavContext('browse');
        setActiveRow(0);
        setActiveCol(0);
      } else {
        showToast('Bu dosyada kanal bulunamadı.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const [tickerType, setTickerType] = useState<'scores' | 'news'>('scores');

  // If mobile and no remote ID, or explicitly in remote mode
  // If we have a remote ID in URL, we are an ACTIVE remote
  const renderTickers = () => {
    const isVisible = (tickerType === 'scores' && sportsTickerEnabled) || (tickerType === 'news' && newsTickerEnabled);
    if (!isVisible || showSportsDashboard) return null;

    return (
      <div className="fixed bottom-0 left-0 right-0 z-[60] h-10 bg-black/40 backdrop-blur-3xl border-t border-white/5 flex items-center group/ticker">
        {/* Toggle Button / Label */}
        <button 
          onClick={() => setTickerType(prev => prev === 'scores' ? 'news' : 'scores')}
          className={cn(
            "h-full px-4 flex items-center gap-2 shrink-0 z-10 transition-all duration-500",
            tickerType === 'scores' 
              ? "bg-gradient-to-r from-red-600 to-red-500 shadow-[4px_0_15px_rgba(220,38,38,0.3)]" 
              : "bg-gradient-to-r from-blue-600 to-blue-500 shadow-[4px_0_15px_rgba(37,99,235,0.3)]"
          )}
        >
          {tickerType === 'scores' ? (
            <>
              <Activity className="w-3.5 h-3.5 text-white animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Canlı Skor</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 text-white animate-spin-slow" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Son Dakika</span>
            </>
          )}
          <TrendingUp className={cn("w-3 h-3 text-white transition-transform duration-500", tickerType === 'news' && "rotate-180")} />
        </button>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-hidden relative">
          {/* Gradient Edge Masks */}
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/40 to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/40 to-transparent z-10" />
          
          <div className={cn(
            "flex whitespace-nowrap",
            tickerType === 'scores' ? "animate-ticker-fast" : "animate-ticker"
          )}>
            {tickerType === 'scores' ? (
              [...liveMatches, ...liveMatches].map((match, idx) => (
                <div 
                  key={`${match.id}-${idx}`} 
                  className="inline-flex items-center gap-4 px-10 border-r border-white/5 hover:bg-white/5 transition-colors cursor-pointer group/item"
                  onClick={() => setShowSportsDashboard(true)}
                >
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{match.league}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-white/90 group-hover/item:text-white transition-colors">{match.homeTeam}</span>
                    <div className="bg-white/5 px-2 py-0.5 rounded border border-white/10 group-hover/item:border-white/30 transition-all">
                      <span className="text-xs font-mono font-black text-red-500">{match.homeScore} - {match.awayScore}</span>
                    </div>
                    <span className="text-xs font-black text-white/90 group-hover/item:text-white transition-colors">{match.awayTeam}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-zinc-400 group-hover/item:text-red-400">{match.minute}'</span>
                  </div>
                </div>
              ))
            ) : (
              [...liveNews, ...liveNews].map((news, idx) => (
                <div 
                  key={`${news.id}-${idx}`} 
                  className="inline-flex items-center gap-4 px-10 border-r border-white/5 hover:bg-white/5 transition-colors group/item cursor-pointer"
                  onClick={() => {
                    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                    const fetchSummary = async () => {
                      if (!geminiApiKey) {
                        showToast(`Haber: ${news.title}`, 'info');
                        return;
                      }
                      showToast("AI Haberi özetliyor...", "info");
                      try {
                        const prompt = `Şu haberi 2-3 cümlede özetle ve varsa ilgili bir tavsiye ver: "${news.title}" (Kaynak: ${news.source})`;
                        const result = await ai.models.generateContent({ 
                          model: "gemini-3-flash-preview",
                          contents: prompt,
                          config: { maxOutputTokens: 200 }
                        });
                        const summary = result.text || `Haber: ${news.title}`;
                        showToast(summary, "info");
                      } catch (e) {
                         showToast(`Haber: ${news.title}`, "info");
                      }
                    };
                    fetchSummary();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{news.source}</span>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">{news.category}</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-100 group-hover/item:text-white transition-colors">{news.title}</span>
                  <span className="text-[10px] font-black text-zinc-600 group-hover/item:text-zinc-400 uppercase italic shrink-0">{news.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={() => {
            if (tickerType === 'scores') setSportsTickerEnabled(false);
            else setNewsTickerEnabled(false);
          }}
          className="h-full px-4 flex items-center justify-center bg-black/20 hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all border-l border-white/5 group/close"
          title="Kapat"
        >
          <X className="w-4 h-4 group-hover/close:rotate-90 transition-transform duration-300" />
        </button>
      </div>
    );
  };

  if (remoteRoomIdFromUrl) {
    console.log('Mobile remote mode detected, roomId:', remoteRoomIdFromUrl);
    return <MobileRemote roomId={remoteRoomIdFromUrl} appUrl={appUrl} />;
  }

  // Only show pairing screen if explicitly in remote control mode and no playlist URL is loaded
  if (isRemoteMode && !localStorage.getItem('m3u_url')) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-8">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">MOON IPTV</h1>
        <p className="text-zinc-500 text-sm mb-10 max-w-xs">Televizyonunuzu kontrol etmek için eşleşme kodunu girin.</p>
        
        <div className="w-full max-w-xs space-y-4">
          <input 
            type="text"
            placeholder="EŞLEŞME KODU (Örn: AB12CD)"
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-4 text-center text-xl font-black tracking-[0.3em] uppercase outline-none focus:border-orange-500 transition-all"
            onChange={(e) => {
              if (e.target.value.length === 6) {
                setIsRemoteMode(true);
                window.location.href = `/?remote=${e.target.value.toUpperCase()}`;
              }
            }}
          />
          <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">6 HANELİ KODU GİRİN</p>
        </div>

        <div className="mt-12 pt-12 border-t border-white/5 w-full max-w-xs space-y-4">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`${appUrl.replace(/\/$/, '')}/?remote=${remoteRoomId}`);
              showToast('Kendi bağlantı adresiniz kopyalandı!', 'success');
            }}
            className="w-full py-4 bg-white/5 text-zinc-400 text-xs font-bold hover:text-white transition-colors rounded-2xl border border-white/5 flex items-center justify-center gap-2"
          >
            <LinkIcon className="w-4 h-4" />
            BAĞLANTIYI KOPYALA
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('is_remote_mode');
              localStorage.setItem('m3u_url', DEFAULT_M3U_URL);
              window.location.reload();
            }}
            className="w-full py-4 bg-white/5 text-zinc-400 text-xs font-bold hover:text-white transition-colors rounded-2xl border border-white/5"
          >
            VEYA TV UYGULAMASINI AÇ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={uiClasses.container}>
      {/* Ambient Background Light */}
      <AnimatePresence>
        {currentChannel && navContext === 'player' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
          >
            <div 
              className="absolute -inset-[30%] blur-[150px] opacity-60 mix-blend-screen"
              style={{ 
                background: `radial-gradient(circle at 50% 50%, ${themeColor} 0%, transparent 60%)`,
                transition: 'background 2s ease-in-out'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <PWAManager installPrompt={installPrompt} setInstallPrompt={setInstallPrompt} />
      {/* Dynamic Background Glow for Modern Mode */}
      {uiMode === 'modern' && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <motion.div 
            animate={{ 
              backgroundColor: themeColor,
              opacity: [0.05, 0.15, 0.05],
              scale: [1, 1.3, 1],
              x: ['-10%', '10%', '-10%'],
              y: ['-10%', '5%', '-10%']
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-0 w-[80%] h-[80%] rounded-full blur-[150px]"
          />
          <motion.div 
            animate={{ 
              backgroundColor: themeColor,
              opacity: [0.03, 0.1, 0.03],
              scale: [1.3, 1, 1.3],
              x: ['20%', '-10%', '20%'],
              y: ['10%', '-5%', '10%']
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-0 right-0 w-[70%] h-[70%] rounded-full blur-[180px]"
          />
          <motion.div 
            animate={{ 
              backgroundColor: themeColor,
              opacity: [0.02, 0.08, 0.02],
              scale: [1, 1.5, 1],
              x: ['-20%', '20%', '-20%'],
              y: ['20%', '-20%', '20%']
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full blur-[200px]"
          />
          {/* Subtle Particle Overlay */}
          <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse" />
          </div>
        </div>
      )}
      {/* EPG Timeline */}
      <AnimatePresence>
        {showEPGTimeline && (
          <EPGTimeline
            isOpen={showEPGTimeline}
            onClose={() => {
              setShowEPGTimeline(false);
              setNavContext(currentChannel ? 'player' : 'browse');
            }}
            epgData={epgData}
            channels={channels}
            now={now}
            onSelectChannel={handleChannelSelect}
            themeColor={themeColor}
          />
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className={cn(
        "fixed top-0 w-full z-50 flex items-center px-4 md:px-12 justify-end transition-all duration-500 h-20 pointer-events-none"
      )}>
        <div className="flex items-center gap-4 md:gap-6 pointer-events-auto bg-black/20 hover:bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 hover:border-white/20 shadow-2xl transition-all duration-300 group/topbar">
          <div className="flex items-center gap-3 border-r border-white/10 pr-4">
            <Logo uiMode={uiMode} logoStyle={logoStyle} />
            <div className="flex items-center gap-2">
              <WeatherWidget city={weatherCity} themeColor={themeColor} />
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
                <motion.div 
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <User className="w-4 h-4" style={{ color: themeColor }} />
                </motion.div>
                <span className="text-sm font-black italic text-white leading-none">{userCount}</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:block">
            <DigitalClock themeColor={themeColor} style={clockStyle} />
          </div>
          {isCheckingLinks && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md ml-4">
              <div className="w-3 h-3 border-2 border-white/10 border-t-white rounded-full animate-spin" style={{ borderTopColor: themeColor }} />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Kontrol: %{checkProgress}</span>
            </div>
          )}
          <div className="flex items-center gap-3 sm:gap-4 ml-4">
            <button 
              onClick={() => {
                setShowSettings(true);
                setNavContext('settings');
                setSettingsArea('content');
                setSidebarFocus(0);
                setActiveSettingsTab(0);
                setSettingsSection(0);
                setSettingsFocus(0);
              }}
              onPointerDown={() => {
                setNavContext('browse');
                setActiveRow(-4);
                setActiveCol(0);
              }}
              onMouseEnter={() => {
                setNavContext('browse');
                setActiveRow(-4);
                setActiveCol(0);
              }}
              className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-sm overflow-hidden transition-all flex items-center justify-center",
                activeRow === -4 ? "ring-4 ring-white scale-125 shadow-2xl" : "hover:ring-2 ring-white"
              )}
              style={{ backgroundColor: themeColor }}
            >
              {profilePic === 'THEME_COLOR' ? (
                <User className="w-5 h-5 text-white" />
              ) : profilePic.startsWith('LOGO:') ? (
                <div className="scale-[0.25] sm:scale-[0.3] whitespace-nowrap">
                  <Logo uiMode={uiMode} logoStyle={profilePic.split(':')[1] as LogoStyle} />
                </div>
              ) : profilePic.startsWith('COLOR:') ? (
                <div className="w-full h-full" style={{ backgroundColor: profilePic.split(':')[1] }} />
              ) : (
                <img 
                  src={profilePic} 
                  alt="Profil" 
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          </div>
        </div>
      </nav>

      <main 
        className={cn(
          "relative min-h-screen",
          layoutMode === 'fixed-focus' && "h-screen overflow-hidden flex flex-col"
        )}
      >
        <div className="animate-in fade-in duration-1000">
          {isLoading ? (
            <div className="pt-[20vh] space-y-12">
              <div className="px-4 md:px-12 space-y-4">
                <div className="h-12 w-64 bg-white/10 rounded-2xl animate-pulse" />
                <div className="h-6 w-96 bg-white/5 rounded-full animate-pulse" />
              </div>
              <RowSkeleton uiMode={uiMode} />
              <RowSkeleton uiMode={uiMode} />
              <RowSkeleton uiMode={uiMode} />
            </div>
          ) : uiMode === 'bento' && !searchQuery && channels.length > 0 ? (
            <BentoDashboard 
              recentlyWatched={recentlyWatched}
              onSelect={handleChannelSelect}
              themeColor={themeColor}
              weatherCity={weatherCity}
              now={now}
              channels={channels}
              favorites={favorites}
              liveMatches={liveMatches}
              liveNews={liveNews}
              onShowSports={() => setShowSportsDashboard(true)}
              isActive={navContext === 'browse'}
            />
          ) : channels.length === 0 ? (
            <div className="relative h-screen flex flex-col items-center justify-center space-y-4 text-center px-4 pt-20 pb-8 overflow-hidden">
              <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/60 to-[#141414]" />
              </div>
              
              <div className="relative z-10 space-y-4 max-w-2xl w-full">
                <div className="space-y-2">
                  <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
                    <Tv className="w-7 h-7 text-zinc-400" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Oynatma Listesi Yok</h2>
                    <p className="text-zinc-500 max-w-md mx-auto font-medium text-xs">
                      İzlemeye başlamak için bir M3U dosyası yükleyin veya bir URL adresi girin.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* File Upload Section */}
                  <div className={cn(
                    "bg-white/5 p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 group cursor-pointer",
                    activeRow === 0 ? "border-white bg-white/10 scale-105 shadow-2xl" : "border-white/5 hover:border-white/10"
                  )}
                  onClick={() => document.getElementById('empty-file-upload')?.click()}
                  onPointerDown={() => { setActiveRow(0); setActiveCol(0); }}
                  onMouseEnter={() => { setActiveRow(0); setActiveCol(0); }}
                  >
                    <input id="empty-file-upload" type="file" accept=".m3u,.m3u8" className="hidden" onChange={handleFileUpload} />
                    <div className="p-2.5 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">Dosya Yükle</div>
                      <div className="text-[10px] text-zinc-500">Cihazınızdan bir .m3u dosyası seçin</div>
                    </div>
                  </div>

                  {/* URL Input Section */}
                  <div className={cn(
                    "bg-white/5 p-5 rounded-3xl border-2 transition-all flex flex-col gap-2",
                    activeRow === 1 ? "border-white bg-white/10 scale-105 shadow-2xl" : "border-white/5"
                  )}
                  onPointerDown={() => { setActiveRow(1); setActiveCol(0); }}
                  onMouseEnter={() => { setActiveRow(1); setActiveCol(0); }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-white/10 rounded-2xl">
                        <LinkIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-base font-bold text-white">URL Adresi</div>
                        <div className="text-[10px] text-zinc-500">M3U linki veya Cutt.ly kodu</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="empty-url-input"
                        type="url"
                        placeholder="URL girin... (Örn: eyuptv.m3u)"
                        className={cn(
                          "flex-1 bg-black/40 border rounded-xl px-3 py-2 outline-none transition-all text-[10px] font-bold",
                          activeRow === 1 && activeCol === 0 ? "border-white ring-4 ring-white/10" : "border-white/10"
                        )}
                        value={extraUrl}
                        onChange={(e) => setExtraUrl(e.target.value)}
                        onPointerDown={() => { setActiveRow(1); setActiveCol(0); }}
                        onFocus={() => { setActiveRow(1); setActiveCol(0); }}
                      />
                      <button
                        onClick={() => {
                          if (!extraUrl) return;
                          setPlaylistUrl(extraUrl);
                          handleUrlSubmit(extraUrl);
                        }}
                        onPointerDown={() => { setActiveRow(1); setActiveCol(1); }}
                        onMouseEnter={() => { setActiveRow(1); setActiveCol(1); }}
                        style={{ backgroundColor: themeColor }}
                        className={cn(
                          "px-3 py-2 rounded-xl font-bold text-white transition-all text-[10px]",
                          activeRow === 1 && activeCol === 1 ? "scale-110 shadow-xl brightness-110" : "opacity-90"
                        )}
                      >
                        Yükle
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={() => {
                      localStorage.removeItem('m3u_url');
                      localStorage.setItem('is_remote_mode', 'true');
                      window.location.reload();
                    }}
                    onPointerDown={() => { setActiveRow(2); setActiveCol(0); }}
                    onMouseEnter={() => { setActiveRow(2); setActiveCol(0); }}
                    className={cn(
                      "px-5 py-2.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-xs",
                      activeRow === 2 ? "bg-orange-500 text-white scale-105 shadow-xl" : "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Uzaktan Kumanda
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem('m3u_deleted');
                      localStorage.setItem('m3u_url', DEFAULT_M3U_URL);
                      setSavedUrl(DEFAULT_M3U_URL);
                      setPlaylistUrl(DEFAULT_M3U_URL);
                      handleUrlSubmit(DEFAULT_M3U_URL);
                    }}
                    onPointerDown={() => { setActiveRow(3); setActiveCol(0); }}
                    onMouseEnter={() => { setActiveRow(3); setActiveCol(0); }}
                    className={cn(
                      "px-5 py-2.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-xs",
                      activeRow === 3 ? "bg-white text-black scale-105 shadow-xl" : "bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", activeRow === 3 && "animate-spin")} />
                    Varsayılan
                  </button>

                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setNavContext('settings');
                      setSettingsFocus(0);
                      setActiveSettingsTab(1);
                    }}
                    onPointerDown={() => { setActiveRow(4); setActiveCol(0); }}
                    onMouseEnter={() => { setActiveRow(4); setActiveCol(0); }}
                    className={cn(
                      "px-5 py-2.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-xs",
                      activeRow === 4 ? "bg-white text-black scale-105 shadow-xl" : "bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Ayarlar
                  </button>
                </div>

                {/* Remote Pairing Info for TV Setup */}
                <div className="pt-12 mt-12 border-t border-white/5 space-y-6">
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-8 bg-white/5 p-8 rounded-[40px] border border-white/10 backdrop-blur-xl">
                      <div className="p-4 bg-white rounded-3xl shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                        <QRCodeCanvas 
                          value={`${appUrl.replace(/\/$/, '')}/?remote=${remoteRoomId}`}
                          size={140}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                      
                      <div className="space-y-6 text-left">
                        <div className="space-y-2">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">BU KODU KUMANDAYA GİRİN</h3>
                          <p className="text-xs text-zinc-500 font-medium max-w-[240px]">Telefonunuzu kumanda olarak kullanmak için bu kodu kumanda modundaki cihazınıza girin.</p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="bg-black/40 border border-white/10 rounded-2xl px-6 py-4">
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">TV EŞLEŞME KODU</div>
                            <div className="text-3xl font-black text-white tracking-[0.2em]">{remoteRoomId}</div>
                          </div>
                          <div className={cn(
                            "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 min-w-[100px]",
                            isRemoteConnected ? "bg-green-500/20 text-green-500 border border-green-500/20" : "bg-orange-500/20 text-orange-500 border border-orange-500/20"
                          )}>
                            <div className={cn("w-2 h-2 rounded-full", isRemoteConnected ? "bg-green-500 animate-pulse" : "bg-orange-500")} />
                            {isRemoteConnected ? 'BAĞLI' : 'BEKLİYOR'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Modern Mesh Gradient Background */}
              <AnimatePresence>
                {showCommandPalette && (
                  <CommandPalette 
                    isOpen={showCommandPalette}
                    onClose={() => setShowCommandPalette(false)}
                    channels={channels}
                    categories={visibleCategories}
                    onSelectChannel={handleCommandChannelSelect}
                    onSelectCategory={handleCommandCategorySelect}
                    themeColor={themeColor}
                    keyMap={keyMap}
                  />
                )}
              </AnimatePresence>
              <AmbientBackground ambientColor={ambientColor} />
              
              {/* Dynamic Theme Overlay */}
              <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black opacity-80" />
                {uiMode === 'modern' && (
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.1, 0.15, 0.1]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px]" 
                    style={{ backgroundColor: themeColor }} 
                  />
                )}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
              </div>

              <AnimatePresence>
                {currentChannel && navContext !== 'player' && (
                  <MiniPlayer 
                    channel={currentChannel}
                    onMaximize={() => setNavContext('player')}
                    onClose={() => setCurrentChannel(null)}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(prev => !prev)}
                    themeColor={themeColor}
                  />
                )}
              </AnimatePresence>

              {/* Quick Settings Dynamic Overlay */}
              <QuickSettingsOverlay
                show={showQuickSettings}
                onClose={() => { setShowQuickSettings(false); setNavContext(currentChannel ? 'player' : 'browse'); }}
                themeColor={themeColor}
                playerEngine={playerEngine}
                setPlayerEngine={setPlayerEngine}
                ambilightMode={ambilightMode}
                setAmbilightMode={setAmbilightMode}
                sleepTimer={sleepTimer || 0}
                setSleepTimer={setSleepTimer}
                sleepTimerActive={sleepTimerActive}
                setSleepTimerActive={setSleepTimerActive}
                quickSettingsFocus={quickSettingsFocus}
                setQuickSettingsFocus={setQuickSettingsFocus}
              />

              <motion.div
                key={transitionKey}
                initial={logoStyle === 'glitch' ? { skewX: 20, opacity: 0 } : logoStyle === 'neon' ? { scale: 0.95, opacity: 0 } : { opacity: 0 }}
                animate={logoStyle === 'glitch' ? { skewX: 0, opacity: 1 } : logoStyle === 'neon' ? { scale: 1, opacity: 1 } : { opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10"
              >
              <HeroSection
                featuredChannel={featuredChannel}
                layoutMode={layoutMode}
                activeRow={activeRow}
                activeCol={activeCol}
                setActiveRow={setActiveRow}
                setActiveCol={setActiveCol}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                uiMode={uiMode}
                themeColor={themeColor}
                deviceType={deviceType}
                getCurrentProgram={getCurrentProgram}
                formatTime={formatTime}
                handlePrevFeatured={handlePrevFeatured}
                handleNextFeatured={handleNextFeatured}
                primaryHeroButtons={primaryHeroButtons}
                filterHeroButtons={filterHeroButtons}
                isListening={isListening}
                remoteControlEnabled={remoteControlEnabled}
                isRemoteConnected={isRemoteConnected}
                showDeviceInfo={showDeviceInfo}
                handleAISearch={handleAISearch}
                isAISearching={isAISearching}
                aiExplanation={aiExplanation}
                categoryScrollRef={categoryScrollRef}
              />

            {/* Rows */}
            <div className={cn(
              "relative z-20", 
              layoutMode === 'fixed-focus' ? "flex-1 overflow-hidden" : "pb-20",
              searchQuery ? "mt-8" : (layoutMode === 'fixed-focus' ? "mt-0" : "-mt-8 sm:-mt-12")
            )}>
              <VList
                ref={mainListRef}
                height={layoutMode === 'fixed-focus' ? (typeof window !== 'undefined' ? window.innerHeight - (activeRow >= 0 ? window.innerHeight * 0.5 : window.innerHeight * 0.3) : 800) : 1200}
                itemCount={groupedChannels.length}
                itemSize={rowHeightHelper}
                width="100%"
                className="no-scrollbar"
                style={{ overflowY: layoutMode === 'fixed-focus' ? 'auto' : 'visible' }}
              >
                {({ index, style }) => {
                  const [group, groupChannels] = (groupedChannels as [string, M3UChannel[]][])[index];
                  const isVisible = layoutMode !== 'fixed-focus' || (activeRow < 0 ? index === 0 : index === activeRow);
                  if (!isVisible && layoutMode === 'fixed-focus') return null;

                  return (
                    <div style={style}>
                    <motion.div
                      key={group}
                      initial={layoutMode === 'fixed-focus' ? { opacity: 0, y: 20 } : {}}
                      animate={layoutMode === 'fixed-focus' ? { opacity: 1, y: 0 } : {}}
                      exit={layoutMode === 'fixed-focus' ? { opacity: 0, y: -20 } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <ChannelRow 
                        key={group} 
                        title={group} 
                        rowIndex={index}
                        channels={groupChannels} 
                        onSelect={handleChannelSelect}
                        onDetail={(ch) => handleChannelDetail(ch, group)}
                        onFocus={(r, c) => {
                          setActiveRow(r);
                          setActiveCol(c);
                        }}
                        onToggleFavorite={toggleFavorite}
                        onDeleteChannel={handleDeleteChannel}
                        onLongPress={(id, category) => {
                          setChannelMenuId(id);
                          setChannelMenuCategory(category);
                          setNavContext('channel-menu');
                          setChannelMenuFocus(0);
                        }}
                        favorites={favorites}
                        multiSessions={multiSessions}
                        canliChannels={canliChannels}
                        filmChannels={filmChannels}
                        diziChannels={diziChannels}
                        activeRow={activeRow}
                        activeCol={activeCol}
                        orientation={posterOrientation}
                        previewChannelId={previewChannelId}
                        themeColor={themeColor}
                        deviceType={deviceType}
                        uiMode={uiMode}
                        layoutMode={layoutMode}
                        isCollapsed={collapsedRows.has(group)}
                        customProxyUrl={customProxyUrl}
                        top10Style={top10Style}
                        onToggleMini={(channel) => {
                          if (isMiniPlayer && currentChannel?.id === channel.id) {
                            setIsMiniPlayer(false);
                            setCurrentChannel(null);
                          } else {
                            setCurrentChannel(channel);
                            setIsMiniPlayer(true);
                          }
                        }}
                        onToggleCollapse={() => {
                          setCollapsedRows(prev => {
                            const next = new Set(prev);
                            if (next.has(group)) next.delete(group);
                            else next.add(group);
                            return next;
                          });
                          if (mainListRef.current) {
                            mainListRef.current.resetAfterIndex(0);
                          }
                        }}
                        playbackProgress={playbackProgress}
                        epgData={epgData}
                        now={now}
                        focusEffect={focusEffect}
                        channelNumbers={channelNumbers}
                      />
                    </motion.div>
                    </div>
                  );
                }}
              </VList>
            </div>
          </motion.div>
        </>
      )}
    </div>
  </main>

      {/* Mini Player (Floating PIP) */}
      <AnimatePresence>
        {isMiniPlayer && currentChannel && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.5, x: 100, y: 100 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed bottom-8 right-8 w-80 aspect-video z-[150] bg-black rounded-2xl shadow-2xl border-2 border-white/20 overflow-hidden cursor-move group"
          >
            <VideoPlayer
              url={currentChannel.urls?.[0]}
              channel={currentChannel}
              channels={channels}
              epgData={epgData}
              themeColor={themeColor}
              customProxyUrl={customProxyUrl}
              onClose={() => {
                setIsMiniPlayer(false);
                setCurrentChannel(null);
              }}
              isMini={true}
              channelSurfEnabled={channelSurfEnabled}
              volume={globalVolume}
              isMuted={isMuted}
              onVolumeChange={setGlobalVolume}
              onMuteToggle={setIsMuted}
              ambilightMode={ambilightMode}
              isPlaying={isGlobalPlaying}
              onPlayPauseToggle={setIsGlobalPlaying}
              loadingStyle={loadingStyle}
              geminiApiKey={geminiApiKey}
              isLiveTranslationEnabled={isLiveTranslationEnabled}
              onToggleLiveTranslation={() => setIsLiveTranslationEnabled(prev => !prev)}
              showSummary={showSummary}
              isSummaryLoading={isSummaryLoading}
              currentSummary={currentSummary}
              onToggleSummary={handleToggleSummary}
            />
            <div className="absolute top-2 right-2 opacity-100 flex gap-2 z-[200]">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMiniPlayer(false);
                  setNavContext('player');
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all border border-white/10 shadow-lg pointer-events-auto cursor-pointer"
                title="Tam Ekran"
              >
                <FastForward className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMiniPlayer(false);
                  setCurrentChannel(null);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all border border-white/10 shadow-lg pointer-events-auto cursor-pointer"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Channel Access Overlay */}
      <AnimatePresence>
        {typedNumber && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-black/80 backdrop-blur-2xl px-12 py-6 rounded-[32px] border-2 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-2"
          >
            <div 
              className="text-6xl font-black tracking-[0.2em] text-white"
              style={{ textShadow: `0 0 20px ${themeColor}` }}
            >
              {typedNumber}
            </div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Kanal Numarası
            </div>
            {channels.find(c => channelNumbers[c.id] === typedNumber) && (
              <div className="text-sm font-bold text-white mt-2 animate-pulse">
                {channels.find(c => channelNumbers[c.id] === typedNumber)?.name}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remote Pairing Modal */}
      <RemotePairingModal
        isOpen={showRemotePairingModal}
        onClose={() => { setShowRemotePairingModal(false); setNavContext('browse'); }}
        themeColor={themeColor}
        appUrl={appUrl}
        remoteRoomId={remoteRoomId}
        remoteControlEnabled={remoteControlEnabled}
        setRemoteControlEnabled={setRemoteControlEnabled}
        isRemoteConnected={isRemoteConnected}
      />

      <AnimatePresence>
        {showNumberInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[250] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 p-12 rounded-[40px] max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div 
                className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-20"
                style={{ backgroundColor: themeColor }}
              />
              
              <h3 className="text-2xl font-black text-white mb-2 text-center uppercase tracking-widest">
                Kanal Numarası Ata
              </h3>
              <p className="text-white/40 text-sm text-center mb-8">
                {channels.find(c => c.id === numberInputChannelId)?.name} için bir numara girin.
              </p>

              <div className="relative">
                <input
                  id="channel-number-input"
                  type="number"
                  autoFocus
                  placeholder="Örn: 1"
                  defaultValue={numberInputChannelId ? channelNumbers[numberInputChannelId] || '' : ''}
                  className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-4 text-3xl font-black text-white text-center focus:border-white transition-all outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (numberInputChannelId) {
                        setChannelNumbers(prev => ({ ...prev, [numberInputChannelId]: val }));
                        setShowNumberInput(false);
                        setNumberInputChannelId(null);
                        setChannelMenuId(null);
                        setNavContext('browse');
                      }
                    }
                  }}
                />
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => {
                    const input = document.getElementById('channel-number-input') as HTMLInputElement;
                    if (input && numberInputChannelId) {
                      setChannelNumbers(prev => ({ ...prev, [numberInputChannelId]: input.value }));
                      setShowNumberInput(false);
                      setNumberInputChannelId(null);
                      setChannelMenuId(null);
                      setNavContext('browse');
                    }
                  }}
                  style={{ backgroundColor: themeColor }}
                  className="flex-1 py-4 rounded-2xl font-black text-white uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                >
                  Kaydet
                </button>
                <button
                  onClick={() => {
                    setShowNumberInput(false);
                    setNumberInputChannelId(null);
                    setNavContext('channel-menu');
                  }}
                  className="flex-1 py-4 rounded-2xl font-black text-white/40 uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                >
                  İptal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channel Context Menu Overlay */}
      <AnimatePresence>
        {channelMenuId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => {
              setChannelMenuId(null);
              setNavContext('browse');
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={cn(
                "p-8 max-w-lg w-full shadow-2xl relative overflow-hidden",
                uiMode === 'modern' && "bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)]",
                uiMode === 'classic' && "bg-zinc-900 border-2 border-zinc-700 rounded-none shadow-[20px_20px_0_rgba(0,0,0,0.5)]",
                uiMode === 'minimalist' && "bg-black border border-white/20 rounded-none"
              )}
              onClick={e => e.stopPropagation()}
            >
              {uiMode === 'modern' && (
                <>
                  <div 
                    className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-20"
                    style={{ backgroundColor: themeColor }}
                  />
                  <div 
                    className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-10"
                    style={{ backgroundColor: themeColor }}
                  />
                </>
              )}
              {uiMode === 'classic' && (
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: themeColor }} />
              )}
              <h3 className={cn(
                "text-xl font-bold mb-6 text-center",
                uiMode === 'minimalist' && "uppercase tracking-[0.3em] text-sm",
                uiMode === 'classic' && "text-2xl italic tracking-tighter"
              )}>
                {multiSessionMenuOpen ? 'Kategori Seçin' : 'Seçenekler'}
              </h3>
              
              {!multiSessionMenuOpen ? (
                <>
                  <div className="flex flex-wrap justify-center gap-4">
                    {[
                      { id: 'favorite', label: favorites.includes(channelMenuId) ? 'Favorilerden Çıkar' : 'Favorilere Ekle', icon: Heart, active: favorites.includes(channelMenuId) },
                      { id: 'number', label: 'Kanal No', icon: Hash, active: !!channelNumbers[channelMenuId] },
                      { id: 'canli', label: 'Canlı', icon: Tv, active: canliChannels.includes(channelMenuId) },
                      { id: 'film', label: 'Film', icon: Play, active: filmChannels.includes(channelMenuId) },
                      { id: 'dizi', label: 'Dizi', icon: ListIcon, active: diziChannels.includes(channelMenuId) },
                      { id: 'multi', label: 'Multi Kanal', icon: Monitor, active: Object.values(multiSessions || {}).some((ids: any) => Array.isArray(ids) && ids.includes(channelMenuId)) },
                      { id: 'move-left', label: 'Sola Taşı', icon: ChevronLeft },
                      { id: 'move-right', label: 'Sağa Taşı', icon: ChevronRight }
                    ].map((opt, idx) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (opt.id === 'favorite') {
                            toggleFavorite(channelMenuId);
                          } else if (opt.id === 'move-left') {
                            moveChannel(channelMenuId, 'left', channelMenuCategory || '');
                          } else if (opt.id === 'move-right') {
                            moveChannel(channelMenuId, 'right', channelMenuCategory || '');
                          } else if (opt.id === 'multi') {
                            setMultiSessionMenuOpen(true);
                            setChannelMenuFocus(0);
                            return;
                          } else if (opt.id === 'number') {
                            setNumberInputChannelId(channelMenuId);
                            setShowNumberInput(true);
                            setNavContext('number-input');
                            return;
                          } else {
                            toggleManualCategory(channelMenuId, opt.id as any);
                          }
                          
                          if (opt.id !== 'move-left' && opt.id !== 'move-right') {
                            setChannelMenuId(null);
                            setNavContext('browse');
                          }
                        }}
                        onPointerDown={() => {
                          setNavContext('channel-menu');
                          setChannelMenuFocus(idx);
                        }}
                        onMouseEnter={() => setChannelMenuFocus(idx)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 transition-all min-w-[100px]",
                          uiMode === 'modern' && "rounded-xl",
                          uiMode === 'classic' && "rounded-none border-2 border-zinc-800 bg-zinc-950",
                          uiMode === 'minimalist' && "rounded-none border-0 bg-transparent",
                          channelMenuFocus === idx 
                            ? (uiMode === 'modern' ? "bg-white text-black scale-110 shadow-xl" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white scale-105" : "text-white scale-100 border-b-2 border-white") 
                            : "bg-white/5 text-white hover:bg-white/10"
                        )}
                      >
                        <opt.icon className={cn("w-6 h-6", 'active' in opt && opt.active && "fill-current text-red-500")} />
                        <span className="text-xs font-bold">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                    <button
                      onClick={() => {
                        setChannelMenuId(null);
                        setNavContext('browse');
                      }}
                      onPointerDown={() => {
                        setNavContext('channel-menu');
                        setChannelMenuFocus(7);
                      }}
                      onMouseEnter={() => setChannelMenuFocus(7)}
                      className={cn(
                        "w-full py-4 font-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest",
                        uiMode === 'modern' && "rounded-2xl",
                        uiMode === 'classic' && "rounded-none border-2 border-red-600/40 bg-red-600/5 hover:bg-red-600/10",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-white/5 hover:bg-white/10",
                        channelMenuFocus === 7 
                          ? (uiMode === 'modern' ? "bg-red-600 text-white scale-105 shadow-2xl ring-4 ring-red-600/20" : uiMode === 'classic' ? "bg-red-600 text-white border-white scale-105" : "text-red-500 scale-100 border-b-2 border-red-500 bg-white/10") 
                          : "text-zinc-400"
                      )}
                    >
                      <X className="w-5 h-5" />
                      Menüyü Kapat
                    </button>
                    <p className="text-zinc-500 text-[10px] opacity-50">Seçmek için Enter'a, kapatmak için Geri'ye basın</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap justify-center gap-4">
                    {MULTI_CATEGORIES.map((cat, idx) => (
                      <button
                        key={cat}
                        onClick={() => {
                          toggleManualCategory(channelMenuId, 'multi', cat);
                          setMultiSessionMenuOpen(false);
                          setChannelMenuId(null);
                          setNavContext('browse');
                        }}
                        onPointerDown={() => setChannelMenuFocus(idx)}
                        onMouseEnter={() => setChannelMenuFocus(idx)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 transition-all min-w-[100px]",
                          uiMode === 'modern' && "rounded-xl",
                          uiMode === 'classic' && "rounded-none border-2 border-zinc-800 bg-zinc-950",
                          uiMode === 'minimalist' && "rounded-none border-0 bg-transparent",
                          channelMenuFocus === idx 
                            ? (uiMode === 'modern' ? "bg-white text-black scale-110 shadow-xl" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white scale-105" : "text-white scale-100 border-b-2 border-white") 
                            : "bg-white/5 text-white hover:bg-white/10"
                        )}
                      >
                        <Monitor className="w-6 h-6" />
                        <span className="text-xs font-bold">{cat}</span>
                      </button>
                    ))}
                  </div>
                  <div className="pt-6 border-t border-white/5">
                    <button
                      onClick={() => setMultiSessionMenuOpen(false)}
                      onPointerDown={() => setChannelMenuFocus(MULTI_CATEGORIES.length)}
                      onMouseEnter={() => setChannelMenuFocus(MULTI_CATEGORIES.length)}
                      className={cn(
                        "w-full py-4 font-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest",
                        uiMode === 'modern' && "rounded-2xl",
                        uiMode === 'classic' && "rounded-none border-2 border-red-600/40 bg-red-600/5 hover:bg-red-600/10",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-white/5 hover:bg-white/10",
                        channelMenuFocus === MULTI_CATEGORIES.length 
                          ? (uiMode === 'modern' ? "bg-red-600 text-white scale-105 shadow-2xl ring-4 ring-red-600/20" : uiMode === 'classic' ? "bg-red-600 text-white border-white scale-105" : "text-red-500 scale-100 border-b-2 border-red-500 bg-white/10") 
                          : "text-zinc-400"
                      )}
                    >
                      <X className="w-5 h-5" />
                      Vazgeç / Geri
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-8 pt-6 border-t border-white/5 text-center">
                {/* Text removed as it's now part of the button container */}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => {
          setShowSettings(false);
          setNavContext('browse');
        }} 
      />

      {/* Channel Detail View */}
      <AnimatePresence>
        {navContext === 'channel-detail' && channelForDetail && (
          <ChannelDetail
            channel={channelForDetail}
            themeColor={themeColor}
            uiMode={uiMode}
            cinemaModeEnabled={cinemaModeEnabled}
            tmdbEnabled={tmdbEnabled}
            activeFocus={detailFocus}
            onFocusChange={setDetailFocus}
            onClose={() => {
              setChannelForDetail(null);
              setNavContext('browse');
            }}
            onNext={() => {
              if (!channelForDetail || allFlattenedChannels.length === 0) return;
              const currentIndex = allFlattenedChannels.findIndex(ch => ch.id === channelForDetail.id);
              if (currentIndex !== -1) {
                const nextIndex = (currentIndex + 1) % allFlattenedChannels.length;
                setChannelForDetail(allFlattenedChannels[nextIndex]);
                setDetailFocus(0);
              }
            }}
            onPrev={() => {
              if (!channelForDetail || allFlattenedChannels.length === 0) return;
              const currentIndex = allFlattenedChannels.findIndex(ch => ch.id === channelForDetail.id);
              if (currentIndex !== -1) {
                const prevIndex = (currentIndex - 1 + allFlattenedChannels.length) % allFlattenedChannels.length;
                setChannelForDetail(allFlattenedChannels[prevIndex]);
                setDetailFocus(0);
              }
            }}
            onPlay={(channel) => {
              // Force play by bypassing the VOD check in handleChannelSelect
              setRecentlyWatched(prev => {
                const filtered = prev.filter(ch => 
                  ch.id !== channel.id && 
                  !ch.urls.some(url => channel.urls.includes(url))
                );
                return [channel, ...filtered].slice(0, 20);
              });
              setCurrentChannel(channel);
              setNavContext('player');
              setChannelForDetail(null);
            }}
            multiSessions={multiSessions}
            onToggleMultiChannel={(id) => toggleManualCategory(id, 'multi')}
            playbackProgress={playbackProgress}
            epgData={epgData}
            onActorFilter={handleActorFilter}
            onNavContextChange={setNavContext}
          />
        )}
      </AnimatePresence>

      {/* Voice Feedback Overlay */}
      <AnimatePresence>
        {(isListening || isVoiceProcessing) && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-4 w-full max-w-md px-4"
          >
            <div className={cn(
              "px-8 py-4 flex items-center gap-4 shadow-2xl w-full justify-center",
              uiMode === 'modern' && "bg-black/60 backdrop-blur-2xl border border-white/20 rounded-full",
              uiMode === 'classic' && "bg-zinc-900 border-2 border-zinc-700 rounded-none",
              uiMode === 'minimalist' && "bg-black border border-white/10 rounded-none"
            )}>
              <div className="flex gap-1 items-center">
                {isVoiceProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"
                  />
                ) : (
                  [1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [10, 25, 10] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                      className="w-1 bg-red-500 rounded-full"
                    />
                  ))
                )}
              </div>
              <span className={cn(
                "text-sm font-black uppercase tracking-widest",
                isVoiceProcessing ? "text-orange-500" : "text-red-500"
              )}>
                {isVoiceProcessing ? 'Anlıyorum...' : 'Dinliyorum...'}
              </span>
            </div>
            {voiceTranscript && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-white font-bold text-lg bg-black/80 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl"
              >
                "{voiceTranscript}"
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} />
      {renderTickers()}

      {/* Exit Confirmation Dialog */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "p-8 max-w-md w-full shadow-2xl text-center space-y-8 relative overflow-hidden",
                uiMode === 'modern' && "bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)]",
                uiMode === 'classic' && "bg-zinc-900 border border-white/10 rounded-3xl",
                uiMode === 'minimalist' && "bg-black border-0 rounded-none"
              )}
            >
              {uiMode === 'modern' && (
                <div 
                  className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20"
                  style={{ backgroundColor: themeColor }}
                />
              )}
              <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mx-auto border border-red-600/20">
                <X className="w-10 h-10 text-red-600" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">Çıkış Yapılsın mı?</h2>
                <p className="text-zinc-400 font-medium">Uygulamadan çıkmak istediğinize emin misiniz?</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => window.location.reload()}
                  onPointerDown={() => setExitFocus(0)}
                  onMouseEnter={() => setExitFocus(0)}
                  style={{ 
                    backgroundColor: exitFocus === 0 ? themeColor : 'rgba(255,255,255,0.05)',
                    color: exitFocus === 0 ? 'white' : 'rgba(255,255,255,0.4)'
                  }}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all",
                    exitFocus === 0 ? "scale-105 shadow-2xl" : "hover:bg-white/10"
                  )}
                >
                  Evet
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    setNavContext('browse');
                  }}
                  onPointerDown={() => setExitFocus(1)}
                  onMouseEnter={() => setExitFocus(1)}
                  style={{ 
                    backgroundColor: exitFocus === 1 ? 'white' : 'rgba(255,255,255,0.05)',
                    color: exitFocus === 1 ? 'black' : 'rgba(255,255,255,0.4)'
                  }}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all",
                    exitFocus === 1 ? "scale-105 shadow-2xl" : "hover:bg-white/10"
                  )}
                >
                  Hayır
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi Player */}
      {isMultiPlayerOpen && (
        <MultiPlayer
          channels={multiPlayerChannels}
          themeColor={themeColor}
          customProxyUrl={customProxyUrl}
          onClose={() => {
            setIsMultiPlayerOpen(false);
            setNavContext('browse');
          }}
          onSingleView={(channel) => {
            setIsMultiPlayerOpen(false);
            setCurrentChannel(channel);
            setNavContext('player');
          }}
        />
      )}

      {/* AI Gözcü Notifications */}
      <div className="fixed top-8 right-8 z-[1000] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {watcherNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="w-80 bg-black/80 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-5 shadow-2xl pointer-events-auto cursor-pointer group"
              onClick={() => {
                const ch = channels.find(c => c.id === notif.channelId);
                if (ch) handleChannelSelect(ch);
                setWatcherNotifications(prev => prev.filter(n => n.id !== notif.id));
              }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">AI GÖZCÜ BULDİ!</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setWatcherNotifications(prev => prev.filter(n => n.id !== notif.id));
                      }}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-white font-bold text-sm truncate mb-1">{notif.programTitle}</h4>
                  <p className="text-zinc-400 text-xs font-medium truncate">{notif.channelName}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase">Şu an yayında</span>
                <div className="flex items-center gap-2 text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span className="text-[10px] font-black uppercase">İzle</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Video Player */}
      {currentChannel && !isMiniPlayer && (
        <div className="fixed inset-0 z-[150] bg-black">
          <VideoPlayer 
          url={currentChannel.urls[0]} 
          channel={currentChannel}
          channels={channels}
          epgData={epgData}
          themeColor={themeColor}
          customProxyUrl={customProxyUrl}
          startTime={playbackProgress[currentChannel.id]?.currentTime || 0}
          onProgressUpdate={(seconds, duration) => updateProgress(currentChannel.id, seconds, duration)}
          onClose={() => {
            setCurrentChannel(null);
            setNavContext('browse');
          }} 
          onChannelSelect={handleChannelSelect}
          onToggleMini={() => {
            setIsMiniPlayer(true);
            setNavContext('browse');
          }}
          channelSurfEnabled={channelSurfEnabled}
          volume={globalVolume}
          isMuted={isMuted}
          onVolumeChange={setGlobalVolume}
          onMuteToggle={setIsMuted}
          playerEngine={playerEngine}
          ambilightMode={ambilightMode}
          isPlaying={isGlobalPlaying}
          onPlayPauseToggle={setIsGlobalPlaying}
          loadingStyle={loadingStyle}
          geminiApiKey={geminiApiKey}
          isLiveTranslationEnabled={isLiveTranslationEnabled}
          onToggleLiveTranslation={() => setIsLiveTranslationEnabled(prev => !prev)}
          showSummary={showSummary}
          isSummaryLoading={isSummaryLoading}
          currentSummary={currentSummary}
          onToggleSummary={handleToggleSummary}
        />
      </div>
      )}
      {navContext === 'advanced-epg' && (
        <AdvancedEPG 
          channels={channels}
          epgData={epgData}
          themeColor={themeColor}
          keyMap={keyMap}
          onClose={() => setNavContext(currentChannel ? 'player' : 'browse')}
          onPlay={(channel) => {
            setCurrentChannel(channel);
            setNavContext('player');
          }}
        />
      )}
      {navContext === 'voice-search' && (
        <VoiceSearchOverlay 
          themeColor={themeColor}
          onClose={() => setNavContext(currentChannel ? 'player' : 'browse')}
          onResult={(text) => {
            setSearchQuery(text);
            setNavContext('browse');
            setActiveRow(0);
            setActiveCol(0);
          }}
        />
      )}

      {/* Quick Switch (Zapping) Menu */}
      <AnimatePresence>
        {showQuickSwitch && recentlyWatched.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[450]"
              onClick={() => {
                setShowQuickSwitch(false);
                setNavContext('player');
              }}
            />
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-black/80 backdrop-blur-3xl z-[500] border-r border-white/10 p-8 flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.5)]"
            >
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <RefreshCw className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tighter uppercase">Hızlı Geçiş</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Son İzlenenler</p>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              {recentlyWatched
                .filter(ch => ch.id !== currentChannel?.id)
                .slice(0, 5)
                .map((channel, i) => (
                <motion.button
                  key={`${channel.id}-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    handleChannelSelect(channel);
                    setShowQuickSwitch(false);
                    setNavContext('player');
                  }}
                  onMouseEnter={() => setQuickSwitchFocus(i)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all border group relative overflow-hidden",
                    quickSwitchFocus === i 
                      ? "bg-white text-black border-white scale-105 shadow-2xl z-10" 
                      : "bg-white/5 text-white border-white/5 hover:bg-white/10"
                  )}
                >
                  {quickSwitchFocus === i && (
                    <motion.div 
                      layoutId="quick-switch-glow"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"
                    />
                  )}
                  
                  <div className={cn(
                    "w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border transition-all",
                    quickSwitchFocus === i ? "border-black/10" : "border-white/10"
                  )}>
                    <img 
                      src={channel.logo || `https://picsum.photos/seed/${channel.name}/200/200`} 
                      className="w-full h-full object-contain p-1"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-black text-sm truncate uppercase tracking-tight">
                      {channel.name}
                    </p>
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-widest truncate",
                      quickSwitchFocus === i ? "text-black/40" : "text-white/40"
                    )}>
                      {channel.group}
                    </p>
                  </div>

                  {quickSwitchFocus === i && (
                    <ChevronRight className="w-5 h-5 animate-pulse" />
                  )}
                </motion.button>
              ))}
            </div>

            <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-white/40">
                <div className="p-2 bg-white/5 rounded-lg">
                  <Monitor className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Kapatmak için Geri</p>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edge Trigger for Quick Switch */}
      {navContext === 'player' && !showQuickSwitch && (
        <div 
          className="fixed left-0 top-0 bottom-0 w-4 z-[400] group cursor-pointer"
          onMouseEnter={() => {
            if (recentlyWatched.length > 0) {
              setShowQuickSwitch(true);
              setQuickSwitchFocus(0);
              setNavContext('quick-switch');
            }
          }}
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-white/0 group-hover:bg-white/20 transition-all" />
        </div>
      )}

      {/* Global Volume Indicator */}
      {/* Device Info Overlay */}
      <AnimatePresence>
        {showGlobalVolumeIndicator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-3xl flex items-center gap-4 shadow-2xl"
          >
            <div className="p-2 bg-white/10 rounded-full">
              {isMuted || globalVolume === 0 ? (
                <VolumeX className="w-6 h-6 text-red-500" />
              ) : (
                <Volume2 className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center w-40">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">SES SEVİYESİ</span>
                <span className="text-xs font-black text-white tabular-nums">{Math.round(globalVolume * 100)}%</span>
              </div>
              <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${globalVolume * 100}%` }}
                  className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeviceInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
            onClick={() => setShowDeviceInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-950/95 backdrop-blur-3xl border border-white/20 p-8 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-w-lg w-full relative overflow-hidden mx-auto my-auto"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDeviceInfo(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                <Monitor className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white">Sistem Detayları</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
                {[
                  { label: 'Cihaz', value: getDeviceInfo().device },
                  { label: 'Tarayıcı', value: getDeviceInfo().browser },
                  { label: 'Çözünürlük', value: getDeviceInfo().screenRes },
                  { label: 'Pencere', value: getDeviceInfo().windowSize },
                  { label: 'Bellek (RAM)', value: getDeviceInfo().memory },
                  { label: 'İşlemci', value: getDeviceInfo().cores + ' Çekirdek' },
                  { label: 'Bağlantı', value: getDeviceInfo().connection.toUpperCase() },
                  { label: 'Dil', value: getDeviceInfo().language.toUpperCase() }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-widest">{item.label}</span>
                    <span className="text-white font-black text-sm">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-6 border-t border-white/10">
                <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-widest block mb-3">User Agent String</span>
                <div className="text-[10px] text-zinc-400 break-all leading-relaxed bg-white/5 p-4 rounded-2xl font-mono border border-white/5">
                  {getDeviceInfo().raw}
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-zinc-500 text-[10px] opacity-50 uppercase tracking-widest">Kapatmak için Enter veya Geri tuşuna basın</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SportsDashboard 
        isOpen={showSportsDashboard}
        onClose={() => setShowSportsDashboard(false)}
        matches={liveMatches}
        themeColor={themeColor}
        onPlayChannel={(channelId) => {
          const channel = channels.find(c => c.id === channelId);
          if (channel) {
            handleChannelSelect(channel);
            setShowSportsDashboard(false);
            setNavContext('player');
          }
        }}
      />

      <LiveSubtitleOverlay 
        subtitle={currentSubtitle}
        isEnabled={isLiveTranslationEnabled}
        isProcessing={isTranslationProcessing}
      />

      {showSummary && (
        <ProgramSummary 
          summary={currentSummary}
          isLoading={isSummaryLoading}
          onClose={() => setShowSummary(false)}
          themeColor={themeColor}
        />
      )}
    </div>
  );
}
