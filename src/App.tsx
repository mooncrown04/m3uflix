import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Search, Upload, Link as LinkIcon, Tv, List, Grid, X, Info, ChevronRight, ChevronLeft, Plus, Check, Settings, Clock, Cloud, Sun, CloudRain, CloudLightning, Snowflake, RefreshCw } from 'lucide-react';
import { CapacitorHttp } from '@capacitor/core';
import { parseM3U, M3UChannel } from './utils/m3uParser';
import { fetchAndParseEPG, EPGData } from './utils/epgParser';
import { VideoPlayer } from './components/VideoPlayer';
import { PreviewPlayer } from './components/PreviewPlayer';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChannelRowProps {
  title: string;
  channels: M3UChannel[];
  onSelect: (channel: M3UChannel) => void;
  onFocus: (row: number, col: number) => void;
  rowIndex: number;
  activeRow: number;
  activeCol: number;
  orientation: 'landscape' | 'portrait';
  previewChannelId: string | null;
  themeColor: string;
}

const ChannelRow: React.FC<ChannelRowProps> = ({ title, channels, onSelect, onFocus, rowIndex, activeRow, activeCol, orientation, previewChannelId, themeColor }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isActiveRow = rowIndex === activeRow;

  useEffect(() => {
    if (isActiveRow && scrollRef.current) {
      const activeElement = scrollRef.current.children[activeCol] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [isActiveRow, activeCol]);

  return (
    <div className="space-y-3 group/row relative">
      <h3 
        style={{ color: isActiveRow ? themeColor : undefined }}
        className={cn(
          "text-xl font-bold px-4 md:px-12 transition-colors",
          !isActiveRow && "text-zinc-500"
        )}
      >
        {title}
      </h3>
      <div className="relative">
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 pt-8 pb-8 snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {channels.map((channel, colIndex) => {
            const isFocused = isActiveRow && colIndex === activeCol;
            const isPreviewing = isFocused && previewChannelId === channel.id;

            return (
              <div key={channel.id} className="flex flex-col gap-2 snap-start">
                <motion.button
                  animate={{ 
                    scale: isFocused ? 1.15 : 1,
                    zIndex: isFocused ? 30 : 10,
                    y: isFocused ? -10 : 0
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => {
                    onFocus(rowIndex, colIndex);
                    onSelect(channel);
                  }}
                  onMouseEnter={() => onFocus(rowIndex, colIndex)}
                  style={{ 
                    boxShadow: isFocused ? `0 0 30px ${themeColor}4d` : undefined,
                    borderColor: isFocused ? themeColor : 'transparent'
                  }}
                  className={cn(
                    "relative flex-none bg-zinc-900 rounded-md overflow-hidden group/card transition-all duration-300 border-4",
                    orientation === 'landscape' ? "w-40 md:w-56 aspect-video" : "w-32 md:w-44 aspect-[2/3]"
                  )}
                >
                  {isPreviewing ? (
                    <div className="w-full h-full bg-black">
                      <PreviewPlayer url={channel.url} />
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
                </motion.button>
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
      </div>
    </div>
  );
};

const Logo = () => {
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
            className="flex items-center gap-2 origin-left"
          >
            <Tv className="text-yellow-400 w-8 h-8 md:w-10 md:h-10 fill-current" />
            <span className="font-black text-2xl md:text-3xl tracking-tighter uppercase italic flex">
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
  const [weather, setWeather] = useState<{ temp: number, code: number } | null>(null);

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
            code: weatherData.current_weather.weathercode
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

  const getEmoji = (code: number) => {
    if (code === 0) return '☀️';
    if (code >= 1 && code <= 3) return '🌤️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 95 && code <= 99) return '⛈️';
    return '🌡️';
  };

  if (!weather) return null;

  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md mr-4">
      <span className="text-xl">{getEmoji(weather.code)}</span>
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

export default function App() {
  const [channels, setChannels] = useState<M3UChannel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentChannel, setCurrentChannel] = useState<M3UChannel | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [epgData, setEpgData] = useState<EPGData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [posterOrientation, setPosterOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [previewChannelId, setPreviewChannelId] = useState<string | null>(null);
// Bu kısmı App.tsx içinde güncelle
const [savedUrl, setSavedUrl] = useState<string | null>(() => {
  try {
    const saved = localStorage.getItem('m3u_url');
    // Eğer daha önce kaydedilmiş bir link varsa onu kullan
    if (saved && saved.startsWith('http')) return saved;
    
    // Eğer silinmişse ama biz yine de varsayılanla başlasın istiyorsak:
    return DEFAULT_M3U_URL; 
  } catch (e) {
    return DEFAULT_M3U_URL;
  }
});

useEffect(() => {
  // Uygulama açıldığında eğer kayıtlı URL varsa ve liste henüz boşsa
  if (savedUrl && channels.length === 0 && !isLoading && !error) {
    setPlaylistUrl(savedUrl);
    
    // Küçük bir gecikme (1 saniye) TV Box'ın kendine gelmesini sağlar
    const timer = setTimeout(() => {
       // Eğer handleUrlSubmit parametre almıyorsa direkt çağır
       // Eğer e.preventDefault() bekliyorsa içini boş geçebiliriz
       handleUrlSubmit(); 
    }, 1000);

    return () => clearTimeout(timer);
  }
}, [savedUrl, channels.length, isLoading, error]); 
// Bağımlılık dizisine bunları eklemek daha güvenlidir


  const [themeColor, setThemeColor] = useState<string>(() => localStorage.getItem('theme_color') || '#dc2626'); // Default red-600
  const [recentlyWatched, setRecentlyWatched] = useState<M3UChannel[]>(() => {
    const saved = localStorage.getItem('recently_watched');
    return saved ? JSON.parse(saved) : [];
  });
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [weatherCity, setWeatherCity] = useState<string>(() => localStorage.getItem('weather_city') || 'İzmir');

  const featuredChannel = useMemo(() => {
    if (channels.length === 0) return null;
    return channels[0];
  }, [channels]);

  // TV Navigation State
  const [activeRow, setActiveRow] = useState(0); // -1: Top Bar, 0+: Channel Rows
  const [activeCol, setActiveCol] = useState(0);
  const [navContext, setNavContext] = useState<'landing' | 'browse' | 'player' | 'settings'>('landing');
  const [landingFocus, setLandingFocus] = useState(0); // 0: input, 1: submit, 2: upload
  const [settingsFocus, setSettingsFocus] = useState(0); 
  const [activeSettingsTab, setActiveSettingsTab] = useState(0); // 0: Görünüm, 1: Liste, 2: Genel
  const [settingsArea, setSettingsArea] = useState<'tabs' | 'content'>('tabs');
  const settingsContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settingsContentRef.current) {
      settingsContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeSettingsTab]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const epgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
   if (!themeColor) return;

    document.documentElement.style.setProperty('--theme-color', themeColor);
    
    // LocalStorage yazmadan önce kontrol: Değer zaten aynıysa boşuna yazma
    if (localStorage.getItem('theme_color') !== themeColor) {
      localStorage.setItem('theme_color', themeColor);
    }
    // Update theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      (metaThemeColor as HTMLMetaElement).name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    (metaThemeColor as HTMLMetaElement).content = themeColor;
  }, [themeColor]);

 // 3. Şehir bilgisini kaydet (Sadece değişirse)
  useEffect(() => {
    if (weatherCity && localStorage.getItem('weather_city') !== weatherCity) {
      localStorage.setItem('weather_city', weatherCity);
    }
  }, [weatherCity]);

// 4. Son izlenenleri kaydet (Sadece liste güncellenirse)
  useEffect(() => {
    // Boş liste için boşuna yazma yapma
    if (recentlyWatched.length > 0) {
      localStorage.setItem('recently_watched', JSON.stringify(recentlyWatched));
    }
  }, [recentlyWatched]);
  
  // Group channels by category
  const groupedChannels = useMemo(() => {
    const filtered = channels.filter(channel => 
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(channel.group || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, M3UChannel[]> = {};
    
    // Add Recently Watched as the first group if it has items
    if (recentlyWatched.length > 0) {
      groups['İzlemeye Devam Et'] = recentlyWatched;
    }

    filtered.forEach(channel => {
      const groupName = channel.group || 'General';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(channel);
    });

    return Object.entries(groups)
      .filter(([group]) => !collapsedCategories.includes(group))
      .sort((a, b) => {
        if (a[0] === 'İzlemeye Devam Et') return -1;
        if (b[0] === 'İzlemeye Devam Et') return 1;
        return b[1].length - a[1].length;
      });
  }, [channels, searchQuery, recentlyWatched, collapsedCategories]);

  const categories = useMemo(() => {
    const cats = {
      live: [] as M3UChannel[],
      movies: [] as M3UChannel[],
      series: [] as M3UChannel[],
      mixed: [] as M3UChannel[]
    };

    channels.forEach(ch => {
      const g = (ch.group || '').toLowerCase();
      const n = ch.name.toLowerCase();
      
      if (g.includes('live') || g.includes('canlı') || g.includes('tv')) {
        cats.live.push(ch);
      } else if (g.includes('movie') || g.includes('film') || g.includes('sinema')) {
        cats.movies.push(ch);
      } else if (g.includes('series') || g.includes('dizi') || g.includes('show')) {
        cats.series.push(ch);
      } else {
        cats.mixed.push(ch);
      }
    });

    return cats;
  }, [channels]);

  const toggleCategory = (type: 'live' | 'movies' | 'series' | 'mixed' | 'recent') => {
    if (type === 'recent') {
      setCollapsedCategories(prev => 
        prev.includes('İzlemeye Devam Et') 
          ? prev.filter(c => c !== 'İzlemeye Devam Et')
          : [...prev, 'İzlemeye Devam Et']
      );
      return;
    }

    const groupNames = Array.from(new Set(channels.map(ch => String(ch.group || 'General'))));
    const targetGroups = groupNames.filter((g: string) => {
      const gl = g.toLowerCase();
      if (type === 'live') return gl.includes('live') || gl.includes('canlı') || gl.includes('tv');
      if (type === 'movies') return gl.includes('movie') || gl.includes('film') || gl.includes('sinema');
      if (type === 'series') return gl.includes('series') || gl.includes('dizi') || gl.includes('show');
      if (type === 'mixed') return !gl.includes('live') && !gl.includes('canlı') && !gl.includes('tv') && !gl.includes('movie') && !gl.includes('film') && !gl.includes('sinema') && !gl.includes('series') && !gl.includes('dizi') && !gl.includes('show');
      return false;
    });

    setCollapsedCategories(prev => {
      const isAllCollapsed = targetGroups.every(g => prev.includes(g));
      if (isAllCollapsed) {
        return prev.filter(g => !targetGroups.includes(g));
      } else {
        return [...new Set([...prev, ...targetGroups])];
      }
    });
  };

  const handleChannelSelect = (channel: M3UChannel) => {
    setRecentlyWatched(prev => {
      const filtered = prev.filter(ch => ch.id !== channel.id);
      return [channel, ...filtered].slice(0, 20);
    });
    setCurrentChannel(channel);
    setNavContext('player');
  };

  // Auto-preview logic
  useEffect(() => {
    setPreviewChannelId(null);
    if (navContext !== 'browse' || activeRow === -1) return;

    const timer = setTimeout(() => {
      const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
      if (selectedChannel) {
        setPreviewChannelId(selectedChannel.id);
      }
    }, 2000); // 2 seconds delay

    return () => clearTimeout(timer);
  }, [activeRow, activeCol, navContext, groupedChannels]);

  // Remote Control Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (navContext === 'player') return;

      // Global Back/Escape
      if (e.key === 'Escape' || e.key === 'Backspace') {
        // Prevent default backspace behavior in inputs unless they are focused
        if (e.key === 'Backspace' && (document.activeElement?.tagName === 'INPUT')) {
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
          return;
        }
        if (navContext === 'browse' && activeRow !== -1) {
          setActiveRow(-1);
          return;
        }
        if (navContext === 'browse' && activeRow === -1 && channels.length > 0) {
          // If already at top, maybe exit or do nothing
          return;
        }
      }

      if (navContext === 'landing') {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            if (landingFocus === 0 || landingFocus === 4) setLandingFocus(1);
            else if (landingFocus === 1) setLandingFocus(3);
            else if (landingFocus === 2) setLandingFocus(3);
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (landingFocus === 3) setLandingFocus(1);
            else if (landingFocus === 1) setLandingFocus(0);
            else if (landingFocus === 2) setLandingFocus(0);
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (landingFocus === 0) setLandingFocus(4);
            else if (landingFocus === 4) setLandingFocus(2);
            else if (landingFocus === 1) setLandingFocus(2);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            if (landingFocus === 2) setLandingFocus(4);
            else if (landingFocus === 4) setLandingFocus(0);
            break;
          case 'Enter':
            if (landingFocus === 0) {
              urlInputRef.current?.focus();
            } else if (landingFocus === 1) {
              epgInputRef.current?.focus();
            } else if (landingFocus === 2) {
              handleUrlSubmit();
            } else if (landingFocus === 3) {
              fileInputRef.current?.click();
            } else if (landingFocus === 4) {
              setPlaylistUrl('');
              setEpgUrl('');
              setError(null);
            }
            break;
        }
        return;
      }

      if (navContext === 'settings') {
        const isMobile = window.innerWidth < 768;
        
        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault();
            if (settingsArea === 'tabs') {
              if (isMobile) {
                setActiveSettingsTab(prev => (prev + 1) % 3);
              } else {
                setSettingsArea('content');
                setSettingsFocus(0);
              }
            } else {
              // Internal navigation for colors in Görünüm tab
              if (activeSettingsTab === 0 && settingsFocus >= 0 && settingsFocus < 4) {
                setSettingsFocus(prev => prev + 1);
              } else if (activeSettingsTab === 0 && settingsFocus === 5) {
                setSettingsFocus(6);
              }
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            if (settingsArea === 'tabs') {
              if (isMobile) {
                setActiveSettingsTab(prev => (prev - 1 + 3) % 3);
              }
            } else {
              // Internal navigation for colors
              if (activeSettingsTab === 0 && settingsFocus > 0 && settingsFocus <= 4) {
                setSettingsFocus(prev => prev - 1);
              } else if (activeSettingsTab === 0 && settingsFocus === 6) {
                setSettingsFocus(5);
              } else {
                setSettingsArea('tabs');
              }
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (settingsArea === 'tabs') {
              if (isMobile) {
                setSettingsArea('content');
                setSettingsFocus(0);
              } else {
                setActiveSettingsTab(prev => (prev + 1) % 3);
              }
            } else {
              if (activeSettingsTab === 0) {
                if (settingsFocus <= 4) setSettingsFocus(5);
                else if (settingsFocus === 5 || settingsFocus === 6) setSettingsFocus(7); // Close button
              } else if (activeSettingsTab === 1) {
                if (settingsFocus === 0) setSettingsFocus(1);
                else if (settingsFocus === 1) setSettingsFocus(2); // Close button
              } else if (activeSettingsTab === 2) {
                if (settingsFocus === 0) setSettingsFocus(1);
                else if (settingsFocus === 1) setSettingsFocus(2); // Close button
              }
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (settingsArea === 'tabs') {
              if (!isMobile) {
                setActiveSettingsTab(prev => (prev - 1 + 3) % 3);
              }
            } else {
              if (activeSettingsTab === 0) {
                if (settingsFocus === 7) setSettingsFocus(5);
                else if (settingsFocus === 5 || settingsFocus === 6) setSettingsFocus(0);
                else if (settingsFocus >= 0 && settingsFocus <= 4) setSettingsArea('tabs');
              } else if (activeSettingsTab === 1) {
                if (settingsFocus === 2) setSettingsFocus(1);
                else if (settingsFocus === 1) setSettingsFocus(0);
                else if (settingsFocus === 0) setSettingsArea('tabs');
              } else if (activeSettingsTab === 2) {
                if (settingsFocus === 2) setSettingsFocus(1);
                else if (settingsFocus === 1) setSettingsFocus(0);
                else if (settingsFocus === 0) setSettingsArea('tabs');
              }
            }
            break;
          case 'Enter':
            if (settingsArea === 'tabs') {
              setSettingsArea('content');
              setSettingsFocus(0);
            } else {
              if (activeSettingsTab === 0) {
                if (settingsFocus >= 0 && settingsFocus <= 4) {
                  const colors = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'];
                  setThemeColor(colors[settingsFocus]);
                } else if (settingsFocus === 5) setPosterOrientation('landscape');
                else if (settingsFocus === 6) setPosterOrientation('portrait');
                else if (settingsFocus === 7) {
                  setShowSettings(false);
                  setNavContext('browse');
                }
              } else if (activeSettingsTab === 1) {
                if (settingsFocus === 0) {
                  localStorage.removeItem('m3u_deleted');
                  localStorage.setItem('m3u_url', DEFAULT_M3U_URL);
                  setSavedUrl(DEFAULT_M3U_URL);
                  setPlaylistUrl(DEFAULT_M3U_URL);
                  setShowSettings(false);
                  setChannels([]);
                } else if (settingsFocus === 1) {
                  localStorage.removeItem('m3u_url');
                  localStorage.removeItem('epg_url');
                  localStorage.setItem('m3u_deleted', 'true');
                  setSavedUrl(null);
                  setEpgUrl('');
                  setEpgData(null);
                  setChannels([]);
                  setPlaylistUrl('');
                  setShowSettings(false);
                  setNavContext('landing');
                } else if (settingsFocus === 2) {
                  setShowSettings(false);
                  setNavContext('browse');
                }
              } else if (activeSettingsTab === 2) {
                if (settingsFocus === 0) {
                  // Weather input focus handled by input itself or we can just let it be
                } else if (settingsFocus === 1) {
                  localStorage.clear();
                  window.location.reload();
                } else if (settingsFocus === 2) {
                  setShowSettings(false);
                  setNavContext('browse');
                }
              }
            }
            break;
          case 'Escape':
          case 'Backspace':
            if (settingsArea === 'content') setSettingsArea('tabs');
            else {
              setShowSettings(false);
              setNavContext('browse');
            }
            break;
        }
        return;
      }

      if (navContext === 'browse') {
        switch (e.key) {
          case 'PageDown':
            e.preventDefault();
            setActiveRow(prev => Math.min(groupedChannels.length - 1, prev + 3));
            break;
          case 'PageUp':
            e.preventDefault();
            setActiveRow(prev => Math.max(-1, prev - 3));
            break;
          case 'Home':
            e.preventDefault();
            setActiveCol(0);
            break;
          case 'End':
            e.preventDefault();
            if (activeRow === -1) {
              setActiveCol(1);
            } else {
              const currentRowLength = groupedChannels[activeRow]?.[1].length || 0;
              setActiveCol(currentRowLength - 1);
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (activeRow === 0) {
              setActiveRow(-1);
              setActiveCol(1); // Default to Profile
            } else if (activeRow > 0) {
              setActiveRow(prev => prev - 1);
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (activeRow === -1) {
              setActiveRow(0);
              setActiveCol(0);
            } else {
              setActiveRow(prev => Math.min(groupedChannels.length - 1, prev + 1));
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            setActiveCol(prev => Math.max(0, prev - 1));
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (activeRow === -1) {
              setActiveCol(prev => Math.min(1, prev + 1));
            } else {
              const currentRowLength = groupedChannels[activeRow]?.[1].length || 0;
              setActiveCol(prev => Math.min(currentRowLength - 1, prev + 1));
            }
            break;
          case 'Enter':
            e.preventDefault();
            if (activeRow === -1) {
              if (activeCol === 1) {
                setShowSettings(true);
                setNavContext('settings');
                setSettingsFocus(0);
              }
            } else {
              const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
              if (selectedChannel) {
                setCurrentChannel(selectedChannel);
                setNavContext('player');
              }
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navContext, groupedChannels, activeRow, activeCol, channels.length, currentChannel, showSettings, landingFocus, settingsFocus, playlistUrl]);

const handleUrlSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!playlistUrl) return;

    setIsLoading(true);
    setError(null);
    try {
      // --- ESKİ FETCH YERİNE NATIVE HTTP ---
      const options = {
        url: playlistUrl,
        connectTimeout: 10000,
        readTimeout: 10000
      };

      const response = await CapacitorHttp.get(options);
      
      // CapacitorHttp'de 'ok' yerine 'status' kontrol edilir
      if (response.status !== 200) {
        throw new Error(`Hata: ${response.status} - Liste indirilemedi.`);
      }

      const content = response.data; // Veri zaten text/string olarak gelir
      const parsed = parseM3U(content);
      setChannels(parsed);

      // --- EPG İÇİN DE AYNI DÜZENLEME (OPSİYONEL) ---
      if (epgUrl) {
        try {
          const epgRes = await CapacitorHttp.get({ url: epgUrl });
          if (epgRes.status === 200) {
            // EPG parser'ın nasıl çalıştığına bağlı olarak epgRes.data kullanın
            setEpgData(epgRes.data);
            localStorage.setItem('epg_url', epgUrl);
          }
        } catch (epgErr) {
          console.error('EPG yükleme hatası:', epgErr);
        }
      }

      if (parsed.length > 0) {
        localStorage.setItem('m3u_url', playlistUrl);
        localStorage.removeItem('m3u_deleted');
        setSavedUrl(playlistUrl);
        setNavContext('browse'); // Başarılıysa browse moduna geç
      }
      
    } catch (err: any) {
      console.error('Liste yüklenirken hata:', err);
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load saved URL on startup
  useEffect(() => {
    const autoLoad = async () => {
      const savedEpgUrl = localStorage.getItem('epg_url');
      if (savedEpgUrl) setEpgUrl(savedEpgUrl);

      if (savedUrl && channels.length === 0) {
        setIsLoading(true);
        try {
          // Load Playlist
          const response = await fetch(savedUrl);
          if (response.ok) {
            const content = await response.text();
            const parsed = parseM3U(content);
            setChannels(parsed);
            setNavContext('browse');
            setPlaylistUrl(savedUrl);
          }

          // Load EPG
          if (savedEpgUrl) {
            try {
              const epg = await fetchAndParseEPG(savedEpgUrl);
              setEpgData(epg);
            } catch (epgErr) {
              console.error('EPG auto-load failed:', epgErr);
            }
          }
        } catch (err) {
          console.error('Auto-load failed:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    autoLoad();
  }, [savedUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseM3U(content);
      setChannels(parsed);
      if (parsed.length > 0) {
        setShowSuccess(true);
        setNavContext('browse');
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError('Bu dosyada kanal bulunamadı.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans selection:bg-red-600/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className={cn(
        "fixed top-0 w-full z-50 flex items-center px-4 md:px-12 justify-between transition-all duration-500",
        scrolled || channels.length > 0 ? "bg-black h-16 md:h-16" : "bg-gradient-to-b from-black/80 to-transparent h-20 md:h-24"
      )}>
        <div className="flex items-center gap-8">
          <Logo />
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
          {channels.length > 0 && (
            <div className={cn(
              "relative group flex items-center transition-all",
              activeRow === -1 && activeCol === 0 ? "scale-110" : ""
            )}>
              <Search className={cn(
                "w-5 h-5 cursor-pointer transition-colors",
                activeRow === -1 && activeCol === 0 ? "text-red-600" : "text-white"
              )} />
              <input
                type="text"
                placeholder="Ara..."
                className={cn(
                  "bg-black/80 border rounded-sm py-1 px-4 ml-2 transition-all outline-none text-sm",
                  activeRow === -1 && activeCol === 0 
                    ? "w-64 opacity-100 border-white ring-2 ring-white" 
                    : "w-0 opacity-0 border-white/20 group-hover:w-64 group-hover:opacity-100 focus:w-64 focus:opacity-100"
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setActiveRow(-1);
                  setActiveCol(0);
                }}
              />
            </div>
          )}
          <WeatherWidget city={weatherCity} themeColor={themeColor} />
          <DigitalClock themeColor={themeColor} />
          <button 
            onClick={() => {
              setShowSettings(true);
              setNavContext('settings');
              setSettingsFocus(0);
            }}
            className={cn(
              "w-8 h-8 bg-blue-500 rounded-sm overflow-hidden transition-all",
              activeRow === -1 && activeCol === 1 ? "ring-4 ring-white scale-125 shadow-2xl" : "hover:ring-2 ring-white"
            )}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png" alt="Profil" />
          </button>
        </div>
      </nav>

      <main className="pb-20">
        {channels.length === 0 ? (
          <div className="relative min-h-screen">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=2069&auto=format&fit=crop" 
                className="w-full h-full object-cover opacity-50"
                alt="Arka Plan"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-black/80" />
            </div>

            <div className="relative z-10 pt-24 sm:pt-40 md:pt-56 px-4 max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
                  Sınırsız yayın, TV şovları ve daha fazlası.
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl mb-8 text-zinc-200 font-medium">
                  Her yerde izleyin. İstediğiniz zaman iptal edin. İzlemeye hazır mısınız?
                </p>
                
                <div className="bg-black/40 p-6 md:p-10 rounded-xl border border-white/10 backdrop-blur-md shadow-2xl">
                  <p className="text-lg mb-6 text-zinc-300">Üyeliğinizi başlatmak için M3U oynatma listesi URL'nizi girin.</p>
                  <form onSubmit={handleUrlSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-2">
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="relative flex items-center">
                          <input
                            ref={urlInputRef}
                            type="url"
                            placeholder="M3U Oynatma Listesi URL'si"
                            className={cn(
                              "w-full bg-black/60 border rounded-md px-4 py-4 outline-none transition-all text-lg pr-12",
                              landingFocus === 0 ? "ring-2" : "border-white/30"
                            )}
                            style={{ 
                              borderColor: landingFocus === 0 ? themeColor : undefined,
                              boxShadow: landingFocus === 0 ? `0 0 0 2px ${themeColor}` : undefined
                            }}
                            value={playlistUrl}
                            onChange={(e) => setPlaylistUrl(e.target.value)}
                            onFocus={() => setLandingFocus(0)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPlaylistUrl('');
                              setEpgUrl('');
                              setError(null);
                            }}
                            onMouseEnter={() => setLandingFocus(4)}
                            className={cn(
                              "absolute right-2 p-2 rounded-full transition-all",
                              landingFocus === 4 ? "bg-white text-black scale-110" : "text-zinc-500 hover:text-white"
                            )}
                            title="Sıfırla"
                          >
                            <RefreshCw className="w-6 h-6" />
                          </button>
                        </div>
                        <input
                          ref={epgInputRef}
                          type="url"
                          placeholder="EPG (XMLTV) URL'si (Opsiyonel)"
                          className={cn(
                            "w-full bg-black/60 border rounded-md px-4 py-4 outline-none transition-all text-lg",
                            landingFocus === 1 ? "ring-2" : "border-white/30"
                          )}
                          style={{ 
                            borderColor: landingFocus === 1 ? themeColor : undefined,
                            boxShadow: landingFocus === 1 ? `0 0 0 2px ${themeColor}` : undefined
                          }}
                          value={epgUrl}
                          onChange={(e) => setEpgUrl(e.target.value)}
                          onFocus={() => setLandingFocus(1)}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        onMouseEnter={() => setLandingFocus(2)}
                        style={{ backgroundColor: themeColor }}
                        className={cn(
                          "hover:opacity-90 disabled:opacity-50 text-white px-10 py-5 rounded-md font-bold text-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg h-auto",
                          landingFocus === 2 ? "ring-4 ring-white scale-105 z-10" : ""
                        )}
                      >
                        {isLoading ? 'Yükleniyor...' : 'Hemen Başla'} <ChevronRight className="w-8 h-8" />
                      </button>
                    </div>
                  </form>

                  <div className="relative py-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-900 px-4 py-1 rounded-full text-zinc-500 font-black tracking-widest">VEYA</span></div>
                  </div>

                  <label 
                    className="block cursor-pointer group"
                    onClick={() => setLandingFocus(3)}
                  >
                    <input ref={fileInputRef} type="file" accept=".m3u,.m3u8" className="hidden" onChange={handleFileUpload} />
                    <div className={cn(
                      "bg-white/5 hover:bg-white/10 border rounded-md py-8 transition-all flex flex-col items-center gap-3 group-active:scale-[0.98]",
                      landingFocus === 3 ? "border-white ring-4 ring-white bg-white/10" : "border-white/10"
                    )}>
                      <Upload className="w-8 h-8 text-red-600 group-hover:scale-110 transition-transform" />
                      <span className="text-zinc-300 group-hover:text-white font-bold text-lg">Cihazdan M3U Dosyası Yükle</span>
                      <p className="text-zinc-500 text-sm">Sürükleyip bırakın veya göz atmak için tıklayın</p>
                    </div>
                  </label>

                  {error && (
                    <motion.p 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="mt-6 text-red-500 font-bold bg-red-500/10 py-3 rounded-md border border-red-500/20"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-1000">
            {/* Hero Section */}
            {featuredChannel && (
              <div className="relative h-[80vh] w-full overflow-hidden">
                <div className="absolute inset-0">
                  <img 
                    src={featuredChannel.logo || "https://picsum.photos/seed/cinema/1920/1080?blur=10"} 
                    alt="Hero" 
                    className="w-full h-full object-cover opacity-40 blur-sm scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                </div>

                <div className="absolute bottom-[20%] sm:bottom-[35%] left-4 md:left-12 max-w-2xl space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-2 text-red-600 font-bold tracking-widest text-xs sm:text-sm">
                    <Tv className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                    <span>ÖNE ÇIKAN CANLI YAYIN</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase italic line-clamp-2">{featuredChannel.name}</h1>
                  <p className="text-sm sm:text-lg text-zinc-300 line-clamp-2 sm:line-clamp-3 font-medium">
                    {featuredChannel.group || 'Genel'} kategorisinden canlı yayın. M3UFLIX'te yüksek kaliteli yayın şu an yayında.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => handleChannelSelect(featuredChannel)}
                      style={{ backgroundColor: themeColor, color: 'white' }}
                      className="hover:opacity-90 px-6 sm:px-8 py-2 sm:py-3 rounded-md font-bold flex items-center gap-2 transition-all text-base sm:text-lg active:scale-95"
                    >
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> Oynat
                    </button>
                    <button className="bg-zinc-500/50 hover:bg-zinc-500/70 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-md font-bold flex items-center gap-2 transition-colors text-base sm:text-lg backdrop-blur-md">
                      <Info className="w-5 h-5 sm:w-6 sm:h-6" /> Detaylar
                    </button>
                  </div>

                  {/* Category Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {recentlyWatched.length > 0 && (
                      <button 
                        onClick={() => toggleCategory('recent')}
                        style={{ 
                          backgroundColor: collapsedCategories.includes('İzlemeye Devam Et') ? 'rgba(255,255,255,0.05)' : themeColor,
                          borderColor: collapsedCategories.includes('İzlemeye Devam Et') ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-lg flex items-center gap-2",
                          collapsedCategories.includes('İzlemeye Devam Et') ? "text-zinc-500" : "text-white scale-105"
                        )}
                      >
                        <Clock className="w-3 h-3" />
                        İzlemeye Devam Et
                      </button>
                    )}
                    {categories.live.length > 0 && (
                      <button 
                        onClick={() => toggleCategory('live')}
                        style={{ 
                          backgroundColor: categories.live.every(ch => collapsedCategories.includes(ch.group || 'General')) ? 'rgba(255,255,255,0.05)' : themeColor,
                          borderColor: categories.live.every(ch => collapsedCategories.includes(ch.group || 'General')) ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-lg",
                          categories.live.every(ch => collapsedCategories.includes(ch.group || 'General')) ? "text-zinc-500" : "text-white scale-105"
                        )}
                      >
                        Canlı
                      </button>
                    )}
                    {categories.movies.length > 0 && (
                      <button 
                        onClick={() => toggleCategory('movies')}
                        style={{ 
                          backgroundColor: categories.movies.every(ch => collapsedCategories.includes(ch.group || 'General')) ? 'rgba(255,255,255,0.05)' : themeColor,
                          borderColor: categories.movies.every(ch => collapsedCategories.includes(ch.group || 'General')) ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-lg",
                          categories.movies.every(ch => collapsedCategories.includes(ch.group || 'General')) ? "text-zinc-500" : "text-white scale-105"
                        )}
                      >
                        Film
                      </button>
                    )}
                    {categories.series.length > 0 && (
                      <button 
                        onClick={() => toggleCategory('series')}
                        style={{ 
                          backgroundColor: categories.series.every(ch => collapsedCategories.includes(ch.group || 'General')) ? 'rgba(255,255,255,0.05)' : themeColor,
                          borderColor: categories.series.every(ch => collapsedCategories.includes(ch.group || 'General')) ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-lg",
                          categories.series.every(ch => collapsedCategories.includes(ch.group || 'General')) ? "text-zinc-500" : "text-white scale-105"
                        )}
                      >
                        Dizi
                      </button>
                    )}
                    {categories.mixed.length > 0 && (
                      <button 
                        onClick={() => toggleCategory('mixed')}
                        style={{ 
                          backgroundColor: categories.mixed.every(ch => collapsedCategories.includes(ch.group || 'General')) ? 'rgba(255,255,255,0.05)' : themeColor,
                          borderColor: categories.mixed.every(ch => collapsedCategories.includes(ch.group || 'General')) ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-lg",
                          categories.mixed.every(ch => collapsedCategories.includes(ch.group || 'General')) ? "text-zinc-500" : "text-white scale-105"
                        )}
                      >
                        Karışık
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rows */}
            <div className="-mt-24 relative z-20 space-y-12 pb-20">
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
                  rowIndex={idx}
                  activeRow={activeRow}
                  activeCol={activeCol}
                  orientation={posterOrientation}
                  previewChannelId={previewChannelId}
                  themeColor={themeColor}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
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
              className="bg-zinc-900 border-0 sm:border border-white/10 w-full h-full sm:h-auto sm:max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
            >
              {/* Sidebar Tabs */}
              <div className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 p-4 md:p-6 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible no-scrollbar">
                <div className="hidden md:block mb-8">
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Ayarlar</h2>
                </div>
                {[
                  { id: 0, label: 'Görünüm', icon: Sun },
                  { id: 1, label: 'Liste', icon: List },
                  { id: 2, label: 'Genel', icon: Settings }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveSettingsTab(tab.id);
                      setSettingsArea('tabs');
                    }}
                    onMouseEnter={() => {
                      setActiveSettingsTab(tab.id);
                      setSettingsArea('tabs');
                    }}
                    className={cn(
                      "flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap",
                      activeSettingsTab === tab.id 
                        ? "bg-white text-black scale-105 shadow-lg" 
                        : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
                      settingsArea === 'tabs' && activeSettingsTab === tab.id && "ring-2 ring-white"
                    )}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-sm md:text-base">{tab.label}</span>
                  </button>
                ))}
                
                <div className="hidden md:block mt-auto pt-4">
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setNavContext('browse');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-zinc-500 hover:bg-white/5 hover:text-white transition-all"
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
                  <button onClick={() => setShowSettings(false)} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar scroll-smooth" ref={settingsContentRef}>
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
                        <label className="text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                          Tema Rengi
                        </label>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { name: 'Kırmızı', color: '#dc2626' },
                            { name: 'Mavi', color: '#2563eb' },
                            { name: 'Yeşil', color: '#16a34a' },
                            { name: 'Mor', color: '#9333ea' },
                            { name: 'Turuncu', color: '#ea580c' }
                          ].map((c, i) => (
                            <button
                              key={c.color}
                              onClick={() => setThemeColor(c.color)}
                              onMouseEnter={() => { setSettingsArea('content'); setSettingsFocus(i); }}
                              style={{ backgroundColor: c.color }}
                              className={cn(
                                "w-12 h-12 rounded-full transition-all border-4",
                                themeColor === c.color ? "border-white scale-110 shadow-xl" : "border-transparent opacity-40 hover:opacity-100",
                                settingsArea === 'content' && settingsFocus === i && "ring-4 ring-white scale-125 z-10 opacity-100"
                              )}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label className="text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                          Poster Görünümü
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            onClick={() => setPosterOrientation('landscape')}
                            onMouseEnter={() => { setSettingsArea('content'); setSettingsFocus(5); }}
                            className={cn(
                              "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4",
                              posterOrientation === 'landscape' 
                                ? "border-white bg-white/10" 
                                : "border-white/5 hover:border-white/20 bg-white/5",
                              settingsArea === 'content' && settingsFocus === 5 && "ring-4 ring-white scale-105 z-10"
                            )}
                          >
                            <div className="w-24 h-16 bg-zinc-800 rounded-lg border border-white/10 shadow-inner" />
                            <span className="font-bold text-lg">Yatay</span>
                          </button>
                          <button
                            onClick={() => setPosterOrientation('portrait')}
                            onMouseEnter={() => { setSettingsArea('content'); setSettingsFocus(6); }}
                            className={cn(
                              "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4",
                              posterOrientation === 'portrait' 
                                ? "border-white bg-white/10" 
                                : "border-white/5 hover:border-white/20 bg-white/5",
                              settingsArea === 'content' && settingsFocus === 6 && "ring-4 ring-white scale-105 z-10"
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
                        <label className="text-zinc-400 text-xs font-black uppercase tracking-widest">Oynatma Listesi Yönetimi</label>
                        <div className="space-y-4">
                          <button
                            onClick={() => {
                              localStorage.removeItem('m3u_deleted');
                              localStorage.setItem('m3u_url', DEFAULT_M3U_URL);
                              setSavedUrl(DEFAULT_M3U_URL);
                              setPlaylistUrl(DEFAULT_M3U_URL);
                              setShowSettings(false);
                              setChannels([]);
                            }}
                            onMouseEnter={() => { setSettingsArea('content'); setSettingsFocus(0); }}
                            className={cn(
                              "w-full text-left px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                              settingsArea === 'content' && settingsFocus === 0 ? "bg-white text-black scale-105 shadow-xl" : "bg-white/5 text-white hover:bg-white/10"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
                                <RefreshCw className={cn("w-6 h-6", settingsArea === 'content' && settingsFocus === 0 && "animate-spin")} />
                              </div>
                              <div>
                                <div className="text-lg">Ana Linki Yükle</div>
                                <div className="text-xs opacity-50 font-medium">Varsayılan M3U listesini geri yükler</div>
                              </div>
                            </div>
                            <ChevronRight className="w-6 h-6 opacity-30" />
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
                              setShowSettings(false);
                              setNavContext('landing');
                            }}
                            onMouseEnter={() => { setSettingsArea('content'); setSettingsFocus(1); }}
                            className={cn(
                              "w-full text-left px-6 py-5 rounded-2xl transition-all font-bold flex items-center justify-between group",
                              settingsArea === 'content' && settingsFocus === 1 ? "bg-white text-black scale-105 shadow-xl" : "bg-white/5 text-white hover:bg-white/10"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="text-lg">Yeni Link Ekle</div>
                                <div className="text-xs opacity-50 font-medium">Mevcut listeyi siler ve kurulum ekranına döner</div>
                              </div>
                            </div>
                            <ChevronRight className="w-6 h-6 opacity-30" />
                          </button>
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
                        <label className="text-zinc-400 text-xs font-black uppercase tracking-widest">Hava Durumu Ayarları</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={weatherCity}
                            onChange={(e) => setWeatherCity(e.target.value)}
                            onMouseEnter={() => { setSettingsArea('content'); setSettingsFocus(0); }}
                            className={cn(
                              "w-full bg-white/5 border-2 rounded-2xl px-6 py-4 outline-none transition-all text-lg font-bold",
                              settingsArea === 'content' && settingsFocus === 0 ? "border-white ring-4 ring-white/20" : "border-white/5"
                            )}
                            placeholder="Şehir adı girin..."
                          />
                          <Cloud className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500" />
                        </div>
                      </section>

                      <section className="space-y-4">
                        <label className="text-zinc-400 text-xs font-black uppercase tracking-widest">Sistem</label>
                        <button 
                          onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                          }}
                          onMouseEnter={() => { setSettingsArea('content'); setSettingsFocus(1); }}
                          className={cn(
                            "w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                            settingsArea === 'content' && settingsFocus === 1 ? "bg-red-600 text-white scale-105 shadow-2xl" : "bg-white/5 text-red-500 hover:bg-red-500/10"
                          )}
                        >
                          <RefreshCw className="w-6 h-6" />
                          Tüm Belleği Temizle
                        </button>
                      </section>
                    </motion.div>
                  )}
                  </AnimatePresence>

                  {/* Universal Close Button for Mobile/Touch */}
                  <div className="pt-10">
                    <button 
                      onClick={() => {
                        setShowSettings(false);
                        setNavContext('browse');
                      }}
                      onMouseEnter={() => { setSettingsArea('content'); setSettingsFocus(2); }}
                      style={{ backgroundColor: (settingsArea === 'content' && settingsFocus === (activeSettingsTab === 0 ? 7 : 2)) ? themeColor : undefined }}
                      className={cn(
                        "w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                        (settingsArea === 'content' && settingsFocus === (activeSettingsTab === 0 ? 7 : 2)) ? "text-white scale-105 shadow-2xl" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                      )}
                    >
                      <X className="w-6 h-6" />
                      Ayarları Kapat
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
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

      {/* Video Player */}
      {currentChannel && (
        <VideoPlayer 
          url={currentChannel.url} 
          channel={currentChannel}
          epgData={epgData}
          onClose={() => {
            setCurrentChannel(null);
            setNavContext('browse');
          }} 
        />
      )}
    </div>
  );
}
