import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EPGData, M3UChannel, Playlist, SortBy, WatcherRule, WatcherNotification } from '../types';

interface ChannelState {
  channels: M3UChannel[];
  playlists: Playlist[];
  currentPlaylistId: string | null;
  epgData: EPGData | null;
  isLoading: boolean;
  recentlyWatched: M3UChannel[];
  favorites: string[];
  canliChannels: string[];
  diziChannels: string[];
  filmChannels: string[];
  brokenChannelIds: Set<string>;
  searchQuery: string;
  sortBy: SortBy;
  visibleCategories: string[];
  watcherRules: WatcherRule[];
  watcherNotifications: WatcherNotification[];
  epgUrl: string;
  playlistUrl: string;
  extraUrl: string;
  userCount: number;
  customOrders: Record<string, string[]>;
  
  // Actions
  setChannels: (channels: M3UChannel[] | ((prev: M3UChannel[]) => M3UChannel[])) => void;
  setPlaylists: (playlists: Playlist[] | ((prev: Playlist[]) => Playlist[])) => void;
  setCurrentPlaylistId: (id: string | null | ((prev: string | null) => string | null)) => void;
  setEpgData: (data: EPGData | null | ((prev: EPGData | null) => EPGData | null)) => void;
  setIsLoading: (loading: boolean | ((prev: boolean) => boolean)) => void;
  setRecentlyWatched: (recentlyWatched: M3UChannel[] | ((prev: M3UChannel[]) => M3UChannel[])) => void;
  setFavorites: (favorites: string[] | ((prev: string[]) => string[])) => void;
  setCanliChannels: (ids: string[] | ((prev: string[]) => string[])) => void;
  setDiziChannels: (ids: string[] | ((prev: string[]) => string[])) => void;
  setFilmChannels: (ids: string[] | ((prev: string[]) => string[])) => void;
  setEpgUrl: (url: string | ((prev: string) => string)) => void;
  setPlaylistUrl: (url: string | ((prev: string) => string)) => void;
  setExtraUrl: (url: string | ((prev: string) => string)) => void;
  setUserCount: (count: number | ((prev: number) => number)) => void;
  setCustomOrders: (orders: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => void;
  setBrokenChannelIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  toggleFavorite: (channelId: string) => void;
  addToRecentlyWatched: (channel: M3UChannel) => void;
  markAsBroken: (channelId: string) => void;
  clearChannels: () => void;
  setSearchQuery: (query: string | ((prev: string) => string)) => void;
  setSortBy: (sortBy: SortBy | ((prev: SortBy) => SortBy)) => void;
  setVisibleCategories: (categories: string[] | ((prev: string[]) => string[])) => void;
  setWatcherRules: (rules: WatcherRule[] | ((prev: WatcherRule[]) => WatcherRule[])) => void;
  setWatcherNotifications: (notifications: WatcherNotification[] | ((prev: WatcherNotification[]) => WatcherNotification[])) => void;
  addPlaylist: (name: string, url: string) => void;
  deletePlaylist: (id: string) => void;
  refreshPlaylist: (id: string) => void;
  updateEPG: (url: string) => void;
}

export const useChannelStore = create<ChannelState>()(
  persist(
    (set) => ({
      channels: [],
      playlists: [],
      currentPlaylistId: null,
      epgData: null,
      isLoading: false,
      recentlyWatched: [],
      favorites: [],
      canliChannels: [],
      diziChannels: [],
      filmChannels: [],
      brokenChannelIds: new Set<string>(),
      searchQuery: '',
      sortBy: 'default',
      visibleCategories: [],
      watcherRules: [],
      watcherNotifications: [],
      epgUrl: '',
      playlistUrl: '',
      extraUrl: '',
      userCount: 0,
      customOrders: {},

      setChannels: (channels) => set((state) => ({ 
        channels: typeof channels === 'function' ? channels(state.channels) : channels 
      })),
      
      setPlaylists: (playlists) => set((state) => ({ 
        playlists: typeof playlists === 'function' ? playlists(state.playlists) : playlists 
      })),

      setCurrentPlaylistId: (id) => set((state) => ({ currentPlaylistId: typeof id === 'function' ? (id as any)(state.currentPlaylistId) : id })),
      setEpgData: (data) => set((state) => ({ epgData: typeof data === 'function' ? (data as any)(state.epgData) : data })),
      setIsLoading: (loading) => set((state) => ({ isLoading: typeof loading === 'function' ? (loading as any)(state.isLoading) : loading })),

      setRecentlyWatched: (recentlyWatched) => set((state) => ({ 
        recentlyWatched: typeof recentlyWatched === 'function' ? recentlyWatched(state.recentlyWatched) : recentlyWatched 
      })),

      setFavorites: (favorites) => set((state) => ({ 
        favorites: typeof favorites === 'function' ? favorites(state.favorites) : favorites 
      })),

      setCanliChannels: (canliChannels) => set((state) => ({ 
        canliChannels: typeof canliChannels === 'function' ? canliChannels(state.canliChannels) : canliChannels 
      })),
      setDiziChannels: (diziChannels) => set((state) => ({ 
        diziChannels: typeof diziChannels === 'function' ? diziChannels(state.diziChannels) : diziChannels 
      })),
      setFilmChannels: (filmChannels) => set((state) => ({ 
        filmChannels: typeof filmChannels === 'function' ? filmChannels(state.filmChannels) : filmChannels 
      })),

      setEpgUrl: (url) => set((state) => ({ epgUrl: typeof url === 'function' ? (url as any)(state.epgUrl) : url })),
      setPlaylistUrl: (url) => set((state) => ({ playlistUrl: typeof url === 'function' ? (url as any)(state.playlistUrl) : url })),
      setExtraUrl: (url) => set((state) => ({ extraUrl: typeof url === 'function' ? (url as any)(state.extraUrl) : url })),
      setUserCount: (count) => set((state) => ({ userCount: typeof count === 'function' ? (count as any)(state.userCount) : count })),
      setCustomOrders: (customOrders) => set((state) => ({ 
        customOrders: typeof customOrders === 'function' ? customOrders(state.customOrders) : customOrders 
      })),
      setBrokenChannelIds: (brokenChannelIds) => set((state) => ({ 
        brokenChannelIds: typeof brokenChannelIds === 'function' ? brokenChannelIds(state.brokenChannelIds) : brokenChannelIds 
      })),

      toggleFavorite: (channelId) => set((state) => {
        const isFavorite = state.favorites.includes(channelId);
        return {
          favorites: isFavorite 
            ? state.favorites.filter(id => id !== channelId) 
            : [...state.favorites, channelId]
        };
      }),

      addToRecentlyWatched: (channel) => set((state) => {
        const filtered = state.recentlyWatched.filter(ch => ch.id !== channel.id);
        return {
          recentlyWatched: [channel, ...filtered].slice(0, 20)
        };
      }),

      markAsBroken: (channelId) => set((state) => {
        const newBroken = new Set(state.brokenChannelIds);
        newBroken.add(channelId);
        return { brokenChannelIds: newBroken };
      }),

      clearChannels: () => set({ channels: [], playlists: [], recentlyWatched: [], favorites: [], canliChannels: [], diziChannels: [], filmChannels: [] }),
      
      setSearchQuery: (searchQuery) => set((state) => ({ searchQuery: typeof searchQuery === 'function' ? (searchQuery as any)(state.searchQuery) : searchQuery })),
      setSortBy: (sortBy) => set((state) => ({ sortBy: typeof sortBy === 'function' ? (sortBy as any)(state.sortBy) : sortBy })),
      setVisibleCategories: (visibleCategories) => set((state) => ({ 
        visibleCategories: typeof visibleCategories === 'function' ? visibleCategories(state.visibleCategories) : visibleCategories 
      })),
      setWatcherRules: (rules) => set((state) => ({ 
        watcherRules: typeof rules === 'function' ? rules(state.watcherRules) : rules 
      })),
      setWatcherNotifications: (notifications) => set((state) => ({ 
        watcherNotifications: typeof notifications === 'function' ? notifications(state.watcherNotifications) : notifications 
      })),
      addPlaylist: (name, url) => set((state) => {
        const newPlaylist: Playlist = {
          id: Math.random().toString(36).substring(2, 11),
          name: name || 'Yeni Liste',
          url: url,
          channels: [],
          channelCount: 0
        };
        const updatedPlaylists = [...state.playlists, newPlaylist];
        return { playlists: updatedPlaylists };
      }),
      deletePlaylist: (id) => set((state) => ({ 
        playlists: state.playlists.filter(p => p.id !== id),
        currentPlaylistId: state.currentPlaylistId === id ? null : state.currentPlaylistId
      })),
      refreshPlaylist: (id) => set((state) => ({ 
        playlists: state.playlists.map(p => p.id === id ? { ...p, lastUpdated: Date.now() } : p)
      })),
      updateEPG: (url) => set({ epgUrl: url }),
    }),
    {
      name: 'moon-channel-storage',
      //@ts-ignore - Set is not serializable by default in some persist implementations, but we'll handle it if needed
      partialize: (state) => {
        const { channels: _channels, epgData: _epgData, ...rest } = state;
        
        // Strip channels from each playlist
        const playlistsWithoutChannels = state.playlists.map(p => ({
          ...p,
          channels: [],
          channelCount: p.channelCount || (p.channels?.length || 0)
        }));

        // Optimize recentlyWatched to store only essential fields
        const optimizedRecent = state.recentlyWatched.map(ch => ({
          id: ch.id,
          name: ch.name,
          logo: ch.logo,
          group: ch.group,
          urls: [ch.urls[0]] // only keep the first url
        }));
        
        // Limit customOrders to prevent excessive growth
        const optimizedOrders = Object.entries(state.customOrders).reduce((acc, [key, value]) => {
          // Keep only orders for active categories, or limit size
          if (value.length > 500) {
            acc[key] = value.slice(0, 500);
          } else {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string[]>);

        return {
          ...rest,
          playlists: playlistsWithoutChannels,
          recentlyWatched: optimizedRecent,
          customOrders: optimizedOrders,
          brokenChannelIds: Array.from(state.brokenChannelIds),
          watcherNotifications: state.watcherNotifications.slice(-20), // Keep only last 20 notifications
        };
      },
      //@ts-ignore
      onRehydrateStorage: () => (state) => {
        if (state && state.brokenChannelIds) {
          state.brokenChannelIds = new Set(state.brokenChannelIds);
        }
      },
    }
  )
);
