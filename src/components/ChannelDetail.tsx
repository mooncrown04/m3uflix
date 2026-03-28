import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, X, Star, Users, Clock, Calendar, Film, Info, Monitor, Bell, BellOff, ExternalLink, User } from 'lucide-react';
import { M3UChannel } from '../utils/m3uParser';
import { fetchMediaMetadata, MediaMetadata } from '../services/metadataService';
import { fetchActorDetails, fetchActorMovies, ActorDetails, ActorMovie, getTMDBImageUrl } from '../services/tmdbService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { EPGData, EPGProgram } from '../utils/epgParser';

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
  epgData?: EPGData | null;
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
  playbackProgress = {},
  epgData
}) => {
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActor, setSelectedActor] = useState<ActorDetails | null>(null);
  const [actorMovies, setActorMovies] = useState<ActorMovie[]>([]);
  const [loadingActor, setLoadingActor] = useState(false);
  const [reminders, setReminders] = useState<string[]>(() => {
    const saved = localStorage.getItem('broadcast_reminders');
    return saved ? JSON.parse(saved) : [];
  });
  const [epgReminders, setEpgReminders] = useState<string[]>(() => {
    const saved = localStorage.getItem('epg_reminders');
    return saved ? JSON.parse(saved) : [];
  });

  const isMulti = Object.values(multiSessions).some((ids: string[]) => ids.includes(channel.id));
  const hasReminder = reminders.includes(channel.id);

  const channelPrograms = useMemo(() => {
    if (!epgData || !epgData.programs[channel.id]) return [];
    const now = new Date();
    // Show current and future programs
    return epgData.programs[channel.id].filter(p => p.stop >= now).slice(0, 10);
  }, [epgData, channel.id]);

  const toggleProgramReminder = (program: EPGProgram) => {
    const id = `${program.channelId}-${program.start.getTime()}`;
    const newReminders = epgReminders.includes(id)
      ? epgReminders.filter(r => r !== id)
      : [...epgReminders, id];
    setEpgReminders(newReminders);
    localStorage.setItem('epg_reminders', JSON.stringify(newReminders));
  };

  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true);
      const data = await fetchMediaMetadata(channel.name, channel.group, channel.type);
      if (data) {
        setMetadata(data);
      }
      setLoading(false);
    };
    loadMetadata();
  }, [channel]);

  const handleActorClick = async (actorId: number) => {
    setLoadingActor(true);
    const [details, movies] = await Promise.all([
      fetchActorDetails(actorId),
      fetchActorMovies(actorId)
    ]);
    setSelectedActor(details);
    setActorMovies(movies);
    setLoadingActor(false);
  };

  const toggleReminder = () => {
    const newReminders = hasReminder 
      ? reminders.filter(id => id !== channel.id)
      : [...reminders, channel.id];
    setReminders(newReminders);
    localStorage.setItem('broadcast_reminders', JSON.stringify(newReminders));
  };

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
            src={metadata?.posterUrl || channel.logo || `https://picsum.photos/seed/${channel.name}/800/1200`}
            alt={channel.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {metadata?.backdropUrl && (
            <div className="absolute inset-0 -z-10 opacity-20 blur-xl scale-110">
              <img src={metadata.backdropUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          )}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
            {metadata?.imdbScore && (
              <div className="flex items-center gap-2 bg-yellow-500 text-black px-3 py-1.5 rounded-full font-black text-sm shadow-xl">
                <Star className="w-4 h-4 fill-current" />
                {metadata.imdbScore}
              </div>
            )}
            {/* Simulated RT Score */}
            {metadata?.imdbScore && parseFloat(metadata.imdbScore) > 7 && (
              <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full font-black text-sm shadow-xl">
                <span className="text-xs">🍅</span>
                {Math.round(parseFloat(metadata.imdbScore) * 10 + Math.random() * 5)}%
              </div>
            )}
          </div>
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
            {metadata?.tmdbCast && metadata.tmdbCast.length > 0 ? (
              <div>
                <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Users className="w-3 h-3" /> Oyuncular
                </h3>
                <div className="flex flex-wrap gap-3">
                  {metadata.tmdbCast.map((actor, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleActorClick(actor.id)}
                      className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-sm font-bold text-white/70 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      {actor.profile_path ? (
                        <img 
                          src={getTMDBImageUrl(actor.profile_path)} 
                          className="w-6 h-6 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" 
                          alt={actor.name}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                      {actor.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : metadata?.cast && metadata.cast.length > 0 && (
              <div>
                <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Users className="w-3 h-3" /> Oyuncular
                </h3>
                <div className="flex flex-wrap gap-3">
                  {metadata.cast.map((actor, i) => (
                    <span key={i} className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm font-bold text-white/70">
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

            {/* EPG Programs */}
            {channelPrograms.length > 0 && (
              <div>
                <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Yayın Akışı
                </h3>
                <div className="space-y-3">
                  {channelPrograms.map((program, i) => {
                    const isCurrent = new Date() >= program.start && new Date() <= program.stop;
                    const reminderId = `${program.channelId}-${program.start.getTime()}`;
                    const hasProgReminder = epgReminders.includes(reminderId);
                    
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                          isCurrent ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5"
                        )}
                      >
                        <div className="text-xs font-black text-white/40 tabular-nums w-24">
                          {program.start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {program.stop.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{program.title}</div>
                          {isCurrent && (
                            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-white/40"
                                initial={{ width: 0 }}
                                animate={{ 
                                  width: `${((new Date().getTime() - program.start.getTime()) / (program.stop.getTime() - program.start.getTime())) * 100}%` 
                                }}
                              />
                            </div>
                          )}
                        </div>
                        {!isCurrent && (
                          <button 
                            onClick={() => toggleProgramReminder(program)}
                            className={cn(
                              "p-2 rounded-full transition-all",
                              hasProgReminder ? "bg-yellow-500 text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
                            )}
                          >
                            {hasProgReminder ? <Bell className="w-4 h-4 fill-current" /> : <BellOff className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
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

            <div className="flex flex-wrap items-center gap-4">
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

              <button
                onClick={toggleReminder}
                onMouseEnter={() => onFocusChange?.(4)}
                className={cn(
                  "px-8 py-5 flex items-center gap-3 font-bold transition-all border-2",
                  hasReminder ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10 hover:bg-white/10",
                  uiMode === 'modern' && "rounded-full",
                  activeFocus === 4 && "ring-4 ring-white/20 scale-105"
                )}
              >
                <Bell className={cn("w-5 h-5", hasReminder && "fill-current")} />
                {hasReminder ? 'Hatırlatıcı Kuruldu' : 'Hatırlatıcı Kur'}
              </button>

              {playbackProgress[channel.id] && (
                <button
                  onClick={() => onPlay({ ...channel, urls: [channel.urls[0]] })}
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

        {/* Actor Details Modal */}
        <AnimatePresence>
          {selectedActor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4"
              onClick={() => setSelectedActor(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-zinc-900 border border-white/10 rounded-[40px] max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(0,0,0,0.8)]"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-full md:w-1/3 h-64 md:h-auto relative">
                  <img 
                    src={getTMDBImageUrl(selectedActor.profile_path, 'original') || ''} 
                    className="w-full h-full object-cover"
                    alt={selectedActor.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                  <button 
                    onClick={() => setSelectedActor(null)}
                    className="absolute top-6 left-6 p-2 rounded-full bg-black/40 text-white border border-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
                  <h2 className="text-4xl font-black text-white mb-2">{selectedActor.name}</h2>
                  <div className="flex flex-wrap gap-4 text-white/40 text-xs font-bold mb-8 uppercase tracking-widest">
                    {selectedActor.birthday && (
                      <span className="flex items-center gap-2"><Calendar className="w-3 h-3" /> {selectedActor.birthday}</span>
                    )}
                    {selectedActor.place_of_birth && (
                      <span className="flex items-center gap-2"><Monitor className="w-3 h-3" /> {selectedActor.place_of_birth}</span>
                    )}
                  </div>
                  
                  <div className="mb-10">
                    <h3 className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Biyografi</h3>
                    <p className="text-white/70 leading-relaxed text-sm italic">
                      {selectedActor.biography || 'Biyografi bilgisi bulunmuyor.'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] mb-6">Diğer Yapımları</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {actorMovies.map((movie) => (
                        <div key={movie.id} className="group cursor-pointer space-y-2">
                          <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/5 group-hover:border-white/20 transition-all">
                            <img 
                              src={getTMDBImageUrl(movie.poster_path)} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                              alt={movie.title || movie.name}
                            />
                          </div>
                          <p className="text-[10px] font-bold text-white/40 truncate group-hover:text-white transition-colors">
                            {movie.title || movie.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loadingActor && (
          <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
          </div>
        )}
    </motion.div>
  );
};
