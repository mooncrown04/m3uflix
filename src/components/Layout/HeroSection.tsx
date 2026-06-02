import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tv, ChevronUp, ChevronDown, Sparkles, CircleDashed, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { M3UChannel, UIMode, LayoutMode } from '../../types';

interface HeroSectionProps {
  featuredChannel: M3UChannel | null;
  layoutMode: LayoutMode;
  activeRow: number;
  activeCol: number;
  setActiveRow: (row: number) => void;
  setActiveCol: (col: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  uiMode: UIMode;
  themeColor: string;
  deviceType: 'pc' | 'tv' | 'tablet' | 'phone';
  getCurrentProgram: (tvgId: string) => any;
  formatTime: (date: Date) => string;
  handlePrevFeatured: () => void;
  handleNextFeatured: () => void;
  primaryHeroButtons: any[];
  filterHeroButtons: any[];
  isListening: boolean;
  remoteControlEnabled: boolean;
  isRemoteConnected: boolean;
  showDeviceInfo: boolean;
  handleAISearch: (query: string) => void;
  isAISearching: boolean;
  aiExplanation: string | null;
  categoryScrollRef: React.RefObject<HTMLDivElement | null>;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredChannel,
  layoutMode,
  activeRow,
  activeCol,
  setActiveRow,
  setActiveCol,
  searchQuery,
  setSearchQuery,
  uiMode,
  themeColor,
  deviceType,
  getCurrentProgram,
  formatTime,
  handlePrevFeatured,
  handleNextFeatured,
  primaryHeroButtons,
  filterHeroButtons,
  isListening,
  remoteControlEnabled,
  isRemoteConnected,
  showDeviceInfo,
  handleAISearch,
  isAISearching,
  aiExplanation,
  categoryScrollRef
}) => {
  if (!featuredChannel) return null;

  return (
    <div 
      className="relative w-full overflow-hidden transition-all duration-700"
      style={{ 
        height: layoutMode === 'fixed-focus'
          ? (activeRow >= 0 ? '50vh' : '70vh')
          : (searchQuery ? '35vh' : '75vh') 
      }}
    >
      <div className="absolute inset-0">
        <motion.img 
          key={featuredChannel.id}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 0.8 }}
          src={featuredChannel.logo || "https://picsum.photos/seed/cinema/1920/1080?blur=10"} 
          alt="Hero" 
          className="w-full h-full object-cover blur-sm"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
        {uiMode === 'modern' && (
          <div 
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[120px] opacity-20 animate-pulse"
            style={{ backgroundColor: themeColor }}
          />
        )}
      </div>

      <div className={cn(
        "absolute left-0 right-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-0"
      )} />

      <div className={cn(
        "absolute left-4 md:left-12 max-w-4xl space-y-1 sm:space-y-2 transition-all duration-500 z-10", 
        searchQuery ? "bottom-4" : (layoutMode === 'fixed-focus' ? "bottom-[2%] sm:bottom-[4%]" : "bottom-[6%] sm:bottom-[10%]"),
        "max-h-[85%] flex flex-col justify-end pt-12"
      )}>
        {!searchQuery && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`info-${featuredChannel.id}`}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-red-600 font-bold tracking-widest text-xs sm:text-sm">
              <Tv className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>{featuredChannel.group?.toUpperCase() || 'CANLI TV'}</span>
            </div>
            
            <h1 className={cn(
              "font-black tracking-tighter uppercase italic line-clamp-2 leading-tight py-0.5",
              deviceType === 'tv' ? "text-6xl sm:text-8xl md:text-9xl" : "text-3xl sm:text-5xl md:text-7xl"
            )}
            style={{ 
              textShadow: '0 10px 30px rgba(0,0,0,0.5)',
              WebkitTextStroke: uiMode === 'minimalist' ? `1px ${themeColor}` : 'none'
            }}
            >{featuredChannel.name}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-white/80">
              {featuredChannel.year && (
                <span className="px-2 py-0.5 bg-white/10 rounded backdrop-blur-sm border border-white/10">
                  {featuredChannel.year}
                </span>
              )}
              {featuredChannel.genre && (
                <span className="px-2 py-0.5 bg-white/10 rounded backdrop-blur-sm border border-white/10">
                  {featuredChannel.genre}
                </span>
              )}
              {featuredChannel.language && (
                <span className="px-2 py-0.5 bg-white/10 rounded backdrop-blur-sm border border-white/10">
                  {featuredChannel.language}
                </span>
              )}
              <span className="flex items-center gap-1 text-green-500">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                HD Kalite
              </span>
            </div>

            {featuredChannel.actor && (
              <p className="text-sm sm:text-base text-white/60 line-clamp-1 italic max-w-xl">
                <span className="text-white/80 font-semibold not-italic mr-1">Oyuncular:</span>
                {featuredChannel.actor}
              </p>
            )}

            {featuredChannel.description ? (
              <p className="text-sm sm:text-lg text-white/70 line-clamp-2 sm:line-clamp-3 max-w-2xl leading-relaxed">
                {featuredChannel.description}
              </p>
            ) : (
              <p className="text-sm sm:text-lg text-zinc-300 line-clamp-2 sm:line-clamp-3 font-medium">
                {featuredChannel.group || 'Genel'} kategorisinden canlı yayın. M3UFLIX'te yüksek kaliteli yayın şu an yayında.
              </p>
            )}

            {/* EPG Info */}
            {getCurrentProgram(featuredChannel.tvgId || featuredChannel.name) && (
              <div className="mt-1 p-2.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md max-w-md group hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Şu An Yayında
                  </span>
                  <span className="text-xs text-white/40 font-mono">
                    {formatTime(getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.start)} - {formatTime(getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.stop)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.title}
                </h3>
                {getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.description && (
                  <p className="text-xs sm:text-sm text-white/60 line-clamp-2">
                    {getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.description}
                  </p>
                )}
                <div className="mt-3 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-600 transition-all duration-1000"
                    style={{ 
                      width: `${Math.max(0, Math.min(100, 
                        ((new Date().getTime() - getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.start.getTime()) / 
                        (getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.stop.getTime() - getCurrentProgram(featuredChannel.tvgId || featuredChannel.name)!.start.getTime())) * 100
                      ))}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
        <div className="flex flex-col gap-2 pt-1">
          {/* Primary Buttons Row */}
          {!searchQuery && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Navigation Buttons */}
              <div className="flex items-center gap-2 mr-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevFeatured(); }}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 backdrop-blur-md"
                  title="Önceki Kanal"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNextFeatured(); }}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 backdrop-blur-md"
                  title="Sonraki Kanal"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
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
                    <btn.icon className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6", 
                      (isPlay || (btn.id === 'favorite' && btn.active)) && "fill-current",
                      btn.id === 'favorite' && btn.active && "text-red-500"
                    )} />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Search Row */}
          <div className="flex items-center gap-2">
            {filterHeroButtons.filter(b => b.id === 'search' || b.id === 'voice' || b.id === 'remote-toggle' || b.id === 'device-info').map((btn, idx) => {
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
                        isFocused && "shadow-2xl ring-4 ring-white/20",
                        btn.id === 'voice' && isListening && "animate-pulse",
                        btn.id === 'remote-toggle' && remoteControlEnabled && "border-green-500/50",
                        btn.id === 'device-info' && showDeviceInfo && "border-blue-500/50"
                      )}
                    >
                      <div className="relative">
                        <btn.icon className={cn("w-3 h-3", btn.id === 'voice' && isListening && "text-red-500")} />
                        {btn.id === 'remote-toggle' && isRemoteConnected && (
                          <motion.div 
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: themeColor }}
                          />
                        )}
                      </div>
                      {btn.label}
                    </button>
                    {btn.id === 'search' && (
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
                        <div className="absolute right-3 flex items-center gap-2">
                          {isAISearching ? (
                            <CircleDashed className="w-3 h-3 animate-spin text-blue-400" />
                          ) : searchQuery.length > 10 ? (
                            <button
                              onClick={() => handleAISearch(searchQuery)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="AI ile Ara"
                            >
                              <Sparkles className="w-3 h-3" />
                            </button>
                          ) : null}
                          {searchQuery && (isFocused || searchQuery) && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="text-zinc-400 hover:text-white transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        
                        <AnimatePresence>
                          {aiExplanation && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 mt-2 bg-blue-600 text-white px-4 py-2 rounded-2xl text-[10px] font-bold shadow-xl z-50 whitespace-nowrap flex items-center gap-2"
                            >
                              <Sparkles className="w-3 h-3" />
                              {aiExplanation}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter Buttons Row */}
          {!searchQuery && (
            <div 
              ref={categoryScrollRef}
              className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-2"
            >
              {filterHeroButtons.filter(b => b.id !== 'search' && b.id !== 'voice' && b.id !== 'remote-toggle' && b.id !== 'device-info').map((btn, idx) => {
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
                          : (btn.isActive ? themeColor : 'rgba(255,255,255,0.1)'),
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
  );
};
