import React, { useState, useEffect, useCallback } from 'react';
import { M3UChannel } from '../../utils/m3uParser';
import { WeatherWidget } from './WeatherWidget';
import { DigitalClock } from './DigitalClock';
import { Play, Clock, Tv, Sun, Heart, Activity, Layers, Zap, Star, TrendingUp, Settings2, GripHorizontal, Check, Globe, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { LiveMatch, NewsItem, BentoWidget } from '../../types';

interface BentoDashboardProps {
  recentlyWatched: M3UChannel[];
  onSelect: (channel: M3UChannel) => void;
  themeColor: string;
  weatherCity: string;
  now: Date;
  channels: M3UChannel[];
  favorites: string[];
  liveMatches?: LiveMatch[];
  liveNews?: NewsItem[];
  onShowSports?: () => void;
  isActive: boolean;
}

const DEFAULT_WIDGETS: BentoWidget[] = [
  { id: 'featured', type: 'profile', size: 'large' },
  { id: 'weather', type: 'weather', size: 'small' },
  { id: 'stats', type: 'stats', size: 'small' },
  { id: 'clock', type: 'stats', size: 'small' }, // Using 'stats' enum as proxy for clock if not in enum, or I'll just map type manually
  { id: 'favs', type: 'favorites', size: 'small' },
  { id: 'matches', type: 'match-center', size: 'small' },
  { id: 'cats', type: 'stats', size: 'small' },
];

export const BentoDashboard: React.FC<BentoDashboardProps> = ({
  recentlyWatched,
  onSelect,
  themeColor,
  weatherCity,
  now,
  channels,
  favorites,
  liveMatches = [],
  liveNews = [],
  onShowSports,
  isActive
}) => {
  const [widgets, setWidgets] = useState<BentoWidget[]>(() => {
    const saved = localStorage.getItem('bento_layout_v2');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'featured', type: 'profile', size: 'large' }, // Represents the 2x2 featured box
      { id: 'weather', type: 'weather', size: 'small' },
      { id: 'ai-summary', type: 'stats', size: 'small' },
      { id: 'clock', type: 'stats', size: 'small' }, 
      { id: 'favorites', type: 'favorites', size: 'small' },
      { id: 'categories', type: 'stats', size: 'small' },
      { id: 'match-center', type: 'match-center', size: 'small' },
    ];
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('bento_layout_v2', JSON.stringify(widgets));
  }, [widgets]);

  const top3 = recentlyWatched.slice(0, 3);
  const displayChannels = top3.length > 0 ? top3 : channels.slice(0, 3);
  const totalChannels = channels.length;
  const favoritesCount = favorites.length;
  const categoriesCount = Array.from(new Set(channels.map(c => c.group))).length;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isActive) return;
    
    // Only handle keys if no other modals are open
    const isPlayerOpen = document.querySelector('.player-container');
    if (isPlayerOpen) return;

    let key = e.key;
    if (key === 'Select' || key === 'OK') key = 'Enter';

    if (key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % widgets.length);
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + widgets.length) % widgets.length);
    } else if (key === 'ArrowDown') {
        e.preventDefault();
        // Move to next row in a 4-col grid
        setActiveIndex(prev => {
            const next = prev + 4;
            return next < widgets.length ? next : prev;
        });
    } else if (key === 'ArrowUp') {
        e.preventDefault();
        // Move to prev row in a 4-col grid
        setActiveIndex(prev => {
            const next = prev - 4;
            return next >= 0 ? next : prev;
        });
    } else if (key === 'Enter') {
      e.preventDefault();
      if (isEditMode) {
        if (pickedIndex === null) {
          setPickedIndex(activeIndex);
        } else {
          // Swap logic
          const newWidgets = [...widgets];
          const temp = newWidgets[pickedIndex];
          newWidgets[pickedIndex] = newWidgets[activeIndex];
          newWidgets[activeIndex] = temp;
          setWidgets(newWidgets);
          setPickedIndex(null);
        }
      } else {
        // Normal action based on widget type
        const widget = widgets[activeIndex];
        if (widget.id === 'featured' && displayChannels[0]) onSelect(displayChannels[0]);
        if (widget.id === 'match-center') onShowSports?.();
        if (widget.id === 'favorites') {
            // Maybe trigger a view of favorites? 
            // For now, let's just use it as a display
        }
      }
    } else if (key === 'Backspace' || key === 'Escape') {
      if (isEditMode) {
        e.preventDefault();
        setIsEditMode(false);
        setPickedIndex(null);
      }
    }
  }, [widgets, activeIndex, isEditMode, pickedIndex, displayChannels, onSelect, onShowSports]);

  useEffect(() => {
    if (isActive) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, isActive]);

  const renderWidget = (widget: BentoWidget, index: number) => {
    const isFocused = activeIndex === index;
    const isPicked = pickedIndex === index;

    const baseClass = cn(
      "relative rounded-[2.5rem] overflow-hidden transition-all duration-300 shadow-xl border border-white/10 cursor-pointer",
      isFocused && !isEditMode && "ring-4 ring-white scale-105 z-10",
      isEditMode && isFocused && "ring-4 ring-yellow-400 z-20",
      isPicked && "ring-4 ring-yellow-400 opacity-50 scale-95",
      widget.id === 'featured' ? "md:col-span-2 md:row-span-2" : "col-span-1"
    );

    const onWidgetClick = () => {
      if (isEditMode) {
        if (pickedIndex === null) setPickedIndex(index);
        else {
           // Swap logic
           const newWidgets = [...widgets];
           const temp = newWidgets[pickedIndex];
           newWidgets[pickedIndex] = newWidgets[activeIndex];
           newWidgets[activeIndex] = temp;
           setWidgets(newWidgets);
           setPickedIndex(null);
        }
      } else {
        const widget = widgets[index];
        if (widget.id === 'featured' && displayChannels[0]) onSelect(displayChannels[0]);
        if (widget.id === 'match-center') onShowSports?.();
      }
    };

    if (widget.id === 'featured' && displayChannels[0]) {
      return (
        <motion.div 
          key="featured" 
          className={baseClass}
          onPointerDown={() => {
            setActiveIndex(index);
            if (!isEditMode) onSelect(displayChannels[0]);
          }}
          onClick={onWidgetClick}
        >
          <img 
            src={displayChannels[0].logo || 'https://picsum.photos/seed/tv/800/600'} 
            alt={displayChannels[0].name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute top-6 left-6">
            <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 backdrop-blur-xl border border-white/20 text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Öne Çıkan
            </div>
          </div>
          <div className="absolute bottom-0 left-0 p-8 w-full">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tighter">{displayChannels[0].name}</h2>
            <div className="flex items-center gap-4">
              <button 
                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black"
                style={{ backgroundColor: themeColor, color: 'white' }}
              >
                <Play className="w-5 h-5 fill-current" />
                İZLE
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    if (widget.id === 'weather') {
      return (
        <div 
          key="weather" 
          className={cn(baseClass, "bg-white/5 backdrop-blur-2xl p-8 flex flex-col justify-between")}
          onPointerDown={() => setActiveIndex(index)}
          onClick={onWidgetClick}
        >
          <div className="flex justify-between items-start">
            <WeatherWidget city={weatherCity} themeColor={themeColor} />
            <Sun className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <div className="text-white font-black text-lg truncate">{weatherCity}</div>
            <div className="text-white/40 text-[10px] font-bold uppercase">Hava Durumu</div>
          </div>
        </div>
      );
    }

    if (widget.id === 'stats') {
      return (
        <div 
          key="stats" 
          className={cn(baseClass, "bg-zinc-900/50 backdrop-blur-2xl p-8 flex flex-col justify-between")}
          onPointerDown={() => setActiveIndex(index)}
          onClick={onWidgetClick}
        >
          <Layers className="w-8 h-8 text-white/20" />
          <div>
            <div className="text-4xl font-black text-white tracking-tighter">{totalChannels}</div>
            <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Kanal</div>
          </div>
        </div>
      );
    }

    if (widget.id === 'clock') {
      return (
        <div 
          key="clock" 
          className={cn(baseClass, "bg-white/5 backdrop-blur-2xl p-8 flex flex-col justify-center items-center")}
          onPointerDown={() => setActiveIndex(index)}
          onClick={onWidgetClick}
        >
          <DigitalClock themeColor={themeColor} />
          <div className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            {now.toLocaleDateString('tr-TR', { weekday: 'short' })}
          </div>
        </div>
      );
    }

    if (widget.id === 'favorites') {
      return (
        <div 
          key="favorites" 
          className={cn(baseClass, "p-8 flex flex-col justify-between")} 
          style={{ backgroundColor: `${themeColor}20` }}
          onPointerDown={() => setActiveIndex(index)}
          onClick={onWidgetClick}
        >
          <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          <div>
            <div className="text-2xl font-black text-white">{favoritesCount}</div>
            <div className="text-white/40 text-[10px] font-bold uppercase">Favori</div>
          </div>
        </div>
      );
    }

    if (widget.id === 'categories') {
        return (
          <div 
            key="categories" 
            className={cn(baseClass, "bg-zinc-900/80 backdrop-blur-2xl p-8 flex flex-col justify-between")}
            onPointerDown={() => setActiveIndex(index)}
            onClick={onWidgetClick}
          >
            <Zap className="w-8 h-8 text-blue-400 fill-blue-400" />
            <div>
              <div className="text-2xl font-black text-white">{categoriesCount}</div>
              <div className="text-white/40 text-[10px] font-bold uppercase">Kategori</div>
            </div>
          </div>
        );
    }

    if (widget.id === 'match-center') {
      return (
        <div 
          key="match-center" 
          className={cn(baseClass, "bg-emerald-600/10 backdrop-blur-2xl p-8 flex flex-col justify-between")}
          onPointerDown={() => setActiveIndex(index)}
          onClick={onWidgetClick}
        >
          <Activity className="w-8 h-8 text-emerald-500" />
          {liveMatches[0] ? (
            <div>
              <div className="text-white font-black text-sm">{liveMatches[0].homeScore} - {liveMatches[0].awayScore}</div>
              <div className="text-emerald-500 font-bold text-[10px] uppercase">{liveMatches[0].minute}'</div>
            </div>
          ) : (
            <div className="text-white/40 text-[10px] font-bold uppercase">Skorlar</div>
          )}
        </div>
      );
    }

    if (widget.id === 'ai-summary') {
        const topNews = liveNews[0]?.title || 'Önemli bir gelişme bulunmuyor.';
        return (
          <div 
            key="ai-summary" 
            className={cn(baseClass, "bg-zinc-900/40 backdrop-blur-3xl p-8 flex flex-col justify-between overflow-hidden")}
            onPointerDown={() => setActiveIndex(index)}
            onClick={onWidgetClick}
          >
             <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI ÖZETİ</span>
             </div>
             <div className="relative">
                <p className="text-sm font-bold text-white leading-tight line-clamp-3">
                   {topNews}
                </p>
                <div className="mt-2 flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-bold text-zinc-500 uppercase">CANLI ANALİZ</span>
                </div>
             </div>
          </div>
        );
    }

    if (widget.id === 'news' || widget.id === 'categories') {
      const isNews = widget.id === 'news';
      return (
        <div key={widget.id} className={cn(baseClass, isNews ? "bg-blue-600/10" : "bg-zinc-900/80", "backdrop-blur-2xl p-8 flex flex-col justify-between")}>
          {isNews ? <Globe className="w-8 h-8 text-blue-400" /> : <Zap className="w-8 h-8 text-blue-400 fill-blue-400" />}
          <div>
            <div className="text-xl font-black text-white truncate max-w-full">
              {isNews ? (liveNews[0]?.title || 'Güncel Haberler') : categoriesCount}
            </div>
            <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
              {isNews ? (liveNews[0]?.source || 'Haberler') : 'Kategori'}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-6 pt-24 space-y-10 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
            Hoş Geldiniz, <span style={{ color: themeColor }}>M3UFLIX</span>
          </h1>
          <p className="text-white/40 font-medium mt-1 uppercase text-[10px] tracking-widest italic">Kişiselleştirilmiş Eğlence Deneyimi</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
                setIsEditMode(!isEditMode);
                setPickedIndex(null);
            }}
            className={cn(
              "px-6 py-3 rounded-2xl transition-all flex items-center gap-3 backdrop-blur-xl border-2 font-black text-xs uppercase tracking-widest",
              isEditMode ? "bg-yellow-400 border-yellow-400 text-black scale-110 shadow-2xl" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
            )}
           >
            {isEditMode ? <Check className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
            {isEditMode ? 'KAYDET' : 'DÜZENLE'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[200px]">
        {widgets.map((widget, index) => renderWidget(widget, index))}
      </div>

      <AnimatePresence>
        {isEditMode && (
            <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-10 py-5 rounded-[2rem] font-black shadow-2xl flex items-center gap-6 z-50 ring-8 ring-black/20"
            >
            <div className="bg-black/10 p-3 rounded-2xl">
                <GripHorizontal className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex flex-col">
                <span className="text-sm tracking-tighter leading-none mb-1">
                    {pickedIndex !== null ? 'HEDEF SEÇİP OK TUŞUNA BASIN' : 'TAŞIMAK İSTENEN KUTUYU SEÇİN'}
                </span>
                <span className="text-[10px] opacity-60 font-bold uppercase tracking-tight">KUMANDA İLE YERLERİ DEĞİŞTİRİN</span>
            </div>
            </motion.div>
        )}
      </AnimatePresence>

      {recentlyWatched.length > 0 && (
        <div className="space-y-6 pt-10 border-t border-white/5">
          <div className="flex items-center gap-4 px-2">
            <div className="p-3 bg-white/5 rounded-2xl">
                <Clock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">İzlemeye Devam Et</h3>
          </div>
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6">
            {recentlyWatched.map((channel) => (
              <motion.div
                key={channel.id}
                whileHover={{ scale: 1.05 }}
                onClick={() => !isEditMode && onSelect(channel)}
                className="flex-none w-72 aspect-video relative rounded-[2rem] overflow-hidden cursor-pointer shadow-2xl border border-white/5"
              >
                <img src={channel.logo} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <div className="text-sm font-black text-white truncate tracking-tight uppercase italic">{channel.name}</div>
                  <div className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Kaldığın Yerden</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

