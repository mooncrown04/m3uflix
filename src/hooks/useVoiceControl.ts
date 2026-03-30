import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceControlProps {
  onCommand: (command: string, value?: string) => void;
  language?: string;
}

export const useVoiceControl = ({ onCommand, language = 'tr-TR' }: VoiceControlProps) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Sesli komut desteği bu tarayıcıda mevcut değil.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log('Voice transcript:', transcript);
      processTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Hata: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language]);

  const processTranscript = (transcript: string) => {
    // Basic Turkish command processing
    if (transcript.includes('kanal')) {
      const channelName = transcript.replace('kanal', '').trim();
      if (channelName) onCommand('play-channel', channelName);
    } else if (transcript.includes('sesi aç') || transcript.includes('sesi yükselt')) {
      onCommand('volume-up');
    } else if (transcript.includes('sesi kıs') || transcript.includes('sesi azalt')) {
      onCommand('volume-down');
    } else if (transcript.includes('sesi kapat') || transcript.includes('sessize al')) {
      onCommand('mute');
    } else if (transcript.includes('sesi %') || transcript.includes('sesi yüzde')) {
      const match = transcript.match(/(\d+)/);
      if (match) onCommand('set-volume', match[0]);
    } else if (transcript.includes('ayarlar')) {
      onCommand('open-settings');
    } else if (transcript.includes('kapat') || transcript.includes('geri')) {
      onCommand('close');
    } else if (transcript.includes('favorilere ekle') || transcript.includes('favori yap')) {
      onCommand('toggle-favorite');
    } else if (transcript.includes('ara') || transcript.includes('göster')) {
      const query = transcript.replace('ara', '').replace('göster', '').replace('filmlerini', '').replace('dizilerini', '').trim();
      if (query) onCommand('search', query);
    } else {
      // Generic command fallback
      onCommand('unknown', transcript);
    }
  };

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return {
    isListening,
    startListening,
    stopListening,
    error
  };
};
