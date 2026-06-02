import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, X, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/utils';
import { M3UChannel } from '../../types';

interface MiniPlayerProps {
  channel: M3UChannel | null;
  onMaximize: () => void;
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  themeColor: string;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  channel,
  onMaximize,
  onClose,
  isMuted,
  onToggleMute,
  themeColor
}) => {
  if (!channel) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      className="fixed bottom-6 right-6 w-80 aspect-video z-[60] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group"
    >
      <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
        {channel.logo ? (
          <img src={channel.logo} alt="" className="w-20 h-20 object-contain opacity-50 grayscale" />
        ) : (
          <div className="text-zinc-700 font-bold uppercase tracking-widest text-xs">Yayında</div>
        )}
      </div>

      {/* Controls Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest truncate max-w-[120px]">
              {channel.name}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 bg-black/40 rounded-full text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-center gap-4">
          <button 
            onClick={onToggleMute}
            className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all border border-white/10"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={onMaximize}
            className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all border border-white/10"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        className="absolute bottom-0 left-0 h-1 transition-all duration-300"
        style={{ backgroundColor: themeColor, width: '100%' }}
      />
    </motion.div>
  );
};
