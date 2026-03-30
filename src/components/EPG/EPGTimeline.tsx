import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Play, Info, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EPGData, EPGProgram } from '../../utils/epgParser';
import { M3UChannel } from '../../types';

interface EPGTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  epgData: EPGData | null;
  channels: M3UChannel[];
  now: Date;
  onSelectChannel: (channel: M3UChannel) => void;
  themeColor: string;
}

export const EPGTimeline: React.FC<EPGTimelineProps> = ({
  isOpen,
  onClose,
  epgData,
  channels,
  now,
  onSelectChannel,
  themeColor
}) => {
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timeRange, setTimeRange] = useState({ start: new Date(), end: new Date() });

  // Calculate time range (e.g., 6 hours before and 18 hours after now)
  useEffect(() => {
    const start = new Date(now);
    start.setHours(now.getHours() - 2, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 24);
    setTimeRange({ start, end });
  }, [now]);

  const hours = useMemo(() => {
    const h = [];
    const current = new Date(timeRange.start);
    while (current < timeRange.end) {
      h.push(new Date(current));
      current.setHours(current.getHours() + 1);
    }
    return h;
  }, [timeRange]);

  const pixelsPerHour = 400;
  const channelWidth = 200;
  const rowHeight = 80;

  const getPosition = (date: Date) => {
    const diffMs = date.getTime() - timeRange.start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours * pixelsPerHour;
  };

  const getWidth = (start: Date, stop: Date) => {
    const diffMs = stop.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours * pixelsPerHour;
  };

  const nowPosition = getPosition(now);

  useEffect(() => {
    if (isOpen) {
      // Center "now" on open
      setScrollX(nowPosition - (window.innerWidth - channelWidth) / 2);
    }
  }, [isOpen, nowPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setSelectedChannelIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          setSelectedChannelIndex(prev => Math.min(channels.length - 1, prev + 1));
          break;
        case 'ArrowLeft':
          setScrollX(prev => Math.max(0, prev - 100));
          break;
        case 'ArrowRight':
          setScrollX(prev => prev + 100);
          break;
        case 'Enter':
          onSelectChannel(channels[selectedChannelIndex]);
          onClose();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, channels, selectedChannelIndex, onSelectChannel, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="h-20 border-b border-white/10 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <Calendar className="w-6 h-6 text-white" style={{ color: themeColor }} />
          </div>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Yayın Akışı</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
              {now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-mono font-bold text-white">
              {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Channel List (Static) */}
        <div className="w-[200px] border-r border-white/10 bg-black/40 z-20 flex flex-col">
          <div className="h-12 border-b border-white/10 shrink-0" /> {/* Spacer for time header */}
          <div 
            className="flex-1 overflow-hidden"
            style={{ transform: `translateY(-${selectedChannelIndex * rowHeight}px)`, transition: 'transform 0.3s ease-out' }}
          >
            {channels.map((channel, idx) => (
              <div
                key={channel.id}
                className={cn(
                  "h-[80px] px-4 flex items-center gap-3 border-b border-white/5 transition-all",
                  selectedChannelIndex === idx ? "bg-white/10 scale-105 z-10" : "opacity-60"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/10">
                  <img src={channel.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <span className="text-xs font-bold text-white truncate">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Programs Grid (Scrollable) */}
        <div className="flex-1 overflow-hidden relative">
          {/* Time Header */}
          <div 
            className="h-12 border-b border-white/10 flex items-center relative bg-black/60 backdrop-blur-md z-10"
            style={{ transform: `translateX(-${scrollX}px)`, transition: 'transform 0.1s linear' }}
          >
            {hours.map((hour, idx) => (
              <div
                key={idx}
                className="absolute text-[10px] font-black text-zinc-500 uppercase tracking-widest border-l border-white/10 pl-2 h-6 flex items-center"
                style={{ left: getPosition(hour) }}
              >
                {hour.getHours().toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Programs Grid */}
          <div 
            className="absolute inset-0 top-12"
            style={{ 
              transform: `translate(-${scrollX}px, -${selectedChannelIndex * rowHeight}px)`,
              transition: 'transform 0.3s ease-out'
            }}
          >
            {/* Now Line */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 z-30 pointer-events-none"
              style={{ left: nowPosition, backgroundColor: themeColor }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ backgroundColor: themeColor }} />
            </div>

            {channels.map((channel, channelIdx) => {
              const channelId = channel.tvgId || channel.name;
              const programs = epgData?.programs[channelId] || [];
              
              return (
                <div key={channel.id} className="h-[80px] relative border-b border-white/5">
                  {programs.map((program, progIdx) => {
                    const left = getPosition(program.start);
                    const width = getWidth(program.start, program.stop);
                    const isCurrent = now >= program.start && now <= program.stop;

                    return (
                      <motion.div
                        key={progIdx}
                        className={cn(
                          "absolute top-2 bottom-2 rounded-xl border border-white/5 p-3 flex flex-col justify-between transition-all cursor-pointer group overflow-hidden",
                          isCurrent ? "bg-white/10 border-white/20" : "bg-white/5 hover:bg-white/10",
                          selectedChannelIndex === channelIdx && "ring-2 ring-white/10"
                        )}
                        style={{ left, width: Math.max(width - 4, 40) }}
                        onClick={() => {
                          onSelectChannel(channel);
                          onClose();
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-mono text-zinc-500">
                            {program.start.getHours().toString().padStart(2, '0')}:{program.start.getMinutes().toString().padStart(2, '0')}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-clip group-hover:whitespace-normal">
                            {program.title}
                          </h4>
                        </div>
                        {width > 150 && (
                          <p className="text-[10px] text-zinc-500 line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {program.description || 'Program detayı bulunmuyor.'}
                          </p>
                        )}
                        {isCurrent && (
                          <div className="absolute bottom-0 left-0 h-0.5 bg-white/20" style={{ width: '100%' }}>
                            <div 
                              className="h-full" 
                              style={{ 
                                backgroundColor: themeColor,
                                width: `${((now.getTime() - program.start.getTime()) / (program.stop.getTime() - program.start.getTime())) * 100}%`
                              }} 
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="h-16 border-t border-white/10 bg-black/80 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-8 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-white/10 border border-white/10" />
            <span>Geçmiş</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-white/20 border border-white/20" />
            <span>Gelecek</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2" style={{ borderColor: themeColor }} />
            <span>Şu An</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setScrollX(prev => Math.max(0, prev - 300))}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button 
            onClick={() => setScrollX(prev => prev + 300)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
