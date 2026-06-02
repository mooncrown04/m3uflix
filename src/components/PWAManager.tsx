import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAManager: React.FC<{ 
  installPrompt: any, 
  setInstallPrompt: (p: any) => void 
}> = ({ installPrompt, setInstallPrompt }) => {
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setInstallPrompt(e);
      
      // Auto show banner after 5 seconds if not shown recently
      const lastShown = localStorage.getItem('pwa_banner_last_shown');
      const now = Date.now();
      
      if (!lastShown || now - parseInt(lastShown) > 1000 * 60 * 60 * 24) { // Show once a day
        const timer = setTimeout(() => setShowInstallBanner(true), 5000);
        return () => clearTimeout(timer);
      }
    };

    const handleAppInstalled = () => {
      console.log('App was installed');
      setInstallPrompt(null);
      setShowInstallBanner(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setInstallPrompt]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setShowInstallBanner(false);
      }
    } catch (err) {
      console.error('PWA install error:', err);
    }
  };

  const closeBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa_banner_last_shown', Date.now().toString());
  };

  return (
    <>
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-[9999] bg-zinc-900 border border-white/10 p-5 rounded-3xl shadow-2xl flex flex-col gap-4 max-w-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <Info className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-black text-sm uppercase">Güncelleme Mevcut</h4>
                <p className="text-zinc-400 text-xs">Uygulamanın yeni bir sürümü hazır.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateServiceWorker(true)}
                className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
              >
                GÜNCELLE
              </button>
              <button
                onClick={() => setNeedRefresh(false)}
                className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs font-black uppercase hover:bg-white/10 transition-colors"
              >
                KAPAT
              </button>
            </div>
          </motion.div>
        )}

        {offlineReady && !needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-[9999] bg-green-500 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Çevrimdışı Hazır
            <button onClick={() => setOfflineReady(false)} className="ml-2 hover:opacity-50">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {showInstallBanner && installPrompt && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-6 right-6 z-[9999] bg-zinc-900 border border-white/10 p-5 rounded-3xl shadow-2xl flex flex-col gap-4 max-w-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-black text-sm uppercase italic">MOON IPTV</h4>
                  <p className="text-zinc-400 text-[10px] leading-tight">Uygulama olarak kurarak daha hızlı bir deneyim yaşayın.</p>
                </div>
              </div>
              <button onClick={closeBanner} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleInstall}
              className="w-full bg-blue-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20"
            >
              ŞİMDİ YÜKLE
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
