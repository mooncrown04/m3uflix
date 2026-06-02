import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, X, Star, Users, Clock, Calendar, Film, Info, Monitor, Bell, BellOff, ExternalLink, User, Youtube, ChevronRight, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { M3UChannel } from '../utils/m3uParser';
import { fetchMediaMetadata, MediaMetadata } from '../services/metadataService';
import { fetchActorDetails, fetchActorMovies, fetchTMDBTrailers, fetchTMDBSimilar, ActorDetails, ActorMovie, TMDBTrailer, TMDBData, getTMDBImageUrl } from '../services/tmdbService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { EPGData, EPGProgram, UIMode } from '../types';

interface ChannelDetailProps {
  channel: M3UChannel;
  onClose: () => void;
  onPlay: (channel: M3UChannel) => void;
  themeColor: string;
  uiMode: UIMode;
  multiSessions?: Record<string, string[]>;
  onToggleMultiChannel?: (channelId: string) => void;
  activeFocus?: number;
  onFocusChange?: (index: number) => void;
  playbackProgress?: Record<string, { currentTime: number; duration: number }>;
  epgData?: EPGData | null;
  onNext?: () => void;
  onPrev?: () => void;
  cinemaModeEnabled?: boolean;
  tmdbEnabled?: boolean;
  onActorFilter?: (actorName: string) => void;
  onNavContextChange?: (context: any) => void;
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
  epgData,
  onNext,
  onPrev,
  cinemaModeEnabled = false,
  tmdbEnabled = true,
  onActorFilter,
  onNavContextChange
}) => {
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActor, setSelectedActor] = useState<ActorDetails | null>(null);
  const [actorMovies, setActorMovies] = useState<ActorMovie[]>([]);
  const [loadingActor, setLoadingActor] = useState(false);
  const [trailers, setTrailers] = useState<TMDBTrailer[]>([]);
  const [similarContent, setSimilarContent] = useState<TMDBData[]>([]);
  const [showTrailer, setShowTrailer] = useState<string | null>(null);
  const [reminders, setReminders] = useState<string[]>(() => {
    const saved = localStorage.getItem('broadcast_reminders');
    return saved ? JSON.parse(saved) : [];
  });
  const [epgReminders, setEpgReminders] = useState<string[]>(() => {
    const saved = localStorage.getItem('epg_reminders');
    return saved ? JSON.parse(saved) : [];
  });

  const isMulti = Object.values(multiSessions || {}).some((ids: string[]) => Array.isArray(ids) && ids.includes(channel.id));
  const hasReminder = reminders.includes(channel.id);
  const isCinemaMode = cinemaModeEnabled && channel.type === 'video' && metadata?.tmdbId;

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
      const data = await fetchMediaMetadata(channel.name, channel.group, channel.type, tmdbEnabled);
      if (data) {
        setMetadata(data);
        if (tmdbEnabled && data.tmdbId && data.mediaType) {
          const [trailerData, similarData] = await Promise.all([
            fetchTMDBTrailers(data.tmdbId, data.mediaType),
            fetchTMDBSimilar(data.tmdbId, data.mediaType)
          ]);
          setTrailers(trailerData);
          setSimilarContent(similarData);
        }
      }
      setLoading(false);
    };
    loadMetadata();
  }, [channel]);

  const handleActorClick = async (actorId: number) => {
    setLoadingActor(true);
    onNavContextChange?.('actor-detail');
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
      className={cn(
        "fixed inset-0 z-[150] flex items-center justify-center overflow-hidden",
        isCinemaMode ? "bg-black" : "bg-black/95 backdrop-blur-xl p-0 sm:p-4"
      )}
      onClick={onClose}
    >
      <motion.div
        initial={isCinemaMode ? { opacity: 0 } : { y: 50, opacity: 0, scale: 0.95 }}
        animate={isCinemaMode ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
        exit={isCinemaMode ? { opacity: 0 } : { y: 50, opacity: 0, scale: 0.95 }}
        className={cn(
          "relative w-full h-full overflow-hidden flex flex-col md:flex-row transition-all duration-500",
          !isCinemaMode && uiMode === 'modern' && "bg-zinc-900/60 border border-white/20 sm:rounded-[40px] backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] sm:max-h-[90vh] sm:max-w-5xl",
          !isCinemaMode && uiMode === 'classic' && "bg-zinc-950 border-4 border-zinc-800 sm:rounded-none shadow-none sm:max-h-[90vh] sm:max-w-5xl",
          !isCinemaMode && uiMode === 'minimalist' && "bg-black border-0 sm:rounded-none shadow-none sm:max-h-[90vh] sm:max-w-5xl",
          isCinemaMode && "bg-black"
        )}
        onClick={e => e.stopPropagation()}
      >
        {isCinemaMode ? (
          <>
            {/* Cinema Mode Background */}
            <div className="absolute inset-0 z-0">
              <motion.div 
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full h-full"
              >
                <img 
                  src={metadata?.backdropUrl || metadata?.posterUrl || channel.logo} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  alt="Background"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent" />
              </motion.div>
            </div>

            {/* Cinema Mode Content */}
            <div className="relative z-10 flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-6 md:p-16">
              {/* Top Bar */}
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <button
                    onClick={onClose}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/10"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Sinema Modu</span>
                    <span className="text-white font-bold text-sm">{channel.group}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {trailers.length > 0 && (
                    <button
                      onClick={() => setShowTrailer(trailers[0].key)}
                      className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 text-white font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                    >
                      <Youtube className="w-4 h-4" />
                      Fragman
                    </button>
                  )}
                  {(onNext || onPrev) && (
                    <div className="flex gap-2">
                      <button onClick={onPrev} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10"><ChevronUp className="w-5 h-5" /></button>
                      <button onClick={onNext} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10"><ChevronDown className="w-5 h-5" /></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-12 flex-1">
                {/* Left: Poster & Quick Info */}
                <div className="w-full md:w-80 shrink-0 space-y-6">
                  <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="aspect-[2/3] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative"
                  >
                    <img 
                      src={metadata?.posterUrl || channel.logo} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      alt="Poster"
                    />
                    {metadata?.logoUrl && (
                      <div className="absolute inset-0 flex items-end justify-center p-6 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                        <img 
                          src={metadata.logoUrl} 
                          className="w-full h-auto max-h-16 object-contain drop-shadow-2xl"
                          referrerPolicy="no-referrer"
                          alt="Logo"
                        />
                      </div>
                    )}
                  </motion.div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                      <div className="text-white/40 text-[8px] font-black uppercase tracking-widest mb-1">IMDb</div>
                      <div className="text-xl font-black text-yellow-500 flex items-center gap-1">
                        <Star className="w-4 h-4 fill-current" />
                        {metadata?.imdbScore || 'N/A'}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                      <div className="text-white/40 text-[8px] font-black uppercase tracking-widest mb-1">Yıl</div>
                      <div className="text-xl font-black text-white">{metadata?.year || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Right: Main Info */}
                <div className="flex-1 space-y-10">
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {metadata?.logoUrl ? (
                      <img 
                        src={metadata.logoUrl} 
                        alt={channel.name} 
                        className="h-24 md:h-40 object-contain mb-8 filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <h1 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-none">
                        {channel.name}
                      </h1>
                    )}
                    <div className="flex flex-wrap gap-3 mb-8">
                      {metadata?.genre?.map((g, i) => (
                        <span key={i} className="px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-bold border border-white/10">
                          {g}
                        </span>
                      ))}
                      {metadata?.duration && (
                        <span className="px-4 py-1.5 rounded-full bg-white/5 text-white/40 text-xs font-bold border border-white/5">
                          {metadata.duration}
                        </span>
                      )}
                    </div>
                    <p className="text-xl md:text-2xl text-white/70 leading-relaxed font-medium max-w-3xl italic">
                      {metadata?.summary || 'Bu içerik için henüz bir özet bulunmuyor.'}
                    </p>
                  </motion.div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-4 pt-4">
                    <button
                      onClick={() => onPlay(channel)}
                      style={{ backgroundColor: themeColor }}
                      className="flex items-center gap-3 px-12 py-5 rounded-full text-white font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      {playbackProgress[channel.id] ? 'Devam Et' : 'Hemen İzle'}
                    </button>
                    <button
                      onClick={toggleReminder}
                      className={cn(
                        "px-8 py-5 rounded-full flex items-center gap-3 font-bold transition-all border-2",
                        hasReminder ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                      )}
                    >
                      <Bell className={cn("w-5 h-5", hasReminder && "fill-current")} />
                      {hasReminder ? 'Hatırlatıcıda' : 'Hatırlatıcı'}
                    </button>
                  </div>

                  {/* Cast */}
                  {metadata?.tmdbCast && (
                    <div className="pt-8">
                      <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-6">Oyuncu Kadrosu</h3>
                      <div className="flex flex-wrap gap-4">
                        {metadata.tmdbCast.slice(0, 6).map((actor, i) => (
                          <button 
                            key={i} 
                            onClick={() => handleActorClick(actor.id)}
                            onMouseEnter={() => onFocusChange?.(6 + i)}
                            className={cn(
                              "group flex flex-col items-center gap-3 w-24 transition-all",
                              activeFocus === 6 + i && "scale-110 detail-focused"
                            )}
                          >
                            <div className={cn(
                              "w-20 h-20 rounded-full overflow-hidden border-2 transition-all shadow-xl",
                              activeFocus === 6 + i ? "border-white ring-4 ring-white/20" : "border-white/10 group-hover:border-white/40"
                            )}>
                              {actor.profile_path ? (
                                <img 
                                  src={getTMDBImageUrl(actor.profile_path)} 
                                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                                  alt={actor.name}
                                />
                              ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                  <User className="w-8 h-8 text-white/20" />
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-white/60 text-center group-hover:text-white transition-colors line-clamp-2">
                              {actor.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Similar Content Carousel */}
              {similarContent.length > 0 && (
                <div className="mt-20 pt-10 border-t border-white/10">
                  <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Benzer İçerikler</h3>
                  <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar">
                    {similarContent.map((item, i) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "w-40 shrink-0 group cursor-pointer space-y-3 transition-all",
                          activeFocus === 16 + i && "scale-105 detail-focused"
                        )}
                        onClick={() => console.log("Navigate to:", item.title || item.name)}
                        onMouseEnter={() => onFocusChange?.(16 + i)}
                      >
                        <div className={cn(
                          "aspect-[2/3] rounded-2xl overflow-hidden border transition-all relative shadow-xl",
                          activeFocus === 16 + i ? "border-white ring-4 ring-white/20" : "border-white/5 group-hover:border-white/20"
                        )}>
                          <img 
                            src={getTMDBImageUrl(item.poster_path || '') || ''} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            alt={item.title || item.name}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ChevronRight className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-white/40 truncate group-hover:text-white transition-colors">
                          {item.title || item.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {uiMode === 'modern' && (
              <div 
                className="absolute -top-48 -right-48 w-96 h-96 rounded-full blur-[120px] opacity-30 animate-pulse"
                style={{ backgroundColor: themeColor }}
              />
            )}
            {/* Close Button */}
            <div className="absolute top-6 right-6 z-50 flex flex-col gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/40 hover:bg-white/10 text-white transition-all backdrop-blur-md border border-white/10"
            title="Kapat"
          >
            <X className="w-6 h-6" />
          </button>
          
          {(onNext || onPrev) && (
            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                className="p-2 rounded-full bg-black/40 hover:bg-white/10 text-white transition-all backdrop-blur-md border border-white/10"
                title="Önceki Kanal"
              >
                <ChevronUp className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                className="p-2 rounded-full bg-black/40 hover:bg-white/10 text-white transition-all backdrop-blur-md border border-white/10"
                title="Sonraki Kanal"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>

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
                      onMouseEnter={() => onFocusChange?.(6 + i)}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-sm font-bold text-white/70 hover:bg-white/10 hover:border-white/20 transition-all",
                        activeFocus === 6 + i && "bg-white text-black border-white scale-105 detail-focused"
                      )}
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

            {metadata?.tmdbDirector ? (
              <div>
                <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <User className="w-3 h-3" /> Yönetmen
                </h3>
                <button 
                  onClick={() => handleActorClick(metadata.tmdbDirector!.id)}
                  className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-lg font-bold text-white hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  {metadata.tmdbDirector.profile_path ? (
                    <img 
                      src={getTMDBImageUrl(metadata.tmdbDirector.profile_path)} 
                      className="w-10 h-10 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" 
                      alt={metadata.tmdbDirector.name}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  {metadata.tmdbDirector.name}
                </button>
              </div>
            ) : metadata?.director && (
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
                  activeFocus === 0 && "ring-4 ring-white/20 shadow-[0_0_30px_rgba(255,255,255,0.2)] detail-focused"
                )}
              >
                <Play className={cn("w-6 h-6 fill-current group-hover:scale-110 transition-transform", uiMode === 'minimalist' && "fill-black")} />
                {playbackProgress[channel.id] ? 'Kaldığın Yerden Devam Et' : 'Şimdi İzle'}
              </button>

              <button
                onClick={toggleReminder}
                onMouseEnter={() => onFocusChange?.(1)}
                className={cn(
                  "px-8 py-5 flex items-center gap-3 font-bold transition-all border-2",
                  hasReminder ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10 hover:bg-white/10",
                  uiMode === 'modern' && "rounded-full",
                  activeFocus === 1 && "ring-4 ring-white/20 scale-105 detail-focused"
                )}
              >
                <Bell className={cn("w-5 h-5", hasReminder && "fill-current")} />
                {hasReminder ? 'Hatırlatıcı Kuruldu' : 'Hatırlatıcı Kur'}
              </button>

              {trailers.length > 0 && (
                <button
                  onClick={() => setShowTrailer(trailers[0].key)}
                  onMouseEnter={() => onFocusChange?.(2)}
                  className={cn(
                    "px-8 py-5 flex items-center gap-3 font-bold transition-all border-2 bg-red-600/10 text-red-500 border-red-600/20 hover:bg-red-600/20",
                    uiMode === 'modern' && "rounded-full",
                    activeFocus === 2 && "ring-4 ring-red-600/40 scale-105 detail-focused"
                  )}
                >
                  <Youtube className="w-5 h-5" />
                  Fragman İzle
                </button>
              )}

              {playbackProgress[channel.id] && (
                <button
                  onClick={() => onPlay({ ...channel, urls: [channel.urls[0]] })}
                  onMouseEnter={() => onFocusChange?.(3)}
                  className={cn(
                    "px-6 py-5 text-white/60 font-bold hover:text-white transition-all",
                    activeFocus === 3 && "text-white underline underline-offset-8 detail-focused"
                  )}
                >
                  Baştan İzle
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => onToggleMultiChannel?.(channel.id)}
                onMouseEnter={() => onFocusChange?.(4)}
                style={{
                  transform: activeFocus === 4 ? 'scale(1.05)' : 'scale(1)'
                }}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-5 font-black text-lg shadow-2xl active:scale-95 transition-all border-2",
                  isMulti ? "bg-white text-black border-white" : "bg-transparent text-white border-white/20",
                  uiMode === 'modern' && "rounded-full",
                  uiMode === 'classic' && "rounded-none border-4 border-white/20",
                  uiMode === 'minimalist' && "rounded-none border-2 border-white",
                  activeFocus === 4 && "ring-4 ring-white/20 bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] detail-focused"
                )}
              >
                <Monitor className="w-6 h-6" />
                {isMulti ? 'Multi Kanalda' : 'Multi Kanala Ekle'}
              </button>
              <button
                onClick={onClose}
                onMouseEnter={() => onFocusChange?.(5)}
                style={{
                  transform: activeFocus === 5 ? 'scale(1.05)' : 'scale(1)'
                }}
                className={cn(
                  "px-8 py-5 text-white font-bold transition-all",
                  uiMode === 'modern' && "rounded-full bg-white/5 border border-white/10",
                  uiMode === 'classic' && "rounded-none bg-zinc-900 border-4 border-zinc-800",
                  uiMode === 'minimalist' && "rounded-none bg-transparent border-0 underline underline-offset-8",
                  activeFocus === 5 && "bg-white text-black border-white ring-4 ring-white/20 shadow-[0_0_30px_rgba(255,255,255,0.2)] detail-focused"
                )}
              >
                Kapat
              </button>
            </div>
          </div>

          {/* Similar Content */}
          {similarContent.length > 0 && (
            <div className="mt-16">
              <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                <span className="flex items-center gap-2"><Film className="w-3 h-3" /> Benzer İçerikler</span>
                <span className="text-[8px] opacity-50">TMDb Önerileri</span>
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {similarContent.map((item, i) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "group cursor-pointer space-y-2 transition-all",
                      activeFocus === 16 + i && "scale-105 detail-focused"
                    )}
                    onClick={() => {
                      // In a real app, we would navigate to this channel or fetch its metadata
                      // For now, we just show a hint
                      console.log("Navigate to:", item.title || item.name);
                    }}
                    onMouseEnter={() => onFocusChange?.(16 + i)}
                  >
                    <div className={cn(
                      "aspect-[2/3] rounded-2xl overflow-hidden border transition-all relative",
                      activeFocus === 16 + i ? "border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]" : "border-white/5 group-hover:border-white/20"
                    )}>
                      <img 
                        src={getTMDBImageUrl(item.poster_path || '') || ''} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        alt={item.title || item.name}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ChevronRight className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-white/40 truncate group-hover:text-white transition-colors">
                      {item.title || item.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    )}
  </motion.div>

        {/* Trailer Modal */}
        <AnimatePresence>
          {showTrailer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4"
              onClick={() => setShowTrailer(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-5xl aspect-video bg-black rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(255,0,0,0.2)]"
                onClick={e => e.stopPropagation()}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${showTrailer}?autoplay=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
                <button
                  onClick={() => setShowTrailer(null)}
                  className="absolute top-6 right-6 p-3 rounded-full bg-black/60 text-white hover:bg-white/20 transition-all border border-white/10"
                >
                  <X className="w-6 h-6" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                    onClick={() => {
                      setSelectedActor(null);
                      onNavContextChange?.('channel-detail');
                    }}
                    onMouseEnter={() => onFocusChange?.(100)}
                    className={cn(
                      "absolute top-6 left-6 p-2 rounded-full bg-black/40 text-white border border-white/10 transition-all",
                      activeFocus === 100 && "bg-white text-black border-white ring-4 ring-white/20 scale-110 actor-focused"
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-4xl font-black text-white">{selectedActor.name}</h2>
                    {onActorFilter && (
                      <button
                        onClick={() => onActorFilter(selectedActor.name)}
                        onMouseEnter={() => onFocusChange?.(101)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-lg",
                          activeFocus === 101 ? "bg-white text-black scale-110 actor-focused" : "bg-white/10 text-white hover:bg-white/20"
                        )}
                      >
                        <Search className="w-4 h-4" />
                        Listede Ara
                      </button>
                    )}
                  </div>
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
                      {actorMovies.map((movie, i) => (
                        <div 
                          key={movie.id} 
                          className={cn(
                            "group cursor-pointer space-y-2 transition-all",
                            activeFocus === 102 + i && "scale-105 actor-focused"
                          )}
                          onMouseEnter={() => onFocusChange?.(102 + i)}
                        >
                          <div className={cn(
                            "aspect-[2/3] rounded-xl overflow-hidden border transition-all",
                            activeFocus === 102 + i ? "border-white ring-4 ring-white/20" : "border-white/5 group-hover:border-white/20"
                          )}>
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
