import React from 'react';
import { M3UChannel } from '../../utils/m3uParser';
import { WeatherWidget } from './WeatherWidget';
import { DigitalClock } from './DigitalClock';
import { Play, Clock, Tv, Sun } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface BentoDashboardProps {
  recentlyWatched: M3UChannel[];
  onSelect: (channel: M3UChannel) => void;
  themeColor: string;
  weatherCity: string;
  now: Date;
  channels: M3UChannel[];
}

export const BentoDashboard: React.FC<BentoDashboardProps> = ({
  recentlyWatched,
  onSelect,
  themeColor,
  weatherCity,
  now,
  channels
}) => {
  // Get top 3 most watched (for now, first 3 from recentlyWatched)
  const top3 = recentlyWatched.slice(0, 3);
  
  // If recentlyWatched is empty, use first 3 from all channels
  const displayChannels = top3.length > 0 ? top3 : channels.slice(0, 3);

  return (
    <div className="p-6 pt-24 space-y-8 max-w-7xl mx-auto">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Large Box - First Channel */}
        {displayChannels[0] && (
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelect(displayChannels[0])}
            className="md:col-span-2 md:row-span-2 relative aspect-video md:aspect-auto rounded-3xl overflow-hidden cursor-pointer group shadow-2xl border border-white/10 min-h-[400px]"
          >
            <img 
              src={displayChannels[0].logo || 'https://picsum.photos/seed/tv/800/600'} 
              alt={displayChannels[0].name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 w-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md text-white">
                  En Çok İzlenen
                </div>
              </div>
              <h2 className="text-4xl font-black text-white mb-2">{displayChannels[0].name}</h2>
              <p className="text-white/60 text-sm max-w-md line-clamp-2 mb-6">
                {displayChannels[0].description || 'Bu kanalı izlemeye devam etmek için tıklayın.'}
              </p>
              <button 
                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: themeColor, color: 'white' }}
              >
                <Play className="w-5 h-5 fill-current" />
                Şimdi İzle
              </button>
            </div>
          </motion.div>
        )}

        {/* Weather & Clock Widget */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 flex flex-col justify-between shadow-xl min-h-[250px]">
          <div className="flex justify-between items-start">
            <WeatherWidget city={weatherCity} themeColor={themeColor} />
            <div className="p-3 bg-white/10 rounded-2xl">
              <Sun className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <div className="mt-8">
            <DigitalClock themeColor={themeColor} />
            <div className="text-white/40 text-sm font-medium mt-2">
              {now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>

        {/* Second Channel Box */}
        {displayChannels[1] && (
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelect(displayChannels[1])}
            className="relative aspect-video rounded-3xl overflow-hidden cursor-pointer group shadow-xl border border-white/10"
          >
            <img 
              src={displayChannels[1].logo || 'https://picsum.photos/seed/movie/400/300'} 
              alt={displayChannels[1].name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <h3 className="text-xl font-bold text-white">{displayChannels[1].name}</h3>
              <div className="flex items-center gap-2 text-white/60 text-xs mt-1">
                <Tv className="w-3 h-3" />
                Popüler
              </div>
            </div>
          </motion.div>
        )}

        {/* Third Channel Box */}
        {displayChannels[2] && (
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelect(displayChannels[2])}
            className="relative aspect-video rounded-3xl overflow-hidden cursor-pointer group shadow-xl border border-white/10"
          >
            <img 
              src={displayChannels[2].logo || 'https://picsum.photos/seed/series/400/300'} 
              alt={displayChannels[2].name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <h3 className="text-xl font-bold text-white">{displayChannels[2].name}</h3>
              <div className="flex items-center gap-2 text-white/60 text-xs mt-1">
                <Tv className="w-3 h-3" />
                Sizin İçin
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Continue Watching Strip */}
      {recentlyWatched.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">İzlemeye Devam Et</h3>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2">
            {recentlyWatched.map((channel) => (
              <motion.div
                key={channel.id}
                whileHover={{ scale: 1.05, y: -5 }}
                onClick={() => onSelect(channel)}
                className="flex-none w-64 aspect-video relative rounded-2xl overflow-hidden cursor-pointer group shadow-lg border border-white/5"
              >
                <img 
                  src={channel.logo || 'https://picsum.photos/seed/recent/400/225'} 
                  alt={channel.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30">
                    <Play className="w-6 h-6 text-white fill-current" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
                  <div className="text-sm font-bold text-white truncate">{channel.name}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
