import React, { useState, useEffect } from 'react';

interface DigitalClockProps {
  themeColor: string;
}

export const DigitalClock: React.FC<DigitalClockProps> = ({ themeColor }) => {
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
    <div className="flex flex-col items-end justify-center leading-none mr-2 select-none">
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
