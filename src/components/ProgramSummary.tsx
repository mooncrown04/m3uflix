import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Sparkles, X, Loader2 } from 'lucide-react';
import { ProgramSummary as ProgramSummaryType } from '../types';
import { cn } from '../utils/cn';

interface ProgramSummaryProps {
  summary: ProgramSummaryType | null;
  isLoading: boolean;
  onClose: () => void;
  themeColor?: string;
}

export const ProgramSummary: React.FC<ProgramSummaryProps> = ({
  summary,
  isLoading,
  onClose,
  themeColor = '#dc2626'
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className="absolute top-24 right-8 w-80 z-[60]"
      >
        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10">
                <FileText className="w-4 h-4 text-white" style={{ color: themeColor }} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">AI ÖZET GEÇ</span>
                <span className="text-xs font-bold text-white truncate w-40">
                  {summary?.title || 'Program Analiz Ediliyor'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="w-8 h-8 text-white animate-spin" style={{ color: themeColor }} />
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest animate-pulse">
                  Yayın Akışı Analiz Ediliyor...
                </p>
              </div>
            ) : summary ? (
              <div className="space-y-3">
                {summary.summary.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-3"
                  >
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: themeColor }} />
                    <p className="text-sm text-white/80 leading-relaxed font-medium">
                      {item}
                    </p>
                  </motion.div>
                ))}
                
                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-tight">Gemini AI tarafından özetlendi</span>
                  </div>
                  <span className="text-[9px] font-bold text-white/20">
                    {new Date(summary.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-white/40 italic">Özet bilgisi alınamadı.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
