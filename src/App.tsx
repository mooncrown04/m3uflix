import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { GoogleGenAI } from "@google/genai";
import { Play, Search, Upload, Link as LinkIcon, Link2, Tv, List as ListIcon, Grid, X, Info, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Plus, Check, Settings, Clock, Cloud, Sun, RefreshCw, Trash2, Heart, Monitor, Smartphone, Tablet, User, Equal, Bell, FastForward, Mic, MicOff, ArrowUpDown, Calendar, Cpu, Hash, Volume2, VolumeX, Key, Globe, Mail, ExternalLink, CircleDashed, Activity, Sparkles, Copy, Database, Pipette } from 'lucide-react';
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
import { FixedSizeList as List } from 'react-window';
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
import { Playlist, UIMode, LayoutMode, LogoStyle, Top10Style, FocusEffect, SortBy, Toast, NavContext, WatcherRule, WatcherNotification, LiveMatch, LiveSubtitle, ProgramSummary as ProgramSummaryType } from './types';
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

export default function App() {
  const { toasts, showToast } = useToasts();
  const {
    remoteRoomId,
    isRemoteConnected,
    setIsRemoteConnected,
    isTvSocketConnected,
    setIsTvSocketConnected,
    remoteControlEnabled,
    setRemoteControlEnabled,
    appUrl,
    setAppUrl,
    socketRef
  } = useRemoteControl();

  const {
    themeColor, setThemeColor,
    uiMode, setUiMode,
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
    tmdbEnabled, setTmdbEnabled,
    tmdbApiKey, setTmdbApiKey,
    geminiApiKey, setGeminiApiKey,
    customProxyUrl, setCustomProxyUrl,
    playerEngine, setPlayerEngine,
    ambilightMode, setAmbilightMode,
    mixColor1, setMixColor1,
    mixColor2, setMixColor2,
    mixedColor
  } = useSettings();

  const {
    playlists, setPlaylists,
    currentPlaylistId, setCurrentPlaylistId,
    channels, setChannels,
    epgData, setEpgData,
    isLoading, setIsLoading,
    loadPlaylist
  } = usePlaylists(customProxyUrl);

  const [isRemoteMode, setIsRemoteMode] = useState(() => localStorage.getItem('is_remote_mode') === 'true');
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, { currentTime: number; duration: number }>>(() => {
    try {
      const saved = localStorage.getItem('playbackProgress');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to parse playbackProgress:', e);
    }
    return {};
  });

  const [watcherRules, setWatcherRules] = useState<WatcherRule[]>(() => {
    const saved = localStorage.getItem('watcher_rules');
    return saved ? JSON.parse(saved) : [];
  });
  const [watcherNotifications, setWatcherNotifications] = useState<WatcherNotification[]>([]);
  const notifiedProgramsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('watcher_rules', JSON.stringify(watcherRules));
  }, [watcherRules]);

  const urlParams = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, '?'));
  const remoteRoomIdFromUrl = urlParams.get('remote')?.trim().toUpperCase() || null;
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    localStorage.setItem('playbackProgress', JSON.stringify(playbackProgress));
  }, [playbackProgress]);

  const updateProgress = (channelId: string, currentTime: number, duration: number) => {
    if (!duration || duration < 10) return; // Don't save for live streams or very short clips
    setPlaybackProgress(prev => ({
      ...prev,
      [channelId]: { currentTime, duration }
    }));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [currentChannel, setCurrentChannel] = useState<M3UChannel | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [extraUrl, setExtraUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [globalVolume, setGlobalVolume] = useState(() => {
    const saved = localStorage.getItem('global_volume');
    return saved ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('is_muted');
    return saved === 'true';
  });

  const globalVolumeRef = useRef(globalVolume);
  useEffect(() => {
    globalVolumeRef.current = globalVolume;
  }, [globalVolume]);

  const updateGlobalVolume = useCallback((newVolume: number) => {
    setGlobalVolume(newVolume);
    
    if (socketRef.current) {
      socketRef.current.emit('sync-state', { volume: newVolume, isMuted: false });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('global_volume', globalVolume.toString());
  }, [globalVolume]);

  // AI Gözcü (Watcher) Logic
  useEffect(() => {
    if (!epgData || watcherRules.length === 0) return;

    const scanInterval = setInterval(() => {
      const now = new Date();
      const newNotifications: WatcherNotification[] = [];
      const activeRules = watcherRules.filter(r => r.isActive);
      
      if (activeRules.length === 0) return;

      Object.entries(epgData.programs).forEach(([channelId, programs]) => {
        const currentProgram = programs.find(p => now >= p.start && now <= p.stop);
        if (currentProgram) {
          const titleLower = currentProgram.title.toLowerCase();
          const descLower = (currentProgram.description || '').toLowerCase();

          activeRules.forEach(rule => {
            const keywordLower = rule.keyword.toLowerCase();
            const matches = titleLower.includes(keywordLower) || descLower.includes(keywordLower);

            if (matches) {
              const notificationId = `${rule.id}-${channelId}-${currentProgram.start.getTime()}`;
              if (!notifiedProgramsRef.current.has(notificationId)) {
                notifiedProgramsRef.current.add(notificationId);
                const channelName = epgData.channels[channelId] || channelId;
                newNotifications.push({
                  id: notificationId,
                  ruleId: rule.id,
                  programTitle: currentProgram.title,
                  channelName,
                  channelId,
                  startTime: currentProgram.start,
                  timestamp: Date.now()
                });
              }
            }
          });
        }
      });

      if (newNotifications.length > 0) {
        setWatcherNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
      }
    }, 60000); // Scan every minute

    return () => clearInterval(scanInterval);
  }, [epgData, watcherRules]);

  useEffect(() => {
    localStorage.setItem('is_muted', String(isMuted));
  }, [isMuted]);

  const [userCount, setUserCount] = useState<number>(1);
  const [scrolled, setScrolled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRemotePairingModal, setShowRemotePairingModal] = useState(false);
  const [showEPGTimeline, setShowEPGTimeline] = useState(false);
  const [previewChannelId, setPreviewChannelId] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(() => {
    const saved = localStorage.getItem('m3u_url');
    const isDeleted = localStorage.getItem('m3u_deleted') === 'true';
    if (saved) return saved;
    if (isDeleted) return null;
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

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse favorites:', e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const [multiSessions, setMultiSessions] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('multi_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
      
      // Migration from old multiChannels
      const oldMulti = localStorage.getItem('multi_channels');
      if (oldMulti) {
        const parsed = JSON.parse(oldMulti);
        if (Array.isArray(parsed)) return { 'Multi Kanal': parsed };
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
      
      // Check if channel is already in ANY session of this category
      // If it is, remove it.
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
        // Find the first session of this category that has space (< 9)
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
  const [canliChannels, setCanliChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('canli_channels');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse canli_channels:', e);
    }
    return [];
  });
  const [diziChannels, setDiziChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dizi_channels');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse dizi_channels:', e);
    }
    return [];
  });
  const [filmChannels, setFilmChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('film_channels');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse film_channels:', e);
    }
    return [];
  });

  const [isMultiPlayerOpen, setIsMultiPlayerOpen] = useState(false);
  const [multiPlayerChannels, setMultiPlayerChannels] = useState<M3UChannel[]>([]);
  const [recentlyWatched, setRecentlyWatched] = useState<M3UChannel[]>(() => {
    try {
      const saved = localStorage.getItem('recently_watched');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse recently_watched:', e);
      return [];
    }
  });
  const [visibleCategories, setVisibleCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('visible_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse visible_categories:', e);
    }
    return ['Top 10'];
  });

  useEffect(() => {
    localStorage.setItem('visible_categories', JSON.stringify(visibleCategories));
  }, [visibleCategories]);

  const [weatherCity, setWeatherCity] = useState<string>(() => localStorage.getItem('weather_city') || 'İzmir');
  const [brokenChannelIds, setBrokenChannelIds] = useState<Set<string>>(new Set());
  const [hasCheckedLinks, setHasCheckedLinks] = useState(() => {
    const saved = sessionStorage.getItem('has_checked_links');
    return saved === 'true';
  });
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

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

          // If program is starting in 5 minutes (300,000 ms) and not yet started
          if (timeDiff > 0 && timeDiff <= 5 * 60 * 1000) {
            const channel = channels.find(ch => ch.id === channelId);
            const program = epgData?.programs[channelId]?.find(p => p.start.getTime() === startTime);
            
            if (channel && program) {
              showToast(`Hatırlatıcı: "${program.title}" (${channel.name}) 5 dakika içinde başlıyor!`, 'info');
              updatedReminders = updatedReminders.filter(r => r !== reminderId);
              changed = true;
            }
          } else if (timeDiff < -30 * 60 * 1000) {
            // Remove old reminders (30 mins past start)
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

  const [channelSurfEnabled, setChannelSurfEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('channel_surf_enabled');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('channel_surf_enabled', channelSurfEnabled.toString());
  }, [channelSurfEnabled]);

  const [autoPreviewEnabled, setAutoPreviewEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('auto_preview_enabled');
    return saved === null ? false : saved === 'true';
  });
  const [ambientColor, setAmbientColor] = useState<string>('rgba(0, 0, 0, 0)');
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);

  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const [showGlobalVolumeIndicator, setShowGlobalVolumeIndicator] = useState(false);
  const volumeIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstVolumeChange = useRef(true);

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let browser = "Bilinmiyor";
    let device = "Bilinmiyor";

    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";

    if (ua.includes("Windows")) device = "Windows";
    else if (ua.includes("Android")) device = "Android";
    else if (ua.includes("iPhone")) device = "iPhone";
    else if (ua.includes("iPad")) device = "iPad";
    else if (ua.includes("Macintosh")) device = "Mac";
    else if (ua.includes("Linux")) device = "Linux";

    // Technical details for debugging/optimization
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const windowSize = `${window.innerWidth}x${window.innerHeight}`;
    const pixelRatio = window.devicePixelRatio;
    const memory = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Bilinmiyor';
    const connection = (navigator as any).connection ? (navigator as any).connection.effectiveType : 'Bilinmiyor';
    const language = navigator.language;
    const cores = navigator.hardwareConcurrency || 'Bilinmiyor';

    return { 
      browser, 
      device, 
      raw: ua,
      screenRes,
      windowSize,
      pixelRatio,
      memory,
      connection,
      language,
      cores
    };
  };

  const [loadingStyle, setLoadingStyle] = useState<'classic' | 'minimal' | 'pulse' | 'bars' | 'orbit' | 'glitch'>(() => 
    (localStorage.getItem('player_loading_style') as any) || 'classic'
  );

  useEffect(() => {
    localStorage.setItem('player_loading_style', loadingStyle);
  }, [loadingStyle]);
  const [customOrders, setCustomOrders] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('custom_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to parse custom_orders:', e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('custom_orders', JSON.stringify(customOrders));
  }, [customOrders]);

  const getCurrentProgram = useCallback((channelId: string) => {
    if (!epgData || !epgData.programs[channelId]) return null;
    const now = new Date();
    return epgData.programs[channelId].find(p => p.start <= now && p.stop >= now);
  }, [epgData]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

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
  const [sleepTimer, setSleepTimer] = useState<number | null>(null); // minutes
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
            // Logic to "turn off" or stop playback
            setCurrentChannel(null);
            setIsMiniPlayer(false);
            setNavContext('browse');
            return 0;
          }
          return prev - 1;
        });
      }, 60000); // Update every minute
    }
    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimerActive, sleepTimer]);

  const [channelForDetail, setChannelForDetail] = useState<M3UChannel | null>(null);
  const [detailFocus, setDetailFocus] = useState(0); // 0: Play, 1: Multi, 2: Close

  const handleActorFilter = useCallback((actorName: string) => {
    setSearchQuery(actorName);
    setActiveTab('Tümü');
    setChannelForDetail(null);
    setNavContext('browse');
    setActiveRow(0);
    setActiveCol(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`${actorName} için sonuçlar filtrelendi`, "info");
  }, [showToast]);

  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitFocus, setExitFocus] = useState(0); // 0: Evet, 1: Hayır
  const [channelNumbers, setChannelNumbers] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('channel_numbers');
    return saved ? JSON.parse(saved) : {};
  });
  const [typedNumber, setTypedNumber] = useState<string>('');
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberInputChannelId, setNumberInputChannelId] = useState<string | null>(null);
  const typedNumberTimeout = useRef<NodeJS.Timeout | null>(null);
  const [featuredChannel, setFeaturedChannel] = useState<M3UChannel | null>(null);
  const [activeTab, setActiveTab] = useState('Tümü');
  const [sortBy, setSortBy] = useState<SortBy>('default');
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const el = categoryScrollRef.current;
    if (el) {
      // Scroll indicator logic can be added here if needed
    }
  }, []);

  const [navContext, setNavContext] = useState<NavContext>('browse');
  const [activeRow, setActiveRow] = useState(0);
  const [activeCol, setActiveCol] = useState(0);
  const [settingsArea, setSettingsArea] = useState<'tabs' | 'sections' | 'content'>('tabs');
  const [settingsSection, setSettingsSection] = useState(0);
  const [settingsFocus, setSettingsFocus] = useState(0);
  const [sidebarFocus, setSidebarFocus] = useState(0);
  const [channelMenuFocus, setChannelMenuFocus] = useState(0);
  const [quickSettingsFocus, setQuickSettingsFocus] = useState(0);
  const [quickSwitchFocus, setQuickSwitchFocus] = useState(0);
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [showSportsDashboard, setShowSportsDashboard] = useState(false);

  useEffect(() => {
    if (showSportsDashboard) {
      setNavContext('sports-dashboard');
    } else if (navContext === 'sports-dashboard') {
      setNavContext('browse');
    }
  }, [showSportsDashboard]);

  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [isLiveTranslationEnabled, setIsLiveTranslationEnabled] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<LiveSubtitle | null>(null);
  const [isTranslationProcessing, setIsTranslationProcessing] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<ProgramSummaryType | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [multiSessionMenuOpen, setMultiSessionMenuOpen] = useState(false);
  const [channelMenuId, setChannelMenuId] = useState<string | null>(null);
  const [channelMenuCategory, setChannelMenuCategory] = useState<string | null>(null);

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
        prev.includes(targetTab) 
          ? prev.filter(c => c !== targetTab) 
          : [...prev, targetTab]
      );
    }
  }, [visibleCategories, setActiveRow, setActiveCol]);

  const settingsContentRef = useRef<HTMLDivElement>(null);
  const settingsSidebarRef = useRef<HTMLDivElement>(null);

  // Auto-scroll settings content
  useEffect(() => {
    if (showSettings && settingsArea === 'content') {
      const focused = document.querySelector('.settings-focused');
      if (focused && settingsContentRef.current) {
        focused.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (showSettings && settingsArea === 'sections') {
      const activeSection = document.querySelector('[data-section-active="true"]');
      if (activeSection && settingsContentRef.current) {
        activeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [settingsFocus, settingsSection, settingsArea, showSettings, activeSettingsTab]);

  // Screen size detection for responsive focus and layout
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Only auto-update if not manually set in localStorage
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
  }, []);

  // Scroll settings content to top when tab changes
  useEffect(() => {
    if (settingsContentRef.current) {
      settingsContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeSettingsTab]);

  useEffect(() => {
    if (showSettings) {
      setExpandedSections({});
    }
  }, [showSettings]);

  useEffect(() => {
    if (showSettings && settingsSidebarRef.current) {
      const focusedElement = settingsSidebarRef.current.querySelector(`[data-sidebar-focus="${sidebarFocus}"]`);
      if (focusedElement) {
        focusedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [sidebarFocus, showSettings]);

  const scrollSidebar = (direction: 'left' | 'right') => {
    if (settingsSidebarRef.current) {
      const scrollAmount = 200;
      settingsSidebarRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollSettingsContent = (direction: 'up' | 'down') => {
    if (settingsContentRef.current) {
      const scrollAmount = 300;
      settingsContentRef.current.scrollBy({
        top: direction === 'up' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

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
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('canli_channels', JSON.stringify(canliChannels));
  }, [canliChannels]);

  useEffect(() => {
    localStorage.setItem('dizi_channels', JSON.stringify(diziChannels));
  }, [diziChannels]);

  useEffect(() => {
    localStorage.setItem('film_channels', JSON.stringify(filmChannels));
  }, [filmChannels]);

  useEffect(() => {
    localStorage.setItem('auto_preview_enabled', String(autoPreviewEnabled));
  }, [autoPreviewEnabled]);

  useEffect(() => {
    localStorage.setItem('poster_orientation', posterOrientation);
  }, [posterOrientation]);

  const toggleFavorite = useCallback((channelId: string) => {
    const channel = channels.find(ch => ch.id === channelId);
    if (!channel) return;

    setFavorites(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const isAlreadyFavorite = current.includes(channelId);
      
      if (isAlreadyFavorite) {
        showToast(`${channel.name} favorilerden çıkarıldı`, "info");
        return current.filter(id => id !== channelId);
      } else {
        const hasSameUrl = current.some(favId => {
          const favChannel = channels.find(ch => ch.id === favId);
          return favChannel && favChannel.urls.some(url => channel.urls.includes(url));
        });
        
        if (hasSameUrl) {
          showToast("Bu kanal zaten favorilerinizde", "info");
          return current;
        }
        showToast(`${channel.name} favorilere eklendi`, "success");
        return [...current, channelId];
      }
    });
  }, [channels, showToast]);

  useEffect(() => {
    if (channels.length === 0) {
      setActiveRow(0);
      setActiveCol(0);
    }
  }, [channels.length]);

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
      if (ch.group) {
        cats.add(ch.group);
      }
    }

    if (brokenChannelIds.size > 0) cats.add('Çalışmayanlar');

    return Array.from(cats);
  }, [channels, multiSessions, favorites.length, canliChannels.length, diziChannels.length, filmChannels.length, recentlyWatched.length, brokenChannelIds]);

  useEffect(() => {
    const el = categoryScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [availableCategories]);

  const deferredSearchQuery = React.useDeferredValue(searchQuery);

  // Group channels by category
  const groupedChannels = useMemo<[string, M3UChannel[]][]>(() => {
    const query = deferredSearchQuery.toLowerCase();
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
    const broken: M3UChannel[] = [];
    
    // Pre-calculate sets for faster lookups
    const favoriteSet = new Set(favorites);
    const canliSet = new Set(canliChannels);
    const diziSet = new Set(diziChannels);
    const filmSet = new Set(filmChannels);
    const recentlyWatchedIds = new Set(recentlyWatched.map(ch => ch.id));

    // Helper to add a group if it matches activeTab
    const addGroup = (title: string, matched: M3UChannel[]) => {
      if (matched.length === 0) return;
      if (activeTab === 'Tümü' || activeTab === title) {
        groups[title] = matched;
      }
    };
    
    // Add Multi Kanal sessions by category
    Object.entries(multiSessions).forEach(([sessionName, sessionChannelIds]) => {
      const ids = sessionChannelIds as string[];
      if (ids.length > 0) {
        const matched = channels
          .filter(ch => ids.includes(ch.id) && !brokenChannelIds.has(ch.id))
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

    // Add Trending (Popüler)
    const trendingChannels = channels
      .filter(ch => !brokenChannelIds.has(ch.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 15);
    addGroup('Popüler', trendingChannels);

    // Add Favorites
    if (favoriteSet.size > 0) {
      const favoriteChannels = channels
        .filter(ch => favoriteSet.has(ch.id) && !brokenChannelIds.has(ch.id))
        .sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id));
      addGroup('Favorilerim', favoriteChannels);
    }

    // Add Top 10
    const top10Channels = channels
      .filter(ch => ch.tvgNumber !== undefined && ch.tvgNumber >= 1 && ch.tvgNumber <= 10 && !brokenChannelIds.has(ch.id))
      .sort((a, b) => (a.tvgNumber || 0) - (b.tvgNumber || 0));
    addGroup('Top 10', top10Channels);

    // Add Canlı
    if (canliSet.size > 0) {
      const matched = channels
        .filter(ch => canliSet.has(ch.id) && !brokenChannelIds.has(ch.id))
        .sort((a, b) => canliChannels.indexOf(a.id) - canliChannels.indexOf(b.id));
      addGroup('Canlı', matched);
    }

    // Add Dizi
    if (diziSet.size > 0) {
      const matched = channels
        .filter(ch => diziSet.has(ch.id) && !brokenChannelIds.has(ch.id))
        .sort((a, b) => diziChannels.indexOf(a.id) - diziChannels.indexOf(b.id));
      addGroup('Dizi', matched);
    }

    // Add Film
    if (filmSet.size > 0) {
      const matched = channels
        .filter(ch => filmSet.has(ch.id) && !brokenChannelIds.has(ch.id))
        .sort((a, b) => filmChannels.indexOf(a.id) - filmChannels.indexOf(b.id));
      addGroup('Film', matched);
    }

    // Add Recently Watched
    if (recentlyWatched.length > 0) {
      addGroup('İzlemeye Devam Et', recentlyWatched.filter(ch => !brokenChannelIds.has(ch.id)));
    }

    // Add Yayın Akışı
    const epgChannels = epgData ? channels.filter(ch => epgData.programs[ch.tvgId || ch.name] && epgData.programs[ch.tvgId || ch.name].length > 0 && !brokenChannelIds.has(ch.id)) : [];
    if (epgChannels.length > 0) {
      addGroup('Yayın Akışı', epgChannels.slice(0, 50));
    }

    // Main grouping loop - single pass
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      if (brokenChannelIds.has(channel.id)) {
        broken.push(channel);
        continue;
      }
      const groupName = channel.group || 'General';
      if (activeTab === 'Tümü' || activeTab === groupName) {
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(channel);
      }
    }

    // Apply custom order and deduplicate
    Object.keys(groups).forEach(groupName => {
      // Apply Smart Sorting
      if (sortBy === 'name') {
        groups[groupName].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      } else if (sortBy === 'number') {
        groups[groupName].sort((a, b) => (a.tvgNumber || 999999) - (b.tvgNumber || 999999));
      }

      const order = customOrders[groupName];
      if (order && order.length > 0) {
        groups[groupName].sort((a, b) => {
          const aIdx = order.indexOf(a.id);
          const bIdx = order.indexOf(b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return 0;
        });
      }

      // Deduplicate URLs
      if (!groupName.endsWith(' (Multi)')) {
        const seenUrls = new Set<string>();
        groups[groupName] = groups[groupName].filter(channel => {
          const hasSeen = channel.urls.some(url => seenUrls.has(url));
          if (hasSeen) return false;
          channel.urls.forEach(url => seenUrls.add(url));
          return true;
        });
      }
    });

    if (broken.length > 0) {
      addGroup('Çalışmayanlar', broken);
    }

    return Object.entries(groups)
      .filter(([group]) => {
        if (visibleCategories.length > 0) {
          return visibleCategories.includes(group) || group === 'Çalışmayanlar' || (visibleCategories.includes('Multi Kanal') && group.endsWith(' (Multi)'));
        }
        const specialGroups = ['Multi Kanal', 'Favorilerim', 'Canlı', 'Dizi', 'Film', 'İzlemeye Devam Et', 'Çalışmayanlar', 'Yayın Akışı'];
        return !specialGroups.includes(group) && !group.endsWith(' (Multi)');
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
        if (a[0] === 'Çalışmayanlar') return 1;
        if (b[0] === 'Çalışmayanlar') return -1;
        return b[1].length - a[1].length;
      });
  }, [channels, deferredSearchQuery, recentlyWatched, visibleCategories, favorites, canliChannels, diziChannels, filmChannels, brokenChannelIds, multiSessions, activeTab, epgData, customOrders]);
  
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
        const hasSameUrl = current.some(existingId => {
          const existingChannel = channels.find(ch => ch.id === existingId);
          return existingChannel && existingChannel.urls.some(url => channel.urls.includes(url));
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
    setVisibleCategories(prev => 
      prev.includes(target) 
        ? prev.filter(c => c !== target) 
        : [...prev, target]
    );
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
    return visibleCategories.includes(target);
  }, [visibleCategories]);

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
      const filtered = prev.filter(ch => 
        ch.id !== channel.id && 
        !ch.urls.some(url => channel.urls.includes(url))
      );
      return [channel, ...filtered].slice(0, 20);
    });

    setCurrentChannel(channel);
    setNavContext('player');
  }, [isMiniPlayer, channels, setRecentlyWatched, setCurrentChannel, setNavContext, setIsMiniPlayer]);

  useEffect(() => {
    if (!showSportsDashboard) return;

    const fetchScores = () => {
      // Mock data for live matches
      // In a real app, you would fetch this from an API
      const mockMatches: LiveMatch[] = [
        {
          id: '1',
          homeTeam: 'Galatasaray',
          awayTeam: 'Fenerbahçe',
          homeScore: 2,
          awayScore: 1,
          status: '2. Yarı',
          minute: 78,
          league: 'Trendyol Süper Lig',
          channelId: channels.find(c => c.name.toLowerCase().includes('bein sports 1'))?.id
        },
        {
          id: '2',
          homeTeam: 'Real Madrid',
          awayTeam: 'Barcelona',
          homeScore: 0,
          awayScore: 0,
          status: '1. Yarı',
          minute: 24,
          league: 'La Liga',
          channelId: channels.find(c => c.name.toLowerCase().includes('s sport'))?.id
        },
        {
          id: '3',
          homeTeam: 'Manchester City',
          awayTeam: 'Liverpool',
          homeScore: 1,
          awayScore: 1,
          status: 'İY',
          minute: 45,
          league: 'Premier League',
          channelId: channels.find(c => c.name.toLowerCase().includes('beIN Sports 3'))?.id
        },
        {
          id: '4',
          homeTeam: 'Anadolu Efes',
          awayTeam: 'Real Madrid',
          homeScore: 84,
          awayScore: 82,
          status: '4. Çeyrek',
          minute: 38,
          league: 'EuroLeague',
          channelId: channels.find(c => c.name.toLowerCase().includes('s sport 2'))?.id
        }
      ];
      setLiveMatches(mockMatches);
    };

    fetchScores();
    const interval = setInterval(fetchScores, 30000);
    return () => clearInterval(interval);
  }, [showSportsDashboard, channels]);

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
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('http')) return [trimmed];
    // If it's a code, try cutt.ly first, then the raw string
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

  const addPlaylist = (name: string, url: string) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      url
    };
    const updatedPlaylists = [...playlists, newPlaylist];
    setPlaylists(updatedPlaylists);
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
    return newPlaylist;
  };

  const removePlaylist = (id: string) => {
    const updatedPlaylists = playlists.filter(p => p.id !== id);
    setPlaylists(updatedPlaylists);
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
    if (currentPlaylistId === id) {
      setCurrentPlaylistId(null);
      localStorage.removeItem('current_playlist_id');
    }
  };

  const switchPlaylist = async (playlist: Playlist) => {
    setCurrentPlaylistId(playlist.id);
    localStorage.setItem('current_playlist_id', playlist.id);
    setPlaylistUrl(playlist.url);
    if (playlist.epgUrl) setEpgUrl(playlist.epgUrl);
    await handleUrlSubmit(playlist.url);
  };

  const primaryHeroButtons = useMemo(() => {
    if (!featuredChannel) return [];
    return [
      { id: 'play', label: 'Oynat', icon: Play, action: () => handleChannelSelect(featuredChannel) },
      { id: 'guide', label: 'Rehber', icon: Calendar, action: () => setShowEPGTimeline(true) },
      { id: 'details', label: 'Detaylar', icon: Info, action: () => {
        setChannelForDetail(featuredChannel);
        setNavContext('channel-detail');
      } }
    ];
  }, [featuredChannel]);

  const filterHeroButtons = useMemo(() => {
    if (!featuredChannel) return [];
    
    const isVisible = (name: string) => visibleCategories.includes(name);
    
    const isCategoryActive = (type: string) => {
      const groups = getCategoryGroups(type);
      if (groups.length === 0) return false;
      return groups.some(g => visibleCategories.includes(g));
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
    const hasTop10 = channels.some(ch => ch.tvgNumber !== undefined && ch.tvgNumber >= 1 && ch.tvgNumber <= 10);
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
        isActive: visibleCategories.includes('İzlemeye Devam Et')
      },
      hasTop10 && {
        id: 'top10',
        label: 'Top 10',
        icon: Tv,
        action: () => toggleCategory('top10'),
        isActive: visibleCategories.includes('Top 10')
      },
      Object.keys(multiSessions).length > 0 && {
        id: 'multi',
        label: 'Multi Kanal',
        icon: Grid,
        action: () => toggleCategory('multi'),
        isActive: visibleCategories.includes('Multi Kanal')
      },
      favorites.length > 0 && { 
        id: 'favorites', 
        label: 'Favorilerim', 
        icon: Heart, 
        action: () => toggleCategory('favorites'),
        isActive: visibleCategories.includes('Favorilerim')
      },
      hasLive && {
        id: 'live',
        label: 'Canlı',
        icon: Tv,
        action: () => toggleCategory('live'),
        isActive: visibleCategories.includes('Canlı')
      },
      hasMovies && {
        id: 'movies',
        label: 'Film',
        icon: Play,
        action: () => toggleCategory('movies'),
        isActive: visibleCategories.includes('Film')
      },
      hasSeries && {
        id: 'series',
        label: 'Dizi',
        icon: ListIcon,
        action: () => toggleCategory('series'),
        isActive: visibleCategories.includes('Dizi')
      }
    ].filter((b): b is { id: string, label: string, icon: any, action: () => void, isActive: boolean } => !!b);
  }, [featuredChannel, recentlyWatched.length, favorites.length, Object.keys(multiSessions).length, themeColor, visibleCategories, channels, canliChannels.length, filmChannels.length, diziChannels.length, activeTab, epgData, sortBy, remoteControlEnabled, isRemoteConnected, isListening, voiceControlEnabled]);

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
    setShowSportsDashboard
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
          toggleFavorite(channelToFav.id);
          const catName = category === 'live' ? 'Canlı TV' : category === 'movie' ? 'Film' : category === 'series' ? 'Dizi' : 'Multimedya';
          showToast(`${channelToFav.name} ${catName} favorilerine eklendi`, "success");
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

  // If mobile and no remote ID, or explicitly in remote mode
  // If we have a remote ID in URL, we are an ACTIVE remote
  if (remoteRoomIdFromUrl) {
    console.log('Mobile remote mode detected, roomId:', remoteRoomIdFromUrl);
    return <MobileRemote roomId={remoteRoomIdFromUrl} appUrl={appUrl} />;
  }

  // If mobile user lands without a code, show a pairing screen instead of the full TV app
  if ((isMobileDevice || isRemoteMode) && !localStorage.getItem('m3u_url')) {
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
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
              <div className="w-3 h-3 border-2 border-white/10 border-t-white rounded-full animate-spin" style={{ borderTopColor: themeColor }} />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Kontrol: %{checkProgress}</span>
            </div>
          )}
          {channels.length > 0 && (
            <div className="flex items-center gap-3 sm:gap-4">
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
                }}
                onMouseEnter={() => {
                  setNavContext('browse');
                  setActiveRow(-4);
                }}
                className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-sm overflow-hidden transition-all flex items-center justify-center",
                  activeRow === -4 ? "ring-4 ring-white scale-125 shadow-2xl" : "hover:ring-2 ring-white"
                )}
                style={{ backgroundColor: themeColor }}
              >
                {profilePic === 'THEME_COLOR' ? (
                  <User className="w-5 h-5 text-white" />
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
          )}
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
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" style={{ borderTopColor: themeColor }} />
              <p className="text-zinc-500 font-medium animate-pulse">Kanallar Yükleniyor...</p>
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
                        placeholder="URL girin..."
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
              {/* Dynamic Ambient Background */}
              <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div 
                  animate={{ backgroundColor: ambientColor }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 opacity-30 blur-[150px]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />
              </div>

              {/* Quick Settings Overlay */}
              <AnimatePresence>
                {showQuickSettings && (
                  <motion.div
                    initial={{ opacity: 0, x: 100, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 100, scale: 0.9 }}
                    className="fixed right-8 top-1/2 -translate-y-1/2 w-80 z-[200] bg-black/80 backdrop-blur-3xl rounded-[40px] border border-white/10 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                        <h3 className="text-xl font-black uppercase tracking-tighter italic">Hızlı Ayarlar</h3>
                      </div>
                      <button onClick={() => { setShowQuickSettings(false); setNavContext(currentChannel ? 'player' : 'browse'); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Play className="w-3 h-3" /> Oynatıcı Motoru
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {['hls', 'shaka'].map((engine, idx) => (
                            <button
                              key={engine}
                              onClick={() => {
                                setPlayerEngine(engine as any);
                                setQuickSettingsFocus(idx);
                              }}
                              onPointerDown={() => setQuickSettingsFocus(idx)}
                              onMouseEnter={() => setQuickSettingsFocus(idx)}
                              className={cn(
                                "py-3 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest relative overflow-hidden",
                                playerEngine === engine ? "border-white bg-white/10 text-white" : "border-white/5 bg-white/5 text-zinc-500",
                                quickSettingsFocus === idx && "ring-4 ring-white ring-offset-4 ring-offset-black scale-105 z-10"
                              )}
                            >
                              {playerEngine === engine && (
                                <motion.div 
                                  layoutId="qs-engine-active"
                                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                                  style={{ backgroundColor: themeColor }}
                                />
                              )}
                              {engine}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Sun className="w-3 h-3" /> Ambilight Modu
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {['none', 'soft', 'vibrant', 'cinema'].map((mode, idx) => (
                            <button
                              key={mode}
                              onClick={() => {
                                setAmbilightMode(mode as any);
                                setQuickSettingsFocus(idx + 2);
                              }}
                              onPointerDown={() => setQuickSettingsFocus(idx + 2)}
                              onMouseEnter={() => setQuickSettingsFocus(idx + 2)}
                              className={cn(
                                "py-3 rounded-2xl border-2 transition-all text-[10px] font-black uppercase tracking-widest relative overflow-hidden",
                                ambilightMode === mode ? "border-white bg-white/10 text-white" : "border-white/5 bg-white/5 text-zinc-500",
                                quickSettingsFocus === (idx + 2) && "ring-4 ring-white ring-offset-4 ring-offset-black scale-105 z-10"
                              )}
                            >
                              {ambilightMode === mode && (
                                <motion.div 
                                  layoutId="qs-ambi-active"
                                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                                  style={{ backgroundColor: themeColor }}
                                />
                              )}
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Uyku Zamanlayıcısı
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[15, 30, 60].map((mins, idx) => (
                            <button
                              key={mins}
                              onClick={() => {
                                setSleepTimer(mins);
                                setSleepTimerActive(true);
                                setQuickSettingsFocus(idx + 6);
                              }}
                              onPointerDown={() => setQuickSettingsFocus(idx + 6)}
                              onMouseEnter={() => setQuickSettingsFocus(idx + 6)}
                              className={cn(
                                "py-3 rounded-2xl border-2 transition-all text-[10px] font-black uppercase tracking-widest relative overflow-hidden",
                                sleepTimer === mins && sleepTimerActive ? "border-white bg-white/10 text-white" : "border-white/5 bg-white/5 text-zinc-500",
                                quickSettingsFocus === (idx + 6) && "ring-4 ring-white ring-offset-4 ring-offset-black scale-105 z-10"
                              )}
                            >
                              {sleepTimer === mins && sleepTimerActive && (
                                <motion.div 
                                  layoutId="qs-sleep-active"
                                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                                  style={{ backgroundColor: themeColor }}
                                />
                              )}
                              {mins} DK
                            </button>
                          ))}
                        </div>
                        {sleepTimerActive && sleepTimer !== null && (
                          <div className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-xl">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kalan Süre</span>
                            <span className="text-xs font-black text-white">{sleepTimer} Dakika</span>
                            <button 
                              onClick={() => setSleepTimerActive(false)}
                              className="p-1 hover:bg-white/10 rounded-lg text-red-500 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-3 text-[10px] font-bold text-zinc-500">
                      <div className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white">S</div>
                      <span>Kapatmak için tekrar bas</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                key={transitionKey}
                initial={logoStyle === 'glitch' ? { skewX: 20, opacity: 0 } : logoStyle === 'neon' ? { scale: 0.95, opacity: 0 } : { opacity: 0 }}
                animate={logoStyle === 'glitch' ? { skewX: 0, opacity: 1 } : logoStyle === 'neon' ? { scale: 1, opacity: 1 } : { opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10"
              >
                {featuredChannel && (
                <div 
                  className="relative w-full overflow-hidden transition-all duration-700"
                  style={{ 
                    height: layoutMode === 'fixed-focus'
                      ? (activeRow >= 0 ? '60vh' : '80vh')
                      : (searchQuery ? '40vh' : '80vh') 
                  }}
                >
                <div className="absolute inset-0">
                  <motion.img 
                    key={featuredChannel.id}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 0.4, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    src={featuredChannel.logo || "https://picsum.photos/seed/cinema/1920/1080?blur=10"} 
                    alt="Hero" 
                    className="w-full h-full object-cover blur-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                  {uiMode === 'modern' && (
                    <div 
                      className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[120px] opacity-20 animate-pulse"
                      style={{ backgroundColor: themeColor }}
                    />
                  )}
                </div>

                <div className={cn(
                  "absolute left-0 right-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-0"
                )} />

                <div className={cn(
                  "absolute left-4 md:left-12 max-w-4xl space-y-2 sm:space-y-3 transition-all duration-500 z-10", 
                  searchQuery ? "bottom-8" : (layoutMode === 'fixed-focus' ? "bottom-[4%] sm:bottom-[6%]" : "bottom-[8%] sm:bottom-[12%]"),
                  "max-h-[95%] flex flex-col justify-end pt-20"
                )}>
                  {!searchQuery && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={`info-${featuredChannel.id}`}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2 text-red-600 font-bold tracking-widest text-xs sm:text-sm">
                        <Tv className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                        <span>{featuredChannel.group?.toUpperCase() || 'CANLI TV'}</span>
                      </div>
                      
                      <h1 className={cn(
                        "font-black tracking-tighter uppercase italic line-clamp-2 leading-tight py-0.5",
                        deviceType === 'tv' ? "text-6xl sm:text-8xl md:text-9xl" : "text-3xl sm:text-5xl md:text-7xl"
                      )}
                      style={{ 
                        textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        WebkitTextStroke: uiMode === 'minimalist' ? `1px ${themeColor}` : 'none'
                      }}
                      >{featuredChannel.name}</h1>

                      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-white/80">
                        {featuredChannel.year && (
                          <span className="px-2 py-0.5 bg-white/10 rounded backdrop-blur-sm border border-white/10">
                            {featuredChannel.year}
                          </span>
                        )}
                        {featuredChannel.genre && (
                          <span className="px-2 py-0.5 bg-white/10 rounded backdrop-blur-sm border border-white/10">
                            {featuredChannel.genre}
                          </span>
                        )}
                        {featuredChannel.language && (
                          <span className="px-2 py-0.5 bg-white/10 rounded backdrop-blur-sm border border-white/10">
                            {featuredChannel.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-green-500">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          HD Kalite
                        </span>
                      </div>

                      {featuredChannel.actor && (
                        <p className="text-sm sm:text-base text-white/60 line-clamp-1 italic max-w-xl">
                          <span className="text-white/80 font-semibold not-italic mr-1">Oyuncular:</span>
                          {featuredChannel.actor}
                        </p>
                      )}

                      {featuredChannel.description ? (
                        <p className="text-sm sm:text-lg text-white/70 line-clamp-2 sm:line-clamp-3 max-w-2xl leading-relaxed">
                          {featuredChannel.description}
                        </p>
                      ) : (
                        <p className="text-sm sm:text-lg text-zinc-300 line-clamp-2 sm:line-clamp-3 font-medium">
                          {featuredChannel.group || 'Genel'} kategorisinden canlı yayın. M3UFLIX'te yüksek kaliteli yayın şu an yayında.
                        </p>
                      )}

                      {/* EPG Info */}
                      {getCurrentProgram(featuredChannel.tvgId || featuredChannel.name) && (
                        <div className="mt-1 p-2.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md max-w-md group hover:bg-white/10 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              Şu An Yayında
                            </span>
                            <span className="text-xs text-white/40 font-mono">
                              {formatTime(getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.start)} - {formatTime(getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.stop)}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-1">
                            {getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.title}
                          </h3>
                          {getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.description && (
                            <p className="text-xs sm:text-sm text-white/60 line-clamp-2">
                              {getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.description}
                            </p>
                          )}
                          <div className="mt-3 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-600 transition-all duration-1000"
                              style={{ 
                                width: `${Math.max(0, Math.min(100, 
                                  ((new Date().getTime() - getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.start.getTime()) / 
                                  (getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.stop.getTime() - getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.start.getTime())) * 100
                                ))}%` 
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                  <div className="flex flex-col gap-2 pt-1">
                    {/* Primary Buttons Row */}
                    {!searchQuery && (
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-2 mr-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrevFeatured(); }}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 backdrop-blur-md"
                            title="Önceki Kanal"
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleNextFeatured(); }}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 backdrop-blur-md"
                            title="Sonraki Kanal"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                        </div>
                        {primaryHeroButtons.map((btn, idx) => {
                          const isFocused = activeRow === -3 && activeCol === idx;
                          const isPlay = btn.id === 'play';
                          
                          return (
                            <button 
                              key={btn.id}
                              onClick={btn.action}
                              onPointerDown={() => {
                                setActiveRow(-3);
                                setActiveCol(idx);
                              }}
                              onMouseEnter={() => {
                                setActiveRow(-3);
                                setActiveCol(idx);
                              }}
                              style={{ 
                                backgroundColor: isFocused ? 'white' : (isPlay ? themeColor : 'rgba(255,255,255,0.1)'),
                                color: isFocused ? 'black' : 'white'
                              }}
                              className={cn(
                                "font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg",
                                isPlay ? "px-6 sm:px-8 py-2 sm:py-3 rounded-md text-base sm:text-lg" : "px-6 py-2 rounded-md text-base bg-zinc-500/50 backdrop-blur-md",
                                isFocused && "scale-110 shadow-2xl ring-4 ring-white/20"
                              )}
                            >
                              <btn.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", isPlay && "fill-current")} />
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Search Row */}
                    <div className="flex items-center gap-2">
                      {filterHeroButtons.filter(b => b.id === 'search' || b.id === 'voice' || b.id === 'remote-toggle' || b.id === 'device-info').map((btn, idx) => {
                        const isFocused = activeRow === -2 && activeCol === idx;
                        
                        return (
                          <div key={btn.id} className="relative">
                            <div className={cn(
                              "flex items-center transition-all",
                              isFocused ? "scale-110" : ""
                            )}>
                              <button 
                                onClick={btn.action}
                                onPointerDown={() => {
                                  setActiveRow(-2);
                                  setActiveCol(idx);
                                }}
                                onMouseEnter={() => {
                                  setActiveRow(-2);
                                  setActiveCol(idx);
                                }}
                                style={{ 
                                  backgroundColor: isFocused ? 'white' : 'rgba(255,255,255,0.05)',
                                  color: isFocused ? 'black' : 'white',
                                  borderColor: isFocused ? 'transparent' : 'rgba(255,255,255,0.1)'
                                }}
                                className={cn(
                                  "font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg border px-4 py-2 rounded-full text-xs",
                                  isFocused && "shadow-2xl ring-4 ring-white/20",
                                  btn.id === 'voice' && isListening && "animate-pulse",
                                  btn.id === 'remote-toggle' && remoteControlEnabled && "border-green-500/50",
                                  btn.id === 'device-info' && showDeviceInfo && "border-blue-500/50"
                                )}
                              >
                                <div className="relative">
                                  <btn.icon className={cn("w-3 h-3", btn.id === 'voice' && isListening && "text-red-500")} />
                                  {btn.id === 'remote-toggle' && isRemoteConnected && (
                                    <motion.div 
                                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                      className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: themeColor }}
                                    />
                                  )}
                                </div>
                                {btn.label}
                              </button>
                              {btn.id === 'search' && (
                                <div className="relative flex items-center ml-2">
                                  <input
                                    id="hero-search-input"
                                    type="text"
                                    placeholder="Ara..."
                                    className={cn(
                                      "bg-black/80 border rounded-full py-1.5 pl-4 pr-10 transition-all outline-none text-xs",
                                      isFocused || searchQuery 
                                        ? "w-48 opacity-100 border-white/40 ring-2 ring-white/10" 
                                        : "w-0 opacity-0 border-transparent"
                                    )}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => {
                                      setActiveRow(-2);
                                      setActiveCol(idx);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && searchQuery.length > 10) {
                                        handleAISearch(searchQuery);
                                      }
                                    }}
                                  />
                                  <div className="absolute right-3 flex items-center gap-2">
                                    {isAISearching ? (
                                      <CircleDashed className="w-3 h-3 animate-spin text-blue-400" />
                                    ) : searchQuery.length > 10 ? (
                                      <button
                                        onClick={() => handleAISearch(searchQuery)}
                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                        title="AI ile Ara"
                                      >
                                        <Sparkles className="w-3 h-3" />
                                      </button>
                                    ) : null}
                                    {searchQuery && (isFocused || searchQuery) && (
                                      <button
                                        onClick={() => setSearchQuery('')}
                                        className="text-zinc-400 hover:text-white transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  
                                  <AnimatePresence>
                                    {aiExplanation && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 mt-2 bg-blue-600 text-white px-4 py-2 rounded-2xl text-[10px] font-bold shadow-xl z-50 whitespace-nowrap flex items-center gap-2"
                                      >
                                        <Sparkles className="w-3 h-3" />
                                        {aiExplanation}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Filter Buttons Row */}
                    {!searchQuery && (
                      <div 
                        ref={categoryScrollRef}
                        className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-2"
                      >
                        {filterHeroButtons.filter(b => b.id !== 'search' && b.id !== 'voice' && b.id !== 'remote-toggle' && b.id !== 'device-info').map((btn, idx) => {
                          const isFocused = activeRow === -1 && activeCol === idx;
                          
                          return (
                            <div key={btn.id} className="relative">
                              <button 
                                onClick={btn.action}
                                onPointerDown={() => {
                                  setActiveRow(-1);
                                  setActiveCol(idx);
                                }}
                                onMouseEnter={() => {
                                  setActiveRow(-1);
                                  setActiveCol(idx);
                                }}
                                style={{ 
                                  backgroundColor: isFocused 
                                    ? 'white' 
                                    : (btn.isActive ? themeColor : 'rgba(255,255,255,0.1)'),
                                  color: isFocused ? 'black' : (btn.isActive ? 'white' : 'white'),
                                  borderColor: isFocused ? 'transparent' : (btn.isActive ? 'transparent' : 'rgba(255,255,255,0.2)')
                                }}
                                className={cn(
                                  "font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg border px-4 py-2 rounded-full text-xs backdrop-blur-md",
                                  isFocused && "scale-110 shadow-2xl ring-4 ring-white/20"
                                )}
                              >
                                <btn.icon className="w-3 h-3" />
                                {btn.label}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rows */}
            <motion.div 
              animate={{ y: 0 }}
              className={cn(
                "relative z-20 space-y-1", 
                layoutMode === 'fixed-focus' ? "flex-1 flex flex-col justify-center" : "pb-20",
                searchQuery ? "mt-8" : (layoutMode === 'fixed-focus' ? "mt-0" : "-mt-8 sm:-mt-12")
              )}
            >
              <AnimatePresence mode="wait">
                {(groupedChannels as [string, M3UChannel[]][]).map(([group, groupChannels], idx) => {
                  const isVisible = layoutMode !== 'fixed-focus' || (activeRow < 0 ? idx === 0 : idx === activeRow);
                  if (!isVisible) return null;

                  return (
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
                        rowIndex={idx}
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
                        }}
                        playbackProgress={playbackProgress}
                        epgData={epgData}
                        now={now}
                        focusEffect={focusEffect}
                        channelNumbers={channelNumbers}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
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
                      { id: 'multi', label: 'Multi Kanal', icon: Monitor, active: Object.values(multiSessions).some((ids: any) => Array.isArray(ids) && ids.includes(channelMenuId)) },
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
      <AnimatePresence>
        {/* Voice Transcript Overlay */}
        <AnimatePresence>
          {isListening && voiceTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
            >
              <div className="bg-black/80 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-white font-medium italic">"{voiceTranscript}"</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={cn(
                "w-full h-full sm:h-[600px] sm:max-h-[90vh] sm:max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden",
                uiMode === 'modern' && "bg-white/5 backdrop-blur-3xl border border-white/20 sm:rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)]",
                uiMode === 'classic' && "bg-zinc-950 border-0 sm:border-4 border-zinc-800 sm:rounded-none shadow-[30px_30px_0_rgba(0,0,0,0.3)]",
                uiMode === 'minimalist' && "bg-black border-0 sm:border border-white/10 sm:rounded-none"
              )}
            >
              {uiMode === 'modern' && (
                <div 
                  className="absolute -top-48 -left-48 w-96 h-96 rounded-full blur-[120px] opacity-20 animate-pulse"
                  style={{ backgroundColor: themeColor }}
                />
              )}
              {uiMode === 'classic' && (
                <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: themeColor }} />
              )}
              {/* Sidebar Tabs */}
              <div className="relative flex flex-col md:w-56 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 overflow-hidden">
                <div className="md:hidden absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-black/80 to-transparent pointer-events-none px-1">
                  <button 
                    onClick={() => scrollSidebar('left')}
                    className="p-1 bg-white/10 rounded-full pointer-events-auto hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="md:hidden absolute right-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-l from-black/80 to-transparent pointer-events-none px-1">
                  <button 
                    onClick={() => scrollSidebar('right')}
                    className="p-1 bg-white/10 rounded-full pointer-events-auto hover:bg-white/20 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div 
                  ref={settingsSidebarRef}
                  className="w-full h-full px-8 py-3 md:p-5 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto custom-scrollbar scroll-smooth"
                >
                  <div className="hidden md:block mb-6">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-white opacity-50">Ayarlar</h2>
                  </div>
                {[
                  { id: 0, label: 'Görünüm', icon: Sun },
                  { id: 1, label: 'Liste', icon: ListIcon },
                  { id: 2, label: 'Genel', icon: Settings },
                  { id: 3, label: 'Kumanda', icon: Smartphone },
                  { id: 4, label: 'AI Gözcü', icon: Sparkles }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    data-sidebar-focus={tab.id}
                    onClick={() => {
                      setActiveSettingsTab(tab.id);
                      setSidebarFocus(tab.id);
                      setSettingsArea('content');
                      setSettingsSection(0);
                      setSettingsFocus(0);
                      setExpandedSections({});
                    }}
                    onPointerDown={() => {
                      setActiveSettingsTab(tab.id);
                      setSidebarFocus(tab.id);
                      if (settingsArea === 'tabs') {
                        setSettingsArea('tabs');
                      }
                    }}
                    onMouseEnter={() => {
                      if (settingsArea === 'tabs') {
                        setActiveSettingsTab(tab.id);
                        setSidebarFocus(tab.id);
                        setSettingsArea('tabs');
                      }
                    }}
                    className={cn(
                      "relative flex-1 md:flex-none flex items-center gap-2.5 px-3 py-2.5 font-bold transition-all whitespace-nowrap overflow-hidden",
                      uiMode === 'modern' && "rounded-lg",
                      uiMode === 'classic' && "rounded-none border-l-2 border-transparent",
                      uiMode === 'minimalist' && "rounded-none border-0",
                      activeSettingsTab === tab.id 
                        ? (uiMode === 'modern' 
                            ? "bg-white/20 text-white scale-105 shadow-lg backdrop-blur-md border border-white/20" 
                            : uiMode === 'classic'
                            ? "bg-zinc-800 text-white border-l-4 border-white"
                            : "text-white border-b-2 border-white")
                        : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
                      settingsArea === 'tabs' && sidebarFocus === tab.id && "ring-4 ring-white ring-offset-2 ring-offset-black z-10 settings-focused"
                    )}
                  >
                    {activeSettingsTab === tab.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" style={{ backgroundColor: themeColor }} />
                    )}
                    <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-xs md:text-sm">{tab.label}</span>
                    {settingsArea === 'tabs' && sidebarFocus === tab.id && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-auto text-[8px] font-black uppercase tracking-widest text-black/40"
                      >
                        [ENTER]
                      </motion.span>
                    )}
                  </button>
                ))}
                
                <div className="hidden md:block mt-auto pt-4 space-y-4">
                  {settingsArea === 'tabs' && (
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 animate-pulse">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Navigasyon</div>
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <div className="px-1.5 py-0.5 bg-white text-black rounded text-[10px]">ENTER</div>
                        <span>Düzenle</span>
                      </div>
                    </div>
                  )}
                  <button
                    data-sidebar-focus="4"
                    onClick={() => {
                      setShowSettings(false);
                      setNavContext('browse');
                      setActiveRow(0);
                      setActiveCol(0);
                    }}
                    onPointerDown={() => {
                      setSidebarFocus(4);
                      setSettingsArea('tabs');
                    }}
                    onMouseEnter={() => {
                      setSidebarFocus(4);
                      setSettingsArea('tabs');
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 font-bold transition-all",
                      uiMode === 'modern' && "rounded-xl",
                      uiMode === 'classic' && "rounded-none border border-zinc-800",
                      uiMode === 'minimalist' && "rounded-none border-0",
                      settingsArea === 'tabs' && sidebarFocus === 4 
                        ? (uiMode === 'modern' ? "bg-white text-black ring-4 ring-white ring-offset-2 ring-offset-black z-10 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b-2 border-white settings-focused") 
                        : "text-zinc-500 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <X className="w-5 h-5" />
                    <span>Kapat</span>
                  </button>
                </div>
              </div>
            </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Scroll Buttons for Content Area */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-none">
                  <button 
                    onClick={() => scrollSettingsContent('up')}
                    className="p-2 bg-white/10 rounded-full pointer-events-auto hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
                  >
                    <ChevronDown className="w-5 h-5 text-white rotate-180" />
                  </button>
                  <button 
                    onClick={() => scrollSettingsContent('down')}
                    className="p-2 bg-white/10 rounded-full pointer-events-auto hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
                  >
                    <ChevronDown className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="md:hidden p-4 border-b border-white/5 flex justify-between items-center">
                  <h2 className="text-xl font-black italic uppercase text-white">
                    {activeSettingsTab === 0 ? 'Görünüm' : activeSettingsTab === 1 ? 'Liste' : activeSettingsTab === 2 ? 'Genel' : 'Kumanda'}
                  </h2>
                  <button onClick={() => {
                    setShowSettings(false);
                    setNavContext('browse');
                    setActiveRow(0);
                    setActiveCol(0);
                  }} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
                </div>

                <div className={cn(
                  "flex-1 overflow-y-auto p-6 md:p-10 pb-[50vh] space-y-10 custom-scrollbar scroll-smooth transition-all duration-500",
                  settingsArea === 'tabs' ? "opacity-30 grayscale-[0.5] scale-[0.98]" : "opacity-100 grayscale-0 scale-100"
                )} ref={settingsContentRef}>
                  <AnimatePresence mode="wait">
                    {activeSettingsTab === 0 && (
                      <motion.div 
                        key="tab-0"
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-10"
                      >
                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 0 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 0 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 0)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Tema Rengi
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-0'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-0'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-wrap gap-x-6 gap-y-8 p-2">
                                {[
                                  { name: 'Kırmızı', color: '#dc2626' },
                                  { name: 'Mavi', color: '#2563eb' },
                                  { name: 'Yeşil', color: '#16a34a' },
                                  { name: 'Mor', color: '#9333ea' },
                                  { name: 'Turuncu', color: '#ea580c' },
                                  { name: 'Sarı', color: '#eab308' },
                                  { name: 'Pembe', color: '#db2777' },
                                  { name: 'Turkuaz', color: '#0891b2' },
                                  { name: 'İndigo', color: '#4f46e5' },
                                  { name: 'Gül', color: '#e11d48' },
                                  { name: 'Kehribar', color: '#d97706' },
                                  { name: 'Kireç', color: '#65a30d' }
                                ].map((c, i) => (
                                  <div key={c.color} className="flex flex-col items-center gap-2">
                                    <button
                                      onClick={() => setThemeColor(c.color)}
                                      onPointerDown={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(i); } }}
                                      onMouseEnter={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(i); } }}
                                      style={{ backgroundColor: c.color }}
                                      className={cn(
                                        "w-10 h-10 md:w-12 md:h-12 transition-all border-4",
                                        uiMode === 'modern' && "rounded-full",
                                        uiMode === 'classic' && "rounded-none",
                                        uiMode === 'minimalist' && "rounded-none border-0",
                                        themeColor === c.color ? "border-white scale-110 shadow-xl" : "border-transparent opacity-40 hover:opacity-100",
                                        settingsArea === 'content' && settingsFocus === i && "ring-4 ring-white scale-125 z-10 opacity-100 settings-focused"
                                      )}
                                      title={c.name}
                                    >
                                      {themeColor === c.color && (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                        </div>
                                      )}
                                    </button>
                                    <span className={cn(
                                      "text-[10px] font-black uppercase tracking-widest transition-all",
                                      themeColor === c.color ? "text-white" : "text-zinc-500",
                                      settingsArea === 'content' && settingsFocus === i && "scale-110 text-white"
                                    )}>
                                      {c.name}
                                    </span>
                                  </div>
                                ))}

                                {/* Mixed Color Item */}
                                <div className="flex flex-col items-center gap-2">
                                  <button
                                    onClick={() => setThemeColor(mixedColor)}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(12); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(12); } }}
                                    style={{ backgroundColor: mixedColor }}
                                    className={cn(
                                      "w-10 h-10 md:w-12 md:h-12 rounded-lg transition-all border-4 flex items-center justify-center",
                                      themeColor === mixedColor ? "border-white scale-110 shadow-xl" : "border-transparent opacity-40 hover:opacity-100",
                                      settingsArea === 'content' && settingsFocus === 12 && "ring-4 ring-white scale-125 z-10 opacity-100 settings-focused"
                                    )}
                                    title="Karışım Rengi"
                                  >
                                    {themeColor === mixedColor && <Check className="w-6 h-6 text-white drop-shadow-md" />}
                                  </button>
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest transition-all",
                                    themeColor === mixedColor ? "text-white" : "text-zinc-500",
                                    settingsArea === 'content' && settingsFocus === 12 && "scale-110 text-white"
                                  )}>
                                    Karışım
                                  </span>
                                </div>
                              </div>

                              {/* Merged Color Mixer UI */}
                              <div className="mt-8 pt-8 border-t border-white/10 space-y-4 px-2">
                                <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                                  <Pipette className="w-3 h-3" />
                                  Renk Karıştırıcı
                                </div>
                                <div className="bg-white/5 p-6 rounded-2xl space-y-6">
                                  <div className="flex items-center justify-center gap-8">
                                    <div className="flex flex-col items-center gap-2">
                                      <input 
                                        type="color" 
                                        value={mixColor1} 
                                        onChange={(e) => setMixColor1(e.target.value)}
                                        className={cn(
                                          "w-12 h-12 rounded-lg cursor-pointer bg-transparent border-2 transition-all",
                                          settingsArea === 'content' && settingsFocus === 13 ? "border-white scale-110 settings-focused" : "border-white/10"
                                        )}
                                        onPointerDown={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(13); } }}
                                        onMouseEnter={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(13); } }}
                                      />
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Renk 1</span>
                                    </div>
                                    <Plus className="w-4 h-4 text-zinc-500" />
                                    <div className="flex flex-col items-center gap-2">
                                      <input 
                                        type="color" 
                                        value={mixColor2} 
                                        onChange={(e) => setMixColor2(e.target.value)}
                                        className={cn(
                                          "w-12 h-12 rounded-lg cursor-pointer bg-transparent border-2 transition-all",
                                          settingsArea === 'content' && settingsFocus === 14 ? "border-white scale-110 settings-focused" : "border-white/10"
                                        )}
                                        onPointerDown={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(14); } }}
                                        onMouseEnter={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(14); } }}
                                      />
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Renk 2</span>
                                    </div>
                                    <Equal className="w-4 h-4 text-zinc-500" />
                                    <div className="flex flex-col items-center gap-2">
                                      <div 
                                        className="w-12 h-12 rounded-lg border-2 border-white/10"
                                        style={{ backgroundColor: mixedColor }}
                                      />
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sonuç</span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-center text-zinc-500 font-medium italic">İki rengi karıştırarak kendi özel temanızı oluşturun. Sonuç rengi yukarıdaki palete kare olarak eklenir.</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 1 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 1 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 1)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(1); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(1); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Arayüz Modu
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-1'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-1'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-2">
                                {[
                                  { id: 'modern', label: 'Modern', icon: Tv, desc: 'Cam efektli, canlı ve hareketli' },
                                  { id: 'bento', label: 'Bento Grid', icon: Grid, desc: 'Modern dashboard görünümü' },
                                  { id: 'classic', label: 'Klasik', icon: ListIcon, desc: 'Geleneksel, sade ve hızlı' },
                                  { id: 'minimalist', label: 'Minimalist', icon: Equal, desc: 'Sadece içerik odaklı' }
                                ].map((mode, idx) => (
                                  <button
                                    key={mode.id}
                                    onClick={() => setUiMode(mode.id as UIMode)}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(20 + idx); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(20 + idx); } }}
                                    className={cn(
                                      "p-4 border-2 transition-all flex flex-col items-center gap-2 text-center relative",
                                      uiMode === 'modern' && "rounded-2xl",
                                      uiMode === 'classic' && "rounded-none",
                                      uiMode === 'minimalist' && "rounded-none border-0",
                                      uiMode === mode.id 
                                        ? "border-white bg-white/10" 
                                        : "border-white/5 hover:border-white/20 bg-white/5",
                                      settingsArea === 'content' && settingsFocus === (20 + idx) && "ring-4 ring-white scale-105 z-10 settings-focused"
                                    )}
                                  >
                                    <div className="absolute top-2 right-2">
                                      {uiMode === mode.id && (
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                      )}
                                    </div>
                                    <mode.icon className="w-6 h-6" style={{ color: uiMode === mode.id ? themeColor : undefined }} />
                                    <div>
                                      <div className="font-bold text-sm">{mode.label}</div>
                                      <div className="text-[10px] opacity-50">{mode.desc}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>
                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 2 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 2 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 2)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(2); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(2); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Navigasyon Modu
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-2'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-2'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                                {[
                                  { id: 'scroll', label: 'Standart Kaydırma', icon: ListIcon, desc: 'Sayfa aşağı doğru kayar' },
                                  { id: 'fixed-focus', label: 'Sabit Odak (TV)', icon: Monitor, desc: 'Kategoriler odak noktasına gelir' }
                                ].map((mode, idx) => (
                                  <button
                                    key={mode.id}
                                    onClick={() => setLayoutMode(mode.id as LayoutMode)}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(150 + idx); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(150 + idx); } }}
                                    className={cn(
                                      "p-4 border-2 transition-all flex flex-col items-center gap-2 text-center relative",
                                      uiMode === 'modern' && "rounded-2xl",
                                      uiMode === 'classic' && "rounded-none",
                                      uiMode === 'minimalist' && "rounded-none border-0",
                                      layoutMode === mode.id 
                                        ? "border-white bg-white/10" 
                                        : "border-white/5 hover:border-white/20 bg-white/5",
                                      settingsArea === 'content' && settingsFocus === (150 + idx) && "ring-4 ring-white scale-105 z-10 settings-focused"
                                    )}
                                  >
                                    <div className="absolute top-2 right-2">
                                      {layoutMode === mode.id && (
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                      )}
                                    </div>
                                    <mode.icon className="w-6 h-6" style={{ color: layoutMode === mode.id ? themeColor : undefined }} />
                                    <div>
                                      <div className="font-bold text-sm">{mode.label}</div>
                                      <div className="text-[10px] text-zinc-500 font-medium">{mode.desc}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 3 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 3 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 3)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(3); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(3); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Poster Görünümü
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-3'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-3'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                                <button
                                  onClick={() => setPosterOrientation('landscape')}
                                  onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(15); } }}
                                  onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(15); } }}
                                  className={cn(
                                    "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 relative",
                                    posterOrientation === 'landscape' 
                                      ? "border-white bg-white/10" 
                                      : "border-white/5 hover:border-white/20 bg-white/5",
                                    settingsArea === 'content' && settingsFocus === 15 && "ring-4 ring-white scale-105 z-10 settings-focused"
                                  )}
                                >
                                  <div className="absolute top-3 right-3">
                                    {posterOrientation === 'landscape' && (
                                      <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                    )}
                                  </div>
                                  <div className="w-24 h-16 bg-zinc-800 rounded-lg border border-white/10 shadow-inner" />
                                  <span className="font-bold text-lg">Yatay</span>
                                </button>
                                <button
                                  onClick={() => setPosterOrientation('portrait')}
                                  onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(16); } }}
                                  onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(16); } }}
                                  className={cn(
                                    "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 relative",
                                    posterOrientation === 'portrait' 
                                      ? "border-white bg-white/10" 
                                      : "border-white/5 hover:border-white/20 bg-white/5",
                                    settingsArea === 'content' && settingsFocus === 16 && "ring-4 ring-white scale-105 z-10 settings-focused"
                                  )}
                                >
                                  <div className="absolute top-3 right-3">
                                    {posterOrientation === 'portrait' && (
                                      <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                    )}
                                  </div>
                                  <div className="w-16 h-24 bg-zinc-800 rounded-lg border border-white/10 shadow-inner" />
                                  <span className="font-bold text-lg">Dikey</span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 4 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 4 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 4)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(4); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(4); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Logo Stili
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-4'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-4'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-2">
                                {[
                                  { id: 'default', label: 'Varsayılan', desc: 'Dönüşümlü' },
                                  { id: 'mooncrown', label: 'Mooncrown', desc: 'Klasik Mooncrown' },
                                  { id: 'mooncrown-gold', label: 'Mooncrown Gold', desc: 'Altın Sarısı Mooncrown' },
                                  { id: 'mooncrown-silver', label: 'Mooncrown Silver', desc: 'Gümüş Grisi Mooncrown' },
                                  { id: 'mooncrown-neon', label: 'Mooncrown Neon', desc: 'Neon Beyaz Mooncrown' },
                                  { id: 'mooncrown-glass', label: 'Mooncrown Glass', desc: 'Cam Efektli Mooncrown' },
                                  { id: 'mooncrown-fire', label: 'Mooncrown Fire', desc: 'Ateş Efektli Mooncrown' },
                                  { id: 'minimal', label: 'Minimal', desc: 'Sade görünüm' },
                                  { id: 'neon', label: 'Neon', desc: 'Parlak efekt' },
                                  { id: 'retro', label: 'Retro', desc: 'Klasik TV stili' },
                                  { id: 'glitch', label: 'Glitch', desc: 'Dijital bozulma' }
                                ].map((style, idx) => (
                                  <button
                                    key={style.id}
                                    onClick={() => setLogoStyle(style.id as LogoStyle)}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(4); setSettingsFocus(40 + idx); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(4); setSettingsFocus(40 + idx); } }}
                                    className={cn(
                                      "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center relative",
                                      logoStyle === style.id 
                                        ? "border-white bg-white/10" 
                                        : "border-white/5 hover:border-white/20 bg-white/5",
                                      settingsArea === 'content' && settingsFocus === (40 + idx) && "ring-4 ring-white scale-105 z-10 settings-focused"
                                    )}
                                  >
                                    <div className="absolute top-2 right-2">
                                      {logoStyle === style.id && (
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                      )}
                                    </div>
                                    <div className="font-bold text-sm">{style.label}</div>
                                    <div className="text-[10px] opacity-50">{style.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 5 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 5 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 5)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(5); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(5); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Saat ve Tarih Stili
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-5'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-5'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                                {[
                                  { id: 'original', label: 'Orijinal' },
                                  { id: 'horizontal', label: 'Yatay' },
                                  { id: 'minimal', label: 'Minimal' },
                                  { id: 'retro', label: 'Retro' },
                                  { id: 'modern', label: 'Modern' }
                                ].map((style, idx) => (
                                  <button
                                    key={style.id}
                                    onClick={() => setClockStyle(style.id as any)}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(50 + idx); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(50 + idx); } }}
                                    className={cn(
                                      "p-4 border-2 transition-all flex flex-col items-center gap-4 text-center relative",
                                      uiMode === 'modern' && "rounded-2xl",
                                      uiMode === 'classic' && "rounded-none",
                                      uiMode === 'minimalist' && "rounded-none border-0",
                                      clockStyle === style.id 
                                        ? "border-white bg-white/10" 
                                        : "border-white/5 hover:border-white/20 bg-white/5",
                                      settingsArea === 'content' && settingsFocus === (50 + idx) && "ring-4 ring-white scale-105 z-10 settings-focused"
                                    )}
                                  >
                                    <div className="absolute top-2 right-2">
                                      {clockStyle === style.id && (
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                      )}
                                    </div>
                                    <div className="scale-75 origin-center">
                                      <DigitalClock themeColor={themeColor} style={style.id as any} />
                                    </div>
                                    <div className="font-bold text-sm tracking-widest uppercase">{style.label}</div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 6 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 6 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 6)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(6); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(6); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Top 10 Sayı Stili
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-6'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-6'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-2">
                                {[
                                  { id: 'original', label: 'Orijinal' },
                                  { id: 'filled', label: 'Dolu' },
                                  { id: 'theme', label: 'Dolu (Tema)' },
                                  { id: 'outline-theme', label: 'İçi Boş (Tema)' },
                                  { id: 'neon', label: 'Neon (Tema)' }
                                ].map((style, idx) => (
                                  <button
                                    key={style.id}
                                    onClick={() => setTop10Style(style.id as Top10Style)}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(6); setSettingsFocus(60 + idx); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(6); setSettingsFocus(60 + idx); } }}
                                    className={cn(
                                      "p-4 border-2 transition-all flex flex-col items-center gap-2 text-center relative",
                                      uiMode === 'modern' && "rounded-2xl",
                                      uiMode === 'classic' && "rounded-none",
                                      uiMode === 'minimalist' && "rounded-none border-0",
                                      top10Style === style.id 
                                        ? "border-white bg-white/10" 
                                        : "border-white/5 hover:border-white/20 bg-white/5",
                                      settingsArea === 'content' && settingsFocus === (60 + idx) && "ring-4 ring-white scale-105 z-10 settings-focused"
                                    )}
                                  >
                                    <div className="absolute top-2 right-2">
                                      {top10Style === style.id && (
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                      )}
                                    </div>
                                    <div className="text-4xl font-black italic" style={{ 
                                      color: (style.id === 'theme' || style.id === 'outline-theme' || style.id === 'neon') ? (style.id === 'theme' ? themeColor : 'transparent') : (style.id === 'original' ? 'transparent' : 'white'),
                                      WebkitTextStroke: (style.id === 'original' || style.id === 'outline-theme' || style.id === 'neon') ? `1px ${style.id === 'original' ? 'rgba(255,255,255,0.5)' : themeColor}` : 'none',
                                      textShadow: style.id === 'neon' ? `0 0 10px ${themeColor}, 0 0 20px ${themeColor}` : 'none'
                                    }}>
                                      1
                                    </div>
                                    <div className="font-bold text-xs tracking-widest uppercase">{style.label}</div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 7 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 7 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 7)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(7); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(7); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Görsel Odak Efektleri
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-7'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-7'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-2">
                                {[
                                  { id: 'default', label: 'Varsayılan', desc: 'Sade odak' },
                                  { id: 'glow', label: 'Parlama', desc: 'Yumuşak ışık' },
                                  { id: 'pulse', label: 'Nabız', desc: 'Yavaşça büyüme' },
                                  { id: 'border', label: 'Kenarlık', desc: 'Renkli çerçeve' },
                                  { id: 'scale', label: 'Büyütme', desc: 'Daha belirgin' }
                                ].map((effect, idx) => (
                                  <button
                                    key={effect.id}
                                    onClick={() => setFocusEffect(effect.id as FocusEffect)}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(7); setSettingsFocus(70 + idx); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(7); setSettingsFocus(70 + idx); } }}
                                    className={cn(
                                      "p-4 border-2 transition-all flex flex-col items-center gap-2 text-center relative",
                                      uiMode === 'modern' && "rounded-2xl",
                                      uiMode === 'classic' && "rounded-none",
                                      uiMode === 'minimalist' && "rounded-none border-0",
                                      focusEffect === effect.id 
                                        ? "border-white bg-white/10" 
                                        : "border-white/5 hover:border-white/20 bg-white/5",
                                      settingsArea === 'content' && settingsFocus === (70 + idx) && "ring-4 ring-white scale-105 z-10 settings-focused"
                                    )}
                                  >
                                    <div className="absolute top-2 right-2">
                                      {focusEffect === effect.id && (
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                      )}
                                    </div>
                                    <div className="font-bold text-sm">{effect.label}</div>
                                    <div className="text-[10px] opacity-50">{effect.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 8 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 8 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 8)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(8); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(8); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Dinamik Tema (Magic Color)
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-8'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-8'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="p-2">
                                <button
                                  onClick={() => setDynamicThemeEnabled(!dynamicThemeEnabled)}
                                  onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(8); setSettingsFocus(80); } }}
                                  onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(8); setSettingsFocus(80); } }}
                                  className={cn(
                                    "w-full p-6 rounded-2xl border-2 transition-all flex items-center justify-between gap-4",
                                    dynamicThemeEnabled 
                                      ? "border-white bg-white/10" 
                                      : "border-white/5 hover:border-white/20 bg-white/5",
                                    settingsArea === 'content' && settingsFocus === 80 && "ring-4 ring-white scale-[1.02] z-10 settings-focused"
                                  )}
                                >
                                  <div className="flex flex-col items-start gap-1">
                                    <span className="font-bold text-lg">Dinamik Tema</span>
                                    <span className="text-xs text-zinc-500">Uygulama renkleri içeriğe göre otomatik değişir</span>
                                  </div>
                                  <div className={cn(
                                    "w-12 h-6 rounded-full transition-all relative",
                                    dynamicThemeEnabled ? "bg-green-500" : "bg-zinc-700"
                                  )}>
                                    <div className={cn(
                                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                      dynamicThemeEnabled ? "left-7" : "left-1"
                                    )} />
                                  </div>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 9 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 9 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 9)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(9); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(9); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Sesli Kontrol
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-9'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-9'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="p-2">
                                <button
                                  onClick={() => setVoiceControlEnabled(!voiceControlEnabled)}
                                  onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(9); setSettingsFocus(90); } }}
                                  onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(9); setSettingsFocus(90); } }}
                                  className={cn(
                                    "w-full p-6 rounded-2xl border-2 transition-all flex items-center justify-between gap-4",
                                    voiceControlEnabled 
                                      ? "border-white bg-white/10" 
                                      : "border-white/5 hover:border-white/20 bg-white/5",
                                    settingsArea === 'content' && settingsFocus === 90 && "ring-4 ring-white scale-[1.02] z-10 settings-focused"
                                  )}
                                >
                                  <div className="flex flex-col items-start gap-1 text-left">
                                    <span className="font-bold text-lg">Sesli Kontrol</span>
                                    <span className="text-[10px] text-zinc-500">Uygulamayı sesli komutlarla yönetin</span>
                                  </div>
                                  <div className={cn(
                                    "w-12 h-6 rounded-full transition-all relative flex-shrink-0",
                                    voiceControlEnabled ? "bg-green-500" : "bg-zinc-700"
                                  )}>
                                    <div className={cn(
                                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                      voiceControlEnabled ? "left-7" : "left-1"
                                    )} />
                                  </div>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 10 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 10 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(0, 10)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(10); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(10); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Yükleme Ekranı Stili
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-10'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['0-10'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-2">
                                {[
                                  { id: 'classic', label: 'Klasik', icon: Tv, desc: 'Geleneksel TV' },
                                  { id: 'minimal', label: 'Minimal', icon: CircleDashed, desc: 'Sade ve şık' },
                                  { id: 'pulse', label: 'Nabız', icon: Activity, desc: 'Canlı efekt' },
                                  { id: 'bars', label: 'Çubuklar', icon: Sparkles, desc: 'Modern animasyon' },
                                  { id: 'orbit', label: 'Yörünge', icon: RefreshCw, desc: 'Dairesel hareket' },
                                  { id: 'glitch', label: 'Dijital', icon: Cpu, desc: 'Teknolojik görünüm' }
                                ].map((style, idx) => (
                                  <button
                                    key={style.id}
                                    onClick={() => setLoadingStyle(style.id as any)}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(10); setSettingsFocus(110 + idx); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(10); setSettingsFocus(110 + idx); } }}
                                    className={cn(
                                      "p-4 border-2 transition-all flex flex-col items-center gap-2 text-center relative",
                                      uiMode === 'modern' && "rounded-2xl",
                                      uiMode === 'classic' && "rounded-none",
                                      uiMode === 'minimalist' && "rounded-none border-0",
                                      loadingStyle === style.id 
                                        ? "border-white bg-white/10" 
                                        : "border-white/5 hover:border-white/20 bg-white/5",
                                      settingsArea === 'content' && settingsFocus === (110 + idx) && "ring-4 ring-white scale-105 z-10 settings-focused"
                                    )}
                                  >
                                    <div className="absolute top-2 right-2">
                                      {loadingStyle === style.id && (
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                      )}
                                    </div>
                                    <style.icon className="w-6 h-6" style={{ color: loadingStyle === style.id ? themeColor : undefined }} />
                                    <div className="font-bold text-sm">{style.label}</div>
                                    <div className="text-[10px] opacity-50">{style.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>
                    </motion.div>
                  )}

                  {activeSettingsTab === 1 && (
                    <motion.div 
                      key="tab-1"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 0 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 0 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(1, 0)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Oynatma Listesi Yönetimi
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['1-0'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['1-0'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-4 p-2">
                                <div className="bg-white/5 p-6 rounded-2xl space-y-4">
                                  <label className="text-sm font-bold text-zinc-400">M3U Dosyası Yükle</label>
                                  <label className="block cursor-pointer group">
                                    <input type="file" accept=".m3u,.m3u8" className="hidden" id="m3u-upload" onChange={handleFileUpload} />
                                    <div className={cn(
                                      "bg-black/40 border-2 border-dashed rounded-xl py-6 transition-all flex flex-col items-center gap-2",
                                      settingsArea === 'content' && settingsFocus === 0 ? "border-white bg-white/5 settings-focused" : "border-white/10"
                                    )}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(0); setSettingsFocus(0); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(0); setSettingsFocus(0); } }}
                                    onClick={() => document.getElementById('m3u-upload')?.click()}
                                    >
                                      <Upload className="w-6 h-6 text-zinc-500" />
                                      <span className="text-sm font-bold text-zinc-300">Dosya Seç</span>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 1 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 1 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(1, 1)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(1); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(1); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            EPG Ayarları
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['1-1'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['1-1'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="bg-white/5 p-6 rounded-2xl space-y-4 m-2">
                                <label className="text-sm font-bold text-zinc-400">EPG Linki Ekle</label>
                                <div className="flex gap-2">
                                  <button
                                    id="epg-input-btn"
                                    onClick={() => {
                                      const input = document.getElementById('epg-input') as HTMLInputElement;
                                      if (input) input.focus();
                                    }}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(1); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(1); } }}
                                    className={cn(
                                      "flex-1 bg-black/40 border rounded-xl px-4 py-3 outline-none transition-all text-sm text-left relative",
                                      settingsArea === 'content' && settingsFocus === 1 ? "border-white ring-2 ring-white/20 settings-focused" : "border-white/10"
                                    )}
                                  >
                                    <span className="truncate block pr-8">{epgUrl || 'EPG URL\'si girin...'}</span>
                                    <Link2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                  </button>
                                  <input
                                    id="epg-input"
                                    type="url"
                                    value={epgUrl}
                                    onChange={(e) => setEpgUrl(e.target.value)}
                                    className="sr-only"
                                  />
                                  <button
                                    id="epg-load-btn"
                                    onClick={() => handleLoadEPG()}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(2); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(2); } }}
                                    style={{ backgroundColor: themeColor }}
                                    className={cn(
                                      "px-6 py-3 rounded-xl font-bold text-white transition-all",
                                      settingsArea === 'content' && settingsFocus === 2 ? "scale-105 shadow-lg brightness-110 settings-focused" : "opacity-90 hover:opacity-100"
                                    )}
                                  >
                                    Yükle
                                  </button>
                                </div>
                                {epgData && (
                                  <button
                                    onClick={() => {
                                      setEpgUrl('');
                                      setEpgData(null);
                                      localStorage.removeItem('epg_url');
                                    }}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(3); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(3); } }}
                                    className={cn(
                                      "w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                      settingsArea === 'content' && settingsFocus === 3 ? "bg-red-600 text-white settings-focused" : "bg-red-500/10 text-red-500"
                                    )}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Mevcut EPG'yi Sil
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 2 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 2 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(1, 2)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(2); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(2); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            URL Linki Ekle
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['1-2'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['1-2'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="bg-white/5 p-6 rounded-2xl space-y-4 m-2">
                                <div className="flex gap-2">
                                  <button
                                    id="extra-url-input-btn"
                                    onClick={() => {
                                      const input = document.getElementById('extra-url-input') as HTMLInputElement;
                                      if (input) input.focus();
                                    }}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(4); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(4); } }}
                                    className={cn(
                                      "flex-1 bg-black/40 border rounded-xl px-4 py-3 outline-none transition-all text-sm text-left relative",
                                      settingsArea === 'content' && settingsFocus === 4 ? "border-white ring-2 ring-white/20 settings-focused" : "border-white/10"
                                    )}
                                  >
                                    <span className="truncate block pr-8">{extraUrl || 'URL veya Cutt.ly kodu girin...'}</span>
                                    <Link2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                  </button>
                                  <input
                                    id="extra-url-input"
                                    type="url"
                                    value={extraUrl}
                                    onChange={(e) => setExtraUrl(e.target.value)}
                                    className="sr-only"
                                  />
                                  <button
                                    onClick={() => {
                                      if (!extraUrl) return;
                                      setPlaylistUrl(extraUrl);
                                      handleUrlSubmit(extraUrl);
                                    }}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(5); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(5); } }}
                                    style={{ backgroundColor: themeColor }}
                                    className={cn(
                                      "px-6 py-3 rounded-xl font-bold text-white transition-all",
                                      settingsArea === 'content' && settingsFocus === 5 ? "scale-105 shadow-lg brightness-110 settings-focused" : "opacity-90 hover:opacity-100"
                                    )}
                                  >
                                    Yükle
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 3 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 3 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(1, 3)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(3); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(3); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Liste İşlemleri
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['1-3'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['1-3'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                                <button
                                  onClick={() => {
                                    localStorage.removeItem('m3u_deleted');
                                    localStorage.setItem('m3u_url', DEFAULT_M3U_URL);
                                    setSavedUrl(DEFAULT_M3U_URL);
                                    setPlaylistUrl(DEFAULT_M3U_URL);
                                    handleUrlSubmit(DEFAULT_M3U_URL);
                                  }}
                                  onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(6); } }}
                                  onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(6); } }}
                                  className={cn(
                                    "text-left px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                                    settingsArea === 'content' && settingsFocus === 6 ? "bg-white text-black scale-105 shadow-xl settings-focused" : "bg-white/5 text-white hover:bg-white/10"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
                                      <RefreshCw className={cn("w-6 h-6", settingsArea === 'content' && settingsFocus === 6 && "animate-spin")} />
                                    </div>
                                    <div>
                                      <div className="text-lg">Ana Linki Yükle</div>
                                      <div className="text-xs opacity-50 font-medium">Varsayılan listeyi açar</div>
                                    </div>
                                  </div>
                                </button>
                                
                                <button
                                  onClick={() => {
                                    localStorage.removeItem('m3u_url');
                                    localStorage.removeItem('epg_url');
                                    localStorage.setItem('m3u_deleted', 'true');
                                    setSavedUrl(null);
                                    setEpgUrl('');
                                    setEpgData(null);
                                    setChannels([]);
                                    setPlaylistUrl('');
                                    setNavContext('browse');
                                    setActiveRow(0);
                                    setActiveCol(0);
                                  }}
                                  onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(7); } }}
                                  onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(7); } }}
                                  className={cn(
                                    "text-left px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                                    settingsArea === 'content' && settingsFocus === 7 ? "bg-red-600 text-white scale-105 shadow-xl settings-focused" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-500/20 rounded-xl group-hover:scale-110 transition-transform">
                                      <Trash2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                      <div className="text-lg">Listeyi Sil</div>
                                      <div className="text-xs opacity-50 font-medium">Tüm verileri temizler</div>
                                    </div>
                                  </div>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 4 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 4 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(1, 4)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(4); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(4); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Kategori Görünürlüğü
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['1-4'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['1-4'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-2">
                                {[
                                  { id: 'top10', label: 'Top 10', icon: Tv },
                                  { id: 'favorites', label: 'Favorilerim', icon: Heart },
                                  { id: 'live', label: 'Canlı', icon: Tv },
                                  { id: 'movies', label: 'Film', icon: Play },
                                  { id: 'series', label: 'Dizi', icon: ListIcon },
                                  { id: 'recent', label: 'İzlemeye Devam Et', icon: Clock }
                                ].map((cat, idx) => {
                                  const isVisible = visibleCategories.includes(cat.label);
                                  const focusIdx = 8 + idx;
                                  return (
                                    <button
                                      key={cat.id}
                                      onClick={() => selectCategory(cat.id as any)}
                                      onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(4); setSettingsFocus(focusIdx); } }}
                                      onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(4); setSettingsFocus(focusIdx); } }}
                                      className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm",
                                        settingsArea === 'content' && settingsFocus === focusIdx 
                                          ? "bg-white text-black scale-105 shadow-xl settings-focused" 
                                          : isVisible ? "bg-white/10 text-white" : "bg-white/5 text-zinc-500"
                                      )}
                                    >
                                      <cat.icon className={cn("w-4 h-4", isVisible && ! (settingsArea === 'content' && settingsFocus === focusIdx) && "text-red-500")} style={{ color: isVisible && ! (settingsArea === 'content' && settingsFocus === focusIdx) ? themeColor : undefined }} />
                                      <span>{cat.label}</span>
                                      {isVisible && <Check className="w-3 h-3 ml-auto" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 5 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 5 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(1, 5)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(5); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(5); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Çoklu Oynatma Listesi
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['1-5'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['1-5'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="bg-white/5 p-6 rounded-2xl space-y-6 m-2">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input
                                      type="text"
                                      placeholder="Liste Adı (örn: Spor, Sinema)"
                                      className={cn(
                                        "bg-black/40 border rounded-xl px-4 py-3 outline-none transition-all text-sm",
                                        settingsArea === 'content' && settingsFocus === 20 ? "border-white ring-2 ring-white/20 settings-focused" : "border-white/10"
                                      )}
                                      value={newPlaylistName}
                                      onChange={(e) => setNewPlaylistName(e.target.value)}
                                      onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(20); } }}
                                      onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(20); } }}
                                    />
                                    <input
                                      type="url"
                                      placeholder="M3U URL'si"
                                      className={cn(
                                        "bg-black/40 border rounded-xl px-4 py-3 outline-none transition-all text-sm",
                                        settingsArea === 'content' && settingsFocus === 21 ? "border-white ring-2 ring-white/20 settings-focused" : "border-white/10"
                                      )}
                                      value={newPlaylistUrl}
                                      onChange={(e) => setNewPlaylistUrl(e.target.value)}
                                      onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(21); } }}
                                      onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(21); } }}
                                    />
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (!newPlaylistName || !newPlaylistUrl) return;
                                      addPlaylist(newPlaylistName, newPlaylistUrl);
                                      setNewPlaylistName('');
                                      setNewPlaylistUrl('');
                                      showToast('Oynatma listesi başarıyla eklendi!', 'success');
                                    }}
                                    onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(22); } }}
                                    onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(22); } }}
                                    style={{ backgroundColor: themeColor }}
                                    className={cn(
                                      "w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                                      settingsArea === 'content' && settingsFocus === 22 ? "scale-105 shadow-lg brightness-110 settings-focused" : "opacity-90 hover:opacity-100"
                                    )}
                                  >
                                    <Plus className="w-5 h-5" />
                                    Yeni Liste Ekle
                                  </button>
                                </div>

                                {playlists.length > 0 && (
                                  <div className="space-y-3 pt-4 border-t border-white/5">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Kayıtlı Listeler</label>
                                    <div className="space-y-2">
                                      {playlists.map((p, idx) => (
                                        <div 
                                          key={p.id}
                                          className={cn(
                                            "flex items-center justify-between p-3 rounded-xl transition-all",
                                            currentPlaylistId === p.id ? "bg-white/10 border border-white/20" : "bg-white/5"
                                          )}
                                        >
                                          <div className="flex-1 min-w-0 mr-4">
                                            <div className="text-sm font-bold text-white truncate">{p.name}</div>
                                            <div className="text-[10px] text-zinc-500 truncate opacity-50">{p.url}</div>
                                          </div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => switchPlaylist(p)}
                                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(30 + idx * 2); } }}
                                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(30 + idx * 2); } }}
                                              className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                currentPlaylistId === p.id 
                                                  ? "bg-green-500/20 text-green-500" 
                                                  : settingsArea === 'content' && settingsFocus === 30 + idx * 2
                                                    ? "bg-white text-black settings-focused"
                                                    : "bg-white/10 text-white hover:bg-white/20"
                                              )}
                                            >
                                              {currentPlaylistId === p.id ? 'Aktif' : 'Seç'}
                                            </button>
                                            <button
                                              onClick={() => removePlaylist(p.id)}
                                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(31 + idx * 2); } }}
                                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(31 + idx * 2); } }}
                                              className={cn(
                                                "p-1.5 rounded-lg transition-all",
                                                settingsArea === 'content' && settingsFocus === 31 + idx * 2
                                                  ? "bg-red-600 text-white settings-focused"
                                                  : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                              )}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>
                    </motion.div>
                  )}

                  {activeSettingsTab === 2 && (
                    <motion.div 
                      key="tab-2"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-10"
                    >
                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 0 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 0 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(2, 0)}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Hava Durumu Ayarları
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['2-0'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['2-0'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="relative p-2">
                                <input
                                  id="city-input"
                                  type="text"
                                  value={weatherCity}
                                  onChange={(e) => setWeatherCity(e.target.value)}
                                  onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(0); setSettingsFocus(0); } }}
                                  onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(0); setSettingsFocus(0); } }}
                                  className={cn(
                                    "w-full bg-white/5 border-2 rounded-2xl px-6 py-4 outline-none transition-all text-lg font-bold",
                                    settingsArea === 'content' && settingsFocus === 0 ? "border-white ring-4 ring-white/20 settings-focused" : "border-white/5"
                                  )}
                                  placeholder="Şehir adı girin..."
                                />
                                <Cloud className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 1 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 1 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(2, 1)}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(1); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(1); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Özel Proxy Ayarları
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['2-1'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['2-1'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="relative p-2">
                                  <button
                                    id="proxy-input-btn"
                                    onClick={() => {
                                      const input = document.getElementById('proxy-input') as HTMLInputElement;
                                      if (input) input.focus();
                                    }}
                                    onPointerDown={() => { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(1); }}
                                    onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(1); }}
                                    className={cn(
                                      "w-full bg-white/5 border-2 rounded-2xl px-6 py-4 outline-none transition-all text-lg font-bold text-left relative",
                                      settingsArea === 'content' && settingsFocus === 1 ? "border-white ring-4 ring-white/20 settings-focused" : "border-white/5"
                                    )}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Proxy URL</span>
                                      <span className="truncate">{customProxyUrl || 'Varsayılan Proxy'}</span>
                                    </div>
                                    <Link2 className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500" />
                                  </button>
                                  <input
                                    id="proxy-input"
                                    type="text"
                                    value={customProxyUrl}
                                    onChange={(e) => {
                                      setCustomProxyUrl(e.target.value);
                                      localStorage.setItem('custom_proxy_url', e.target.value);
                                    }}
                                    className="sr-only"
                                  />
                                  <p className="text-xs text-zinc-500 px-2 mt-2 italic">Boş bırakılırsa sistemin kendi proxy'si kullanılır.</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 2 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 2 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(2, 2)}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(2); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(2); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Oynatma Ayarları
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['2-2'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['2-2'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="p-2">
                                <button 
                                  onClick={() => setAutoPreviewEnabled(prev => !prev)}
                                  onPointerDown={() => { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(2); }}
                                  onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(2); }}
                                  className={cn(
                                    "w-full px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                                    settingsArea === 'content' && settingsFocus === 2 ? "bg-white text-black scale-105 shadow-xl settings-focused" : "bg-white/5 text-white hover:bg-white/10"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "p-3 rounded-xl transition-transform",
                                      settingsArea === 'content' && settingsFocus === 2 ? "bg-black/10" : "bg-white/10"
                                    )}>
                                      <Play className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                      <div className="text-lg">Otomatik Önizleme</div>
                                      <div className="text-xs opacity-50 font-medium">Poster üzerinde bekleyince oynatır</div>
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "w-12 h-6 rounded-full relative transition-colors",
                                    autoPreviewEnabled ? "bg-emerald-500" : "bg-zinc-700"
                                  )}>
                                    <div className={cn(
                                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                      autoPreviewEnabled ? "right-1" : "left-1"
                                    )} />
                                  </div>
                                </button>

                                <button 
                                  onClick={() => setChannelSurfEnabled(prev => !prev)}
                                  onPointerDown={() => { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(3); }}
                                  onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(3); }}
                                  className={cn(
                                    "w-full px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group mt-2",
                                    settingsArea === 'content' && settingsFocus === 3 ? "bg-white text-black scale-105 shadow-xl settings-focused" : "bg-white/5 text-white hover:bg-white/10"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "p-3 rounded-xl transition-transform",
                                      settingsArea === 'content' && settingsFocus === 3 ? "bg-black/10" : "bg-white/10"
                                    )}>
                                      <Tv className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                      <div className="text-lg">Kanal Sörfü</div>
                                      <div className="text-xs opacity-50 font-medium">Yukarı/Aşağı tuşlarıyla kanal değiştirme</div>
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "w-12 h-6 rounded-full relative transition-colors",
                                    channelSurfEnabled ? "bg-emerald-500" : "bg-zinc-700"
                                  )}>
                                    <div className={cn(
                                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                      channelSurfEnabled ? "right-1" : "left-1"
                                    )} />
                                  </div>
                                </button>

                                <div className="mt-4 space-y-2 px-2">
                                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">
                                    <Cpu className="w-3 h-3" />
                                    Oynatıcı Motoru
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      { id: 'hls', name: 'Standart', desc: 'HLS.js' },
                                      { id: 'shaka', name: 'ExoPlayer', desc: 'Shaka Web' }
                                    ].map((engine, idx) => (
                                      <button
                                        key={engine.id}
                                        onClick={() => setPlayerEngine(engine.id as any)}
                                        onPointerDown={() => { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(4 + idx); }}
                                        onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(4 + idx); }}
                                        className={cn(
                                          "flex flex-col items-start p-3 rounded-xl border transition-all duration-300 text-left",
                                          playerEngine === engine.id
                                            ? "bg-white/10 border-white/20 ring-1 ring-white/20"
                                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10",
                                          settingsArea === 'content' && settingsFocus === (4 + idx) ? "border-white ring-2 ring-white/20 scale-105 bg-white/20 settings-focused" : ""
                                        )}
                                      >
                                        <div className="flex items-center justify-between w-full mb-0.5">
                                          <span className={cn(
                                            "font-bold text-sm",
                                            playerEngine === engine.id ? "text-white" : "text-white/60"
                                          )}>
                                            {engine.name}
                                          </span>
                                          {playerEngine === engine.id && (
                                            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                          )}
                                        </div>
                                        <span className="text-[10px] text-white/40 font-medium">{engine.desc}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="mt-4 space-y-2 px-2">
                                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">
                                    <Monitor className="w-3 h-3" />
                                    Ambilight (Sinematik Işık)
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      { id: 'none', name: 'Kapalı', desc: 'Standart' },
                                      { id: 'soft', name: 'Yumuşak', desc: 'Göz Dostu' },
                                      { id: 'vibrant', name: 'Canlı', desc: 'Dinamik' },
                                      { id: 'cinema', name: 'Sinema', desc: 'Geniş' }
                                    ].map((mode, idx) => (
                                      <button
                                        key={mode.id}
                                        onClick={() => setAmbilightMode(mode.id as any)}
                                        onPointerDown={() => { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(6 + idx); }}
                                        onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(6 + idx); }}
                                        className={cn(
                                          "flex flex-col items-start p-3 rounded-xl border transition-all duration-300 text-left",
                                          ambilightMode === mode.id
                                            ? "bg-white/10 border-white/20 ring-1 ring-white/20"
                                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10",
                                          settingsArea === 'content' && settingsFocus === (6 + idx) ? "border-white ring-2 ring-white/20 scale-105 bg-white/20 settings-focused" : ""
                                        )}
                                      >
                                        <div className="flex items-center justify-between w-full mb-0.5">
                                          <span className={cn(
                                            "font-bold text-sm",
                                            ambilightMode === mode.id ? "text-white" : "text-white/60"
                                          )}>
                                            {mode.name}
                                          </span>
                                          {ambilightMode === mode.id && (
                                            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                                          )}
                                        </div>
                                        <span className="text-[10px] text-white/40 font-medium">{mode.desc}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 3 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                            settingsArea === 'sections' && settingsSection === 3 
                              ? (uiMode === 'modern' ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b border-white settings-focused") 
                              : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(2, 3)}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(3); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(3); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Profil Resmi
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['2-3'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['2-3'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-4 gap-4 p-2">
                                {PROFILE_PICS.map((pic, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      setProfilePic(pic);
                                      localStorage.setItem('profile_pic', pic);
                                    }}
                                    onPointerDown={() => { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(4 + i); }}
                                    onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(4 + i); }}
                                    className={cn(
                                      "aspect-square rounded-2xl overflow-hidden border-4 transition-all relative group flex items-center justify-center",
                                      profilePic === pic ? "border-white" : "border-transparent hover:border-white/20",
                                      settingsArea === 'content' && settingsFocus === (4 + i) && "ring-4 ring-white scale-110 z-10 shadow-2xl settings-focused"
                                    )}
                                    style={{ backgroundColor: themeColor }}
                                  >
                                    {pic === 'THEME_COLOR' ? (
                                      <User className="w-12 h-12 text-white" />
                                    ) : (
                                      <img 
                                        src={pic} 
                                        alt={`Profil ${i + 1}`} 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer" 
                                      />
                                    )}
                                    {profilePic === pic && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Check className="w-8 h-8 text-white" />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 4 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3 rounded-xl",
                            settingsArea === 'sections' && settingsSection === 4 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(2, 4)}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(4); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(4); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Ekran Seçimi
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['2-4'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['2-4'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-2">
                                {[
                                  { id: 'pc', label: 'PC', icon: Monitor },
                                  { id: 'tv', label: 'TV', icon: Tv },
                                  { id: 'tablet', label: 'Tablet', icon: Tablet },
                                  { id: 'phone', label: 'Telefon', icon: Smartphone }
                                ].map((device, i) => (
                                  <button
                                    key={device.id}
                                    onClick={() => {
                                      setDeviceType(device.id as any);
                                      localStorage.setItem('device_type', device.id);
                                    }}
                                    onPointerDown={() => { setSettingsArea('content'); setSettingsSection(4); setSettingsFocus(11 + i); }}
                                    onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(4); setSettingsFocus(11 + i); }}
                                    className={cn(
                                      "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3",
                                      deviceType === device.id 
                                        ? "border-white bg-white/10" 
                                        : "border-white/5 hover:border-white/20 bg-white/5",
                                      settingsArea === 'content' && settingsFocus === (11 + i) && "ring-4 ring-white scale-105 z-10 settings-focused"
                                    )}
                                  >
                                    <device.icon className="w-6 h-6" />
                                    <span className="font-bold text-sm">{device.label}</span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 5 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3 rounded-xl",
                            settingsArea === 'sections' && settingsSection === 5 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(2, 5)}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(5); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(5); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Sistem
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['2-5'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['2-5'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="p-2">
                                <button
                                  onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                  }}
                                  onPointerDown={() => { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(15); }}
                                  onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(15); }}
                                  className={cn(
                                    "w-full px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                                    settingsArea === 'content' && settingsFocus === 15 ? "bg-red-600 text-white scale-105 shadow-xl settings-focused" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-500/20 rounded-xl group-hover:scale-110 transition-transform">
                                      <RefreshCw className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                      <div className="text-lg">Tüm Verileri Sıfırla</div>
                                      <div className="text-xs opacity-50 font-medium">Uygulamayı fabrika ayarlarına döndürür</div>
                                    </div>
                                  </div>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 6 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3 rounded-xl",
                            settingsArea === 'sections' && settingsSection === 6 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(2, 6)}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(6); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(6); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            API Anahtarları
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['2-6'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['2-6'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-4 p-2">
                                <div className="space-y-2 p-2">
                                  <label className="text-[10px] text-zinc-500 uppercase font-bold px-2">TMDb API Key</label>
                                  <button
                                    id="tmdb-api-input-btn"
                                    onClick={() => {
                                      const input = document.getElementById('tmdb-api-input') as HTMLInputElement;
                                      if (input) input.focus();
                                    }}
                                    onPointerDown={() => { setSettingsArea('content'); setSettingsSection(6); setSettingsFocus(16); }}
                                    onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(6); setSettingsFocus(16); }}
                                    className={cn(
                                      "w-full bg-white/5 border-2 rounded-2xl px-6 py-4 outline-none transition-all text-sm font-mono text-left relative",
                                      settingsArea === 'content' && settingsFocus === 16 ? "border-white ring-4 ring-white/20 settings-focused" : "border-white/5"
                                    )}
                                  >
                                    <span className="truncate block pr-8">{tmdbApiKey || 'TMDb API Key girin...'}</span>
                                    <Key className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                  </button>
                                  <input
                                    id="tmdb-api-input"
                                    type="text"
                                    value={tmdbApiKey}
                                    onChange={(e) => setTmdbApiKey(e.target.value)}
                                    className="sr-only"
                                  />
                                </div>
                                <div className="space-y-2 p-2">
                                  <label className="text-[10px] text-zinc-500 uppercase font-bold px-2">Gemini API Key</label>
                                  <button
                                    id="gemini-api-input-btn"
                                    onClick={() => {
                                      const input = document.getElementById('gemini-api-input') as HTMLInputElement;
                                      if (input) input.focus();
                                    }}
                                    onPointerDown={() => { setSettingsArea('content'); setSettingsSection(6); setSettingsFocus(17); }}
                                    onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(6); setSettingsFocus(17); }}
                                    className={cn(
                                      "w-full bg-white/5 border-2 rounded-2xl px-6 py-4 outline-none transition-all text-sm font-mono text-left relative",
                                      settingsArea === 'content' && settingsFocus === 17 ? "border-white ring-4 ring-white/20 settings-focused" : "border-white/5"
                                    )}
                                  >
                                    <span className="truncate block pr-8">{geminiApiKey || 'Gemini API Key girin...'}</span>
                                    <Key className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                  </button>
                                  <input
                                    id="gemini-api-input"
                                    type="text"
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    className="sr-only"
                                  />
                                </div>
                                <p className="text-[10px] text-zinc-500 px-2 mt-2 italic">Film ve dizi afişleri, özetleri ve puanları için gereklidir.</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      <section className="space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === 7 ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3 rounded-xl",
                            settingsArea === 'sections' && settingsSection === 7 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                          )}
                          onClick={() => toggleSection(2, 7)}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(7); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(7); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                            Sinema Deneyimi
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['2-7'] ? "rotate-180" : "rotate-0")} />
                        </button>
                        <AnimatePresence>
                          {expandedSections['2-7'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="p-2 space-y-2">
                                <button 
                                  onClick={() => setCinemaModeEnabled(prev => !prev)}
                                  onPointerDown={() => { setSettingsArea('content'); setSettingsSection(7); setSettingsFocus(30); }}
                                  onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(7); setSettingsFocus(30); }}
                                  className={cn(
                                    "w-full px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                                    settingsArea === 'content' && settingsFocus === 30 ? "bg-white text-black scale-105 shadow-xl settings-focused" : "bg-white/5 text-white hover:bg-white/10"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "p-3 rounded-xl transition-transform",
                                      settingsArea === 'content' && settingsFocus === 30 ? "bg-black/10" : "bg-white/10"
                                    )}>
                                      <Tv className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                      <div className="text-lg">Akıllı Sinema Modu</div>
                                      <div className="text-xs opacity-50 font-medium">VOD içeriklerde sinematik arayüz</div>
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "w-12 h-6 rounded-full relative transition-colors",
                                    cinemaModeEnabled ? "bg-emerald-500" : "bg-zinc-700"
                                  )}>
                                    <div className={cn(
                                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                      cinemaModeEnabled ? "right-1" : "left-1"
                                    )} />
                                  </div>
                                </button>

                                <button 
                                  onClick={() => setTmdbEnabled(prev => !prev)}
                                  onPointerDown={() => { setSettingsArea('content'); setSettingsSection(7); setSettingsFocus(31); }}
                                  onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(7); setSettingsFocus(31); }}
                                  className={cn(
                                    "w-full px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                                    settingsArea === 'content' && settingsFocus === 31 ? "bg-white text-black scale-105 shadow-xl settings-focused" : "bg-white/5 text-white hover:bg-white/10"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "p-3 rounded-xl transition-transform",
                                      settingsArea === 'content' && settingsFocus === 31 ? "bg-black/10" : "bg-white/10"
                                    )}>
                                      <Database className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                      <div className="text-lg">TMDB Entegrasyonu</div>
                                      <div className="text-xs opacity-50 font-medium">Otomatik film/dizi bilgileri</div>
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "w-12 h-6 rounded-full relative transition-colors",
                                    tmdbEnabled ? "bg-emerald-500" : "bg-zinc-700"
                                  )}>
                                    <div className={cn(
                                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                      tmdbEnabled ? "right-1" : "left-1"
                                    )} />
                                  </div>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>
                    </motion.div>
                  )}

                  {activeSettingsTab === 3 && (
                    <motion.div 
                      key="tab-3"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {/* Remote Control Section */}
                      <section className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-white">Uzaktan Kumanda</h2>
                            <p className="text-zinc-500 text-[10px]">Telefonunuzu kumanda olarak kullanın</p>
                          </div>
                        </div>

                        <div className="grid gap-4">
                          {/* Remote Control Toggle */}
                          <button
                            onClick={() => setRemoteControlEnabled(!remoteControlEnabled)}
                            onPointerDown={() => { setSettingsArea('content'); setSettingsSection(0); setSettingsFocus(100); }}
                            onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(0); setSettingsFocus(100); }}
                            className={cn(
                              "w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-4",
                              remoteControlEnabled ? "border-white bg-white/10" : "border-white/5 bg-white/5",
                              settingsArea === 'content' && settingsFocus === 100 && "ring-4 ring-white scale-[1.01] z-10 settings-focused"
                            )}
                          >
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="font-bold text-base text-white">Kumanda Modu</span>
                              <span className="text-[10px] text-zinc-500">Dışarıdan kontrolü aktif eder</span>
                            </div>
                            <div className={cn(
                              "w-12 h-6 rounded-full transition-all relative",
                              remoteControlEnabled ? "bg-green-500" : "bg-zinc-700"
                            )}>
                              <div className={cn(
                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                remoteControlEnabled ? "left-7" : "left-1"
                              )} />
                            </div>
                          </button>

                          {/* Compact Pairing Info */}
                          <div className="bg-zinc-900/50 border border-white/10 p-6 rounded-[32px] text-center space-y-6 relative overflow-hidden">
                            <div 
                              className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[100px] opacity-10"
                              style={{ backgroundColor: themeColor }}
                            />
                            
                            <div className="relative z-10 space-y-6">
                              <div className="space-y-1">
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">BAĞLANTI KUR</h2>
                                <p className="text-zinc-500 font-medium text-[10px]">QR kodu tarayın veya kodu girin.</p>
                              </div>

                              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                                <div className="space-y-2">
                                  <div className="p-4 bg-white rounded-[24px] shadow-2xl transform hover:scale-105 transition-transform duration-500">
                                    <QRCodeCanvas 
                                      value={`${appUrl.replace(/\/$/, '')}/?remote=${remoteRoomId}`}
                                      size={130}
                                      level="H"
                                      includeMargin={false}
                                    />
                                  </div>
                                  <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">TARATIN</div>
                                </div>

                                <div className="w-full max-w-[220px] space-y-4">
                                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">EŞLEŞME KODU</div>
                                    <div className="text-2xl font-black text-white tracking-[0.2em]">{remoteRoomId}</div>
                                  </div>
                                  
                                  <div className={cn(
                                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-3",
                                    isRemoteConnected ? "bg-green-500/20 text-green-500 border border-green-500/20" : "bg-orange-500/20 text-orange-500 border border-orange-500/20"
                                  )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full", isRemoteConnected ? "bg-green-500 animate-pulse" : "bg-orange-500")} />
                                    {isRemoteConnected ? 'KUMANDA BAĞLANDI' : 'BAĞLANTI BEKLENİYOR...'}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-4 border-t border-white/5">
                                <p className="text-[9px] text-zinc-600 font-medium max-w-xs mx-auto">
                                  Not: Aynı ağda olmalıdır. QR çalışmazsa manuel URL girin.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeSettingsTab === 4 && (
                    <motion.div 
                      key="tab-4"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-blue-500/20 rounded-3xl">
                          <Sparkles className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">AI Gözcü</h2>
                          <p className="text-zinc-500 text-xs font-medium">Yapay zeka senin için yayınları takip eder</p>
                        </div>
                      </div>

                      <div className="grid gap-6">
                        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Takip Listesi</h3>
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded-full uppercase">
                              {watcherRules.length} AKTİF GÖREV
                            </span>
                          </div>

                          {watcherRules.length === 0 ? (
                            <div className="py-12 text-center space-y-4">
                              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                <Bell className="w-8 h-8 text-zinc-700" />
                              </div>
                              <p className="text-zinc-500 text-sm font-medium max-w-[200px] mx-auto">
                                Henüz bir takip görevi yok. AI asistanına "Maç başlayınca haber ver" diyerek başlayabilirsin.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {watcherRules.map((rule) => (
                                <div 
                                  key={rule.id}
                                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                      <Search className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                      <p className="text-white font-bold text-sm">{rule.keyword}</p>
                                      <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">
                                        {rule.type === 'title' ? 'Başlık Takibi' : rule.type === 'category' ? 'Kategori Takibi' : 'Genel Takip'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => {
                                        setWatcherRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
                                      }}
                                      className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                                        rule.isActive ? "bg-green-500/20 text-green-500" : "bg-zinc-800 text-zinc-500"
                                      )}
                                    >
                                      {rule.isActive ? 'Aktif' : 'Pasif'}
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setWatcherRules(prev => prev.filter(r => r.id !== rule.id));
                                      }}
                                      className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-[32px] p-8 flex items-center gap-6">
                          <div className="flex-1 space-y-2">
                            <h4 className="text-white font-black uppercase italic tracking-tight">Nasıl Kullanılır?</h4>
                            <p className="text-zinc-400 text-xs leading-relaxed">
                              AI Gözcü'ye yeni görevler vermek için arama çubuğuna doğal dilde isteklerini yazabilirsin. 
                              Örneğin: <span className="text-blue-400 font-bold">"Bana aksiyon filmleri başlayınca haber ver"</span>
                            </p>
                          </div>
                          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                            <Mic className="w-10 h-10 text-white/20" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                      {/* Universal Back Button for Mobile/Touch/Remote */}
                      <div className="pt-10 space-y-4">
                        <button 
                          data-section-active={settingsArea === 'sections' && settingsSection === (activeSettingsTab === 0 ? 11 : activeSettingsTab === 1 ? 6 : activeSettingsTab === 2 ? 7 : 0) ? "true" : "false"}
                          className={cn(
                            "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === (activeSettingsTab === 0 ? 11 : activeSettingsTab === 1 ? 6 : activeSettingsTab === 2 ? 7 : 0) && "bg-white/10 text-white settings-focused"
                          )}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(activeSettingsTab === 0 ? 11 : activeSettingsTab === 1 ? 6 : activeSettingsTab === 2 ? 7 : 0); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(activeSettingsTab === 0 ? 11 : activeSettingsTab === 1 ? 6 : activeSettingsTab === 2 ? 7 : 0); }}
                          onClick={() => {
                            if (settingsArea === 'content') setSettingsArea('sections');
                            else setSettingsArea('tabs');
                          }}
                        >
                          Ayarlardan Çık
                        </button>
                        <button 
                          onClick={() => {
                            if (settingsArea === 'content') setSettingsArea('sections');
                            else setSettingsArea('tabs');
                          }}
                          onPointerDown={() => {
                            setSettingsArea('content');
                            setSettingsSection(activeSettingsTab === 0 ? 11 : activeSettingsTab === 1 ? 6 : activeSettingsTab === 2 ? 7 : 0);
                            setSettingsFocus(activeSettingsTab === 0 ? 17 : activeSettingsTab === 1 ? 14 : activeSettingsTab === 2 ? 16 : 0);
                          }}
                          onMouseEnter={() => { 
                            setSettingsArea('content'); 
                            setSettingsSection(activeSettingsTab === 0 ? 11 : activeSettingsTab === 1 ? 6 : activeSettingsTab === 2 ? 7 : 0);
                            setSettingsFocus(activeSettingsTab === 0 ? 17 : activeSettingsTab === 1 ? 14 : activeSettingsTab === 2 ? 16 : 0); 
                          }}
                          style={{ backgroundColor: (settingsArea === 'content' && settingsFocus === (activeSettingsTab === 0 ? 17 : activeSettingsTab === 1 ? 14 : activeSettingsTab === 2 ? 16 : 0)) ? themeColor : undefined }}
                          className={cn(
                            "w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                            (settingsArea === 'content' && settingsFocus === (activeSettingsTab === 0 ? 17 : activeSettingsTab === 1 ? 14 : activeSettingsTab === 2 ? 16 : 0)) ? "text-white scale-105 shadow-2xl settings-focused" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                          )}
                        >
                          <ChevronLeft className="w-6 h-6" />
                          Geri Dön
                        </button>
                      </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
