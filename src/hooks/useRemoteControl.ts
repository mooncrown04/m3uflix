import { useState, useEffect, useRef, useCallback } from 'react';

export function useRemoteControl() {
  const [remoteRoomId] = useState(() => {
    const saved = localStorage.getItem('remote_room_id');
    if (saved) return saved;
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('remote_room_id', newId);
    return newId;
  });

  const [isRemoteConnected, setIsRemoteConnected] = useState(false);
  const [isTvSocketConnected, setIsTvSocketConnected] = useState(false);
  const [remoteControlEnabled, setRemoteControlEnabled] = useState(() => 
    localStorage.getItem('remote_control_enabled') !== 'false'
  );
  const [appUrl, setAppUrl] = useState<string>(() => localStorage.getItem('manual_app_url') || window.location.origin);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('remote_control_enabled', String(remoteControlEnabled));
  }, [remoteControlEnabled]);

  useEffect(() => {
    if (localStorage.getItem('manual_app_url')) return;
    
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.appUrl) {
          setAppUrl(data.appUrl);
        }
      })
      .catch(err => console.error('Failed to fetch app config:', err));
  }, []);

  useEffect(() => {
    if (appUrl !== window.location.origin) {
      localStorage.setItem('manual_app_url', appUrl);
    }
  }, [appUrl]);

  return {
    remoteRoomId,
    isRemoteConnected,
    setIsRemoteConnected,
    isTvSocketConnected,
    setIsTvSocketConnected,
    remoteControlEnabled,
    setRemoteControlEnabled,
    appUrl,
    setAppUrl,
    socketRef
  };
}
