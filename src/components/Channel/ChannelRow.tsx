import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FixedSizeList as List } from 'react-window';
import { ChannelCard } from './ChannelCard';
import { cn, useContainerWidth } from '../../lib/utils';
import { ChannelRowProps } from '../../types';

export const ChannelRow: React.FC<ChannelRowProps> = ({ 
  title, 
  channels, 
  onSelect, 
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
  uiMode,
  playbackProgress = {},
  epgData,
  now,
  isGrid = false
}) => {
  const listRef = useRef<any>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(listContainerRef);
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
  const top10Offset = title === 'Top 10' ? 64 : 0;
  const itemSize = itemWidth + gap + top10Offset;
  const listHeight = orientation === 'landscape' ? (itemWidth * 9/16 + 80) : (itemWidth * 3/2 + 80);

  if (isGrid) {
    return (
      <div ref={rowRef} className="space-y-6 group/row relative px-4 md:px-12">
        <div className="flex items-center">
          <div 
            style={{ 
              backgroundColor: themeColor,
              color: 'white',
              borderColor: 'white'
            }}
            className={cn(
              "flex items-center px-6 py-2.5 text-sm font-black uppercase tracking-widest transition-all shadow-xl border",
              uiMode === 'modern' && "rounded-full bg-white/10 backdrop-blur-2xl border-white/20",
              uiMode === 'classic' && "rounded-none border-l-4 border-white",
              uiMode === 'minimalist' && "rounded-none border-0 bg-transparent tracking-[0.3em] font-bold"
            )}
          >
            <div className="w-2 h-2 rounded-full mr-3 animate-pulse bg-white" />
            <span className="mr-3">{title}</span>
            <span className="ml-2 text-[10px] opacity-50">({channels.length})</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6">
          {channels.map((channel, idx) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              colIndex={idx}
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
              onDeleteChannel={onDeleteChannel}
              onToggleMini={onToggleMini}
              handlePressStart={handlePressStart}
              handlePressEnd={handlePressEnd}
              customProxyUrl={customProxyUrl}
              channels={channels}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={rowRef} className="space-y-4 group/row relative">
      <div className="flex items-center px-4 md:px-12">
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
            "flex items-center px-6 py-2.5 text-sm font-black uppercase tracking-widest transition-all shadow-xl border cursor-pointer",
            uiMode === 'modern' && "rounded-full bg-white/10 backdrop-blur-2xl border-white/20",
            uiMode === 'classic' && "rounded-none border-l-4 border-white",
            uiMode === 'minimalist' && "rounded-none border-0 bg-transparent tracking-[0.3em] font-bold",
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
            <div ref={listContainerRef} className="px-4 md:px-12 pt-4 pb-4">
              <List
                ref={listRef}
                height={listHeight}
                itemCount={channels.length}
                itemSize={itemSize}
                layout="horizontal"
                width={containerWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200)}
                className="no-scrollbar"
                style={{ overflowY: 'hidden' }}
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
                    onDeleteChannel={onDeleteChannel}
                    onToggleMini={onToggleMini}
                    handlePressStart={handlePressStart}
                    handlePressEnd={handlePressEnd}
                    customProxyUrl={customProxyUrl}
                    style={style}
                    channels={channels}
                  />
                )}
              </List>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
