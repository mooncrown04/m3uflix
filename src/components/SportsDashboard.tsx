import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, X, ChevronRight, Activity, Clock, Star, RefreshCw } from 'lucide-react';
import { LiveMatch, LeagueStanding } from '../types';
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
  const [viewMode, setViewMode] = useState<'scores' | 'standings'>('scores');
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [isLoadingStandings, setIsLoadingStandings] = useState(false);

  const leagues = ['Hepsi', ...Array.from(new Set(matches.map(m => m.league)))];

  useEffect(() => {
    if (isOpen && viewMode === 'standings' && standings.length === 0) {
      fetchStandings();
    }
  }, [isOpen, viewMode, standings.length]);

  const fetchStandings = async () => {
    setIsLoadingStandings(true);
    try {
      const response = await fetch('/api/standings');
      if (response.ok) {
        const data = await response.json();
        setStandings(data);
      }
    } catch (e) {
      console.error('Failed to fetch standings:', e);
    } finally {
      setIsLoadingStandings(false);
    }
  };
  
  const filteredMatches = activeLeague === 'Hepsi' 
    ? matches 
    : matches.filter(m => m.league === activeLeague);

  const currentStanding = standings.find(s => s.league === (activeLeague === 'Hepsi' ? 'Trendyol Süper Lig' : activeLeague));

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
            <div className="p-6 border-b border-white/10 flex flex-col gap-4 bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-xl">
                    <Trophy className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Spor Merkezi</h2>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Canlı Veriler</span>
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

              {/* Score/Standing Toggle */}
              <div className="flex bg-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('scores')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'scores' ? "bg-white text-black rounded-lg shadow-lg" : "text-zinc-500 hover:text-white"
                  )}
                >
                  Canlı Skor
                </button>
                <button
                  onClick={() => setViewMode('standings')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'standings' ? "bg-white text-black rounded-lg shadow-lg" : "text-zinc-500 hover:text-white"
                  )}
                >
                  Puan Durumu
                </button>
              </div>
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
              {viewMode === 'scores' ? (
                filteredMatches.length === 0 ? (
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
                )
              ) : (
                <div className="space-y-4">
                  {isLoadingStandings ? (
                    <div className="h-60 flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-white/20 animate-spin" />
                    </div>
                  ) : currentStanding ? (
                    <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-white/5 text-zinc-500 font-black uppercase tracking-widest border-b border-white/5">
                          <tr>
                            <th className="py-4 px-4 w-10 text-center">#</th>
                            <th className="py-4 px-2">TAKIM</th>
                            <th className="py-4 px-2 text-center w-8">O</th>
                            <th className="py-4 px-2 text-center w-8">AV</th>
                            <th className="py-4 px-4 text-center w-10 bg-white/10 text-white font-black">P</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {currentStanding.standings.map((team) => (
                            <tr key={team.team} className="hover:bg-white/5 transition-colors group">
                              <td className="py-4 px-4 text-center font-black text-zinc-500">{team.rank}</td>
                              <td className="py-4 px-2 uppercase font-black text-zinc-300 group-hover:text-white flex items-center gap-3">
                                {team.logo && (
                                  <div className="w-6 h-6 p-1 bg-white/5 rounded-lg flex items-center justify-center">
                                    <img src={team.logo} className="w-full h-full object-contain" alt="" referrerPolicy="no-referrer" />
                                  </div>
                                )}
                                <span className="truncate">{team.team}</span>
                              </td>
                              <td className="py-4 px-2 text-center font-bold text-zinc-500">{team.played}</td>
                              <td className="py-4 px-2 text-center font-bold text-zinc-400 tracking-tighter">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                              <td className="py-4 px-4 text-center font-black text-white bg-white/5">{team.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-60 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                      <Trophy className="w-12 h-12" />
                      <p className="text-sm font-bold uppercase tracking-widest">Puan durumu bulunamadı</p>
                    </div>
                  )}
                </div>
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
