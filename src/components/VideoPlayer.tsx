import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import shaka from 'shaka-player';
import mpegts from 'mpegts.js';
import { X, Settings, Volume2, VolumeX, Languages, Check, Clock, Play, List, ChevronLeft, ChevronRight, Tv, Pause, Link2, Subtitles, Settings2, FastForward, Rewind, Monitor, Star, Cpu, Zap, Loader2, RefreshCw, Activity, CircleDashed, Sparkles, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { cn } from '../utils/cn';
import { M3UChannel } from '../utils/m3uParser';
import { EPGData, EPGProgram } from '../utils/epgParser';
import { fetchMediaMetadata, MediaMetadata } from '../services/metadataService';
import { findRepairAlternatives } from '../utils/channelRepair';
import { suggestRepairExplanation } from '../services/aiSearchService';
import { ProgramSummary as ProgramSummaryType, AmbilightMode, LoadingStyle, UIMode } from '../types';
import { ProgramSummary } from './ProgramSummary';

interface VideoPlayerProps {
  url: string;
  channel?: M3UChannel;
  channels?: M3UChannel[];
  epgData?: EPGData | null;
  onClose?: () => void;
  onChannelSelect?: (channel: M3UChannel) => void;
  onToggleMini?: () => void;
  themeColor?: string;
  customProxyUrl?: string;
  isMini?: boolean;
  startTime?: number;
  onProgressUpdate?: (seconds: number, duration: number) => void;
  channelSurfEnabled?: boolean;
  volume?: number;
  isMuted?: boolean;
  onVolumeChange?: (volume: number) => void;
  onMuteToggle?: (isMuted: boolean) => void;
  playerEngine?: 'hls' | 'shaka';
  ambilightMode?: AmbilightMode;
  isPlaying?: boolean;
  onPlayPauseToggle?: (isPlaying: boolean) => void;
  loadingStyle?: LoadingStyle;
  geminiApiKey?: string;
  isLiveTranslationEnabled?: boolean;
  onToggleLiveTranslation?: () => void;
  showSummary?: boolean;
  isSummaryLoading?: boolean;
  currentSummary?: ProgramSummaryType | null;
  onToggleSummary?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  url, 
  channel, 
  channels = [], 
  epgData, 
  onClose, 
  onChannelSelect,
  onToggleMini,
  themeColor = '#ef4444',
  customProxyUrl,
  isMini = false,
  startTime = 0,
  onProgressUpdate,
  channelSurfEnabled = true,
  volume: externalVolume,
  isMuted: externalIsMuted,
  onVolumeChange,
  onMuteToggle,
  playerEngine = 'hls',
  ambilightMode = 'soft',
  isPlaying: externalIsPlaying,
  onPlayPauseToggle,
  loadingStyle = 'classic',
  geminiApiKey,
  isLiveTranslationEnabled,
  onToggleLiveTranslation,
  showSummary,
  isSummaryLoading,
  currentSummary,
  onToggleSummary
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  const [shakaInstance, setShakaInstance] = useState<any>(null);
  const [mpegtsInstance, setMpegtsInstance] = useState<mpegts.Player | null>(null);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(externalIsPlaying ?? true);
  
  useEffect(() => {
    if (externalIsPlaying !== undefined) {
      setIsPlaying(externalIsPlaying);
    }
  }, [externalIsPlaying]);

  const togglePlayPause = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    if (onPlayPauseToggle) onPlayPauseToggle(newState);
    setShowControls(true);
  };
  const [isBuffering, setIsBuffering] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showExtraControls, setShowExtraControls] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'none' | 'audio' | 'subtitle' | 'channels' | 'sources' | 'details' | 'volume'>('none');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [focusIndex, setFocusIndex] = useState(0); // 0: Close, 1: Audio, 2: Subtitle, 3: Channels, 4: Sources, 5: Details, 10: Category Selector, 11+: Menu items
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasError, setHasError] = useState(false);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [repairSuggestions, setRepairSuggestions] = useState<M3UChannel[]>([]);
  const [repairExplanation, setRepairExplanation] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [seekInfo, setSeekInfo] = useState<{ type: 'forward' | 'backward', amount: number } | null>(null);
  const [seekStep, setSeekStep] = useState(10);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(externalVolume ?? 1);
  const [isMuted, setIsMuted] = useState(externalIsMuted ?? false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [isAutoSurfActive, setIsAutoSurfActive] = useState(false);
  const [autoSurfCountdown, setAutoSurfCountdown] = useState(15);
  const volumeIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstVolumeChange = useRef(true);

  const prevVolumeRef = useRef(volume);
  const prevMutedRef = useRef(isMuted);

  useEffect(() => {
    // We no longer show the volume indicator automatically on volume change
    // as per user request to only show it when the 'Ses' tab is active.
    prevVolumeRef.current = volume;
    prevMutedRef.current = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    if (externalVolume !== undefined) setVolume(externalVolume);
  }, [externalVolume]);

  useEffect(() => {
    if (externalIsMuted !== undefined) setIsMuted(externalIsMuted);
  }, [externalIsMuted]);

  const updateVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (onVolumeChange) onVolumeChange(newVolume);
  };

  const updateMute = (newMuted: boolean) => {
    setIsMuted(newMuted);
    if (onMuteToggle) onMuteToggle(newMuted);
  };
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const seekTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const surfScrollRef = useRef<HTMLDivElement>(null);

  const resetControlsTimer = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && activeMenu === 'none' && !isBuffering) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    if (showControls) {
      resetControlsTimer();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying, activeMenu, isBuffering]);

  const handleProgressBarSeek = (e: React.MouseEvent | React.TouchEvent) => {
    if (!progressBarRef.current || !videoRef.current || duration <= 0 || duration === Infinity) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    videoRef.current.currentTime = newTime;
    setPlaybackTime(newTime);
  };

  const scrollSurf = (direction: 'left' | 'right') => {
    if (!surfScrollRef.current) return;
    const scrollAmount = 400;
    surfScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (videoRef.current && startTime > 0) {
      videoRef.current.currentTime = startTime;
    }
  }, [startTime]);

  // Periodically report progress
  useEffect(() => {
    if (!videoRef.current || !isPlaying || !onProgressUpdate) return;
    
    const interval = setInterval(() => {
      if (videoRef.current) {
        onProgressUpdate(videoRef.current.currentTime, videoRef.current.duration);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isPlaying, onProgressUpdate]);

  useEffect(() => {
    console.log('VideoPlayer focusIndex changed to:', focusIndex);
  }, [focusIndex]);

  useEffect(() => {
    console.log('VideoPlayer activeMenu changed to:', activeMenu);
  }, [activeMenu]);

  useEffect(() => {
    console.log('VideoPlayer showControls changed to:', showControls);
  }, [showControls]);

  useEffect(() => {
    console.log('VideoPlayer isPlaying changed to:', isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    if (hasError) console.error('VideoPlayer hasError set to true');
  }, [hasError]);

  const [useProxy, setUseProxy] = useState(false);

  const currentUrl = useMemo(() => {
    const urls = channel?.urls || [url];
    const rawUrl = urls[currentUrlIndex] || urls[0] || url;
    
    if (Capacitor.isNativePlatform() || !useProxy) {
      return rawUrl;
    }
    const proxyBase = customProxyUrl || '/api/proxy?url=';
    return `${proxyBase}${encodeURIComponent(rawUrl)}`;
  }, [url, channel, currentUrlIndex, useProxy, customProxyUrl]);

  useEffect(() => {
    setIsInitialLoading(true);
    setIsBuffering(true);
    setHasError(false);
  }, [currentUrl]);

  // Initialize selectedGroup when channel changes
  useEffect(() => {
    if (channel?.group) {
      setSelectedGroup(channel.group);
    }
    setCurrentUrlIndex(0);
    setUseProxy(false);
    setShowControls(true);
    setIsPlaying(true);
    setMetadata(null);
    setRepairSuggestions([]);
    setRepairExplanation(null);
  }, [channel]);

  useEffect(() => {
    const loadMetadata = async () => {
      if (channel?.type === 'video') {
        setLoadingMetadata(true);
        const data = await fetchMediaMetadata(channel.name, channel.group, channel.type);
        setMetadata(data);
        setLoadingMetadata(false);
      }
    };
    loadMetadata();
  }, [channel]);

  // All available groups
  const allGroups = useMemo(() => {
    if (!channels.length) return [];
    const groups = new Set<string>();
    channels.forEach(ch => {
      if (ch.group) groups.add(ch.group);
    });
    return Array.from(groups).sort();
  }, [channels]);

  // Filter channels by selected group
  const categoryChannels = useMemo(() => {
    if (!channels.length) return [];
    const group = selectedGroup || channel?.group || '';
    return channels.filter(ch => ch.group === group);
  }, [selectedGroup, channel, channels]);

  const [previewChannel, setPreviewChannel] = useState<M3UChannel | undefined>(channel);
  const [previewMetadata, setPreviewMetadata] = useState<MediaMetadata | null>(null);
  const [loadingPreviewMetadata, setLoadingPreviewMetadata] = useState(false);

  // Sync previewChannel when details menu opens
  useEffect(() => {
    if (activeMenu === 'details') {
      setPreviewChannel(channel);
    }
  }, [activeMenu, channel]);

  // Load metadata for previewChannel
  useEffect(() => {
    const loadPreviewMetadata = async () => {
      if (previewChannel?.type === 'video') {
        if (previewChannel.id === channel?.id) {
          setPreviewMetadata(metadata);
          return;
        }
        setLoadingPreviewMetadata(true);
        const data = await fetchMediaMetadata(previewChannel.name, previewChannel.group, previewChannel.type);
        setPreviewMetadata(data);
        setLoadingPreviewMetadata(false);
      } else {
        setPreviewMetadata(null);
      }
    };
    loadPreviewMetadata();
  }, [previewChannel, channel, metadata]);

  const handlePrevPreview = React.useCallback(() => {
    const list = categoryChannels.length > 0 ? categoryChannels : channels;
    if (list.length > 0) {
      const currentIdx = list.findIndex(ch => ch.id === previewChannel?.id);
      const nextIdx = (currentIdx - 1 + list.length) % list.length;
      setPreviewChannel(list[nextIdx]);
    }
  }, [categoryChannels, channels, previewChannel]);

  const handleNextPreview = React.useCallback(() => {
    const list = categoryChannels.length > 0 ? categoryChannels : channels;
    if (list.length > 0) {
      const currentIdx = list.findIndex(ch => ch.id === previewChannel?.id);
      const nextIdx = (currentIdx + 1) % list.length;
      setPreviewChannel(list[nextIdx]);
    }
  }, [categoryChannels, channels, previewChannel]);

  const handlePrevChannel = React.useCallback(() => {
    const list = categoryChannels.length > 0 ? categoryChannels : channels;
    if (list.length > 0) {
      const currentIdx = list.findIndex(ch => ch.id === channel?.id);
      const nextIdx = (currentIdx - 1 + list.length) % list.length;
      const nextChannel = list[nextIdx];
      if (nextChannel && onChannelSelect) onChannelSelect(nextChannel);
    }
  }, [categoryChannels, channels, channel, onChannelSelect]);

  const handleNextChannel = React.useCallback(() => {
    const list = categoryChannels.length > 0 ? categoryChannels : channels;
    if (list.length > 0) {
      const currentIdx = list.findIndex(ch => ch.id === channel?.id);
      const nextIdx = (currentIdx + 1) % list.length;
      const nextChannel = list[nextIdx];
      if (nextChannel && onChannelSelect) onChannelSelect(nextChannel);
    }
  }, [categoryChannels, channels, channel, onChannelSelect]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;

    if (isAutoSurfActive) {
      setAutoSurfCountdown(15);
      
      countdownTimer = setInterval(() => {
        setAutoSurfCountdown(prev => {
          if (prev <= 1) return 15;
          return prev - 1;
        });
      }, 1000);

      timer = setInterval(() => {
        handleNextChannel();
      }, 15000);
    }

    return () => {
      clearInterval(timer);
      clearInterval(countdownTimer);
    };
  }, [isAutoSurfActive, handleNextChannel]);

  const channelListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeMenu === 'channels' && channelListRef.current) {
      const activeIdx = focusIndex - 5; // 5 is the first channel
      if (activeIdx >= 0) {
        const activeElement = channelListRef.current.children[activeIdx] as HTMLElement;
        if (activeElement) {
          activeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    }
  }, [activeMenu, focusIndex]);

  // Update current time every second for clock and EPG
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [showPlayPauseIndicator, setShowPlayPauseIndicator] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);

  useEffect(() => {
    setIsPipSupported(document.pictureInPictureEnabled);
  }, []);

  const handleVolumeChange = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    updateVolume(percentage);
    updateMute(false);
    setShowControls(true);
  }, [updateVolume, updateMute]);

  const togglePip = React.useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PIP error:', error);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsInitialLoading(false);
    };
    const handleCanPlay = () => {
      setIsBuffering(false);
      setIsInitialLoading(false);
    };
    const handleTimeUpdate = () => {
      if (video) {
        setPlaybackTime(video.currentTime);
        setDuration(video.duration || 0);
      }
    };
    const handleLoadedMetadata = () => {
      if (video) setDuration(video.duration || 0);
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  useEffect(() => {
    setShowPlayPauseIndicator(true);
    const timer = setTimeout(() => setShowPlayPauseIndicator(false), 1000);
    return () => clearTimeout(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [isPlaying]);

  // Combined EPG computation to reduce redundant lookups
  const { currentProgram, nextProgram, programProgress } = useMemo(() => {
    if (!epgData || !channel) return { currentProgram: null, nextProgram: null, programProgress: 0 };
    
    // Try matching by ID first
    let epgId = channel.tvgId || channel.tvgName || channel.channel;
    let programs = epgId ? epgData.programs[epgId] : null;

    // Fallback: Try matching by channel name
    if (!programs) {
      const foundId = Object.entries(epgData.channels).find(
        ([_, name]) => (name as string).toLowerCase() === channel.name.toLowerCase()
      )?.[0];
      if (foundId) {
        programs = epgData.programs[foundId];
      }
    }

    if (!programs) return { currentProgram: null, nextProgram: null, programProgress: 0 };
    
    const current = programs.find(p => currentTime >= p.start && currentTime <= p.stop) || null;
    const next = programs.find(p => p.start > currentTime) || null;
    
    let progress = 0;
    if (current) {
      const total = current.stop.getTime() - current.start.getTime();
      if (total > 0) {
        const elapsed = currentTime.getTime() - current.start.getTime();
        progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
      }
    }

    return { currentProgram: current, nextProgram: next, programProgress: progress };
  }, [epgData, channel, currentTime]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const formatDuration = useCallback((ms: number) => {
    const totalMinutes = Math.floor(Math.max(0, ms) / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}sa ${minutes}dk`;
    }
    return `${minutes}dk`;
  }, []);

  const formatPlaybackTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (ambilightMode === 'none' || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;

    const updateAmbilight = () => {
      if (video.paused || video.ended) {
        animationId = requestAnimationFrame(updateAmbilight);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      animationId = requestAnimationFrame(updateAmbilight);
    };

    updateAmbilight();
    return () => cancelAnimationFrame(animationId);
  }, [ambilightMode]);

  useEffect(() => {
    shaka.polyfill.installAll();
  }, []);

  useEffect(() => {
    console.log('VideoPlayer initializing for URL:', currentUrl, 'Engine:', playerEngine);
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let dash: dashjs.MediaPlayerClass | null = null;
    let shakaPlayer: any = null;
    let mpegtsPlayer: mpegts.Player | null = null;

    const lowerUrl = currentUrl.toLowerCase();
    const isHlsUrl = lowerUrl.includes('.m3u8') || lowerUrl.includes('m3u8');
    const isDashUrl = lowerUrl.includes('.mpd') || lowerUrl.includes('mpd');
    const isTsUrl = lowerUrl.includes('.ts') || lowerUrl.includes('ts=') || lowerUrl.includes('/ts/') || lowerUrl.endsWith('.ts');
    const isFlvUrl = lowerUrl.includes('.flv') || lowerUrl.includes('flv=') || lowerUrl.endsWith('.flv');

    const initShaka = async () => {
      shakaPlayer = new shaka.Player(video);
      setShakaInstance(shakaPlayer);

      shakaPlayer.addEventListener('error', (event: any) => {
        console.error('Shaka Player Error:', event.detail);
        if (event.detail.severity === 2) { // Fatal error
          handleVideoError();
        }
      });

      // Shaka Configuration for better compatibility
      shakaPlayer.configure({
        streaming: {
          bufferingGoal: 30,
          rebufferingGoal: 15,
          bufferBehind: 30,
          lowLatencyMode: true,
          autoLowLatencyMode: true,
        },
        manifest: {
          dash: {
            ignoreMinBufferTime: true,
          },
          hls: {
            ignoreTextStreamFailures: true,
          }
        }
      });

      try {
        await shakaPlayer.load(currentUrl);
        console.log('Shaka Player loaded successfully');
        if (isPlaying) video.play().catch(() => {});
        
        // Shaka handles tracks differently
        const tracks = shakaPlayer.getVariantTracks() || [];
        setAudioTracks(tracks);
        setSubtitleTracks(shakaPlayer.getTextTracks() || []);
      } catch (e) {
        console.error('Shaka Player Load Error:', e);
        // Fallback to HLS.js if Shaka fails on HLS
        if (isHlsUrl && playerEngine === 'shaka') {
          console.log('Shaka failed on HLS, trying HLS.js fallback...');
          initHls();
        } else {
          handleVideoError();
        }
      }
    };

    const initHls = () => {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          manifestLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
          xhrSetup: (xhr, url) => {
            const proxyBase = customProxyUrl || '/api/proxy?url=';
            const isProxied = currentUrl.includes('/api/proxy') || (customProxyUrl && currentUrl.includes(customProxyUrl));
            const isAlreadyProxied = url.includes('/api/proxy') || (customProxyUrl && url.includes(customProxyUrl));

            if (isProxied && !isAlreadyProxied && url.startsWith('http')) {
              const proxiedUrl = `${proxyBase}${encodeURIComponent(url)}`;
              xhr.open('GET', proxiedUrl, true);
            }
          }
        });
        hls.loadSource(currentUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setAudioTracks(hls?.audioTracks || []);
          setSubtitleTracks(hls?.subtitleTracks || []);
          setCurrentAudioTrack(hls?.audioTrack || -1);
          setCurrentSubtitleTrack(hls?.subtitleTrack || -1);
          if (isPlaying) video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setDetailedError(data.details || 'HLS ağ hatası oluştu');
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('HLS Network error, trying to recover...');
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('HLS Media error, trying to recover...');
                hls?.recoverMediaError();
                break;
              default:
                handleVideoError();
                break;
            }
          }
        });

        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
          setCurrentAudioTrack(data.id);
        });

        hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
          setCurrentSubtitleTrack(data.id);
        });

        setHlsInstance(hls);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentUrl;
        video.load();
        if (isPlaying) video.play().catch(() => {});
      } else {
        handleVideoError();
      }
    };

    const initMpegTs = () => {
      if (mpegts.getFeatureList().mseLivePlayback) {
        mpegtsPlayer = mpegts.createPlayer({
          type: isFlvUrl ? 'flv' : 'mse',
          url: currentUrl,
          isLive: true,
        }, {
          enableStashBuffer: false,
          stashInitialSize: 128,
        });
        mpegtsPlayer.attachMediaElement(video);
        mpegtsPlayer.load();
        if (isPlaying) {
          const playPromise = mpegtsPlayer.play();
          if (playPromise && typeof (playPromise as any).catch === 'function') {
            (playPromise as any).catch(() => {});
          }
        }
        
        mpegtsPlayer.on(mpegts.Events.ERROR, (type, detail, info) => {
          console.error('MpegTS Error:', type, detail, info);
          handleVideoError();
        });

        setMpegtsInstance(mpegtsPlayer);
      } else {
        // Fallback to native
        video.src = currentUrl;
        video.load();
        if (isPlaying) video.play().catch(() => {});
      }
    };

    if (playerEngine === 'shaka') {
      initShaka();
    } else {
      if (isHlsUrl) {
        initHls();
      } else if (isDashUrl) {
        dash = dashjs.MediaPlayer().create();
        dash.initialize(video, currentUrl, isPlaying);
        
        dash.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
          const audioTracks = dash?.getTracksFor('audio') || [];
          const textTracks = dash?.getTracksFor('text') || [];
          setAudioTracks(audioTracks);
          setSubtitleTracks(textTracks);
        });

        dash.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
          console.error('Dash.js Error:', e);
          handleVideoError();
        });
      } else if (isTsUrl || isFlvUrl) {
        initMpegTs();
      } else {
        // Native playback for MP4, WebM, Ogg, etc.
        video.src = currentUrl;
        video.load();
        if (isPlaying) video.play().catch(() => {});
        
        setAudioTracks([]);
        setSubtitleTracks([]);
        setCurrentAudioTrack(-1);
        setCurrentSubtitleTrack(-1);
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (dash) {
        dash.destroy();
      }
      if (shakaPlayer) {
        shakaPlayer.destroy();
      }
      if (mpegtsPlayer) {
        mpegtsPlayer.destroy();
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [currentUrl, playerEngine]);

  const handleVideoError = async (e?: any) => {
    console.error('Video error occurred for URL:', currentUrl, e);
    const urls = channel?.urls || [url];
    
    // Attempt to extract more info if available
    const techError = e?.target?.error;
    if (techError) {
      const code = techError.code;
      if (code === 1) setDetailedError("İşlem kullanıcı tarafından durduruldu.");
      else if (code === 2) setDetailedError("Ağ hatası: Bağlantı kesildi.");
      else if (code === 3) setDetailedError("Kod çözme hatası: Video formatı desteklenmiyor.");
      else if (code === 4) setDetailedError("Kaynak desteklenmiyor veya sunucuya erişilemiyor.");
    }
    
    // 1. Try next URL if available
    if (currentUrlIndex < urls.length - 1) {
      setCurrentUrlIndex(prev => prev + 1);
      setHasError(false);
    } 
    // 2. If all URLs failed without proxy, try with proxy starting from first URL
    else if (!useProxy && !Capacitor.isNativePlatform()) {
      setUseProxy(true);
      setCurrentUrlIndex(0);
      setHasError(false);
    }
    // 3. If everything failed, trigger AI Repair
    else {
      setHasError(true);
      setIsPlaying(false);
      setIsBuffering(false);
      
      if (channel && channels.length > 0) {
        setIsRepairing(true);
        const alternatives = findRepairAlternatives(channel, channels);
        setRepairSuggestions(alternatives);
        
        if (geminiApiKey && alternatives.length > 0) {
          try {
            const explanation = await suggestRepairExplanation(
              channel.name, 
              alternatives.map(a => a.name), 
              geminiApiKey
            );
            setRepairExplanation(explanation);
          } catch (e) {
            console.error('Repair explanation failed:', e);
          }
        }
        setIsRepairing(false);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMini) return; // Disable global shortcuts in mini mode to allow main app navigation
      
      let key = e.key;
      setLastActivity(Date.now());

      // Normalize TV remote keys
      if (key === 'Select' || key === 'OK') key = 'Enter';
      if (key === 'Back' || key === 'GoBack' || key === 'XF86Back' || key === 'MediaStop') key = 'Backspace';
      
      // Handle Channel keys directly
      if (key === 'ChannelUp') {
        e.preventDefault();
        const list = categoryChannels.length > 0 ? categoryChannels : channels;
        if (list.length > 0) {
          const currentIdx = list.findIndex(ch => ch.id === channel?.id);
          const nextIdx = (currentIdx + 1) % list.length;
          const nextChannel = list[nextIdx];
          if (nextChannel && onChannelSelect) onChannelSelect(nextChannel);
        }
        return;
      }
      if (key === 'ChannelDown') {
        e.preventDefault();
        const list = categoryChannels.length > 0 ? categoryChannels : channels;
        if (list.length > 0) {
          const currentIdx = list.findIndex(ch => ch.id === channel?.id);
          const nextIdx = (currentIdx - 1 + list.length) % list.length;
          const nextChannel = list[nextIdx];
          if (nextChannel && onChannelSelect) onChannelSelect(nextChannel);
        }
        return;
      }

      if (key === 'Up') key = 'ArrowUp';
      if (key === 'Down') key = 'ArrowDown';
      if (key === 'Left' || key === 'MediaRewind') key = 'ArrowLeft';
      if (key === 'Right' || key === 'MediaFastForward') key = 'ArrowRight';
      if (key === 'Tab') {
        e.preventDefault();
        key = e.shiftKey ? 'ArrowLeft' : 'ArrowRight';
      }
      if (key === 'VolumeUp' || key === '+' || key === '=') {
        e.preventDefault();
        setVolume(prev => Math.min(1, prev + 0.1));
        setIsMuted(false);
        setShowControls(true);
        return;
      }
      if (key === 'VolumeDown' || key === '-' || key === '_') {
        e.preventDefault();
        setVolume(prev => Math.max(0, prev - 0.1));
        setShowControls(true);
        return;
      }
      if (key === 'VolumeMute' || key === 'm' || key === 'M') {
        e.preventDefault();
        setIsMuted(prev => !prev);
        setShowControls(true);
        return;
      }
      if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause') key = ' ';

      // Global keys
      if (key === ' ') {
        e.preventDefault();
        togglePlayPause();
        return;
      }

      if (key.toLowerCase() === 'o') {
        e.preventDefault();
        togglePlayPause();
        return;
      }

      if (key === 'p' || key === 'P') {
        e.preventDefault();
        onToggleMini?.();
        return;
      }

      if (key === 'f' || key === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
          });
        } else {
          document.exitFullscreen();
        }
        return;
      }

      if (key === 'Escape' || key === 'Backspace') {
        e.preventDefault();
        if (activeMenu !== 'none') {
          const prevMenu = activeMenu;
          setActiveMenu('none');
          // Return focus to the button that opened the menu
          if (prevMenu === 'audio') setFocusIndex(3);
          else if (prevMenu === 'subtitle') setFocusIndex(4);
          else if (prevMenu === 'channels') setFocusIndex(5);
          else if (prevMenu === 'sources') setFocusIndex(6);
          else if (prevMenu === 'details') setFocusIndex(7);
          else if (prevMenu === 'volume') setFocusIndex(2);
        } else if (showControls) {
          setShowControls(false);
        } else {
          onClose?.();
        }
        return;
      }

      // Layer 2: Clean Screen (Controls are hidden)
      if (!showControls) {
        if (key === 'ArrowUp') {
          e.preventDefault();
          const list = categoryChannels.length > 0 ? categoryChannels : channels;
          if (list.length > 0) {
            const currentIdx = list.findIndex(ch => ch.id === channel?.id);
            const nextIdx = (currentIdx - 1 + list.length) % list.length;
            const nextChannel = list[nextIdx];
            if (nextChannel && onChannelSelect) onChannelSelect(nextChannel);
          }
          return;
        }
        if (key === 'ArrowDown') {
          e.preventDefault();
          const list = categoryChannels.length > 0 ? categoryChannels : channels;
          if (list.length > 0) {
            const currentIdx = list.findIndex(ch => ch.id === channel?.id);
            const nextIdx = (currentIdx + 1) % list.length;
            const nextChannel = list[nextIdx];
            if (nextChannel && onChannelSelect) onChannelSelect(nextChannel);
          }
          return;
        }
        if (key === 'ArrowLeft') {
          e.preventDefault();
          setShowControls(true);
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - seekStep);
            setSeekInfo(prev => {
              const newAmount = (prev?.type === 'backward' ? prev.amount : 0) + seekStep;
              return { type: 'backward', amount: newAmount };
            });
            if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
            seekTimerRef.current = setTimeout(() => setSeekInfo(null), 1000);
          }
          return;
        }
        if (key === 'ArrowRight') {
          e.preventDefault();
          setShowControls(true);
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seekStep);
            setSeekInfo(prev => {
              const newAmount = (prev?.type === 'forward' ? prev.amount : 0) + seekStep;
              return { type: 'forward', amount: newAmount };
            });
            if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
            seekTimerRef.current = setTimeout(() => setSeekInfo(null), 1000);
          }
          return;
        }
        
        // Any other key shows controls
        setShowControls(true);
        return;
      }

      // Layer 1: Info Layer (Controls are visible)
      if (activeMenu === 'none') {
        if (key === 'ArrowLeft') {
          e.preventDefault();
          if (focusIndex === 1) setFocusIndex(12);
          else if (focusIndex === 12) setFocusIndex(11);
          else if (focusIndex === 11) setFocusIndex(0);
          else setFocusIndex(prev => Math.max(0, prev - 1));
        } else if (key === 'ArrowRight') {
          e.preventDefault();
          const maxIdx = showExtraControls ? 10 : 12;
          if (focusIndex === 0) setFocusIndex(11);
          else if (focusIndex === 11) setFocusIndex(12);
          else if (focusIndex === 12) setFocusIndex(1);
          else if (focusIndex < maxIdx) setFocusIndex(prev => prev + 1);
        } else if (key === 'ArrowUp') {
          e.preventDefault();
          // Stay in Layer 1, do nothing
        } else if (key === 'ArrowDown') {
          e.preventDefault();
          setShowControls(false);
        } else if (key === 'Enter') {
          e.preventDefault();
          if (focusIndex === 0) onClose?.();
          else if (focusIndex === 11) onToggleLiveTranslation?.();
          else if (focusIndex === 12) onToggleSummary?.();
          else if (focusIndex === 1) setShowExtraControls(!showExtraControls);
          else if (focusIndex === 2) {
            setActiveMenu('volume');
            setFocusIndex(60);
          }
          else if (focusIndex === 3) setActiveMenu('audio');
          else if (focusIndex === 4) setActiveMenu('subtitle');
          else if (focusIndex === 5) {
            setActiveMenu('channels');
            const currentIdx = categoryChannels.findIndex(ch => ch.id === channel?.id);
            setFocusIndex(11 + (currentIdx >= 0 ? currentIdx : 0));
          }
          else if (focusIndex === 6) setActiveMenu('sources');
          else if (focusIndex === 7) {
            setActiveMenu('details');
            setPreviewChannel(channel);
            setFocusIndex(51);
          }
          else if (focusIndex === 8) togglePip();
          else if (focusIndex === 9) setIsAutoSurfActive(!isAutoSurfActive);
        }
        return;
      }

      // Menu navigation (Active Menu is open)
      switch (key) {
        case 'ArrowUp':
          e.preventDefault();
          if (activeMenu === 'channels') {
            if (focusIndex > 11) setFocusIndex(prev => prev - 1);
            else if (focusIndex === 11) setFocusIndex(10);
          } else if (activeMenu === 'audio') {
            setFocusIndex(prev => Math.max(20, prev - 1));
          } else if (activeMenu === 'subtitle') {
            setFocusIndex(prev => Math.max(30, prev - 1));
          } else if (activeMenu === 'sources') {
            setFocusIndex(prev => Math.max(40, prev - 1));
          } else if (activeMenu === 'details') {
            if (focusIndex === 50) setFocusIndex(53);
            else if (focusIndex === 53) setFocusIndex(51);
          } else if (activeMenu === 'volume') {
            updateVolume(Math.min(1, volume + 0.1));
            updateMute(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (activeMenu === 'channels') {
            if (focusIndex === 10) setFocusIndex(11);
            else setFocusIndex(prev => Math.min(11 + categoryChannels.length - 1, prev + 1));
          } else if (activeMenu === 'audio') {
            setFocusIndex(prev => Math.min(20 + audioTracks.length - 1, prev + 1));
          } else if (activeMenu === 'subtitle') {
            setFocusIndex(prev => Math.min(30 + subtitleTracks.length, prev + 1));
          } else if (activeMenu === 'sources') {
            const urls = channel?.urls || [url];
            setFocusIndex(prev => Math.min(40 + urls.length - 1, prev + 1));
          } else if (activeMenu === 'details') {
            if (focusIndex === 51 || focusIndex === 52 || focusIndex === 53) setFocusIndex(50);
          } else if (activeMenu === 'volume') {
            updateVolume(Math.max(0, volume - 0.1));
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (activeMenu === 'channels' && focusIndex === 10) {
            const groups = ['Tümü', ...allGroups];
            const currentIdx = groups.indexOf(selectedGroup || 'Tümü');
            const nextIdx = (currentIdx - 1 + groups.length) % groups.length;
            setSelectedGroup(groups[nextIdx] === 'Tümü' ? '' : groups[nextIdx]);
          } else if (activeMenu === 'details') {
            if (focusIndex === 52) setFocusIndex(53);
            else if (focusIndex === 53) setFocusIndex(51);
            else if (focusIndex === 50) setSeekStep(prev => Math.max(5, prev - 5));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (activeMenu === 'channels' && focusIndex === 10) {
            const groups = ['Tümü', ...allGroups];
            const currentIdx = groups.indexOf(selectedGroup || 'Tümü');
            const nextIdx = (currentIdx + 1) % groups.length;
            setSelectedGroup(groups[nextIdx] === 'Tümü' ? '' : groups[nextIdx]);
          } else if (activeMenu === 'details') {
            if (focusIndex === 51) setFocusIndex(53);
            else if (focusIndex === 53) setFocusIndex(52);
            else if (focusIndex === 50) setSeekStep(prev => Math.min(60, prev + 5));
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (activeMenu === 'channels') {
            if (focusIndex >= 11) {
              const channelIndex = focusIndex - 11;
              if (categoryChannels[channelIndex] && onChannelSelect) {
                onChannelSelect(categoryChannels[channelIndex]);
                setActiveMenu('none');
                setFocusIndex(5); // Return focus to "Kanallar" button
              }
            }
          } else if (activeMenu === 'audio') {
            const track = audioTracks[focusIndex - 20];
            if (track && hlsInstance) {
              hlsInstance.audioTrack = track.id;
              setCurrentAudioTrack(track.id);
            }
            setActiveMenu('none');
            setFocusIndex(3);
          } else if (activeMenu === 'subtitle') {
            if (focusIndex === 30) {
              if (hlsInstance) hlsInstance.subtitleTrack = -1;
              setCurrentSubtitleTrack(-1);
            } else {
              const track = subtitleTracks[focusIndex - 31];
              if (track && hlsInstance) {
                hlsInstance.subtitleTrack = track.id;
                setCurrentSubtitleTrack(track.id);
              }
            }
            setActiveMenu('none');
            setFocusIndex(4);
          } else if (activeMenu === 'sources') {
            const idx = focusIndex - 40;
            const urls = channel?.urls || [url];
            if (urls[idx]) {
              setCurrentUrlIndex(idx);
              setHasError(false);
            }
            setActiveMenu('none');
            setFocusIndex(6);
          } else if (activeMenu === 'details') {
            if (focusIndex === 51) handlePrevPreview();
            else if (focusIndex === 52) handleNextPreview();
            else if (focusIndex === 53 && previewChannel) {
              onChannelSelect?.(previewChannel);
            }
          } else if (activeMenu === 'volume') {
            setIsMuted(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls, activeMenu, focusIndex, audioTracks, subtitleTracks, hlsInstance, currentAudioTrack, currentSubtitleTrack, categoryChannels, onChannelSelect, channel, onClose, allGroups, selectedGroup, togglePip, onToggleMini, isPlaying, isBuffering, channels, url, currentUrlIndex, isMuted, volume, seekStep]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && activeMenu === 'none' && isPlaying) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls, activeMenu, isPlaying, channel, lastActivity]);

  return (
    <div 
      className={cn(
        "bg-black flex flex-col group overflow-hidden",
        isMini ? "w-full h-full" : "fixed inset-0 z-50"
      )}
      onMouseMove={() => {
        if (!showControls) setShowControls(true);
        setLastActivity(Date.now());
      }} 
      onPointerDown={() => {
        if (!showControls) setShowControls(true);
        setLastActivity(Date.now());
      }}
    >
      <div 
        className="flex-1 flex items-center justify-center bg-black relative cursor-pointer"
        onClick={() => {
          setIsPlaying(!isPlaying);
          setShowControls(true);
        }}
      >
        {/* Ambilight Effect */}
        {ambilightMode !== 'none' && !isMini && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            <canvas 
              ref={canvasRef}
              width={20}
              height={20}
              className={cn(
                "w-full h-full opacity-50 transition-all duration-1000",
                ambilightMode === 'soft' && "blur-[120px] scale-150",
                ambilightMode === 'vibrant' && "blur-[80px] scale-125 opacity-70",
                ambilightMode === 'cinema' && "blur-[150px] scale-110 opacity-40"
              )}
            />
          </div>
        )}

        <video
          ref={videoRef}
          className={cn(
            "w-full h-full max-h-screen relative z-10",
            ambilightMode === 'none' ? "object-fill" : "object-contain",
            ambilightMode !== 'none' && !isMini && "shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          )}
          autoPlay
          playsInline
          muted={isMuted}
          onError={handleVideoError}
          onVolumeChange={(e) => {
            const video = e.currentTarget;
            setVolume(video.volume);
            setIsMuted(video.muted);
          }}
        />

        {/* Loading Indicator */}
        <AnimatePresence>
          {isInitialLoading && !hasError && !seekInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none"
            >
              {loadingStyle === 'classic' && (
                <div className="bg-black/60 backdrop-blur-xl p-10 rounded-[40px] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center">
                  <div className="relative flex items-center justify-center scale-75">
                    <motion.div
                      animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.2, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute w-24 h-24 rounded-full border-2 border-white/20"
                      style={{ borderColor: `${themeColor}40` }}
                    />
                    <div className="relative z-10 bg-black/40 p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
                      <div className="relative">
                        <Tv className="w-12 h-12 text-white opacity-20" />
                        <motion.div
                          animate={{ height: ["0%", "100%", "0%"], top: ["0%", "0%", "100%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute left-0 right-0 w-full bg-white/40 blur-[2px]"
                          style={{ backgroundColor: themeColor }}
                        />
                        <Tv className="absolute inset-0 w-12 h-12 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] italic opacity-80">Yayın Hazırlanıyor</p>
                    <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full bg-white"
                        style={{ backgroundColor: themeColor }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {loadingStyle === 'minimal' && (
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full"
                    style={{ borderTopColor: themeColor }}
                  />
                  <span className="text-white font-bold tracking-widest text-xs uppercase opacity-50">Yükleniyor</span>
                </div>
              )}

              {loadingStyle === 'pulse' && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  <div className="absolute inset-0 blur-2xl opacity-50" style={{ backgroundColor: themeColor }} />
                  <Tv className="w-20 h-20 text-white relative z-10" />
                </motion.div>
              )}

              {loadingStyle === 'bars' && (
                <div className="flex items-end gap-1 h-12">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [10, 48, 10] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                      className="w-2 bg-white rounded-full"
                      style={{ backgroundColor: themeColor }}
                    />
                  ))}
                </div>
              )}

              {loadingStyle === 'orbit' && (
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <Tv className="w-10 h-10 text-white opacity-50" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0"
                  >
                    <div className="w-3 h-3 rounded-full bg-white absolute top-0 left-1/2 -translate-x-1/2" style={{ backgroundColor: themeColor }} />
                  </motion.div>
                </div>
              )}

              {loadingStyle === 'glitch' && (
                <div className="relative">
                  <motion.h2
                    animate={{ 
                      x: [-2, 2, -2, 2, 0],
                      opacity: [1, 0.8, 1, 0.9, 1]
                    }}
                    transition={{ duration: 0.2, repeat: Infinity }}
                    className="text-4xl font-black text-white tracking-tighter italic uppercase"
                  >
                    YÜKLENİYOR
                  </motion.h2>
                  <div className="absolute inset-0 bg-red-500 mix-blend-screen opacity-50 animate-pulse" style={{ backgroundColor: themeColor }} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auto-Surf Indicator */}
        <AnimatePresence>
          {isAutoSurfActive && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-yellow-500/90 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-2xl"
            >
              <Zap className="w-5 h-5 text-white animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest leading-none mb-1">OTOMATİK TARAMA</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-sm tracking-tighter">SIRADAKİ KANAL:</span>
                  <span className="text-white font-black text-xl tabular-nums">{autoSurfCountdown}s</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Indicator */}
        <AnimatePresence>
          {hasError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-50 p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/50">
                <X className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-white font-black text-2xl mb-2 tracking-tighter uppercase italic">YAYIN HATASI</h3>
              <p className="text-zinc-400 text-sm max-w-md font-medium leading-relaxed mb-4">
                Bu kanal şu anda oynatılamıyor. Lütfen başka bir kaynak deneyin veya daha sonra tekrar kontrol edin.
              </p>
              {detailedError && (
                <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl mb-6">
                  <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-1">Hata Detayı</p>
                  <p className="text-zinc-300 text-[11px] italic leading-tight">{detailedError}</p>
                </div>
              )}

              {/* AI Repair Section */}
              <AnimatePresence>
                {(isRepairing || repairSuggestions.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 w-full max-w-lg bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-500/20 rounded-xl">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider">Kanal Tamirci</h4>
                        <p className="text-blue-400/80 text-[10px] font-bold uppercase">Yapay Zeka Destekli Çözüm</p>
                      </div>
                    </div>

                    {isRepairing ? (
                      <div className="flex items-center gap-3 py-4">
                        <CircleDashed className="w-5 h-5 text-blue-400 animate-spin" />
                        <span className="text-zinc-400 text-xs font-medium italic">Alternatif kanallar aranıyor...</span>
                      </div>
                    ) : (
                      <>
                        {repairExplanation && (
                          <p className="text-white text-xs font-medium mb-4 text-left leading-relaxed italic">
                            "{repairExplanation}"
                          </p>
                        )}
                        <div className="grid grid-cols-1 gap-2">
                          {repairSuggestions.map((alt) => (
                            <button
                              key={alt.id}
                              onClick={() => {
                                if (onChannelSelect) onChannelSelect(alt);
                                setHasError(false);
                              }}
                              className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                                  {alt.logo ? (
                                    <img src={alt.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Tv className="w-4 h-4 text-zinc-500" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <div className="text-white text-[11px] font-bold truncate max-w-[200px]">{alt.name}</div>
                                  <div className="text-zinc-500 text-[9px] font-medium uppercase tracking-tighter">{alt.group}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-blue-400 text-[9px] font-black uppercase">İzle</span>
                                <Play className="w-3 h-3 text-blue-400 fill-current" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4 mt-8">
                <button 
                  onClick={() => {
                    setHasError(false);
                    setIsPlaying(true);
                    setIsBuffering(true);
                    setCurrentUrlIndex(0);
                  }}
                  className="px-8 py-3 bg-white text-black font-black rounded-full hover:scale-105 transition-transform uppercase tracking-widest text-xs shadow-xl"
                >
                  Yeniden Dene
                </button>
                <button 
                  onClick={onClose}
                  className="px-8 py-3 bg-white/10 text-white font-black rounded-full hover:bg-white/20 transition-all uppercase tracking-widest text-xs border border-white/10"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/Pause Indicator */}
        <AnimatePresence>
          {showPlayPauseIndicator && !seekInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
            >
              <div className="bg-black/40 p-8 rounded-full backdrop-blur-md border border-white/10 shadow-2xl">
                {metadata?.logoUrl ? (
                  <img 
                    src={metadata.logoUrl} 
                    alt={channel?.name} 
                    className="w-32 md:w-48 h-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : isPlaying ? (
                  <Play className="w-16 h-16 text-white fill-current" />
                ) : (
                  <Pause className="w-16 h-16 text-white fill-current" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Seek Indicator */}
        <AnimatePresence>
          {seekInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: seekInfo.type === 'forward' ? 100 : -100 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: seekInfo.type === 'forward' ? 150 : -150 }}
              className={cn(
                "absolute inset-0 flex items-center pointer-events-none z-50 px-20",
                seekInfo.type === 'forward' ? "justify-end" : "justify-start"
              )}
            >
              <div className="bg-black/60 px-10 py-8 rounded-3xl backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col items-center gap-4">
                <div className="bg-white/10 p-4 rounded-2xl">
                  {seekInfo.type === 'forward' ? (
                    <FastForward className="w-16 h-16 text-white fill-current" />
                  ) : (
                    <Rewind className="w-16 h-16 text-white fill-current" />
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black text-white tracking-tighter" style={{ color: themeColor }}>
                    {seekInfo.type === 'forward' ? '+' : '-'}{seekInfo.amount}s
                  </span>
                  <span className="text-xs font-bold text-white/50 uppercase tracking-widest">
                    {seekInfo.type === 'forward' ? 'İLERİ SARILIYOR' : 'GERİ SARILIYOR'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Volume Indicator Overlay - REMOVED as per user request */}

        {/* Custom Controls Overlay */}
        <AnimatePresence>
          {showControls && !isMini && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-8 z-50"
            >
              {/* Top Bar */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={onClose}
                    onPointerDown={() => setFocusIndex(0)}
                    className={cn(
                      "p-3 rounded-full transition-all",
                      focusIndex === 0 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                    )}
                  >
                    <X className="w-8 h-8" />
                  </button>

                  <button 
                    onClick={onToggleLiveTranslation}
                    onPointerDown={() => setFocusIndex(11)}
                    className={cn(
                      "p-3 rounded-full transition-all flex items-center gap-3",
                      focusIndex === 11 ? "bg-white text-black scale-110 ring-4 ring-white/30" : (isLiveTranslationEnabled ? "bg-blue-500 text-white" : "bg-black/40 text-white hover:bg-black/60")
                    )}
                    title={isLiveTranslationEnabled ? "Canlı Çeviriyi Kapat" : "Canlı Çeviriyi Aç"}
                  >
                    <Languages className={cn("w-8 h-8", isLiveTranslationEnabled && "animate-pulse")} />
                    <span className="text-sm font-black uppercase tracking-tighter">AI Çeviri</span>
                  </button>

                  <button 
                    onClick={onToggleSummary}
                    onPointerDown={() => setFocusIndex(12)}
                    className={cn(
                      "p-3 rounded-full transition-all flex items-center gap-3",
                      focusIndex === 12 ? "bg-white text-black scale-110 ring-4 ring-white/30" : (showSummary ? "bg-emerald-500 text-white" : "bg-black/40 text-white hover:bg-black/60")
                    )}
                    title="Program Özeti (Özet Geç)"
                  >
                    <FileText className={cn("w-8 h-8", isSummaryLoading && "animate-pulse")} />
                    <span className="text-sm font-black uppercase tracking-tighter">Özet Geç</span>
                  </button>
                  <button 
                    onClick={() => setShowExtraControls(!showExtraControls)}
                    onPointerDown={() => setFocusIndex(1)}
                    className={cn(
                      "p-3 rounded-full transition-all",
                      focusIndex === 1 ? "bg-white text-black scale-110 ring-4 ring-white/30" : (showExtraControls ? "bg-red-500 text-white" : "bg-black/40 text-white hover:bg-black/60")
                    )}
                    title={showExtraControls ? "Ayarları Gizle" : "Ayarları Göster"}
                  >
                    <Settings className={cn("w-8 h-8 transition-transform duration-500", showExtraControls && "rotate-90")} />
                  </button>
                </div>

                <div className="flex flex-col items-end gap-4">
                  <div className="flex items-center gap-4">
                    <AnimatePresence>
                      {showExtraControls && (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-4"
                        >
                          <button 
                            onClick={() => setActiveMenu('volume')}
                            onPointerDown={() => setFocusIndex(2)}
                            className={cn(
                              "p-3 rounded-full transition-all flex items-center gap-2",
                              focusIndex === 2 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                            )}
                          >
                            <Volume2 className="w-8 h-8" />
                            <span className="text-sm font-bold uppercase tracking-tighter">Ses</span>
                          </button>
                          <button 
                            onClick={() => setActiveMenu('audio')}
                            onPointerDown={() => setFocusIndex(3)}
                            className={cn(
                              "p-3 rounded-full transition-all flex items-center gap-2",
                              focusIndex === 3 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                            )}
                          >
                            <Volume2 className="w-8 h-8" />
                            <span className="text-sm font-bold uppercase tracking-tighter">Dil</span>
                          </button>
                          <button 
                            onClick={() => setActiveMenu('subtitle')}
                            onPointerDown={() => setFocusIndex(4)}
                            className={cn(
                              "p-3 rounded-full transition-all flex items-center gap-2",
                              focusIndex === 4 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                            )}
                          >
                            <Languages className="w-8 h-8" />
                            <span className="text-sm font-bold uppercase tracking-tighter">Altyazı</span>
                          </button>
                          <button 
                            onClick={() => setActiveMenu('channels')}
                            onPointerDown={() => setFocusIndex(5)}
                            className={cn(
                              "p-3 rounded-full transition-all flex items-center gap-2",
                              focusIndex === 5 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                            )}
                          >
                            <List className="w-8 h-8" />
                            <span className="text-sm font-bold uppercase tracking-tighter">Kanallar</span>
                          </button>
                          <button 
                            onClick={() => setActiveMenu('sources')}
                            onPointerDown={() => setFocusIndex(6)}
                            className={cn(
                              "p-3 rounded-full transition-all flex items-center gap-2",
                              focusIndex === 6 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                            )}
                          >
                            <Link2 className="w-8 h-8" />
                            <span className="text-sm font-bold uppercase tracking-tighter">Kaynaklar</span>
                          </button>
                          <button 
                            onClick={() => setActiveMenu('details')}
                            onPointerDown={() => setFocusIndex(7)}
                            className={cn(
                              "p-3 rounded-full transition-all flex items-center gap-2",
                              focusIndex === 7 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                            )}
                          >
                            <Settings2 className="w-8 h-8" />
                            <span className="text-sm font-bold uppercase tracking-tighter">Detaylar</span>
                          </button>
                          {isPipSupported && (
                            <button 
                              onClick={togglePip}
                              onPointerDown={() => setFocusIndex(8)}
                              className={cn(
                                "p-3 rounded-full transition-all flex items-center gap-2",
                                focusIndex === 8 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                              )}
                            >
                              <Monitor className="w-8 h-8" />
                              <span className="text-sm font-bold uppercase tracking-tighter">PIP</span>
                            </button>
                          )}
                          <button 
                            onClick={() => setIsAutoSurfActive(!isAutoSurfActive)}
                            onPointerDown={() => setFocusIndex(9)}
                            className={cn(
                              "p-3 rounded-full transition-all flex items-center gap-2",
                              focusIndex === 9 ? "bg-white text-black scale-110 ring-4 ring-white/30" : (isAutoSurfActive ? "bg-yellow-500 text-white" : "bg-black/40 text-white hover:bg-black/60")
                            )}
                            title={isAutoSurfActive ? "Tarama Modunu Kapat" : "Tarama Modunu Aç"}
                          >
                            <Zap className={cn("w-8 h-8", isAutoSurfActive && "animate-pulse")} />
                            <span className="text-sm font-bold uppercase tracking-tighter">Tarama</span>
                          </button>
                          <button 
                            onClick={onToggleLiveTranslation}
                            onPointerDown={() => setFocusIndex(10)}
                            className={cn(
                              "p-3 rounded-full transition-all flex items-center gap-2",
                              focusIndex === 10 ? "bg-white text-black scale-110 ring-4 ring-white/30" : (isLiveTranslationEnabled ? "bg-blue-500 text-white" : "bg-black/40 text-white hover:bg-black/60")
                            )}
                            title={isLiveTranslationEnabled ? "Canlı Çeviriyi Kapat" : "Canlı Çeviriyi Aç"}
                          >
                            <Languages className={cn("w-8 h-8", isLiveTranslationEnabled && "animate-pulse")} />
                            <span className="text-sm font-bold uppercase tracking-tighter">AI Çeviri</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Horizontal Volume Bar below tabs */}
                  <AnimatePresence>
                    {activeMenu === 'volume' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-4 bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl"
                      >
                        <button
                          onClick={() => updateMute(!isMuted)}
                          className={cn(
                            "p-2 rounded-full transition-all",
                            isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                          )}
                        >
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center w-64">
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">SES SEVİYESİ</span>
                            <span className="text-[10px] font-black text-white tabular-nums">{isMuted ? '0' : Math.round(volume * 100)}%</span>
                          </div>
                          <div 
                            className="w-64 h-3 bg-white/10 rounded-full relative overflow-hidden cursor-pointer group/vol-bar"
                            onClick={handleVolumeChange}
                            onMouseDown={(e) => {
                              const move = (moveEvent: MouseEvent) => handleVolumeChange(moveEvent as any);
                              const up = () => {
                                window.removeEventListener('mousemove', move);
                                window.removeEventListener('mouseup', up);
                              };
                              window.addEventListener('mousemove', move);
                              window.addEventListener('mouseup', up);
                            }}
                            onTouchMove={(e) => handleVolumeChange(e)}
                          >
                            <motion.div 
                              className="absolute top-0 bottom-0 left-0 rounded-r-full"
                              style={{ backgroundColor: themeColor }}
                              initial={false}
                              animate={{ width: `${isMuted ? 0 : volume * 100}%` }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Menus */}
              <div className="flex justify-center md:justify-end items-center gap-8">
                {activeMenu === 'details' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl w-80 shadow-2xl flex flex-col max-h-[80vh]"
                  >
                    <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Settings2 className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <h3 className="text-white font-black text-base tracking-tighter">Kanal Detayları</h3>
                          <p className="text-zinc-500 text-[7px] font-bold uppercase tracking-widest">M3U Bilgileri</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handlePrevPreview}
                          onPointerDown={() => setFocusIndex(51)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            focusIndex === 51 ? "bg-white text-black scale-110 ring-2 ring-white/30" : "bg-white/5 text-white hover:bg-white/10"
                          )}
                          title="Önceki Kanal"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => previewChannel && onChannelSelect?.(previewChannel)}
                          onPointerDown={() => setFocusIndex(53)}
                          className={cn(
                            "flex-1 p-2 rounded-lg transition-all text-[10px] font-bold uppercase flex items-center justify-center gap-1",
                            focusIndex === 53 ? "bg-red-500 text-white scale-105" : "bg-white/5 text-white hover:bg-white/10",
                            previewChannel?.id === channel?.id && "opacity-50 cursor-default"
                          )}
                        >
                          <Play className="w-3 h-3" />
                          {previewChannel?.id === channel?.id ? 'Oynatılıyor' : 'Oynat'}
                        </button>
                        <button
                          onClick={handleNextPreview}
                          onPointerDown={() => setFocusIndex(52)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            focusIndex === 52 ? "bg-white text-black scale-110 ring-2 ring-white/30" : "bg-white/5 text-white hover:bg-white/10"
                          )}
                          title="Sonraki Kanal"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-1 scrollbar-hide">
                      {loadingPreviewMetadata && (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      
                      <div 
                        className={cn(
                          "p-3 rounded-xl transition-all border flex items-center justify-between shrink-0",
                          focusIndex === 50 ? "bg-white text-black scale-105 border-white" : "bg-white/5 text-white border-white/5"
                        )}
                      >
                        <div className="flex flex-col">
                          <p className="text-[7px] font-black uppercase tracking-widest mb-0.5 opacity-50">OYNATMA AYARI</p>
                          <p className="font-bold text-xs">Hızlı Sarma Süresi</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronLeft className={cn("w-3 h-3", focusIndex === 50 ? "text-black" : "text-zinc-500")} />
                          <span className="text-lg font-black tabular-nums">{seekStep}s</span>
                          <ChevronRight className={cn("w-3 h-3", focusIndex === 50 ? "text-black" : "text-zinc-500")} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {previewChannel?.genre && (
                          <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <p className="text-[7px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">TÜR</p>
                            <p className="text-white font-bold text-xs truncate">{previewChannel.genre}</p>
                          </div>
                        )}
                        {previewChannel?.year && (
                          <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <p className="text-[7px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">YIL</p>
                            <p className="text-white font-bold text-xs truncate">{previewChannel.year}</p>
                          </div>
                        )}
                        {previewChannel?.language && (
                          <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <p className="text-[7px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">DİL</p>
                            <p className="text-white font-bold text-xs truncate">{previewChannel.language}</p>
                          </div>
                        )}
                        {previewMetadata?.imdbScore && (
                          <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <p className="text-[7px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">IMDb</p>
                            <div className="flex items-center gap-1 text-yellow-500 font-black text-xs">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{previewMetadata.imdbScore}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {previewChannel?.actor && (
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <p className="text-[7px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">OYUNCULAR</p>
                          <p className="text-white font-bold text-xs">{previewChannel.actor}</p>
                        </div>
                      )}

                      {previewMetadata && (
                        <>
                          {previewMetadata.director && (
                            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                              <p className="text-[7px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">YÖNETMEN</p>
                              <p className="text-white font-bold text-xs">{previewMetadata.director}</p>
                            </div>
                          )}
                          {previewMetadata.cast && previewMetadata.cast.length > 0 && (
                            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                              <p className="text-[7px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">KADRO</p>
                              <p className="text-white font-bold text-xs">{previewMetadata.cast.slice(0, 3).join(', ')}</p>
                            </div>
                          )}
                          {previewMetadata.summary && (
                            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                              <p className="text-[7px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">ÖZET</p>
                              <p className="text-white font-medium text-[10px] leading-relaxed opacity-70 line-clamp-4">{previewMetadata.summary}</p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {!previewMetadata && previewChannel?.description && (
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <p className="text-[7px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">AÇIKLAMA</p>
                          <p className="text-white font-medium text-[10px] leading-relaxed opacity-70 line-clamp-4">{previewChannel.description}</p>
                        </div>
                      )}

                      {!previewMetadata && !previewChannel?.genre && !previewChannel?.actor && !previewChannel?.year && !previewChannel?.language && !previewChannel?.description && (
                        <div className="text-center py-4">
                          <p className="text-zinc-500 italic text-xs">Ek bilgi bulunamadı.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeMenu === 'sources' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-zinc-900/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl w-80 shadow-2xl max-h-[70vh] flex flex-col"
                  >
                    <div className="mb-4 px-2 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Yayın Kaynağı Seçin</span>
                      <button 
                        onClick={() => setUseProxy(!useProxy)}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase transition-all",
                          useProxy ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-400"
                        )}
                      >
                        Proxy: {useProxy ? 'AÇIK' : 'KAPALI'}
                      </button>
                    </div>
                    <div className="space-y-1 overflow-y-auto pr-2 scrollbar-hide">
                      {(channel?.urls || [url]).map((u, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCurrentUrlIndex(idx);
                            setHasError(false);
                            setActiveMenu('none');
                          }}
                          onPointerDown={() => setFocusIndex(40 + idx)}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-xl transition-all font-bold text-left",
                            focusIndex === 40 + idx ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
                            currentUrlIndex === idx && "text-red-500"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            currentUrlIndex === idx ? "bg-red-500 text-white" : "bg-black/40 text-zinc-500"
                          )}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm">Kaynak #{idx + 1}</p>
                            <p className="text-[10px] opacity-50 truncate w-40">{u.split('/')[2] || 'Sunucu'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeMenu === 'channels' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-zinc-900/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl w-96 shadow-2xl max-h-[70vh] flex flex-col"
                  >
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2 px-2">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Kategori Seçin</span>
                        <span className="text-[10px] text-zinc-500 font-bold">{categoryChannels.length} Kanal</span>
                      </div>
                      <div 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl transition-all border border-white/5",
                          focusIndex === 10 ? "bg-white text-black scale-105" : "bg-black/40 text-white"
                        )}
                      >
                        <ChevronLeft className={cn("w-4 h-4", focusIndex === 10 ? "text-black" : "text-zinc-500")} />
                        <span className="font-black uppercase tracking-tighter text-sm truncate px-2">{selectedGroup || 'Tümü'}</span>
                        <ChevronRight className={cn("w-4 h-4", focusIndex === 10 ? "text-black" : "text-zinc-500")} />
                      </div>
                    </div>

                    <div ref={channelListRef} className="space-y-1 overflow-y-auto pr-2 scrollbar-hide">
                      {categoryChannels.map((ch, idx) => (
                        <button
                          key={ch.id}
                          onClick={() => {
                            if (onChannelSelect) onChannelSelect(ch);
                            setActiveMenu('none');
                          }}
                          onPointerDown={() => setFocusIndex(11 + idx)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all font-bold text-left",
                            focusIndex === 11 + idx ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
                            channel?.id === ch.id && "text-red-500"
                          )}
                        >
                          <div className="w-10 h-10 rounded-lg bg-black/40 flex-none overflow-hidden border border-white/5">
                            {ch.logo ? (
                              <img src={ch.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <Tv className="w-full h-full p-2 text-zinc-700" />
                            )}
                          </div>
                          <span className="truncate flex-1">{ch.name}</span>
                          {channel?.id === ch.id && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeMenu === 'audio' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-80 shadow-2xl"
                  >
                    <h3 className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-4 px-2">Ses Dili Seçin</h3>
                    <div className="space-y-1">
                      {audioTracks.map((track, idx) => (
                        <button
                          key={track.id}
                          onClick={() => {
                            if (hlsInstance) hlsInstance.audioTrack = track.id;
                            setActiveMenu('none');
                          }}
                          onPointerDown={() => setFocusIndex(20 + idx)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold",
                            focusIndex === 20 + idx ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
                            currentAudioTrack === track.id && "text-red-500"
                          )}
                        >
                          <span>{track.name || track.lang || `Ses ${idx + 1}`}</span>
                          {currentAudioTrack === track.id && <Check className="w-5 h-5" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeMenu === 'subtitle' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-80 shadow-2xl"
                  >
                    <h3 className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-4 px-2">Altyazı Seçin</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          if (hlsInstance) hlsInstance.subtitleTrack = -1;
                          setActiveMenu('none');
                        }}
                        onPointerDown={() => setFocusIndex(30)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold",
                          focusIndex === 30 ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
                          currentSubtitleTrack === -1 && "text-red-500"
                        )}
                      >
                        <span>Kapalı</span>
                        {currentSubtitleTrack === -1 && <Check className="w-5 h-5" />}
                      </button>
                      {subtitleTracks.map((track, idx) => (
                        <button
                          key={track.id}
                          onClick={() => {
                            if (hlsInstance) hlsInstance.subtitleTrack = track.id;
                            setActiveMenu('none');
                          }}
                          onPointerDown={() => setFocusIndex(31 + idx)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold",
                            focusIndex === 31 + idx ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
                            currentSubtitleTrack === track.id && "text-red-500"
                          )}
                        >
                          <span>{track.name || track.lang || `Altyazı ${idx + 1}`}</span>
                          {currentSubtitleTrack === track.id && <Check className="w-5 h-5" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
              {/* Channel Surf Strip */}
              <AnimatePresence>
                {showControls && !isMini && channelSurfEnabled && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-64 left-0 right-0 px-8 z-50"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] italic">Kanal Sörfü</span>
                        <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{selectedGroup || 'Tümü'}</span>
                      </div>
                      <div className="relative group/surf-container">
                        <div 
                          ref={surfScrollRef}
                          className="flex items-center gap-3 overflow-x-auto pt-8 pb-8 scrollbar-hide mask-fade-edges -mt-4"
                        >
                          {categoryChannels.map((ch, idx) => (
                            <button
                              key={ch.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onChannelSelect) onChannelSelect(ch);
                              }}
                              onPointerDown={() => setFocusIndex(100 + idx)}
                              className={cn(
                                "flex-none w-48 group/surf transition-all duration-300",
                                channel?.id === ch.id ? "scale-105" : "opacity-60 hover:opacity-100 hover:scale-105"
                              )}
                            >
                              <div className={cn(
                                "relative aspect-video rounded-2xl overflow-hidden border-2 transition-all duration-500 shadow-2xl",
                                channel?.id === ch.id ? "border-white ring-4 ring-white/20" : "border-white/10 group-hover/surf:border-white/40",
                                focusIndex === 100 + idx && "ring-4 ring-white scale-110 z-10"
                              )}>
                                {ch.logo ? (
                                  <img src={ch.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                    <Tv className="w-12 h-12 text-zinc-800" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-3 left-3 right-3">
                                  <p className="text-white font-black text-xs truncate tracking-tighter">{ch.name}</p>
                                  {channel?.id === ch.id && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                      <span className="text-[8px] text-red-500 font-black uppercase tracking-widest">İZLENİYOR</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Navigation Buttons */}
                        <button
                          onClick={(e) => { e.stopPropagation(); scrollSurf('left'); }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-32 bg-gradient-to-r from-black/90 via-black/40 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/surf-container:opacity-100 active:opacity-100 transition-all duration-500 z-10 rounded-r-3xl backdrop-blur-[2px] hover:scale-x-110 origin-left"
                        >
                          <div className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <ChevronLeft className="w-8 h-8 text-white drop-shadow-2xl" />
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); scrollSurf('right'); }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-32 bg-gradient-to-l from-black/90 via-black/40 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/surf-container:opacity-100 active:opacity-100 transition-all duration-500 z-10 rounded-l-3xl backdrop-blur-[2px] hover:scale-x-110 origin-right"
                        >
                          <div className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <ChevronRight className="w-8 h-8 text-white drop-shadow-2xl" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* EPG Info Bottom Bar */}
              <div className="mt-auto">
                <AnimatePresence mode="wait">
                  {showControls && !isMini && (
                    <motion.div 
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 40 }}
                      className="bg-zinc-900/80 backdrop-blur-2xl p-4 rounded-2xl border border-white/10 shadow-2xl"
                    >
                      <div className="flex flex-col gap-4">
                        {/* Video Progress Bar (For VOD/Movies) */}
                        {duration > 0 && duration !== Infinity && (
                          <div className="space-y-2 mb-2">
                            <div className="flex justify-between items-end px-1">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">OYNATILAN</span>
                                <span className="text-white font-black text-lg tracking-tighter tabular-nums leading-none">
                                  {formatPlaybackTime(playbackTime)}
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">KALAN</span>
                                <span className="text-zinc-400 font-bold text-sm tracking-tight tabular-nums leading-none">
                                  -{formatPlaybackTime(duration - playbackTime)}
                                </span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">TOPLAM SÜRE</span>
                                <span className="text-white font-black text-lg tracking-tighter tabular-nums leading-none">
                                  {formatPlaybackTime(duration)}
                                </span>
                              </div>
                            </div>
                            <div 
                              ref={progressBarRef}
                              onClick={handleProgressBarSeek}
                              onTouchStart={handleProgressBarSeek}
                              onTouchMove={handleProgressBarSeek}
                              className="h-4 w-full flex items-center cursor-pointer group/seek relative"
                            >
                              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(playbackTime / duration) * 100}%` }}
                                  className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)] relative z-10"
                                />
                              </div>
                              {/* Hover/Touch handle */}
                              <motion.div 
                                animate={{ left: `${(playbackTime / duration) * 100}%` }}
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-xl z-20"
                                style={{ marginLeft: '-8px' }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-start">
                          <div className="flex gap-4">
                            {/* Channel Logo & Name */}
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-14 h-14 bg-black/40 rounded-xl overflow-hidden border border-white/10 p-1.5 flex items-center justify-center">
                                {channel?.logo ? (
                                  <img src={channel.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                ) : (
                                  <Tv className="w-8 h-8 text-zinc-600" />
                                )}
                              </div>
                              <div className="text-center">
                                <div className="text-zinc-500 text-[7px] font-black uppercase tracking-[0.2em] mb-0.5">KANAL</div>
                                <div className="text-white font-black text-xs tracking-tighter truncate max-w-[100px]">{channel?.name}</div>
                              </div>
                            </div>

                            <div className="h-16 w-px bg-white/10 self-center" />

                            {/* Current Program Info */}
                            <div className="flex flex-col justify-center">
                              {currentProgram ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-red-500 font-black text-[9px] uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                    ŞİMDİ YAYINDA
                                  </div>
                                  <h3 className="text-2xl font-black text-white tracking-tighter leading-none">
                                    {currentProgram.title}
                                  </h3>
                                  <div className="flex items-center gap-3 text-zinc-400 font-bold">
                                    <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg text-[10px]">
                                      <Clock className="w-3 h-3" />
                                      {formatTime(currentProgram.start)} - {formatTime(currentProgram.stop)}
                                    </span>
                                    {currentProgram.description && (
                                      <span className="text-zinc-500 font-medium line-clamp-1 max-w-md text-xs italic">
                                        {currentProgram.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : metadata ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-yellow-500 font-black text-[9px] uppercase tracking-widest">
                                    <Star className="w-3 h-3 fill-current" />
                                    {metadata.imdbScore ? `IMDb: ${metadata.imdbScore}` : 'VİDEO BİLGİSİ'}
                                    {metadata.year && <span className="text-zinc-500 ml-2">{metadata.year}</span>}
                                    {metadata.director && (
                                      <span className="text-zinc-500 ml-2 border-l border-white/10 pl-2">
                                        YÖNETMEN: <span className="text-zinc-400">{metadata.director}</span>
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-2xl font-black text-white tracking-tighter leading-none">
                                    {metadata.title}
                                  </h3>
                                  <div className="flex flex-col gap-1 mt-1">
                                    <div className="flex items-center gap-3 text-zinc-400 font-bold">
                                      {metadata.genre && (
                                        <span className="text-zinc-500 font-medium line-clamp-1 max-w-md text-xs italic">
                                          {metadata.genre.join(' • ')}
                                        </span>
                                      )}
                                      {metadata.cast && metadata.cast.length > 0 && (
                                        <span className="text-zinc-600 font-medium line-clamp-1 max-w-md text-[10px] border-l border-white/10 pl-3">
                                          <span className="opacity-50 uppercase mr-1">OYUNCULAR:</span> 
                                          <span className="text-zinc-400">{metadata.cast.slice(0, 4).join(', ')}</span>
                                        </span>
                                      )}
                                    </div>
                                    {metadata.summary && (
                                      <p className="text-zinc-500 font-medium line-clamp-2 max-w-3xl text-xs italic leading-tight mt-0.5 opacity-80">
                                        {metadata.summary}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="text-zinc-500 font-black text-[9px] uppercase tracking-widest">YAYIN BİLGİSİ</div>
                                  <h3 className="text-xl font-black text-white/40 tracking-tighter italic">
                                    {loadingMetadata ? 'Bilgiler yükleniyor...' : 'Program bilgisi bulunamadı'}
                                  </h3>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-3">
                            {/* Digital Clock */}
                            <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2 backdrop-blur-md">
                              <Clock className="w-4 h-4 text-red-500 animate-pulse" />
                              <span className="text-xl font-black text-white tracking-tighter tabular-nums">
                                {formatTime(currentTime)}
                              </span>
                            </div>

                            {nextProgram ? (
                              <div className="text-right hidden lg:block bg-white/5 p-3 rounded-xl border border-white/5">
                                <div className="text-zinc-500 font-black text-[8px] uppercase tracking-widest mb-1">SIRADAKİ</div>
                                <div className="text-white font-black text-base tracking-tight">{nextProgram.title}</div>
                                <div className="text-zinc-400 font-bold text-xs flex items-center justify-end gap-1.5">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(nextProgram.start)}
                                </div>
                              </div>
                            ) : metadata && (
                              <div className="text-right hidden lg:block bg-white/5 p-3 rounded-xl border border-white/5 max-w-[200px]">
                                <div className="text-zinc-500 font-black text-[8px] uppercase tracking-widest mb-1">YÖNETMEN</div>
                                <div className="text-white font-black text-sm tracking-tight truncate">{metadata.director || 'Bilinmiyor'}</div>
                                <div className="mt-2 text-zinc-500 font-black text-[8px] uppercase tracking-widest mb-1">OYUNCULAR</div>
                                <div className="text-zinc-400 font-bold text-[10px] line-clamp-2 leading-tight">
                                  {metadata.cast?.slice(0, 3).join(', ')}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {currentProgram && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[9px] font-black text-zinc-500 uppercase tracking-widest px-1">
                              <div className="flex gap-4">
                                <span className="flex items-center gap-1">
                                  <span className="text-zinc-600">GEÇEN:</span>
                                  <span className="text-white">{formatDuration(currentTime.getTime() - currentProgram.start.getTime())}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="text-zinc-600">KALAN:</span>
                                  <span className="text-white">{formatDuration(currentProgram.stop.getTime() - currentTime.getTime())}</span>
                                </span>
                              </div>
                              <span className="flex items-center gap-1">
                                <span className="text-zinc-600">TOPLAM:</span>
                                <span className="text-white">{formatDuration(currentProgram.stop.getTime() - currentProgram.start.getTime())}</span>
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${programProgress}%` }}
                                className="h-full bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                              />
                            </div>
                            <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                              <span className="flex items-center gap-1">
                                <span className="text-zinc-600">BAŞLANGIÇ:</span> {formatTime(currentProgram.start)}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-zinc-600">BİTİŞ:</span> {formatTime(currentProgram.stop)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mini Controls Overlay */}
        <AnimatePresence>
          {showControls && isMini && channel && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col justify-end p-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-lg overflow-hidden border border-white/10">
                    {channel.logo ? (
                      <img 
                        src={channel.logo} 
                        alt={channel.name} 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Tv className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold truncate max-w-[150px]">{channel.name}</h3>
                    <p className="text-[10px] text-zinc-400">Canlı Yayın</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
