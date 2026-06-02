import { useState, useCallback, useRef, useEffect, Dispatch, SetStateAction } from 'react';
import { NavContext, M3UChannel, KeyMap } from '../types';
import { DEFAULT_M3U_URL, MULTI_CATEGORIES } from '../constants';

interface KeyboardNavigationProps {
  channels: M3UChannel[];
  groupedChannels: [string, M3UChannel[]][];
  currentChannel: M3UChannel | null;
  setCurrentChannel: (channel: M3UChannel | null) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean | ((prev: boolean) => boolean)) => void;
  showQuickSettings: boolean;
  setShowQuickSettings: (show: boolean | ((prev: boolean) => boolean)) => void;
  showEPGTimeline: boolean;
  setShowEPGTimeline: (show: boolean | ((prev: boolean) => boolean)) => void;
  isMiniPlayer: boolean;
  setIsMiniPlayer: (is: boolean | ((prev: boolean) => boolean)) => void;
  setIsGlobalPlaying: (is: boolean | ((prev: boolean) => boolean)) => void;
  globalVolume: number;
  updateGlobalVolume: (vol: number | ((prev: number) => number)) => void;
  setIsMuted: (muted: boolean | ((prev: boolean) => boolean)) => void;
  handleChannelSelect: (channel: M3UChannel) => void;
  toggleFavorite: (id: string) => void;
  toggleManualCategory: (id: string, cat: string, sub?: string) => void;
  moveChannel: (id: string, dir: 'left' | 'right', cat: string) => void;
  setRecentlyWatched: (updater: (prev: M3UChannel[]) => M3UChannel[]) => void;
  setTypedNumber: (updater: (prev: string) => string) => void;
  setChannelNumbers: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  setShowNumberInput: (show: boolean) => void;
  setNumberInputChannelId: (id: string | null) => void;
  setChannelMenuId: (id: string | null) => void;
  setChannelMenuCategory: (cat: string | null) => void;
  setChannelForDetail: (channel: M3UChannel | null) => void;
  setShowRemotePairingModal: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowDeviceInfo: (show: boolean | ((prev: boolean) => boolean)) => void;
  showDeviceInfo: boolean;
  themeColor: string;
  setThemeColor: (color: string) => void;
  uiMode: any;
  setUiMode: (mode: any) => void;
  setPlayerEngine: (engine: any) => void;
  setAmbilightMode: (mode: any) => void;
  setSleepTimer: (time: number) => void;
  setSleepTimerActive: (active: boolean) => void;
  mixedColor: string;
  setProfilePic: (pic: string) => void;
  setDeviceType: (type: any) => void;
  setDynamicThemeEnabled: (enabled: boolean) => void;
  setVoiceControlEnabled: (enabled: boolean) => void;
  setTmdbApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setCustomProxyUrl: (url: string) => void;
  setClockStyle: (style: any) => void;
  setTop10Style: (style: any) => void;
  setFocusEffect: (effect: any) => void;
  setLogoStyle: (style: any) => void;
  setPosterOrientation: (orient: any) => void;
  layoutMode: string;
  setLayoutMode: (mode: any) => void;
  multiSessionMenuOpen: boolean;
  setMultiSessionMenuOpen: (open: boolean) => void;
  channelMenuId: string | null;
  channelMenuCategory: string | null;
  numberInputChannelId: string | null;
  channelForDetail: M3UChannel | null;
  primaryHeroButtons: any[];
  filterHeroButtons: any[];
  handleUrlSubmit: (url: string) => void;
  setSavedUrl: (url: string | null) => void;
  setPlaylistUrl: (url: string) => void;
  setCollapsedRows: (updater: (prev: Set<string>) => Set<string>) => void;
  extraUrl: string;
  detailFocus: number;
  setDetailFocus: (focus: number | ((prev: number) => number)) => void;
  allFlattenedChannels: M3UChannel[];
  navContext: NavContext;
  setNavContext: (context: NavContext | ((prev: NavContext) => NavContext)) => void;
  activeRow: number;
  setActiveRow: (row: number | ((prev: number) => number)) => void;
  activeCol: number;
  setActiveCol: (col: number | ((prev: number) => number)) => void;
  settingsArea: 'tabs' | 'sections' | 'content' | 'none';
  setSettingsArea: (area: 'tabs' | 'sections' | 'content' | 'none' | ((prev: any) => any)) => void;
  settingsSection: number;
  setSettingsSection: (section: number | ((prev: number) => number)) => void;
  settingsFocus: number;
  setSettingsFocus: (focus: number | ((prev: number) => number)) => void;
  sidebarFocus: number;
  setSidebarFocus: (focus: number | ((prev: number) => number)) => void;
  channelMenuFocus: number;
  setChannelMenuFocus: (focus: number | ((prev: number) => number)) => void;
  quickSettingsFocus: number;
  setQuickSettingsFocus: (focus: number | ((prev: number) => number)) => void;
  quickSwitchFocus: number;
  setQuickSwitchFocus: (focus: number | ((prev: number) => number)) => void;
  showQuickSwitch: boolean;
  setShowQuickSwitch: (show: boolean | ((prev: boolean) => boolean)) => void;
  recentlyWatched: M3UChannel[];
  searchQuery: string;
  isAISearching: boolean;
  handleAISearch: (query: string) => Promise<void>;
  activeSettingsTab: number;
  setActiveSettingsTab: Dispatch<SetStateAction<number>>;
  expandedSections: Record<string, boolean>;
  setExpandedSections: Dispatch<SetStateAction<Record<string, boolean>>>;
  showSportsDashboard: boolean;
  setShowSportsDashboard: (show: boolean) => void;
  keyMap: KeyMap;
}

