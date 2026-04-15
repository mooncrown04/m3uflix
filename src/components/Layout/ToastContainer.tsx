import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X } from 'lucide-react';
import { Toast } from '../../types';
import { cn } from '../../lib/utils';

interface ToastContainerProps {
  toasts: Toast[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
              "px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px] backdrop-blur-md border",
              toast.type === 'error' 
                ? "bg-red-600/90 border-red-500 text-white" 
                : "bg-zinc-900/90 border-zinc-800 text-white"
            )}
          >
            {toast.type === 'error' ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            <span className="text-sm font-bold tracking-wide">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
