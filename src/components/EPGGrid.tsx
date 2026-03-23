import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Calendar, Bell, BellOff, ChevronLeft, ChevronRight, Play, Search, Info, Tv } from 'lucide-react';
import { M3UChannel } from '../utils/m3uParser';
import { EPGData, EPGProgram } from '../utils/epgParser';
import { PreviewPlayer } from './PreviewPlayer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EPGGridProps {
  channels: M3UChannel[];
  epgData: EPGData | null;
  onClose: () => void;
  onPlay: (channel: M3UChannel) => void;
  themeColor: string;
  uiMode: 'modern' | 'classic' | 'minimalist';
  customProxyUrl?: string;
}

const HOUR_WIDTH = 400; // Pixels per hour
const CHANNEL_HEIGHT = 80;
const HEADER_HEIGHT = 100;
const CHANNEL_LIST_WIDTH = 250;

export const EPGGrid: React.FC<EPGGridProps> = ({
  channels,
  epgData,
  onClose,
  onPlay,
  themeColor,
  uiMode,
  customProxyUrl
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [reminders, setReminders] = useState<string[]>(() => {
    const saved = localStorage.getItem('epg_reminders');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<EPGProgram | null>(null);
  const [activeChannelIndex, setActiveChannelIndex] = useState(0);
  const [activeProgramIndex, setActiveProgramIndex] = useState(0);
  const [hoveredChannel, setHoveredChannel] = useState<M3UChannel | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelListRef = useRef<HTMLDivElement>(null);
  const programsContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const filteredChannels = useMemo(() => {
    return channels.filter(ch => 
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ch.group || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedProgram) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          setSelectedProgram(null);
          return;
        }
        return;
      }

      let key = e.key;
      if (key === 'Select' || key === 'OK') key = 'Enter';
      if (key === 'Back' || key === 'GoBack' || key === 'XF86Back') key = 'Backspace';
      if (key === 'Tab') {
        e.preventDefault();
        key = e.shiftKey ? 'ArrowLeft' : 'ArrowRight';
      }

      if (key === 'Escape' || key === 'Backspace') {
        onClose();
        return;
      }

      const currentChannel = filteredChannels[activeChannelIndex];
      const programs = currentChannel ? getProgramsForChannel(currentChannel) : [];

      switch (key) {
        case 'ArrowUp':
          setActiveChannelIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          setActiveChannelIndex(prev => Math.min(filteredChannels.length - 1, prev + 1));
          break;
        case 'ArrowLeft':
          setActiveProgramIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          setActiveProgramIndex(prev => Math.min(programs.length - 1, prev + 1));
          break;
        case 'Enter':
          if (programs[activeProgramIndex]) {
            setSelectedProgram(programs[activeProgramIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredChannels, activeChannelIndex, activeProgramIndex, selectedProgram, onClose]);

  // Scroll into view when active indices change
  useEffect(() => {
    const channelElement = channelListRef.current?.children[activeChannelIndex] as HTMLElement;
    if (channelElement) {
      channelElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    const currentChannel = filteredChannels[activeChannelIndex];
    if (currentChannel) {
      setHoveredChannel(currentChannel);
      const programs = getProgramsForChannel(currentChannel);
      const program = programs[activeProgramIndex];
      if (program && scrollRef.current) {
        const startOffset = getTimeOffset(program.start);
        const scrollPos = scrollRef.current.scrollLeft;
        const viewWidth = scrollRef.current.clientWidth;

        if (startOffset < scrollPos || startOffset + 200 > scrollPos + viewWidth) {
          scrollRef.current.scrollTo({ left: startOffset - 100, behavior: 'smooth' });
        }
      }
    }
  }, [activeChannelIndex, activeProgramIndex, filteredChannels]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Initial scroll to current time and select current program
  useEffect(() => {
    if (scrollRef.current) {
      const offset = getTimeOffset(currentTime);
      scrollRef.current.scrollLeft = offset - 200;
    }

    const currentChannel = filteredChannels[0];
    if (currentChannel) {
      const programs = getProgramsForChannel(currentChannel);
      const currentIdx = programs.findIndex(p => currentTime >= p.start && currentTime <= p.stop);
      if (currentIdx !== -1) {
        setActiveProgramIndex(currentIdx);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('epg_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Generate mock EPG data if none exists
  const getProgramsForChannel = (channel: M3UChannel): EPGProgram[] => {
    const realPrograms = epgData?.programs[channel.id] || [];
    if (realPrograms.length > 0) return realPrograms;

    // Generate mock programs for the next 24 hours
    const mockPrograms: EPGProgram[] = [];
    const baseDate = new Date(startTime);
    baseDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 48; i++) {
      const start = new Date(baseDate.getTime() + i * 30 * 60000);
      const stop = new Date(start.getTime() + 30 * 60000);
      
      // Use channel name to seed mock titles
      const mockTitles = [
        'Haber Bülteni', 'Spor Gündemi', 'Sinema Kuşağı', 'Belgesel Zamanı', 
        'Müzik Listesi', 'Talk Show', 'Yarışma Heyecanı', 'Çizgi Film',
        'Hava Durumu', 'Ekonomi Dünyası', 'Teknoloji Turu', 'Sağlık Rehberi'
      ];
      const titleIndex = (channel.name.length + i) % mockTitles.length;
      
      mockPrograms.push({
        start,
        stop,
        title: `${mockTitles[titleIndex]} (${channel.name})`,
        description: 'Bu bir otomatik oluşturulmuş yayın akışı bilgisidir.',
        channelId: channel.id
      });
    }
    return mockPrograms;
  };

  const getTimeOffset = (date: Date) => {
    const diffMs = date.getTime() - startTime.getTime();
    return (diffMs / 3600000) * HOUR_WIDTH;
  };

  const toggleReminder = (program: EPGProgram) => {
    const id = `${program.channelId}-${program.start.getTime()}`;
    setReminders(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(startTime.getTime() + i * 3600000);
    return d;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-zinc-950 text-white flex flex-col overflow-hidden select-none"
    >
      {/* Header */}
      <div className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-zinc-400" />
            <span className="text-xl font-black tracking-tighter uppercase">Yayın Akışı</span>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Kanal ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full py-2 pl-12 pr-6 text-sm focus:outline-none focus:border-white/20 w-64 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-bold tabular-nums">
              {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-full hover:bg-white/10 transition-all border border-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Channel List (Fixed Sidebar) */}
        <div className="w-[250px] border-right border-white/10 bg-zinc-900/30 z-20 overflow-hidden flex flex-col">
          <div className="h-[60px] border-b border-white/10 flex items-center px-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Kanallar</span>
          </div>
          <div ref={channelListRef} className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
            {filteredChannels.map((channel, idx) => (
              <div
                key={channel.id}
                className={cn(
                  "h-[80px] border-b border-white/5 flex items-center px-4 gap-4 hover:bg-white/5 transition-all cursor-pointer group",
                  activeChannelIndex === idx && "bg-white/10 border-l-4"
                )}
                style={{ borderLeftColor: activeChannelIndex === idx ? themeColor : 'transparent' }}
                onClick={() => {
                  setActiveChannelIndex(idx);
                  onPlay(channel);
                }}
                onMouseEnter={() => {
                  setActiveChannelIndex(idx);
                  setHoveredChannel(channel);
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/5 group-hover:border-white/20 transition-all">
                  <img
                    src={channel.logo || `https://picsum.photos/seed/${channel.name}/100/100`}
                    alt={channel.name}
                    className="w-full h-full object-contain p-1"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate group-hover:text-white transition-colors">{channel.name}</div>
                  <div className="text-[10px] text-zinc-500 truncate uppercase tracking-tighter">{channel.group}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Grid (Scrollable) */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar no-scrollbar"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseUp}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {/* Time Header */}
          <div className="h-[60px] border-b border-white/10 flex sticky top-0 bg-zinc-950 z-10">
            {hours.map((hour, i) => (
              <div 
                key={i} 
                className="flex-shrink-0 border-r border-white/5 flex items-center justify-center text-xs font-black text-zinc-500"
                style={{ width: HOUR_WIDTH }}
              >
                {hour.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            ))}
          </div>

          {/* Programs Grid */}
          <div className="relative overflow-y-auto h-[calc(100%-60px)] no-scrollbar">
            {/* Current Time Indicator */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
              style={{ left: getTimeOffset(currentTime) }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            </div>

            {filteredChannels.map((channel, cIdx) => {
              const programs = getProgramsForChannel(channel);
              return (
                <div key={channel.id} className="h-[80px] border-b border-white/5 relative flex">
                  {programs.map((program, pIdx) => {
                    const startOffset = getTimeOffset(program.start);
                    const stopOffset = getTimeOffset(program.stop);
                    const width = stopOffset - startOffset;
                    
                    // Only render if visible in the 24h window
                    if (stopOffset < 0 || startOffset > HOUR_WIDTH * 24) return null;

                    const isCurrent = currentTime >= program.start && currentTime <= program.stop;
                    const isFuture = program.start > currentTime;
                    const reminderId = `${program.channelId}-${program.start.getTime()}`;
                    const hasReminder = reminders.includes(reminderId);
                    const isActive = activeChannelIndex === cIdx && activeProgramIndex === pIdx;

                    return (
                      <div
                        key={pIdx}
                        className={cn(
                          "absolute top-1 bottom-1 rounded-xl border transition-all cursor-pointer group flex flex-col p-3 overflow-hidden",
                          isCurrent 
                            ? "bg-white/10 border-white/20 shadow-xl z-10" 
                            : "bg-zinc-900/50 border-white/5 hover:bg-white/5 hover:border-white/10",
                          isActive && "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 z-20 scale-[1.02]"
                        )}
                        style={{ 
                          left: Math.max(0, startOffset), 
                          width: Math.max(10, width - 4) 
                        }}
                        onClick={() => {
                          setActiveChannelIndex(cIdx);
                          setActiveProgramIndex(pIdx);
                          setSelectedProgram(program);
                        }}
                        onMouseEnter={() => {
                          setActiveChannelIndex(cIdx);
                          setActiveProgramIndex(pIdx);
                          setHoveredChannel(channel);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-black text-zinc-500 tabular-nums">
                            {program.start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isFuture && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReminder(program);
                              }}
                              className={cn(
                                "p-1 rounded-full transition-all",
                                hasReminder ? "text-yellow-500" : "text-zinc-600 hover:text-zinc-400"
                              )}
                            >
                              {hasReminder ? <Bell className="w-3 h-3 fill-current" /> : <BellOff className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        <div className="text-xs font-bold truncate text-white/90 group-hover:text-white">
                          {program.title}
                        </div>
                        
                        {isCurrent && (
                          <div className="mt-auto h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-white/40"
                              initial={{ width: 0 }}
                              animate={{ 
                                width: `${((currentTime.getTime() - program.start.getTime()) / (program.stop.getTime() - program.start.getTime())) * 100}%` 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Preview Player */}
      <AnimatePresence>
        {hoveredChannel && !selectedProgram && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 w-80 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-[300] bg-black"
          >
            <PreviewPlayer urls={hoveredChannel.urls || [hoveredChannel.url]} customProxyUrl={customProxyUrl} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 p-1 flex items-center justify-center">
                {hoveredChannel.logo ? (
                  <img src={hoveredChannel.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <Tv className="w-6 h-6 text-zinc-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate text-white">{hoveredChannel.name}</div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-widest">Canlı Önizleme</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Program Details Modal */}
      <AnimatePresence>
        {selectedProgram && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setSelectedProgram(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[40px] p-10 max-w-2xl w-full shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedProgram(null)}
                className="absolute top-8 right-8 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <span className="px-4 py-1.5 rounded-full bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest border border-white/5">
                  {selectedProgram.start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {selectedProgram.stop.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {currentTime >= selectedProgram.start && currentTime <= selectedProgram.stop && (
                  <span className="px-4 py-1.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">
                    Şu An Yayında
                  </span>
                )}
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter leading-tight">
                {selectedProgram.title}
              </h2>

              <p className="text-xl text-white/60 leading-relaxed mb-10">
                {selectedProgram.description || 'Bu program için detaylı açıklama bulunmuyor.'}
              </p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const channel = channels.find(ch => ch.id === selectedProgram.channelId);
                    if (channel) onPlay(channel);
                    setSelectedProgram(null);
                    onClose();
                  }}
                  style={{ backgroundColor: themeColor }}
                  className="flex-1 flex items-center justify-center gap-3 py-5 rounded-full text-white font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Kanalı İzle
                </button>
                
                {selectedProgram.start > currentTime && (
                  <button
                    onClick={() => toggleReminder(selectedProgram)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-3 py-5 rounded-full font-black text-lg border-2 transition-all",
                      reminders.includes(`${selectedProgram.channelId}-${selectedProgram.start.getTime()}`)
                        ? "bg-yellow-500 text-black border-yellow-500"
                        : "bg-transparent text-white border-white/20 hover:border-white/40"
                    )}
                  >
                    {reminders.includes(`${selectedProgram.channelId}-${selectedProgram.start.getTime()}`) ? (
                      <>
                        <BellOff className="w-6 h-6" />
                        Hatırlatıcıyı Kaldır
                      </>
                    ) : (
                      <>
                        <Bell className="w-6 h-6" />
                        Hatırlatıcı Kur
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
