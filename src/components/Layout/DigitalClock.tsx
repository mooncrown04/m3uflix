import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface DigitalClockProps {
  themeColor: string;
  style?: 'original' | 'horizontal' | 'minimal' | 'retro' | 'modern';
  className?: string;
}

export const DigitalClock: React.FC<DigitalClockProps> = ({ themeColor, style = 'original', className }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
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

  if (style === 'horizontal') {
    return (
      <div className={cn("flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 select-none", className)}>
        <div style={{ color: themeColor }} className="text-xl font-black italic tracking-tighter">
          {formatTime(time)}
        </div>
        <div className="w-px h-4 bg-white/20" />
        <div className="flex flex-col items-start leading-none">
          <div className="text-[10px] font-black text-white uppercase tracking-widest">
            {getDayName(time)}
          </div>
          <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
            {formatDate(time)}
          </div>
        </div>
      </div>
    );
  }

  if (style === 'minimal') {
    return (
      <div className={cn("flex flex-col items-end justify-center leading-none select-none", className)}>
        <div style={{ color: themeColor }} className="text-xl font-black tracking-tighter">
          {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-0.5">
          {getDayName(time)}
        </div>
      </div>
    );
  }

  if (style === 'retro') {
    return (
      <div className={cn("bg-zinc-900 border-2 border-zinc-800 p-2 font-mono select-none", className)}>
        <div style={{ color: themeColor }} className="text-2xl font-bold tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">
          {formatTime(time)}
        </div>
        <div className="flex justify-between text-[8px] text-zinc-500 mt-1 uppercase font-bold">
          <span>{formatDate(time)}</span>
          <span>{getDayName(time)}</span>
        </div>
      </div>
    );
  }

  if (style === 'modern') {
    return (
      <div className={cn("flex items-baseline gap-2 select-none", className)}>
        <div className="text-3xl font-light tracking-tighter text-white">
          {time.getHours().toString().padStart(2, '0')}
          <span className="animate-pulse opacity-50">:</span>
          {time.getMinutes().toString().padStart(2, '0')}
        </div>
        <div className="flex flex-col items-start">
          <div style={{ color: themeColor }} className="text-[10px] font-black uppercase tracking-widest">
            {getDayName(time)}
          </div>
          <div className="text-[8px] font-medium text-zinc-500">
            {formatDate(time)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-end justify-center leading-none select-none", className)}>
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
