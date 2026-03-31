import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface VoiceControlProps {
  onCommand: (command: string, value?: string) => void;
  language?: string;
  apiKey?: string;
}

export const useVoiceControl = ({ onCommand, language = 'tr-TR', apiKey }: VoiceControlProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log('Voice transcript:', transcript);
      
      if (apiKey) {
        await processWithGemini(transcript);
      } else {
        processTranscriptLocally(transcript);
      }
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
  }, [language, apiKey]);

  const processWithGemini = async (transcript: string) => {
    if (!apiKey) return;
    
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Kullanıcının şu sesli komutunu analiz et ve uygun bir JSON komutu döndür: "${transcript}"
        
        Desteklenen komutlar:
        - play-channel (değer: kanal adı)
        - volume-up (değer: yok)
        - volume-down (değer: yok)
        - mute (değer: yok)
        - set-volume (değer: 0-100 arası sayı)
        - open-settings (değer: yok)
        - close (değer: yok)
        - toggle-favorite (değer: yok)
        - search (değer: arama terimi)
        - filter-category (değer: kategori adı - örn: haber, spor, film, dizi)
        - what-is-on (değer: yok - şu an ne var sorusu için)
        
        Örnekler:
        "Şu an ne var?" -> {"command": "what-is-on"}
        "Haber kanallarını aç" -> {"command": "filter-category", "value": "HABER"}
        "Sesi yüzde elli yap" -> {"command": "set-volume", "value": "50"}
        "Show tv aç" -> {"command": "play-channel", "value": "Show TV"}
        "Dün akşamki maçı bul" -> {"command": "search", "value": "maç"}
        
        Sadece JSON döndür.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              command: { type: Type.STRING },
              value: { type: Type.STRING }
            },
            required: ["command"]
          }
        }
      });

      const result = JSON.parse(response.text);
      if (result.command) {
        onCommand(result.command, result.value);
      }
    } catch (e) {
      console.error('Gemini processing error:', e);
      processTranscriptLocally(transcript);
    } finally {
      setIsProcessing(false);
    }
  };

  const processTranscriptLocally = (transcript: string) => {
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

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      window.speechSynthesis.speak(utterance);
    }
  }, [language]);

  return {
    isListening,
    isProcessing,
    startListening,
    stopListening,
    speak,
    error
  };
};
