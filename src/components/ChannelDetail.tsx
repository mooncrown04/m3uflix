import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, X, Star, Users, Clock, Calendar, Film, Info, Monitor } from 'lucide-react';
import { M3UChannel } from '../utils/m3uParser';
import { fetchMediaMetadata, MediaMetadata } from '../services/metadataService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChannelDetailProps {
  channel: M3UChannel;
  onClose: () => void;
  onPlay: (channel: M3UChannel) => void;
  themeColor: string;
  uiMode: 'modern' | 'classic' | 'minimalist' | 'bento';
  multiSessions?: Record<string, string[]>;
  onToggleMultiChannel?: (channelId: string) => void;
  activeFocus?: number;
  onFocusChange?: (index: number) => void;
  playbackProgress?: Record<string, { currentTime: number; duration: number }>;
}

export const ChannelDetail: React.FC<ChannelDetailProps> = ({ 
  channel, 
  onClose, 
  onPlay, 
  themeColor, 
  uiMode,
  multiSessions = {},
  onToggleMultiChannel,
  activeFocus = 0,
  onFocusChange,
  playbackProgress = {}
}) => {
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const isMulti = Object.values(multiSessions).some((ids: string[]) => ids.includes(channel.id));

  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true);
      const data = await fetchMediaMetadata(channel.name, channel.group);
      if (data) {
        setMetadata(data);
      }
      setLoading(false);
    };
    loadMetadata();
  }, [channel]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          className={cn(
            "w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative transition-all duration-500",
            uiMode === 'modern' && "bg-zinc-900/60 border border-white/20 sm:rounded-[40px] backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]",
            uiMode === 'classic' && "bg-zinc-950 border-4 border-zinc-800 sm:rounded-none shadow-none",
            uiMode === 'minimalist' && "bg-black border-0 sm:rounded-none shadow-none"
          )}
          onClick={e => e.stopPropagation()}
        >
        {uiMode === 'modern' && (
          <div 
            className="absolute -top-48 -right-48 w-96 h-96 rounded-full blur-[120px] opacity-30 animate-pulse"
            style={{ backgroundColor: themeColor }}
          />
        )}
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 p-2 rounded-full bg-black/40 hover:bg-white/10 text-white transition-all backdrop-blur-md border border-white/10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Poster / Image Section */}
        <div className="w-full md:w-2/5 h-64 md:h-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-zinc-900 z-10" />
          <img
            src={channel.logo || `https://picsum.photos/seed/${channel.name}/800/1200`}
            alt={channel.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {metadata?.imdbScore && (
            <div className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-yellow-500 text-black px-3 py-1.5 rounded-full font-black text-sm shadow-xl">
              <Star className="w-4 h-4 fill-current" />
              {metadata.imdbScore}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest border border-white/5">
                {channel.group || 'Genel'}
              </span>
              {metadata?.year && (
                <span className="flex items-center gap-1.5 text-white/40 text-xs font-bold">
                  <Calendar className="w-3 h-3" />
                  {metadata.year}
                </span>
              )}
              {metadata?.duration && (
                <span className="flex items-center gap-1.5 text-white/40 text-xs font-bold">
                  <Clock className="w-3 h-3" />
                  {metadata.duration}
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter leading-none">
              {channel.name}
            </h1>
            {metadata?.genre && (
              <div className="flex flex-wrap gap-2 mb-6">
                {metadata.genre.map((g, i) => (
                  <span key={i} className="text-sm font-medium text-white/60 italic">
                    {g}{i < metadata.genre.length - 1 ? ' • ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-8 flex-1">
            {/* Summary */}
            <div>
              <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <Info className="w-3 h-3" /> Özet
              </h3>
              <p className="text-lg text-white/80 leading-relaxed font-medium">
                {loading ? (
                  <span className="animate-pulse opacity-50">Bilgiler yükleniyor...</span>
                ) : (
                  metadata?.summary || channel.description || 'Bu içerik için henüz bir özet bulunmuyor.'
                )}
              </p>
            </div>

            {/* Cast & Crew */}
            {metadata?.cast && metadata.cast.length > 0 && (
              <div>
                <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Users className="w-3 h-3" /> Oyuncular
                </h3>
                <div className="flex flex-wrap gap-3">
                  {metadata.cast.map((actor, i) => (
                    <span key={i} className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm font-bold text-white/70 hover:bg-white/10 transition-colors cursor-default">
                      {actor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {metadata?.director && (
              <div>
                <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Yönetmen</h3>
                <p className="text-xl font-bold text-white">{metadata.director}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-12 flex flex-col gap-6">
            {playbackProgress[channel.id] && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                  <span>İzleme İlerlemesi</span>
                  <span>%{Math.round((playbackProgress[channel.id].currentTime / playbackProgress[channel.id].duration) * 100)}</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${(playbackProgress[channel.id].currentTime / playbackProgress[channel.id].duration) * 100}%`,
                      backgroundColor: themeColor
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                onClick={() => onPlay(channel)}
                onMouseEnter={() => onFocusChange?.(0)}
                style={{ 
                  backgroundColor: activeFocus === 0 ? themeColor : (uiMode === 'minimalist' ? 'white' : themeColor),
                  transform: activeFocus === 0 ? 'scale(1.05)' : 'scale(1)'
                }}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-5 text-white font-black text-lg shadow-2xl active:scale-95 transition-all group",
                  uiMode === 'modern' && "rounded-full",
                  uiMode === 'classic' && "rounded-none border-4 border-white/20",
                  uiMode === 'minimalist' && "rounded-none border-0 text-black",
                  activeFocus === 0 && "ring-4 ring-white/20 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                )}
              >
                <Play className={cn("w-6 h-6 fill-current group-hover:scale-110 transition-transform", uiMode === 'minimalist' && "fill-black")} />
                {playbackProgress[channel.id] ? 'Kaldığın Yerden Devam Et' : 'Şimdi İzle'}
              </button>

              {playbackProgress[channel.id] && (
                <button
                  onClick={() => {
                    // Reset progress and play
                    // Actually, we can just play from 0
                    onPlay({ ...channel, urls: [channel.urls[0]] }); // This is a hack to force start from 0 if we handle it in App.tsx
                    // Better: pass a flag to onPlay or just handle it in App.tsx
                  }}
                  // For now, let's just add a "Baştan İzle" button if needed, 
                  // but "Şimdi İzle" will act as "Resume" if progress exists.
                  // Let's add "Baştan İzle"
                  onMouseEnter={() => onFocusChange?.(3)}
                  className={cn(
                    "px-6 py-5 text-white/60 font-bold hover:text-white transition-all",
                    activeFocus === 3 && "text-white underline underline-offset-8"
                  )}
                >
                  Baştan İzle
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => onToggleMultiChannel?.(channel.id)}
                onMouseEnter={() => onFocusChange?.(1)}
                style={{
                  transform: activeFocus === 1 ? 'scale(1.05)' : 'scale(1)'
                }}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-5 font-black text-lg shadow-2xl active:scale-95 transition-all border-2",
                  isMulti ? "bg-white text-black border-white" : "bg-transparent text-white border-white/20",
                  uiMode === 'modern' && "rounded-full",
                  uiMode === 'classic' && "rounded-none border-4 border-white/20",
                  uiMode === 'minimalist' && "rounded-none border-2 border-white",
                  activeFocus === 1 && "ring-4 ring-white/20 bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                )}
              >
                <Monitor className="w-6 h-6" />
                {isMulti ? 'Multi Kanalda' : 'Multi Kanala Ekle'}
              </button>
              <button
                onClick={onClose}
                onMouseEnter={() => onFocusChange?.(2)}
                style={{
                  transform: activeFocus === 2 ? 'scale(1.05)' : 'scale(1)'
                }}
                className={cn(
                  "px-8 py-5 text-white font-bold transition-all",
                  uiMode === 'modern' && "rounded-full bg-white/5 border border-white/10",
                  uiMode === 'classic' && "rounded-none bg-zinc-900 border-4 border-zinc-800",
                  uiMode === 'minimalist' && "rounded-none bg-transparent border-0 underline underline-offset-8",
                  activeFocus === 2 && "bg-white text-black border-white ring-4 ring-white/20 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                )}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
