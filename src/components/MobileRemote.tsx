import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { 
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  Power, Volume2, VolumeX, Volume1, 
  Play, Pause, SkipBack, SkipForward,
  Home, Settings, Search, Mic,
  Menu, X, List, Star
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MobileRemoteProps {
  roomId: string;
  appUrl: string;
}

const MobileRemote: React.FC<MobileRemoteProps> = ({ roomId, appUrl }) => {
  const [socket, setSocket] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [vibrate, setVibrate] = useState(true);

  useEffect(() => {
    if (!appUrl || !roomId) return;
    const normalizedAppUrl = appUrl.replace(/\/$/, '');
    console.log('Connecting to socket with roomId:', roomId, 'at', normalizedAppUrl);
    const newSocket = io(normalizedAppUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected, joining room:', roomId);
      setConnected(true);
      setConnectionError(null);
      newSocket.emit('join-room', roomId);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setConnectionError(err.message || 'Bağlantı hatası oluştu');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, appUrl]);

  const sendCommand = useCallback((command: string, value?: any) => {
    if (socket && connected) {
      console.log('Sending command:', command, value);
      socket.emit('send-command', { roomId, command, value });
      if (vibrate && 'vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch (e) {
          // Ignore vibration errors
        }
      }
    } else {
      console.warn('Cannot send command: socket not connected', { socket: !!socket, connected });
    }
  }, [socket, connected, roomId, vibrate]);

  // Helper for button events to ensure compatibility across touch and mouse
  const handleAction = (command: string, value?: any) => (e: React.PointerEvent | React.MouseEvent) => {
    // Only prevent default on touch to avoid ghost clicks/scrolling, 
    // but let mouse events proceed normally for PC compatibility
    if ((e as any).pointerType === 'touch') {
      e.preventDefault();
    }
    
    console.log(`MobileRemote: Action triggered: ${command}`, { 
      type: e.type, 
      pointerType: (e as any).pointerType 
    });
    sendCommand(command, value);
  };

  const RemoteButton = ({ 
    icon: Icon, 
    label, 
    action, 
    className,
    variant = 'default'
  }: { 
    icon?: any, 
    label?: string, 
    action: () => void, 
    className?: string,
    variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'control'
  }) => (
    <button
      onPointerDown={(e) => {
        // Only prevent default on touch to avoid ghost clicks, 
        // but let mouse events proceed normally
        if (e.pointerType === 'touch') e.preventDefault();
        action();
      }}
      // Fallback for browsers where pointer events might be restricted
      onClick={(e) => {
        // If it was a mouse click and not already handled by pointerDown
        if ((e.nativeEvent as any).pointerType !== 'touch') {
          // action(); // We don't want double fire, but some PCs might need this if pointerDown fails
        }
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all active:scale-95 hover:brightness-110 touch-manipulation select-none",
        variant === 'default' && "bg-zinc-800 text-zinc-300 rounded-2xl p-3 sm:p-4 shadow-lg",
        variant === 'primary' && "bg-orange-500 text-white rounded-2xl p-3 sm:p-4 shadow-orange-500/20 shadow-lg",
        variant === 'danger' && "bg-red-500 text-white rounded-full p-3 sm:p-4 shadow-red-500/20 shadow-lg",
        variant === 'ghost' && "bg-transparent text-zinc-500 p-1 sm:p-2 hover:bg-white/5 rounded-xl",
        variant === 'control' && "bg-zinc-700 text-white rounded-full p-4 sm:p-6 shadow-xl border border-white/10",
        className
      )}
    >
      {Icon && <Icon className={cn(variant === 'control' ? "w-6 h-6 sm:w-8 h-8" : "w-5 h-5 sm:w-6 h-6")} />}
      {label && <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>}
    </button>
  );

  if (connectionError) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <X className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-white mb-2">BAĞLANTI HATASI</h1>
        <p className="text-zinc-500 text-sm mb-6">{connectionError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-transform"
        >
          TEKRAR DENE
        </button>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h1 className="text-xl font-black text-white mb-2">BAĞLANILIYOR...</h1>
        <p className="text-zinc-500 text-sm mb-2">Televizyonunuz ile güvenli bağlantı kuruluyor.</p>
        <div className="bg-white/5 px-4 py-2 rounded-full text-xs font-mono text-zinc-400">
          KOD: {roomId}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white flex flex-col select-none overflow-hidden" style={{ touchAction: 'manipulation', height: '100%' }}>
      {/* Header */}
      <div className="p-3 sm:p-4 flex items-center justify-between border-b border-white/5 flex-shrink-0 bg-black/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
          <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-zinc-500 uppercase">
            {connected ? 'CANLI BAĞLANTI' : 'BAĞLANTI KESİLDİ'}
          </span>
          <span className="text-[9px] sm:text-[10px] bg-white/5 px-2 py-0.5 rounded-full font-mono text-zinc-400">{roomId}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setVibrate(!vibrate)} 
            className={cn("text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-lg transition-colors", vibrate ? "text-orange-500 bg-orange-500/10" : "text-zinc-600 bg-white/5")}
          >
            {vibrate ? 'TİTREŞİM' : 'SESSİZ'}
          </button>
          <button 
            onClick={() => {
              if (socket) socket.disconnect();
              window.location.href = '/';
            }}
            className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg transition-colors group"
          >
            <X className="w-4 h-4 text-zinc-600 group-hover:text-red-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6 pb-24 scrollbar-hide">
        {/* Power & Top Controls */}
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <RemoteButton icon={Power} variant="danger" className="flex-1 py-4 sm:py-6" action={() => sendCommand('close')} />
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-[10px] sm:text-[12px] font-black text-white tracking-[0.2em] italic">MOON IPTV</div>
            <div className="text-[8px] font-bold text-zinc-600 tracking-widest uppercase">KUMANDA</div>
          </div>
          <RemoteButton icon={Settings} className="flex-1 py-4 sm:py-6" action={() => sendCommand('open-settings')} />
        </div>

        {/* Navigation D-Pad */}
        <div className="flex justify-center py-2 sm:py-4">
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 bg-zinc-900 rounded-full shadow-2xl border border-white/10 p-1 overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              <div />
              <button 
                onPointerDown={handleAction('nav-up')} 
                className="flex items-center justify-center active:bg-white/10 hover:bg-white/5 rounded-t-full transition-colors"
              >
                <ChevronUp className="w-8 h-8 sm:w-12 sm:h-12" />
              </button>
              <div />
              
              <button 
                onPointerDown={handleAction('nav-left')} 
                className="flex items-center justify-center active:bg-white/10 hover:bg-white/5 rounded-l-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8 sm:w-12 sm:h-12" />
              </button>
              <div className="p-2">
                <button 
                  onPointerDown={handleAction('nav-ok')} 
                  className="w-full h-full bg-orange-500 rounded-full shadow-2xl shadow-orange-500/40 flex items-center justify-center text-white font-black text-lg sm:text-2xl active:scale-90 hover:brightness-110 transition-all border-4 border-black/20"
                >
                  OK
                </button>
              </div>
              <button 
                onPointerDown={handleAction('nav-right')} 
                className="flex items-center justify-center active:bg-white/10 hover:bg-white/5 rounded-r-full transition-colors"
              >
                <ChevronRight className="w-8 h-8 sm:w-12 sm:h-12" />
              </button>
              
              <div />
              <button 
                onPointerDown={handleAction('nav-down')} 
                className="flex items-center justify-center active:bg-white/10 hover:bg-white/5 rounded-b-full transition-colors"
              >
                <ChevronDown className="w-8 h-8 sm:w-12 sm:h-12" />
              </button>
              <div />
            </div>
          </div>
        </div>

        {/* Volume & Channel Controls */}
        <div className="flex gap-3 sm:gap-4">
          <div className="flex-1 bg-zinc-900/50 rounded-[32px] p-1 flex flex-col items-center gap-1 border border-white/5 shadow-inner">
            <RemoteButton icon={ChevronUp} variant="ghost" className="w-full py-3" action={() => sendCommand('nav-up')} />
            <span className="text-[8px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-tighter">KANAL</span>
            <RemoteButton icon={ChevronDown} variant="ghost" className="w-full py-3" action={() => sendCommand('nav-down')} />
          </div>
          <div className="flex-1 bg-zinc-900/50 rounded-[32px] p-1 flex flex-col items-center gap-1 border border-white/5 shadow-inner">
            <RemoteButton icon={Volume2} variant="ghost" className="w-full py-3" action={() => sendCommand('volume-up')} />
            <span className="text-[8px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-tighter">SES</span>
            <RemoteButton icon={Volume1} variant="ghost" className="w-full py-3" action={() => sendCommand('volume-down')} />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <RemoteButton icon={SkipBack} className="py-4" action={() => sendCommand('nav-left')} />
          <RemoteButton icon={Play} variant="primary" className="col-span-2 py-4" action={() => sendCommand('nav-ok')} />
          <RemoteButton icon={SkipForward} className="py-4" action={() => sendCommand('nav-right')} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <RemoteButton icon={Home} label="ANA SAYFA" className="py-4" action={() => sendCommand('close')} />
          <RemoteButton icon={Search} label="ARA" className="py-4" action={() => sendCommand('open-search')} />
          <RemoteButton icon={Star} label="FAVORİ" className="py-4" action={() => sendCommand('toggle-favorite')} />
        </div>

        {/* Voice Control */}
        <div className="flex justify-center pt-2">
          <button 
            onPointerDown={handleAction('voice-trigger')}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 active:scale-90 hover:brightness-110 transition-all touch-manipulation group"
          >
            <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="p-4 sm:p-6 text-center bg-black/50 backdrop-blur-md border-t border-white/5">
        <span className="text-[9px] sm:text-[10px] font-black tracking-[0.4em] text-zinc-600 uppercase">MOON IPTV PREMIUM REMOTE</span>
      </div>
    </div>
  );
};

export default MobileRemote;
