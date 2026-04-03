import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Search, X } from 'lucide-react';

interface VoiceSearchOverlayProps {
  onResult: (text: string) => void;
  onClose: () => void;
  themeColor: string;
}

export const VoiceSearchOverlay: React.FC<VoiceSearchOverlayProps> = ({ onResult, onClose, themeColor }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Sesli arama bu tarayıcıda desteklenmiyor.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'tr-TR';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const current = event.results[event.resultIndex];
      const text = current[0].transcript;
      setTranscript(text);
      if (current.isFinal) {
        onResult(text);
        setTimeout(onClose, 1000);
      }
    };

    recognition.onerror = (event: any) => {
      setError('Ses algılanamadı. Lütfen tekrar deneyin.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onResult, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl"
    >
      <div className="relative flex flex-col items-center max-w-2xl w-full p-12 text-center">
        <button 
          onClick={onClose}
          className="absolute top-0 right-0 p-4 text-white/40 hover:text-white transition-colors"
        >
          <X size={32} />
        </button>

        <motion.div
          animate={{
            scale: isListening ? [1, 1.2, 1] : 1,
            boxShadow: isListening ? [`0 0 0 0px ${themeColor}40`, `0 0 0 40px ${themeColor}00`] : 'none'
          }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-32 h-32 rounded-full flex items-center justify-center mb-8"
          style={{ backgroundColor: themeColor }}
        >
          {isListening ? <Mic size={48} className="text-white" /> : <MicOff size={48} className="text-white" />}
        </motion.div>

        <h2 className="text-4xl font-bold text-white mb-4">
          {isListening ? 'Dinleniyor...' : 'Hazır'}
        </h2>
        
        <p className="text-2xl text-white/60 mb-8 min-h-[3rem]">
          {transcript || 'Kanal ismini söyleyin...'}
        </p>

        {error && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-lg"
          >
            {error}
          </motion.p>
        )}

        <div className="mt-12 flex items-center gap-4 text-white/40">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium uppercase tracking-widest">Canlı Dinleme</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
