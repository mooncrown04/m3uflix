import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Play, Search, Upload, Link as LinkIcon, Link2, Tv, List, Grid, X, Info, ChevronRight, ChevronLeft, ChevronDown, Plus, Check, Settings, Clock, Cloud, Sun, CloudRain, CloudLightning, Snowflake, RefreshCw, Trash2, Heart, Monitor, Smartphone, Tablet, User, Equal } from 'lucide-react';
import { parseM3U, M3UChannel, M3UParseResult } from './utils/m3uParser';
import { fetchAndParseEPG, EPGData } from './utils/epgParser';
import { VideoPlayer } from './components/VideoPlayer';
import { PreviewPlayer } from './components/PreviewPlayer';
import { ChannelDetail } from './components/ChannelDetail';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Playlist {
  id: string;
  name: string;
  url: string;
  epgUrl?: string;
}

type UIMode = 'modern' | 'classic' | 'minimalist';

interface ChannelRowProps {
  title: string;
  channels: M3UChannel[];
  onSelect: (channel: M3UChannel) => void;
  onFocus: (row: number, col: number) => void;
  onToggleFavorite: (channelId: string) => void;
  onDeleteChannel: (channelId: string) => void;
  onLongPress: (channelId: string, category: string) => void;
  favorites: string[];
  rowIndex: number;
  activeRow: number;
  activeCol: number;
  orientation: 'landscape' | 'portrait';
  previewChannelId: string | null;
  themeColor: string;
  deviceType: 'pc' | 'tv' | 'tablet' | 'phone';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  customProxyUrl?: string;
  uiMode: UIMode;
}

