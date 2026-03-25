import React, { useState, useEffect } from 'react';
import { Tv } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UIMode } from '../../types';
import { cn } from '../../lib/utils';

interface LogoProps {
  uiMode: UIMode;
}

export const Logo: React.FC<LogoProps> = ({ uiMode }) => {
  const [isAltLogo, setIsAltLogo] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAltLogo(true);
      setTimeout(() => setIsAltLogo(false), 10000); // Show for 10 seconds
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-10 flex items-center overflow-hidden group">
      {uiMode === 'modern' && (
        <div 
          className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-60 transition-opacity"
          style={{ backgroundColor: 'var(--theme-color)' }}
        />
      )}
      <AnimatePresence mode="wait">
        {!isAltLogo ? (
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
            {uiMode !== 'minimalist' && <Tv className="text-yellow-400 w-8 h-8 md:w-10 md:h-10 fill-current" />}
            <span className={cn(
              "font-black text-2xl md:text-3xl tracking-tighter uppercase italic flex",
              uiMode === 'minimalist' && "not-italic tracking-normal font-bold"
            )}>
              <span className="text-yellow-400">MoOnCrOwN</span>
              <span style={{ color: 'var(--theme-color)' }}>3FLİX</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
