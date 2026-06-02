import { useState, useEffect, useCallback } from 'react';
import { Playlist, M3UChannel, EPGData } from '../types';
import { parseM3U } from '../utils/m3uParser';
import { fetchAndParseEPG } from '../utils/epgParser';
import { getProxiedUrl } from '../utils/fetchUtils';
import { DEFAULT_M3U_URL } from '../constants';

export function usePlaylists(customProxyUrl?: string) {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('playlists');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse playlists:', e);
    }
    return [];
  });

  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(() => 
    localStorage.getItem('current_playlist_id')
  );

  const [channels, setChannels] = useState<M3UChannel[]>([]);
  const [epgData, setEpgData] = useState<EPGData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    if (currentPlaylistId) {
      localStorage.setItem('current_playlist_id', currentPlaylistId);
    }
  }, [currentPlaylistId]);

  const loadPlaylist = useCallback(async (url: string, epgUrl?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(getProxiedUrl(url, customProxyUrl));
      const text = await response.text();
      const result = parseM3U(text);
      setChannels(result.channels);
      
      if (epgUrl) {
        const epg = await fetchAndParseEPG(epgUrl, customProxyUrl);
        setEpgData(epg);
      }
    } catch (error) {
      console.error('Failed to load playlist:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    playlists,
    setPlaylists,
    currentPlaylistId,
    setCurrentPlaylistId,
    channels,
    setChannels,
    epgData,
    setEpgData,
    isLoading,
    setIsLoading,
    loadPlaylist
  };
}
