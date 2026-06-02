import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FixedSizeList as List } from 'react-window';
import { ChannelCard } from './ChannelCard';
import { cn, useContainerWidth } from '../../lib/utils';
import { ChannelRowProps } from '../../types';

export const ChannelRow = React.memo<ChannelRowProps>(({ 
  title, 
  rowIndex,
  channels, 
  onSelect, 
  onDetail,
  onFocus, 
  onToggleFavorite, 
  onDeleteChannel,
  onLongPress,
  onToggleMini,
  favorites = [], 
  multiSessions = {},
  canliChannels = [],
  filmChannels = [],
  diziChannels = [],
  activeRow, 
  activeCol, 
  orientation, 
  previewChannelId, 
  themeColor,
  deviceType,
  isCollapsed,
  onToggleCollapse,
  customProxyUrl,
  uiMode,
  layoutMode = 'scroll',
  playbackProgress = {},
  epgData,
  now,
  isGrid = false,
  top10Style,
  focusEffect,
  channelNumbers = {}
}) => {
  const listRef = useRef<any>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(listContainerRef);
  const isActiveRow = activeRow === rowIndex;
  const isHeaderFocused = isActiveRow && activeCol === -1;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [pressingId, setPressingId] = useState<string | null>(null);

  useEffect(() => {
    if (isActiveRow && rowRef.current && layoutMode === 'scroll') {
      rowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isActiveRow, layoutMode]);

  useEffect(() => {
    if (isActiveRow && !isCollapsed && listRef.current && activeCol >= 0) {
      listRef.current.scrollToItem(activeCol, 'center');
    }
  }, [isActiveRow, activeCol, isCollapsed]);

  const handlePressStart = (channelId: string) => {
    if (channelId === 'multi-view-session') return;
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

  const getItemWidth = () => {
    const isMd = typeof window !== 'undefined' && window.innerWidth >= 768;
    if (deviceType === 'tv') {
      return orientation === 'landscape' ? (isMd ? 288 : 192) : (isMd ? 224 : 160);
    }
    if (deviceType === 'phone') {
      return orientation === 'landscape' ? 128 : 96;
    }
    return orientation === 'landscape' ? (isMd ? 224 : 160) : (isMd ? 176 : 128);
  };

  const itemWidth = getItemWidth();
  const gap = 16;
  const top10Offset = title === 'Top 10' ? (layoutMode === 'fixed-focus' ? 50 : 90) : 0;
  const itemSize = itemWidth + gap + top10Offset;
    const isSpecialRow = title === 'Top 10' || title === 'İzlemeye Devam Et';
    const extraHeight = title === 'Top 10' 
      ? (layoutMode === 'fixed-focus' ? 100 : 160) 
      : title === 'İzlemeye Devam Et'
      ? (layoutMode === 'fixed-focus' ? 70 : 100)
      : (layoutMode === 'fixed-focus' ? 60 : 90);
    const listHeight = orientation === 'landscape' 
    ? (itemWidth * 9/16 + extraHeight) 
    : (itemWidth * 3/2 + extraHeight);

  if (isGrid) {
    const columns = deviceType === 'tv' ? 6 : deviceType === 'phone' ? 2 : 4;
    const rowCount = Math.ceil(channels.length / columns);
    const gridItemWidth = (containerWidth - (columns - 1) * gap) / columns;
    const gridItemHeight = orientation === 'landscape' ? gridItemWidth * 9/16 + 180 : gridItemWidth * 3/2 + 180;

    return (
      <div 
        ref={rowRef} 
        data-row-index={rowIndex}
        className="space-y-4 group/row relative px-4 md:px-12 scroll-mt-[calc(var(--hero-height)+64px)] w-full"
      >
        <div className="flex flex-col">
          <div className="flex items-center px-4 md:px-12 mb-6">
            <div 
              onClick={onToggleCollapse}
              onPointerDown={() => onFocus(rowIndex, -1)}
              onMouseEnter={() => onFocus(rowIndex, -1)}
              style={{ 
                backgroundColor: isHeaderFocused ? themeColor : (isActiveRow ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'),
                color: 'white',
                borderColor: isHeaderFocused ? 'white' : 'transparent'
              }}
              className={cn(
                "flex items-center px-5 py-2 text-xs font-black uppercase tracking-widest transition-all shadow-xl border cursor-pointer",
                uiMode === 'modern' && "rounded-full bg-white/10 backdrop-blur-2xl border-white/20",
                uiMode === 'classic' && "rounded-none border-l-4 border-white",
                uiMode === 'minimalist' && "rounded-none border-0 bg-transparent tracking-[0.3em] font-bold",
                isHeaderFocused ? "scale-105 z-10" : "opacity-70 group-hover/row:opacity-100"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mr-2.5",
                isHeaderFocused ? "bg-white animate-pulse" : "bg-white/20"
              )} />
              <span className="mr-3">{title}</span>
              {!isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="ml-2 text-[9px] opacity-40">({channels.length})</span>
            </div>
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full"
              >
                <div ref={listContainerRef} className="w-full h-full min-h-[500px] relative pt-1 pb-10">
                  {uiMode === 'modern' && (
                    <div className="absolute inset-0 bg-white/[0.02] rounded-[3rem] pointer-events-none" />
                  )}
                  <List
                    height={800} // Fixed height for grid container or responsive
                    itemCount={rowCount}
                    itemSize={gridItemHeight + gap}
                    width={containerWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200)}
                    className="no-scrollbar"
                  >
                    {({ index, style }: { index: number; style: React.CSSProperties }) => (
                      <div style={style} className="flex gap-4">
                        {Array.from({ length: columns }).map((_, colIdx) => {
                          const channelIdx = index * columns + colIdx;
                          if (channelIdx >= channels.length) return <div key={colIdx} style={{ width: gridItemWidth }} />;
                          const channel = channels[channelIdx];
                          
                          return (
                            <div key={channel.id} style={{ width: gridItemWidth }}>
                              <ChannelCard
                                channel={channel}
                                colIndex={channelIdx}
                                rowIndex={rowIndex}
                                activeRow={activeRow}
                                activeCol={activeCol}
                                previewChannelId={previewChannelId}
                                favorites={favorites}
                                multiSessions={multiSessions}
                                canliChannels={canliChannels}
                                filmChannels={filmChannels}
                                diziChannels={diziChannels}
                                pressingId={pressingId}
                                title={title}
                                themeColor={themeColor}
                                deviceType={deviceType}
                                orientation={orientation}
                                uiMode={uiMode}
                                playbackProgress={playbackProgress}
                                epgData={epgData}
                                now={now}
                                onFocus={onFocus}
                                onSelect={onSelect}
                                onDetail={onDetail}
                                onDeleteChannel={onDeleteChannel}
                                onLongPress={onLongPress}
                                onToggleMini={onToggleMini}
                                handlePressStart={handlePressStart}
                                handlePressEnd={handlePressEnd}
                                customProxyUrl={customProxyUrl}
                                channels={channels}
                                top10Style={top10Style}
                                focusEffect={focusEffect}
                                channelNumbers={channelNumbers}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </List>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </div>
    );

  }

  return (
    <div 
      ref={rowRef} 
      className={cn(
        "group/row relative transition-all duration-500", 
        layoutMode === 'fixed-focus' ? "mb-0" : (title === 'Top 10' ? "mb-6" : (title === 'İzlemeye Devam Et' ? "mb-4" : "mb-2"))
      )}
    >
      <div className="flex items-center px-4 md:px-12 mb-6">
        <div 
          onClick={onToggleCollapse}
          onPointerDown={() => onFocus(rowIndex, -1)}
          onMouseEnter={() => onFocus(rowIndex, -1)}
          style={{ 
            backgroundColor: isHeaderFocused ? themeColor : (isActiveRow ? 'rgba(255,255,255,0.05)' : 'transparent'),
            color: 'white',
            borderColor: isHeaderFocused ? 'white' : 'transparent'
          }}
          className={cn(
            "flex items-center px-5 py-2 text-xs font-black uppercase tracking-widest transition-all border cursor-pointer",
            uiMode === 'modern' && "rounded-full bg-white/10 backdrop-blur-xl border-white/10",
            uiMode === 'classic' && "rounded-none border-l-4 border-white bg-zinc-900/50",
            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent tracking-[0.3em] font-bold",
            isHeaderFocused ? "scale-105 z-10 shadow-2xl bg-white/20" : "opacity-60 group-hover/row:opacity-100"
          )}
        >
          <div className={cn(
            "w-1.5 h-1.5 rounded-full mr-2.5",
            isHeaderFocused ? "bg-white animate-pulse" : "bg-white/20"
          )} />
          <span className="mr-3">{title}</span>
          {!isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span className="ml-2 text-[9px] opacity-40">({channels.length})</span>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: listHeight + 40, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative"
          >
            <div ref={listContainerRef} className={cn(
              "px-4 md:px-12 pt-1 pb-6",
              layoutMode === 'fixed-focus' ? "pb-4" : "pb-8"
            )}>
              <List
                ref={listRef}
                height={listHeight + 20}
                itemCount={channels.length}
                itemSize={itemSize}
                layout="horizontal"
                width={containerWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200)}
                className="no-scrollbar"
                style={{ overflowY: 'visible' }}
              >
                {({ index, style }: { index: number; style: React.CSSProperties }) => (
                  <ChannelCard
                    key={channels[index].id}
                    channel={channels[index]}
                    colIndex={index}
                    rowIndex={rowIndex}
                    activeRow={activeRow}
                    activeCol={activeCol}
                    previewChannelId={previewChannelId}
                    favorites={favorites}
                    multiSessions={multiSessions}
                    canliChannels={canliChannels}
                    filmChannels={filmChannels}
                    diziChannels={diziChannels}
                    pressingId={pressingId}
                    title={title}
                    themeColor={themeColor}
                    deviceType={deviceType}
                    orientation={orientation}
                    uiMode={uiMode}
                    playbackProgress={playbackProgress}
                    epgData={epgData}
                    now={now}
                    onFocus={onFocus}
                    onSelect={onSelect}
                    onDetail={onDetail}
                    onDeleteChannel={onDeleteChannel}
                    onLongPress={onLongPress}
                    onToggleMini={onToggleMini}
                    handlePressStart={handlePressStart}
                    handlePressEnd={handlePressEnd}
                    customProxyUrl={customProxyUrl}
                    layoutMode={layoutMode}
                    style={{ ...style, top: (style.top as number) + 0 }}
                    channels={channels}
                    top10Style={top10Style}
                    focusEffect={focusEffect}
                    channelNumbers={channelNumbers}
                  />
                )}
              </List>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
});
