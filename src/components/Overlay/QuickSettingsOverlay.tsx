import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Sun, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface QuickSettingsOverlayProps {
  show: boolean;
  onClose: () => void;
  themeColor: string;
  playerEngine: string;
  setPlayerEngine: (engine: any) => void;
  ambilightMode: string;
  setAmbilightMode: (mode: any) => void;
  sleepTimer: number;
  setSleepTimer: (mins: number) => void;
  sleepTimerActive: boolean;
  setSleepTimerActive: (active: boolean) => void;
  quickSettingsFocus: number;
  setQuickSettingsFocus: (focus: number) => void;
}

export const QuickSettingsOverlay: React.FC<QuickSettingsOverlayProps> = ({
  show,
  onClose,
  themeColor,
  playerEngine,
  setPlayerEngine,
  ambilightMode,
  setAmbilightMode,
  sleepTimer,
  setSleepTimer,
  sleepTimerActive,
  setSleepTimerActive,
  quickSettingsFocus,
  setQuickSettingsFocus,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          className="fixed right-8 top-1/2 -translate-y-1/2 w-80 z-[200] bg-black/80 backdrop-blur-3xl rounded-[40px] border border-white/10 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
              <h3 className="text-xl font-black uppercase tracking-tighter italic text-white">Hızlı Ayarlar</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Play className="w-3 h-3" /> Oynatıcı Motoru
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['hls', 'shaka'].map((engine, idx) => (
                  <button
                    key={engine}
                    onClick={() => {
                      setPlayerEngine(engine as any);
                      setQuickSettingsFocus(idx);
                    }}
                    onPointerDown={() => setQuickSettingsFocus(idx)}
                    onMouseEnter={() => setQuickSettingsFocus(idx)}
                    className={cn(
                      "py-3 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest relative overflow-hidden",
                      playerEngine === engine ? "border-white bg-white/10 text-white" : "border-white/5 bg-white/5 text-zinc-500",
                      quickSettingsFocus === idx && "ring-4 ring-white ring-offset-4 ring-offset-black scale-105 z-10"
                    )}
                  >
                    {playerEngine === engine && (
                      <motion.div 
                        layoutId="qs-engine-active"
                        className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: themeColor }}
                      />
                    )}
                    {engine}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Sun className="w-3 h-3" /> Ambilight Modu
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['none', 'soft', 'vibrant', 'cinema'].map((mode, idx) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setAmbilightMode(mode as any);
                      setQuickSettingsFocus(idx + 2);
                    }}
                    onPointerDown={() => setQuickSettingsFocus(idx + 2)}
                    onMouseEnter={() => setQuickSettingsFocus(idx + 2)}
                    className={cn(
                      "py-3 rounded-2xl border-2 transition-all text-[10px] font-black uppercase tracking-widest relative overflow-hidden",
                      ambilightMode === mode ? "border-white bg-white/10 text-white" : "border-white/5 bg-white/5 text-zinc-500",
                      quickSettingsFocus === (idx + 2) && "ring-4 ring-white ring-offset-4 ring-offset-black scale-105 z-10"
                    )}
                  >
                    {ambilightMode === mode && (
                      <motion.div 
                        layoutId="qs-ambi-active"
                        className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: themeColor }}
                      />
                    )}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3" /> Uyku Zamanlayıcısı
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 60].map((mins, idx) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setSleepTimer(mins);
                      setSleepTimerActive(true);
                      setQuickSettingsFocus(idx + 6);
                    }}
                    onPointerDown={() => setQuickSettingsFocus(idx + 6)}
                    onMouseEnter={() => setQuickSettingsFocus(idx + 6)}
                    className={cn(
                      "py-3 rounded-2xl border-2 transition-all text-[10px] font-black uppercase tracking-widest relative overflow-hidden",
                      sleepTimer === mins && sleepTimerActive ? "border-white bg-white/10 text-white" : "border-white/5 bg-white/5 text-zinc-500",
                      quickSettingsFocus === (idx + 6) && "ring-4 ring-white ring-offset-4 ring-offset-black scale-105 z-10"
                    )}
                  >
                    {sleepTimer === mins && sleepTimerActive && (
                      <motion.div 
                        layoutId="qs-sleep-active"
                        className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: themeColor }}
                      />
                    )}
                    {mins} DK
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(QuickSettingsOverlay);
