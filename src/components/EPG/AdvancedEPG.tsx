import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, ChevronRight, ChevronLeft, Search, X, Play, Info } from 'lucide-react';
import { M3UChannel } from '../../utils/m3uParser';
import { EPGData, EPGProgram } from '../../utils/epgParser';
import { cn } from '../../lib/utils';

interface AdvancedEPGProps {
  channels: M3UChannel[];
  epgData: EPGData | null;
  onClose: () => void;
  onPlay: (channel: M3UChannel) => void;
  themeColor: string;
}

export const AdvancedEPG: React.FC<AdvancedEPGProps> = ({ channels, epgData, onClose, onPlay, themeColor }) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(channels[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const now = new Date();

  const filteredChannels = useMemo(() => {
    return channels.filter(ch => 
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      epgData?.programs[ch.tvgId || ch.name]
    );
  }, [channels, searchQuery, epgData]);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col"
    >
      {/* Header */}
      <div className="h-24 border-b border-white/10 flex items-center justify-between px-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: themeColor }}>
            <Calendar className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Gelişmiş Yayın Akışı</h1>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Tüm Kanallar ve Programlar</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input 
              type="text"
              placeholder="Kanal Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 w-80 text-sm font-bold focus:outline-none focus:border-white/40 transition-all"
            />
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Channel List */}
        <div className="w-96 border-r border-white/10 overflow-y-auto no-scrollbar p-6 space-y-2">
          {filteredChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannelId(channel.id)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group",
                selectedChannelId === channel.id ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden flex-shrink-0 border border-white/5">
                {channel.logo ? (
                  <img src={channel.logo} alt="" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-black opacity-20">
                    {channel.name.substring(0, 2)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{channel.name}</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest truncate">
                  {channel.group || 'Genel'}
                </p>
              </div>
              {selectedChannelId === channel.id && (
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
              )}
            </button>
          ))}
        </div>

        {/* Program List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-12">
          {selectedChannel ? (
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="flex items-end gap-8">
                <div className="w-48 h-48 rounded-[40px] bg-black/40 border border-white/10 p-8 flex items-center justify-center">
                   {selectedChannel.logo ? (
                    <img src={selectedChannel.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <Tv size={64} className="opacity-20" />
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <h2 className="text-5xl font-black tracking-tighter italic uppercase">{selectedChannel.name}</h2>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => onPlay(selectedChannel)}
                      className="px-8 py-4 rounded-full font-black uppercase tracking-widest flex items-center gap-3 transition-all hover:scale-105"
                      style={{ backgroundColor: themeColor }}
                    >
                      <Play size={20} fill="currentColor" /> İzle
                    </button>
                    <div className="px-6 py-4 rounded-full bg-white/5 border border-white/10 font-bold text-sm uppercase tracking-widest">
                      {selectedChannel.group || 'Genel'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] mb-8">Yayın Akışı</h4>
                <div className="space-y-4">
                  {programs.map((program, idx) => {
                    const isLive = program.start <= now && program.stop >= now;
                    const isPast = program.stop < now;
                    
                    return (
                      <div 
                        key={idx}
                        className={cn(
                          "relative p-6 rounded-3xl border transition-all",
                          isLive ? "bg-white/10 border-white/20 ring-1 ring-white/10" : "bg-white/5 border-white/5 opacity-60",
                          isPast && "opacity-20 grayscale"
                        )}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center">
                              <span className="text-lg font-black">{formatTime(program.start)}</span>
                              <div className="w-px h-4 bg-white/20 my-1" />
                              <span className="text-xs font-bold text-white/40">{formatTime(program.stop)}</span>
                            </div>
                            <div className="h-12 w-px bg-white/10 mx-2" />
                            <div>
                              <h3 className="text-xl font-bold">{program.title}</h3>
                              <p className="text-sm text-white/60 line-clamp-1">{program.desc}</p>
                            </div>
                          </div>
                          {isLive && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Canlı</span>
                            </div>
                          )}
                        </div>

                        {isLive && (
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${getProgress(program.start, program.stop)}%` }}
                              className="h-full"
                              style={{ backgroundColor: themeColor }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-6">
              <Calendar size={120} strokeWidth={1} />
              <p className="text-2xl font-black uppercase tracking-widest">Kanal Seçiniz</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
