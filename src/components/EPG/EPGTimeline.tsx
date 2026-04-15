import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Play, Info, ChevronLeft, ChevronRight, Calendar, Search, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EPGData, EPGProgram } from '../../utils/epgParser';
import { M3UChannel } from '../../types';
import { FixedSizeList as List, areEqual } from 'react-window';

interface EPGTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  epgData: EPGData | null;
  channels: M3UChannel[];
  now: Date;
  onSelectChannel: (channel: M3UChannel) => void;
  themeColor: string;
}

// Memoized Row component for performance
const TimelineRow = memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: any }) => {
  const { filteredChannels, epgData, selectedChannelIndex, scrollX, now, themeColor, getPosition, getWidth, onSelectChannel, onClose, setFocusedProgram } = data;
  const channel = filteredChannels[index];
  if (!channel) return null;

  const channelId = channel.tvgId || channel.name;
  const programs = epgData?.programs[channelId] || [];
  const isSelected = selectedChannelIndex === index;

  // Constants from parent
  const pixelsPerHour = 600;
  const channelWidth = 240;

  return (
    <div style={style} className="flex border-b border-white/5">
      {/* Channel Info */}
      <div 
        className={cn(
          "w-[240px] shrink-0 flex items-center gap-4 px-6 border-r border-white/10 transition-all z-20 bg-zinc-900/80 backdrop-blur-sm cursor-pointer hover:bg-white/5",
          isSelected ? "bg-white/10 ring-inset ring-1 ring-white/20" : "opacity-80"
        )}
        onClick={() => {
          onSelectChannel(channel);
          onClose();
        }}
        onMouseEnter={() => {
          // Update selected index on hover for mouse users
          data.setSelectedChannelIndex(index);
        }}
      >
        <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
          {channel.logo ? (
            <img src={channel.logo} alt="" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-xs font-black opacity-20">{channel.name.substring(0, 2)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-white truncate">{channel.name}</h3>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">
            {channel.group || 'Genel'}
          </p>
        </div>
      </div>

      {/* Programs Grid Row */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          className="absolute inset-0 flex items-center"
          style={{ transform: `translateX(-${scrollX}px)` }}
        >
          {programs.map((program: EPGProgram, progIdx: number) => {
            const left = getPosition(program.start);
            const width = getWidth(program.start, program.stop);
            const isCurrent = now >= program.start && now <= program.stop;
            const isPast = program.stop < now;

            // Only render if visible in viewport (rough check)
            if (left + width < scrollX || left > scrollX + window.innerWidth) return null;

            return (
              <motion.div
                key={progIdx}
                className={cn(
                  "absolute top-2 bottom-2 rounded-2xl border p-4 flex flex-col justify-between transition-all cursor-pointer group",
                  isCurrent ? "bg-white/15 border-white/20 shadow-lg" : "bg-white/5 border-white/5 hover:bg-white/10",
                  isPast && "opacity-40 grayscale-[0.5]",
                  isSelected && isCurrent && "ring-2 ring-white/30"
                )}
                style={{ left, width: Math.max(width - 6, 60) }}
                onClick={() => {
                  onSelectChannel(channel);
                  onClose();
                }}
                onMouseEnter={() => setFocusedProgram(program)}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded",
                      isCurrent ? "bg-white/20 text-white" : "bg-black/20 text-zinc-500"
                    )}>
                      {program.start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isCurrent && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">Canlı</span>
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-white truncate leading-tight group-hover:whitespace-normal">
                    {program.title}
                  </h4>
                </div>

                {isCurrent && (
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((now.getTime() - program.start.getTime()) / (program.stop.getTime() - program.start.getTime())) * 100}%` }}
                      className="h-full" 
                      style={{ backgroundColor: themeColor }} 
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}, areEqual);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState({ start: new Date(), end: new Date() });
  const [focusedProgram, setFocusedProgram] = useState<EPGProgram | null>(null);
  const [focusedTime, setFocusedTime] = useState<Date>(new Date(now));
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);

  // Constants for layout
  const pixelsPerHour = 600;
  const channelWidth = 240;
  const rowHeight = 100;

  // Calculate time range (24 hours starting from 4 hours ago)
  useEffect(() => {
    const start = new Date(now);
    start.setHours(now.getHours() - 4, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 28); // 28 hours total
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

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    return channels.filter(ch => 
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.group?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  const getPosition = useCallback((date: Date) => {
    const diffMs = date.getTime() - timeRange.start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours * pixelsPerHour;
  }, [timeRange.start]);

  const getWidth = useCallback((start: Date, stop: Date) => {
    const diffMs = stop.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours * pixelsPerHour;
  }, []);

  const nowPosition = getPosition(now);

  // Auto-scroll to "now" on open
  useEffect(() => {
    if (isOpen && nowPosition > 0) {
      const targetScroll = nowPosition - (window.innerWidth - channelWidth) / 3;
      setScrollX(Math.max(0, targetScroll));
      setFocusedTime(new Date(now));
    }
  }, [isOpen, nowPosition, now]);

  // Update focused program based on focusedTime and selectedChannelIndex
  useEffect(() => {
    if (!isOpen || !epgData) return;
    const channel = filteredChannels[selectedChannelIndex];
    if (!channel) return;
    const channelId = channel.tvgId || channel.name;
    const programs = epgData.programs[channelId] || [];
    const program = programs.find(p => p.start <= focusedTime && p.stop >= focusedTime);
    if (program) {
      setFocusedProgram(program);
      
      // Ensure the focused program is visible
      const left = getPosition(program.start);
      const width = getWidth(program.start, program.stop);
      const viewportWidth = window.innerWidth - channelWidth;
      
      if (left < scrollX) {
        setScrollX(left - 20);
      } else if (left + width > scrollX + viewportWidth) {
        setScrollX(left + width - viewportWidth + 20);
      }
    }
  }, [selectedChannelIndex, focusedTime, filteredChannels, epgData, isOpen, getPosition, getWidth, scrollX]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedChannelIndex(prev => {
            const next = Math.max(0, prev - 1);
            listRef.current?.scrollToItem(next, 'smart');
            return next;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedChannelIndex(prev => {
            const next = Math.min(filteredChannels.length - 1, prev + 1);
            listRef.current?.scrollToItem(next, 'smart');
            return next;
          });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedTime(prev => {
            const newTime = new Date(prev.getTime() - 15 * 60 * 1000); // Move back 15 mins
            return newTime < timeRange.start ? timeRange.start : newTime;
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedTime(prev => {
            const newTime = new Date(prev.getTime() + 15 * 60 * 1000); // Move forward 15 mins
            return newTime > timeRange.end ? timeRange.end : newTime;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredChannels[selectedChannelIndex]) {
            onSelectChannel(filteredChannels[selectedChannelIndex]);
            onClose();
          }
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredChannels, selectedChannelIndex, onSelectChannel, onClose, timeRange]);

  const listData = useMemo(() => ({
    filteredChannels,
    epgData,
    selectedChannelIndex,
    scrollX,
    now,
    themeColor,
    getPosition,
    getWidth,
    onSelectChannel,
    onClose,
    setFocusedProgram,
    setSelectedChannelIndex
  }), [filteredChannels, epgData, selectedChannelIndex, scrollX, now, themeColor, getPosition, getWidth, onSelectChannel, onClose, setSelectedChannelIndex]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden"
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
        <div 
          className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-30"
          style={{ backgroundColor: themeColor }}
        />
      </div>

      {/* Header Section */}
      <div className="h-32 shrink-0 flex items-center justify-between px-12 z-10 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl" style={{ backgroundColor: themeColor }}>
              <Calendar className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">Smart Rehber</h1>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em] mt-1">İnteraktif Yayın Akışı</p>
            </div>
          </div>

          <div className="h-12 w-px bg-white/10 mx-4" />

          <div className="flex flex-col">
            <span className="text-xl font-black text-white">
              {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Kanal veya Kategori Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-8 w-[400px] text-sm font-bold focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all placeholder:text-zinc-600"
            />
          </div>

          <button
            onClick={() => {
              const targetScroll = nowPosition - (window.innerWidth - channelWidth) / 3;
              setScrollX(Math.max(0, targetScroll));
              setFocusedTime(new Date(now));
            }}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
          >
            <RefreshCw size={18} className="text-zinc-400 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-xs font-black uppercase tracking-widest text-white">Şu An'a Git</span>
          </button>

          <button
            onClick={onClose}
            className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 flex items-center justify-center transition-all group"
          >
            <X size={28} className="text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Time Header (Sticky) */}
        <div className="h-[60px] flex shrink-0 z-30 bg-zinc-900/90 backdrop-blur-xl border-b border-white/10">
          <div className="w-[240px] shrink-0 border-r border-white/10 flex items-center px-6">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Kanal Listesi</span>
          </div>
          <div className="flex-1 relative overflow-hidden">
            {/* Horizontal Scroll Buttons for Mouse/Touch */}
            <div className="absolute inset-y-0 left-0 z-50 flex items-center">
              <button 
                onClick={() => setScrollX(prev => Math.max(0, prev - 300))}
                className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-r-xl border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 z-50 flex items-center">
              <button 
                onClick={() => setScrollX(prev => prev + 300)}
                className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-l-xl border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <div 
              className="absolute inset-0 flex items-center"
              style={{ transform: `translateX(-${scrollX}px)` }}
            >
              {hours.map((hour, idx) => (
                <div
                  key={idx}
                  className="absolute border-l border-white/5 h-full flex items-center pl-4"
                  style={{ left: getPosition(hour), width: pixelsPerHour }}
                >
                  <span className="text-xs font-black text-zinc-400 font-mono">
                    {hour.getHours().toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Virtualized Grid */}
        <div className="flex-1 relative">
          {/* Now Indicator Line (Global) */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 z-40 pointer-events-none"
            style={{ 
              left: nowPosition + channelWidth - scrollX, 
              backgroundColor: themeColor,
              display: (nowPosition + channelWidth - scrollX > channelWidth) ? 'block' : 'none'
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: themeColor }} />
          </div>

          {/* Focused Time Indicator (Vertical line showing where the cursor is) */}
          <div 
            className="absolute top-0 bottom-0 w-px z-30 pointer-events-none border-l border-dashed border-white/20"
            style={{ 
              left: getPosition(focusedTime) + channelWidth - scrollX,
              display: (getPosition(focusedTime) + channelWidth - scrollX > channelWidth) ? 'block' : 'none'
            }}
          />

          <List
            ref={listRef}
            height={window.innerHeight - 32 - 60 - 64} // Adjust for header, time header, and footer
            itemCount={filteredChannels.length}
            itemSize={rowHeight}
            width={window.innerWidth}
            className="no-scrollbar"
            itemData={listData}
          >
            {TimelineRow}
          </List>
        </div>
      </div>

      {/* Footer / Program Detail Bar */}
      <AnimatePresence mode="wait">
        {focusedProgram && (
          <motion.div
            key={focusedProgram.title}
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="h-24 bg-zinc-900/95 border-t border-white/10 z-50 flex items-center px-12 gap-8 backdrop-blur-2xl"
          >
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <Clock className="text-zinc-400" size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-white">
                  {focusedProgram.start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {focusedProgram.stop.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Program Saati</span>
              </div>
            </div>

            <div className="h-10 w-px bg-white/10" />

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-white truncate italic uppercase tracking-tight">{focusedProgram.title}</h2>
              <p className="text-sm text-zinc-400 line-clamp-1 font-medium italic">
                {focusedProgram.description || 'Bu program için detaylı açıklama bulunmuyor.'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <Info size={16} className="text-zinc-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Detaylar için Enter</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Hints */}
      {!focusedProgram && (
        <div className="h-16 bg-black/80 border-t border-white/5 flex items-center justify-center gap-12 px-12 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="px-2 py-1 bg-white/10 rounded border border-white/10 text-white">↑</div>
              <div className="px-2 py-1 bg-white/10 rounded border border-white/10 text-white">↓</div>
            </div>
            <span>Kanal Seçimi</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="px-2 py-1 bg-white/10 rounded border border-white/10 text-white">←</div>
              <div className="px-2 py-1 bg-white/10 rounded border border-white/10 text-white">→</div>
            </div>
            <span>Zaman Kaydırma</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-white/10 rounded border border-white/10 text-white">ENTER</div>
            <span>İzle</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-white/10 rounded border border-white/10 text-white">BACK</div>
            <span>Kapat</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

