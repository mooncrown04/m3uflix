import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import { X, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { M3UChannel } from '../utils/m3uParser';

interface MultiPlayerProps {
  channels: M3UChannel[];
  onClose: () => void;
  onSingleView: (channel: M3UChannel) => void;
  themeColor?: string;
  customProxyUrl?: string;
}

interface SingleVideoProps {
  url: string;
  isMuted: boolean;
  customProxyUrl?: string;
  isActive: boolean;
  onClick: () => void;
}

const SingleVideo: React.FC<SingleVideoProps> = ({ 
  url, 
  isMuted, 
  customProxyUrl, 
  isActive, 
  onClick 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isBuffering, setIsBuffering] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    const lowerUrl = url.toLowerCase();
    const isHlsUrl = lowerUrl.includes('.m3u8') || lowerUrl.includes('m3u8');

    if (isHlsUrl && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr, requestUrl) => {
          const proxyBase = customProxyUrl || '/api/proxy?url=';
          if (url.includes('/api/proxy') && !requestUrl.includes('/api/proxy') && requestUrl.startsWith('http')) {
            xhr.open('GET', `${proxyBase}${encodeURIComponent(requestUrl)}`, true);
          }
        }
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    } else {
      video.src = url;
      video.load();
      video.play().catch(() => {});
    }

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      if (hls) hls.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [url, customProxyUrl]);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative bg-black border-2 transition-all duration-300 cursor-pointer overflow-hidden group",
        isActive ? "border-white shadow-2xl scale-[0.98] z-10" : "border-white/10 opacity-60 hover:opacity-100"
      )}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        muted={isMuted}
        playsInline
      />
      
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isMuted ? <VolumeX className="w-4 h-4 text-white/50" /> : <Volume2 className="w-4 h-4 text-white" />}
      </div>
    </div>
  );
};

export const MultiPlayer: React.FC<MultiPlayerProps> = ({ 
  channels, 
  onClose, 
  onSingleView,
  themeColor = '#ef4444',
  customProxyUrl
}) => {
  const [activeChannelIndex, setActiveChannelIndex] = useState(0);
  const okPressCount = useRef(0);
  const okPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSelect = (index: number) => {
    if (activeChannelIndex === index) {
      // If already active, increment count for double-action
      okPressCount.current += 1;
      if (okPressCount.current === 2) {
        onSingleView(channels[index]);
        return;
      }
      
      if (okPressTimer.current) clearTimeout(okPressTimer.current);
      okPressTimer.current = setTimeout(() => {
        okPressCount.current = 0;
      }, 500);
    } else {
      // First click on a different channel
      setActiveChannelIndex(index);
      okPressCount.current = 1; // Start count for this channel
      
      if (okPressTimer.current) clearTimeout(okPressTimer.current);
      okPressTimer.current = setTimeout(() => {
        okPressCount.current = 0;
      }, 500);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let key = e.key;
      if (key === 'Select' || key === 'OK' || key === 'Enter') {
        e.preventDefault();
        handleSelect(activeChannelIndex);
      }

      if (key === 'Tab') {
        e.preventDefault();
        key = e.shiftKey ? 'ArrowLeft' : 'ArrowRight';
      }

      if (key === 'ArrowLeft') {
        setActiveChannelIndex(prev => (prev - 1 + channels.length) % channels.length);
        okPressCount.current = 0;
      }
      if (key === 'ArrowRight') {
        setActiveChannelIndex(prev => (prev + 1) % channels.length);
        okPressCount.current = 0;
      }
      if (key === 'ArrowUp') {
        setActiveChannelIndex(prev => Math.max(0, prev - 3));
        okPressCount.current = 0;
      }
      if (key === 'ArrowDown') {
        setActiveChannelIndex(prev => Math.min(channels.length - 1, prev + 3));
        okPressCount.current = 0;
      }
      if (key === 'Escape' || key === 'Backspace') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (okPressTimer.current) clearTimeout(okPressTimer.current);
    };
  }, [channels, activeChannelIndex, onSingleView, onClose]);

  const gridCols = channels.length <= 1 ? 'grid-cols-1' : channels.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-2 rounded-xl">
            <Maximize2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-black uppercase tracking-widest italic">Multi Kanal Görünümü</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-tighter">
              {channels.length} Kanal Aktif • {channels[activeChannelIndex]?.name} Ses Açık
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-3 rounded-full bg-white/5 hover:bg-red-600 text-white transition-all border border-white/10"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className={cn("flex-1 grid gap-4", gridCols)}>
        {channels.map((channel, index) => (
          <SingleVideo
            key={channel.id}
            url={channel.urls[0]}
            isMuted={index !== activeChannelIndex}
            customProxyUrl={customProxyUrl}
            isActive={index === activeChannelIndex}
            onClick={() => handleSelect(index)}
          />
        ))}
      </div>

      <div className="text-center py-2">
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
          İki kez OK tuşuna basarak tek ekrana dönebilirsiniz
        </p>
      </div>
    </div>
  );
};
