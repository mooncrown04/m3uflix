import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, X, ChevronRight, Activity, Clock, Star } from 'lucide-react';
import { LiveMatch } from '../types';
import { cn } from '../lib/utils';

interface SportsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  matches: LiveMatch[];
  themeColor: string;
  onPlayChannel?: (channelId: string) => void;
}

export const SportsDashboard: React.FC<SportsDashboardProps> = ({
  isOpen,
  onClose,
  matches,
  themeColor,
  onPlayChannel
}) => {
  const [activeLeague, setActiveLeague] = useState<string>('Hepsi');
  const leagues = ['Hepsi', ...Array.from(new Set(matches.map(m => m.league)))];
  
  const filteredMatches = activeLeague === 'Hepsi' 
    ? matches 
    : matches.filter(m => m.league === activeLeague);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-white/10 z-[700] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-xl">
                  <Trophy className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Canlı Skorlar</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Canlı Maçlar</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            {/* League Tabs */}
            <div className="p-4 border-b border-white/5 flex gap-2 overflow-x-auto no-scrollbar bg-zinc-900/30">
              {leagues.map((league) => (
                <button
                  key={league}
                  onClick={() => setActiveLeague(league)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    activeLeague === league 
                      ? "bg-white text-black" 
                      : "bg-white/5 text-zinc-500 hover:bg-white/10"
                  )}
                >
                  {league}
                </button>
              ))}
            </div>

            {/* Matches List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {filteredMatches.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <Activity className="w-12 h-12" />
                  <p className="text-sm font-bold uppercase tracking-widest">Şu an canlı maç bulunmuyor</p>
                </div>
              ) : (
                filteredMatches.map((match) => (
                  <motion.div
                    layout
                    key={match.id}
                    className="bg-white/5 border border-white/5 rounded-3xl p-5 space-y-4 hover:border-white/20 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">{match.league}</span>
                      <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 rounded-lg">
                        <Clock className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] font-black text-red-500">{match.minute}'</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 text-center space-y-2">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl mx-auto flex items-center justify-center border border-white/5">
                          <span className="text-xl font-black text-white/20">{match.homeTeam[0]}</span>
                        </div>
                        <p className="text-xs font-black text-white uppercase truncate">{match.homeTeam}</p>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <div className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                          <span>{match.homeScore}</span>
                          <span className="text-white/20">-</span>
                          <span>{match.awayScore}</span>
                        </div>
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{match.status}</span>
                      </div>

                      <div className="flex-1 text-center space-y-2">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl mx-auto flex items-center justify-center border border-white/5">
                          <span className="text-xl font-black text-white/20">{match.awayTeam[0]}</span>
                        </div>
                        <p className="text-xs font-black text-white uppercase truncate">{match.awayTeam}</p>
                      </div>
                    </div>

                    {match.channelId && (
                      <button
                        onClick={() => onPlayChannel?.(match.channelId!)}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-center gap-2 transition-all group-hover:bg-white group-hover:text-black"
                      >
                        <Star className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Maçı İzle</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-zinc-900/50 border-t border-white/10">
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] text-center">
                Veriler her 30 saniyede bir güncellenir
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