const ChannelRow: React.FC<ChannelRowProps> = ({ 
  title, 
  channels, 
  onSelect, 
  onFocus, 
  onToggleFavorite, 
  onDeleteChannel,
  onLongPress,
  favorites = [], 
  rowIndex, 
  activeRow, 
  activeCol, 
  orientation, 
  previewChannelId, 
  themeColor,
  deviceType,
  isCollapsed,
  onToggleCollapse,
  customProxyUrl,
  uiMode
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const isActiveRow = rowIndex === activeRow;
  const isHeaderFocused = isActiveRow && activeCol === -1;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [pressingId, setPressingId] = useState<string | null>(null);

  useEffect(() => {
    if (isActiveRow && rowRef.current) {
      rowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isActiveRow]);

  useEffect(() => {
    if (isActiveRow && !isCollapsed && scrollRef.current && activeCol >= 0) {
      const activeElement = scrollRef.current.children[activeCol] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [isActiveRow, activeCol, isCollapsed]);

  const handlePressStart = (channelId: string) => {
    setPressingId(channelId);
    longPressTimer.current = setTimeout(() => {
      onLongPress?.(channelId, title);
      setPressingId(null);
    }, 800);
  };

  const handlePressEnd = () => {
    setPressingId(null);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div ref={rowRef} className="space-y-2 group/row relative">
      <div className="px-4 md:px-12 flex items-center">
        <div 
          onClick={onToggleCollapse}
          onPointerDown={() => onFocus(rowIndex, -1)}
          style={{ 
            backgroundColor: isHeaderFocused ? themeColor : (isActiveRow ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'),
            color: 'white',
            borderColor: isHeaderFocused ? 'white' : 'transparent'
          }}
          className={cn(
            "flex items-center px-6 py-2.5 text-sm font-black uppercase tracking-widest transition-all shadow-xl border cursor-pointer",
            uiMode === 'modern' && "rounded-full",
            uiMode === 'classic' && "rounded-lg",
            uiMode === 'minimalist' && "rounded-none border-b border-white/10 bg-transparent",
            isHeaderFocused ? "scale-110 shadow-2xl ring-4 ring-white/20 z-10" : "opacity-60 hover:opacity-100"
          )}
        >
          <div className={cn(
            "w-2 h-2 rounded-full mr-3 animate-pulse",
            isHeaderFocused ? "bg-white" : "bg-white/20"
          )} />
          <span className="mr-3">{title}</span>
          {!isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="ml-2 text-[10px] opacity-50">({channels.length})</span>
        </div>
      </div>
      
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative overflow-hidden"
          >
            <div 
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 pt-4 pb-4 snap-x"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {channels.map((channel, colIndex) => {
                const isFocused = isActiveRow && colIndex === activeCol;
                const isPreviewing = isFocused && previewChannelId === channel.id;
                const isFavorite = Array.isArray(favorites) && favorites.includes(channel.id);
                const isPressing = pressingId === channel.id;

                const getCategoryBadge = () => {
                  if (title === 'İzlemeye Devam Et') return 'İ';
                  const group = (channel.group || '').toLowerCase();
                  if (group.includes('live') || group.includes('canlı') || group.includes('tv')) return 'C';
                  if (group.includes('movie') || group.includes('film') || group.includes('sinema')) return 'F';
                  if (group.includes('series') || group.includes('dizi') || group.includes('show')) return 'D';
                  return null;
                };
                const badge = getCategoryBadge();

                return (
                  <div key={channel.id} className={cn("flex flex-col gap-2 snap-start relative", title === 'Top 10' && "ml-16")}>
                    {title === 'Top 10' && (
                      <div className="absolute -left-20 bottom-0 z-0 pointer-events-none select-none flex items-end justify-center h-full overflow-visible">
                        <span 
                          className="text-[180px] font-black leading-[0.7] text-black"
                          style={{ 
                            WebkitTextStroke: '4px #555',
                            paintOrder: 'stroke fill',
                            textShadow: '0 0 30px rgba(255,255,255,0.1)'
                          }}
                        >
                          {channel.tvgNumber}
                        </span>
                      </div>
                    )}
                    <motion.div
                      animate={{ 
                        scale: isFocused ? (isPressing ? 1.05 : 1.15) : 1,
                        zIndex: isFocused ? 30 : 10,
                        y: isFocused ? -10 : 0
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      onClick={() => {
                        console.log('ChannelRow clicked:', channel.name);
                        onFocus(rowIndex, colIndex);
                        onSelect(channel);
                      }}
                      onPointerDown={() => onFocus(rowIndex, colIndex)}
                      onMouseDown={() => handlePressStart(channel.id)}
                      onMouseUp={handlePressEnd}
                      onMouseLeave={handlePressEnd}
                      onTouchStart={() => handlePressStart(channel.id)}
                      onTouchEnd={handlePressEnd}
                      onMouseEnter={() => onFocus(rowIndex, colIndex)}
                      style={{ 
                        boxShadow: isFocused ? `0 0 30px ${themeColor}4d` : undefined,
                        borderColor: isFocused ? themeColor : 'transparent'
                      }}
                      className={cn(
                        "relative flex-none bg-zinc-900 group/card transition-all duration-300 border-4 cursor-pointer",
                        uiMode === 'modern' && "rounded-2xl",
                        uiMode === 'classic' && "rounded-lg",
                        uiMode === 'minimalist' && "rounded-none",
                        deviceType === 'tv' 
                          ? (orientation === 'landscape' ? "w-48 md:w-72 aspect-video" : "w-40 md:w-56 aspect-[2/3]")
                          : deviceType === 'phone'
                          ? (orientation === 'landscape' ? "w-32 aspect-video" : "w-24 aspect-[2/3]")
                          : (orientation === 'landscape' ? "w-40 md:w-56 aspect-video" : "w-32 md:w-44 aspect-[2/3]")
                      )}
                    >
                  {isPressing && (
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.8, ease: "linear" }}
                      className="absolute bottom-0 left-0 h-1.5 bg-white z-50"
                    />
                  )}
                  
                  {/* Badges Container */}
                  <div className="absolute top-2 left-2 z-40 flex flex-col gap-1.5">
                    {isFavorite && (
                      <div 
                        style={{ borderColor: themeColor }}
                        className="w-5 h-5 rounded-full shadow-lg flex items-center justify-center border-2 bg-black/40 backdrop-blur-sm"
                      >
                        <div style={{ backgroundColor: themeColor }} className="w-1.5 h-1.5 rounded-full" />
                      </div>
                    )}
                    {badge && (
                      <div 
                        style={{ backgroundColor: themeColor }}
                        className="text-[10px] font-black text-white px-2 py-0.5 rounded shadow-lg flex items-center justify-center min-w-[20px]"
                      >
                        {badge}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChannel(channel.id);
                    }}
                    className={cn(
                      "absolute top-2 right-2 z-40 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:bg-red-600 group/delete",
                      isFocused ? "opacity-100 scale-100" : "opacity-0 scale-50"
                    )}
                  >
                    <X className="w-3.5 h-3.5 text-white group-hover/delete:scale-110 transition-transform" />
                  </button>
                  {isPreviewing ? (
                    <div className="w-full h-full bg-black pointer-events-none">
                      <PreviewPlayer urls={channel.urls} customProxyUrl={customProxyUrl} />
                      <div 
                        style={{ backgroundColor: themeColor }}
                        className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse text-white"
                      >
                        <div className="w-1 h-1 bg-white rounded-full" />
                        CANLI ÖNİZLEME
                      </div>
                    </div>
                  ) : (
                    <>
                      {channel.logo ? (
                        <img 
                          src={channel.logo} 
                          alt={channel.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=101010&color=fff&size=512`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                          <Tv className="w-8 h-8 text-zinc-700" />
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3 transition-opacity duration-300",
                    isFocused ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"
                  )}>
                    <div className="flex items-center gap-2">
                      <div className="bg-white p-1 rounded-full">
                        <Play className="w-2 h-2 text-black fill-current" />
                      </div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">Şimdi İzle</span>
                    </div>
                  </div>
                </motion.div>
                <p className={cn(
                  "text-xs font-medium truncate transition-all duration-300",
                  orientation === 'landscape' ? "w-40 md:w-56" : "w-32 md:w-44",
                  isFocused ? "text-white font-bold translate-y-[-5px]" : "text-zinc-400"
                )}>
                  {channel.name}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
);
};

const Logo = ({ uiMode }: { uiMode: UIMode }) => {
  const [isAltLogo, setIsAltLogo] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAltLogo(true);
      setTimeout(() => setIsAltLogo(false), 10000); // Show for 10 seconds
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-10 flex items-center overflow-hidden">
      <AnimatePresence mode="wait">
        {!isAltLogo ? (
          <motion.div
            key="m3uflix"
            initial={{ opacity: 0, scaleX: 0, letterSpacing: "-0.5em", filter: 'blur(10px)' }}
            animate={{ opacity: 1, scaleX: 1, letterSpacing: "0em", filter: 'blur(0px)' }}
            exit={{ opacity: 0, scaleX: 1.2, letterSpacing: "0.2em", filter: 'blur(10px)' }}
            transition={{ duration: 2, ease: "circOut" }}
            className="flex items-center gap-2 origin-left"
          >
            <Tv style={{ color: 'var(--theme-color)' }} className="w-8 h-8 md:w-10 md:h-10 fill-current" />
            <span style={{ color: 'var(--theme-color)' }} className="font-black text-2xl md:text-3xl tracking-tighter uppercase italic">M3UFLIX</span>
          </motion.div>
        ) : (
          <motion.div
            key="mooncrown"
            initial={{ opacity: 0, scaleX: 0, letterSpacing: "-0.5em", filter: 'blur(10px)' }}
            animate={{ opacity: 1, scaleX: 1, letterSpacing: "0em", filter: 'blur(0px)' }}
            exit={{ opacity: 0, scaleX: 1.2, letterSpacing: "0.2em", filter: 'blur(10px)' }}
            transition={{ duration: 2, ease: "circOut" }}
            className={cn(
              "flex items-center gap-2 origin-left",
              uiMode === 'minimalist' && "gap-1"
            )}
          >
            {uiMode !== 'minimalist' && <Tv className="text-yellow-400 w-8 h-8 md:w-10 md:h-10 fill-current" />}
            <span className={cn(
              "font-black text-2xl md:text-3xl tracking-tighter uppercase italic flex",
              uiMode === 'minimalist' && "not-italic tracking-normal font-bold"
            )}>
              <span className="text-yellow-400">MoOnCrOwN</span>
              <span style={{ color: 'var(--theme-color)' }}>3FLİX</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WeatherWidget = ({ city, themeColor }: { city: string, themeColor: string }) => {
  const [weather, setWeather] = useState<{ temp: number, code: number, isDay: number } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const { latitude, longitude } = geoData.results[0];
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const weatherData = await weatherRes.json();
          setWeather({
            temp: Math.round(weatherData.current_weather.temperature),
            code: weatherData.current_weather.weathercode,
            isDay: weatherData.current_weather.is_day
          });
        }
      } catch (err) {
        console.error('Weather fetch failed:', err);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 1800000);
    return () => clearInterval(interval);
  }, [city]);

  const getEmoji = (code: number, isDay: number) => {
    const isNight = isDay === 0;
    
    if (isNight) {
      // Gece için en estetik tekli emojiler
      if (code === 0) return '🌙'; // Açık Gece
      if (code >= 1 && code <= 3) return '☁️'; // Bulutlu Gece
      if (code >= 45 && code <= 48) return '🌫️'; // Sisli
      if (code >= 51 && code <= 67) return '🌧️'; // Yağmurlu
      if (code >= 71 && code <= 77) return '🌨️'; // Karlı
      if (code >= 80 && code <= 82) return '🌧️'; // Sağanak
      if (code >= 95 && code <= 99) return '⛈️'; // Fırtına
      return '🌙';
    } else {
      // Gündüz için güneşli/entegre emojiler
      if (code === 0) return '☀️'; // Açık
      if (code >= 1 && code <= 3) return '🌤️'; // Az Bulutlu
      if (code >= 45 && code <= 48) return '🌫️'; // Sisli
      if (code >= 51 && code <= 67) return '🌦️'; // Yağmurlu
      if (code >= 71 && code <= 77) return '🌨️'; // Karlı
      if (code >= 80 && code <= 82) return '🌦️'; // Sağanak
      if (code >= 95 && code <= 99) return '⛈️'; // Fırtına
      return '☀️';
    }
  };

  if (!weather) return null;

  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md mr-4">
      <span className="text-xl">{getEmoji(weather.code, weather.isDay)}</span>
      <div className="flex flex-col leading-none">
        <span style={{ color: themeColor }} className="text-sm font-black italic">{weather.temp}°C</span>
        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">{city}</span>
      </div>
    </div>
  );
};

const DigitalClock = ({ themeColor }: { themeColor: string }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', { hour12: false });
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('tr-TR', { weekday: 'long' });
  };

  return (
    <div className="hidden sm:flex flex-col items-end justify-center leading-none mr-2 select-none">
      <div 
        style={{ color: themeColor }}
        className="text-2xl font-black italic tracking-tighter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] animate-pulse"
      >
        {formatTime(time)}
      </div>
      <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-0.5 opacity-80">
        {formatDate(time)}
      </div>
      <div className="text-[10px] font-black text-white uppercase tracking-widest mt-1 drop-shadow-lg">
        {getDayName(time)}
      </div>
    </div>
  );
};

const DEFAULT_M3U_URL = 'https://cutt.ly/GtYU85cD';

const PROFILE_PICS = [
  'THEME_COLOR',
  'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png',
  'https://images.weserv.nl/?url=https://mir-s3-cdn-cf.behance.net/project_modules/disp/1bdc9a33850498.56ba69ac2ba5b.png',
  'https://images.weserv.nl/?url=https://mir-s3-cdn-cf.behance.net/project_modules/disp/bf6e4a33850498.56ba69ac3064f.png',
  'https://images.weserv.nl/?url=https://mir-s3-cdn-cf.behance.net/project_modules/disp/64623a33850498.56ba69ac2a6f7.png',
  'https://images.weserv.nl/?url=https://mir-s3-cdn-cf.behance.net/project_modules/disp/e70b1333850498.56ba69ac32ae3.png'
];

export default function App() {
  const [channels, setChannels] = useState<M3UChannel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentChannel, setCurrentChannel] = useState<M3UChannel | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('playlists');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(() => 
    localStorage.getItem('current_playlist_id')
  );
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [extraUrl, setExtraUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [epgData, setEpgData] = useState<EPGData | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    const saved = localStorage.getItem('m3u_url');
    const isDeleted = localStorage.getItem('m3u_deleted') === 'true';
    return !!saved && !isDeleted;
  });
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [posterOrientation, setPosterOrientation] = useState<'landscape' | 'portrait'>(() => 
    (localStorage.getItem('poster_orientation') as 'landscape' | 'portrait') || 'landscape'
  );
  const [previewChannelId, setPreviewChannelId] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(() => {
    const saved = localStorage.getItem('m3u_url');
    const isDeleted = localStorage.getItem('m3u_deleted') === 'true';
    if (saved) return saved;
    if (isDeleted) return null;
    return DEFAULT_M3U_URL;
  });
  const [themeColor, setThemeColor] = useState<string>(() => localStorage.getItem('theme_color') || '#dc2626'); // Default red-600
  const [uiMode, setUiMode] = useState<UIMode>(() => (localStorage.getItem('ui_mode') as UIMode) || 'modern');
  const [mixColor1, setMixColor1] = useState<string>(() => localStorage.getItem('mix_color_1') || '#dc2626');
  const [mixColor2, setMixColor2] = useState<string>(() => localStorage.getItem('mix_color_2') || '#2563eb');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [canliChannels, setCanliChannels] = useState<string[]>(() => {
    const saved = localStorage.getItem('canli_channels');
    return saved ? JSON.parse(saved) : [];
  });
  const [diziChannels, setDiziChannels] = useState<string[]>(() => {
    const saved = localStorage.getItem('dizi_channels');
    return saved ? JSON.parse(saved) : [];
  });
  const [filmChannels, setFilmChannels] = useState<string[]>(() => {
    const saved = localStorage.getItem('film_channels');
    return saved ? JSON.parse(saved) : [];
  });
  const [recentlyWatched, setRecentlyWatched] = useState<M3UChannel[]>(() => {
    const saved = localStorage.getItem('recently_watched');
    return saved ? JSON.parse(saved) : [];
  });
  const [visibleCategories, setVisibleCategories] = useState<string[]>(['Favorilerim', 'Top 10', 'Canlı', 'Dizi', 'Film', 'İzlemeye Devam Et', 'Çalışmayanlar']);
  const [weatherCity, setWeatherCity] = useState<string>(() => localStorage.getItem('weather_city') || 'İzmir');
  const [brokenChannelIds, setBrokenChannelIds] = useState<Set<string>>(new Set());
  const [hasCheckedLinks, setHasCheckedLinks] = useState(() => {
    const saved = sessionStorage.getItem('has_checked_links');
    return saved === 'true';
  });
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);

  const [autoPreviewEnabled, setAutoPreviewEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('auto_preview_enabled');
    return saved === null ? false : saved === 'true';
  });
  const [customProxyUrl, setCustomProxyUrl] = useState<string>(() => 
    localStorage.getItem('custom_proxy_url') || ''
  );
  const [deviceType, setDeviceType] = useState<'pc' | 'tv' | 'tablet' | 'phone'>(() => 
    (localStorage.getItem('device_type') as 'pc' | 'tv' | 'tablet' | 'phone') || 'pc'
  );
  const [profilePic, setProfilePic] = useState<string>(() => 
    localStorage.getItem('profile_pic') || PROFILE_PICS[0]
  );
  const [customOrders, setCustomOrders] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('custom_orders');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('custom_orders', JSON.stringify(customOrders));
  }, [customOrders]);

  const featuredChannel = useMemo(() => {
    if (channels.length === 0) return null;
    return channels[0];
  }, [channels]);

  // TV Navigation State
  const [activeRow, setActiveRow] = useState(0); // -1: Top Bar, 0+: Channel Rows
  const [activeCol, setActiveCol] = useState(0);
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [navContext, setNavContext] = useState<'browse' | 'player' | 'settings' | 'exit-confirm' | 'channel-menu' | 'channel-detail'>('browse');
  const [channelForDetail, setChannelForDetail] = useState<M3UChannel | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitFocus, setExitFocus] = useState(0); // 0: Evet, 1: Hayır
  const [settingsFocus, setSettingsFocus] = useState(0); 
  const [settingsSection, setSettingsSection] = useState(0);
  const [activeSettingsTab, setActiveSettingsTab] = useState(0); // 0: Görünüm, 1: Liste, 2: Genel
  const [settingsArea, setSettingsArea] = useState<'tabs' | 'sections' | 'content'>('tabs');
  const [sidebarFocus, setSidebarFocus] = useState(0); // 0-2: Tabs, 3: Close Button
  const [channelMenuId, setChannelMenuId] = useState<string | null>(null);
  const [channelMenuCategory, setChannelMenuCategory] = useState<string | null>(null);
  const [channelMenuFocus, setChannelMenuFocus] = useState(0);
  const settingsContentRef = useRef<HTMLDivElement>(null);
  const settingsSidebarRef = useRef<HTMLDivElement>(null);

  // Screen size detection for responsive focus and layout
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Only auto-update if not manually set in localStorage
      if (!localStorage.getItem('device_type')) {
        if (width < 640) setDeviceType('phone');
        else if (width < 1024) setDeviceType('tablet');
        else if (width > 2000) setDeviceType('tv');
        else setDeviceType('pc');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global focus visibility management
  useEffect(() => {
    if (navContext === 'browse') {
      if (activeRow < 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [activeRow, navContext]);

  // Scroll settings content to top when tab changes
  useEffect(() => {
    if (settingsContentRef.current) {
      settingsContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeSettingsTab]);

  useEffect(() => {
    if (showSettings && settingsSidebarRef.current) {
      const activeTabElement = settingsSidebarRef.current.querySelector(`[data-tab-id="${activeSettingsTab}"]`);
      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [activeSettingsTab, showSettings]);

  useEffect(() => {
    if (settingsContentRef.current) {
      settingsContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeSettingsTab]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const epgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('ui_mode', uiMode);
  }, [uiMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-color', themeColor);
    localStorage.setItem('theme_color', themeColor);
    
    // Update theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      (metaThemeColor as HTMLMetaElement).name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    (metaThemeColor as HTMLMetaElement).content = themeColor;
  }, [themeColor]);

  useEffect(() => {
    localStorage.setItem('mix_color_1', mixColor1);
    localStorage.setItem('mix_color_2', mixColor2);
  }, [mixColor1, mixColor2]);

  const uiClasses = useMemo(() => ({
    container: cn(
      "min-h-screen text-white font-sans selection:bg-red-600/30 overflow-x-hidden transition-all duration-500",
      uiMode === 'modern' && "bg-[#141414]",
      uiMode === 'classic' && "bg-[#0a0a0a]",
      uiMode === 'minimalist' && "bg-black",
      deviceType === 'tv' && "text-lg",
      deviceType === 'phone' && "text-sm"
    ),
    card: cn(
      "transition-all duration-300",
      uiMode === 'modern' && "rounded-2xl backdrop-blur-md bg-white/5 border border-white/10",
      uiMode === 'classic' && "rounded-lg bg-zinc-900 border border-zinc-800",
      uiMode === 'minimalist' && "rounded-none bg-transparent border-b border-white/5"
    ),
    button: cn(
      "transition-all duration-200 font-bold",
      uiMode === 'modern' && "rounded-xl",
      uiMode === 'classic' && "rounded-md",
      uiMode === 'minimalist' && "rounded-none border-b-2 border-transparent"
    ),
    input: cn(
      "outline-none transition-all",
      uiMode === 'modern' && "rounded-xl bg-black/40 border-white/10",
      uiMode === 'classic' && "rounded-md bg-zinc-900 border-zinc-700",
      uiMode === 'minimalist' && "rounded-none bg-transparent border-b border-white/20"
    )
  }), [uiMode]);

  const mixedColor = useMemo(() => {
    const r1 = parseInt(mixColor1.substring(1, 3), 16);
    const g1 = parseInt(mixColor1.substring(3, 5), 16);
    const b1 = parseInt(mixColor1.substring(5, 7), 16);

    const r2 = parseInt(mixColor2.substring(1, 3), 16);
    const g2 = parseInt(mixColor2.substring(3, 5), 16);
    const b2 = parseInt(mixColor2.substring(5, 7), 16);

    const r = Math.round((r1 + r2) / 2).toString(16).padStart(2, '0');
    const g = Math.round((g1 + g2) / 2).toString(16).padStart(2, '0');
    const b = Math.round((b1 + b2) / 2).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
  }, [mixColor1, mixColor2]);

  useEffect(() => {
    localStorage.setItem('weather_city', weatherCity);
  }, [weatherCity]);

  useEffect(() => {
    localStorage.setItem('recently_watched', JSON.stringify(recentlyWatched));
  }, [recentlyWatched]);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('canli_channels', JSON.stringify(canliChannels));
  }, [canliChannels]);

  useEffect(() => {
    localStorage.setItem('dizi_channels', JSON.stringify(diziChannels));
  }, [diziChannels]);

  useEffect(() => {
    localStorage.setItem('film_channels', JSON.stringify(filmChannels));
  }, [filmChannels]);

  useEffect(() => {
    localStorage.setItem('auto_preview_enabled', String(autoPreviewEnabled));
  }, [autoPreviewEnabled]);

  useEffect(() => {
    localStorage.setItem('poster_orientation', posterOrientation);
  }, [posterOrientation]);

  const toggleFavorite = (channelId: string) => {
    setFavorites(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.includes(channelId) 
        ? current.filter(id => id !== channelId)
        : [...current, channelId];
    });
  };

  useEffect(() => {
    if (channels.length === 0) {
      setActiveRow(0);
      setActiveCol(0);
    }
  }, [channels.length]);

  const handleDeleteChannel = (channelId: string) => {
    setChannels(prev => prev.filter(ch => ch.id !== channelId));
    setFavorites(prev => prev.filter(id => id !== channelId));
    setCanliChannels(prev => prev.filter(id => id !== channelId));
    setDiziChannels(prev => prev.filter(id => id !== channelId));
    setFilmChannels(prev => prev.filter(id => id !== channelId));
    setRecentlyWatched(prev => prev.filter(ch => ch.id !== channelId));
  };

  // Group channels by category
  const groupedChannels = useMemo(() => {
    const filtered = channels.filter(channel => 
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(channel.group || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (searchQuery) {
      return [['Arama Sonuçları', filtered]];
    }

    const groups: Record<string, M3UChannel[]> = {};
    const broken: M3UChannel[] = [];
    
    // Add Favorites as the first group if it has items
    if (Array.isArray(favorites) && favorites.length > 0) {
      const favoriteChannels = channels
        .filter(ch => favorites.includes(ch.id) && !brokenChannelIds.has(ch.id))
        .sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id));
      if (favoriteChannels.length > 0) {
        groups['Favorilerim'] = favoriteChannels;
      }
    }

    // Add Top 10 as a group if it has items
    const top10Channels = channels
      .filter(ch => ch.tvgNumber !== undefined && ch.tvgNumber >= 1 && ch.tvgNumber <= 10 && !brokenChannelIds.has(ch.id))
      .sort((a, b) => (a.tvgNumber || 0) - (b.tvgNumber || 0));
    
    if (top10Channels.length > 0) {
      groups['Top 10'] = top10Channels;
    }

    // Add Canlı as a group if it has items
    if (canliChannels.length > 0) {
      const matched = channels
        .filter(ch => canliChannels.includes(ch.id) && !brokenChannelIds.has(ch.id))
        .sort((a, b) => canliChannels.indexOf(a.id) - canliChannels.indexOf(b.id));
      if (matched.length > 0) groups['Canlı'] = matched;
    }

    // Add Dizi as a group if it has items
    if (diziChannels.length > 0) {
      const matched = channels
        .filter(ch => diziChannels.includes(ch.id) && !brokenChannelIds.has(ch.id))
        .sort((a, b) => diziChannels.indexOf(a.id) - diziChannels.indexOf(b.id));
      if (matched.length > 0) groups['Dizi'] = matched;
    }

    // Add Film as a group if it has items
    if (filmChannels.length > 0) {
      const matched = channels
        .filter(ch => filmChannels.includes(ch.id) && !brokenChannelIds.has(ch.id))
        .sort((a, b) => filmChannels.indexOf(a.id) - filmChannels.indexOf(b.id));
      if (matched.length > 0) groups['Film'] = matched;
    }

    // Add Recently Watched as the next group if it has items
    if (recentlyWatched.length > 0) {
      groups['İzlemeye Devam Et'] = recentlyWatched.filter(ch => !brokenChannelIds.has(ch.id));
    }

    filtered.forEach(channel => {
      if (brokenChannelIds.has(channel.id)) {
        broken.push(channel);
        return;
      }
      const groupName = channel.group || 'General';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(channel);
    });

    // Apply custom order for M3U groups
    Object.keys(groups).forEach(groupName => {
      const order = customOrders[groupName];
      if (order && order.length > 0) {
        groups[groupName].sort((a, b) => {
          const aIdx = order.indexOf(a.id);
          const bIdx = order.indexOf(b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return 0;
        });
      }
    });

    if (broken.length > 0) {
      groups['Çalışmayanlar'] = broken;
    }

    return Object.entries(groups)
      .filter(([group]) => {
        if (visibleCategories.length > 0) {
          return visibleCategories.includes(group) || group === 'Çalışmayanlar';
        }
        // Varsayılan olarak özel grupları gizle, M3U gruplarını göster
        const specialGroups = ['Favorilerim', 'Canlı', 'Dizi', 'Film', 'İzlemeye Devam Et', 'Çalışmayanlar'];
        return !specialGroups.includes(group);
      })
      .sort((a, b) => {
        const order = ['Favorilerim', 'Top 10', 'Canlı', 'Dizi', 'Film', 'İzlemeye Devam Et'];
        const aIdx = order.indexOf(a[0]);
        const bIdx = order.indexOf(b[0]);
        
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        
        if (a[0] === 'Çalışmayanlar') return 1;
        if (b[0] === 'Çalışmayanlar') return -1;
        
        return b[1].length - a[1].length;
      });
  }, [channels, searchQuery, recentlyWatched, visibleCategories, favorites, canliChannels, diziChannels, filmChannels, brokenChannelIds]);

  const toggleManualCategory = (channelId: string, type: 'canli' | 'dizi' | 'film') => {
    const setters = {
      canli: setCanliChannels,
      dizi: setDiziChannels,
      film: setFilmChannels
    };
    setters[type](prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.includes(channelId) 
        ? current.filter(id => id !== channelId)
        : [...current, channelId];
    });
  };

  const getCategoryGroups = (type: string) => {
    const groupNames = Array.from(new Set([
      ...channels.map(ch => String(ch.group || 'General')),
      'Canlı', 'Film', 'Dizi'
    ]));
    return groupNames.filter((g: string) => {
      const gl = g.toLowerCase();
      if (type === 'live') return gl.includes('live') || gl.includes('canlı') || gl.includes('canli') || gl.includes('tv');
      if (type === 'movies') return gl.includes('movie') || gl.includes('film') || gl.includes('sinema');
      if (type === 'series') return gl.includes('series') || gl.includes('dizi') || gl.includes('show');
      if (type === 'mixed') return !gl.includes('live') && !gl.includes('canlı') && !gl.includes('canli') && !gl.includes('tv') && !gl.includes('movie') && !gl.includes('film') && !gl.includes('sinema') && !gl.includes('series') && !gl.includes('dizi') && !gl.includes('show');
      return false;
    });
  };

  const toggleCategory = (type: 'live' | 'movies' | 'series' | 'mixed' | 'recent' | 'favorites' | 'top10') => {
    if (type === 'top10') {
      setVisibleCategories(prev => 
        prev.includes('Top 10') 
          ? prev.filter(c => c !== 'Top 10')
          : [...prev, 'Top 10']
      );
      return;
    }
    if (type === 'favorites') {
      setVisibleCategories(prev => 
        prev.includes('Favorilerim') 
          ? prev.filter(c => c !== 'Favorilerim')
          : [...prev, 'Favorilerim']
      );
      return;
    }
    if (type === 'recent') {
      setVisibleCategories(prev => 
        prev.includes('İzlemeye Devam Et') 
          ? prev.filter(c => c !== 'İzlemeye Devam Et')
          : [...prev, 'İzlemeye Devam Et']
      );
      return;
    }

    const targetGroups = getCategoryGroups(type as any);

    setVisibleCategories(prev => {
      const isAnyVisible = targetGroups.some(g => prev.includes(g));
      if (isAnyVisible) {
        return prev.filter(g => !targetGroups.includes(g));
      } else {
        return [...new Set([...prev, ...targetGroups])];
      }
    });
  };

  const moveChannel = (channelId: string, direction: 'left' | 'right', category: string) => {
    if (category === 'Favorilerim') {
      setFavorites(prev => {
        const idx = prev.indexOf(channelId);
        if (idx === -1) return prev;
        const newArr = [...prev];
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
        [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
        return newArr;
      });
    } else if (category === 'Canlı') {
      setCanliChannels(prev => {
        const idx = prev.indexOf(channelId);
        if (idx === -1) return prev;
        const newArr = [...prev];
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
        [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
        return newArr;
      });
    } else if (category === 'Dizi') {
      setDiziChannels(prev => {
        const idx = prev.indexOf(channelId);
        if (idx === -1) return prev;
        const newArr = [...prev];
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
        [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
        return newArr;
      });
    } else if (category === 'Film') {
      setFilmChannels(prev => {
        const idx = prev.indexOf(channelId);
        if (idx === -1) return prev;
        const newArr = [...prev];
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
        [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
        return newArr;
      });
    } else {
      // M3U groups
      setCustomOrders(prev => {
        const group = groupedChannels.find(([name]) => name === category);
        if (!group) return prev;
        const currentOrder = prev[category] || group[1].map(ch => ch.id);
        const idx = currentOrder.indexOf(channelId);
        if (idx === -1) return prev;
        const newOrder = [...currentOrder];
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newOrder.length) return prev;
        [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
        return { ...prev, [category]: newOrder };
      });
    }
  };

  useEffect(() => {
    console.log('navContext changed to:', navContext);
  }, [navContext]);

  const handleChannelSelect = (channel: M3UChannel) => {
    console.log('handleChannelSelect called for:', channel.name);
    
    // Check if it's a VOD content (Movie or Series)
    const isVOD = channel.group?.toLowerCase().includes('film') || 
                  channel.group?.toLowerCase().includes('movie') || 
                  channel.group?.toLowerCase().includes('dizi') || 
                  channel.group?.toLowerCase().includes('series') ||
                  filmChannels.includes(channel.id) ||
                  diziChannels.includes(channel.id);

    if (isVOD && navContext !== 'channel-detail') {
      setChannelForDetail(channel);
      setNavContext('channel-detail');
      return;
    }

    setRecentlyWatched(prev => {
      // Filter out if same ID OR any overlapping URL
      const filtered = prev.filter(ch => 
        ch.id !== channel.id && 
        !ch.urls.some(url => channel.urls.includes(url))
      );
      return [channel, ...filtered].slice(0, 20);
    });
    console.log('Setting currentChannel and navContext to player');
    setCurrentChannel(channel);
    setNavContext('player');
  };

  // Auto-preview logic
  useEffect(() => {
    setPreviewChannelId(null);
    if (navContext !== 'browse' || activeRow === -1 || !autoPreviewEnabled) return;

    const timer = setTimeout(() => {
      const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
      if (selectedChannel) {
        setPreviewChannelId(selectedChannel.id);
      }
    }, 2000); // 2 seconds delay

    return () => clearTimeout(timer);
  }, [activeRow, activeCol, navContext, groupedChannels]);

  useEffect(() => {
    setActiveRow(0);
    setActiveCol(0);
  }, [searchQuery]);

  useEffect(() => {
    if (channels.length > 0) {
      const categories = Array.from(new Set(channels.map(ch => ch.group || 'General')));
      setVisibleCategories(prev => {
        const combined = Array.from(new Set([...prev, ...categories]));
        return combined;
      });
    }
  }, [channels]);

  const getProxiedUrl = (url: string) => {
    if (Capacitor.isNativePlatform()) {
      return url;
    }
    if (customProxyUrl) {
      return `${customProxyUrl}${encodeURIComponent(url)}`;
    }
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  };

  const fetchWithProxy = async (url: string) => {
    return fetch(getProxiedUrl(url));
  };

  const primaryHeroButtons = useMemo(() => {
    if (!featuredChannel) return [];
    return [
      { id: 'play', label: 'Oynat', icon: Play, action: () => handleChannelSelect(featuredChannel) },
      { id: 'details', label: 'Detaylar', icon: Info, action: () => {
        setChannelForDetail(featuredChannel);
        setNavContext('channel-detail');
      } }
    ];
  }, [featuredChannel]);

  const filterHeroButtons = useMemo(() => {
    if (!featuredChannel) return [];
    
    const isVisible = (name: string) => visibleCategories.includes(name);
    
    const isCategoryActive = (type: string) => {
      const groups = getCategoryGroups(type);
      if (groups.length === 0) return false;
      return groups.some(g => visibleCategories.includes(g));
    };

    const getCategoryChannelsCount = (type: string) => {
      const groups = getCategoryGroups(type);
      return channels.filter(ch => {
        const g = ch.group || 'General';
        if (groups.includes(g)) return true;
        if (type === 'live' && canliChannels.includes(ch.id)) return true;
        if (type === 'movies' && filmChannels.includes(ch.id)) return true;
        if (type === 'series' && diziChannels.includes(ch.id)) return true;
        return false;
      }).length;
    };

    const hasLive = getCategoryChannelsCount('live') > 0;
    const hasMovies = getCategoryChannelsCount('movies') > 0;
    const hasSeries = getCategoryChannelsCount('series') > 0;
    const hasTop10 = channels.some(ch => ch.tvgNumber !== undefined && ch.tvgNumber >= 1 && ch.tvgNumber <= 10);

    return [
      { id: 'search', label: 'Ara', icon: Search, action: () => {
        const searchInput = document.getElementById('hero-search-input');
        if (searchInput) searchInput.focus();
      }, isActive: true },
      hasTop10 && {
        id: 'top10',
        label: 'Top 10',
        icon: Tv,
        action: () => toggleCategory('top10'),
        isActive: visibleCategories.includes('Top 10')
      },
      recentlyWatched.length > 0 && { 
        id: 'recent', 
        label: 'İzlemeye Devam Et', 
        icon: Clock, 
        action: () => toggleCategory('recent'),
        isActive: visibleCategories.includes('İzlemeye Devam Et')
      },
      favorites.length > 0 && { 
        id: 'favorites', 
        label: 'Favorilerim', 
        icon: Heart, 
        action: () => toggleCategory('favorites'),
        isActive: visibleCategories.includes('Favorilerim')
      },
      hasLive && {
        id: 'live',
        label: 'Canlı',
        icon: Tv,
        action: () => toggleCategory('live'),
        isActive: isCategoryActive('live')
      },
      hasMovies && {
        id: 'movies',
        label: 'Film',
        icon: Play,
        action: () => toggleCategory('movies'),
        isActive: isCategoryActive('movies')
      },
      hasSeries && {
        id: 'series',
        label: 'Dizi',
        icon: List,
        action: () => toggleCategory('series'),
        isActive: isCategoryActive('series')
      }
    ].filter((b): b is { id: string, label: string, icon: any, action: () => void, isActive: boolean } => !!b);
  }, [featuredChannel, recentlyWatched.length, favorites.length, themeColor, visibleCategories, channels, canliChannels.length, filmChannels.length, diziChannels.length]);

  // Remote Control Navigation
  const keyHoldTimer = useRef<NodeJS.Timeout | null>(null);
  const isKeyHeld = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('App handleKeyDown:', e.key, 'navContext:', navContext);
      if (navContext === 'player') return;

      let key = e.key;
      // Normalize TV remote keys
      if (key === 'Select' || key === 'OK') key = 'Enter';
      if (key === 'Back' || key === 'GoBack' || key === 'XF86Back' || key === 'MediaStop') key = 'Backspace';
      if (key === 'Up') key = 'ArrowUp';
      if (key === 'Down') key = 'ArrowDown';
      if (key === 'Left') key = 'ArrowLeft';
      if (key === 'Right') key = 'ArrowRight';
      if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause') key = 'Enter';

      // Detect long press for Enter/OK
      if (key === 'Enter' && !isKeyHeld.current) {
        isKeyHeld.current = true;
        keyHoldTimer.current = setTimeout(() => {
          if (navContext === 'browse' && activeRow !== -1) {
            const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
            if (selectedChannel) {
              toggleFavorite(selectedChannel.id);
            }
          }
        }, 800);
      }

      // Global Back/Escape
      if (key === 'Escape' || key === 'Backspace') {
        // Prevent default backspace behavior in inputs unless they are focused
        if (key === 'Backspace' && (document.activeElement?.tagName === 'INPUT')) {
          return;
        }

        if (currentChannel) {
          setCurrentChannel(null);
          setNavContext('browse');
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          setNavContext('browse');
          setActiveRow(0);
          setActiveCol(0);
          return;
        }
        if (navContext === 'browse' && activeRow !== -1) {
          setActiveRow(-1);
          return;
        }
        if (navContext === 'browse' && activeRow === -1 && channels.length > 0) {
          return;
        }
      }

      if (navContext === 'browse' && channels.length === 0) {
        switch (key) {
          case 'ArrowDown':
            e.preventDefault();
            if (activeRow === 1) setActiveRow(3);
            else setActiveRow(prev => Math.min(4, prev + 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (activeRow === 3) setActiveRow(1);
            else setActiveRow(prev => Math.max(0, prev - 1));
            break;
          case 'ArrowRight':
            if (activeRow === 1) {
              e.preventDefault();
              setActiveCol(1);
            }
            break;
          case 'ArrowLeft':
            if (activeRow === 1) {
              e.preventDefault();
              setActiveCol(0);
            }
            break;
          case 'Enter':
            e.preventDefault();
            if (activeRow === 0) {
              document.getElementById('empty-file-upload')?.click();
            } else if (activeRow === 1) {
              if (extraUrl) {
                setPlaylistUrl(extraUrl);
                handleUrlSubmit(extraUrl);
              } else if (activeCol === 0) {
                document.getElementById('empty-url-input')?.focus();
              }
            } else if (activeRow === 3) {
              localStorage.removeItem('m3u_deleted');
              localStorage.setItem('m3u_url', DEFAULT_M3U_URL);
              setSavedUrl(DEFAULT_M3U_URL);
              setPlaylistUrl(DEFAULT_M3U_URL);
              handleUrlSubmit(DEFAULT_M3U_URL);
            } else if (activeRow === 4) {
              setShowSettings(true);
              setNavContext('settings');
              setSettingsFocus(0);
              setActiveSettingsTab(1);
            }
            break;
        }
        return;
      }

      if (navContext === 'channel-menu') {
        const options = ['favorite', 'canli', 'film', 'dizi', 'move-left', 'move-right'];
        switch (key) {
          case 'ArrowLeft':
            e.preventDefault();
            setChannelMenuFocus(prev => Math.max(0, prev - 1));
            break;
          case 'ArrowRight':
            e.preventDefault();
            setChannelMenuFocus(prev => Math.min(options.length - 1, prev + 1));
            break;
          case 'Enter':
            e.preventDefault();
            const option = options[channelMenuFocus];
            if (option === 'favorite') {
              toggleFavorite(channelMenuId!);
            } else if (option === 'move-left') {
              moveChannel(channelMenuId!, 'left', channelMenuCategory || '');
            } else if (option === 'move-right') {
              moveChannel(channelMenuId!, 'right', channelMenuCategory || '');
            } else {
              toggleManualCategory(channelMenuId!, option as any);
            }
            
            if (option !== 'move-left' && option !== 'move-right') {
              setChannelMenuId(null);
              setNavContext('browse');
            }
            break;
          case 'Escape':
          case 'Backspace':
            e.preventDefault();
            setChannelMenuId(null);
            setNavContext('browse');
            break;
        }
        return;
      }

      if (navContext === 'channel-detail') {
        switch (key) {
          case 'Enter':
            e.preventDefault();
            if (channelForDetail) {
              // Force play by bypassing the VOD check in handleChannelSelect
              setRecentlyWatched(prev => {
                const filtered = prev.filter(ch => 
                  ch.id !== channelForDetail.id && 
                  !ch.urls.some(url => channelForDetail.urls.includes(url))
                );
                return [channelForDetail, ...filtered].slice(0, 20);
              });
              setCurrentChannel(channelForDetail);
              setNavContext('player');
              setChannelForDetail(null);
            }
            break;
          case 'Escape':
          case 'Backspace':
            e.preventDefault();
            setChannelForDetail(null);
            setNavContext('browse');
            break;
        }
        return;
      }

      if (navContext === 'settings') {
        switch (key) {
          case 'Enter':
          case 'OK':
            e.preventDefault();
            if (settingsArea === 'tabs') {
              if (sidebarFocus < 3) {
                setSettingsArea('sections');
                setSettingsSection(0);
              } else {
                setShowSettings(false);
                setNavContext('browse');
                setActiveRow(0);
                setActiveCol(0);
              }
            } else if (settingsArea === 'sections') {
              setSettingsArea('content');
              // Initialize focus based on section
              if (activeSettingsTab === 0) {
                if (settingsSection === 0) setSettingsFocus(0);
                else if (settingsSection === 1) setSettingsFocus(20);
                else if (settingsSection === 2) setSettingsFocus(13);
                else if (settingsSection === 3) setSettingsFocus(15);
              } else if (activeSettingsTab === 1) {
                if (settingsSection === 0) setSettingsFocus(0);
                else if (settingsSection === 1) setSettingsFocus(1);
                else if (settingsSection === 2) setSettingsFocus(4);
                else if (settingsSection === 3) setSettingsFocus(6);
                else if (settingsSection === 4) setSettingsFocus(8);
                else if (settingsSection === 5) setSettingsFocus(14);
              } else if (activeSettingsTab === 2) {
                if (settingsSection === 0) setSettingsFocus(0);
                else if (settingsSection === 1) setSettingsFocus(1);
                else if (settingsSection === 2) setSettingsFocus(2);
                else if (settingsSection === 3) setSettingsFocus(3);
                else if (settingsSection === 4) setSettingsFocus(11);
                else if (settingsSection === 5) setSettingsFocus(15);
                else if (settingsSection === 6) setSettingsFocus(16);
              }
            } else if (settingsArea === 'content') {
              const focusedElement = document.querySelector('.settings-focused') as HTMLElement;
              if (focusedElement) {
                focusedElement.click();
                if (focusedElement.tagName === 'INPUT') {
                  focusedElement.focus();
                }
              }
            }
            break;

          case 'Escape':
          case 'Back':
          case 'Backspace':
          case 'GoBack':
            e.preventDefault();
            if (settingsArea === 'content') {
              setSettingsArea('sections');
            } else if (settingsArea === 'sections') {
              setSettingsArea('tabs');
            } else {
              setShowSettings(false);
              setNavContext('browse');
              setActiveRow(0);
              setActiveCol(0);
            }
            break;

          case 'ArrowRight':
            e.preventDefault();
            if (settingsArea === 'content') {
              if (activeSettingsTab === 0) {
                if (settingsSection === 0 && settingsFocus < 12) setSettingsFocus(prev => prev + 1);
                else if (settingsSection === 1 && settingsFocus < 22) setSettingsFocus(prev => prev + 1);
                else if (settingsSection === 2 && settingsFocus === 13) setSettingsFocus(14);
                else if (settingsSection === 3 && settingsFocus === 15) setSettingsFocus(16);
              } else if (activeSettingsTab === 1) {
                if (settingsSection === 1 && settingsFocus === 1) setSettingsFocus(2);
                else if (settingsSection === 2 && settingsFocus === 4) setSettingsFocus(5);
                else if (settingsSection === 3 && settingsFocus === 6) setSettingsFocus(7);
                else if (settingsSection === 4 && settingsFocus < 13) setSettingsFocus(prev => prev + 1);
                else if (settingsSection === 5) {
                  if (settingsFocus === 20) setSettingsFocus(21);
                  else if (settingsFocus >= 30 && settingsFocus % 2 === 0) setSettingsFocus(prev => prev + 1);
                }
              } else if (activeSettingsTab === 2) {
                if (settingsSection === 3 && settingsFocus < 10) setSettingsFocus(prev => prev + 1);
                else if (settingsSection === 4 && settingsFocus < 14) setSettingsFocus(prev => prev + 1);
              }
            }
            break;

          case 'ArrowLeft':
            e.preventDefault();
            if (settingsArea === 'content') {
              if (activeSettingsTab === 0) {
                if (settingsSection === 0 && settingsFocus > 0) setSettingsFocus(prev => prev - 1);
                else if (settingsSection === 1 && settingsFocus > 20) setSettingsFocus(prev => prev - 1);
                else if (settingsSection === 2 && settingsFocus === 14) setSettingsFocus(13);
                else if (settingsSection === 3 && settingsFocus === 16) setSettingsFocus(15);
              } else if (activeSettingsTab === 1) {
                if (settingsSection === 1 && settingsFocus === 2) setSettingsFocus(1);
                else if (settingsSection === 2 && settingsFocus === 5) setSettingsFocus(4);
                else if (settingsSection === 3 && settingsFocus === 7) setSettingsFocus(6);
                else if (settingsSection === 4 && settingsFocus > 8) setSettingsFocus(prev => prev - 1);
                else if (settingsSection === 5) {
                  if (settingsFocus === 21) setSettingsFocus(20);
                  else if (settingsFocus >= 30 && settingsFocus % 2 !== 0) setSettingsFocus(prev => prev - 1);
                }
              } else if (activeSettingsTab === 2) {
                if (settingsSection === 3 && settingsFocus > 3) setSettingsFocus(prev => prev - 1);
                else if (settingsSection === 4 && settingsFocus > 11) setSettingsFocus(prev => prev - 1);
              }
            }
            break;

          case 'ArrowDown':
            e.preventDefault();
            if (settingsArea === 'tabs') {
              const nextFocus = (sidebarFocus + 1) % 4;
              setSidebarFocus(nextFocus);
              if (nextFocus < 3) setActiveSettingsTab(nextFocus);
            } else if (settingsArea === 'sections') {
              const maxSections = activeSettingsTab === 0 ? 3 : activeSettingsTab === 1 ? 5 : 6;
              setSettingsSection(prev => (prev + 1) % (maxSections + 1));
            } else if (settingsArea === 'content') {
              if (activeSettingsTab === 0) {
                if (settingsSection === 0) {
                  if (settingsFocus <= 8) setSettingsFocus(prev => prev + 4);
                  else if (settingsFocus < 12) setSettingsFocus(12);
                } else if (settingsSection === 1) {
                  // No vertical movement in UI Mode row
                } else if (settingsSection === 2 && settingsFocus === 13) setSettingsFocus(14);
                else if (settingsSection === 3 && settingsFocus === 15) setSettingsFocus(16);
              } else if (activeSettingsTab === 1) {
                if (settingsSection === 1 && (settingsFocus === 1 || settingsFocus === 2) && epgData) setSettingsFocus(3);
                else if (settingsSection === 4 && settingsFocus <= 10) setSettingsFocus(prev => prev + 3);
                else if (settingsSection === 5) {
                  if (settingsFocus < 22) setSettingsFocus(22);
                  else if (settingsFocus === 22 && playlists.length > 0) setSettingsFocus(30);
                  else if (settingsFocus >= 30 && settingsFocus < 30 + (playlists.length - 1) * 2) setSettingsFocus(prev => prev + 2);
                }
              } else if (activeSettingsTab === 2) {
                if (settingsSection === 3 && settingsFocus <= 6) setSettingsFocus(prev => prev + 4);
                else if (settingsSection === 4 && settingsFocus <= 12) setSettingsFocus(prev => prev + 2);
              }
            }
            break;

          case 'ArrowUp':
            e.preventDefault();
            if (settingsArea === 'tabs') {
              const nextFocus = (sidebarFocus - 1 + 4) % 4;
              setSidebarFocus(nextFocus);
              if (nextFocus < 3) setActiveSettingsTab(nextFocus);
            } else if (settingsArea === 'sections') {
              const maxSections = activeSettingsTab === 0 ? 3 : activeSettingsTab === 1 ? 5 : 6;
              setSettingsSection(prev => (prev - 1 + (maxSections + 1)) % (maxSections + 1));
            } else if (settingsArea === 'content') {
              if (activeSettingsTab === 0) {
                if (settingsSection === 0) {
                  if (settingsFocus >= 4 && settingsFocus <= 11) setSettingsFocus(prev => prev - 4);
                  else if (settingsFocus === 12) setSettingsFocus(8);
                } else if (settingsSection === 1) {
                  // No vertical movement in UI Mode row
                } else if (settingsSection === 2 && settingsFocus === 14) setSettingsFocus(13);
                else if (settingsSection === 3 && settingsFocus === 16) setSettingsFocus(15);
              } else if (activeSettingsTab === 1) {
                if (settingsSection === 1 && settingsFocus === 3) setSettingsFocus(1);
                else if (settingsSection === 4 && settingsFocus >= 11) setSettingsFocus(prev => prev - 3);
                else if (settingsSection === 5) {
                  if (settingsFocus === 22) setSettingsFocus(20);
                  else if (settingsFocus === 30 || settingsFocus === 31) setSettingsFocus(22);
                  else if (settingsFocus >= 32) setSettingsFocus(prev => prev - 2);
                }
              } else if (activeSettingsTab === 2) {
                if (settingsSection === 3 && settingsFocus >= 7) setSettingsFocus(prev => prev - 4);
                else if (settingsSection === 4 && settingsFocus >= 13) setSettingsFocus(prev => prev - 2);
              }
            }
            break;
        }
        return;
      }

      if (navContext === 'exit-confirm') {
        switch (key) {
          case 'ArrowLeft':
            e.preventDefault();
            setExitFocus(0);
            break;
          case 'ArrowRight':
            e.preventDefault();
            setExitFocus(1);
            break;
          case 'Enter':
            e.preventDefault();
            if (exitFocus === 0) {
              window.location.reload();
            } else {
              setShowExitConfirm(false);
              setNavContext('browse');
              setActiveRow(0);
              setActiveCol(0);
            }
            break;
          case 'Escape':
          case 'Backspace':
            e.preventDefault();
            setShowExitConfirm(false);
            setNavContext('browse');
            setActiveRow(0);
            setActiveCol(0);
            break;
        }
        return;
      }

      if (navContext === 'browse') {
        switch (key) {
          case 'Escape':
          case 'Backspace':
            e.preventDefault();
            setShowExitConfirm(true);
            setNavContext('exit-confirm');
            setExitFocus(1);
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (activeRow === 0) {
              setActiveRow(-1);
              setActiveCol(0);
            } else if (activeRow === -1) {
              setActiveRow(-2);
              setActiveCol(0);
            } else if (activeRow === -2) {
              setActiveRow(-3);
              setActiveCol(0);
            } else if (activeRow === -3) {
              setActiveRow(-4);
              setActiveCol(0);
            } else if (activeRow > 0) {
              const nextRow = activeRow - 1;
              const group = groupedChannels[nextRow]?.[0];
              setActiveRow(nextRow);
              if (group && collapsedRows.has(group)) {
                setActiveCol(-1);
              }
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (activeRow === -4) {
              setActiveRow(-3);
              setActiveCol(0);
            } else if (activeRow === -3) {
              setActiveRow(-2);
              setActiveCol(0);
            } else if (activeRow === -2) {
              setActiveRow(-1);
              setActiveCol(0);
            } else if (activeRow === -1) {
              const group = groupedChannels[0]?.[0];
              setActiveRow(0);
              if (group && collapsedRows.has(group)) {
                setActiveCol(-1);
              } else {
                setActiveCol(0);
              }
            } else {
              const isLastRow = activeRow === groupedChannels.length - 1;
              const nextRow = isLastRow ? 0 : activeRow + 1;
              const group = groupedChannels[nextRow]?.[0];
              setActiveRow(nextRow);
              
              // Reset or clamp column when wrapping around or changing rows
              const nextRowChannels = groupedChannels[nextRow]?.[1] || [];
              if (group && collapsedRows.has(group)) {
                setActiveCol(-1);
              } else if (activeCol >= nextRowChannels.length) {
                setActiveCol(Math.max(0, nextRowChannels.length - 1));
              }
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            if (activeRow === -4) return;
            if (activeRow >= 0) {
              setActiveCol(prev => Math.max(-1, prev - 1));
            } else {
              setActiveCol(prev => Math.max(0, prev - 1));
            }
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (activeRow === -4) return;
            if (activeRow === -3) {
              setActiveCol(prev => Math.min(primaryHeroButtons.length - 1, prev + 1));
            } else if (activeRow === -2) {
              setActiveCol(0);
            } else if (activeRow === -1) {
              const otherFilters = filterHeroButtons.filter(b => b.id !== 'search');
              setActiveCol(prev => Math.min(otherFilters.length - 1, prev + 1));
            } else {
              const group = groupedChannels[activeRow]?.[0];
              if (group && collapsedRows.has(group)) {
                // Do nothing, stay on header
                return;
              }
              const currentRowLength = groupedChannels[activeRow]?.[1].length || 0;
              setActiveCol(prev => Math.min(currentRowLength - 1, prev + 1));
            }
            break;
          case 'Enter':
            e.preventDefault();
            console.log('App Enter pressed, activeRow:', activeRow, 'activeCol:', activeCol);
            if (activeRow === -4) {
              setShowSettings(true);
              setNavContext('settings');
              setSettingsFocus(0);
            } else if (activeRow === -3) {
              const button = primaryHeroButtons[activeCol];
              if (button) button.action();
            } else if (activeRow === -2) {
              const searchBtn = filterHeroButtons.find(b => b.id === 'search');
              if (searchBtn) searchBtn.action();
            } else if (activeRow === -1) {
              const otherFilters = filterHeroButtons.filter(b => b.id !== 'search');
              const button = otherFilters[activeCol];
              if (button) button.action();
            } else {
              if (activeCol === -1) {
                const group = groupedChannels[activeRow]?.[0];
                if (group) {
                  setCollapsedRows(prev => {
                    const next = new Set(prev);
                    if (next.has(group)) next.delete(group);
                    else next.add(group);
                    return next;
                  });
                }
              } else {
                const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
                if (selectedChannel) {
                  handleChannelSelect(selectedChannel);
                }
              }
            }
            break;
          case 'Backspace':
          case 'Escape':
          case 'GoBack':
            e.preventDefault();
            setShowExitConfirm(true);
            setNavContext('exit-confirm');
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let key = e.key;
      if (key === 'Select' || key === 'OK') key = 'Enter';
      
      if (key === 'Enter') {
        if (keyHoldTimer.current) {
          clearTimeout(keyHoldTimer.current);
          keyHoldTimer.current = null;
        }
        isKeyHeld.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [navContext, groupedChannels, activeRow, activeCol, channels.length, currentChannel, showSettings, settingsFocus, playlistUrl, favorites]);

  const resolveUrl = (rawUrl: string) => {
    if (!rawUrl) return [];
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('http')) return [trimmed];
    // If it's a code, try cutt.ly first, then the raw string
    return [`https://cutt.ly/${trimmed}`, trimmed];
  };

  const addPlaylist = (name: string, url: string) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      url
    };
    const updatedPlaylists = [...playlists, newPlaylist];
    setPlaylists(updatedPlaylists);
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
    return newPlaylist;
  };

  const removePlaylist = (id: string) => {
    const updatedPlaylists = playlists.filter(p => p.id !== id);
    setPlaylists(updatedPlaylists);
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
    if (currentPlaylistId === id) {
      setCurrentPlaylistId(null);
      localStorage.removeItem('current_playlist_id');
    }
  };

  const switchPlaylist = async (playlist: Playlist) => {
    setCurrentPlaylistId(playlist.id);
    localStorage.setItem('current_playlist_id', playlist.id);
    setPlaylistUrl(playlist.url);
    if (playlist.epgUrl) setEpgUrl(playlist.epgUrl);
    await handleUrlSubmit(playlist.url);
  };

  const handleUrlSubmit = async (urlOverride?: string) => {
    const rawUrl = urlOverride || playlistUrl;
    if (!rawUrl) return;

    setIsLoading(true);
    setError(null);
    setChannels([]); // Clear current channels while loading new ones

    const urlsToTry = resolveUrl(rawUrl);

    let successfulResponse = null;
    let finalUrl = '';

    try {
      for (const url of urlsToTry) {
        try {
          // Try with proxy first
          let response = await fetchWithProxy(url);
          
          // If proxy fails or returns error, try direct (some URLs might have CORS enabled)
          if (!response.ok) {
            try {
              const directResponse = await fetch(url, { signal: AbortSignal.timeout(5000) });
              if (directResponse.ok) response = directResponse;
            } catch (e) {
              // Direct fetch failed, stick with proxy response
            }
          }

          if (response.ok) {
            successfulResponse = response;
            finalUrl = url;
            break;
          }
        } catch (e) {
          console.error(`Failed to load ${url}:`, e);
          
          // Last resort: try direct fetch if proxy itself failed
          try {
            const directResponse = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (directResponse.ok) {
              successfulResponse = directResponse;
              finalUrl = url;
              break;
            }
          } catch (directErr) {
            // Both failed
          }
        }
      }

      if (!successfulResponse) {
        throw new Error('Oynatma listesi yüklenemedi. URL\'yi kontrol edin.');
      }

      const content = await (successfulResponse as Response).text();
      const { channels: parsedChannels, epgUrl: extractedEpgUrl } = parseM3U(content);
      setChannels(parsedChannels);
      setHasCheckedLinks(false);
      setBrokenChannelIds(new Set());

      // Use extracted EPG URL if provided in M3U header and no manual EPG URL is set
      const finalEpgUrlToUse = epgUrl || extractedEpgUrl;

      // Load EPG if URL provided or extracted
      if (finalEpgUrlToUse) {
        try {
          const urlsToTryEpg = resolveUrl(finalEpgUrlToUse);
          let epg = null;
          for (const url of urlsToTryEpg) {
            try {
              const finalEpgUrl = getProxiedUrl(url);
              epg = await fetchAndParseEPG(finalEpgUrl);
              if (epg) {
                localStorage.setItem('epg_url', url);
                setEpgUrl(url);
                break;
              }
            } catch (e) {
              console.error(`EPG load failed for ${url}:`, e);
            }
          }
          if (epg) setEpgData(epg);
        } catch (epgErr) {
          console.error('EPG load failed:', epgErr);
        }
      }

      if (parsedChannels.length > 0) {
        // Save to localStorage
        localStorage.setItem('m3u_url', finalUrl);
        localStorage.removeItem('m3u_deleted');
        setSavedUrl(finalUrl);
        
        setShowSuccess(true);
        setNavContext('browse');
        setActiveRow(0);
        setActiveCol(0);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError('Bu oynatma listesinde kanal bulunamadı.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oynatma listesi yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAbortController = useRef<AbortController | null>(null);

  const checkChannelLinks = async (channelsToCheck: M3UChannel[]) => {
    if (isCheckingLinks) return;
    
    if (checkAbortController.current) {
      checkAbortController.current.abort();
    }
    checkAbortController.current = new AbortController();
    const signal = checkAbortController.current.signal;
    
    setIsCheckingLinks(true);
    setCheckProgress(0);
    
    const broken = new Set<string>();
    const concurrencyLimit = 100;
    const timeoutDuration = 3000;
    
    for (let i = 0; i < channelsToCheck.length; i += concurrencyLimit) {
      if (signal.aborted) break;
      
      const chunk = channelsToCheck.slice(i, i + concurrencyLimit);
      await Promise.all(chunk.map(async (channel) => {
        if (signal.aborted) return;
        
        let atLeastOneWorks = false;
        // Check URLs for this channel
        try {
          // Try all URLs for the channel
          for (const url of channel.urls) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
              
              const response = await fetch(getProxiedUrl(url), {
                signal: controller.signal,
                headers: { 'Range': 'bytes=0-1024' }
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok || response.status === 206) {
                atLeastOneWorks = true;
                break;
              }
            } catch (e) {
              // This URL failed, try next
            }
          }
        } catch (e) {
          // Channel check failed
        }

        if (!atLeastOneWorks) {
          broken.add(channel.id);
        }
      }));
      
      if (signal.aborted) break;
      
      setCheckProgress(Math.round(((i + chunk.length) / channelsToCheck.length) * 100));
      if (broken.size > 0) {
        setBrokenChannelIds(new Set(broken));
      }
    }
    
    if (!signal.aborted) {
      setIsCheckingLinks(false);
      setHasCheckedLinks(true);
      sessionStorage.setItem('has_checked_links', 'true');
    }
  };

  // Auto-load saved URL on startup
  useEffect(() => {
    const autoLoad = async () => {
      const savedEpgUrl = localStorage.getItem('epg_url');
      if (savedEpgUrl) setEpgUrl(savedEpgUrl);

      if (savedUrl && channels.length === 0) {
        await handleUrlSubmit(savedUrl);
      } else {
        setIsLoading(false);
      }
    };
    autoLoad();
  }, [savedUrl]);

  // Trigger link check on initial load
  useEffect(() => {
    if (channels.length > 0 && !hasCheckedLinks && !isCheckingLinks) {
      checkChannelLinks(channels);
    }
  }, [channels, hasCheckedLinks, isCheckingLinks]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { channels: parsedChannels, epgUrl: extractedEpgUrl } = parseM3U(content);
      setChannels(parsedChannels);
      setHasCheckedLinks(false);
      setBrokenChannelIds(new Set());

      // Use extracted EPG URL if provided in M3U header
      if (extractedEpgUrl) {
        setEpgUrl(extractedEpgUrl);
        localStorage.setItem('epg_url', extractedEpgUrl);
        // Trigger EPG load
        const loadEPG = async () => {
          try {
            const urlsToTryEpg = resolveUrl(extractedEpgUrl);
            let epg = null;
            for (const url of urlsToTryEpg) {
              try {
                const finalEpgUrl = getProxiedUrl(url);
                epg = await fetchAndParseEPG(finalEpgUrl);
                if (epg) break;
              } catch (err) {}
            }
            if (epg) setEpgData(epg);
          } catch (err) {}
        };
        loadEPG();
      }

      if (parsedChannels.length > 0) {
        setShowSuccess(true);
        setNavContext('browse');
        setActiveRow(0);
        setActiveCol(0);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError('Bu dosyada kanal bulunamadı.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={uiClasses.container}>
      {/* Navbar */}
      <nav className={cn(
        "fixed top-0 w-full z-50 flex items-center px-4 md:px-12 justify-between transition-all duration-500",
        scrolled || channels.length > 0 ? "bg-black h-16 md:h-16" : "bg-gradient-to-b from-black/80 to-transparent h-20 md:h-24"
      )}>
        <div className="flex items-center gap-8">
          <Logo uiMode={uiMode} />
          {channels.length > 0 && (
            <div className="hidden lg:flex items-center gap-5 text-sm font-medium text-zinc-300">
              <button className="hover:text-white transition-colors">Ana Sayfa</button>
              <button className="hover:text-white transition-colors">TV Programları</button>
              <button className="hover:text-white transition-colors">Filmler</button>
              <button className="hover:text-white transition-colors">Yeni ve Popüler</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <WeatherWidget city={weatherCity} themeColor={themeColor} />
          <DigitalClock themeColor={themeColor} />
          {isCheckingLinks && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
              <div className="w-3 h-3 border-2 border-white/10 border-t-white rounded-full animate-spin" style={{ borderTopColor: themeColor }} />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Kontrol: %{checkProgress}</span>
            </div>
          )}
          {channels.length > 0 && (
            <button 
              onClick={() => {
                setShowSettings(true);
                setNavContext('settings');
                setSettingsFocus(0);
              }}
              onPointerDown={() => {
                setNavContext('browse');
                setActiveRow(-4);
              }}
              onMouseEnter={() => {
                setNavContext('browse');
                setActiveRow(-4);
              }}
              className={cn(
                "w-8 h-8 rounded-sm overflow-hidden transition-all flex items-center justify-center",
                activeRow === -4 ? "ring-4 ring-white scale-125 shadow-2xl" : "hover:ring-2 ring-white"
              )}
              style={{ backgroundColor: themeColor }}
            >
              {profilePic === 'THEME_COLOR' ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <img 
                  src={profilePic} 
                  alt="Profil" 
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          )}
        </div>
      </nav>

      <main className="pb-20">
        <div className="animate-in fade-in duration-1000">
          {isLoading ? (
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" style={{ borderTopColor: themeColor }} />
              <p className="text-zinc-500 font-medium animate-pulse">Kanallar Yükleniyor...</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="relative min-h-[80vh] flex flex-col items-center justify-center space-y-8 text-center px-4 py-20">
              <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/60 to-[#141414]" />
              </div>
              
              <div className="relative z-10 space-y-8 max-w-2xl w-full">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
                    <Tv className="w-10 h-10 text-zinc-400" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Oynatma Listesi Yok</h2>
                    <p className="text-zinc-500 max-w-md mx-auto font-medium">
                      İzlemeye başlamak için bir M3U dosyası yükleyin veya bir URL adresi girin.
                    </p>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/20 border border-red-500/50 text-red-500 px-4 py-2 rounded-xl text-sm font-bold mt-4 max-w-md mx-auto"
                      >
                        {error}
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* File Upload Section */}
                  <div className={cn(
                    "bg-white/5 p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group cursor-pointer",
                    activeRow === 0 ? "border-white bg-white/10 scale-105 shadow-2xl" : "border-white/5 hover:border-white/10"
                  )}
                  onClick={() => document.getElementById('empty-file-upload')?.click()}
                  onPointerDown={() => { setActiveRow(0); setActiveCol(0); }}
                  onMouseEnter={() => { setActiveRow(0); setActiveCol(0); }}
                  >
                    <input id="empty-file-upload" type="file" accept=".m3u,.m3u8" className="hidden" onChange={handleFileUpload} />
                    <div className="p-4 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white">Dosya Yükle</div>
                      <div className="text-sm text-zinc-500">Cihazınızdan bir .m3u dosyası seçin</div>
                    </div>
                  </div>

                  {/* URL Input Section */}
                  <div className={cn(
                    "bg-white/5 p-8 rounded-3xl border-2 transition-all flex flex-col gap-4",
                    activeRow === 1 ? "border-white bg-white/10 scale-105 shadow-2xl" : "border-white/5"
                  )}
                  onPointerDown={() => { setActiveRow(1); setActiveCol(0); }}
                  onMouseEnter={() => { setActiveRow(1); setActiveCol(0); }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-white/10 rounded-2xl">
                        <LinkIcon className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-xl font-bold text-white">URL Adresi</div>
                        <div className="text-sm text-zinc-500">M3U linki veya Cutt.ly kodu</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="empty-url-input"
                        type="url"
                        placeholder="URL girin..."
                        className={cn(
                          "flex-1 bg-black/40 border rounded-xl px-4 py-3 outline-none transition-all text-sm font-bold",
                          activeRow === 1 && activeCol === 0 ? "border-white ring-4 ring-white/10" : "border-white/10"
                        )}
                        value={extraUrl}
                        onChange={(e) => setExtraUrl(e.target.value)}
                        onPointerDown={() => { setActiveRow(1); setActiveCol(0); }}
                        onFocus={() => { setActiveRow(1); setActiveCol(0); }}
                      />
                      <button
                        onClick={() => {
                          if (!extraUrl) return;
                          setPlaylistUrl(extraUrl);
                          handleUrlSubmit(extraUrl);
                        }}
                        onPointerDown={() => { setActiveRow(1); setActiveCol(1); }}
                        onMouseEnter={() => { setActiveRow(1); setActiveCol(1); }}
                        style={{ backgroundColor: themeColor }}
                        className={cn(
                          "px-6 py-3 rounded-xl font-bold text-white transition-all",
                          activeRow === 1 && activeCol === 1 ? "scale-110 shadow-xl brightness-110" : "opacity-90"
                        )}
                      >
                        Yükle
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => {
                      localStorage.removeItem('m3u_deleted');
                      localStorage.setItem('m3u_url', DEFAULT_M3U_URL);
                      setSavedUrl(DEFAULT_M3U_URL);
                      setPlaylistUrl(DEFAULT_M3U_URL);
                      handleUrlSubmit(DEFAULT_M3U_URL);
                    }}
                    onPointerDown={() => { setActiveRow(3); setActiveCol(0); }}
                    onMouseEnter={() => { setActiveRow(3); setActiveCol(0); }}
                    className={cn(
                      "px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3",
                      activeRow === 3 ? "bg-white text-black scale-105 shadow-xl" : "bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    <RefreshCw className={cn("w-5 h-5", activeRow === 3 && "animate-spin")} />
                    Varsayılan Listeyi Yükle
                  </button>

                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setNavContext('settings');
                      setSettingsFocus(0);
                      setActiveSettingsTab(1);
                    }}
                    onPointerDown={() => { setActiveRow(4); setActiveCol(0); }}
                    onMouseEnter={() => { setActiveRow(4); setActiveCol(0); }}
                    className={cn(
                      "px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3",
                      activeRow === 4 ? "bg-white text-black scale-105 shadow-xl" : "bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    <Settings className="w-5 h-5" />
                    Gelişmiş Ayarlar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Hero Section */}
              {featuredChannel && (
              <div className={cn("relative w-full overflow-hidden transition-all duration-500", searchQuery ? "h-[30vh]" : "h-[80vh]")}>
                <div className="absolute inset-0">
                  <img 
                    src={featuredChannel.logo || "https://picsum.photos/seed/cinema/1920/1080?blur=10"} 
                    alt="Hero" 
                    className="w-full h-full object-cover opacity-40 blur-sm scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                </div>

                <div className={cn("absolute left-4 md:left-12 max-w-2xl space-y-4 sm:space-y-6 transition-all duration-500", searchQuery ? "bottom-8" : "bottom-[20%] sm:bottom-[35%]")}>
                  {!searchQuery && (
                    <>
                      <div className="flex items-center gap-2 text-red-600 font-bold tracking-widest text-xs sm:text-sm">
                        <Tv className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                        <span>ÖNE ÇIKAN CANLI YAYIN</span>
                      </div>
                      <h1 className={cn(
                        "font-black tracking-tighter uppercase italic line-clamp-2",
                        deviceType === 'tv' ? "text-5xl sm:text-7xl md:text-9xl" : "text-3xl sm:text-5xl md:text-7xl"
                      )}>{featuredChannel.name}</h1>
                      <p className="text-sm sm:text-lg text-zinc-300 line-clamp-2 sm:line-clamp-3 font-medium">
                        {featuredChannel.group || 'Genel'} kategorisinden canlı yayın. M3UFLIX'te yüksek kaliteli yayın şu an yayında.
                      </p>
                    </>
                  )}
                  <div className="flex flex-col gap-4 pt-2">
                    {/* Primary Buttons Row */}
                    {!searchQuery && (
                      <div className="flex flex-wrap items-center gap-3">
                        {primaryHeroButtons.map((btn, idx) => {
                          const isFocused = activeRow === -3 && activeCol === idx;
                          const isPlay = btn.id === 'play';
                          
                          return (
                            <button 
                              key={btn.id}
                              onClick={btn.action}
                              onPointerDown={() => {
                                setActiveRow(-3);
                                setActiveCol(idx);
                              }}
                              onMouseEnter={() => {
                                setActiveRow(-3);
                                setActiveCol(idx);
                              }}
                              style={{ 
                                backgroundColor: isFocused ? 'white' : (isPlay ? themeColor : 'rgba(255,255,255,0.1)'),
                                color: isFocused ? 'black' : 'white'
                              }}
                              className={cn(
                                "font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg",
                                isPlay ? "px-6 sm:px-8 py-2 sm:py-3 rounded-md text-base sm:text-lg" : "px-6 py-2 rounded-md text-base bg-zinc-500/50 backdrop-blur-md",
                                isFocused && "scale-110 shadow-2xl ring-4 ring-white/20"
                              )}
                            >
                              <btn.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", isPlay && "fill-current")} />
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Search Row */}
                    <div className="flex items-center gap-2">
                      {filterHeroButtons.filter(b => b.id === 'search').map((btn, idx) => {
                        const isFocused = activeRow === -2 && activeCol === idx;
                        
                        return (
                          <div key={btn.id} className="relative">
                            <div className={cn(
                              "flex items-center transition-all",
                              isFocused ? "scale-110" : ""
                            )}>
                              <button 
                                onClick={btn.action}
                                onPointerDown={() => {
                                  setActiveRow(-2);
                                  setActiveCol(idx);
                                }}
                                onMouseEnter={() => {
                                  setActiveRow(-2);
                                  setActiveCol(idx);
                                }}
                                style={{ 
                                  backgroundColor: isFocused ? 'white' : 'rgba(255,255,255,0.05)',
                                  color: isFocused ? 'black' : 'white',
                                  borderColor: isFocused ? 'transparent' : 'rgba(255,255,255,0.1)'
                                }}
                                className={cn(
                                  "font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg border px-4 py-2 rounded-full text-xs",
                                  isFocused && "shadow-2xl ring-4 ring-white/20"
                                )}
                              >
                                <Search className="w-3 h-3" />
                                {btn.label}
                              </button>
                              <div className="relative flex items-center ml-2">
                                <input
                                  id="hero-search-input"
                                  type="text"
                                  placeholder="Ara..."
                                  className={cn(
                                    "bg-black/80 border rounded-full py-1.5 pl-4 pr-10 transition-all outline-none text-xs",
                                    isFocused || searchQuery 
                                      ? "w-48 opacity-100 border-white/40 ring-2 ring-white/10" 
                                      : "w-0 opacity-0 border-transparent"
                                  )}
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  onFocus={() => {
                                    setActiveRow(-2);
                                    setActiveCol(idx);
                                  }}
                                />
                                {searchQuery && (isFocused || searchQuery) && (
                                  <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 text-zinc-400 hover:text-white transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Filter Buttons Row */}
                    {!searchQuery && (
                      <div className="flex flex-wrap items-center gap-2">
                        {filterHeroButtons.filter(b => b.id !== 'search').map((btn, idx) => {
                          const isFocused = activeRow === -1 && activeCol === idx;
                          
                          return (
                            <div key={btn.id} className="relative">
                              <button 
                                onClick={btn.action}
                                onPointerDown={() => {
                                  setActiveRow(-1);
                                  setActiveCol(idx);
                                }}
                                onMouseEnter={() => {
                                  setActiveRow(-1);
                                  setActiveCol(idx);
                                }}
                                style={{ 
                                  backgroundColor: isFocused 
                                    ? 'white' 
                                    : (btn.isActive ? themeColor : 'transparent'),
                                  color: isFocused ? 'black' : (btn.isActive ? 'white' : 'white'),
                                  borderColor: isFocused ? 'transparent' : (btn.isActive ? 'transparent' : 'rgba(255,255,255,0.2)')
                                }}
                                className={cn(
                                  "font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg border px-4 py-2 rounded-full text-xs backdrop-blur-md",
                                  isFocused && "scale-110 shadow-2xl ring-4 ring-white/20"
                                )}
                              >
                                <btn.icon className="w-3 h-3" />
                                {btn.label}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rows */}
            <div className={cn("relative z-20 space-y-4 pb-20 transition-all duration-500", searchQuery ? "mt-8" : "-mt-24")}>
              {groupedChannels.map(([group, groupChannels], idx) => (
                <ChannelRow 
                  key={group} 
                  title={group} 
                  channels={groupChannels} 
                  onSelect={handleChannelSelect}
                  onFocus={(r, c) => {
                    setActiveRow(r);
                    setActiveCol(c);
                  }}
                  onToggleFavorite={toggleFavorite}
                  onDeleteChannel={handleDeleteChannel}
                  onLongPress={(id, category) => {
                    setChannelMenuId(id);
                    setChannelMenuCategory(category);
                    setNavContext('channel-menu');
                    setChannelMenuFocus(0);
                  }}
                  favorites={favorites}
                  rowIndex={idx}
                  activeRow={activeRow}
                  activeCol={activeCol}
                  orientation={posterOrientation}
                  previewChannelId={previewChannelId}
                  themeColor={themeColor}
                  deviceType={deviceType}
                  uiMode={uiMode}
                  isCollapsed={collapsedRows.has(group)}
                  customProxyUrl={customProxyUrl}
                  onToggleCollapse={() => {
                    setCollapsedRows(prev => {
                      const next = new Set(prev);
                      if (next.has(group)) next.delete(group);
                      else next.add(group);
                      return next;
                    });
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>

      {/* Channel Context Menu Overlay */}
      <AnimatePresence>
        {channelMenuId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => {
              setChannelMenuId(null);
              setNavContext('browse');
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-6 text-center">Seçenekler</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {[
                  { id: 'favorite', label: favorites.includes(channelMenuId) ? 'Favorilerden Çıkar' : 'Favorilere Ekle', icon: Heart, active: favorites.includes(channelMenuId) },
                  { id: 'canli', label: 'Canlı', icon: Tv, active: canliChannels.includes(channelMenuId) },
                  { id: 'film', label: 'Film', icon: Play, active: filmChannels.includes(channelMenuId) },
                  { id: 'dizi', label: 'Dizi', icon: List, active: diziChannels.includes(channelMenuId) },
                  { id: 'move-left', label: 'Sola Taşı', icon: ChevronLeft },
                  { id: 'move-right', label: 'Sağa Taşı', icon: ChevronRight }
                ].map((opt, idx) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (opt.id === 'favorite') {
                        toggleFavorite(channelMenuId);
                      } else if (opt.id === 'move-left') {
                        moveChannel(channelMenuId, 'left', channelMenuCategory || '');
                      } else if (opt.id === 'move-right') {
                        moveChannel(channelMenuId, 'right', channelMenuCategory || '');
                      } else {
                        toggleManualCategory(channelMenuId, opt.id as any);
                      }
                      
                      if (opt.id !== 'move-left' && opt.id !== 'move-right') {
                        setChannelMenuId(null);
                        setNavContext('browse');
                      }
                    }}
                    onPointerDown={() => {
                      setNavContext('channel-menu');
                      setChannelMenuFocus(idx);
                    }}
                    onMouseEnter={() => setChannelMenuFocus(idx)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-xl transition-all min-w-[100px]",
                      channelMenuFocus === idx 
                        ? "bg-white text-black scale-110 shadow-xl" 
                        : "bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    <opt.icon className={cn("w-6 h-6", 'active' in opt && opt.active && "fill-current text-red-500")} />
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 text-center">
                <p className="text-zinc-500 text-sm">Seçmek için Enter'a, kapatmak için Geri'ye basın</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={cn(
                "w-full h-full sm:h-[600px] sm:max-h-[90vh] sm:max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden",
                uiMode === 'modern' && "bg-zinc-900 border-0 sm:border border-white/10 sm:rounded-2xl",
                uiMode === 'classic' && "bg-black border-0 sm:border border-zinc-800 sm:rounded-lg",
                uiMode === 'minimalist' && "bg-black border-0 sm:border border-white/5 sm:rounded-none"
              )}
            >
              {/* Sidebar Tabs */}
              <div 
                ref={settingsSidebarRef}
                className="w-full md:w-56 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 p-3 md:p-5 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto no-scrollbar scroll-smooth"
              >
                <div className="hidden md:block mb-6">
                  <h2 className="text-xl font-black italic tracking-tighter uppercase text-white opacity-50">Ayarlar</h2>
                </div>
                {[
                  { id: 0, label: 'Görünüm', icon: Sun },
                  { id: 1, label: 'Liste', icon: List },
                  { id: 2, label: 'Genel', icon: Settings }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    onClick={() => {
                      if (settingsArea === 'tabs') {
                        setActiveSettingsTab(tab.id);
                        setSidebarFocus(tab.id);
                        setSettingsArea('content');
                        setSettingsFocus(0);
                      }
                    }}
                    onPointerDown={() => {
                      if (settingsArea === 'tabs') {
                        setActiveSettingsTab(tab.id);
                        setSidebarFocus(tab.id);
                        setSettingsArea('tabs');
                      }
                    }}
                    onMouseEnter={() => {
                      if (settingsArea === 'tabs') {
                        setActiveSettingsTab(tab.id);
                        setSidebarFocus(tab.id);
                        setSettingsArea('tabs');
                      }
                    }}
                    className={cn(
                      "relative flex-1 md:flex-none flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap overflow-hidden",
                      activeSettingsTab === tab.id 
                        ? "bg-white text-black scale-105 shadow-lg" 
                        : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
                      settingsArea === 'tabs' && sidebarFocus === tab.id && "ring-4 ring-white ring-offset-2 ring-offset-black z-10"
                    )}
                  >
                    {activeSettingsTab === tab.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" style={{ backgroundColor: themeColor }} />
                    )}
                    <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-xs md:text-sm">{tab.label}</span>
                    {settingsArea === 'tabs' && sidebarFocus === tab.id && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-auto text-[8px] font-black uppercase tracking-widest text-black/40"
                      >
                        [ENTER]
                      </motion.span>
                    )}
                  </button>
                ))}
                
                <div className="hidden md:block mt-auto pt-4 space-y-4">
                  {settingsArea === 'tabs' && (
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 animate-pulse">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Navigasyon</div>
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <div className="px-1.5 py-0.5 bg-white text-black rounded text-[10px]">ENTER</div>
                        <span>Düzenle</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setNavContext('browse');
                      setActiveRow(0);
                      setActiveCol(0);
                    }}
                    onPointerDown={() => {
                      setSidebarFocus(3);
                      setSettingsArea('tabs');
                    }}
                    onMouseEnter={() => {
                      setSidebarFocus(3);
                      setSettingsArea('tabs');
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                      settingsArea === 'tabs' && sidebarFocus === 3 
                        ? "bg-white text-black ring-4 ring-white ring-offset-2 ring-offset-black z-10" 
                        : "text-zinc-500 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <X className="w-5 h-5" />
                    <span>Kapat</span>
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="md:hidden p-4 border-b border-white/5 flex justify-between items-center">
                  <h2 className="text-xl font-black italic uppercase text-white">
                    {activeSettingsTab === 0 ? 'Görünüm' : activeSettingsTab === 1 ? 'Liste' : 'Genel'}
                  </h2>
                  <button onClick={() => {
                    setShowSettings(false);
                    setNavContext('browse');
                    setActiveRow(0);
                    setActiveCol(0);
                  }} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
                </div>

                <div className={cn(
                  "flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar scroll-smooth transition-all duration-500",
                  settingsArea === 'tabs' ? "opacity-30 grayscale-[0.5] scale-[0.98]" : "opacity-100 grayscale-0 scale-100"
                )} ref={settingsContentRef}>
                  <AnimatePresence mode="wait">
                    {activeSettingsTab === 0 && (
                      <motion.div 
                        key="tab-0"
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-10"
                      >
                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 0 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                        >
                          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                          Tema Rengi
                        </label>
                        <div className="flex flex-wrap gap-x-6 gap-y-8">
                          {[
                            { name: 'Kırmızı', color: '#dc2626' },
                            { name: 'Mavi', color: '#2563eb' },
                            { name: 'Yeşil', color: '#16a34a' },
                            { name: 'Mor', color: '#9333ea' },
                            { name: 'Turuncu', color: '#ea580c' },
                            { name: 'Sarı', color: '#eab308' },
                            { name: 'Pembe', color: '#db2777' },
                            { name: 'Turkuaz', color: '#0891b2' },
                            { name: 'İndigo', color: '#4f46e5' },
                            { name: 'Gül', color: '#e11d48' },
                            { name: 'Kehribar', color: '#d97706' },
                            { name: 'Kireç', color: '#65a30d' }
                          ].map((c, i) => (
                            <div key={c.color} className="flex flex-col items-center gap-2">
                              <button
                                onClick={() => setThemeColor(c.color)}
                                onPointerDown={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(i); } }}
                                onMouseEnter={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(i); } }}
                                style={{ backgroundColor: c.color }}
                                className={cn(
                                  "w-10 h-10 md:w-12 md:h-12 rounded-full transition-all border-4",
                                  themeColor === c.color ? "border-white scale-110 shadow-xl" : "border-transparent opacity-40 hover:opacity-100",
                                  settingsArea === 'content' && settingsFocus === i && "ring-4 ring-white scale-125 z-10 opacity-100 settings-focused"
                                )}
                                title={c.name}
                              />
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest transition-all",
                                themeColor === c.color ? "text-white" : "text-zinc-500",
                                settingsArea === 'content' && settingsFocus === i && "scale-110 text-white"
                              )}>
                                {c.name}
                              </span>
                            </div>
                          ))}

                          {/* Mixed Color Item */}
                          <div className="flex flex-col items-center gap-2">
                            <button
                              onClick={() => setThemeColor(mixedColor)}
                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(12); } }}
                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsSection(0); setSettingsFocus(12); } }}
                              style={{ backgroundColor: mixedColor }}
                              className={cn(
                                "w-10 h-10 md:w-12 md:h-12 rounded-lg transition-all border-4 flex items-center justify-center",
                                themeColor === mixedColor ? "border-white scale-110 shadow-xl" : "border-transparent opacity-40 hover:opacity-100",
                                settingsArea === 'content' && settingsFocus === 12 && "ring-4 ring-white scale-125 z-10 opacity-100 settings-focused"
                              )}
                              title="Karışım Rengi"
                            >
                              {themeColor === mixedColor && <Check className="w-6 h-6 text-white drop-shadow-md" />}
                            </button>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest transition-all",
                              themeColor === mixedColor ? "text-white" : "text-zinc-500",
                              settingsArea === 'content' && settingsFocus === 12 && "scale-110 text-white"
                            )}>
                              Karışım
                            </span>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 1 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(1); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(1); }}
                        >
                          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                          Arayüz Modu
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[
                            { id: 'modern', label: 'Modern', icon: Tv, desc: 'Cam efektli, canlı ve hareketli' },
                            { id: 'classic', label: 'Klasik', icon: List, desc: 'Geleneksel, sade ve hızlı' },
                            { id: 'minimalist', label: 'Minimalist', icon: Equal, desc: 'Sadece içerik odaklı' }
                          ].map((mode, idx) => (
                            <button
                              key={mode.id}
                              onClick={() => setUiMode(mode.id as UIMode)}
                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(20 + idx); } }}
                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(20 + idx); } }}
                              className={cn(
                                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center",
                                uiMode === mode.id 
                                  ? "border-white bg-white/10" 
                                  : "border-white/5 hover:border-white/20 bg-white/5",
                                settingsArea === 'content' && settingsFocus === (20 + idx) && "ring-4 ring-white scale-105 z-10 settings-focused"
                              )}
                            >
                              <mode.icon className="w-6 h-6" style={{ color: uiMode === mode.id ? themeColor : undefined }} />
                              <div>
                                <div className="font-bold text-sm">{mode.label}</div>
                                <div className="text-[10px] opacity-50">{mode.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 2 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(2); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(2); }}
                        >
                          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                          Renk Karıştırıcı
                        </label>
                        <div className="bg-white/5 p-6 rounded-2xl space-y-6">
                          <div className="flex items-center justify-center gap-8">
                            <div className="flex flex-col items-center gap-2">
                              <input 
                                type="color" 
                                value={mixColor1} 
                                onChange={(e) => setMixColor1(e.target.value)}
                                className={cn(
                                  "w-12 h-12 rounded-lg cursor-pointer bg-transparent border-2 transition-all",
                                  settingsArea === 'content' && settingsFocus === 13 ? "border-white scale-110 settings-focused" : "border-white/10"
                                )}
                                onPointerDown={() => { if (settingsArea === 'content') { setSettingsSection(2); setSettingsFocus(13); } }}
                                onMouseEnter={() => { if (settingsArea === 'content') { setSettingsSection(2); setSettingsFocus(13); } }}
                              />
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Renk 1</span>
                            </div>
                            <Plus className="w-4 h-4 text-zinc-500" />
                            <div className="flex flex-col items-center gap-2">
                              <input 
                                type="color" 
                                value={mixColor2} 
                                onChange={(e) => setMixColor2(e.target.value)}
                                className={cn(
                                  "w-12 h-12 rounded-lg cursor-pointer bg-transparent border-2 transition-all",
                                  settingsArea === 'content' && settingsFocus === 14 ? "border-white scale-110 settings-focused" : "border-white/10"
                                )}
                                onPointerDown={() => { if (settingsArea === 'content') { setSettingsSection(2); setSettingsFocus(14); } }}
                                onMouseEnter={() => { if (settingsArea === 'content') { setSettingsSection(2); setSettingsFocus(14); } }}
                              />
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Renk 2</span>
                            </div>
                            <Equal className="w-4 h-4 text-zinc-500" />
                            <div className="flex flex-col items-center gap-2">
                              <div 
                                className="w-12 h-12 rounded-lg border-2 border-white/10"
                                style={{ backgroundColor: mixedColor }}
                              />
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sonuç</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-center text-zinc-500 font-medium italic">İki rengi karıştırarak kendi özel temanızı oluşturun. Sonuç rengi yukarıdaki palete kare olarak eklenir.</p>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 3 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(3); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(3); }}
                        >
                          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                          Poster Görünümü
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            onClick={() => setPosterOrientation('landscape')}
                            onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(15); } }}
                            onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(15); } }}
                            className={cn(
                              "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4",
                              posterOrientation === 'landscape' 
                                ? "border-white bg-white/10" 
                                : "border-white/5 hover:border-white/20 bg-white/5",
                              settingsArea === 'content' && settingsFocus === 15 && "ring-4 ring-white scale-105 z-10 settings-focused"
                            )}
                          >
                            <div className="w-24 h-16 bg-zinc-800 rounded-lg border border-white/10 shadow-inner" />
                            <span className="font-bold text-lg">Yatay</span>
                          </button>
                          <button
                            onClick={() => setPosterOrientation('portrait')}
                            onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(16); } }}
                            onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(16); } }}
                            className={cn(
                              "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4",
                              posterOrientation === 'portrait' 
                                ? "border-white bg-white/10" 
                                : "border-white/5 hover:border-white/20 bg-white/5",
                              settingsArea === 'content' && settingsFocus === 16 && "ring-4 ring-white scale-105 z-10 settings-focused"
                            )}
                          >
                            <div className="w-16 h-24 bg-zinc-800 rounded-lg border border-white/10 shadow-inner" />
                            <span className="font-bold text-lg">Dikey</span>
                          </button>
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeSettingsTab === 1 && (
                    <motion.div 
                      key="tab-1"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 0 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                        >
                          Oynatma Listesi Yönetimi
                        </label>
                        <div className="space-y-4">
                          <div className="bg-white/5 p-6 rounded-2xl space-y-4">
                            <label className="text-sm font-bold text-zinc-400">M3U Dosyası Yükle</label>
                            <label className="block cursor-pointer group">
                              <input type="file" accept=".m3u,.m3u8" className="hidden" id="m3u-upload" onChange={handleFileUpload} />
                              <div className={cn(
                                "bg-black/40 border-2 border-dashed rounded-xl py-6 transition-all flex flex-col items-center gap-2",
                                settingsArea === 'content' && settingsFocus === 0 ? "border-white bg-white/5 settings-focused" : "border-white/10"
                              )}
                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(0); setSettingsFocus(0); } }}
                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(0); setSettingsFocus(0); } }}
                              onClick={() => document.getElementById('m3u-upload')?.click()}
                              >
                                <Upload className="w-6 h-6 text-zinc-500" />
                                <span className="text-sm font-bold text-zinc-300">Dosya Seç</span>
                              </div>
                            </label>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 1 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(1); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(1); }}
                        >
                          EPG Ayarları
                        </label>
                        <div className="bg-white/5 p-6 rounded-2xl space-y-4">
                          <label className="text-sm font-bold text-zinc-400">EPG Linki Ekle</label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="EPG URL'si girin..."
                              className={cn(
                                "flex-1 bg-black/40 border rounded-xl px-4 py-3 outline-none transition-all text-sm",
                                settingsArea === 'content' && settingsFocus === 1 ? "border-white ring-2 ring-white/20 settings-focused" : "border-white/10"
                              )}
                              value={epgUrl}
                              onChange={(e) => setEpgUrl(e.target.value)}
                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(1); } }}
                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(1); } }}
                            />
                            <button
                              id="epg-load-btn"
                              onClick={async () => {
                                if (!epgUrl) return;
                                setIsLoading(true);
                                try {
                                  const urlsToTry = resolveUrl(epgUrl);
                                  let epg = null;
                                  let successUrl = '';
                                  for (const url of urlsToTry) {
                                    try {
                                      epg = await fetchAndParseEPG(url);
                                      if (epg) {
                                        successUrl = url;
                                        break;
                                      }
                                    } catch (e) {
                                      console.error(`EPG load failed for ${url}:`, e);
                                    }
                                  }
                                  
                                  if (epg) {
                                    setEpgData(epg);
                                    localStorage.setItem('epg_url', successUrl);
                                    setShowSuccess(true);
                                    setTimeout(() => setShowSuccess(false), 3000);
                                  } else {
                                    throw new Error('EPG yüklenemedi.');
                                  }
                                } catch (err) {
                                  setError('EPG yüklenirken hata oluştu.');
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(2); } }}
                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(2); } }}
                              style={{ backgroundColor: themeColor }}
                              className={cn(
                                "px-6 py-3 rounded-xl font-bold text-white transition-all",
                                settingsArea === 'content' && settingsFocus === 2 ? "scale-105 shadow-lg brightness-110 settings-focused" : "opacity-90 hover:opacity-100"
                              )}
                            >
                              Yükle
                            </button>
                          </div>
                          {epgData && (
                            <button
                              onClick={() => {
                                setEpgUrl('');
                                setEpgData(null);
                                localStorage.removeItem('epg_url');
                              }}
                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(3); } }}
                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(3); } }}
                              className={cn(
                                "w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                settingsArea === 'content' && settingsFocus === 3 ? "bg-red-600 text-white settings-focused" : "bg-red-500/10 text-red-500"
                              )}
                            >
                              <Trash2 className="w-4 h-4" />
                              Mevcut EPG'yi Sil
                            </button>
                          )}
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 2 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(2); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(2); }}
                        >
                          URL Linki Ekle
                        </label>
                        <div className="bg-white/5 p-6 rounded-2xl space-y-4">
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="URL veya Cutt.ly kodu girin..."
                              className={cn(
                                "flex-1 bg-black/40 border rounded-xl px-4 py-3 outline-none transition-all text-sm",
                                settingsArea === 'content' && settingsFocus === 4 ? "border-white ring-2 ring-white/20 settings-focused" : "border-white/10"
                              )}
                              value={extraUrl}
                              onChange={(e) => setExtraUrl(e.target.value)}
                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(4); } }}
                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(4); } }}
                            />
                            <button
                              onClick={() => {
                                if (!extraUrl) return;
                                setPlaylistUrl(extraUrl);
                                handleUrlSubmit(extraUrl);
                              }}
                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(5); } }}
                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(5); } }}
                              style={{ backgroundColor: themeColor }}
                              className={cn(
                                "px-6 py-3 rounded-xl font-bold text-white transition-all",
                                settingsArea === 'content' && settingsFocus === 5 ? "scale-105 shadow-lg brightness-110 settings-focused" : "opacity-90 hover:opacity-100"
                              )}
                            >
                              Yükle
                            </button>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 3 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(3); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(3); }}
                        >
                          Liste İşlemleri
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            onClick={() => {
                              localStorage.removeItem('m3u_deleted');
                              localStorage.setItem('m3u_url', DEFAULT_M3U_URL);
                              setSavedUrl(DEFAULT_M3U_URL);
                              setPlaylistUrl(DEFAULT_M3U_URL);
                              handleUrlSubmit(DEFAULT_M3U_URL);
                            }}
                            onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(6); } }}
                            onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(6); } }}
                            className={cn(
                              "text-left px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                              settingsArea === 'content' && settingsFocus === 6 ? "bg-white text-black scale-105 shadow-xl settings-focused" : "bg-white/5 text-white hover:bg-white/10"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
                                <RefreshCw className={cn("w-6 h-6", settingsArea === 'content' && settingsFocus === 6 && "animate-spin")} />
                              </div>
                              <div>
                                <div className="text-lg">Ana Linki Yükle</div>
                                <div className="text-xs opacity-50 font-medium">Varsayılan listeyi açar</div>
                              </div>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => {
                              localStorage.removeItem('m3u_url');
                              localStorage.removeItem('epg_url');
                              localStorage.setItem('m3u_deleted', 'true');
                              setSavedUrl(null);
                              setEpgUrl('');
                              setEpgData(null);
                              setChannels([]);
                              setPlaylistUrl('');
                              setNavContext('browse');
                              setActiveRow(0);
                              setActiveCol(0);
                            }}
                            onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(7); } }}
                            onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(7); } }}
                            className={cn(
                              "text-left px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                              settingsArea === 'content' && settingsFocus === 7 ? "bg-red-600 text-white scale-105 shadow-xl settings-focused" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-red-500/20 rounded-xl group-hover:scale-110 transition-transform">
                                <Trash2 className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="text-lg">Listeyi Sil</div>
                                <div className="text-xs opacity-50 font-medium">Tüm verileri temizler</div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 4 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(4); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(4); }}
                        >
                          Kategori Görünürlüğü
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { id: 'top10', label: 'Top 10', icon: Tv },
                            { id: 'favorites', label: 'Favorilerim', icon: Heart },
                            { id: 'live', label: 'Canlı', icon: Tv },
                            { id: 'movies', label: 'Film', icon: Play },
                            { id: 'series', label: 'Dizi', icon: List },
                            { id: 'recent', label: 'İzlemeye Devam Et', icon: Clock }
                          ].map((cat, idx) => {
                            const isVisible = visibleCategories.includes(cat.label);
                            const focusIdx = 8 + idx;
                            return (
                              <button
                                key={cat.id}
                                onClick={() => toggleCategory(cat.id as any)}
                                onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(4); setSettingsFocus(focusIdx); } }}
                                onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(4); setSettingsFocus(focusIdx); } }}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm",
                                  settingsArea === 'content' && settingsFocus === focusIdx 
                                    ? "bg-white text-black scale-105 shadow-xl settings-focused" 
                                    : isVisible ? "bg-white/10 text-white" : "bg-white/5 text-zinc-500"
                                )}
                              >
                                <cat.icon className={cn("w-4 h-4", isVisible && ! (settingsArea === 'content' && settingsFocus === focusIdx) && "text-red-500")} style={{ color: isVisible && ! (settingsArea === 'content' && settingsFocus === focusIdx) ? themeColor : undefined }} />
                                <span>{cat.label}</span>
                                {isVisible && <Check className="w-3 h-3 ml-auto" />}
                              </button>
                            );
                          })}
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 5 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(5); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(5); }}
                        >
                          Çoklu Oynatma Listesi
                        </label>
                        <div className="bg-white/5 p-6 rounded-2xl space-y-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <input
                                type="text"
                                placeholder="Liste Adı (örn: Spor, Sinema)"
                                className={cn(
                                  "bg-black/40 border rounded-xl px-4 py-3 outline-none transition-all text-sm",
                                  settingsArea === 'content' && settingsFocus === 20 ? "border-white ring-2 ring-white/20 settings-focused" : "border-white/10"
                                )}
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(20); } }}
                                onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(20); } }}
                              />
                              <input
                                type="url"
                                placeholder="M3U URL'si"
                                className={cn(
                                  "bg-black/40 border rounded-xl px-4 py-3 outline-none transition-all text-sm",
                                  settingsArea === 'content' && settingsFocus === 21 ? "border-white ring-2 ring-white/20 settings-focused" : "border-white/10"
                                )}
                                value={newPlaylistUrl}
                                onChange={(e) => setNewPlaylistUrl(e.target.value)}
                                onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(21); } }}
                                onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(21); } }}
                              />
                            </div>
                            <button
                              onClick={() => {
                                if (!newPlaylistName || !newPlaylistUrl) return;
                                addPlaylist(newPlaylistName, newPlaylistUrl);
                                setNewPlaylistName('');
                                setNewPlaylistUrl('');
                                setShowSuccess(true);
                                setTimeout(() => setShowSuccess(false), 3000);
                              }}
                              onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(22); } }}
                              onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(22); } }}
                              style={{ backgroundColor: themeColor }}
                              className={cn(
                                "w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                                settingsArea === 'content' && settingsFocus === 22 ? "scale-105 shadow-lg brightness-110 settings-focused" : "opacity-90 hover:opacity-100"
                              )}
                            >
                              <Plus className="w-5 h-5" />
                              Yeni Liste Ekle
                            </button>
                          </div>

                          {playlists.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-white/5">
                              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Kayıtlı Listeler</label>
                              <div className="space-y-2">
                                {playlists.map((p, idx) => (
                                  <div 
                                    key={p.id}
                                    className={cn(
                                      "flex items-center justify-between p-3 rounded-xl transition-all",
                                      currentPlaylistId === p.id ? "bg-white/10 border border-white/20" : "bg-white/5"
                                    )}
                                  >
                                    <div className="flex-1 min-w-0 mr-4">
                                      <div className="text-sm font-bold text-white truncate">{p.name}</div>
                                      <div className="text-[10px] text-zinc-500 truncate opacity-50">{p.url}</div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => switchPlaylist(p)}
                                        onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(30 + idx * 2); } }}
                                        onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(30 + idx * 2); } }}
                                        className={cn(
                                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                          currentPlaylistId === p.id 
                                            ? "bg-green-500/20 text-green-500" 
                                            : settingsArea === 'content' && settingsFocus === 30 + idx * 2
                                              ? "bg-white text-black settings-focused"
                                              : "bg-white/10 text-white hover:bg-white/20"
                                        )}
                                      >
                                        {currentPlaylistId === p.id ? 'Aktif' : 'Seç'}
                                      </button>
                                      <button
                                        onClick={() => removePlaylist(p.id)}
                                        onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(31 + idx * 2); } }}
                                        onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(31 + idx * 2); } }}
                                        className={cn(
                                          "p-1.5 rounded-lg transition-all",
                                          settingsArea === 'content' && settingsFocus === 31 + idx * 2
                                            ? "bg-red-600 text-white settings-focused"
                                            : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                        )}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeSettingsTab === 2 && (
                    <motion.div 
                      key="tab-2"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-10"
                    >
                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 0 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                          onMouseEnter={() => { if (settingsArea === 'sections') setSettingsSection(0); }}
                        >
                          Hava Durumu Ayarları
                        </label>
                        <div className="relative">
                          <input
                            id="city-input"
                            type="text"
                            value={weatherCity}
                            onChange={(e) => setWeatherCity(e.target.value)}
                            onPointerDown={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(0); setSettingsFocus(0); } }}
                            onMouseEnter={() => { if (settingsArea === 'content') { setSettingsArea('content'); setSettingsSection(0); setSettingsFocus(0); } }}
                            className={cn(
                              "w-full bg-white/5 border-2 rounded-2xl px-6 py-4 outline-none transition-all text-lg font-bold",
                              settingsArea === 'content' && settingsFocus === 0 ? "border-white ring-4 ring-white/20 settings-focused" : "border-white/5"
                            )}
                            placeholder="Şehir adı girin..."
                          />
                          <Cloud className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500" />
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 1 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(1); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(1); }}
                        >
                          Özel Proxy Ayarları
                        </label>
                        <div className="relative">
                          <input
                            id="proxy-input"
                            type="text"
                            value={customProxyUrl}
                            onChange={(e) => {
                              setCustomProxyUrl(e.target.value);
                              localStorage.setItem('custom_proxy_url', e.target.value);
                            }}
                            onPointerDown={() => { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(1); }}
                            onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(1); setSettingsFocus(1); }}
                            className={cn(
                              "w-full bg-white/5 border-2 rounded-2xl px-6 py-4 outline-none transition-all text-lg font-bold",
                              settingsArea === 'content' && settingsFocus === 1 ? "border-white ring-4 ring-white/20 settings-focused" : "border-white/5"
                            )}
                            placeholder="Örn: https://proxy.com/?url="
                          />
                          <Link2 className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500" />
                        </div>
                        <p className="text-xs text-zinc-500 px-2 italic">Boş bırakılırsa sistemin kendi proxy'si kullanılır.</p>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 2 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(2); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(2); }}
                        >
                          Oynatma Ayarları
                        </label>
                        <button 
                          onClick={() => setAutoPreviewEnabled(prev => !prev)}
                          onPointerDown={() => { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(2); }}
                          onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(2); setSettingsFocus(2); }}
                          className={cn(
                            "w-full px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                            settingsArea === 'content' && settingsFocus === 2 ? "bg-white text-black scale-105 shadow-xl settings-focused" : "bg-white/5 text-white hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "p-3 rounded-xl transition-transform",
                              settingsArea === 'content' && settingsFocus === 2 ? "bg-black/10" : "bg-white/10"
                            )}>
                              <Play className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                              <div className="text-lg">Otomatik Önizleme</div>
                              <div className="text-xs opacity-50 font-medium">Poster üzerinde bekleyince oynatır</div>
                            </div>
                          </div>
                          <div className={cn(
                            "w-12 h-6 rounded-full relative transition-colors",
                            autoPreviewEnabled ? "bg-emerald-500" : "bg-zinc-700"
                          )}>
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                              autoPreviewEnabled ? "right-1" : "left-1"
                            )} />
                          </div>
                        </button>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 3 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(3); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(3); }}
                        >
                          Profil Resmi
                        </label>
                        <div className="grid grid-cols-4 gap-4">
                          {PROFILE_PICS.map((pic, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setProfilePic(pic);
                                localStorage.setItem('profile_pic', pic);
                              }}
                              onPointerDown={() => { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(3 + i); }}
                              onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(3); setSettingsFocus(3 + i); }}
                              className={cn(
                                "aspect-square rounded-2xl overflow-hidden border-4 transition-all relative group flex items-center justify-center",
                                profilePic === pic ? "border-white" : "border-transparent hover:border-white/20",
                                settingsArea === 'content' && settingsFocus === (3 + i) && "ring-4 ring-white scale-110 z-10 shadow-2xl settings-focused"
                              )}
                              style={{ backgroundColor: themeColor }}
                            >
                              {pic === 'THEME_COLOR' ? (
                                <User className="w-12 h-12 text-white" />
                              ) : (
                                <img 
                                  src={pic} 
                                  alt={`Profil ${i + 1}`} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer" 
                                />
                              )}
                              {profilePic === pic && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Check className="w-8 h-8 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 4 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(4); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(4); }}
                        >
                          Ekran Seçimi
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { id: 'pc', label: 'PC', icon: Monitor },
                            { id: 'tv', label: 'TV', icon: Tv },
                            { id: 'tablet', label: 'Tablet', icon: Tablet },
                            { id: 'phone', label: 'Telefon', icon: Smartphone }
                          ].map((device, i) => (
                            <button
                              key={device.id}
                              onClick={() => {
                                setDeviceType(device.id as any);
                                localStorage.setItem('device_type', device.id);
                              }}
                              onPointerDown={() => { setSettingsArea('content'); setSettingsSection(4); setSettingsFocus(11 + i); }}
                              onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(4); setSettingsFocus(11 + i); }}
                              className={cn(
                                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3",
                                deviceType === device.id 
                                  ? "border-white bg-white/10" 
                                  : "border-white/5 hover:border-white/20 bg-white/5",
                                settingsArea === 'content' && settingsFocus === (11 + i) && "ring-4 ring-white scale-105 z-10 settings-focused"
                              )}
                            >
                              <device.icon className="w-6 h-6" />
                              <span className="font-bold text-sm">{device.label}</span>
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === 5 && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(5); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(5); }}
                        >
                          Sistem
                        </label>
                        <button
                          onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                          }}
                          onPointerDown={() => { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(15); }}
                          onMouseEnter={() => { setSettingsArea('content'); setSettingsSection(5); setSettingsFocus(15); }}
                          className={cn(
                            "w-full px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                            settingsArea === 'content' && settingsFocus === 15 ? "bg-red-600 text-white scale-105 shadow-xl settings-focused" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/20 rounded-xl group-hover:scale-110 transition-transform">
                              <RefreshCw className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                              <div className="text-lg">Tüm Verileri Sıfırla</div>
                              <div className="text-xs opacity-50 font-medium">Uygulamayı fabrika ayarlarına döndürür</div>
                            </div>
                          </div>
                        </button>
                      </section>
                    </motion.div>
                  )}
                  </AnimatePresence>

                      {/* Universal Back Button for Mobile/Touch/Remote */}
                      <div className="pt-10 space-y-4">
                        <label 
                          className={cn(
                            "text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all p-2 rounded-lg",
                            settingsArea === 'sections' && settingsSection === (activeSettingsTab === 0 ? 3 : activeSettingsTab === 1 ? 5 : 6) && "bg-white/10 text-white"
                          )}
                          onPointerDown={() => { setSettingsArea('sections'); setSettingsSection(activeSettingsTab === 0 ? 3 : activeSettingsTab === 1 ? 5 : 6); }}
                          onMouseEnter={() => { setSettingsArea('sections'); setSettingsSection(activeSettingsTab === 0 ? 3 : activeSettingsTab === 1 ? 5 : 6); }}
                        >
                          Ayarlardan Çık
                        </label>
                        <button 
                          onClick={() => {
                            if (settingsArea === 'content') setSettingsArea('sections');
                            else setSettingsArea('tabs');
                          }}
                          onPointerDown={() => {
                            setSettingsArea('content');
                            setSettingsSection(activeSettingsTab === 0 ? 3 : activeSettingsTab === 1 ? 5 : 6);
                            setSettingsFocus(activeSettingsTab === 0 ? 17 : activeSettingsTab === 1 ? 14 : 16);
                          }}
                          onMouseEnter={() => { 
                            setSettingsArea('content'); 
                            setSettingsSection(activeSettingsTab === 0 ? 3 : activeSettingsTab === 1 ? 5 : 6);
                            setSettingsFocus(activeSettingsTab === 0 ? 17 : activeSettingsTab === 1 ? 14 : 16); 
                          }}
                          style={{ backgroundColor: (settingsArea === 'content' && settingsFocus === (activeSettingsTab === 0 ? 17 : activeSettingsTab === 1 ? 14 : 16)) ? themeColor : undefined }}
                          className={cn(
                            "w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                            (settingsArea === 'content' && settingsFocus === (activeSettingsTab === 0 ? 17 : activeSettingsTab === 1 ? 14 : 16)) ? "text-white scale-105 shadow-2xl settings-focused" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                          )}
                        >
                          <ChevronLeft className="w-6 h-6" />
                          Geri Dön
                        </button>
                      </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channel Detail View */}
      <AnimatePresence>
        {navContext === 'channel-detail' && channelForDetail && (
          <ChannelDetail
            channel={channelForDetail}
            themeColor={themeColor}
            uiMode={uiMode}
            onClose={() => {
              setChannelForDetail(null);
              setNavContext('browse');
            }}
            onPlay={(channel) => {
              // Force play by bypassing the VOD check in handleChannelSelect
              setRecentlyWatched(prev => {
                const filtered = prev.filter(ch => 
                  ch.id !== channel.id && 
                  !ch.urls.some(url => channel.urls.includes(url))
                );
                return [channel, ...filtered].slice(0, 20);
              });
              setCurrentChannel(channel);
              setNavContext('player');
              setChannelForDetail(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[60] bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 font-bold"
          >
            <div className="bg-white/20 p-1 rounded-full">
              <Check className="w-5 h-5" />
            </div>
            Oynatma Listesi Başarıyla Yüklendi!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Dialog */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-8"
            >
              <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mx-auto border border-red-600/20">
                <X className="w-10 h-10 text-red-600" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">Çıkış Yapılsın mı?</h2>
                <p className="text-zinc-400 font-medium">Uygulamadan çıkmak istediğinize emin misiniz?</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => window.location.reload()}
                  onPointerDown={() => setExitFocus(0)}
                  onMouseEnter={() => setExitFocus(0)}
                  style={{ 
                    backgroundColor: exitFocus === 0 ? themeColor : 'rgba(255,255,255,0.05)',
                    color: exitFocus === 0 ? 'white' : 'rgba(255,255,255,0.4)'
                  }}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all",
                    exitFocus === 0 ? "scale-105 shadow-2xl" : "hover:bg-white/10"
                  )}
                >
                  Evet
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    setNavContext('browse');
                  }}
                  onPointerDown={() => setExitFocus(1)}
                  onMouseEnter={() => setExitFocus(1)}
                  style={{ 
                    backgroundColor: exitFocus === 1 ? 'white' : 'rgba(255,255,255,0.05)',
                    color: exitFocus === 1 ? 'black' : 'rgba(255,255,255,0.4)'
                  }}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all",
                    exitFocus === 1 ? "scale-105 shadow-2xl" : "hover:bg-white/10"
                  )}
                >
                  Hayır
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Player */}
      {currentChannel && (
        <>
          {console.log('Rendering VideoPlayer for:', currentChannel.name)}
          <VideoPlayer 
          url={currentChannel.urls[0]} 
          channel={currentChannel}
          channels={channels}
          epgData={epgData}
          themeColor={themeColor}
          customProxyUrl={customProxyUrl}
          onClose={() => {
            setCurrentChannel(null);
            setNavContext('browse');
          }} 
          onChannelSelect={handleChannelSelect}
        />
      </>
      )}
    </div>
  );
}
