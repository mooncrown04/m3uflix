import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { X, Settings, Volume2, VolumeX, Languages, Check, Clock, Play, List, ChevronLeft, ChevronRight, Tv, Pause, Link2, Subtitles, Settings2, FastForward, Rewind, Monitor, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { cn } from '../utils/cn';
import { M3UChannel } from '../utils/m3uParser';
import { EPGData, EPGProgram } from '../utils/epgParser';
import { fetchMediaMetadata, MediaMetadata } from '../services/metadataService';

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
  onProgressUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [activeMenu, setActiveMenu] = useState<'none' | 'audio' | 'subtitle' | 'channels' | 'sources' | 'details' | 'volume'>('none');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [focusIndex, setFocusIndex] = useState(0); // 0: Close, 1: Audio, 2: Subtitle, 3: Channels, 4: Sources, 5: Details, 10: Category Selector, 11+: Menu items
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasError, setHasError] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [seekInfo, setSeekInfo] = useState<{ type: 'forward' | 'backward', amount: number } | null>(null);
  const [seekStep, setSeekStep] = useState(10);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const seekTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

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

  // Initialize selectedGroup when channel changes
  useEffect(() => {
    if (channel?.group) {
      setSelectedGroup(channel.group);
    }
    setHasError(false);
    setCurrentUrlIndex(0);
    setUseProxy(false);
    setShowControls(true);
    setIsPlaying(true);
    setIsBuffering(true);
    setMetadata(null);
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
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const percentage = 1 - (y / rect.height);
    setVolume(percentage);
    setIsMuted(false);
    setShowControls(true);
  }, []);

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
    const handlePlaying = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);
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

  const currentProgram = useMemo(() => {
    if (!epgData || !channel) return null;
    
    // Try matching by ID first (tvgId, tvgName, or channel attribute)
    let epgId = channel.tvgId || channel.tvgName || channel.channel;
    let programs = epgId ? epgData.programs[epgId] : null;

    // Fallback: Try matching by channel name if no ID match
    if (!programs) {
      const foundId = Object.entries(epgData.channels).find(
        ([_, name]) => (name as string).toLowerCase() === channel.name.toLowerCase()
      )?.[0];
      if (foundId) {
        programs = epgData.programs[foundId];
      }
    }

    if (!programs) return null;
    return programs.find(p => currentTime >= p.start && currentTime <= p.stop) || null;
  }, [epgData, channel, currentTime]);

  const nextProgram = useMemo(() => {
    if (!epgData || !channel) return null;
    
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

    if (!programs) return null;
    return programs.find(p => p.start > currentTime) || null;
  }, [epgData, channel, currentTime]);

  const programProgress = useMemo(() => {
    if (!currentProgram) return 0;
    const total = currentProgram.stop.getTime() - currentProgram.start.getTime();
    if (total <= 0) return 0;
    const elapsed = currentTime.getTime() - currentProgram.start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, [currentProgram, currentTime]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(Math.max(0, ms) / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}sa ${minutes}dk`;
    }
    return `${minutes}dk`;
  };

  const formatPlaybackTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    console.log('VideoPlayer initializing for URL:', currentUrl);
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let dash: dashjs.MediaPlayerClass | null = null;
    const lowerUrl = currentUrl.toLowerCase();
    const isHlsUrl = lowerUrl.includes('.m3u8') || lowerUrl.includes('m3u8');
    const isDashUrl = lowerUrl.includes('.mpd') || lowerUrl.includes('mpd');

    if (isHlsUrl) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
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
            handleVideoError();
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
    } else if (isDashUrl) {
      dash = dashjs.MediaPlayer().create();
      dash.initialize(video, currentUrl, isPlaying);
      
      // Reset tracks as dash handled differently
      setAudioTracks([]);
      setSubtitleTracks([]);
      setCurrentAudioTrack(-1);
      setCurrentSubtitleTrack(-1);
    } else {
      // Native playback for MP4, WebM, Ogg, and potentially AVI/MKV if browser supports codecs
      video.src = currentUrl;
      video.load();
      if (isPlaying) video.play().catch(() => {});
      
      // Reset tracks as native playback handles them differently or they might not be available via HLS API
      setAudioTracks([]);
      setSubtitleTracks([]);
      setCurrentAudioTrack(-1);
      setCurrentSubtitleTrack(-1);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (dash) {
        dash.destroy();
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [currentUrl]);

  const handleVideoError = () => {
    console.error('Video error occurred for URL:', currentUrl);
    const urls = channel?.urls || [url];
    
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
    // 3. If everything failed
    else {
      setHasError(true);
      setIsPlaying(false);
      setIsBuffering(false);
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
      if (key === 'Up' || key === 'ChannelUp') key = 'ArrowUp';
      if (key === 'Down' || key === 'ChannelDown') key = 'ArrowDown';
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
        setIsPlaying(prev => !prev);
        setShowControls(true);
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
          setFocusIndex(prev => Math.max(0, prev - 1));
        } else if (key === 'ArrowRight') {
          e.preventDefault();
          setFocusIndex(prev => Math.min(8, prev + 1));
        } else if (key === 'ArrowUp') {
          e.preventDefault();
          // Stay in Layer 1, do nothing
        } else if (key === 'ArrowDown') {
          e.preventDefault();
          setShowControls(false);
        } else if (key === 'Enter') {
          e.preventDefault();
          if (focusIndex === 0) onClose?.();
          else if (focusIndex === 1) onToggleMini?.();
          else if (focusIndex === 2) setActiveMenu('volume');
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
            setFocusIndex(50);
          }
          else if (focusIndex === 8) togglePip();
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
            // Only one interactive item in details for now
            setFocusIndex(50);
          } else if (activeMenu === 'volume') {
            setVolume(prev => Math.min(1, prev + 0.1));
            setIsMuted(false);
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
            setFocusIndex(50);
          } else if (activeMenu === 'volume') {
            setVolume(prev => Math.max(0, prev - 0.1));
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (activeMenu === 'channels' && focusIndex === 10) {
            const groups = ['Tümü', ...allGroups];
            const currentIdx = groups.indexOf(selectedGroup || 'Tümü');
            const nextIdx = (currentIdx - 1 + groups.length) % groups.length;
            setSelectedGroup(groups[nextIdx] === 'Tümü' ? '' : groups[nextIdx]);
          } else if (activeMenu === 'details' && focusIndex === 50) {
            setSeekStep(prev => Math.max(5, prev - 5));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (activeMenu === 'channels' && focusIndex === 10) {
            const groups = ['Tümü', ...allGroups];
            const currentIdx = groups.indexOf(selectedGroup || 'Tümü');
            const nextIdx = (currentIdx + 1) % groups.length;
            setSelectedGroup(groups[nextIdx] === 'Tümü' ? '' : groups[nextIdx]);
          } else if (activeMenu === 'details' && focusIndex === 50) {
            setSeekStep(prev => Math.min(60, prev + 5));
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
        <video
          ref={videoRef}
          className="w-full h-full max-h-screen object-contain"
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
          {isBuffering && !hasError && !seekInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none"
            >
              <div className="bg-black/60 backdrop-blur-xl p-10 rounded-[40px] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center">
                <div className="relative flex items-center justify-center scale-75">
                  {/* Ripple Effect */}
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 2],
                      opacity: [0.5, 0.2, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="absolute w-24 h-24 rounded-full border-2 border-white/20"
                    style={{ borderColor: `${themeColor}40` }}
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1.6],
                      opacity: [0.3, 0.1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.5,
                    }}
                    className="absolute w-24 h-24 rounded-full border-2 border-white/10"
                    style={{ borderColor: `${themeColor}20` }}
                  />
                  
                  {/* Central Icon Container */}
                  <div className="relative z-10 bg-black/40 p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
                    <div className="relative">
                      <Tv className="w-12 h-12 text-white opacity-20" />
                      <motion.div
                        animate={{
                          height: ["0%", "100%", "0%"],
                          top: ["0%", "0%", "100%"],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="absolute left-0 right-0 w-full bg-white/40 blur-[2px]"
                        style={{ backgroundColor: themeColor }}
                      />
                      <Tv className="absolute inset-0 w-12 h-12 text-white" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex flex-col items-center gap-2">
                  <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] italic opacity-80">
                    Yayın Hazırlanıyor
                  </p>
                  <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-full h-full bg-white"
                      style={{ backgroundColor: themeColor }}
                    />
                  </div>
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
              <p className="text-zinc-400 text-sm max-w-md font-medium leading-relaxed">
                Bu kanal şu anda oynatılamıyor. Lütfen başka bir kaynak deneyin veya daha sonra tekrar kontrol edin.
              </p>
              <button 
                onClick={() => {
                  setHasError(false);
                  setIsPlaying(true);
                  setIsBuffering(true);
                  setCurrentUrlIndex(0);
                }}
                className="mt-8 px-8 py-3 bg-white text-black font-black rounded-full hover:scale-105 transition-transform uppercase tracking-widest text-xs"
              >
                Yeniden Dene
              </button>
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
                {isPlaying ? (
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

        {/* Volume Indicator */}
        <AnimatePresence>
          {(showControls || isMuted || activeMenu === 'volume') && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed top-1/2 right-8 -translate-y-1/2 z-[999] flex flex-col items-center gap-4 bg-black/40 backdrop-blur-2xl p-4 rounded-full border border-white/10 shadow-2xl pointer-events-auto"
            >
              <div 
                className="h-48 w-1.5 bg-white/10 rounded-full relative overflow-hidden cursor-pointer group/vol"
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
                  className="absolute bottom-0 left-0 right-0 rounded-full"
                  style={{ backgroundColor: themeColor }}
                  initial={false}
                  animate={{ height: `${isMuted ? 0 : volume * 100}%` }}
                />
              </div>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="text-white hover:scale-110 transition-transform"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
                  {onToggleMini && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMini();
                      }}
                      onPointerDown={() => setFocusIndex(1)}
                      className={cn(
                        "p-3 rounded-full transition-all",
                        focusIndex === 1 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                      )}
                      title="Mini Oynatıcı (P)"
                    >
                      <Monitor className="w-8 h-8" />
                    </button>
                  )}
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                    {channel?.name || "Canlı Yayın"}
                  </h2>
                </div>

                <div className="flex items-center gap-4">
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
                </div>
              </div>

              {/* Menus */}
              <div className="flex justify-end items-end gap-8 mb-4">
                {activeMenu === 'details' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/95 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl w-96 shadow-2xl"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                        <Settings2 className="w-8 h-8 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-xl tracking-tighter">Kanal Detayları</h3>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">M3U Bilgileri</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div 
                        className={cn(
                          "p-4 rounded-2xl transition-all border flex items-center justify-between",
                          focusIndex === 50 ? "bg-white text-black scale-105 border-white" : "bg-white/5 text-white border-white/5"
                        )}
                      >
                        <div className="flex flex-col">
                          <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-50">OYNATMA AYARI</p>
                          <p className="font-bold text-sm">Hızlı Sarma Süresi</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <ChevronLeft className={cn("w-4 h-4", focusIndex === 50 ? "text-black" : "text-zinc-500")} />
                          <span className="text-xl font-black tabular-nums">{seekStep}s</span>
                          <ChevronRight className={cn("w-4 h-4", focusIndex === 50 ? "text-black" : "text-zinc-500")} />
                        </div>
                      </div>

                      {channel?.genre && (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">TÜR</p>
                          <p className="text-white font-bold text-sm">{channel.genre}</p>
                        </div>
                      )}
                      {channel?.actor && (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">OYUNCULAR</p>
                          <p className="text-white font-bold text-sm">{channel.actor}</p>
                        </div>
                      )}
                      {channel?.year && (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">YIL</p>
                          <p className="text-white font-bold text-sm">{channel.year}</p>
                        </div>
                      )}
                      {channel?.language && (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">DİL</p>
                          <p className="text-white font-bold text-sm">{channel.language}</p>
                        </div>
                      )}
                      {metadata ? (
                        <>
                          {metadata.imdbScore && (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">IMDb PUANI</p>
                              <div className="flex items-center gap-2 text-yellow-500 font-black">
                                <Star className="w-4 h-4 fill-current" />
                                <span>{metadata.imdbScore}</span>
                              </div>
                            </div>
                          )}
                          {metadata.director && (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">YÖNETMEN</p>
                              <p className="text-white font-bold text-sm">{metadata.director}</p>
                            </div>
                          )}
                          {metadata.cast && metadata.cast.length > 0 && (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">OYUNCULAR</p>
                              <p className="text-white font-bold text-sm">{metadata.cast.slice(0, 5).join(', ')}</p>
                            </div>
                          )}
                          {metadata.summary && (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">ÖZET</p>
                              <p className="text-white font-medium text-xs leading-relaxed opacity-80">{metadata.summary}</p>
                            </div>
                          )}
                        </>
                      ) : channel?.description && (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">AÇIKLAMA</p>
                          <p className="text-white font-medium text-xs leading-relaxed opacity-80">{channel.description}</p>
                        </div>
                      )}
                      {!metadata && !channel?.genre && !channel?.actor && !channel?.year && !channel?.language && !channel?.description && (
                        <div className="text-center py-8">
                          <p className="text-zinc-500 italic text-sm">Bu kanal için ek bilgi bulunamadı.</p>
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

                {activeMenu === 'volume' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-6 rounded-2xl w-80 shadow-2xl flex flex-col items-center gap-6"
                  >
                    <h3 className="text-zinc-400 text-xs font-black uppercase tracking-widest px-2">Ses Seviyesi</h3>
                    <div 
                      className="h-48 w-12 bg-white/10 rounded-2xl relative overflow-hidden cursor-pointer group/vol-menu"
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
                        className="absolute bottom-0 left-0 right-0 rounded-t-xl"
                        style={{ backgroundColor: themeColor }}
                        initial={false}
                        animate={{ height: `${isMuted ? 0 : volume * 100}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-white font-black text-xl drop-shadow-md">
                          {isMuted ? '0' : Math.round(volume * 100)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 w-full">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={cn(
                          "flex-1 p-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                          isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                        )}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        <span>{isMuted ? 'Sesi Aç' : 'Sessiz'}</span>
                      </button>
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
                                  </div>
                                  <h3 className="text-2xl font-black text-white tracking-tighter leading-none">
                                    {metadata.title}
                                  </h3>
                                  <div className="flex items-center gap-3 text-zinc-400 font-bold">
                                    {metadata.genre && (
                                      <span className="text-zinc-500 font-medium line-clamp-1 max-w-md text-xs italic">
                                        {metadata.genre.join(' • ')}
                                      </span>
                                    )}
                                    {metadata.summary && (
                                      <span className="text-zinc-500 font-medium line-clamp-1 max-w-md text-xs italic">
                                        {metadata.summary}
                                      </span>
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

                            {nextProgram && (
                              <div className="text-right hidden lg:block bg-white/5 p-3 rounded-xl border border-white/5">
                                <div className="text-zinc-500 font-black text-[8px] uppercase tracking-widest mb-1">SIRADAKİ</div>
                                <div className="text-white font-black text-base tracking-tight">{nextProgram.title}</div>
                                <div className="text-zinc-400 font-bold text-xs flex items-center justify-end gap-1.5">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(nextProgram.start)}
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
