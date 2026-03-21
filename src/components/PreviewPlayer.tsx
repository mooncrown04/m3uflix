import React, { useEffect, useRef, useMemo, useState } from 'react';
import Hls from 'hls.js';
import { Capacitor } from '@capacitor/core';

interface PreviewPlayerProps {
  urls: string[];
  customProxyUrl?: string;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ urls, customProxyUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useProxy, setUseProxy] = useState(false);
  const url = urls[0] || '';

  const proxiedUrl = useMemo(() => {
    if (Capacitor.isNativePlatform() || !useProxy) {
      return url;
    }
    const proxyBase = customProxyUrl || '/api/proxy?url=';
    return `${proxyBase}${encodeURIComponent(url)}`;
  }, [url, useProxy, customProxyUrl]);

  const handleVideoError = () => {
    if (!useProxy) {
      setUseProxy(true);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        xhrSetup: (xhr, url) => {
          const proxyBase = customProxyUrl || '/api/proxy?url=';
          const isProxied = proxiedUrl.includes('/api/proxy') || (customProxyUrl && proxiedUrl.includes(customProxyUrl));
          const isAlreadyProxied = url.includes('/api/proxy') || (customProxyUrl && url.includes(customProxyUrl));

          if (isProxied && !isAlreadyProxied && url.startsWith('http')) {
            const proxiedSegmentUrl = `${proxyBase}${encodeURIComponent(url)}`;
            xhr.open('GET', proxiedSegmentUrl, true);
          }
        }
      });
      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = proxiedUrl;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [proxiedUrl]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-cover"
      muted
      autoPlay
      playsInline
      onError={handleVideoError}
    />
  );
};
