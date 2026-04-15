import React, { useMemo } from 'react';
import { Play, Monitor, Tv, X, MoreVertical } from 'lucide-react';
import { motion } from 'motion/react';
import { PreviewPlayer } from '../PreviewPlayer';
import { cn } from '../../lib/utils';
import { ChannelCardProps } from '../../types';

export const ChannelCard = React.memo<ChannelCardProps>(({
  channel,
  rowIndex,
  colIndex,
  activeRow,
  activeCol,
  previewChannelId,
  favorites,
  multiSessions,
  canliChannels,
  filmChannels,
  diziChannels,
  pressingId,
  title,
  themeColor,
  deviceType,
  orientation,
  uiMode,
  playbackProgress,
  epgData,
  now,
  onFocus,
  onSelect,
  onDetail,
  onDeleteChannel,
  onLongPress,
  onToggleMini,
  handlePressStart,
  handlePressEnd,
  customProxyUrl,
  layoutMode = 'scroll',
  style,
  channels,
  top10Style = 'original',
  focusEffect = 'default',
  channelNumbers = {}
}) => {
  const isFocused = activeRow === rowIndex && colIndex === activeCol;
  const isPreviewing = isFocused && previewChannelId === channel.id;
  const isFavorite = Array.isArray(favorites) && favorites.includes(channel.id);
  const isMulti = Object.values(multiSessions).some((ids: string[]) => ids.includes(channel.id));
  const isCanli = Array.isArray(canliChannels) && canliChannels.includes(channel.id);
  const isFilm = Array.isArray(filmChannels) && filmChannels.includes(channel.id);
  const isDizi = Array.isArray(diziChannels) && diziChannels.includes(channel.id);
  const isPressing = pressingId === channel.id;
  const pressStartTime = React.useRef<number>(0);

  // Find current EPG program
  const currentProgram = useMemo(() => {
    if (!epgData || !epgData.programs) return null;
    
    // Try to match by tvg-id or channel name
    const channelId = channel.tvgId || channel.name;
    const programs = epgData.programs[channelId] || [];
    
    return programs.find(p => now >= p.start && now <= p.stop);
  }, [epgData, channel.tvgId, channel.name, now]);

  // Find next EPG program
  const nextProgram = useMemo(() => {
    if (!epgData || !epgData.programs) return null;
    
    const channelId = channel.tvgId || channel.name;
    const programs = epgData.programs[channelId] || [];
    
    // Programs are sorted by start time in epgParser.ts
    const currentIndex = programs.findIndex(p => now >= p.start && now <= p.stop);
    if (currentIndex !== -1 && currentIndex < programs.length - 1) {
      return programs[currentIndex + 1];
    }
    
    // If no current program found, find the first one that starts after 'now'
    if (currentIndex === -1) {
      return programs.find(p => p.start > now);
    }
    
    return null;
  }, [epgData, channel.tvgId, channel.name, now]);

  const progress = useMemo(() => {
    if (!currentProgram) return 0;
    const nowTime = now.getTime();
    const start = currentProgram.start.getTime();
    const stop = currentProgram.stop.getTime();
    const total = stop - start;
    const elapsed = nowTime - start;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }, [currentProgram, now]);

  const getBadges = () => {
    const b = [];
    if (title === 'İzlemeye Devam Et') b.push('İ');
    if (isFavorite) b.push('F');
    if (isMulti) b.push('M');
    if (isCanli) b.push('C');
    if (isFilm) b.push('Fi');
    if (isDizi) b.push('D');
    return b;
  };
  const badges = getBadges();

  const getFocusAnimation = (): any => {
    if (!isFocused) return {};
    
    switch (focusEffect) {
      case 'glow':
        return {
          boxShadow: [
            `0 0 20px ${themeColor}4d`,
            `0 0 50px ${themeColor}80`,
            `0 0 20px ${themeColor}4d`
          ],
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        };
      case 'pulse':
        return {
          scale: [1.1, 1.15, 1.1],
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        };
      case 'border':
        return {
          borderColor: [themeColor, '#ffffff', themeColor],
          transition: { duration: 2, repeat: Infinity, ease: "linear" }
        };
      case 'scale':
        return {
          scale: 1.15,
          transition: { type: 'spring', stiffness: 300, damping: 20 }
        };
      default:
        return {};
    }
  };

  return (
    <div 
      style={style}
      className={cn(
        "flex flex-col gap-2 snap-start relative", 
        title === 'Top 10' && (layoutMode === 'fixed-focus' ? "pl-14" : "pl-20"),
        deviceType === 'tv' 
          ? (orientation === 'landscape' ? "w-48 md:w-72" : "w-40 md:w-56")
          : deviceType === 'phone'
          ? (orientation === 'landscape' ? "w-32" : "w-24")
          : (orientation === 'landscape' ? "w-40 md:w-56" : "w-32 md:w-44")
      )}
    >
      {title === 'Top 10' && (
        <div className={cn(
          "absolute z-0 pointer-events-none select-none flex overflow-visible",
          layoutMode === 'fixed-focus' 
            ? "left-0 w-12 top-0 h-[70%] items-center justify-center" 
            : "left-[-60px] bottom-[-5px] h-full items-end justify-center"
        )}>
          <span 
            className="font-black italic leading-none"
            style={{ 
              WebkitTextStroke: (top10Style === 'original' || top10Style === 'neon' || top10Style === 'outline-theme') 
                ? `${layoutMode === 'fixed-focus' ? '2px' : '5px'} ${top10Style === 'original' ? 'rgba(255,255,255,0.5)' : themeColor}` 
                : 'none',
              color: (top10Style === 'original' || top10Style === 'neon' || top10Style === 'outline-theme') 
                ? 'transparent' 
                : (top10Style === 'theme' ? themeColor : 'white'),
              fontSize: layoutMode === 'fixed-focus' ? '60px' : '160px',
              fontWeight: '900',
              textShadow: top10Style === 'neon' 
                ? `0 0 25px ${themeColor}, 0 0 50px ${themeColor}` 
                : (top10Style === 'filled' ? '0 15px 30px rgba(0,0,0,0.8)' : 'none')
            }}
          >
            {colIndex + 1}
          </span>
        </div>
      )}
      <motion.div
        layoutId={`channel-${channel.id}-${rowIndex}-${colIndex}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={getFocusAnimation()}
        onContextMenu={(e) => {
          if (deviceType !== 'tv') {
            e.preventDefault();
            e.stopPropagation();
            onLongPress?.(channel.id, title);
          }
        }}
        onMouseEnter={() => onFocus(rowIndex, colIndex)}
        style={{ 
          boxShadow: isFocused && focusEffect === 'default'
            ? (uiMode === 'modern' 
                ? `0 0 30px ${themeColor}4d` 
                : uiMode === 'classic'
                ? `0 0 0 4px ${themeColor}, 0 20px 40px rgba(0,0,0,0.8)`
                : `0 4px 0 0 ${themeColor}`) 
            : undefined,
          borderColor: isFocused 
            ? (uiMode === 'minimalist' ? 'transparent' : (focusEffect === 'border' ? 'white' : themeColor))
            : (uiMode === 'minimalist' ? 'transparent' : 'rgba(255,255,255,0.05)')
        }}
        className={cn(
          "relative w-full transition-all duration-300 border-4 cursor-pointer overflow-hidden group/card",
          uiMode === 'modern' && "rounded-2xl border-white/10 bg-white/5 backdrop-blur-xl bg-zinc-900",
          uiMode === 'classic' && "rounded-none border-zinc-800 bg-zinc-950",
          uiMode === 'minimalist' && "rounded-none border-transparent bg-transparent",
          orientation === 'landscape' ? "aspect-video" : "aspect-[2/3]",
          isFocused && uiMode === 'modern' && focusEffect !== 'pulse' && focusEffect !== 'scale' && "scale-110 z-50 shadow-[0_0_50px_rgba(0,0,0,0.5)]",
          isFocused && uiMode === 'classic' && focusEffect !== 'pulse' && focusEffect !== 'scale' && "scale-105 z-40",
          isFocused && uiMode === 'minimalist' && "scale-100 z-40 opacity-100",
          !isFocused && uiMode === 'minimalist' && "opacity-60"
        )}
      >
        {/* Clickable Overlay - Handles all card interactions */}
        <div 
          className="absolute inset-0 z-0 cursor-pointer"
          onPointerDown={(e) => {
            pressStartTime.current = Date.now();
            if (activeRow !== rowIndex || activeCol !== colIndex) {
              onFocus(rowIndex, colIndex);
            }
            handlePressStart(channel.id);
          }}
          onPointerUp={handlePressEnd}
          onClick={(e) => {
            e.stopPropagation();
            const duration = Date.now() - pressStartTime.current;
            // Only trigger if it was a short click (less than 500ms)
            if (duration < 500 && duration > 0) {
              onSelect(channel);
            }
          }}
          onPointerLeave={handlePressEnd}
          onPointerCancel={handlePressEnd}
        />
        {isFocused && uiMode === 'modern' && (
          <div 
            className="absolute inset-0 blur-2xl opacity-20 pointer-events-none"
            style={{ backgroundColor: themeColor }}
          />
        )}
        {isFocused && uiMode === 'minimalist' && (
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundColor: themeColor }}
          />
        )}
        {playbackProgress[channel.id] && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-[70] pointer-events-none">
            <div 
              className="h-full transition-all duration-300"
              style={{ 
                width: `${(playbackProgress[channel.id].currentTime / playbackProgress[channel.id].duration) * 100}%`,
                backgroundColor: themeColor
              }}
            />
          </div>
        )}
        {/* Overlays and Content */}
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
            {channel.isMultiView ? (
              <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-zinc-950 p-1 pointer-events-none">
                {(channel.sessionChannels || []).slice(0, 4).map((id: string) => {
                  const ch = channels.find(c => c.id === id);
                  return (
                    <div key={id} className="w-full h-full bg-zinc-900 overflow-hidden">
                      {ch?.logo ? (
                        <img src={ch.logo} alt="" className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Tv className="w-4 h-4 text-zinc-800" /></div>
                      )}
                    </div>
                  );
                })}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-black/60 backdrop-blur-md p-3 rounded-full border border-white/20">
                    <Monitor className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            ) : channel.logo ? (
              <img 
                src={channel.logo} 
                alt={channel.name} 
                className="w-full h-full object-cover pointer-events-none"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=101010&color=fff&size=512`;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 pointer-events-none">
                <Tv className="w-8 h-8 text-zinc-700" />
              </div>
            )}
          </>
        )}

        {/* EPG Info Overlay */}
        {currentProgram && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-[60] pointer-events-none">
            <div className="text-[10px] font-bold text-white truncate mb-1">
              {currentProgram.title}
            </div>
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full"
                style={{ backgroundColor: themeColor }}
              />
            </div>
          </div>
        )}

        {/* Play Icon Overlay (if no EPG) */}
        {!currentProgram && uiMode !== 'minimalist' && (
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3 transition-opacity duration-300 pointer-events-none",
            isFocused ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"
          )}>
            <div className="flex items-center gap-2">
              <div className="bg-white p-1 rounded-full">
                <Play className="w-2 h-2 text-black fill-current" />
              </div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">Şimdi İzle</span>
            </div>
          </div>
        )}
        {isFocused && uiMode === 'minimalist' && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-1 z-[70] pointer-events-none"
            style={{ backgroundColor: themeColor }}
          />
        )}

        {/* Interactive Elements (Buttons) - Placed last with high z-index to ensure clickability */}
        {(isFocused || deviceType !== 'tv') && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(channel);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className={cn(
                "absolute bottom-2 right-[88px] z-[100] p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-green-600 border border-white/10 shadow-xl transition-all active:scale-90 cursor-pointer group/play",
                isFocused ? "opacity-100 scale-100" : "opacity-0 scale-50 group-hover/card:opacity-100 group-hover/card:scale-100"
              )}
              title="Oynat (Enter)"
            >
              <Play className="w-4 h-4 group-hover/play:scale-110 transition-transform fill-current" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMini?.(channel);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className={cn(
                "absolute bottom-2 right-12 z-[100] p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-600 border border-white/10 shadow-xl transition-all active:scale-90 cursor-pointer group/pip",
                isFocused ? "opacity-100 scale-100" : "opacity-0 scale-50 group-hover/card:opacity-100 group-hover/card:scale-100"
              )}
              title="Picture in Picture (P)"
            >
              <Monitor className="w-4 h-4 group-hover/pip:scale-110 transition-transform" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLongPress?.(channel.id, title);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className={cn(
                "absolute bottom-2 right-2 z-[100] p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-600 border border-white/10 shadow-xl transition-all active:scale-90 cursor-pointer group/more",
                isFocused ? "opacity-100 scale-100" : "opacity-0 scale-50 group-hover/card:opacity-100 group-hover/card:scale-100"
              )}
              title="Daha Fazla (Favori/Multi)"
            >
              <MoreVertical className="w-4 h-4 group-hover/more:scale-110 transition-transform" />
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteChannel(channel.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-2 right-2 z-[100] w-6 h-6 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:bg-red-600 group/delete",
            isFocused ? "opacity-100 scale-100" : "opacity-0 scale-50"
          )}
        >
          <X className="w-3.5 h-3.5 text-white group-hover/delete:scale-110 transition-transform" />
        </button>

        {isPressing && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, ease: "linear" }}
            className="absolute bottom-0 left-0 h-1.5 bg-white z-[110] pointer-events-none"
          />
        )}
        <div className="absolute top-2 left-2 z-[100] flex flex-col gap-1.5 pointer-events-none">
          {channelNumbers[channel.id] && (
            <div 
              style={{ backgroundColor: themeColor }}
              className="text-[10px] font-black text-white px-2 h-5 rounded shadow-lg flex items-center justify-center border border-white/20 backdrop-blur-sm"
            >
              {channelNumbers[channel.id]}
            </div>
          )}
          {badges.map((b, i) => (
            <div 
              key={i}
              style={{ backgroundColor: themeColor }}
              className="text-[10px] font-black text-white w-5 h-5 rounded shadow-lg flex items-center justify-center border border-white/20 backdrop-blur-sm"
            >
              {b}
            </div>
          ))}
        </div>
      </motion.div>
      <div className={cn(
        "mt-0.5 transition-all duration-300 relative z-10",
        uiMode === 'minimalist' && "mt-0"
      )}>
        <p className={cn(
          "text-sm font-bold truncate transition-all duration-300",
          orientation === 'landscape' ? "w-full" : "w-full",
          isFocused ? "text-white translate-y-[-2px]" : "text-zinc-300",
          uiMode === 'minimalist' && isFocused && "text-white tracking-widest uppercase",
          uiMode === 'classic' && isFocused && "text-white"
        )}>
          {channel.name}
        </p>
        {currentProgram && (
          <p className={cn(
            "text-[10px] truncate mt-0.5 flex items-center gap-1.5",
            isFocused ? "text-zinc-200" : "text-zinc-400"
          )}>
            <span className="opacity-60 font-mono shrink-0">
              {currentProgram.start.getHours().toString().padStart(2, '0')}:
              {currentProgram.start.getMinutes().toString().padStart(2, '0')}
            </span>
            <span className="truncate font-medium">{currentProgram.title}</span>
          </p>
        )}
        {nextProgram && (
          <p className={cn(
            "text-[9px] text-zinc-500 truncate mt-0.5 flex items-center gap-1.5",
            uiMode === 'minimalist' && "opacity-60 italic"
          )}>
            <span className="opacity-40 font-black text-[7px] uppercase tracking-tighter shrink-0">Sonraki</span>
            <span className="opacity-60 font-mono shrink-0">
              {nextProgram.start.getHours().toString().padStart(2, '0')}:
              {nextProgram.start.getMinutes().toString().padStart(2, '0')}
            </span>
            <span className="truncate opacity-80">{nextProgram.title}</span>
          </p>
        )}
      </div>
    </div>
  );
});
