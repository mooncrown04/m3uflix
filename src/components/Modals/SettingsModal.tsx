import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Sun, List as ListIcon, Settings, Smartphone, 
  ChevronLeft, ChevronRight, ChevronDown, Plus, 
  Check, Tv, Grid, Equal, Monitor, Tablet, Info,
  User, Link as LinkIcon, Link2, RefreshCw, Trash2,
  Bell, FastForward, Mic, MicOff, Key, Globe, Mail,
  ExternalLink, CircleDashed, Activity, Sparkles, Copy,
  Clock, Download, Hash
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '../../lib/utils';
import { Playlist, UIMode, LogoStyle, Top10Style, FocusEffect, KeyMap, DEFAULT_KEY_MAP } from '../../types';
import { Logo } from '../Layout/Logo';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useChannelStore } from '../../store/useChannelStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { useRemoteControl } from '../../hooks/useRemoteControl';
import { useToasts } from '../../hooks/useToasts';
import { normalizeRemoteKey } from '../../utils/keyUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const settingsSidebarRef = useRef<HTMLDivElement>(null);
  const settingsContentRef = useRef<HTMLDivElement>(null);

  const [capturingKey, setCapturingKey] = React.useState<string | null>(null);

  const {
    setThemeColor,
    uiMode, setUiMode,
    logoStyle, setLogoStyle,
    focusEffect, setFocusEffect,
    posterOrientation, setPosterOrientation,
    clockStyle, setClockStyle,
    top10Style, setTop10Style,
    profilePic, setProfilePic,
    deviceType, setDeviceType,
    dynamicThemeEnabled, setDynamicThemeEnabled,
    voiceControlEnabled, setVoiceControlEnabled,
    cinemaModeEnabled, setCinemaModeEnabled,
    sportsTickerEnabled, setSportsTickerEnabled,
    newsTickerEnabled, setNewsTickerEnabled,
    tmdbEnabled, setTmdbEnabled,
    tmdbApiKey, setTmdbApiKey,
    geminiApiKey, setGeminiApiKey,
    customProxyUrl, setCustomProxyUrl,
    playerEngine, setPlayerEngine,
    ambilightMode, setAmbilightMode,
    mixColor1, setMixColor1,
    mixColor2, setMixColor2,
    keyMap, setKeyMap,
    themeColor,
    buildMethod, setBuildMethod,
    customRssUrls, setCustomRssUrls
  } = useSettingsStore();

  const {
    playlists,
    currentPlaylistId,
    setCurrentPlaylistId,
    setPlaylistUrl,
    setPlaylists,
    searchQuery,
    setSearchQuery,
    epgData,
    addPlaylist,
    deletePlaylist,
    refreshPlaylist,
    updateEPG,
    epgUrl,
    setEpgUrl
  } = useChannelStore();

  const [isUsingKeyboard, setIsUsingKeyboard] = useState(false);
  const isActionFromKeyboardRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = () => {
      setIsUsingKeyboard(true);
    };

    const handleWindowMouseMove = () => {
      setIsUsingKeyboard(false);
    };

    const handleWindowMouseDown = () => {
      setIsUsingKeyboard(false);
    };

    window.addEventListener('keydown', handleWindowKeyDown, { capture: true });
    window.addEventListener('mousemove', handleWindowMouseMove, { capture: true });
    window.addEventListener('mousedown', handleWindowMouseDown, { capture: true });
    window.addEventListener('touchstart', handleWindowMouseDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown, { capture: true });
      window.removeEventListener('mousemove', handleWindowMouseMove, { capture: true });
      window.removeEventListener('mousedown', handleWindowMouseDown, { capture: true });
      window.removeEventListener('touchstart', handleWindowMouseDown, { capture: true });
    };
  }, [isOpen]);

  const navigationStoreValues = useNavigationStore();
  const {
    setNavContext,
    setActiveRow,
    setActiveCol,
    installPrompt,
    setInstallPrompt,
    activeSettingsTab,
    settingsArea,
    settingsSection,
    settingsFocus,
    sidebarFocus,
  } = navigationStoreValues;

  const originalSetSettingsFocus = navigationStoreValues.setSettingsFocus;
  const originalSetSidebarFocus = navigationStoreValues.setSidebarFocus;
  const originalSetSettingsArea = navigationStoreValues.setSettingsArea;
  const originalSetSettingsSection = navigationStoreValues.setSettingsSection;
  const originalSetActiveSettingsTab = navigationStoreValues.setActiveSettingsTab;

  const setSettingsFocus = useCallback((focus: any) => {
    if (isUsingKeyboard && !isActionFromKeyboardRef.current) {
      return;
    }
    originalSetSettingsFocus(focus);
  }, [isUsingKeyboard, originalSetSettingsFocus]);

  const setSidebarFocus = useCallback((focus: any) => {
    if (isUsingKeyboard && !isActionFromKeyboardRef.current) {
      return;
    }
    originalSetSidebarFocus(focus);
  }, [isUsingKeyboard, originalSetSidebarFocus]);

  const setSettingsArea = useCallback((area: any) => {
    if (isUsingKeyboard && !isActionFromKeyboardRef.current) {
      return;
    }
    originalSetSettingsArea(area);
  }, [isUsingKeyboard, originalSetSettingsArea]);

  const setSettingsSection = useCallback((section: any) => {
    if (isUsingKeyboard && !isActionFromKeyboardRef.current) {
      return;
    }
    originalSetSettingsSection(section);
  }, [isUsingKeyboard, originalSetSettingsSection]);

  const setActiveSettingsTab = useCallback((tab: any) => {
    if (isUsingKeyboard && !isActionFromKeyboardRef.current) {
      return;
    }
    originalSetActiveSettingsTab(tab);
  }, [isUsingKeyboard, originalSetActiveSettingsTab]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const mixedColor = themeColor;

  const {
    remoteRoomId: pairingCode,
    isRemoteConnected,
    isTvSocketConnected
  } = useRemoteControl();
  const pairingStatus: 'connected' | 'disconnected' | 'pairing' = isRemoteConnected ? 'connected' : (isTvSocketConnected ? 'pairing' : 'disconnected');

  const { showToast } = useToasts();

  const PROFILE_PICS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bear',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Caitlyn',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Dave',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Eliot',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Fiona',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=George',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Heidi',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Isaac',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=1',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=2',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=3',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=4',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=5',
    'https://api.dicebear.com/7.x/bottts/svg?seed=1',
    'https://api.dicebear.com/7.x/bottts/svg?seed=2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=3',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=1',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=2',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=3',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=1',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=2',
    'https://api.dicebear.com/7.x/shapes/svg?seed=1',
    'https://api.dicebear.com/7.x/shapes/svg?seed=2',
    'https://api.dicebear.com/7.x/personas/svg?seed=1',
    'https://api.dicebear.com/7.x/personas/svg?seed=2',
    'https://api.dicebear.com/7.x/miniavs/svg?seed=1',
    'https://api.dicebear.com/7.x/miniavs/svg?seed=2',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=1',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=2',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=1',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=2',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=1',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=2',
    'https://api.dicebear.com/7.x/croodles/svg?seed=1',
    'https://api.dicebear.com/7.x/croodles/svg?seed=2',
    'https://api.dicebear.com/7.x/open-peeps/svg?seed=1',
    'https://api.dicebear.com/7.x/open-peeps/svg?seed=2',
    'COLOR:#ef4444',
    'COLOR:#3b82f6',
    'COLOR:#10b981',
    'COLOR:#f59e0b',
    'COLOR:#8b5cf6',
    'COLOR:#ec4899',
    'COLOR:#06b6d4',
    'COLOR:#84cc16',
    'COLOR:#71717a',
    'LOGO:mooncrown',
    'LOGO:mooncrown-gold',
    'LOGO:mooncrown-silver',
    'LOGO:mooncrown-neon',
    'LOGO:mooncrown-glass',
    'LOGO:mooncrown-fire',
    'LOGO:minimal',
    'LOGO:neon',
    'LOGO:retro',
    'LOGO:glitch',
    'THEME_COLOR'
  ];

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newRssUrl, setNewRssUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    if (!capturingKey) return;

    const handleCapturingKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setKeyMap((prev: any) => ({ ...prev, [capturingKey]: e.key }));
      setCapturingKey(null);
      showToast(`${capturingKey} için ${e.key} tuşu atandı.`, 'success');
    };

    window.addEventListener('keydown', handleCapturingKey, true);
    return () => window.removeEventListener('keydown', handleCapturingKey, true);
  }, [capturingKey, setKeyMap, showToast]);

  const scrollSidebar = (direction: 'left' | 'right') => {
    if (settingsSidebarRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      settingsSidebarRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollSettingsContent = (direction: 'up' | 'down') => {
    if (settingsContentRef.current) {
      const scrollAmount = direction === 'up' ? -300 : 300;
      settingsContentRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (capturingKey) return; // Prevent navigation while capturing a key

      isActionFromKeyboardRef.current = true;
      try {
        const key = normalizeRemoteKey(e, keyMap);

        switch (key) {
        case 'Enter':
        case 'OK':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            if (sidebarFocus <= 5) {
              setSettingsArea('content');
              setSettingsSection(0);
              if (sidebarFocus === 0) {
                // Görünüm (Appearance)
                setExpandedSections((prev: any) => ({ ...prev, ['0-0']: true }));
                setSettingsFocus(0); // first color item
              } else if (sidebarFocus === 1) {
                // Liste (Playlist)
                setSettingsFocus(100); // Playlist url input
              } else if (sidebarFocus === 2) {
                // Genel (General)
                setSettingsFocus(60); // Web PWA button
              } else if (sidebarFocus === 3) {
                // Kumanda (Remote)
                setSettingsFocus(200); // Disconnect button
              } else if (sidebarFocus === 4) {
                // AI Gözcü (AI Guard)
                setSettingsFocus(0); // Akıllı VOD button
              } else if (sidebarFocus === 5) {
                // Tuş Atamaları (Key Bindings)
                setSettingsFocus(300); // First key binding
              }
            } else if (sidebarFocus === 6) {
              onClose();
            }
          } else if (settingsArea === 'sections') {
            const sectionPart = `${activeSettingsTab}-${settingsSection}`;
            if (!expandedSections[sectionPart]) {
              toggleSection(sectionPart);
            }
            setSettingsArea('content');
            if (activeSettingsTab === 0) {
              if (settingsSection === 0) setSettingsFocus(0);
              else if (settingsSection === 1) setSettingsFocus(20);
              else if (settingsSection === 2) setSettingsFocus(13);
              else if (settingsSection === 3) setSettingsFocus(30);
              else if (settingsSection === 4) setSettingsFocus(40);
              else if (settingsSection === 5) setSettingsFocus(50);
              else if (settingsSection === 6) setSettingsFocus(60);
              else setSettingsFocus(settingsSection * 10);
            } else if (activeSettingsTab === 1) {
              setSettingsFocus(100);
            } else if (activeSettingsTab === 2) {
              setSettingsFocus(60);
            } else {
              setSettingsFocus(0);
            }
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
        case 'Back':
        case 'Backspace':
        case 'GoBack':
          e.preventDefault();
          if (settingsArea === 'content') {
            if (activeSettingsTab === 0) {
              setSettingsArea('sections');
            } else {
              setSettingsArea('tabs');
            }
          } else if (settingsArea === 'sections') {
            setSettingsArea('tabs');
          } else {
            onClose();
            setNavContext('browse');
            setActiveRow(0);
            setActiveCol(0);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            if (window.innerWidth < 768) {
              const nextFocus = (sidebarFocus + 1) % 6;
              setSidebarFocus(nextFocus);
              setActiveSettingsTab(nextFocus);
            } else {
              if (sidebarFocus < 6) {
                setSettingsArea('content');
                setSettingsSection(0);
                if (sidebarFocus === 0) {
                  setExpandedSections((prev: any) => ({ ...prev, ['0-0']: true }));
                  setSettingsFocus(0);
                } else if (sidebarFocus === 1) {
                  setSettingsFocus(100);
                } else if (sidebarFocus === 2) {
                  setSettingsFocus(60);
                } else if (sidebarFocus === 3) {
                  setSettingsFocus(200);
                } else if (sidebarFocus === 4) {
                  setSettingsFocus(0);
                } else if (sidebarFocus === 5) {
                  setSettingsFocus(300);
                }
              }
            }
          } else if (settingsArea === 'sections') {
            const key = `${activeSettingsTab}-${settingsSection}`;
            if (!expandedSections[key]) {
              toggleSection(`${activeSettingsTab}-${settingsSection}`);
            } else {
              setSettingsArea('content');
              if (activeSettingsTab === 0) {
                if (settingsSection === 0) setSettingsFocus(0);
                else if (settingsSection === 1) setSettingsFocus(20);
                else if (settingsSection === 2) setSettingsFocus(13);
                else if (settingsSection === 3) setSettingsFocus(30);
                else if (settingsSection === 4) setSettingsFocus(40);
                else if (settingsSection === 5) setSettingsFocus(50);
                else if (settingsSection === 6) setSettingsFocus(60);
              }
            }
          } else if (settingsArea === 'content') {
            if (activeSettingsTab === 0) {
              if (settingsSection === 0 && settingsFocus < 11) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 1 && settingsFocus < 22) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 2 && settingsFocus < 23) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 3 && settingsFocus < 34) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 4 && settingsFocus < 41) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 5 && settingsFocus < 53) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 6 && settingsFocus < 66) setSettingsFocus((prev: number) => prev + 1);
            } else if (activeSettingsTab === 1) {
              if (settingsFocus === 100) setSettingsFocus(101);
            } else if (activeSettingsTab === 2) {
              if (settingsFocus === 60) setSettingsFocus(61);
              else if (settingsFocus === 70) setSettingsFocus(71);
            } else if (activeSettingsTab === 5) {
              if (settingsFocus < 300 + Object.keys(keyMap).length - 1) setSettingsFocus((prev: number) => prev + 1);
            }
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            if (window.innerWidth < 768) {
              const nextFocus = (sidebarFocus - 1 + 6) % 6;
              setSidebarFocus(nextFocus);
              setActiveSettingsTab(nextFocus);
            }
          } else if (settingsArea === 'sections') {
            // Do not exit to tabs via ArrowLeft. Must use Back/Backspace.
          } else if (settingsArea === 'content') {
            // Internal content navigation
            if (activeSettingsTab === 0) {
              if (settingsSection === 0 && settingsFocus > 0) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 1 && settingsFocus > 20) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 2 && settingsFocus > 13) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 3 && settingsFocus > 30) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 4 && settingsFocus > 40) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 5 && settingsFocus > 50) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 6 && settingsFocus > 60) setSettingsFocus((prev: number) => prev - 1);
            } else if (activeSettingsTab === 1) {
              if (settingsFocus === 101) setSettingsFocus(100);
            } else if (activeSettingsTab === 2) {
              if (settingsFocus === 61) setSettingsFocus(60);
              else if (settingsFocus === 71) setSettingsFocus(70);
            } else if (activeSettingsTab === 5) {
              if (settingsFocus > 300) setSettingsFocus((prev: number) => prev - 1);
            }
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            if (window.innerWidth < 768) {
              // On mobile, ArrowDown enters the first section/content of the active tab
              const firstSectionHeader = document.querySelector('h3.font-black.uppercase') as HTMLElement;
              if (firstSectionHeader) {
                setSettingsArea('sections');
                setSettingsSection(0);
              } else {
                setSettingsArea('content');
                setSettingsFocus(0);
              }
            } else {
              const nextFocus = (sidebarFocus + 1) % 7;
              setSidebarFocus(nextFocus);
              if (nextFocus < 6) {
                setActiveSettingsTab(nextFocus);
                setSettingsSection(0);
                setSettingsFocus(0);
                setExpandedSections({});
              }
            }
          } else if (settingsArea === 'sections') {
            const maxSections = activeSettingsTab === 0 ? 12 : 1;
            setSettingsSection((prev: number) => (prev + 1) % maxSections);
          } else if (settingsArea === 'content') {
            if (activeSettingsTab === 0 && settingsSection === 0) {
              if (settingsFocus < 6) setSettingsFocus((prev: number) => prev + 6);
            } else if (activeSettingsTab === 0 && settingsSection === 1) {
              if (settingsFocus < 22) setSettingsFocus((prev: number) => prev + 2);
            } else if (activeSettingsTab === 0 && settingsSection === 2) {
              if (settingsFocus < 22) setSettingsFocus((prev: number) => prev + 2);
            } else if (activeSettingsTab === 1) {
              if (settingsFocus === 100 || settingsFocus === 101) {
                if (playlists.length > 0) {
                  setSettingsFocus(110);
                } else {
                  setSettingsFocus(120);
                }
              } else if (settingsFocus >= 110 && settingsFocus < 110 + playlists.length) {
                const currentIdx = settingsFocus - 110;
                if (currentIdx < playlists.length - 1) {
                  setSettingsFocus(settingsFocus + 1);
                } else {
                  setSettingsFocus(120);
                }
              } else if (settingsFocus === 120) {
                setSettingsFocus(100);
              }
            } else if (activeSettingsTab === 2) {
              if (settingsFocus === 60 || settingsFocus === 61) {
                setSettingsFocus(70);
              } else if (settingsFocus === 70 || settingsFocus === 71) {
                setSettingsFocus(75);
              } else if (settingsFocus === 75) {
                setSettingsFocus(0);
              } else if (settingsFocus === 0) {
                const installBtnEl = document.querySelector('[onMouseEnter*="setSettingsFocus(50)"]');
                if (installBtnEl) {
                  setSettingsFocus(50);
                } else {
                  setSettingsFocus(60);
                }
              } else if (settingsFocus === 50) {
                setSettingsFocus(60);
              }
            } else if (activeSettingsTab === 4) {
              if (settingsFocus < 6) setSettingsFocus((prev: number) => prev + 1);
            } else if (activeSettingsTab === 5) {
              if (settingsFocus < 300 + Object.keys(keyMap).length - 2) setSettingsFocus((prev: number) => prev + 2);
              else if (settingsFocus < 350) setSettingsFocus(350);
            }
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            if (window.innerWidth >= 768) {
              const nextFocus = (sidebarFocus - 1 + 7) % 7;
              setSidebarFocus(nextFocus);
              if (nextFocus < 6) {
                setActiveSettingsTab(nextFocus);
                setSettingsSection(0);
                setSettingsFocus(0);
                setExpandedSections({});
              }
            }
          } else if (settingsArea === 'sections') {
            const maxSections = activeSettingsTab === 0 ? 12 : 1;
            setSettingsSection((prev: number) => (prev - 1 + maxSections) % maxSections);
          } else if (settingsArea === 'content') {
            if (activeSettingsTab === 0 && settingsSection === 0) {
              if (settingsFocus >= 6) setSettingsFocus((prev: number) => prev - 6);
            } else if (activeSettingsTab === 0 && settingsSection === 1) {
              if (settingsFocus >= 22) setSettingsFocus((prev: number) => prev - 2);
            } else if (activeSettingsTab === 0 && settingsSection === 2) {
              if (settingsFocus >= 15) setSettingsFocus((prev: number) => prev - 2);
            } else if (activeSettingsTab === 1) {
              if (settingsFocus === 120) {
                if (playlists.length > 0) {
                  setSettingsFocus(110 + playlists.length - 1);
                } else {
                  setSettingsFocus(100);
                }
              } else if (settingsFocus >= 110 && settingsFocus < 110 + playlists.length) {
                const currentIdx = settingsFocus - 110;
                if (currentIdx > 0) {
                  setSettingsFocus(settingsFocus - 1);
                } else {
                  setSettingsFocus(100);
                }
              } else if (settingsFocus === 100 || settingsFocus === 101) {
                setSettingsFocus(120);
              }
            } else if (activeSettingsTab === 2) {
              if (settingsFocus === 50) {
                setSettingsFocus(0);
              } else if (settingsFocus === 0) {
                setSettingsFocus(75);
              } else if (settingsFocus === 75) {
                setSettingsFocus(70);
              } else if (settingsFocus === 70 || settingsFocus === 71) {
                setSettingsFocus(60);
              } else if (settingsFocus === 60 || settingsFocus === 61) {
                const installBtnEl = document.querySelector('[onMouseEnter*="setSettingsFocus(50)"]');
                if (installBtnEl) {
                  setSettingsFocus(50);
                } else {
                  setSettingsFocus(0);
                }
              }
            } else if (activeSettingsTab === 4) {
              if (settingsFocus > 0) setSettingsFocus((prev: number) => prev - 1);
            } else if (activeSettingsTab === 5) {
              if (settingsFocus >= 302) setSettingsFocus((prev: number) => prev - 2);
              else if (settingsFocus === 350) setSettingsFocus(300 + Object.keys(keyMap).length - 1);
            }
          }
          break;
        }
      } finally {
        isActionFromKeyboardRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, settingsArea, sidebarFocus, settingsSection, settingsFocus, activeSettingsTab, expandedSections, playlists.length, onClose, setNavContext, setActiveRow, setActiveCol, toggleSection, setSettingsArea, setSettingsSection, setSettingsFocus, setSidebarFocus, setActiveSettingsTab, setExpandedSections]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={cn(
              "w-full h-full sm:h-[600px] sm:max-h-[90vh] sm:max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden",
              uiMode === 'modern' && "bg-white/5 backdrop-blur-3xl border border-white/20 sm:rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)]",
              uiMode === 'classic' && "bg-zinc-950 border-0 sm:border-4 border-zinc-800 sm:rounded-none shadow-[30px_30px_0_rgba(0,0,0,0.3)]",
              uiMode === 'minimalist' && "bg-black border-0 sm:border border-white/10 sm:rounded-none"
            )}
          >
        {uiMode === 'modern' && (
          <div 
            className="absolute -top-48 -left-48 w-96 h-96 rounded-full blur-[120px] opacity-20 animate-pulse"
            style={{ backgroundColor: themeColor }}
          />
        )}
        {uiMode === 'classic' && (
          <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: themeColor }} />
        )}
        {/* Sidebar Tabs */}
        <div className="relative flex flex-col md:w-56 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 overflow-hidden">
          <div className="md:hidden absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-black/80 to-transparent pointer-events-none px-1">
            <button 
              onClick={() => scrollSidebar('left')}
              className="p-1 bg-white/10 rounded-full pointer-events-auto hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="md:hidden absolute right-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-l from-black/80 to-transparent pointer-events-none px-1">
            <button 
              onClick={() => scrollSidebar('right')}
              className="p-1 bg-white/10 rounded-full pointer-events-auto hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
          <div 
            ref={settingsSidebarRef}
            className="w-full h-full px-8 py-3 md:p-3 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto custom-scrollbar scroll-smooth"
          >
            <div className="hidden md:block mb-6">
              <h2 className="text-xl font-black italic tracking-tighter uppercase text-white opacity-50">Ayarlar</h2>
            </div>
            {[
              { id: 0, label: 'Görünüm', icon: Sun },
              { id: 1, label: 'Liste', icon: ListIcon },
              { id: 2, label: 'Genel', icon: Settings },
              { id: 3, label: 'Kumanda', icon: Smartphone },
              { id: 4, label: 'AI Gözcü', icon: Sparkles },
              { id: 5, label: 'Tuş Atamaları', icon: Key }
            ].map((tab) => (
              <button
                key={tab.id}
                data-tab-id={tab.id}
                data-sidebar-focus={tab.id}
                onClick={() => {
                  setActiveSettingsTab(tab.id);
                  setSidebarFocus(tab.id);
                  setSettingsArea('content');
                  setSettingsSection(0);
                  setSettingsFocus(0);
                  setExpandedSections({});
                }}
                onMouseEnter={() => {
                  setSettingsArea('tabs');
                  setSidebarFocus(tab.id);
                  setActiveSettingsTab(tab.id);
                }}
                className={cn(
                  "relative flex-1 md:flex-none flex items-center gap-2.5 px-3 py-2.5 font-bold transition-all whitespace-nowrap overflow-hidden",
                  uiMode === 'modern' && "rounded-lg",
                  uiMode === 'classic' && "rounded-none border-l-2 border-transparent",
                  uiMode === 'minimalist' && "rounded-none border-0",
                  activeSettingsTab === tab.id 
                    ? (uiMode === 'modern' 
                        ? "bg-white/20 text-white scale-105 shadow-lg backdrop-blur-md border border-white/20" 
                        : uiMode === 'classic'
                        ? "bg-zinc-800 text-white border-l-4 border-white"
                        : "text-white border-b-2 border-white")
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
                  settingsArea === 'tabs' && sidebarFocus === tab.id && "ring-4 ring-white ring-offset-2 ring-offset-black z-10 settings-focused"
                )}
              >
              {activeSettingsTab === tab.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" style={{ backgroundColor: themeColor }} />
              )}
              <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm">{tab.label}</span>
              {tab.id === 1 && playlists.length > 0 && (
                <span className="ml-auto bg-white/10 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                  {playlists.length}
                </span>
              )}
            </button>
          ))}
          </div>
          
          <div className="hidden md:block mt-auto pt-4 space-y-4">
            <button
              onClick={onClose}
              onMouseEnter={() => {
                setSettingsArea('tabs');
                setSidebarFocus(6);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 font-bold transition-all",
                uiMode === 'modern' && "rounded-xl",
                uiMode === 'classic' && "rounded-none border border-zinc-800",
                uiMode === 'minimalist' && "rounded-none border-0",
                settingsArea === 'tabs' && sidebarFocus === 6 
                  ? (uiMode === 'modern' ? "bg-white text-black ring-4 ring-white ring-offset-2 ring-offset-black z-10 settings-focused" : uiMode === 'classic' ? "bg-zinc-800 text-white border-white settings-focused" : "text-white border-b-2 border-white settings-focused") 
                  : "text-zinc-500 hover:bg-white/5 hover:text-white"
              )}
            >
              <X className="w-5 h-5" />
              <span>Kapat</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-none">
            <button 
              onClick={() => scrollSettingsContent('up')}
              className="p-2 bg-white/10 rounded-full pointer-events-auto hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
            >
              <ChevronDown className="w-5 h-5 text-white rotate-180" />
            </button>
            <button 
              onClick={() => scrollSettingsContent('down')}
              className="p-2 bg-white/10 rounded-full pointer-events-auto hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
            >
              <ChevronDown className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="md:hidden p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xl font-black italic uppercase text-white">
              {activeSettingsTab === 0 ? 'Görünüm' : 
               activeSettingsTab === 1 ? 'Liste' : 
               activeSettingsTab === 2 ? 'Genel' : 
               activeSettingsTab === 3 ? 'Kumanda' :
               activeSettingsTab === 4 ? 'AI Gözcü' : 'Tuş Atamaları'}
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
          </div>

          <div className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 pb-[40vh] space-y-2 custom-scrollbar scroll-smooth transition-all duration-500",
            settingsArea === 'tabs' ? "opacity-30 grayscale-[0.5] scale-[0.98]" : "opacity-100 grayscale-0 scale-100"
          )} ref={settingsContentRef}>
            <AnimatePresence mode="wait">
              {/* Tab 0: Görünüm */}
              {activeSettingsTab === 0 && (
                <motion.div 
                  key="tab-0"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  {/* Tema Rengi */}
                  <section className="space-y-2">
                    <button 
                      onClick={() => toggleSection('0-0')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(0);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 0 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: themeColor }} />
                        Tema Rengi
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-0'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-0'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="flex flex-wrap gap-x-6 gap-y-8 p-2">
                            {[
                              { name: 'Kırmızı', color: '#dc2626' },
                              { name: 'Mavi', color: '#2563eb' },
                              { name: 'Yeşil', color: '#16a34a' },
                              { name: 'Mor', color: '#9333ea' },
                              { name: 'Turuncu', color: '#ea580c' },
                              { name: 'Sarı', color: '#eab308' },
                              { name: 'Pembe', color: '#db2777' },
                              { name: 'Turkuaz', color: '#0891b2' },
                              { name: 'İndigo', color: '#4f46e5' },
                              { name: 'Gül', color: '#e11d48' },
                              { name: 'Kehribar', color: '#d97706' },
                              { name: 'Kireç', color: '#65a30d' }
                            ].map((c, i) => (
                              <div key={c.color} className="flex flex-col items-center gap-2">
                                <button
                                  onClick={() => setThemeColor(c.color)}
                                  onMouseEnter={() => {
                                    setSettingsArea('content');
                                    setSettingsFocus(i);
                                  }}
                                  style={{ backgroundColor: c.color }}
                                  className={cn(
                                    "w-10 h-10 md:w-12 md:h-12 transition-all border-4",
                                    uiMode === 'modern' && "rounded-full",
                                    uiMode === 'classic' && "rounded-none",
                                    uiMode === 'minimalist' && "rounded-none border-0",
                                    themeColor === c.color ? "border-white scale-110 shadow-xl" : "border-transparent opacity-40 hover:opacity-100",
                                    settingsArea === 'content' && settingsFocus === i && "ring-4 ring-white scale-125 z-10 opacity-100 settings-focused"
                                  )}
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{c.name}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                  {/* UI Modu */}
                  <section className="space-y-2">
                    <button 
                      onClick={() => toggleSection('0-1')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(1);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 1 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Grid className="w-4 h-4" />
                        Arayüz Modu
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-1'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-1'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-2">
                            {[
                              { id: 'modern', label: 'Modern', icon: Sparkles, desc: 'Cam efektli, yuvarlak hatlı' },
                              { id: 'classic', label: 'Klasik', icon: Monitor, desc: 'Keskin hatlı, geleneksel' },
                              { id: 'minimalist', label: 'Minimalist', icon: Equal, desc: 'Sade ve hızlı' }
                            ].map((mode, i) => (
                              <button
                                key={mode.id}
                                onClick={() => setUiMode(mode.id as UIMode)}
                                onMouseEnter={() => {
                                  setSettingsArea('content');
                                  setSettingsFocus(20 + i);
                                }}
                                className={cn(
                                  "p-4 flex flex-col items-center gap-3 transition-all border-2 text-center",
                                  uiMode === 'modern' && "rounded-2xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  uiMode === mode.id 
                                    ? "bg-white/10 border-white text-white shadow-xl" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10",
                                  settingsArea === 'content' && settingsFocus === 20 + i && "ring-4 ring-white scale-105 z-10 settings-focused"
                                )}
                              >
                                <mode.icon className="w-6 h-6" />
                                <div className="space-y-1">
                                  <div className="font-bold text-sm">{mode.label}</div>
                                  <div className="text-[10px] opacity-50">{mode.desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                  {/* Logo Stili */}
                  <section className="space-y-2">
                    <button 
                      onClick={() => toggleSection('0-2')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(2);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 2 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Logo Stili
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-2'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-2'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-2">
                            {[
                              { id: 'default', label: 'Varsayılan' },
                              { id: 'mooncrown', label: 'MoonCrown' },
                              { id: 'mooncrown-gold', label: 'Altın' },
                              { id: 'mooncrown-silver', label: 'Gümüş' },
                              { id: 'mooncrown-neon', label: 'Neon' },
                              { id: 'mooncrown-glass', label: 'Cam' },
                              { id: 'mooncrown-fire', label: 'Ateş' },
                              { id: 'minimal', label: 'Minimalist' },
                              { id: 'neon', label: 'Saf Neon' },
                              { id: 'retro', label: 'Retro' },
                              { id: 'glitch', label: 'Glitch' }
                            ].map((style, i) => (
                              <button
                                key={style.id}
                                onClick={() => setLogoStyle(style.id as LogoStyle)}
                                onMouseEnter={() => {
                                  setSettingsArea('content');
                                  setSettingsFocus(13 + i);
                                }}
                                className={cn(
                                  "px-4 py-3 font-bold transition-all border-2 text-[10px] uppercase tracking-widest overflow-hidden relative group",
                                  uiMode === 'modern' && "rounded-xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  logoStyle === style.id 
                                    ? "bg-white/10 border-white text-white shadow-lg" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10 hover:border-white/20",
                                  settingsArea === 'content' && settingsFocus === 13 + i && "ring-4 ring-white scale-105 z-10 settings-focused"
                                )}
                              >
                                {logoStyle === style.id && (
                                  <motion.div 
                                    layoutId="logo-active-glow"
                                    className="absolute inset-0 bg-white/5 blur-xl group-hover:bg-white/10"
                                  />
                                )}
                                <span className="relative z-10">{style.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                  {/* Odak Efekti */}
                  <section className="space-y-2">
                    <button 
                      onClick={() => toggleSection('0-3')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(3);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 3 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Odak Efekti
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-3'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-3'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-2">
                            {[
                              { id: 'default', label: 'Varsayılan' },
                              { id: 'glow', label: 'Parlayan' },
                              { id: 'pulse', label: 'Mıknatıs' },
                              { id: 'border', label: 'Kenarlık' },
                              { id: 'scale', label: 'Büyütme' }
                            ].map((effect, i) => (
                              <button
                                key={effect.id}
                                onClick={() => setFocusEffect(effect.id as FocusEffect)}
                                className={cn(
                                  "px-2 py-4 flex flex-col items-center justify-center gap-2 transition-all border-2 text-center overflow-hidden relative",
                                  uiMode === 'modern' && "rounded-xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  focusEffect === effect.id 
                                    ? "bg-white/10 border-white text-white shadow-xl" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10 hover:border-white/20",
                                  settingsArea === 'content' && settingsFocus === 30 + i && "ring-4 ring-white scale-105 z-10 settings-focused"
                                )}
                              >
                                <div className={cn(
                                  "w-6 h-6 rounded border-2 transition-all",
                                  effect.id === 'default' && "border-white/20",
                                  effect.id === 'glow' && "border-white shadow-[0_0_10px_white]",
                                  effect.id === 'pulse' && "border-white animate-pulse",
                                  effect.id === 'border' && "border-white border-dashed",
                                  effect.id === 'scale' && "border-white scale-125"
                                )} />
                                <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">{effect.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Poster Yönü */}
                  <section className="space-y-2">
                    <button 
                      onClick={() => toggleSection('0-4')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(4);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 4 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Poster Yönü
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-4'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-4'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="flex flex-wrap gap-4 p-2">
                            {[
                              { id: 'landscape', label: 'Yatay (Landscape)' },
                              { id: 'portrait', label: 'Dikey (Portrait)' }
                            ].map((orientation, i) => (
                              <button
                                key={orientation.id}
                                onClick={() => setPosterOrientation(orientation.id as any)}
                                className={cn(
                                  "px-6 py-3 font-bold transition-all border-2",
                                  uiMode === 'modern' && "rounded-xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  posterOrientation === orientation.id 
                                    ? "bg-white/10 border-white text-white" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10",
                                  settingsArea === 'content' && settingsFocus === 40 + i && "ring-4 ring-white scale-105 z-10 settings-focused"
                                )}
                              >
                                {orientation.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Saat Stili */}
                  <section className="space-y-2">
                    <button 
                      onClick={() => toggleSection('0-5')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(5);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 5 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Saat Stili
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-5'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-5'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="flex flex-wrap gap-4 p-2">
                            {[
                              { id: 'modern', label: 'Modern' },
                              { id: 'classic', label: 'Klasik' },
                              { id: 'minimalist', label: 'Minimalist' },
                              { id: 'none', label: 'Yok' }
                            ].map((style, i) => (
                              <button
                                key={style.id}
                                onClick={() => setClockStyle(style.id as any)}
                                className={cn(
                                  "px-6 py-3 font-bold transition-all border-2",
                                  uiMode === 'modern' && "rounded-xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  clockStyle === style.id 
                                    ? "bg-white/10 border-white text-white" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10",
                                  settingsArea === 'content' && settingsFocus === 50 + i && "ring-4 ring-white scale-105 z-10 settings-focused"
                                )}
                              >
                                {style.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Top 10 Stili */}
                  <section className="space-y-2">
                    <button 
                      onClick={() => toggleSection('0-6')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(6);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 6 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Top 10 Stili
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-6'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-6'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                            {[
                              { id: 'original', label: 'Klasik Beyaz' },
                              { id: 'filled', label: 'Dolu Beyaz' },
                              { id: 'neon', label: 'Neon Beyaz' },
                              { id: 'theme-original', label: 'Kenarlı Tema' },
                              { id: 'theme-filled', label: 'Dolu Tema' },
                              { id: 'theme-neon', label: 'Neon Tema' },
                              { id: 'glass', label: 'Cam Efekti' }
                            ].map((style, i) => (
                              <button
                                key={style.id}
                                onClick={() => setTop10Style(style.id as Top10Style)}
                                className={cn(
                                  "group relative w-full h-36 flex flex-col items-center justify-center gap-2 transition-all border-2 overflow-hidden",
                                  uiMode === 'modern' && "rounded-3xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  top10Style === style.id 
                                    ? "bg-white/10 border-white text-white shadow-2xl scale-[1.02]" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10 hover:border-white/20",
                                  settingsArea === 'content' && settingsFocus === 60 + i && "ring-4 ring-white scale-105 z-10 settings-focused shadow-2xl"
                                )}
                              >
                                {/* Preview Background Image */}
                                <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-all duration-500">
                                  <img 
                                    src="https://picsum.photos/seed/sample/200/300" 
                                    alt="sample" 
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                </div>

                                {/* Preview of the Number 1 */}
                                <div className="absolute -left-2 bottom-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                  <span 
                                    className="font-black italic text-8xl leading-none"
                                    style={{ 
                                      WebkitTextStroke: (style.id === 'original' || style.id === 'neon' || style.id === 'theme-original' || style.id === 'theme-neon') 
                                        ? `3px ${style.id.startsWith('theme') ? themeColor : 'rgba(255,255,255,0.9)'}` 
                                        : 'none',
                                      color: (style.id === 'original' || style.id === 'neon' || style.id === 'theme-original' || style.id === 'theme-neon') 
                                        ? 'transparent' 
                                        : (style.id === 'theme-filled' ? themeColor : 'white'),
                                      textShadow: (style.id === 'neon' || style.id === 'theme-neon')
                                        ? `0 0 25px ${themeColor}, 0 0 50px ${themeColor}` 
                                        : (style.id === 'filled' || style.id === 'theme-filled' ? '0 10px 30px rgba(0,0,0,0.8)' : 'none'),
                                      filter: style.id === 'glass' ? 'blur(1px)' : 'none'
                                    }}
                                  >
                                    1
                                  </span>
                                </div>

                                {/* Label positioned at the top-left */}
                                <div className="absolute top-3 left-3 z-10 bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 shadow-xl">
                                  <span className="text-[10px] font-black uppercase tracking-widest leading-none text-white">{style.label}</span>
                                </div>

                                {top10Style === style.id && (
                                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-2xl ring-2 ring-white/20">
                                    <Check className="w-4 h-4 text-black" />
                                  </div>
                                )}

                                {/* Hover Glow */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Profil Resmi */}
                  <section className="space-y-2">
                    <button 
                      onClick={() => toggleSection('0-7')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(7);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 7 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profil Resmi
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-7'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-7'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="flex flex-wrap gap-4 p-2">
                            {PROFILE_PICS.map((pic: string, i: number) => (
                              <button
                                key={pic}
                                onClick={() => setProfilePic(pic)}
                                onMouseEnter={() => {
                                  setSettingsArea('content');
                                  setSettingsFocus(70 + i);
                                }}
                                className={cn(
                                  "w-12 h-12 md:w-16 md:h-16 transition-all border-4 overflow-hidden flex items-center justify-center bg-zinc-900",
                                  uiMode === 'modern' && "rounded-2xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  profilePic === pic ? "border-white scale-110 shadow-xl" : "border-transparent opacity-40 hover:opacity-100",
                                  settingsArea === 'content' && settingsFocus === 70 + i && "ring-4 ring-white scale-125 z-10 opacity-100 settings-focused"
                                )}
                              >
                                {pic.startsWith('LOGO:') ? (
                                  <div className="scale-[0.3] md:scale-[0.4] whitespace-nowrap">
                                    <Logo uiMode={uiMode} logoStyle={pic.split(':')[1] as LogoStyle} />
                                  </div>
                                ) : pic.startsWith('COLOR:') ? (
                                  <div className="w-full h-full" style={{ backgroundColor: pic.split(':')[1] }} />
                                ) : pic === 'THEME_COLOR' ? (
                                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: themeColor }}>
                                    <User className="w-6 h-6 text-white" />
                                  </div>
                                ) : (
                                  <img src={pic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Cihaz Tipi */}
                  <section className="space-y-2">
                    <button 
                      onClick={() => toggleSection('0-8')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(8);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 8 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Tv className="w-4 h-4" />
                        Cihaz Tipi
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-8'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-8'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="flex flex-wrap gap-4 p-2">
                            {[
                              { id: 'phone', label: 'Telefon', icon: Smartphone },
                              { id: 'tablet', label: 'Tablet', icon: Tablet },
                              { id: 'tv', label: 'TV', icon: Tv }
                            ].map((type, i) => (
                              <button
                                key={type.id}
                                onClick={() => setDeviceType(type.id as any)}
                                onMouseEnter={() => {
                                  setSettingsArea('content');
                                  setSettingsFocus(80 + i);
                                }}
                                className={cn(
                                  "px-6 py-3 flex items-center gap-2 font-bold transition-all border-2",
                                  uiMode === 'modern' && "rounded-xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  deviceType === type.id 
                                    ? "bg-white/10 border-white text-white" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10",
                                  settingsArea === 'content' && settingsFocus === 80 + i && "ring-4 ring-white scale-105 z-10 settings-focused"
                                )}
                              >
                                <type.icon className="w-4 h-4" />
                                {type.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Dinamik Tema */}
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection('0-9')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(9);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 9 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Dinamik Tema
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-9'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-9'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="p-2">
                            <button
                              onClick={() => setDynamicThemeEnabled(!dynamicThemeEnabled)}
                              onMouseEnter={() => {
                                setSettingsArea('content');
                                setSettingsFocus(90);
                              }}
                              className={cn(
                                "w-full p-4 flex items-center justify-between transition-all border-2",
                                uiMode === 'modern' && "rounded-2xl",
                                uiMode === 'classic' && "rounded-none",
                                uiMode === 'minimalist' && "rounded-none border-0",
                                dynamicThemeEnabled ? "bg-white/10 border-white text-white" : "bg-white/5 border-transparent text-zinc-500",
                                settingsArea === 'content' && settingsFocus === 90 && "ring-4 ring-white scale-105 z-10 settings-focused"
                              )}
                            >
                              <div className="flex flex-col items-start gap-1">
                                <span className="font-bold">Dinamik Tema</span>
                                <span className="text-[10px] opacity-50">Kanal logosuna göre arayüz rengini değiştirir</span>
                              </div>
                              <div className={cn(
                                "w-12 h-6 rounded-full transition-all relative",
                                dynamicThemeEnabled ? "bg-green-500" : "bg-zinc-700"
                              )}>
                                <div className={cn(
                                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                  dynamicThemeEnabled ? "left-7" : "left-1"
                                )} />
                              </div>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Ambilight Modu */}
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection('0-10')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(10);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 10 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CircleDashed className="w-4 h-4" />
                        Ambilight Modu
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-10'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-10'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="flex flex-wrap gap-4 p-2">
                            {[
                              { id: 'none', label: 'Yok' },
                              { id: 'soft', label: 'Yumuşak' },
                              { id: 'vibrant', label: 'Canlı' },
                              { id: 'cinema', label: 'Sinema' }
                            ].map((mode, i) => (
                              <button
                                key={mode.id}
                                onClick={() => setAmbilightMode(mode.id as any)}
                                onMouseEnter={() => {
                                  setSettingsArea('content');
                                  setSettingsFocus(100 + i);
                                }}
                                className={cn(
                                  "px-6 py-3 font-bold transition-all border-2",
                                  uiMode === 'modern' && "rounded-xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  ambilightMode === mode.id 
                                    ? "bg-white/10 border-white text-white" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10",
                                  settingsArea === 'content' && settingsFocus === 100 + i && "ring-4 ring-white scale-105 z-10 settings-focused"
                                )}
                              >
                                {mode.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Karışık Renkler */}
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection('0-11')}
                      onMouseEnter={() => {
                        setSettingsArea('sections');
                        setSettingsSection(11);
                      }}
                      className={cn(
                        "w-full text-left text-zinc-400 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all p-3",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none border-l-4 border-zinc-700 bg-zinc-900/50",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-transparent px-0",
                        settingsArea === 'sections' && settingsSection === 11 ? "bg-white/10 text-white ring-2 ring-white/20 settings-focused" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Karışık Renkler
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections['0-11'] ? "rotate-180" : "rotate-0")} />
                    </button>
                    <AnimatePresence>
                      {expandedSections['0-11'] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="space-y-6 p-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Renk 1</label>
                                <input 
                                  type="color" 
                                  value={mixColor1}
                                  onChange={(e) => setMixColor1(e.target.value)}
                                  onMouseEnter={() => {
                                    setSettingsArea('content');
                                    setSettingsFocus(17);
                                  }}
                                  className={cn(
                                    "w-full h-12 bg-transparent cursor-pointer",
                                    settingsArea === 'content' && settingsFocus === 17 && "ring-4 ring-white scale-105 z-10 settings-focused"
                                  )}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Renk 2</label>
                                <input 
                                  type="color" 
                                  value={mixColor2}
                                  onChange={(e) => setMixColor2(e.target.value)}
                                  onMouseEnter={() => {
                                    setSettingsArea('content');
                                    setSettingsFocus(18);
                                  }}
                                  className={cn(
                                    "w-full h-12 bg-transparent cursor-pointer",
                                    settingsArea === 'content' && settingsFocus === 18 && "ring-4 ring-white scale-105 z-10 settings-focused"
                                  )}
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => setThemeColor(mixedColor)}
                              className={cn(
                                "w-full py-4 font-black uppercase tracking-widest transition-all border-2",
                                uiMode === 'modern' && "rounded-2xl",
                                uiMode === 'classic' && "rounded-none",
                                uiMode === 'minimalist' && "rounded-none border-0",
                                "bg-white/10 border-white text-white hover:bg-white/20",
                                settingsArea === 'content' && settingsFocus === 19 && "ring-4 ring-white scale-105 z-10 settings-focused"
                              )}
                              style={{ borderLeftColor: mixColor1, borderRightColor: mixColor2 }}
                            >
                              Renkleri Karıştır ve Uygula
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                </motion.div>
              )}

              {/* Tab 1: Liste */}
              {activeSettingsTab === 1 && (
                <motion.div 
                  key="tab-1"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 pb-10"
                >
                  {/* Playlist Ekleme */}
                  <section className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">Playlist Ekle</h3>
                      <p className="text-zinc-600 text-[9px] px-1">M3U URL or Cutt.ly/T.ly link/code supported</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPlaylistUrl}
                        onChange={(e) => setNewPlaylistUrl(e.target.value)}
                        placeholder="M3U URL (Örn: eyuptv.m3u)"
                        className={cn(
                          "flex-1 bg-white/5 border-2 border-transparent px-4 py-3 text-white transition-all outline-none",
                          uiMode === 'modern' && "rounded-xl",
                          uiMode === 'classic' && "rounded-none",
                          uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                          settingsArea === 'content' && settingsFocus === 100 && "bg-white/10 border-white ring-4 ring-white/20 settings-focused"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (newPlaylistUrl) {
                              addPlaylist(newPlaylistName || 'Yeni Liste', newPlaylistUrl);
                              setNewPlaylistUrl('');
                              setNewPlaylistName('');
                              showToast('Playlist eklendi!', 'success');
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newPlaylistUrl) {
                            addPlaylist(newPlaylistName || 'Yeni Liste', newPlaylistUrl);
                            setNewPlaylistUrl('');
                            setNewPlaylistName('');
                            showToast('Playlist eklendi!', 'success');
                          }
                        }}
                        onMouseEnter={() => {
                          setSettingsArea('content');
                          setSettingsFocus(101);
                        }}
                        className={cn(
                          "px-6 py-3 font-black uppercase tracking-widest transition-all",
                          uiMode === 'modern' && "rounded-xl",
                          uiMode === 'classic' && "rounded-none",
                          uiMode === 'minimalist' && "rounded-none border-0",
                          "bg-white text-black hover:bg-zinc-200",
                          settingsArea === 'content' && settingsFocus === 101 && "ring-4 ring-white scale-105 z-10 settings-focused"
                        )}
                      >
                        Ekle
                      </button>
                    </div>
                  </section>

                  {/* Playlists Listesi */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">Mevcut Listeler</h3>
                      <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-full text-zinc-400">{playlists.length} Liste</span>
                    </div>
                    <div className="space-y-2">
                      {playlists.map((pl, i) => (
                        <div
                          key={pl.id}
                          onClick={() => {
                            setCurrentPlaylistId(pl.id);
                            setPlaylistUrl(pl.url);
                            if (pl.epgUrl) setEpgUrl(pl.epgUrl);
                            showToast(`${pl.name} seçildi, yükleniyor...`, 'info');
                          }}
                          onMouseEnter={() => {
                            setSettingsArea('content');
                            setSettingsFocus(110 + i);
                          }}
                          className={cn(
                            "flex items-center justify-between p-4 transition-all cursor-pointer group",
                            uiMode === 'modern' && "rounded-xl bg-white/5 hover:bg-white/10",
                            uiMode === 'classic' && "rounded-none bg-zinc-900 border-l-4 border-zinc-700 hover:bg-zinc-800",
                            uiMode === 'minimalist' && "rounded-none bg-transparent border-b border-white/10 hover:bg-white/5",
                            currentPlaylistId === pl.id && (uiMode === 'modern' ? "bg-white/20 border-white/20 ring-2 ring-white/50" : "border-l-white bg-zinc-800"),
                            settingsArea === 'content' && settingsFocus === 110 + i && "bg-white/10 ring-4 ring-white/20 settings-focused scale-[1.02]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                              currentPlaylistId === pl.id ? "bg-green-500 scale-110 shadow-[0_0_15px_rgba(34,197,94,0.5)]" : "bg-white/5 group-hover:bg-white/20"
                            )}>
                              {currentPlaylistId === pl.id ? <Check className="w-5 h-5 text-white" /> : <ListIcon className="w-4 h-4 text-zinc-500 group-hover:text-white" />}
                            </div>
                            <div className="flex flex-col">
                              <span className={cn("font-bold text-sm truncate max-w-[200px]", currentPlaylistId === pl.id ? "text-white" : "text-zinc-300")}>{pl.name}</span>
                              <span className="text-[10px] text-zinc-500">{pl.channelCount || pl.channels?.length || 0} Kanal</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => refreshPlaylist(pl.id)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePlaylist(pl.id)}
                              className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* EPG Ayarları */}
                  <section className="space-y-2">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">EPG Kaynağı</h3>
                    <input
                      type="text"
                      defaultValue={epgUrl}
                      onMouseEnter={() => {
                        setSettingsArea('content');
                        setSettingsFocus(120);
                      }}
                      placeholder="EPG XML URL"
                      className={cn(
                        "w-full bg-white/5 border-2 border-transparent px-4 py-3 text-white transition-all outline-none",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                        settingsArea === 'content' && settingsFocus === 120 && "bg-white/10 border-white ring-4 ring-white/20 settings-focused"
                      )}
                      onBlur={(e) => updateEPG(e.target.value)}
                    />
                  </section>
                </motion.div>
              )}

              {/* Tab 2: Genel */}
              {activeSettingsTab === 2 && (
                <motion.div 
                  key="tab-2"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 pb-10"
                >
                  {/* Derleme Altyapısı / Build Settings */}
                  <section className="space-y-2">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">Derleme & Altyapı Ayarları</h3>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Settings className="w-3 h-3 text-zinc-400" />
                          HEDEF SİSTEM (BUILD TARGET)
                        </label>
                        <div className="flex bg-black/40 p-1 rounded-xl">
                          <button
                            onClick={() => {
                              setBuildMethod('web');
                              showToast('Derleme hedefi Web (PWA) olarak ayarlandı.', 'info');
                            }}
                            onMouseEnter={() => {
                              setSettingsArea('content');
                              setSettingsFocus(60);
                            }}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer",
                              buildMethod === 'web' 
                                ? "bg-white text-black font-black" 
                                : "text-zinc-500 hover:text-white",
                              settingsArea === 'content' && settingsFocus === 60 && "ring-4 ring-white scale-105 z-10 settings-focused"
                            )}
                          >
                            Web (PWA)
                          </button>
                          <button
                            onClick={() => {
                              setBuildMethod('android');
                              showToast('Derleme hedefi Android (Capacitor APK) olarak ayarlandı.', 'success');
                            }}
                            onMouseEnter={() => {
                              setSettingsArea('content');
                              setSettingsFocus(61);
                            }}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5",
                              buildMethod === 'android' 
                                ? "bg-green-500 text-white font-black shadow-lg shadow-green-500/20" 
                                : "text-zinc-500 hover:text-white",
                              settingsArea === 'content' && settingsFocus === 61 && "ring-4 ring-white scale-105 z-10 settings-focused"
                            )}
                          >
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            Android (APK)
                          </button>
                        </div>
                      </div>

                      {buildMethod === 'android' ? (
                        <div className="bg-green-500/5 border border-green-500/20 p-3.5 rounded-xl space-y-3">
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-400" />
                            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Android Derlemesi Aktif</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed font-semibold">
                            Uygulamanın build altyapısı ve tüm paket tanımları <strong className="text-white">Android (Capacitor/Chorege)</strong> uyumluluk standartlarına yükseltildi. Capacitor native kütüphaneleri etkinleştirilerek CORS sınırları kaldırıldı.
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[9px]">
                            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                              <span className="text-zinc-500 block uppercase tracking-wider font-bold">YAPI ALTYAPISI</span>
                              <span className="text-white font-mono font-bold block mt-0.5">Capacitor Android</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                              <span className="text-zinc-500 block uppercase tracking-wider font-bold">API KÖPRÜSÜ</span>
                              <span className="text-white font-mono font-bold block mt-0.5">CapacitorHttp v6</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-500/5 border border-blue-500/20 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-400" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Standart Web Sürümü</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed font-semibold">
                            Uygulama standart tarayıcılarda çalışacak şekilde derlenir. Tarayıcı CORS önlemleri nedeniyle bazı IPTV listelerinde proxy kullanılmasını gerektirebilir.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Son Dakika Haber Kaynakları (RSS) */}
                  <section className="space-y-2">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">RSS HABER AKIŞI KAYNAKLARI</h3>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-4">
                      <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                        Canlı skor ve son dakika barlarında gösterilecek haber içeriklerini buradan özelleştirebilirsiniz. RSS veya Atom destekli XML bağlantılarını ekleyebilirsiniz.
                      </p>

                      {/* URL Ekleme Formu */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Globe className="w-3 h-3 text-zinc-400" />
                          YENİ RSS ADRESİ EKLE
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newRssUrl}
                            onChange={(e) => setNewRssUrl(e.target.value)}
                            onMouseEnter={() => {
                              setSettingsArea('content');
                              setSettingsFocus(70);
                            }}
                            placeholder="https://example.com/rss.xml"
                            className={cn(
                              "flex-1 bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white rounded-xl outline-none focus:border-green-500 focus:bg-white/10 transition-all font-semibold",
                              settingsArea === 'content' && settingsFocus === 70 && "bg-white/10 border-white ring-4 ring-white/20 settings-focused"
                            )}
                          />
                          <button
                            onClick={() => {
                              if (!newRssUrl.trim()) return;
                              if (!newRssUrl.startsWith('http://') && !newRssUrl.startsWith('https://')) {
                                showToast('Lütfen geçerli bir http:// veya https:// bağlantısı girin.', 'error');
                                  return;
                                }
                                if (customRssUrls.includes(newRssUrl.trim())) {
                                  showToast('Bu RSS kaynağı zaten listenizde mevcut.', 'info');
                                  return;
                                }
                                setCustomRssUrls([...customRssUrls, newRssUrl.trim()]);
                                setNewRssUrl('');
                                showToast('RSS Haber kaynağı başarıyla eklendi!', 'success');
                              }}
                              onMouseEnter={() => {
                                setSettingsArea('content');
                                setSettingsFocus(71);
                              }}
                              className={cn(
                                "bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0",
                                settingsArea === 'content' && settingsFocus === 71 && "ring-4 ring-white scale-105 z-10 settings-focused"
                              )}
                            >
                              <Plus className="w-4 h-4" />
                              EKLE
                            </button>
                          </div>
                        </div>

                        {/* Mevcut Kaynaklar Listesi */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <ListIcon className="w-3 h-3 text-zinc-400" />
                            AKTİF HABER KAYNAKLARI ({customRssUrls ? customRssUrls.length : 0})
                          </label>
                          {!customRssUrls || customRssUrls.length === 0 ? (
                            <div className="bg-black/20 p-4 text-center rounded-xl border border-white/5">
                              <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">Tanımlı RSS adresi yok. Varsayılanlar kullanılacak.</span>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                              {customRssUrls.map((url, index) => (
                                <div key={url + index} className="flex items-center justify-between bg-black/35 p-2 px-3 rounded-xl border border-white/5 group">
                                  <span className="text-[10px] text-zinc-300 font-mono font-bold truncate flex-1 mr-3">{url}</span>
                                  <button
                                    onClick={() => {
                                      const updated = customRssUrls.filter((_, i) => i !== index);
                                      setCustomRssUrls(updated);
                                      showToast('RSS Kaynağı başarıyla silindi.', 'info');
                                    }}
                                    className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                                    title="Kaynağı Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Varsayılana Sıfırla Butonu */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setCustomRssUrls([
                                'https://www.trtspor.com.tr/rss.xml',
                                'https://www.ntvspor.net/rss'
                              ]);
                              showToast('Haber kaynakları varsayılan TRT Spor & NTV Spor olarak sıfırlandı.', 'success');
                            }}
                            onMouseEnter={() => {
                              setSettingsArea('content');
                              setSettingsFocus(75);
                            }}
                            className={cn(
                              "text-[9px] font-black text-zinc-400 hover:text-white uppercase tracking-wider bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 transition-all cursor-pointer flex items-center gap-1.5",
                              settingsArea === 'content' && settingsFocus === 75 && "ring-4 ring-white settings-focused"
                            )}
                          >
                            <RefreshCw className="w-3 h-3" />
                            VARSAYILANLARI YÜKLE
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Playlist Yönetimi */}
                  <section className="space-y-2">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">Bağlantı</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Globe className="w-3 h-3" />
                          Özel Proxy URL
                        </label>
                        <input
                          type="text"
                          value={customProxyUrl}
                          onChange={(e) => setCustomProxyUrl(e.target.value)}
                          onMouseEnter={() => {
                            setSettingsArea('content');
                            setSettingsFocus(0);
                          }}
                          placeholder="https://proxy.example.com/?url="
                          className={cn(
                            "w-full bg-white/5 border-2 border-transparent px-4 py-3 text-white transition-all outline-none",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                            settingsArea === 'content' && settingsFocus === 0 && "bg-white/10 border-white ring-4 ring-white/20 settings-focused"
                          )}
                        />
                      </div>

                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Download className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <h4 className="text-white font-black uppercase italic tracking-tight">Android Uygulaması (APK)</h4>
                                <p className="text-zinc-500 text-[10px]">Cihazınıza doğrudan kurun (PWA)</p>
                              </div>
                            </div>
                            {installPrompt && !(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) ? (
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  onClick={async () => {
                                    if (!installPrompt) return;
                                    try {
                                      // Use prompt() directly
                                      await installPrompt.prompt();
                                      const { outcome } = await installPrompt.userChoice;
                                      if (outcome === 'accepted') {
                                        setInstallPrompt(null);
                                        showToast("Yükleme başlatıldı!", "success");
                                      }
                                    } catch (e) {
                                      console.error("Install prompt error:", e);
                                      showToast("Yükleme başlatılamadı. Lütfen manuel kurun.", "error");
                                    }
                                  }}
                                  className={cn(
                                    "px-6 py-2.5 bg-blue-500 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all",
                                    settingsArea === 'content' && settingsFocus === 50 && "scale-110 shadow-lg shadow-blue-500/40 settings-focused"
                                  )}
                                  onMouseEnter={() => setSettingsFocus(50)}
                                >
                                  YÜKLE
                                </button>
                                {window.self !== window.top && (
                                  <span className="text-[8px] text-orange-400 font-bold uppercase animate-pulse text-right">Çerçeve İçinde Çalışıyor</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                  <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">
                                    {(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) ? "YÜKLÜ" : "UYUMLU"}
                                  </span>
                                </div>
                                {window.self !== window.top && !installPrompt && (
                                  <button
                                    onClick={() => window.open(window.location.href, '_blank')}
                                    className="px-4 py-1.5 bg-orange-500/20 border border-orange-500/40 rounded-lg text-orange-400 text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all text-right"
                                  >
                                    YENİ SEKMEDE AÇ VE KUR
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {!installPrompt && (
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                              <div className="flex items-center gap-2 text-zinc-400">
                                <Info className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Manuel Kurulum Rehberi</span>
                              </div>
                              
                              {window.self !== window.top && (
                                <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg">
                                  <p className="text-orange-400 text-[9px] font-bold leading-tight">
                                    DİKKAT: Uygulama bir çerçeve (iframe) içinde çalışıyor. Yükleme butonunun çalışması için sağ üstteki "Yeni Sekmede Aç" butonuna tıklayarak uygulamayı ayrı sekmede açmalısınız.
                                  </p>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-3 text-[9px] text-zinc-500">
                                <div className="space-y-1">
                                  <p className="text-white font-bold opacity-80 uppercase tracking-tighter italic">Android / Chrome</p>
                                  <p>1. Sağ üstteki üç noktaya tıklayın.</p>
                                  <p>2. "Uygulamayı Yükle" veya "Ana Ekrana Ekle" seçeneğini seçin.</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-white font-bold opacity-80 uppercase tracking-tighter italic">iOS / Safari</p>
                                  <p>1. Alt kısımdaki Paylaş butonuna tıklayın.</p>
                                  <p>2. "Ana Ekrana Ekle" seçeneğini seçin.</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}

              {/* Tab 2: Kumanda */}
              {activeSettingsTab === 3 && (
                <motion.div 
                  key="tab-3"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 pb-10"
                >
                  <section className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
                    <div className={cn(
                      "w-20 h-20 flex items-center justify-center bg-white/10 rounded-full mb-4",
                      pairingStatus === 'connected' && "bg-green-500/20 text-green-500",
                      pairingStatus === 'pairing' && "animate-pulse bg-blue-500/20 text-blue-500"
                    )}>
                      <Smartphone className="w-10 h-10" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black uppercase tracking-tighter">
                        {pairingStatus === 'connected' ? 'Kumanda Bağlı' : 'Kumanda Bağla'}
                      </h3>
                      <p className="text-zinc-500 text-sm max-w-[300px]">
                        {pairingStatus === 'connected' 
                          ? 'Cihazınız başarıyla eşleşti. Artık telefonunuzu kumanda olarak kullanabilirsiniz.'
                          : 'Telefonunuzu kumanda olarak kullanmak için QR kodu taratın veya kodu girin.'}
                      </p>
                    </div>

                    {pairingStatus !== 'connected' && pairingCode && (
                      <div className="space-y-6 w-full max-w-[280px]">
                        <div className="p-4 bg-white rounded-2xl shadow-2xl">
                          <QRCodeCanvas 
                            value={`${window.location.origin}/remote?code=${pairingCode}`}
                            size={240}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                        
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Eşleşme Kodu</span>
                          <div className="flex gap-2">
                            {pairingCode.split('').map((char, i) => (
                              <div key={i} className="w-10 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl font-black border border-white/10">
                                {char}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {pairingStatus === 'connected' && (
                      <button
                        onClick={() => {
                          // Disconnect logic would go here
                        }}
                        className={cn(
                          "px-8 py-4 bg-red-500 text-white font-black uppercase tracking-widest transition-all hover:bg-red-600",
                          uiMode === 'modern' && "rounded-2xl",
                          uiMode === 'classic' && "rounded-none",
                          uiMode === 'minimalist' && "rounded-none",
                          settingsArea === 'content' && settingsFocus === 200 && "ring-4 ring-white scale-105 z-10 settings-focused"
                        )}
                      >
                        Bağlantıyı Kes
                      </button>
                    )}
                  </section>
                </motion.div>
              )}

              {/* Tab 4: AI Gözcü */}
              {activeSettingsTab === 4 && (
                <motion.div 
                  key="tab-4"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 pb-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Toggles Group */}
                    <div className="space-y-4">
                      <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">Yapay Zeka Özellikleri</h3>
                      
                      <button
                        onClick={() => setCinemaModeEnabled(!cinemaModeEnabled)}
                        onMouseEnter={() => {
                          setSettingsArea('content');
                          setSettingsFocus(0);
                        }}
                        className={cn(
                          "w-full p-4 flex items-center justify-between transition-all border-2",
                          uiMode === 'modern' && "rounded-2xl",
                          uiMode === 'classic' && "rounded-none",
                          uiMode === 'minimalist' && "rounded-none border-0",
                          cinemaModeEnabled ? "bg-white/10 border-white text-white" : "bg-white/5 border-transparent text-zinc-500",
                          settingsArea === 'content' && settingsFocus === 0 && "ring-4 ring-white scale-105 z-10 settings-focused"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-sm">Akıllı VOD</span>
                            <span className="text-[9px] opacity-50">Sinematik detay sayfası</span>
                          </div>
                        </div>
                        <div className={cn("w-10 h-5 rounded-full transition-all relative", cinemaModeEnabled ? "bg-green-500" : "bg-zinc-700")}>
                          <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", cinemaModeEnabled ? "left-6" : "left-1")} />
                        </div>
                      </button>

                      <button
                        onClick={() => setVoiceControlEnabled(!voiceControlEnabled)}
                        onMouseEnter={() => {
                          setSettingsArea('content');
                          setSettingsFocus(1);
                        }}
                        className={cn(
                          "w-full p-4 flex items-center justify-between transition-all border-2",
                          uiMode === 'modern' && "rounded-2xl",
                          uiMode === 'classic' && "rounded-none",
                          uiMode === 'minimalist' && "rounded-none border-0",
                          voiceControlEnabled ? "bg-white/10 border-white text-white" : "bg-white/5 border-transparent text-zinc-500",
                          settingsArea === 'content' && settingsFocus === 1 && "ring-4 ring-white scale-105 z-10 settings-focused"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Mic className="w-4 h-4 text-blue-400" />
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-sm">Sesli Kontrol</span>
                            <span className="text-[9px] opacity-50">Sesle kanal & arama</span>
                          </div>
                        </div>
                        <div className={cn("w-10 h-5 rounded-full transition-all relative", voiceControlEnabled ? "bg-blue-500" : "bg-zinc-700")}>
                          <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", voiceControlEnabled ? "left-6" : "left-1")} />
                        </div>
                      </button>

                      <button
                        onClick={() => setSportsTickerEnabled(!sportsTickerEnabled)}
                        onMouseEnter={() => {
                          setSettingsArea('content');
                          setSettingsFocus(2);
                        }}
                        className={cn(
                          "w-full p-4 flex items-center justify-between transition-all border-2",
                          uiMode === 'modern' && "rounded-2xl",
                          uiMode === 'classic' && "rounded-none",
                          uiMode === 'minimalist' && "rounded-none border-0",
                          sportsTickerEnabled ? "bg-white/10 border-white text-white" : "bg-white/5 border-transparent text-zinc-500",
                          settingsArea === 'content' && settingsFocus === 2 && "ring-4 ring-white scale-105 z-10 settings-focused"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-sm">Canlı Skor Bandı</span>
                            <span className="text-[9px] opacity-50">Alt kısımda anlık skorlar</span>
                          </div>
                        </div>
                        <div className={cn("w-10 h-5 rounded-full transition-all relative", sportsTickerEnabled ? "bg-green-500" : "bg-zinc-700")}>
                          <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", sportsTickerEnabled ? "left-6" : "left-1")} />
                        </div>
                      </button>

                      <button
                        onClick={() => setNewsTickerEnabled(!newsTickerEnabled)}
                        onMouseEnter={() => {
                          setSettingsArea('content');
                          setSettingsFocus(3);
                        }}
                        className={cn(
                          "w-full p-4 flex items-center justify-between transition-all border-2",
                          uiMode === 'modern' && "rounded-2xl",
                          uiMode === 'classic' && "rounded-none",
                          uiMode === 'minimalist' && "rounded-none border-0",
                          newsTickerEnabled ? "bg-white/10 border-white text-white" : "bg-white/5 border-transparent text-zinc-500",
                          settingsArea === 'content' && settingsFocus === 3 && "ring-4 ring-white scale-105 z-10 settings-focused"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-emerald-400" />
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-sm">Canlı Haber Bandı</span>
                            <span className="text-[9px] opacity-50">Alt kısımda anlık haberler</span>
                          </div>
                        </div>
                        <div className={cn("w-10 h-5 rounded-full transition-all relative", newsTickerEnabled ? "bg-emerald-500" : "bg-zinc-700")}>
                          <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", newsTickerEnabled ? "left-6" : "left-1")} />
                        </div>
                      </button>

                      <button
                        onClick={() => setTmdbEnabled(!tmdbEnabled)}
                        onMouseEnter={() => {
                          setSettingsArea('content');
                          setSettingsFocus(4);
                        }}
                        className={cn(
                          "w-full p-4 flex items-center justify-between transition-all border-2",
                          uiMode === 'modern' && "rounded-2xl",
                          uiMode === 'classic' && "rounded-none",
                          uiMode === 'minimalist' && "rounded-none border-0",
                          tmdbEnabled ? "bg-white/10 border-white text-white" : "bg-white/5 border-transparent text-zinc-500",
                          settingsArea === 'content' && settingsFocus === 4 && "ring-4 ring-white scale-105 z-10 settings-focused"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-blue-400" />
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-sm">TMDB Verisi</span>
                            <span className="text-[9px] opacity-50">Afiş ve detay çekme</span>
                          </div>
                        </div>
                        <div className={cn("w-10 h-5 rounded-full transition-all relative", tmdbEnabled ? "bg-blue-500" : "bg-zinc-700")}>
                          <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", tmdbEnabled ? "left-6" : "left-1")} />
                        </div>
                      </button>
                    </div>

                    {/* API Keys Group */}
                    <div className="space-y-4">
                      <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">API Yapılandırması</h3>
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Gemini API Anahtarı
                        </label>
                        <div className="relative group">
                          <input
                            type="password"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            onMouseEnter={() => {
                              setSettingsArea('content');
                              setSettingsFocus(5);
                            }}
                            placeholder="Gemini API Key"
                            className={cn(
                              "w-full bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white transition-all outline-none",
                              uiMode === 'modern' && "rounded-xl focus:bg-white/10",
                              uiMode === 'classic' && "rounded-none focus:bg-zinc-900",
                              uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                              settingsArea === 'content' && settingsFocus === 5 && "bg-white/10 border-white ring-2 ring-white/20 settings-focused"
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Key className="w-3 h-3 text-blue-400" />
                          TMDB API Anahtarı
                        </label>
                        <div className="relative group">
                          <input
                            type="password"
                            value={tmdbApiKey}
                            onChange={(e) => setTmdbApiKey(e.target.value)}
                            onMouseEnter={() => {
                              setSettingsArea('content');
                              setSettingsFocus(6);
                            }}
                            placeholder="TMDB API Key"
                            className={cn(
                              "w-full bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white transition-all outline-none",
                              uiMode === 'modern' && "rounded-xl focus:bg-white/10",
                              uiMode === 'classic' && "rounded-none focus:bg-zinc-900",
                              uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                              settingsArea === 'content' && settingsFocus === 6 && "bg-white/10 border-white ring-2 ring-white/20 settings-focused"
                            )}
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <p className="text-[9px] text-blue-400 font-medium leading-relaxed italic">
                          * AI özellikleri için Gemini API anahtarı gereklidir. Anahtarınız yoksa varsayılan modda çalışır.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 5: Tuş Atamaları */}
              {activeSettingsTab === 5 && (
                <motion.div 
                  key="tab-5"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5 pb-10"
                >
                  <section className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-xl font-black uppercase tracking-tighter text-white">Tuş Atamaları</h3>
                      <p className="text-zinc-500 text-xs text-balance">Uygulama genelinde kullanılacak kumanda ve klavye tuşlarını özelleştirebilirsiniz. Değiştirmek istediğiniz tuşun üzerine tıklayıp yeni tuşa basın.</p>
                    </div>

                    {[
                      { title: 'Navigasyon Kontrolleri', keys: ['up', 'down', 'left', 'right', 'enter', 'back'] },
                      { title: 'Oynatıcı Kontrolleri', keys: ['playPause', 'channelUp', 'channelDown', 'volumeUp', 'volumeDown'] },
                      { title: 'Kısayollar & Menüler', keys: ['settings', 'guide', 'voice', 'miniPlayer'] }
                    ].map((group, groupIdx) => (
                      <div key={group.title} className="space-y-4">
                        <div className="flex items-center gap-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 whitespace-nowrap">{group.title}</h4>
                          <div className="h-px w-full bg-white/5" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {group.keys.map((action, i) => {
                            const actualIdx = (groupIdx === 0 ? 0 : groupIdx === 1 ? 6 : 11) + i;
                            return (
                              <button 
                                key={action}
                                disabled={capturingKey !== null}
                                onClick={() => setCapturingKey(action)}
                                onMouseEnter={() => {
                                  setSettingsArea('content');
                                  setSettingsFocus(300 + actualIdx);
                                }}
                                className={cn(
                                  "flex items-center justify-between p-4 bg-white/5 border-2 border-transparent transition-all group relative overflow-hidden",
                                  uiMode === 'modern' && "rounded-2xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                                  settingsArea === 'content' && settingsFocus === 300 + actualIdx ? "bg-white/10 border-white ring-4 ring-white/20 settings-focused shadow-2xl scale-[1.01] z-10" : "hover:bg-white/5",
                                  capturingKey === action && "animate-pulse border-white/50 bg-white/20"
                                )}
                              >
                                <div className={cn(
                                  "absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000",
                                  capturingKey === action && "translate-x-0 animate-shimmer"
                                )} />
                                
                                <div className="flex flex-col items-start text-left shrink-0">
                                  <span className="font-bold text-sm text-white group-hover:text-white transition-colors capitalize">
                                    {action === 'up' ? 'Yukarı' : 
                                     action === 'down' ? 'Aşağı' : 
                                     action === 'left' ? 'Sol' : 
                                     action === 'right' ? 'Sağ' : 
                                     action === 'enter' ? 'Seç / Tamam' : 
                                     action === 'back' ? 'Geri / Çık' : 
                                     action === 'settings' ? 'Ayarlar Menüsü' : 
                                     action === 'guide' ? 'TV Rehberi' : 
                                     action === 'voice' ? 'Sesli Arama' : 
                                     action === 'miniPlayer' ? 'Mini Oynatıcı' : 
                                     action === 'playPause' ? 'Oynat / Durdur' : 
                                     action === 'volumeUp' ? 'Sesi Artır' : 
                                     action === 'volumeDown' ? 'Sesi Azalt' : 
                                     action === 'channelUp' ? 'Sonraki Kanal' : 
                                     action === 'channelDown' ? 'Önceki Kanal' : action}
                                  </span>
                                </div>
                                
                                <div className={cn(
                                  "px-4 py-2 border-2 transition-all min-w-[80px] flex items-center justify-center font-mono font-black text-xs uppercase",
                                  uiMode === 'modern' && "rounded-xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  capturingKey === action 
                                    ? "bg-white text-black border-white animate-bounce" 
                                    : "bg-white/10 border-white/20 text-white/80 group-hover:bg-white/20 group-hover:border-white/40"
                                )}>
                                  {capturingKey === action ? '???' : (keyMap as any)[action]}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        setKeyMap(DEFAULT_KEY_MAP);
                        showToast('Tüm tuş atamaları varsayılana döndürüldü.', 'info');
                      }}
                      onMouseEnter={() => {
                        setSettingsArea('content');
                        setSettingsFocus(350);
                      }}
                      className={cn(
                        "w-full p-5 flex items-center justify-center gap-3 transition-all border-2 font-black uppercase tracking-[0.2em] text-xs",
                        uiMode === 'modern' && "rounded-2xl shadow-xl",
                        uiMode === 'classic' && "rounded-none",
                        uiMode === 'minimalist' && "rounded-none border-0",
                        "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white mt-4 disabled:opacity-50 disabled:pointer-events-none",
                        settingsArea === 'content' && settingsFocus === 350 ? "ring-8 ring-red-500/20 scale-[1.02] z-10 bg-red-500 text-white border-white settings-focused shadow-2xl" : "hover:bg-red-500 hover:border-red-500"
                      )}
                      disabled={capturingKey !== null}
                    >
                      <RefreshCw className={cn("w-4 h-4", capturingKey && "animate-spin")} />
                      Varsayılana Dön
                    </button>
                  </section>
                </motion.div>
              )}

              <AnimatePresence>
                {capturingKey && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-8 text-center"
                  >
                    <div className="max-w-md space-y-8">
                      <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto animate-pulse">
                        <Key className="w-12 h-12 text-white" />
                      </div>
                      <div className="space-y-4">
                        <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-tight">YENİ TUŞ ATANIYOR</h2>
                        <p className="text-xl font-bold text-white/60 capitalize">
                          "{capturingKey === 'up' ? 'Yukarı' : 
                            capturingKey === 'down' ? 'Aşağı' : 
                            capturingKey === 'left' ? 'Sol' : 
                            capturingKey === 'right' ? 'Sağ' : 
                            capturingKey === 'enter' ? 'Seç / Tamam' : 
                            capturingKey === 'back' ? 'Geri / Çık' : 
                            capturingKey === 'settings' ? 'Ayarlar Menüsü' : 
                            capturingKey === 'guide' ? 'TV Rehberi' : 
                            capturingKey === 'voice' ? 'Sesli Arama' : 
                            capturingKey === 'miniPlayer' ? 'Mini Oynatıcı' : 
                            capturingKey === 'playPause' ? 'Oynat / Durdur' : 
                            capturingKey === 'volumeUp' ? 'Sesi Artır' : 
                            capturingKey === 'volumeDown' ? 'Sesi Azalt' : 
                            capturingKey === 'channelUp' ? 'Sonraki Kanal' : 
                            capturingKey === 'channelDown' ? 'Önceki Kanal' : capturingKey}" eylemi için kumandanızdan veya klavyenizden bir tuşa basın.
                        </p>
                      </div>
                      <button 
                        onClick={() => setCapturingKey(null)}
                        className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                      >
                        İPTAL ET
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
