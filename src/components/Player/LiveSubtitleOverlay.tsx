import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, Sparkles } from 'lucide-react';
import { LiveSubtitle } from '../../types';

interface LiveSubtitleOverlayProps {
  subtitle: LiveSubtitle | null;
  isEnabled: boolean;
  isProcessing: boolean;
}

export const LiveSubtitleOverlay: React.FC<LiveSubtitleOverlayProps> = ({
  subtitle,
  isEnabled,
  isProcessing
}) => {
  if (!isEnabled) return null;

  return (
    <div className="absolute inset-x-0 bottom-24 flex flex-col items-center justify-center z-40 pointer-events-none px-10">
      <AnimatePresence mode="wait">
        {isProcessing && !subtitle && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-2"
          >
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">AI Ses Analizi Yapılıyor...</span>
          </motion.div>
        )}

        {subtitle && (
          <motion.div
            key={subtitle.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.05 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shadow-2xl max-w-2xl text-center relative overflow-hidden group">
              {/* AI Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 opacity-50 animate-pulse" />
              
              <div className="relative flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em]">AI Canlı Çeviri</span>
                </div>
                
                <p className="text-lg md:text-xl font-bold text-white leading-tight tracking-tight drop-shadow-lg">
                  {subtitle.text}
                </p>
                
                {subtitle.originalText && (
                  <p className="text-[10px] font-medium text-white/40 italic mt-1">
                    "{subtitle.originalText}"
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
              <Languages className="w-3 h-3 text-zinc-500" />
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Orijinal Dil → Türkçe</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
