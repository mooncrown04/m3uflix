import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '../../lib/utils';

interface RemotePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
  appUrl: string;
  remoteRoomId: string;
  remoteControlEnabled: boolean;
  setRemoteControlEnabled: (enabled: boolean) => void;
  isRemoteConnected: boolean;
}

export const RemotePairingModal: React.FC<RemotePairingModalProps> = ({
  isOpen,
  onClose,
  themeColor,
  appUrl,
  remoteRoomId,
  remoteControlEnabled,
  setRemoteControlEnabled,
  isRemoteConnected,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[300] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-zinc-900 border border-white/10 p-12 rounded-[48px] max-w-2xl w-full shadow-2xl relative overflow-hidden text-center"
          >
            <div 
              className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[100px] opacity-20"
              style={{ backgroundColor: themeColor }}
            />
            
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 p-4 rounded-full bg-white/5 text-white hover:bg-white/10 transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">UZAKTAN KUMANDA BAĞLA</h2>
                <p className="text-zinc-500 font-medium">Telefonunuzu kumanda olarak kullanmak için QR kodu tarayın veya kodu girin.</p>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-12 py-8">
                <div className="space-y-6 w-full max-w-[220px]">
                  <button
                    onClick={() => setRemoteControlEnabled(!remoteControlEnabled)}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-4",
                      remoteControlEnabled ? "border-white bg-white/10" : "border-white/5 bg-white/5"
                    )}
                  >
                    <div className="flex flex-col items-start gap-0.5 text-left">
                      <span className="font-bold text-sm text-white">Kumanda Modu</span>
                      <span className="text-[9px] text-zinc-500">Dışarıdan kontrolü aktif eder</span>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full transition-all relative shrink-0",
                      remoteControlEnabled ? "bg-green-500" : "bg-zinc-700"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                        remoteControlEnabled ? "left-[22px]" : "left-0.5"
                      )} />
                    </div>
                  </button>

                  <div className="space-y-4">
                    <div className="p-6 bg-white rounded-[40px] shadow-2xl transform hover:scale-105 transition-transform duration-500">
                      <QRCodeCanvas 
                        value={`${appUrl.replace(/\/$/, '')}/?remote=${remoteRoomId}`}
                        size={180}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">TELEFONLA TARATIN</div>
                  </div>
                </div>

                <div className="h-px w-12 bg-white/10 md:h-32 md:w-px" />

                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">EŞLEŞME KODU</div>
                    <div className="text-5xl font-black text-white tracking-[0.3em]">{remoteRoomId}</div>
                  </div>
                  
                  <div className={cn(
                    "px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3",
                    isRemoteConnected ? "bg-green-500/20 text-green-500 border border-green-500/20" : "bg-orange-500/20 text-orange-500 border border-orange-500/20"
                  )}>
                    <div className={cn("w-2 h-2 rounded-full", isRemoteConnected ? "bg-green-500 animate-pulse" : "bg-orange-500")} />
                    {isRemoteConnected ? 'KUMANDA BAĞLANDI' : 'BAĞLANTI BEKLENİYOR...'}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] text-zinc-600 font-medium max-w-sm mx-auto">
                  Not: Telefonunuz ve TV'niz aynı internet ağında olmalıdır. QR kod çalışmazsa ayarlardan manuel URL girebilirsiniz.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
