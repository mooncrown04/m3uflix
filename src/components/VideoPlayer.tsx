import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import { X, Settings, Volume2, Languages, Check, Info, Clock, Play, List, ChevronLeft, ChevronRight, Tv, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { M3UChannel } from '../utils/m3uParser';
import { EPGData, EPGProgram } from '../utils/epgParser';

interface VideoPlayerProps {
  url: string;
  channel?: M3UChannel;
  channels?: M3UChannel[];
  epgData?: EPGData | null;
  onClose?: () => void;
  onChannelSelect?: (channel: M3UChannel) => void;
  themeColor?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  url, 
  channel, 
  channels = [], 
  epgData, 
  onClose, 
  onChannelSelect,
  themeColor = '#ef4444'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [activeMenu, setActiveMenu] = useState<'none' | 'audio' | 'subtitle' | 'channels'>('none');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [focusIndex, setFocusIndex] = useState(0); // 0: Close, 1: Audio, 2: Subtitle, 3: Channels, 4: Category Selector, 5+: Menu items
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [isSwitchingSource, setIsSwitchingSource] = useState(false);

  const currentUrl = useMemo(() => {
    if (channel?.urls && channel.urls.length > 0) {
      return channel.urls[currentUrlIndex] || channel.urls[0];
    }
    return url;
  }, [url, channel, currentUrlIndex]);

  // Initialize selectedGroup when channel changes
  useEffect(() => {
    if (channel?.group) {
      setSelectedGroup(channel.group);
    }
    setCurrentUrlIndex(0);
    setIsSwitchingSource(false);
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

  // Update current time every minute for EPG
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [isPlaying]);

  const currentProgram = useMemo(() => {
    if (!epgData || !channel?.tvgId) return null;
    const programs = epgData.programs[channel.tvgId];
    if (!programs) return null;

    return programs.find(p => currentTime >= p.start && currentTime <= p.stop) || null;
  }, [epgData, channel, currentTime]);

  const nextProgram = useMemo(() => {
    if (!epgData || !channel?.tvgId) return null;
    const programs = epgData.programs[channel.tvgId];
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    setIsSwitchingSource(false);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = currentUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(currentUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setAudioTracks(hls?.audioTracks || []);
        setSubtitleTracks(hls?.subtitleTracks || []);
        setCurrentAudioTrack(hls?.audioTrack || -1);
        setCurrentSubtitleTrack(hls?.subtitleTrack || -1);
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
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentUrl]);

  const handleVideoError = () => {
    if (channel?.urls && currentUrlIndex < channel.urls.length - 1) {
      console.log(`Source ${currentUrlIndex} failed, switching to ${currentUrlIndex + 1}`);
      setIsSwitchingSource(true);
      setTimeout(() => {
        setCurrentUrlIndex(prev => prev + 1);
      }, 1000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let key = e.key;
      // Normalize TV remote keys
      if (key === 'Select' || key === 'OK') key = 'Enter';
      if (key === 'Back' || key === 'GoBack' || key === 'XF86Back' || key === 'MediaStop') key = 'Backspace';
      if (key === 'Up') key = 'ArrowUp';
      if (key === 'Down') key = 'ArrowDown';
      if (key === 'Left') key = 'ArrowLeft';
      if (key === 'Right') key = 'ArrowRight';
      if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause') key = ' ';

      if (!showControls) {
        if (key === 'ArrowUp') {
          e.preventDefault();
          const currentIdx = categoryChannels.findIndex(ch => ch.id === channel?.id);
          const nextIdx = (currentIdx - 1 + categoryChannels.length) % categoryChannels.length;
          const nextChannel = categoryChannels[nextIdx];
          if (nextChannel && onChannelSelect) onChannelSelect(nextChannel);
          return;
        }
        if (key === 'ArrowDown') {
          e.preventDefault();
          const currentIdx = categoryChannels.findIndex(ch => ch.id === channel?.id);
          const nextIdx = (currentIdx + 1) % categoryChannels.length;
          const nextChannel = categoryChannels[nextIdx];
          if (nextChannel && onChannelSelect) onChannelSelect(nextChannel);
          return;
        }
        setShowControls(true);
        return;
      }

      switch (key) {
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
              console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
          } else {
            document.exitFullscreen();
          }
          break;
        case 'Escape':
        case 'Backspace':
          if (activeMenu !== 'none') {
            setActiveMenu('none');
            if (activeMenu === 'audio') setFocusIndex(1);
            else if (activeMenu === 'subtitle') setFocusIndex(2);
            else if (activeMenu === 'channels') setFocusIndex(3);
          } else {
            onClose?.();
          }
          break;
        case 'ArrowLeft':
          if (activeMenu === 'none') {
            setFocusIndex(prev => Math.max(0, prev - 1));
          } else if (activeMenu === 'channels' && focusIndex === 4) {
            // Switch category
            const currentIdx = allGroups.indexOf(selectedGroup);
            const nextIdx = (currentIdx - 1 + allGroups.length) % allGroups.length;
            setSelectedGroup(allGroups[nextIdx]);
          }
          break;
        case 'ArrowRight':
          if (activeMenu === 'none') {
            setFocusIndex(prev => Math.min(3, prev + 1));
          } else if (activeMenu === 'channels' && focusIndex === 4) {
            // Switch category
            const currentIdx = allGroups.indexOf(selectedGroup);
            const nextIdx = (currentIdx + 1) % allGroups.length;
            setSelectedGroup(allGroups[nextIdx]);
          }
          break;
        case 'ArrowUp':
          if (activeMenu !== 'none') {
            setFocusIndex(prev => Math.max(4, prev - 1));
          }
          break;
        case 'ArrowDown':
          if (activeMenu !== 'none') {
            let max = 4;
            if (activeMenu === 'audio') max = 4 + audioTracks.length - 1;
            else if (activeMenu === 'subtitle') max = 4 + subtitleTracks.length; // 4 is "Off", 5+ are tracks
            else if (activeMenu === 'channels') max = 4 + 1 + categoryChannels.length - 1; // 4: Category, 5+: Channels
            setFocusIndex(prev => Math.min(max, prev + 1));
          }
          break;
        case 'Enter':
          if (activeMenu === 'none') {
            if (focusIndex === 0) onClose?.();
            else if (focusIndex === 1) {
              setActiveMenu('audio');
              setFocusIndex(4 + (currentAudioTrack !== -1 ? audioTracks.findIndex(t => t.id === currentAudioTrack) : 0));
            }
            else if (focusIndex === 2) {
              setActiveMenu('subtitle');
              setFocusIndex(4 + (currentSubtitleTrack !== -1 ? subtitleTracks.findIndex(t => t.id === currentSubtitleTrack) : 0));
            }
            else if (focusIndex === 3) {
              setActiveMenu('channels');
              setFocusIndex(4); // Start at category selector
            }
          } else {
            if (activeMenu === 'channels') {
              if (focusIndex === 4) {
                // Category selector - handled by Left/Right
              } else {
                const itemIdx = focusIndex - 5;
                const selected = categoryChannels[itemIdx];
                if (selected && onChannelSelect) {
                  onChannelSelect(selected);
                  setActiveMenu('none');
                  setFocusIndex(3);
                }
              }
            } else {
              const itemIdx = focusIndex - 4;
              if (activeMenu === 'audio') {
                if (hlsInstance) hlsInstance.audioTrack = audioTracks[itemIdx].id;
                setActiveMenu('none');
                setFocusIndex(1);
              } else if (activeMenu === 'subtitle') {
                if (hlsInstance) hlsInstance.subtitleTrack = (itemIdx === 0) ? -1 : subtitleTracks[itemIdx - 1].id;
                setActiveMenu('none');
                setFocusIndex(2);
              }
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls, activeMenu, focusIndex, audioTracks, subtitleTracks, hlsInstance, currentAudioTrack, currentSubtitleTrack, categoryChannels, onChannelSelect, channel, onClose]);

  // Auto-show controls when channel changes
  useEffect(() => {
    if (channel) {
      setShowControls(true);
      const timer = setTimeout(() => {
        if (activeMenu === 'none') setShowControls(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [channel, activeMenu]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && activeMenu === 'none') {
      const timer = setTimeout(() => setShowControls(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showControls, activeMenu]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col group overflow-hidden" onMouseMove={() => setShowControls(true)} onPointerDown={() => setShowControls(true)}>
      <div 
        className="flex-1 flex items-center justify-center bg-black relative cursor-pointer"
        onClick={() => {
          if (!showControls) {
            setShowControls(true);
          } else {
            setIsPlaying(!isPlaying);
          }
        }}
      >
        <video
          ref={videoRef}
          className="w-full h-full max-h-screen object-contain"
          autoPlay
          playsInline
          onError={handleVideoError}
        />

        {/* Switching Source Indicator */}
        <AnimatePresence>
          {isSwitchingSource && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-50"
            >
              <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-4" style={{ borderTopColor: themeColor }} />
              <p className="text-white font-black uppercase tracking-widest text-sm">Kaynak Değiştiriliyor...</p>
              <p className="text-zinc-500 text-xs mt-2">Yedek linke geçiliyor ({currentUrlIndex + 2}/{channel?.urls?.length})</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/Pause Indicator for Touch */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-black/40 p-6 rounded-full backdrop-blur-sm">
                {isPlaying ? (
                  <Play className="w-12 h-12 text-white fill-current" />
                ) : (
                  <div className="flex gap-2">
                    <div className="w-4 h-12 bg-white rounded-full" />
                    <div className="w-4 h-12 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Controls Overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-8"
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
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                    {channel?.name || "Canlı Yayın"}
                  </h2>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveMenu('audio')}
                    onPointerDown={() => setFocusIndex(1)}
                    className={cn(
                      "p-3 rounded-full transition-all flex items-center gap-2",
                      focusIndex === 1 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                    )}
                  >
                    <Volume2 className="w-8 h-8" />
                    <span className="text-sm font-bold uppercase tracking-tighter">Ses / Dil</span>
                  </button>
                  <button 
                    onClick={() => setActiveMenu('subtitle')}
                    onPointerDown={() => setFocusIndex(2)}
                    className={cn(
                      "p-3 rounded-full transition-all flex items-center gap-2",
                      focusIndex === 2 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                    )}
                  >
                    <Languages className="w-8 h-8" />
                    <span className="text-sm font-bold uppercase tracking-tighter">Altyazı</span>
                  </button>
                  <button 
                    onClick={() => setActiveMenu('channels')}
                    onPointerDown={() => setFocusIndex(3)}
                    className={cn(
                      "p-3 rounded-full transition-all flex items-center gap-2",
                      focusIndex === 3 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                    )}
                  >
                    <List className="w-8 h-8" />
                    <span className="text-sm font-bold uppercase tracking-tighter">Kanallar</span>
                  </button>
                </div>
              </div>

              {/* Menus */}
              <div className="flex justify-end items-end gap-8 mb-4">
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
                          focusIndex === 4 ? "bg-white text-black scale-105" : "bg-black/40 text-white"
                        )}
                      >
                        <ChevronLeft className={cn("w-4 h-4", focusIndex === 4 ? "text-black" : "text-zinc-500")} />
                        <span className="font-black uppercase tracking-tighter text-sm truncate px-2">{selectedGroup || 'Tümü'}</span>
                        <ChevronRight className={cn("w-4 h-4", focusIndex === 4 ? "text-black" : "text-zinc-500")} />
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
                          onPointerDown={() => setFocusIndex(5 + idx)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all font-bold text-left",
                            focusIndex === 5 + idx ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
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
                          onPointerDown={() => setFocusIndex(4 + idx)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold",
                            focusIndex === 4 + idx ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
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
                        onPointerDown={() => setFocusIndex(4)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold",
                          focusIndex === 4 ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
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
                          onPointerDown={() => setFocusIndex(4 + idx + 1)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold",
                            focusIndex === 4 + idx + 1 ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
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
                  {showControls && (
                    <motion.div 
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 40 }}
                      className="bg-zinc-900/80 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-2xl"
                    >
                      <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-6">
                            {/* Channel Logo & Name */}
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-20 h-20 bg-black/40 rounded-2xl overflow-hidden border border-white/10 p-2 flex items-center justify-center">
                                {channel?.logo ? (
                                  <img src={channel.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                ) : (
                                  <Tv className="w-12 h-12 text-zinc-600" />
                                )}
                              </div>
                              <div className="text-center">
                                <div className="text-zinc-500 text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">KANAL</div>
                                <div className="text-white font-black text-sm tracking-tighter truncate max-w-[120px]">{channel?.name}</div>
                              </div>
                            </div>

                            <div className="h-24 w-px bg-white/10 self-center" />

                            {/* Current Program Info */}
                            <div className="flex flex-col justify-center">
                              {currentProgram ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    ŞİMDİ YAYINDA
                                  </div>
                                  <h3 className="text-4xl font-black text-white tracking-tighter leading-none">
                                    {currentProgram.title}
                                  </h3>
                                  <div className="flex items-center gap-4 text-zinc-400 font-bold">
                                    <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg text-xs">
                                      <Clock className="w-3.5 h-3.5" />
                                      {formatTime(currentProgram.start)} - {formatTime(currentProgram.stop)}
                                    </span>
                                    {currentProgram.description && (
                                      <span className="text-zinc-500 font-medium line-clamp-1 max-w-xl text-sm italic">
                                        {currentProgram.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">YAYIN BİLGİSİ</div>
                                  <h3 className="text-3xl font-black text-white/40 tracking-tighter italic">
                                    Program bilgisi bulunamadı
                                  </h3>
                                </div>
                              )}
                            </div>
                          </div>

                          {nextProgram && (
                            <div className="text-right hidden lg:block bg-white/5 p-4 rounded-2xl border border-white/5">
                              <div className="text-zinc-500 font-black text-[10px] uppercase tracking-widest mb-2">SIRADAKİ</div>
                              <div className="text-white font-black text-lg tracking-tight">{nextProgram.title}</div>
                              <div className="text-zinc-400 font-bold text-sm flex items-center justify-end gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {formatTime(nextProgram.start)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {currentProgram && (
                          <div className="space-y-2">
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${programProgress}%` }}
                                className="h-full bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                              />
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
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
      </div>
    </div>
  );
};
