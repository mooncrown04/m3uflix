import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface PreviewPlayerProps {
  url: string;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ url }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-cover"
      muted
      autoPlay
      playsInline
    />
  );
};
