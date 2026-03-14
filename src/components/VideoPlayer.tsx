import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import { X, Settings, Volume2, Languages, Check, Info, Clock, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { M3UChannel } from '../utils/m3uParser';
import { EPGData, EPGProgram } from '../utils/epgParser';

interface VideoPlayerProps {
  url: string;
  channel?: M3UChannel;
  epgData?: EPGData | null;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, channel, epgData, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [activeMenu, setActiveMenu] = useState<'none' | 'audio' | 'subtitle'>('none');
  const [focusIndex, setFocusIndex] = useState(0); // 0: Close, 1: Audio, 2: Subtitle, 3+: Menu items
  const [currentTime, setCurrentTime] = useState(new Date());

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

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setAudioTracks(hls?.audioTracks || []);
        setSubtitleTracks(hls?.subtitleTracks || []);
        setCurrentAudioTrack(hls?.audioTrack || -1);
        setCurrentSubtitleTrack(hls?.subtitleTrack || -1);
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
  }, [url]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showControls) {
        setShowControls(true);
        return;
      }

      switch (e.key) {
        case 'Escape':
        case 'Backspace':
          if (activeMenu !== 'none') {
            setActiveMenu('none');
            setFocusIndex(activeMenu === 'audio' ? 1 : 2);
          } else {
            onClose?.();
          }
          break;
        case 'ArrowLeft':
          if (activeMenu === 'none') {
            setFocusIndex(prev => Math.max(0, prev - 1));
          }
          break;
        case 'ArrowRight':
          if (activeMenu === 'none') {
            setFocusIndex(prev => Math.min(2, prev + 1));
          }
          break;
        case 'ArrowUp':
          if (activeMenu !== 'none') {
            setFocusIndex(prev => Math.max(3, prev - 1));
          }
          break;
        case 'ArrowDown':
          if (activeMenu !== 'none') {
            const max = 3 + (activeMenu === 'audio' ? audioTracks.length : subtitleTracks.length) - 1;
            setFocusIndex(prev => Math.min(max, prev + 1));
          }
          break;
        case 'Enter':
          if (activeMenu === 'none') {
            if (focusIndex === 0) onClose?.();
            else if (focusIndex === 1) {
              setActiveMenu('audio');
              setFocusIndex(3 + (currentAudioTrack !== -1 ? audioTracks.findIndex(t => t.id === currentAudioTrack) : 0));
            }
            else if (focusIndex === 2) {
              setActiveMenu('subtitle');
              setFocusIndex(3 + (currentSubtitleTrack !== -1 ? subtitleTracks.findIndex(t => t.id === currentSubtitleTrack) : 0));
            }
          } else {
            const itemIdx = focusIndex - 3;
            if (activeMenu === 'audio') {
              if (hlsInstance) hlsInstance.audioTrack = audioTracks[itemIdx].id;
              setActiveMenu('none');
              setFocusIndex(1);
            } else if (activeMenu === 'subtitle') {
              if (hlsInstance) hlsInstance.subtitleTrack = subtitleTracks[itemIdx].id;
              setActiveMenu('none');
              setFocusIndex(2);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls, activeMenu, focusIndex, audioTracks, subtitleTracks, hlsInstance, currentAudioTrack, currentSubtitleTrack]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && activeMenu === 'none') {
      const timer = setTimeout(() => setShowControls(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showControls, activeMenu]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col group overflow-hidden" onMouseMove={() => setShowControls(true)}>
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
        />

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
                    className={cn(
                      "p-3 rounded-full transition-all flex items-center gap-2",
                      focusIndex === 2 ? "bg-white text-black scale-110 ring-4 ring-white/30" : "bg-black/40 text-white hover:bg-black/60"
                    )}
                  >
                    <Languages className="w-8 h-8" />
                    <span className="text-sm font-bold uppercase tracking-tighter">Altyazı</span>
                  </button>
                </div>
              </div>

              {/* Menus */}
              <div className="flex justify-end items-end gap-8 mb-4">
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
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold",
                            focusIndex === 3 + idx ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
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
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold",
                          focusIndex === 3 ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
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
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold",
                            focusIndex === 3 + idx + 1 ? "bg-white text-black scale-105" : "text-white hover:bg-white/10",
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
                  {currentProgram && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-white/10"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-red-500 font-black text-xs uppercase tracking-widest">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              ŞİMDİ YAYINDA
                            </div>
                            <h3 className="text-3xl font-black text-white tracking-tight">
                              {currentProgram.title}
                            </h3>
                            <div className="flex items-center gap-3 text-zinc-400 font-bold">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatTime(currentProgram.start)} - {formatTime(currentProgram.stop)}
                              </span>
                              {currentProgram.description && (
                                <span className="text-zinc-500 font-medium line-clamp-1 max-w-xl">
                                  • {currentProgram.description}
                                </span>
                              )}
                            </div>
                          </div>

                          {nextProgram && (
                            <div className="text-right hidden md:block">
                              <div className="text-zinc-500 font-black text-[10px] uppercase tracking-widest mb-1">SIRADAKİ</div>
                              <div className="text-white font-bold">{nextProgram.title}</div>
                              <div className="text-zinc-400 text-sm">{formatTime(nextProgram.start)}</div>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${programProgress}%` }}
                              className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                            <span>{formatTime(currentProgram.start)}</span>
                            <span>{formatTime(currentProgram.stop)}</span>
                          </div>
                        </div>
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
