import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, ChevronRight, ChevronLeft, Search, X, Play, Info, Tv, RefreshCw } from 'lucide-react';
import { M3UChannel } from '../../utils/m3uParser';
import { EPGData, EPGProgram } from '../../utils/epgParser';
import { cn } from '../../lib/utils';
import { FixedSizeList as List, areEqual } from 'react-window';

interface AdvancedEPGProps {
  channels: M3UChannel[];
  epgData: EPGData | null;
  onClose: () => void;
  onPlay: (channel: M3UChannel) => void;
  themeColor: string;
  keyMap: any;
}

// Memoized Channel Row for performance
const ChannelRow = memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: any }) => {
  const { filteredChannels, selectedChannelId, setSelectedChannelId, themeColor } = data;
  const channel = filteredChannels[index];
  if (!channel) return null;

  return (
    <div style={style} className="px-4">
      <button
        onClick={() => setSelectedChannelId(channel.id)}
        className={cn(
          "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group",
          selectedChannelId === channel.id ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
        )}
      >
        <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
          {channel.logo ? (
            <img src={channel.logo} alt="" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-black opacity-20">
              {channel.name.substring(0, 2)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate text-white">{channel.name}</h3>
          <p className="text-[10px] text-white/40 uppercase tracking-widest truncate">
            {channel.group || 'Genel'}
          </p>
        </div>
        {selectedChannelId === channel.id && (
          <div className="w-2 h-2 rounded-full shadow-lg" style={{ backgroundColor: themeColor }} />
        )}
      </button>
    </div>
  );
}, areEqual);

export const AdvancedEPG: React.FC<AdvancedEPGProps> = ({ channels, epgData, onClose, onPlay, themeColor, keyMap }) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(channels[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const now = new Date();
  const listRef = useRef<List>(null);
  const programsContainerRef = useRef<HTMLDivElement>(null);

  const filteredChannels = useMemo(() => {
    return channels.filter(ch => 
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.group?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  const selectedChannelIndex = useMemo(() => 
    filteredChannels.findIndex(ch => ch.id === selectedChannelId),
  [filteredChannels, selectedChannelId]);

  const selectedChannel = useMemo(() => 
    channels.find(ch => ch.id === selectedChannelId), 
  [channels, selectedChannelId]);

  const programs = useMemo(() => {
    if (!selectedChannel || !epgData) return [];
    return epgData.programs[selectedChannel.tvgId || selectedChannel.name] || [];
  }, [selectedChannel, epgData]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const getProgress = (start: Date, stop: Date) => {
    const total = stop.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const scrollToNow = useCallback(() => {
    const liveProgramElement = document.getElementById('live-program');
    if (liveProgramElement) {
      liveProgramElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (programsContainerRef.current) {
      programsContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (selectedChannelId) {
      // Auto scroll to live program when channel changes
      const timer = setTimeout(scrollToNow, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedChannelId, scrollToNow]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      const rawKey = e.key;
      let key = rawKey;

      if (rawKey === keyMap.up) key = 'ArrowUp';
      else if (rawKey === keyMap.down) key = 'ArrowDown';
      else if (rawKey === keyMap.enter || rawKey === 'OK' || rawKey === 'Select') key = 'Enter';
      else if (rawKey === keyMap.back || rawKey === 'Escape' || rawKey === 'Backspace') key = 'Backspace';

      switch (key) {
        case 'ArrowUp':
          e.preventDefault();
          if (selectedChannelIndex > 0) {
            const nextIndex = selectedChannelIndex - 1;
            setSelectedChannelId(filteredChannels[nextIndex].id);
            listRef.current?.scrollToItem(nextIndex, 'smart');
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (selectedChannelIndex < filteredChannels.length - 1) {
            const nextIndex = selectedChannelIndex + 1;
            setSelectedChannelId(filteredChannels[nextIndex].id);
            listRef.current?.scrollToItem(nextIndex, 'smart');
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedChannel) {
            onPlay(selectedChannel);
          }
          break;
        case 'Backspace':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChannelIndex, filteredChannels, selectedChannel, onPlay, onClose]);

  const itemData = useMemo(() => ({
    filteredChannels,
    selectedChannelId,
    setSelectedChannelId,
    themeColor
  }), [filteredChannels, selectedChannelId, themeColor]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden"
    >
      {/* Ambient Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div 
          className="absolute top-0 right-0 w-[60vw] h-[60vw] rounded-full blur-[150px]"
          style={{ backgroundColor: themeColor }}
        />
      </div>

      {/* Header */}
      <div className="h-28 border-b border-white/5 flex items-center justify-between px-12 z-10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl" style={{ backgroundColor: themeColor }}>
            <Calendar className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-none">Gelişmiş Rehber</h1>
            <p className="text-xs font-bold text-white/40 uppercase tracking-[0.3em] mt-1">Kanal ve Program Detayları</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Kanal Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-8 w-96 text-sm font-bold focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all placeholder:text-white/20"
            />
          </div>
          <button 
            onClick={onClose}
            className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/40 transition-all group"
          >
            <X size={28} className="text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden z-10">
        {/* Channel List Sidebar */}
        <div className="w-[400px] border-r border-white/5 flex flex-col bg-black/20">
          <div className="p-6 border-b border-white/5">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Kanal Listesi ({filteredChannels.length})</span>
          </div>
          <div className="flex-1 py-4">
            <List
              ref={listRef}
              height={window.innerHeight - 112 - 64} // Header + padding
              itemCount={filteredChannels.length}
              itemSize={80}
              width={400}
              className="no-scrollbar"
              itemData={itemData}
            >
              {ChannelRow}
            </List>
          </div>
        </div>

        {/* Program Details Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-16 bg-gradient-to-b from-transparent to-black/40" ref={programsContainerRef}>
          {selectedChannel ? (
            <div className="max-w-5xl mx-auto space-y-16">
              {/* Channel Hero */}
              <div className="flex items-end gap-12">
                <motion.div 
                  key={selectedChannel.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-56 h-56 rounded-[50px] bg-white/5 border border-white/10 p-10 flex items-center justify-center shadow-2xl relative group"
                >
                  <div className="absolute inset-0 bg-white/5 rounded-[50px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                   {selectedChannel.logo ? (
                    <img src={selectedChannel.logo} alt="" className="w-full h-full object-contain relative z-10" referrerPolicy="no-referrer" />
                  ) : (
                    <Tv size={80} className="text-white/20 relative z-10" />
                  )}
                </motion.div>
                <div className="flex-1 space-y-6">
                  <motion.h2 
                    key={selectedChannel.name}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-6xl font-black tracking-tighter italic uppercase text-white"
                  >
                    {selectedChannel.name}
                  </motion.h2>
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => onPlay(selectedChannel)}
                      className="px-10 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-4 transition-all hover:scale-105 shadow-xl"
                      style={{ backgroundColor: themeColor }}
                    >
                      <Play size={24} fill="currentColor" className="text-white" /> 
                      <span className="text-white">Hemen İzle</span>
                    </button>
                    <div className="px-8 py-5 rounded-2xl bg-white/5 border border-white/10 font-black text-sm uppercase tracking-[0.2em] text-white/60">
                      {selectedChannel.group || 'Genel Kategori'}
                    </div>
                    <button 
                      onClick={scrollToNow}
                      className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all group"
                      title="Şu Anki Programa Git"
                    >
                      <RefreshCw size={24} className="text-white/40 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Programs List */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.4em]">Yayın Akışı</h4>
                  <div className="h-px flex-1 bg-white/5 mx-8" />
                </div>
                
                <div className="space-y-6">
                  {programs.length > 0 ? programs.map((program, idx) => {
                    const isLive = program.start <= now && program.stop >= now;
                    const isPast = program.stop < now;
                    
                    return (
                      <motion.div 
                        key={idx}
                        id={isLive ? 'live-program' : undefined}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "relative p-8 rounded-[32px] border transition-all group",
                          isLive ? "bg-white/10 border-white/20 shadow-2xl ring-1 ring-white/10" : "bg-white/5 border-white/5 opacity-60 hover:opacity-100 hover:bg-white/10",
                          isPast && "opacity-20 grayscale hover:grayscale-0"
                        )}
                      >
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-8">
                            <div className="flex flex-col items-center shrink-0">
                              <span className="text-2xl font-black text-white">{formatTime(program.start)}</span>
                              <div className="w-px h-6 bg-white/10 my-2" />
                              <span className="text-xs font-bold text-white/40">{formatTime(program.stop)}</span>
                            </div>
                            <div className="h-16 w-px bg-white/10 mx-2" />
                            <div className="space-y-2">
                              <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-white transition-colors">{program.title}</h3>
                              <p className="text-sm text-white/40 font-medium leading-relaxed max-w-2xl">
                                {program.description || 'Bu program için henüz bir açıklama girilmemiş.'}
                              </p>
                            </div>
                          </div>
                          {isLive && (
                            <div className="flex items-center gap-3 px-5 py-2 bg-red-500 rounded-full shadow-lg shadow-red-500/20">
                              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Canlı Yayın</span>
                            </div>
                          )}
                        </div>

                        {isLive && (
                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${getProgress(program.start, program.stop)}%` }}
                              className="h-full shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                              style={{ backgroundColor: themeColor }}
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  }) : (
                    <div className="py-20 text-center space-y-6 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                      <Clock size={64} className="mx-auto text-white/10" />
                      <p className="text-xl font-bold text-white/20 uppercase tracking-widest">Yayın akışı bilgisi bulunamadı</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/10 space-y-8">
              <div className="w-32 h-32 rounded-[40px] bg-white/5 border border-white/10 flex items-center justify-center">
                <Calendar size={64} strokeWidth={1} />
              </div>
              <div className="text-center">
                <p className="text-3xl font-black uppercase tracking-[0.3em]">Kanal Seçiniz</p>
                <p className="text-sm font-bold text-white/20 mt-2 uppercase tracking-widest">Yayın akışını görmek için soldan bir kanal seçin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
