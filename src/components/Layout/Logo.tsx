import React, { useState, useEffect } from 'react';
import { Tv } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UIMode, LogoStyle } from '../../types';
import { cn } from '../../lib/utils';

interface LogoProps {
  uiMode: UIMode;
  logoStyle: LogoStyle;
}

export const Logo: React.FC<LogoProps> = ({ uiMode, logoStyle }) => {
  const [isAltLogo, setIsAltLogo] = useState(false);

  useEffect(() => {
    if (logoStyle === 'default') {
      const interval = setInterval(() => {
        setIsAltLogo(true);
        setTimeout(() => setIsAltLogo(false), 10000);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [logoStyle]);

  const renderLogo = () => {
    switch (logoStyle) {
      case 'mooncrown':
        return (
          <motion.div
            key="mooncrown-only"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <Tv className="text-yellow-400 w-8 h-8 md:w-10 md:h-10 fill-current" />
            <span className="font-black text-2xl md:text-3xl tracking-tighter uppercase italic flex">
              <span className="text-yellow-400">MoOnCrOwN</span>
              <span style={{ color: 'var(--theme-color)' }}>3FLİX</span>
            </span>
          </motion.div>
        );
      case 'mooncrown-gold':
        return (
          <motion.div
            key="mooncrown-gold"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <Tv className="text-amber-400 w-8 h-8 md:w-10 md:h-10 fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <span className="font-black text-2xl md:text-3xl tracking-tighter uppercase italic flex drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
              <span className="text-amber-400">MOONCROWN</span>
              <span className="text-white">3FLİX</span>
            </span>
          </motion.div>
        );
      case 'mooncrown-silver':
        return (
          <motion.div
            key="mooncrown-silver"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Tv className="text-zinc-300 w-8 h-8 md:w-10 md:h-10 fill-current" />
            <span className="font-black text-2xl md:text-3xl tracking-tighter uppercase italic flex">
              <span className="text-zinc-300">MOONCROWN</span>
              <span style={{ color: 'var(--theme-color)' }}>3FLİX</span>
            </span>
          </motion.div>
        );
      case 'mooncrown-neon':
        return (
          <motion.div
            key="mooncrown-neon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <Tv className="text-white w-8 h-8 md:w-10 md:h-10 fill-current shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            <span className="font-black text-2xl md:text-3xl tracking-tighter uppercase italic flex">
              <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">MOONCROWN</span>
              <span style={{ color: 'var(--theme-color)', textShadow: `0 0 10px var(--theme-color)` }}>3FLİX</span>
            </span>
          </motion.div>
        );
      case 'mooncrown-glass':
        return (
          <motion.div
            key="mooncrown-glass"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1 rounded-full backdrop-blur-md"
          >
            <Tv className="text-white w-6 h-6 fill-current" />
            <span className="font-black text-xl md:text-2xl tracking-tighter uppercase italic flex">
              <span className="text-white/90">MOONCROWN</span>
              <span style={{ color: 'var(--theme-color)' }}>3FLİX</span>
            </span>
          </motion.div>
        );
      case 'mooncrown-fire':
        return (
          <motion.div
            key="mooncrown-fire"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
              }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Tv className="text-orange-500 w-8 h-8 md:w-10 md:h-10 fill-current drop-shadow-[0_0_10px_#f97316]" />
            </motion.div>
            <span className="font-black text-2xl md:text-3xl tracking-tighter uppercase italic flex">
              <span className="text-orange-500 drop-shadow-[0_0_8px_#f97316]">MOONCROWN</span>
              <span className="text-yellow-500 drop-shadow-[0_0_8px_#eab308]">3FLİX</span>
            </span>
          </motion.div>
        );
      case 'minimal':
        return (
          <motion.div
            key="minimal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1"
          >
            <span className="font-bold text-xl md:text-2xl tracking-tight text-white">
              M3U<span style={{ color: 'var(--theme-color)' }}>FLIX</span>
            </span>
          </motion.div>
        );
      case 'neon':
        return (
          <motion.div
            key="neon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <span 
              className="font-black text-2xl md:text-3xl tracking-tighter uppercase italic"
              style={{ 
                color: 'var(--theme-color)',
                textShadow: `0 0 10px var(--theme-color), 0 0 20px var(--theme-color)`
              }}
            >
              M3UFLIX
            </span>
          </motion.div>
        );
      case 'retro':
        return (
          <motion.div
            key="retro"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="bg-white p-1 rounded-sm">
              <Tv className="text-black w-6 h-6 fill-current" />
            </div>
            <span className="font-serif font-bold text-2xl text-white italic tracking-widest">
              M3U<span className="text-red-500">FLIX</span>
            </span>
          </motion.div>
        );
      case 'glitch':
        return (
          <motion.div
            key="glitch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            <span className="font-black text-2xl md:text-3xl tracking-tighter uppercase italic text-white relative z-10">
              M3UFLIX
            </span>
            <motion.span 
              animate={{ x: [-2, 2, -2], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 0.2 }}
              className="absolute inset-0 font-black text-2xl md:text-3xl tracking-tighter uppercase italic text-cyan-400 z-0"
            >
              M3UFLIX
            </motion.span>
            <motion.span 
              animate={{ x: [2, -2, 2], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 0.2, delay: 0.1 }}
              className="absolute inset-0 font-black text-2xl md:text-3xl tracking-tighter uppercase italic text-red-500 z-0"
            >
              M3UFLIX
            </motion.span>
          </motion.div>
        );
      default:
        return !isAltLogo ? (
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
            className={cn(
              "flex items-center gap-2 origin-left",
              uiMode === 'minimalist' && "gap-1"
            )}
          >
            <Tv className="text-yellow-400 w-8 h-8 md:w-10 md:h-10 fill-current" />
            <span className={cn(
              "font-black text-2xl md:text-3xl tracking-tighter uppercase italic flex",
              uiMode === 'minimalist' && "not-italic tracking-normal font-bold"
            )}>
              <span className="text-yellow-400">MoOnCrOwN</span>
              <span style={{ color: 'var(--theme-color)' }}>3FLİX</span>
            </span>
          </motion.div>
        );
    }
  };

  return (
    <div className="relative h-10 flex items-center overflow-hidden group">
      {uiMode === 'modern' && (
        <div 
          className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-60 transition-opacity"
          style={{ backgroundColor: 'var(--theme-color)' }}
        />
      )}
      <AnimatePresence mode="wait">
        {renderLogo()}
      </AnimatePresence>
    </div>
  );
};
