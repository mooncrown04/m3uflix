import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Command, Tv, Folder, Palette, X, Sparkles, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { M3UChannel } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  channels: M3UChannel[];
  onSelectChannel: (channel: M3UChannel) => void;
  categories: string[];
  onSelectCategory: (category: string) => void;
  themeColor: string;
  keyMap: any;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  channels,
  onSelectChannel,
  categories,
  onSelectCategory,
  themeColor,
  keyMap
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredChannels = channels
    .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  const filteredCategories = categories
    .filter(c => c.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);

  const totalItems = filteredChannels.length + filteredCategories.length;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const rawKey = e.key;
    let key = rawKey;

    if (rawKey === keyMap.up) key = 'ArrowUp';
    else if (rawKey === keyMap.down) key = 'ArrowDown';
    else if (rawKey === keyMap.enter || rawKey === 'OK' || rawKey === 'Select') key = 'Enter';
    else if (rawKey === keyMap.back || rawKey === 'Escape') key = 'Escape';

    if (key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalItems);
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
    } else if (key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredChannels.length) {
        onSelectChannel(filteredChannels[selectedIndex]);
      } else {
        onSelectCategory(filteredCategories[selectedIndex - filteredChannels.length]);
      }
      onClose();
    } else if (key === 'Escape') {
      onClose();
    }
  }, [totalItems, selectedIndex, filteredChannels, filteredCategories, onSelectChannel, onSelectCategory, onClose, keyMap]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setQuery('');
      setSelectedIndex(0);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[20vh] px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-xl bg-zinc-900/90 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-2xl"
      >
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            autoFocus
            type="text"
            placeholder="Kanal, kategori veya komut ara..."
            className="flex-1 bg-transparent border-none outline-none text-white text-lg font-medium placeholder:text-zinc-600"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">ESC</span>
          </div>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {query === '' && (
            <div className="px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Önerilen Komutlar</div>
          )}

          {filteredChannels.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Kanallar</div>
              {filteredChannels.map((channel, idx) => (
                <button
                  key={channel.id}
                  onClick={() => { onSelectChannel(channel); onClose(); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left",
                    selectedIndex === idx ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                    {channel.logo ? (
                      <img src={channel.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Tv className="w-5 h-5 text-zinc-700" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{channel.name}</div>
                    <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">{channel.group}</div>
                  </div>
                  {selectedIndex === idx && <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />}
                </button>
              ))}
            </div>
          )}

          {filteredCategories.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Kategoriler</div>
              {filteredCategories.map((cat, idx) => {
                const itemIdx = filteredChannels.length + idx;
                return (
                  <button
                    key={cat}
                    onClick={() => { onSelectCategory(cat); onClose(); }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left",
                      selectedIndex === itemIdx ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{cat}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {totalItems === 0 && query !== '' && (
            <div className="p-8 text-center space-y-2">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                <Search className="w-6 h-6 text-zinc-700" />
              </div>
              <p className="text-zinc-500 text-sm font-medium italic">"{query}" için sonuç bulunamadı</p>
            </div>
          )}
        </div>

        <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10">↑↓</div>
              <span>Gezin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10">ENTER</div>
              <span>Seç</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600">
            <Command className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-widest">M3UFLIX QUICK NAV</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
