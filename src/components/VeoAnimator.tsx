import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Play, X, Loader2, Film, AlertCircle, CheckCircle2, Monitor, Smartphone, Wand2, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface VeoAnimatorProps {
  onClose: () => void;
  themeColor: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export const VeoAnimator: React.FC<VeoAnimatorProps> = ({ onClose, themeColor }) => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } else {
          // Fallback for local dev if window.aistudio is missing
          setHasKey(!!process.env.API_KEY);
        }
      } catch (e) {
        console.error('Error checking API key:', e);
        setHasKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      }
    } catch (e) {
      console.error('Error opening key selector:', e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Resim boyutu 5MB\'dan küçük olmalıdır.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateVideo = async () => {
    if (!image) return;
    
    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setStatus('Hazırlanıyor...');

    try {
      // Create a fresh instance for each call to ensure latest API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      setStatus('Video oluşturma isteği gönderiliyor...');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this image with smooth cinematic motion, high quality, 4k',
        image: {
          imageBytes: base64Data,
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio
        }
      });

      setStatus('Video oluşturuluyor (birkaç dakika sürebilir)...');
      
      let pollCount = 0;
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        
        pollCount++;
        const messages = [
          'Hala çalışıyoruz...',
          'Kareler işleniyor...',
          'Sinematik efektler ekleniyor...',
          'Neredeyse bitti...',
          'Yapay zeka hayal ediyor...',
          'Görüntüler canlanıyor...',
          'Son dokunuşlar yapılıyor...'
        ];
        setStatus(messages[pollCount % messages.length]);
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error('Video oluşturuldu ancak indirme linki alınamadı.');

      setStatus('Video indiriliyor...');
      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': process.env.API_KEY || '',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('Requested entity was not found') || response.status === 404) {
          setHasKey(false);
          throw new Error('API anahtarı geçersiz. Lütfen tekrar seçin.');
        }
        throw new Error('Video dosyası indirilemedi.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus('Başarıyla oluşturuldu!');
    } catch (err: any) {
      console.error('Video generation error:', err);
      setError(err.message || 'Video oluşturulurken beklenmedik bir hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (hasKey === false) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <Film className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">AI Video Oluşturucu</h2>
            <p className="text-zinc-400 text-sm">
              Veo video oluşturma modelini kullanmak için bir API anahtarı seçmeniz gerekmektedir.
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-400 text-left">
            Not: Ücretli bir Google Cloud projesinden API anahtarı seçmelisiniz. 
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline ml-1">Faturalandırma dökümanı</a>
          </div>
          <button
            onClick={handleSelectKey}
            style={{ backgroundColor: themeColor }}
            className="w-full py-4 rounded-2xl font-bold text-white hover:brightness-110 transition-all shadow-lg"
          >
            API Anahtarı Seç
          </button>
          <button onClick={onClose} className="text-zinc-500 text-sm hover:text-white transition-colors">
            Vazgeç
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl overflow-y-auto"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-4xl w-full bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto md:h-[80vh]"
      >
        {/* Left Side: Input & Controls */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col space-y-6 overflow-y-auto border-b md:border-b-0 md:border-r border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">AI Animator</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-6 h-6 text-zinc-500" />
            </button>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-400 uppercase tracking-wider">
              1. Resim Yükle
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 transition-all cursor-pointer overflow-hidden group"
            >
              {image ? (
                <>
                  <img src={image} alt="Upload" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-bold text-sm">Değiştir</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                  <Upload className="w-8 h-8 text-zinc-600" />
                  <span className="text-zinc-600 text-sm font-medium">Resim seçmek için tıkla</span>
                </div>
              )}
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-400 uppercase tracking-wider">
              2. Animasyon Komutu (Opsiyonel)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Örn: Gökyüzündeki bulutlar yavaşça hareket etsin, ışık süzülsün..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:border-white/20 focus:outline-none transition-all resize-none h-24 text-sm"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-400 uppercase tracking-wider">
              3. Format Seçimi
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAspectRatio('16:9')}
                className={cn(
                  "flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all",
                  aspectRatio === '16:9' ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10"
                )}
              >
                <Monitor className="w-4 h-4" />
                <span className="text-sm font-bold">16:9 Yatay</span>
              </button>
              <button
                onClick={() => setAspectRatio('9:16')}
                className={cn(
                  "flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all",
                  aspectRatio === '9:16' ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10"
                )}
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-sm font-bold">9:16 Dikey</span>
              </button>
            </div>
          </div>

          <button
            onClick={generateVideo}
            disabled={!image || isGenerating}
            style={{ backgroundColor: !image || isGenerating ? 'rgba(255,255,255,0.05)' : themeColor }}
            className={cn(
              "w-full py-5 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 shadow-xl",
              (!image || isGenerating) ? "cursor-not-allowed text-zinc-600" : "hover:brightness-110 active:scale-[0.98]"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Oluşturuluyor...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Videoyu Oluştur</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Result & Preview */}
        <div className="w-full md:w-1/2 bg-black/40 p-6 sm:p-8 flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center space-y-6 text-center"
              >
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-white/5 rounded-full" />
                  <div 
                    className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: `${themeColor} transparent transparent transparent` }}
                  />
                  <Film className="absolute inset-0 m-auto w-8 h-8 text-white animate-pulse" />
                </div>
                <div className="space-y-2">
                  <p className="text-white font-bold text-lg">{status}</p>
                  <p className="text-zinc-500 text-sm max-w-xs">
                    Veo yapay zekası resminizi canlandırıyor. Bu işlem genellikle 1-2 dakika sürer.
                  </p>
                </div>
              </motion.div>
            ) : videoUrl ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full flex flex-col space-y-6"
              >
                <div className="flex-1 rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 relative group">
                  <video 
                    src={videoUrl} 
                    controls 
                    autoPlay 
                    loop 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a 
                      href={videoUrl} 
                      download="veo-animation.mp4"
                      className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setVideoUrl(null);
                      setImage(null);
                    }}
                    className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border border-white/5"
                  >
                    Yeni Oluştur
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 rounded-2xl bg-white text-black font-bold hover:bg-zinc-200 transition-all"
                  >
                    Kapat
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 text-green-400 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Video başarıyla oluşturuldu!
                </div>
              </motion.div>
            ) : error ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center space-y-4 text-center p-6"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-white font-bold">Hata Oluştu</p>
                  <p className="text-red-400/80 text-sm max-w-xs">{error}</p>
                </div>
                <button
                  onClick={generateVideo}
                  style={{ backgroundColor: themeColor }}
                  className="px-6 py-2 rounded-xl text-white font-bold text-sm"
                >
                  Tekrar Dene
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center space-y-4 text-center text-zinc-600"
              >
                <Film className="w-16 h-16 opacity-20" />
                <p className="text-sm font-medium max-w-[200px]">
                  Resim yükleyin ve videonuzu oluşturun
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