export function useKeyboardNavigation(props: KeyboardNavigationProps) {
  const {
    channels, groupedChannels, currentChannel, setCurrentChannel,
    showSettings, setShowSettings, showQuickSettings, setShowQuickSettings,
    showEPGTimeline, setShowEPGTimeline, isMiniPlayer, setIsMiniPlayer,
    setIsGlobalPlaying, globalVolume, updateGlobalVolume, setIsMuted,
    handleChannelSelect, toggleFavorite, toggleManualCategory, moveChannel,
    setRecentlyWatched, setTypedNumber, setChannelNumbers, setShowNumberInput,
    setNumberInputChannelId, setChannelMenuId, setChannelMenuCategory,
    setChannelForDetail, setShowRemotePairingModal, setShowDeviceInfo,
    showDeviceInfo, themeColor, setThemeColor, uiMode, setUiMode, setPlayerEngine,
    setAmbilightMode, setSleepTimer, setSleepTimerActive, mixedColor,
    setProfilePic, setDeviceType, setDynamicThemeEnabled, setVoiceControlEnabled,
    setTmdbApiKey, setGeminiApiKey, setCustomProxyUrl, setClockStyle,
    setTop10Style, setFocusEffect, setLogoStyle, setPosterOrientation,
    layoutMode, setLayoutMode,
    multiSessionMenuOpen, setMultiSessionMenuOpen, channelMenuId,
    channelMenuCategory, numberInputChannelId, channelForDetail,
    primaryHeroButtons, filterHeroButtons, handleUrlSubmit, setSavedUrl,
    setPlaylistUrl, setCollapsedRows, extraUrl, detailFocus, setDetailFocus,
    allFlattenedChannels,
    navContext, setNavContext, activeRow, setActiveRow, activeCol, setActiveCol,
    settingsArea, setSettingsArea, settingsSection, setSettingsSection,
    settingsFocus, setSettingsFocus, sidebarFocus, setSidebarFocus,
    channelMenuFocus, setChannelMenuFocus, quickSettingsFocus, setQuickSettingsFocus,
    quickSwitchFocus, setQuickSwitchFocus, showQuickSwitch, setShowQuickSwitch,
    showSportsDashboard, setShowSportsDashboard,
    recentlyWatched, searchQuery,
    isAISearching, handleAISearch,
    activeSettingsTab, setActiveSettingsTab, expandedSections, setExpandedSections,
    keyMap
  } = props;

  const toggleSection = (tabIndex: number, sectionIndex: number) => {
    const sKey = `${tabIndex}-${sectionIndex}`;
    setExpandedSections(prev => ({
      ...prev,
      [sKey]: !prev[sKey]
    }));
  };

  const isKeyHeld = useRef(false);
  const keyHoldTimer = useRef<any>(null);
  const keyPressNavContext = useRef<NavContext | null>(null);

  // Clamp activeRow and activeCol when state changes to prevent focus loss
  useEffect(() => {
    if (navContext !== 'browse') return;

    // Clamp activeRow
    const maxRow = groupedChannels.length - 1;
    if (activeRow > maxRow) {
      setActiveRow(Math.max(-1, maxRow));
    }

    // Clamp activeCol
    if (activeRow >= 0) {
      const rowChannels = groupedChannels[activeRow]?.[1];
      if (rowChannels && activeCol >= rowChannels.length) {
        setActiveCol(Math.max(0, rowChannels.length - 1));
      }
    } else if (activeRow === -1) {
      const otherFilters = filterHeroButtons.filter(b => b.id !== 'search' && b.id !== 'voice' && b.id !== 'remote-toggle' && b.id !== 'device-info');
      if (activeCol >= otherFilters.length && otherFilters.length > 0) {
        setActiveCol(otherFilters.length - 1);
      }
    } else if (activeRow === -2) {
      const searchRowButtons = filterHeroButtons.filter(b => b.id === 'search' || b.id === 'voice' || b.id === 'remote-toggle' || b.id === 'device-info');
      if (activeCol >= searchRowButtons.length && searchRowButtons.length > 0) {
        setActiveCol(searchRowButtons.length - 1);
      }
    } else if (activeRow === -3) {
      if (activeCol >= primaryHeroButtons.length && primaryHeroButtons.length > 0) {
        setActiveCol(primaryHeroButtons.length - 1);
      }
    } else if (activeRow === -4) {
      if (activeCol !== 0) setActiveCol(0);
    }
  }, [activeRow, groupedChannels, filterHeroButtons, primaryHeroButtons, activeCol, setActiveCol, setActiveRow, navContext]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    let rawKey = e.key;
    if (rawKey === 'Select' || rawKey === 'OK') rawKey = 'Enter';

    // Map raw key to logical key
    let key = rawKey;
    if (rawKey === keyMap.up) key = 'ArrowUp';
    else if (rawKey === keyMap.down) key = 'ArrowDown';
    else if (rawKey === keyMap.left) key = 'ArrowLeft';
    else if (rawKey === keyMap.right) key = 'ArrowRight';
    else if (rawKey === keyMap.enter) key = 'Enter';
    else if (rawKey === keyMap.back || rawKey === 'Escape' || rawKey === 'Backspace') key = 'Backspace';
    else if (rawKey === keyMap.settings) key = 's';
    else if (rawKey === keyMap.guide) key = 'g';
    else if (rawKey === keyMap.voice) key = 'v';
    else if (rawKey === keyMap.miniPlayer) key = 'm';
    else if (rawKey === keyMap.playPause) key = 'o';
    else if (rawKey === keyMap.volumeUp) key = 'VolumeUp';
    else if (rawKey === keyMap.volumeDown) key = 'VolumeDown';
    else if (rawKey === keyMap.channelUp) key = 'ChannelUp';
    else if (rawKey === keyMap.channelDown) key = 'ChannelDown';
    
    // Handle number keys for quick channel access
    const isNumber = /^\d$/.test(key);
    if (isNumber && (navContext === 'browse' || navContext === 'player')) {
      setTypedNumber(prev => (prev + key).slice(-4));
      return;
    }

    // Toggle Mini Player with 'M' key
    if (key.toLowerCase() === 'm' && currentChannel && navContext !== 'player') {
      e.preventDefault();
      setIsMiniPlayer(!isMiniPlayer);
      if (isMiniPlayer) setCurrentChannel(null);
      return;
    }

    // Toggle Mini Player with 'P' key on focused channel
    if (key.toLowerCase() === 'p' && navContext === 'browse' && activeRow >= 0 && activeCol >= 0) {
      e.preventDefault();
      e.stopPropagation();
      const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
      if (selectedChannel) {
        if (isMiniPlayer && currentChannel?.id === selectedChannel.id) {
          setIsMiniPlayer(false);
          setCurrentChannel(null);
        } else {
          setCurrentChannel(selectedChannel);
          setIsMiniPlayer(true);
        }
        return;
      }
    }

    // Toggle Advanced EPG with 'E' key
    if (key.toLowerCase() === 'e' && (navContext === 'browse' || navContext === 'player')) {
      e.preventDefault();
      setNavContext('advanced-epg');
      return;
    }

    // Toggle Voice Search with 'V' key
    if (key.toLowerCase() === 'v' && (navContext === 'browse' || navContext === 'player')) {
      e.preventDefault();
      setNavContext('voice-search');
      return;
    }

    // Toggle Play/Pause with 'O' key
    if (key.toLowerCase() === 'o' && currentChannel) {
      e.preventDefault();
      setIsGlobalPlaying(prev => !prev);
      return;
    }

    // Toggle Quick Settings with 'S' key
    if (key.toLowerCase() === 's' && (navContext === 'player' || navContext === 'browse' || navContext === 'quick-settings')) {
      e.preventDefault();
      if (navContext === 'quick-settings') {
        setShowQuickSettings(false);
        setNavContext(currentChannel ? 'player' : 'browse');
      } else {
        setShowQuickSettings(true);
        setQuickSettingsFocus(0);
        setNavContext('quick-settings');
      }
      return;
    }

    if (navContext === 'quick-settings') {
      switch (key) {
        case 'ArrowUp':
          e.preventDefault();
          if (quickSettingsFocus >= 2 && quickSettingsFocus <= 5) setQuickSettingsFocus(0);
          else if (quickSettingsFocus >= 6) setQuickSettingsFocus(2);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (quickSettingsFocus < 2) setQuickSettingsFocus(2);
          else if (quickSettingsFocus >= 2 && quickSettingsFocus <= 5) setQuickSettingsFocus(6);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (quickSettingsFocus === 1) setQuickSettingsFocus(0);
          else if (quickSettingsFocus >= 2 && quickSettingsFocus <= 5) setQuickSettingsFocus(prev => Math.max(2, prev - 1));
          else if (quickSettingsFocus >= 6 && quickSettingsFocus <= 8) setQuickSettingsFocus(prev => Math.max(6, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (quickSettingsFocus === 0) setQuickSettingsFocus(1);
          else if (quickSettingsFocus >= 2 && quickSettingsFocus <= 5) setQuickSettingsFocus(prev => Math.min(5, prev + 1));
          else if (quickSettingsFocus >= 6 && quickSettingsFocus <= 8) setQuickSettingsFocus(prev => Math.min(8, prev + 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (quickSettingsFocus < 2) {
            const engines = ['hls', 'shaka'];
            setPlayerEngine(engines[quickSettingsFocus] as any);
          } else if (quickSettingsFocus < 6) {
            const modes = ['none', 'soft', 'vibrant', 'cinema'];
            setAmbilightMode(modes[quickSettingsFocus - 2] as any);
          } else {
            const times = [15, 30, 60];
            setSleepTimer(times[quickSettingsFocus - 6]);
            setSleepTimerActive(true);
          }
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          setShowQuickSettings(false);
          setNavContext(currentChannel ? 'player' : 'browse');
          break;
      }
      return;
    }

    // Handle Volume and Channel keys globally
    if (e.key === 'VolumeUp') {
      e.preventDefault();
      updateGlobalVolume(Math.min(1, globalVolume + 0.05));
      setIsMuted(false);
      return;
    }
    if (e.key === 'VolumeDown') {
      e.preventDefault();
      updateGlobalVolume(Math.max(0, globalVolume - 0.05));
      return;
    }
    if (e.key === 'ChannelUp') {
      if (currentChannel) {
        e.preventDefault();
        const currentIndex = channels.findIndex(c => c.id === currentChannel.id);
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % channels.length;
          handleChannelSelect(channels[nextIndex]);
        }
        return;
      }
    }
    if (e.key === 'ChannelDown') {
      if (currentChannel) {
        e.preventDefault();
        const currentIndex = channels.findIndex(c => c.id === currentChannel.id);
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex - 1 + channels.length) % channels.length;
          handleChannelSelect(channels[nextIndex]);
        }
        return;
      }
    }

    // Normalize TV remote keys
    if (key === 'Back' || key === 'GoBack' || key === 'XF86Back' || key === 'MediaStop') key = 'Backspace';
    if (key === 'Up') key = 'ArrowUp';
    if (key === 'Down') key = 'ArrowDown';
    if (key === 'Left') key = 'ArrowLeft';
    if (key === 'Right') key = 'ArrowRight';
    if (key === 'Tab') {
      e.preventDefault();
      key = e.shiftKey ? 'ArrowLeft' : 'ArrowRight';
    }
    if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause') key = 'Enter';

    if (navContext === 'sports-dashboard') {
      if (key === 'Escape' || key === 'Backspace') {
        e.preventDefault();
        setShowSportsDashboard(false);
        setNavContext('browse');
      }
      return;
    }

    if (navContext === 'quick-switch') {
      const filteredRecent = recentlyWatched.filter(ch => ch.id !== currentChannel?.id).slice(0, 5);
      const recentCount = filteredRecent.length;
      if (recentCount === 0) {
        setShowQuickSwitch(false);
        setNavContext('player');
        return;
      }
      switch (key) {
        case 'ArrowUp':
          e.preventDefault();
          setQuickSwitchFocus(prev => (prev - 1 + recentCount) % recentCount);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setQuickSwitchFocus(prev => (prev + 1) % recentCount);
          break;
        case 'Enter':
          e.preventDefault();
          const channel = filteredRecent[quickSwitchFocus];
          if (channel) {
            handleChannelSelect(channel);
            setShowQuickSwitch(false);
            setNavContext('player');
          }
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          setShowQuickSwitch(false);
          setNavContext('player');
          break;
      }
      return;
    }

    if (navContext === 'player') {
      if (key === 'Backspace' || key === 'Escape') {
        const filteredRecent = recentlyWatched.filter(ch => ch.id !== currentChannel?.id);
        if (filteredRecent.length > 0) {
          e.preventDefault();
          setShowQuickSwitch(true);
          setQuickSwitchFocus(0);
          setNavContext('quick-switch');
          return;
        }
      }
      return;
    }

    // Toggle EPG Timeline with 'G' key
    if (key.toLowerCase() === 'g') {
      e.preventDefault();
      const newState = !showEPGTimeline;
      setShowEPGTimeline(newState);
      if (newState) {
        setNavContext('epg-timeline');
      } else {
        setNavContext(currentChannel ? 'player' : 'browse');
      }
      return;
    }

    // Detect long press for Enter/OK
    if (key === 'Enter' && !isKeyHeld.current) {
      isKeyHeld.current = true;
      keyPressNavContext.current = navContext;
      keyHoldTimer.current = setTimeout(() => {
        if (navContext === 'browse' && activeRow !== -1) {
          const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
          if (selectedChannel) {
            // Trigger PiP on long press OK
            if (isMiniPlayer && currentChannel?.id === selectedChannel.id) {
              setIsMiniPlayer(false);
              setCurrentChannel(null);
            } else {
              setCurrentChannel(selectedChannel);
              setIsMiniPlayer(true);
              setIsGlobalPlaying(true);
            }
          }
        }
        keyHoldTimer.current = null;
      }, 800);
    }

    // Global Back/Escape
    if (key === 'Escape' || key === 'Backspace') {
      // Prevent default backspace behavior in inputs unless they are focused
      if (key === 'Backspace' && (document.activeElement?.tagName === 'INPUT')) {
        return;
      }

      if (showDeviceInfo) {
        e.preventDefault();
        setShowDeviceInfo(false);
        return;
      }

      if (isMiniPlayer) {
        setIsMiniPlayer(false);
        setCurrentChannel(null);
        return;
      }

      if (currentChannel) {
        setCurrentChannel(null);
        setNavContext('browse');
        return;
      }

      if (showSettings) {
        setShowSettings(false);
        setNavContext('browse');
        setActiveRow(0);
        setActiveCol(0);
        return;
      }
      if (navContext === 'browse' && activeRow !== -1) {
        setActiveRow(-1);
        return;
      }
    }

    if (navContext === 'browse' && channels.length === 0) {
      switch (key) {
        case 'ArrowDown':
          e.preventDefault();
          if (activeRow === 1) setActiveRow(3);
          else setActiveRow(prev => Math.min(4, prev + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (activeRow === 3) setActiveRow(1);
          else setActiveRow(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          if (activeRow === 1) {
            e.preventDefault();
            setActiveCol(1);
          }
          break;
        case 'ArrowLeft':
          if (activeRow === 1) {
            e.preventDefault();
            setActiveCol(0);
          }
          break;
      }
      return;
    }

    if (navContext === 'channel-menu') {
      const options = multiSessionMenuOpen 
        ? [...MULTI_CATEGORIES, 'cancel']
        : ['favorite', 'number', 'canli', 'film', 'dizi', 'multi', 'move-left', 'move-right', 'close'];
      
      switch (key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setChannelMenuFocus(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setChannelMenuFocus(prev => Math.min(options.length - 1, prev + 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (multiSessionMenuOpen) {
            const option = options[channelMenuFocus];
            if (option === 'cancel') {
              setMultiSessionMenuOpen(false);
              setChannelMenuFocus(0);
            } else {
              toggleManualCategory(channelMenuId!, 'multi', option as string);
              setMultiSessionMenuOpen(false);
              setChannelMenuId(null);
              setNavContext('browse');
            }
            return;
          }
          
          const option = options[channelMenuFocus];
          if (option === 'close') {
            setChannelMenuId(null);
            setNavContext('browse');
            return;
          }
          if (option === 'number') {
            setNumberInputChannelId(channelMenuId);
            setShowNumberInput(true);
            setNavContext('number-input');
            return;
          }
          if (option === 'favorite') {
            toggleFavorite(channelMenuId!);
          } else if (option === 'move-left') {
            moveChannel(channelMenuId!, 'left', channelMenuCategory || '');
          } else if (option === 'move-right') {
            moveChannel(channelMenuId!, 'right', channelMenuCategory || '');
          } else if (option === 'multi') {
            setMultiSessionMenuOpen(true);
            setChannelMenuFocus(0);
            return;
          } else {
            toggleManualCategory(channelMenuId!, option as any);
          }
          
          if (option !== 'move-left' && option !== 'move-right') {
            setChannelMenuId(null);
            setNavContext('browse');
          }
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (multiSessionMenuOpen) {
            setMultiSessionMenuOpen(false);
            setChannelMenuFocus(0);
          } else {
            setChannelMenuId(null);
            setNavContext('browse');
          }
          break;
      }
      return;
    }

    if (navContext === 'number-input') {
      if (key === 'Enter') {
        e.preventDefault();
        const input = document.getElementById('channel-number-input') as HTMLInputElement;
        if (input && numberInputChannelId) {
          setChannelNumbers(prev => ({ ...prev, [numberInputChannelId]: input.value }));
          setShowNumberInput(false);
          setNumberInputChannelId(null);
          setChannelMenuId(null);
          setNavContext('browse');
        }
      } else if (key === 'Escape' || key === 'Backspace') {
        e.preventDefault();
        setShowNumberInput(false);
        setNumberInputChannelId(null);
        setNavContext('channel-menu');
      }
      return;
    }

    if (navContext === 'actor-detail') {
      switch (key) {
        case 'ArrowUp':
          e.preventDefault();
          if (detailFocus >= 102) setDetailFocus(101);
          else setDetailFocus(100);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (detailFocus < 102) setDetailFocus(102);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (detailFocus === 101) setDetailFocus(100);
          else if (detailFocus >= 102) setDetailFocus(prev => Math.max(102, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (detailFocus === 100) setDetailFocus(101);
          else if (detailFocus >= 102) setDetailFocus(prev => Math.min(110, prev + 1));
          break;
        case 'Enter':
          e.preventDefault();
          const focusedActor = document.querySelector('.actor-focused') as HTMLElement;
          if (focusedActor) focusedActor.click();
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          const closeBtn = document.querySelector('.actor-focused') as HTMLElement;
          if (closeBtn && detailFocus === 100) {
             closeBtn.click();
          } else {
             // Fallback
             setNavContext('channel-detail');
             setDetailFocus(6);
          }
          break;
      }
      return;
    }

    if (navContext === 'channel-detail') {
      switch (key) {
        case 'ArrowUp':
          e.preventDefault();
          if (detailFocus >= 16) {
            setDetailFocus(6); // Go to cast
          } else if (detailFocus >= 6) {
            setDetailFocus(0); // Go to action buttons
          } else {
            if (channelForDetail && allFlattenedChannels.length > 0) {
              const currentIndex = allFlattenedChannels.findIndex(ch => ch.id === channelForDetail.id);
              if (currentIndex !== -1) {
                const prevIndex = (currentIndex - 1 + allFlattenedChannels.length) % allFlattenedChannels.length;
                setChannelForDetail(allFlattenedChannels[prevIndex]);
                setDetailFocus(0);
              }
            }
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (detailFocus < 6) {
            setDetailFocus(6); // Go to cast
          } else if (detailFocus < 16) {
            setDetailFocus(16); // Go to similar content
          } else {
            if (channelForDetail && allFlattenedChannels.length > 0) {
              const currentIndex = allFlattenedChannels.findIndex(ch => ch.id === channelForDetail.id);
              if (currentIndex !== -1) {
                const nextIndex = (currentIndex + 1) % allFlattenedChannels.length;
                setChannelForDetail(allFlattenedChannels[nextIndex]);
                setDetailFocus(0);
              }
            }
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (detailFocus >= 16) {
            setDetailFocus(prev => Math.max(16, prev - 1));
          } else if (detailFocus >= 6) {
            setDetailFocus(prev => Math.max(6, prev - 1));
          } else {
            setDetailFocus(prev => Math.max(0, prev - 1));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (detailFocus >= 16) {
            setDetailFocus(prev => Math.min(21, prev + 1));
          } else if (detailFocus >= 6) {
            setDetailFocus(prev => Math.min(15, prev + 1));
          } else {
            setDetailFocus(prev => Math.min(5, prev + 1));
          }
          break;
        case 'Enter':
          e.preventDefault();
          const focusedDetail = document.querySelector('.detail-focused') as HTMLElement;
          if (focusedDetail) {
            focusedDetail.click();
          }
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          setChannelForDetail(null);
          setNavContext('browse');
          break;
      }
      return;
    }

    if (navContext === 'remote-pairing') {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        setShowRemotePairingModal(false);
        setNavContext('browse');
      }
      return;
    }

    if (navContext === 'settings') {
      switch (key) {
        case 'Enter':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            if (sidebarFocus <= 4) {
              // Select the tab if not already active
              if (activeSettingsTab !== sidebarFocus) {
                setActiveSettingsTab(sidebarFocus);
              }
              // Move to sections
              setSettingsArea('sections');
              setSettingsSection(0);
              const sKey = `${sidebarFocus}-0`;
              if (!expandedSections[sKey]) {
                setExpandedSections(prev => ({ ...prev, [sKey]: true }));
              }
            } else if (sidebarFocus === 5) {
              // Close button
              setShowSettings(false);
              setNavContext('browse');
              setActiveRow(0);
              setActiveCol(0);
            }
          } else if (settingsArea === 'sections') {
            toggleSection(activeSettingsTab, settingsSection);
          } else if (settingsArea === 'content') {
            const focusedElement = document.querySelector('.settings-focused') as HTMLElement;
            if (focusedElement) {
              focusedElement.click();
              if (focusedElement.tagName === 'INPUT') {
                focusedElement.focus();
              }
            }
          }
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (settingsArea === 'content') {
            setSettingsArea('sections');
          } else if (settingsArea === 'sections') {
            setSettingsArea('tabs');
            setSidebarFocus(activeSettingsTab);
          } else {
            setShowSettings(false);
            setNavContext('browse');
            setActiveRow(0);
            setActiveCol(0);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            if (window.innerWidth < 768) {
              // Horizontal tabs on mobile
              const nextFocus = (sidebarFocus + 1) % 6;
              setSidebarFocus(nextFocus);
              if (nextFocus < 5) setActiveSettingsTab(nextFocus);
            } else {
              // Vertical tabs on desktop - move to sections
              if (sidebarFocus < 5) {
                setSettingsArea('sections');
                setSettingsSection(0);
              }
            }
          } else if (settingsArea === 'sections') {
            const sKey = `${activeSettingsTab}-${settingsSection}`;
            if (!expandedSections[sKey]) {
              toggleSection(activeSettingsTab, settingsSection);
            } else {
              setSettingsArea('content');
              // Reset focus to start of section
              if (activeSettingsTab === 0) {
                if (settingsSection === 0) setSettingsFocus(0);
                else if (settingsSection === 1) setSettingsFocus(20);
                else if (settingsSection === 2) setSettingsFocus(150);
                else if (settingsSection === 3) setSettingsFocus(15);
                else if (settingsSection === 4) setSettingsFocus(40);
                else if (settingsSection === 5) setSettingsFocus(50);
                else if (settingsSection === 6) setSettingsFocus(60);
                else if (settingsSection === 7) setSettingsFocus(70);
                else if (settingsSection === 8) setSettingsFocus(80);
                else if (settingsSection === 9) setSettingsFocus(90);
                else if (settingsSection === 10) setSettingsFocus(100);
              } else if (activeSettingsTab === 1) {
                if (settingsSection === 0) setSettingsFocus(0);
                else if (settingsSection === 1) setSettingsFocus(1);
                else if (settingsSection === 2) setSettingsFocus(4);
                else if (settingsSection === 3) setSettingsFocus(6);
                else if (settingsSection === 4) setSettingsFocus(8);
                else if (settingsSection === 5) setSettingsFocus(20);
                else if (settingsSection === 6) setSettingsFocus(14);
              } else if (activeSettingsTab === 2) {
                if (settingsSection === 0) setSettingsFocus(0);
                else if (settingsSection === 1) setSettingsFocus(1);
                else if (settingsSection === 2) setSettingsFocus(2);
                else if (settingsSection === 3) setSettingsFocus(3);
                else if (settingsSection === 4) setSettingsFocus(11);
                else if (settingsSection === 5) setSettingsFocus(15);
                else if (settingsSection === 6) setSettingsFocus(16);
              } else if (activeSettingsTab === 3) {
                setSettingsFocus(100);
              }
            }
          } else if (settingsArea === 'content') {
            // Content specific horizontal navigation
            if (activeSettingsTab === 0) {
              if (settingsSection === 0) {
                if (settingsFocus < 12) setSettingsFocus(prev => prev + 1);
                else if (settingsFocus === 13) setSettingsFocus(14);
              }
              else if (settingsSection === 1 && settingsFocus < 23) setSettingsFocus(prev => prev + 1);
              else if (settingsSection === 2 && settingsFocus === 150) setSettingsFocus(151);
              else if (settingsSection === 3 && settingsFocus === 15) setSettingsFocus(16);
              else if (settingsSection === 4 && settingsFocus < 50) setSettingsFocus(prev => prev + 1);
              else if (settingsSection === 5 && settingsFocus < 54) setSettingsFocus(prev => prev + 1);
              else if (settingsSection === 6 && settingsFocus < 65) setSettingsFocus(prev => prev + 1);
              else if (settingsSection === 7 && settingsFocus < 74) setSettingsFocus(prev => prev + 1);
              else if (settingsSection === 10 && settingsFocus < 115) setSettingsFocus(prev => prev + 1);
            } else if (activeSettingsTab === 1) {
              if (settingsSection === 1 && settingsFocus === 1) setSettingsFocus(2);
              else if (settingsSection === 2 && settingsFocus === 4) setSettingsFocus(5);
              else if (settingsSection === 3 && settingsFocus === 6) setSettingsFocus(7);
              else if (settingsSection === 4 && settingsFocus < 13) setSettingsFocus(prev => prev + 1);
              else if (settingsSection === 5) {
                if (settingsFocus === 20) setSettingsFocus(21);
                else if (settingsFocus >= 30 && settingsFocus % 2 === 0) setSettingsFocus(prev => prev + 1);
              }
              else if (settingsSection === 6 && settingsFocus === 14) setSettingsFocus(15);
            } else if (activeSettingsTab === 2) {
              if (settingsSection === 3 && settingsFocus < 10) setSettingsFocus(prev => prev + 1);
              else if (settingsSection === 4 && settingsFocus < 14) setSettingsFocus(prev => prev + 1);
              else if (settingsSection === 6 && settingsFocus === 16) setSettingsFocus(17);
            } else if (activeSettingsTab === 3) {
              if (settingsFocus === 100) setSettingsFocus(102);
              else if (settingsFocus >= 200 && settingsFocus < 214) setSettingsFocus(prev => prev + 1);
            }
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (settingsArea === 'content') {
            if (activeSettingsTab === 3 && settingsFocus > 200) {
              setSettingsFocus(prev => prev - 1);
            } else {
              setSettingsArea('sections');
            }
          } else if (settingsArea === 'sections') {
            setSettingsArea('tabs');
            setSidebarFocus(activeSettingsTab);
          } else if (settingsArea === 'tabs') {
            if (window.innerWidth < 768) {
              // Horizontal tabs on mobile
              const nextFocus = (sidebarFocus - 1 + 5) % 5;
              setSidebarFocus(nextFocus);
              if (nextFocus < 4) setActiveSettingsTab(nextFocus);
            }
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            if (window.innerWidth < 768) {
              // On mobile, ArrowDown moves to sections
              setSettingsArea('sections');
              setSettingsSection(0);
            } else {
              // On desktop, ArrowDown moves to next tab or close button
              const nextFocus = (sidebarFocus + 1) % 6;
              setSidebarFocus(nextFocus);
              if (nextFocus < 5) setActiveSettingsTab(nextFocus);
            }
          } else if (settingsArea === 'sections') {
            const maxSections = activeSettingsTab === 0 ? 10 : activeSettingsTab === 1 ? 6 : activeSettingsTab === 2 ? 6 : 0;
            if (settingsSection === maxSections) {
              // Wrap back to tabs or stay at bottom? Let's stay at bottom or wrap to tabs.
              setSettingsArea('tabs');
              setSidebarFocus(0);
            } else {
              setSettingsSection(prev => prev + 1);
            }
          } else if (settingsArea === 'content') {
            if (activeSettingsTab === 0) {
              if (settingsSection === 0) {
                if (settingsFocus <= 8) setSettingsFocus(prev => prev + 4);
                else if (settingsFocus < 12) setSettingsFocus(12);
                else if (settingsFocus === 12) setSettingsFocus(13);
                else if (settingsFocus === 13) setSettingsFocus(14);
                else { setSettingsSection(1); setSettingsFocus(20); }
              } else if (settingsSection === 1) {
                if (settingsFocus <= 20) setSettingsFocus(prev => prev + 3);
                else if (settingsFocus < 23) setSettingsFocus(23);
                else { setSettingsSection(2); setSettingsFocus(150); }
              } else if (settingsSection === 2) {
                if (settingsFocus === 150) setSettingsFocus(151);
                else { setSettingsSection(3); setSettingsFocus(15); }
              } else if (settingsSection === 3) {
                if (settingsFocus === 15) setSettingsFocus(16);
                else { setSettingsSection(4); setSettingsFocus(40); }
              } else if (settingsSection === 4) {
                if (settingsFocus <= 45) setSettingsFocus(prev => prev + 4);
                else { setSettingsSection(5); setSettingsFocus(50); }
              } else if (settingsSection === 5) {
                if (settingsFocus <= 51) setSettingsFocus(prev => prev + 2);
                else { setSettingsSection(6); setSettingsFocus(60); }
              } else if (settingsSection === 6) {
                if (settingsFocus <= 61) setSettingsFocus(prev => prev + 3);
                else { setSettingsSection(7); setSettingsFocus(70); }
              } else if (settingsSection === 7) {
                if (settingsFocus <= 71) setSettingsFocus(prev => prev + 2);
                else { setSettingsSection(8); setSettingsFocus(80); }
              } else if (settingsSection === 8) {
                setSettingsSection(9); setSettingsFocus(90);
              } else if (settingsSection === 9) {
                setSettingsSection(10); setSettingsFocus(100);
              } else if (settingsSection === 10) {
                if (settingsFocus < 115) setSettingsFocus(prev => prev + 1);
                else { setSettingsArea('sections'); }
              }
            } else if (activeSettingsTab === 1) {
              if (settingsSection === 0) { setSettingsSection(1); setSettingsFocus(1); }
              else if (settingsSection === 1) { setSettingsSection(2); setSettingsFocus(4); }
              else if (settingsSection === 2) { setSettingsSection(3); setSettingsFocus(6); }
              else if (settingsSection === 3) { setSettingsSection(4); setSettingsFocus(8); }
              else if (settingsSection === 4) {
                if (settingsFocus <= 10) setSettingsFocus(prev => prev + 3);
                else { setSettingsSection(5); setSettingsFocus(20); }
              } else if (settingsSection === 5) {
                if (settingsFocus === 20) setSettingsFocus(21);
                else if (settingsFocus === 21) setSettingsFocus(30);
                else if (settingsFocus >= 30) setSettingsFocus(prev => prev + 2);
              }
            } else if (activeSettingsTab === 2) {
              if (settingsSection === 0) { setSettingsSection(1); setSettingsFocus(1); }
              else if (settingsSection === 1) { setSettingsSection(2); setSettingsFocus(2); }
              else if (settingsSection === 2) { setSettingsSection(3); setSettingsFocus(3); }
              else if (settingsSection === 3) {
                if (settingsFocus <= 6) setSettingsFocus(prev => prev + 4);
                else { setSettingsSection(4); setSettingsFocus(11); }
              } else if (settingsSection === 4) {
                if (settingsFocus <= 11) setSettingsFocus(prev => prev + 3);
                else { setSettingsSection(5); setSettingsFocus(15); }
              } else if (settingsSection === 5) {
                setSettingsSection(6); setSettingsFocus(16);
              }
            } else if (activeSettingsTab === 3) {
              if (settingsFocus === 100) setSettingsFocus(500);
              else if (settingsFocus === 500) setSettingsFocus(200);
              else if (settingsFocus >= 200 && settingsFocus <= 211) setSettingsFocus(prev => prev + 3);
              else if (settingsFocus >= 212 && settingsFocus < 300) setSettingsFocus(300);
            }
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            const nextFocus = (sidebarFocus - 1 + 6) % 6;
            setSidebarFocus(nextFocus);
            if (nextFocus < 5) setActiveSettingsTab(nextFocus);
          } else if (settingsArea === 'sections') {
            if (settingsSection === 0) {
              setSettingsArea('tabs');
              setSidebarFocus(activeSettingsTab);
            } else {
              setSettingsSection(prev => prev - 1);
            }
          } else if (settingsArea === 'content') {
            if (activeSettingsTab === 0) {
              if (settingsSection === 0) {
                if (settingsFocus >= 4 && settingsFocus <= 11) setSettingsFocus(prev => prev - 4);
                else if (settingsFocus === 12) setSettingsFocus(8);
                else if (settingsFocus === 13) setSettingsFocus(12);
                else if (settingsFocus === 14) setSettingsFocus(13);
                else { setSettingsArea('sections'); }
              } else if (settingsSection === 1) {
                if (settingsFocus >= 23) setSettingsFocus(20);
                else { setSettingsSection(0); setSettingsFocus(14); }
              } else if (settingsSection === 2) {
                if (settingsFocus === 151) setSettingsFocus(150);
                else { setSettingsSection(1); setSettingsFocus(23); }
              } else if (settingsSection === 3) {
                if (settingsFocus === 16) setSettingsFocus(15);
                else { setSettingsSection(2); setSettingsFocus(151); }
              } else if (settingsSection === 4) {
                if (settingsFocus >= 44) setSettingsFocus(prev => prev - 4);
                else { setSettingsSection(3); setSettingsFocus(16); }
              } else if (settingsSection === 5) {
                if (settingsFocus >= 52) setSettingsFocus(prev => prev - 2);
                else { setSettingsSection(4); setSettingsFocus(44); }
              } else if (settingsSection === 6) {
                if (settingsFocus >= 63) setSettingsFocus(prev => prev - 3);
                else { setSettingsSection(5); setSettingsFocus(52); }
              } else if (settingsSection === 7) {
                if (settingsFocus >= 72) setSettingsFocus(prev => prev - 2);
                else { setSettingsSection(6); setSettingsFocus(63); }
              } else if (settingsSection === 8) {
                setSettingsSection(7); setSettingsFocus(72);
              } else if (settingsSection === 9) {
                setSettingsSection(8); setSettingsFocus(80);
              } else if (settingsSection === 10) {
                if (settingsFocus > 100) setSettingsFocus(prev => prev - 1);
                else { setSettingsSection(9); setSettingsFocus(90); }
              }
            } else if (activeSettingsTab === 1) {
              if (settingsSection === 1) { setSettingsSection(0); setSettingsFocus(0); }
              else if (settingsSection === 2) { setSettingsSection(1); setSettingsFocus(1); }
              else if (settingsSection === 3) { setSettingsSection(2); setSettingsFocus(4); }
              else if (settingsSection === 4) {
                if (settingsFocus >= 11) setSettingsFocus(prev => prev - 3);
                else { setSettingsSection(3); setSettingsFocus(6); }
              } else if (settingsSection === 5) {
                if (settingsFocus >= 32) setSettingsFocus(prev => prev - 2);
                else if (settingsFocus === 30 || settingsFocus === 31) setSettingsFocus(21);
                else if (settingsFocus === 21) setSettingsFocus(20);
                else { setSettingsSection(4); setSettingsFocus(11); }
              }
            } else if (activeSettingsTab === 2) {
              if (settingsSection === 1) { setSettingsSection(0); setSettingsFocus(0); }
              else if (settingsSection === 2) { setSettingsSection(1); setSettingsFocus(1); }
              else if (settingsSection === 3) {
                if (settingsFocus >= 7) setSettingsFocus(prev => prev - 4);
                else { setSettingsSection(2); setSettingsFocus(2); }
              } else if (settingsSection === 4) {
                if (settingsFocus >= 14) setSettingsFocus(prev => prev - 3);
                else { setSettingsSection(3); setSettingsFocus(7); }
              } else if (settingsSection === 5) {
                setSettingsSection(4); setSettingsFocus(14);
              } else if (settingsSection === 6) {
                setSettingsSection(5); setSettingsFocus(15);
              }
            } else if (activeSettingsTab === 3) {
              if (settingsFocus >= 300) setSettingsFocus(212);
              else if (settingsFocus >= 203) setSettingsFocus(prev => prev - 3);
              else if (settingsFocus >= 200) setSettingsFocus(500);
              else if (settingsFocus === 500) setSettingsFocus(100);
              else setSettingsArea('sections');
            }
          }
          break;
      }
      return;
    }

    if (navContext === 'browse') {
      if (uiMode === 'bento') return; // Let BentoDashboard handle it
      switch (key) {
        case 'ArrowUp':
          e.preventDefault();
          if (activeRow === -4) return;
          if (activeRow === -3) setActiveRow(-4);
          else if (activeRow === -2) setActiveRow(-3);
          else if (activeRow === -1) setActiveRow(-2);
          else if (activeRow === 0) {
            if (searchQuery) setActiveRow(-2);
            else setActiveRow(-1);
          }
          else setActiveRow(prev => prev - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (activeRow === -4) setActiveRow(-3);
          else if (activeRow === -3) setActiveRow(-2);
          else if (activeRow === -2) {
            if (searchQuery) setActiveRow(0);
            else setActiveRow(-1);
          }
          else if (activeRow === -1) setActiveRow(0);
          else if (activeRow < groupedChannels.length - 1) setActiveRow(prev => prev + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (activeRow === -4) return;
          else if (activeRow === -3) setActiveCol(prev => Math.max(0, prev - 1));
          else if (activeRow === -2) setActiveCol(prev => Math.max(0, prev - 1));
          else if (activeRow === -1) setActiveCol(prev => Math.max(0, prev - 1));
          else setActiveCol(prev => Math.max(-1, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (activeRow === -4) return;
          else if (activeRow === -3) setActiveCol(prev => Math.min(primaryHeroButtons.length - 1, prev + 1));
          else if (activeRow === -2) {
            const searchRowButtons = filterHeroButtons.filter(b => b.id === 'search' || b.id === 'voice' || b.id === 'remote-toggle' || b.id === 'device-info');
            setActiveCol(prev => Math.min(searchRowButtons.length - 1, prev + 1));
          } else if (activeRow === -1) {
            const otherFilters = filterHeroButtons.filter(b => b.id !== 'search' && b.id !== 'voice' && b.id !== 'remote-toggle' && b.id !== 'device-info');
            setActiveCol(prev => Math.min(otherFilters.length - 1, prev + 1));
          } else {
            const rowChannels = groupedChannels[activeRow]?.[1];
            if (rowChannels) setActiveCol(prev => Math.min(rowChannels.length - 1, prev + 1));
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (activeRow === -4) {
            const profileBtn = document.querySelector('button.rounded-sm.overflow-hidden') as HTMLElement;
            if (profileBtn) profileBtn.click();
          } else if (activeRow === -3) {
            const btn = primaryHeroButtons[activeCol];
            if (btn) btn.action();
          } else if (activeRow === -2) {
            const searchRowButtons = filterHeroButtons.filter(b => b.id === 'search' || b.id === 'voice' || b.id === 'remote-toggle' || b.id === 'device-info');
            const btn = searchRowButtons[activeCol];
            if (btn) btn.action();
          } else if (activeRow === -1) {
            const otherFilters = filterHeroButtons.filter(b => b.id !== 'search' && b.id !== 'voice' && b.id !== 'remote-toggle' && b.id !== 'device-info');
            const btn = otherFilters[activeCol];
            if (btn) btn.action();
          } else if (activeRow >= 0) {
            const channel = groupedChannels[activeRow]?.[1][activeCol];
            if (channel) handleChannelSelect(channel);
          }
          break;
      }
    }
  }, [
    navContext, activeRow, activeCol, settingsArea, settingsSection, settingsFocus,
    sidebarFocus, channelMenuFocus, quickSettingsFocus, props, detailFocus,
    layoutMode, searchQuery, groupedChannels, filterHeroButtons, primaryHeroButtons
  ]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    let key = e.key;
    if (key === 'Select' || key === 'OK') key = 'Enter';
    
    if (key === 'Enter') {
      if (keyHoldTimer.current) {
        // This was a short press
        clearTimeout(keyHoldTimer.current);
        keyHoldTimer.current = null;

        if (keyPressNavContext.current === 'browse' && navContext === 'browse') {
          if (channels.length === 0) {
            if (activeRow === 0) {
              document.getElementById('empty-file-upload')?.click();
            } else if (activeRow === 1) {
              if (extraUrl) {
                setPlaylistUrl(extraUrl);
                handleUrlSubmit(extraUrl);
              } else if (activeCol === 0) {
                document.getElementById('empty-url-input')?.focus();
              }
            } else if (activeRow === 3) {
              localStorage.removeItem('m3u_deleted');
              localStorage.setItem('m3u_url', DEFAULT_M3U_URL);
              setSavedUrl(DEFAULT_M3U_URL);
              setPlaylistUrl(DEFAULT_M3U_URL);
              handleUrlSubmit(DEFAULT_M3U_URL);
            } else if (activeRow === 4) {
              setShowSettings(true);
              setNavContext('settings');
              setSettingsArea('content');
              setSidebarFocus(0);
              setActiveSettingsTab(0);
              setSettingsSection(0);
              setSettingsFocus(0);
            }
          } else if (activeRow === -4) {
            const profileBtn = document.querySelector('button.rounded-sm.overflow-hidden') as HTMLElement;
            if (profileBtn) profileBtn.click();
          } else if (activeRow === -3) {
            const button = primaryHeroButtons[activeCol];
            if (button) button.action();
          } else if (activeRow === -2) {
            if (showDeviceInfo) {
              setShowDeviceInfo(false);
              return;
            }
            const searchRowButtons = filterHeroButtons.filter(b => b.id === 'search' || b.id === 'voice' || b.id === 'remote-toggle' || b.id === 'device-info');
            const button = searchRowButtons[activeCol];
            if (button) button.action();
          } else if (activeRow === -1) {
            const otherFilters = filterHeroButtons.filter(b => b.id !== 'search' && b.id !== 'voice' && b.id !== 'remote-toggle' && b.id !== 'device-info');
            const button = otherFilters[activeCol];
            if (button) button.action();
          } else {
            if (activeCol === -1) {
              const group = groupedChannels[activeRow]?.[0];
              if (group) {
                setCollapsedRows(prev => {
                  const next = new Set(prev);
                  if (next.has(group)) next.delete(group);
                  else next.add(group);
                  return next;
                });
              }
            } else {
              const selectedChannel = groupedChannels[activeRow]?.[1][activeCol];
              if (selectedChannel) {
                handleChannelSelect(selectedChannel);
              }
            }
          }
        }
      }
      isKeyHeld.current = false;
      keyPressNavContext.current = null;
    }
  }, [navContext, activeRow, activeCol, props]);

  return {
    navContext, setNavContext,
    activeRow, setActiveRow,
    activeCol, setActiveCol,
    settingsArea, setSettingsArea,
    settingsSection, setSettingsSection,
    settingsFocus, setSettingsFocus,
    sidebarFocus, setSidebarFocus,
    channelMenuFocus, setChannelMenuFocus,
    quickSettingsFocus, setQuickSettingsFocus,
    activeSettingsTab, setActiveSettingsTab,
    expandedSections, setExpandedSections,
    toggleSection,
    handleKeyDown,
    handleKeyUp
  };
}

