import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { 
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  Power, Volume2, VolumeX, Volume1, 
  Play, Pause, SkipBack, SkipForward,
  Home, Settings, Search, Mic,
  Menu, X, List, Star, Keyboard, RefreshCw, Tv, Undo2, LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface MobileRemoteProps {
  roomId: string;
  appUrl: string;
}

const MobileRemote: React.FC<MobileRemoteProps> = ({ roomId, appUrl }) => {
  const [socket, setSocket] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [vibrate, setVibrate] = useState(true);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardText, setKeyboardText] = useState('');
  const [showChannels, setShowChannels] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritePrompt, setShowFavoritePrompt] = useState(false);

  useEffect(() => {
    if (!appUrl || !roomId) return;
    const normalizedAppUrl = appUrl.replace(/\/$/, '');
    console.log('Connecting to socket with roomId:', roomId, 'at', normalizedAppUrl);
    const newSocket = io(normalizedAppUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 60000 // Extended from 20000
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected, joining room:', roomId);
      setConnected(true);
      setConnectionError(null);
      newSocket.emit('join-room', roomId);
      // Request initial state from TV
      newSocket.emit('request-sync');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setConnectionError(err.message || 'Bağlantı hatası oluştu');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('sync-state', (data: any) => {
      console.log('Received sync-state:', data);
      if (data.channels) {
        setChannels(data.channels);
      }
      if (data.currentChannel) {
        setCurrentChannelId(data.currentChannel.id);
      }
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
  const handleAction = useCallback((command: string, value?: any) => (e?: React.PointerEvent | React.MouseEvent | KeyboardEvent) => {
    // Only prevent default on touch to avoid ghost clicks/scrolling, 
    // but let mouse events proceed normally for PC compatibility
    if (e && (e as any).pointerType === 'touch') {
      e.preventDefault();
    }
    
    console.log(`MobileRemote: Action triggered: ${command}`, { 
      type: e?.type, 
      pointerType: e ? (e as any).pointerType : 'keyboard'
    });
    sendCommand(command, value);
  }, [sendCommand]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input (though there are no inputs currently)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowUp':
          handleAction('nav-up')(e);
          break;
        case 'ArrowDown':
          handleAction('nav-down')(e);
          break;
        case 'ArrowLeft':
          handleAction('nav-left')(e);
          break;
        case 'ArrowRight':
          handleAction('nav-right')(e);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault(); // Prevent scrolling with space
          handleAction('nav-ok')(e);
          break;
        case 'Backspace':
        case 'Escape':
          handleAction('close')(e);
          break;
        case 's':
        case 'S':
          handleAction('open-settings')(e);
          break;
        case 'f':
        case 'F':
          handleAction('open-search')(e);
          break;
        case 'v':
        case 'V':
          setVibrate(prev => !prev);
          break;
        case 'r':
        case 'R':
          handleAction('voice-trigger')(e);
          break;
        case 'l':
        case 'L':
          handleAction('toggle-favorite')(e);
          break;
        case 'm':
        case 'M':
          handleAction('toggle-mini-player')(e);
          break;
        case 'g':
        case 'G':
          handleAction('toggle-epg')(e);
          break;
        case 'p':
        case 'P':
          handleAction('preview-player')(e);
          break;
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          handleAction(`digit-${e.key}`)(e);
          break;
        case '+':
        case '=':
          handleAction('volume-up')(e);
          break;
        case '-':
        case '_':
          handleAction('volume-down')(e);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction]);

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
    <div className="fixed inset-0 bg-black text-white flex flex-col select-none overflow-hidden" style={{ touchAction: 'manipulation', height: '100%' }}>
      {/* Main Remote Interface - Hidden when modals are open */}
      <div className={cn(
        "flex flex-col h-full transition-all duration-500",
        (showChannels || showKeyboard) ? "opacity-0 pointer-events-none scale-95 blur-xl" : "opacity-100 pointer-events-auto scale-100 blur-0"
      )}>
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
              onClick={() => sendCommand('back')} 
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
              title="Geri"
            >
              <Undo2 className="w-4 h-4 text-zinc-400 group-active:text-white" />
            </button>
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

          {/* Quick Actions - Moved to top for easier access */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
            <RemoteButton icon={Home} label="ANA" className="py-4" action={() => sendCommand('exit')} />
            <RemoteButton icon={Star} label="FAV" className="py-4" action={() => setShowFavoritePrompt(true)} />
            <RemoteButton icon={Keyboard} label="YAZ" className="py-4" action={() => setShowKeyboard(true)} />
            <RemoteButton icon={List} label="KANAL" className="py-4" action={() => setShowChannels(true)} />
            <RemoteButton icon={X} label="KAPAT" className="py-4" action={() => sendCommand('close')} />
          </div>

          {/* Navigation D-Pad with Side Controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 py-2 sm:py-4">
            {/* Volume Controls (Left) */}
            <div className="flex flex-col gap-4">
              <button 
                onPointerDown={handleAction('volume-up')}
                className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-900 rounded-2xl flex flex-col items-center justify-center border border-white/5 active:scale-90 transition-all shadow-lg"
              >
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                <span className="text-[8px] font-black text-zinc-500 mt-1">+</span>
              </button>
              <div className="text-[8px] font-black text-zinc-600 text-center uppercase tracking-widest">SES</div>
              <button 
                onPointerDown={handleAction('volume-down')}
                className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-900 rounded-2xl flex flex-col items-center justify-center border border-white/5 active:scale-90 transition-all shadow-lg"
              >
                <Volume1 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                <span className="text-[8px] font-black text-zinc-500 mt-1">-</span>
              </button>
            </div>

            {/* D-Pad */}
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
                
                <button 
                  onPointerDown={handleAction('back')} 
                  className="flex flex-col items-center justify-center active:bg-white/10 hover:bg-white/5 rounded-bl-[32px] transition-colors gap-1 group"
                >
                  <Undo2 className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-500 group-active:text-white transition-colors" />
                  <span className="text-[8px] font-black text-zinc-600 group-active:text-white transition-colors">GERİ</span>
                </button>
                <button 
                  onPointerDown={handleAction('nav-down')} 
                  className="flex items-center justify-center active:bg-white/10 hover:bg-white/5 rounded-b-full transition-colors"
                >
                  <ChevronDown className="w-8 h-8 sm:w-12 sm:h-12" />
                </button>
                <button 
                  onPointerDown={handleAction('channel-menu')} 
                  className="flex flex-col items-center justify-center active:bg-white/10 hover:bg-white/5 rounded-br-[32px] transition-colors gap-1 group"
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-500 group-active:text-white transition-colors" />
                  <span className="text-[8px] font-black text-zinc-600 group-active:text-white transition-colors">MENÜ</span>
                </button>
              </div>
            </div>

            {/* Channel Controls (Right) */}
            <div className="flex flex-col gap-4">
              <button 
                onPointerDown={handleAction('channel-up')}
                className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-900 rounded-2xl flex flex-col items-center justify-center border border-white/5 active:scale-90 transition-all shadow-lg"
              >
                <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                <span className="text-[8px] font-black text-zinc-500 mt-1">UP</span>
              </button>
              <div className="text-[8px] font-black text-zinc-600 text-center uppercase tracking-widest">KANAL</div>
              <button 
                onPointerDown={handleAction('channel-down')}
                className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-900 rounded-2xl flex flex-col items-center justify-center border border-white/5 active:scale-90 transition-all shadow-lg"
              >
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                <span className="text-[8px] font-black text-zinc-500 mt-1">DOWN</span>
              </button>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <RemoteButton icon={SkipBack} className="py-4" action={() => sendCommand('nav-left')} />
            <RemoteButton icon={Play} variant="primary" className="col-span-2 py-4" action={() => sendCommand('nav-ok')} />
            <RemoteButton icon={SkipForward} className="py-4" action={() => sendCommand('nav-right')} />
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

      {/* Keyboard Modal */}
      <AnimatePresence>
        {showKeyboard && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-md space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-widest text-white">KLAVYE</h2>
                <button 
                  onClick={() => setShowKeyboard(false)}
                  className="p-2 bg-white/10 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="relative">
                <input 
                  autoFocus
                  type="text"
                  value={keyboardText}
                  onChange={(e) => {
                    setKeyboardText(e.target.value);
                    sendCommand('type-text', e.target.value);
                  }}
                  placeholder="TV'ye metin gönder..."
                  className="w-full bg-zinc-900 border-2 border-orange-500/30 focus:border-orange-500 rounded-2xl p-4 text-white text-lg outline-none transition-all"
                />
                {keyboardText && (
                  <button 
                    onClick={() => {
                      setKeyboardText('');
                      sendCommand('type-text', '');
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-white/10 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    sendCommand('nav-ok');
                    setShowKeyboard(false);
                  }}
                  className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-transform"
                >
                  TAMAM
                </button>
                <button 
                  onClick={() => {
                    setKeyboardText('');
                    sendCommand('type-text', '');
                  }}
                  className="w-full py-4 bg-zinc-800 text-white font-black rounded-2xl active:scale-95 transition-transform"
                >
                  TEMİZLE
                </button>
              </div>
              <p className="text-center text-zinc-500 text-xs font-bold tracking-widest">
                YAZDIĞINIZ METİN ANINDA TV'YE GÖNDERİLİR
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Favorite Prompt Modal */}
      <AnimatePresence>
        {showFavoritePrompt && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <div className="w-full max-w-xs bg-zinc-900 rounded-[32px] border border-white/10 p-6 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Star className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-black tracking-widest text-white">FAVORİYE EKLE</h2>
                <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">KATEGORİ SEÇİN</p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'live', label: 'CANLI TV', color: 'bg-red-500' },
                  { id: 'movie', label: 'FİLM', color: 'bg-blue-500' },
                  { id: 'series', label: 'DİZİ', color: 'bg-purple-500' },
                  { id: 'multi', label: 'MULTİMEDYA', color: 'bg-green-500' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      sendCommand('add-favorite', cat.id);
                      setShowFavoritePrompt(false);
                    }}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-between group transition-all active:scale-95"
                  >
                    <span className="text-sm font-black tracking-widest text-zinc-300 group-hover:text-white">{cat.label}</span>
                    <div className={cn("w-2 h-2 rounded-full", cat.color)} />
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowFavoritePrompt(false)}
                className="w-full py-3 text-zinc-500 font-black text-[10px] tracking-widest uppercase hover:text-white transition-colors"
              >
                İPTAL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channels Modal */}
      <AnimatePresence>
        {showChannels && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="p-4 bg-zinc-900 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                  <List className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-widest text-white">KANALLAR</h2>
                  <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">{channels.length} KANAL SENKRONİZE EDİLDİ</p>
                </div>
              </div>
              <button 
                onClick={() => setShowChannels(false)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Kanal ara..."
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white text-sm outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {channels
                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((channel) => (
                  <button
                    key={channel.id}
                    onPointerDown={(e) => {
                      if (e.pointerType === 'touch') e.preventDefault();
                      sendCommand('select-channel', channel.id);
                      setCurrentChannelId(channel.id);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]",
                      currentChannelId === channel.id 
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                        : "bg-white/5 text-zinc-300 hover:bg-white/10"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-black/20 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {channel.logo ? (
                        <img 
                          src={channel.logo} 
                          alt="" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Tv className="w-5 h-5 opacity-30" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold truncate">{channel.name}</p>
                      <p className="text-[10px] opacity-50 font-medium truncate uppercase tracking-wider">{channel.group}</p>
                    </div>
                    {currentChannelId === channel.id && (
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    )}
                  </button>
                ))}
              
              {channels.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-zinc-700 animate-spin" />
                  </div>
                  <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase">KANALLAR YÜKLENİYOR...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileRemote;
