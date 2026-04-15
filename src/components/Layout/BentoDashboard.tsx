import React from 'react';
import { M3UChannel } from '../../utils/m3uParser';
import { WeatherWidget } from './WeatherWidget';
import { DigitalClock } from './DigitalClock';
import { Play, Clock, Tv, Sun, Heart, Activity, Layers, Zap, Star, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface BentoDashboardProps {
  recentlyWatched: M3UChannel[];
  onSelect: (channel: M3UChannel) => void;
  themeColor: string;
  weatherCity: string;
  now: Date;
  channels: M3UChannel[];
  favorites: string[];
}

export const BentoDashboard: React.FC<BentoDashboardProps> = ({
  recentlyWatched,
  onSelect,
  themeColor,
  weatherCity,
  now,
  channels,
  favorites
}) => {
  // Get top 3 most watched (for now, first 3 from recentlyWatched)
  const top3 = recentlyWatched.slice(0, 3);
  
  // If recentlyWatched is empty, use first 3 from all channels
  const displayChannels = top3.length > 0 ? top3 : channels.slice(0, 3);

  // Stats
  const totalChannels = channels.length;
  const favoritesCount = favorites.length;
  const categoriesCount = Array.from(new Set(channels.map(c => c.group))).length;

  return (
    <div className="p-6 pt-24 space-y-10 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
            Hoş Geldiniz, <span style={{ color: themeColor }}>M3UFLIX</span>
          </h1>
          <p className="text-white/40 font-medium mt-2">Bugün ne izlemek istersiniz?</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-[#141414] bg-zinc-800 flex items-center justify-center overflow-hidden">
                <img src={`https://picsum.photos/seed/user${i}/40/40`} alt="User" />
              </div>
            ))}
            <div className="w-10 h-10 rounded-full border-2 border-[#141414] bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
              +12
            </div>
          </div>
          <div className="h-10 w-[1px] bg-white/10 hidden md:block" />
          <div className="text-right hidden md:block">
            <div className="text-white font-bold text-sm">Aktif Kullanıcılar</div>
            <div className="text-white/40 text-xs">Şu an yayında</div>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[200px]">
        {/* Main Large Box - Featured Channel (2x2) */}
        {displayChannels[0] && (
          <motion.div 
            whileHover={{ scale: 1.01 }}
            onClick={() => onSelect(displayChannels[0])}
            className="md:col-span-2 md:row-span-2 relative rounded-[2.5rem] overflow-hidden cursor-pointer group shadow-2xl border border-white/10"
          >
            <img 
              src={displayChannels[0].logo || 'https://picsum.photos/seed/tv/800/600'} 
              alt={displayChannels[0].name}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
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
              <p className="text-white/70 text-base max-w-md line-clamp-2 mb-8 font-medium">
                {displayChannels[0].description || 'En sevdiğiniz içerikleri yüksek kalitede izlemeye hemen başlayın.'}
              </p>
              <div className="flex items-center gap-4">
                <button 
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-black/20"
                  style={{ backgroundColor: themeColor, color: 'white' }}
                >
                  <Play className="w-5 h-5 fill-current" />
                  ŞİMDİ İZLE
                </button>
                <div className="flex items-center gap-2 text-white/60 text-sm font-bold">
                  <Activity className="w-4 h-4" />
                  4.2k İzleyici
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Weather Widget (1x1) */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 flex flex-col justify-between shadow-xl group hover:bg-white/10 transition-colors">
          <div className="flex justify-between items-start">
            <WeatherWidget city={weatherCity} themeColor={themeColor} />
            <div className="p-3 bg-white/10 rounded-2xl group-hover:rotate-12 transition-transform">
              <Sun className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          <div>
            <div className="text-white font-black text-lg truncate">{weatherCity}</div>
            <div className="text-white/40 text-xs font-medium">Hava Durumu</div>
          </div>
        </div>

        {/* Stats Widget (1x1) */}
        <div className="bg-zinc-900/50 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 flex flex-col justify-between shadow-xl overflow-hidden relative group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Layers className="w-32 h-32 text-white" />
          </div>
          <div className="relative z-10">
            <div className="text-4xl font-black text-white tracking-tighter">{totalChannels}</div>
            <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Toplam Kanal</div>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-green-400 text-xs font-bold">
            <TrendingUp className="w-3 h-3" />
            +12 Yeni Eklendi
          </div>
        </div>

        {/* Digital Clock Widget (1x1) */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 flex flex-col justify-center items-center shadow-xl group hover:border-white/20 transition-all">
          <DigitalClock themeColor={themeColor} />
          <div className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-4">
            {now.toLocaleDateString('tr-TR', { weekday: 'long' })}
          </div>
        </div>

        {/* Favorites Stats (1x1) */}
        <div 
          className="rounded-[2.5rem] p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group cursor-pointer border border-white/5"
          style={{ backgroundColor: `${themeColor}15` }}
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-2xl bg-white/10">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            </div>
            <div className="text-4xl font-black text-white tracking-tighter">{favoritesCount}</div>
          </div>
          <div>
            <div className="text-white font-black text-lg">Favorilerim</div>
            <div className="text-white/40 text-xs font-medium">Hızlı Erişim</div>
          </div>
        </div>

        {/* Secondary Channels - Row 3 */}
        {displayChannels.slice(1).map((channel, idx) => (
          <motion.div 
            key={channel.id}
            whileHover={{ scale: 1.02, y: -5 }}
            onClick={() => onSelect(channel)}
            className="relative rounded-[2.5rem] overflow-hidden cursor-pointer group shadow-xl border border-white/10"
          >
            <img 
              src={channel.logo || `https://picsum.photos/seed/${channel.id}/400/300`} 
              alt={channel.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 w-full">
              <div className="flex items-center gap-2 mb-2">
                <div className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md text-white">
                  {idx === 0 ? 'POPÜLER' : 'SİZİN İÇİN'}
                </div>
              </div>
              <h3 className="text-lg font-black text-white truncate tracking-tight">{channel.name}</h3>
              <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold mt-1 uppercase tracking-wider">
                <Tv className="w-3 h-3" />
                {channel.group || 'Genel'}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Categories Quick Access (1x1) */}
        <div className="bg-zinc-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 flex flex-col justify-between shadow-xl group hover:bg-zinc-900 transition-colors cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/5 rounded-2xl group-hover:rotate-12 transition-transform">
              <Zap className="w-6 h-6 text-blue-400 fill-blue-400" />
            </div>
            <div className="text-2xl font-black text-white tracking-tighter">{categoriesCount}</div>
          </div>
          <div>
            <div className="text-white font-black text-lg">Kategoriler</div>
            <div className="text-white/40 text-xs font-medium">Tümünü Keşfet</div>
          </div>
        </div>

        {/* Live Now Widget (1x1) */}
        <div className="bg-red-600/10 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-red-600/20 flex flex-col justify-between shadow-xl group cursor-pointer overflow-hidden relative">
          <div className="absolute -right-2 -bottom-2 opacity-5">
            <Activity className="w-24 h-24 text-red-600" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <div className="text-[10px] font-black text-red-600 uppercase tracking-widest">Canlı Yayın</div>
          </div>
          <div>
            <div className="text-white font-black text-lg">Şu An Canlı</div>
            <div className="text-white/40 text-xs font-medium">124 Kanal Yayında</div>
          </div>
        </div>
      </div>

      {/* Continue Watching Section */}
      {recentlyWatched.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">İzlemeye Devam Et</h3>
                <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Kaldığınız yerden devam edin</p>
              </div>
            </div>
            <button className="text-white/40 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">Tümünü Gör</button>
          </div>
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6 -mx-2 px-2">
            {recentlyWatched.map((channel) => (
              <motion.div
                key={channel.id}
                whileHover={{ scale: 1.05, y: -8 }}
                onClick={() => onSelect(channel)}
                className="flex-none w-72 aspect-video relative rounded-3xl overflow-hidden cursor-pointer group shadow-2xl border border-white/5"
              >
                <img 
                  src={channel.logo || `https://picsum.photos/seed/${channel.id}/400/225`} 
                  alt={channel.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl">
                    <Play className="w-6 h-6 text-white fill-current ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <div className="text-base font-black text-white truncate tracking-tight">{channel.name}</div>
                  <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Son İzlenen</div>
                </div>
                {/* Progress Bar Mockup */}
                <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
                  <div 
                    className="h-full transition-all duration-1000" 
                    style={{ backgroundColor: themeColor, width: `${Math.random() * 60 + 20}%` }} 
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
