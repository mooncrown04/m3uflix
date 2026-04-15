import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Sun, List as ListIcon, Settings, Smartphone, 
  ChevronLeft, ChevronRight, ChevronDown, Plus, 
  Check, Tv, Grid, Equal, Monitor, Tablet, 
  User, Link as LinkIcon, Link2, RefreshCw, Trash2,
  Bell, FastForward, Mic, MicOff, Key, Globe, Mail,
  ExternalLink, CircleDashed, Activity, Sparkles, Copy,
  Clock
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../../lib/utils';
import { Playlist, UIMode, LogoStyle, Top10Style, FocusEffect } from '../../types';
import { useSettings } from '../../hooks/useSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any; // From useSettings hook
  playlists: Playlist[];
  setPlaylists: (playlists: Playlist[]) => void;
  currentPlaylistId: string | null;
  setCurrentPlaylistId: (id: string | null) => void;
  loadPlaylist: (url: string, epgUrl?: string) => Promise<void>;
  isLoading: boolean;
  setNavContext: (context: any) => void;
  setActiveRow: (row: number) => void;
  setActiveCol: (col: number) => void;
  newPlaylistName: string;
  setNewPlaylistName: (name: string) => void;
  newPlaylistUrl: string;
  setNewPlaylistUrl: (url: string) => void;
  playlistUrl: string;
  setPlaylistUrl: (url: string) => void;
  epgUrl: string;
  setEpgUrl: (url: string) => void;
  extraUrl: string;
  setExtraUrl: (url: string) => void;
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
  pairingCode: string | null;
  pairingStatus: 'idle' | 'pairing' | 'connected' | 'error';
  onAddPlaylist: (url: string) => void;
  onRefreshPlaylist: (id: string) => void;
  onDeletePlaylist: (id: string) => void;
  onUpdateEPG: (url: string) => void;
  themeColor: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  playlists,
  setPlaylists,
  currentPlaylistId,
  setCurrentPlaylistId,
  loadPlaylist,
  isLoading,
  setNavContext,
  setActiveRow,
  setActiveCol,
  newPlaylistName,
  setNewPlaylistName,
  newPlaylistUrl,
  setNewPlaylistUrl,
  playlistUrl,
  setPlaylistUrl,
  epgUrl,
  setEpgUrl,
  extraUrl,
  setExtraUrl,
  showToast,
  pairingCode,
  pairingStatus,
  onAddPlaylist,
  onRefreshPlaylist,
  onDeletePlaylist,
  onUpdateEPG,
  themeColor
}) => {
  const settingsSidebarRef = useRef<HTMLDivElement>(null);
  const settingsContentRef = useRef<HTMLDivElement>(null);

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
    tmdbEnabled, setTmdbEnabled,
    tmdbApiKey, setTmdbApiKey,
    geminiApiKey, setGeminiApiKey,
    customProxyUrl, setCustomProxyUrl,
    playerEngine, setPlayerEngine,
    ambilightMode, setAmbilightMode,
    activeSettingsTab, setActiveSettingsTab,
    settingsArea, setSettingsArea,
    settingsSection, setSettingsSection,
    settingsFocus, setSettingsFocus,
    sidebarFocus, setSidebarFocus,
    expandedSections, setExpandedSections,
    toggleSection,
    mixColor1, setMixColor1,
    mixColor2, setMixColor2,
    mixedColor,
    PROFILE_PICS
  } = settings;

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
      const key = e.key;

      switch (key) {
        case 'Enter':
        case 'OK':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            if (sidebarFocus <= 3) {
              if (sidebarFocus === 3) {
                setSettingsArea('content');
                setSettingsSection(0);
                setSettingsFocus(100);
              } else {
                setSettingsArea('sections');
                setSettingsSection(0);
                const key = `${activeSettingsTab}-0`;
                if (!expandedSections[key]) {
                  setExpandedSections((prev: any) => ({ ...prev, [key]: true }));
                }
              }
            } else if (sidebarFocus === 4) {
              onClose();
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
        case 'Back':
        case 'Backspace':
        case 'GoBack':
          e.preventDefault();
          if (settingsArea === 'content') {
            setSettingsArea('sections');
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
              const nextFocus = (sidebarFocus + 1) % 5;
              setSidebarFocus(nextFocus);
              setActiveSettingsTab(nextFocus);
            } else {
              if (sidebarFocus < 4) {
                setSettingsArea('sections');
                setSettingsSection(0);
              } else if (sidebarFocus === 4) {
                setSettingsArea('content');
                setSettingsFocus(100);
              }
            }
          } else if (settingsArea === 'sections') {
            const key = `${activeSettingsTab}-${settingsSection}`;
            if (!expandedSections[key]) {
              toggleSection(activeSettingsTab, settingsSection);
            } else {
              setSettingsArea('content');
              // Focus initialization logic...
              if (activeSettingsTab === 0) {
                if (settingsSection === 0) setSettingsFocus(0);
                else if (settingsSection === 1) setSettingsFocus(20);
                else if (settingsSection === 2) setSettingsFocus(13);
                else if (settingsSection === 3) setSettingsFocus(15);
                else if (settingsSection === 4) setSettingsFocus(40);
                else if (settingsSection === 5) setSettingsFocus(50);
                else if (settingsSection === 6) setSettingsFocus(60);
                else if (settingsSection === 7) setSettingsFocus(70);
                else if (settingsSection === 8) setSettingsFocus(80);
                else if (settingsSection === 9) setSettingsFocus(90);
                else if (settingsSection === 10) setSettingsFocus(100);
                else if (settingsSection === 11) setSettingsFocus(17);
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
            // Content navigation logic...
            if (activeSettingsTab === 0) {
              if (settingsSection === 0 && settingsFocus < 12) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 1 && settingsFocus < 23) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 2 && settingsFocus === 13) setSettingsFocus(14);
              else if (settingsSection === 3 && settingsFocus === 15) setSettingsFocus(16);
              else if (settingsSection === 4 && settingsFocus < 50) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 5 && settingsFocus < 54) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 6 && settingsFocus < 65) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 7 && settingsFocus < 74) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 10 && settingsFocus < 115) setSettingsFocus((prev: number) => prev + 1);
            } else if (activeSettingsTab === 1) {
              if (settingsSection === 1 && settingsFocus === 1) setSettingsFocus(2);
              else if (settingsSection === 2 && settingsFocus === 4) setSettingsFocus(5);
              else if (settingsSection === 3 && settingsFocus === 6) setSettingsFocus(7);
              else if (settingsSection === 4 && settingsFocus < 13) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 5) {
                if (settingsFocus === 20) setSettingsFocus(21);
                else if (settingsFocus >= 30 && settingsFocus % 2 === 0) setSettingsFocus((prev: number) => prev + 1);
              }
              else if (settingsSection === 6 && settingsFocus === 14) setSettingsFocus(15);
            } else if (activeSettingsTab === 2) {
              if (settingsSection === 3 && settingsFocus < 10) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 4 && settingsFocus < 14) setSettingsFocus((prev: number) => prev + 1);
              else if (settingsSection === 6 && settingsFocus === 16) setSettingsFocus(17);
            }
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            if (window.innerWidth < 768) {
              const nextFocus = (sidebarFocus - 1 + 5) % 5;
              setSidebarFocus(nextFocus);
              setActiveSettingsTab(nextFocus);
            }
          } else if (settingsArea === 'sections') {
            setSettingsArea('tabs');
          } else if (settingsArea === 'content') {
            if (activeSettingsTab === 0) {
              if (settingsSection === 0 && settingsFocus > 0) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 1 && settingsFocus > 20) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 2 && settingsFocus === 14) setSettingsFocus(13);
              else if (settingsSection === 3 && settingsFocus === 16) setSettingsFocus(15);
              else if (settingsSection === 4 && settingsFocus > 40) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 5 && settingsFocus > 50) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 6 && settingsFocus > 60) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 7 && settingsFocus > 70) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 10 && settingsFocus > 100) setSettingsFocus((prev: number) => prev - 1);
              else setSettingsArea('sections');
            } else if (activeSettingsTab === 1) {
              if (settingsSection === 1 && settingsFocus === 2) setSettingsFocus(1);
              else if (settingsSection === 2 && settingsFocus === 5) setSettingsFocus(4);
              else if (settingsSection === 3 && settingsFocus === 7) setSettingsFocus(6);
              else if (settingsSection === 4 && settingsFocus > 8) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 5) {
                if (settingsFocus === 21) setSettingsFocus(20);
                else if (settingsFocus >= 31 && settingsFocus % 2 !== 0) setSettingsFocus((prev: number) => prev - 1);
                else setSettingsArea('sections');
              }
              else if (settingsSection === 6 && settingsFocus === 15) setSettingsFocus(14);
              else setSettingsArea('sections');
            } else if (activeSettingsTab === 2) {
              if (settingsSection === 3 && settingsFocus > 3) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 4 && settingsFocus > 11) setSettingsFocus((prev: number) => prev - 1);
              else if (settingsSection === 6 && settingsFocus === 17) setSettingsFocus(16);
              else setSettingsArea('sections');
            } else {
              setSettingsArea('sections');
            }
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            const nextFocus = (sidebarFocus + 1) % 6;
            setSidebarFocus(nextFocus);
            if (nextFocus < 5) {
              setActiveSettingsTab(nextFocus);
              setSettingsSection(0);
              setSettingsFocus(0);
              setExpandedSections({});
            }
          } else if (settingsArea === 'sections') {
            const maxSections = activeSettingsTab === 0 ? 12 : activeSettingsTab === 1 ? 7 : activeSettingsTab === 2 ? 7 : activeSettingsTab === 4 ? 1 : 1;
            setSettingsSection((prev: number) => (prev + 1) % maxSections);
          } else if (settingsArea === 'content') {
            if (activeSettingsTab === 1 && settingsSection === 5) {
              if (settingsFocus === 20 || settingsFocus === 21) setSettingsFocus(30);
              else if (settingsFocus < 30 + (playlists.length - 1) * 2) setSettingsFocus((prev: number) => prev + 2);
            } else if (activeSettingsTab === 0 && settingsSection === 0) {
              if (settingsFocus < 6) setSettingsFocus((prev: number) => prev + 6);
            } else if (activeSettingsTab === 0 && settingsSection === 1) {
              if (settingsFocus < 22) setSettingsFocus((prev: number) => prev + 2);
            }
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (settingsArea === 'tabs') {
            const nextFocus = (sidebarFocus - 1 + 6) % 6;
            setSidebarFocus(nextFocus);
            if (nextFocus < 5) {
              setActiveSettingsTab(nextFocus);
              setSettingsSection(0);
              setSettingsFocus(0);
              setExpandedSections({});
            }
          } else if (settingsArea === 'sections') {
            const maxSections = activeSettingsTab === 0 ? 12 : activeSettingsTab === 1 ? 7 : activeSettingsTab === 2 ? 7 : activeSettingsTab === 4 ? 1 : 1;
            setSettingsSection((prev: number) => (prev - 1 + maxSections) % maxSections);
          } else if (settingsArea === 'content') {
            if (activeSettingsTab === 1 && settingsSection === 5) {
              if (settingsFocus >= 32) setSettingsFocus((prev: number) => prev - 2);
              else if (settingsFocus === 30 || settingsFocus === 31) setSettingsFocus(20);
            } else if (activeSettingsTab === 0 && settingsSection === 0) {
              if (settingsFocus >= 6) setSettingsFocus((prev: number) => prev - 6);
            } else if (activeSettingsTab === 0 && settingsSection === 1) {
              if (settingsFocus >= 22) setSettingsFocus((prev: number) => prev - 2);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, settingsArea, sidebarFocus, settingsSection, settingsFocus, activeSettingsTab, expandedSections, playlists.length, onClose, setNavContext, setActiveRow, setActiveCol, toggleSection, setSettingsArea, setSettingsSection, setSettingsFocus, setSidebarFocus, setActiveSettingsTab, setExpandedSections]);

  return (
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
            className="w-full h-full px-8 py-3 md:p-5 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto custom-scrollbar scroll-smooth"
          >
            <div className="hidden md:block mb-6">
              <h2 className="text-xl font-black italic tracking-tighter uppercase text-white opacity-50">Ayarlar</h2>
            </div>
          {[
            { id: 0, label: 'Görünüm', icon: Sun },
            { id: 1, label: 'Liste', icon: ListIcon },
            { id: 2, label: 'Genel', icon: Settings },
            { id: 3, label: 'Kumanda', icon: Smartphone },
            { id: 4, label: 'AI Gözcü', icon: Sparkles }
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
            </button>
          ))}
          </div>
          
          <div className="hidden md:block mt-auto pt-4 space-y-4">
            <button
              onClick={onClose}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 font-bold transition-all",
                uiMode === 'modern' && "rounded-xl",
                uiMode === 'classic' && "rounded-none border border-zinc-800",
                uiMode === 'minimalist' && "rounded-none border-0",
                settingsArea === 'tabs' && sidebarFocus === 4 
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
              {activeSettingsTab === 0 ? 'Görünüm' : activeSettingsTab === 1 ? 'Liste' : activeSettingsTab === 2 ? 'Genel' : 'Kumanda'}
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
          </div>

          <div className={cn(
            "flex-1 overflow-y-auto p-6 md:p-10 pb-[50vh] space-y-10 custom-scrollbar scroll-smooth transition-all duration-500",
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
                  className="space-y-10"
                >
                  {/* Tema Rengi */}
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection(0, 0)}
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
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection(0, 1)}
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
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection(0, 2)}
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
                          <div className="flex flex-wrap gap-4 p-2">
                            {[
                              { id: 'default', label: 'Varsayılan' },
                              { id: 'glass', label: 'Cam' },
                              { id: 'neon', label: 'Neon' }
                            ].map((style, i) => (
                              <button
                                key={style.id}
                                onClick={() => setLogoStyle(style.id as LogoStyle)}
                                className={cn(
                                  "px-6 py-3 font-bold transition-all border-2",
                                  uiMode === 'modern' && "rounded-xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  logoStyle === style.id 
                                    ? "bg-white/10 border-white text-white" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10",
                                  settingsArea === 'content' && settingsFocus === 13 + i && "ring-4 ring-white scale-105 z-10 settings-focused"
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
                  {/* Odak Efekti */}
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection(0, 3)}
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
                          <div className="flex flex-wrap gap-4 p-2">
                            {[
                              { id: 'default', label: 'Varsayılan' },
                              { id: 'glow', label: 'Parlayan' },
                              { id: 'border', label: 'Kenarlık' },
                              { id: 'none', label: 'Yok' }
                            ].map((effect, i) => (
                              <button
                                key={effect.id}
                                onClick={() => setFocusEffect(effect.id as FocusEffect)}
                                className={cn(
                                  "px-6 py-3 font-bold transition-all border-2",
                                  uiMode === 'modern' && "rounded-xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  focusEffect === effect.id 
                                    ? "bg-white/10 border-white text-white" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10",
                                  settingsArea === 'content' && settingsFocus === 15 + i && "ring-4 ring-white scale-105 z-10 settings-focused"
                                )}
                              >
                                {effect.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Poster Yönü */}
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection(0, 4)}
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
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection(0, 5)}
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
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection(0, 6)}
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
                          <div className="flex flex-wrap gap-4 p-2">
                            {[
                              { id: 'default', label: 'Varsayılan' },
                              { id: 'netflix', label: 'Netflix' },
                              { id: 'prime', label: 'Prime' },
                              { id: 'disney', label: 'Disney+' },
                              { id: 'none', label: 'Yok' }
                            ].map((style, i) => (
                              <button
                                key={style.id}
                                onClick={() => setTop10Style(style.id as Top10Style)}
                                className={cn(
                                  "px-6 py-3 font-bold transition-all border-2",
                                  uiMode === 'modern' && "rounded-xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  top10Style === style.id 
                                    ? "bg-white/10 border-white text-white" 
                                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10",
                                  settingsArea === 'content' && settingsFocus === 60 + i && "ring-4 ring-white scale-105 z-10 settings-focused"
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

                  {/* Profil Resmi */}
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection(0, 7)}
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
                                className={cn(
                                  "w-12 h-12 md:w-16 md:h-16 transition-all border-4 overflow-hidden",
                                  uiMode === 'modern' && "rounded-2xl",
                                  uiMode === 'classic' && "rounded-none",
                                  uiMode === 'minimalist' && "rounded-none border-0",
                                  profilePic === pic ? "border-white scale-110 shadow-xl" : "border-transparent opacity-40 hover:opacity-100",
                                  settingsArea === 'content' && settingsFocus === 70 + i && "ring-4 ring-white scale-125 z-10 opacity-100 settings-focused"
                                )}
                              >
                                <img src={pic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Cihaz Tipi */}
                  <section className="space-y-4">
                    <button 
                      onClick={() => toggleSection(0, 8)}
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
                      onClick={() => toggleSection(0, 9)}
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
                      onClick={() => toggleSection(0, 10)}
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
                      onClick={() => toggleSection(0, 11)}
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
                  className="space-y-8 pb-20"
                >
                  {/* Playlist Ekleme */}
                  <section className="space-y-4">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">Playlist Ekle</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="M3U URL"
                        className={cn(
                          "flex-1 bg-white/5 border-2 border-transparent px-4 py-3 text-white transition-all outline-none",
                          uiMode === 'modern' && "rounded-xl",
                          uiMode === 'classic' && "rounded-none",
                          uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                          settingsArea === 'content' && settingsFocus === 100 && "bg-white/10 border-white ring-4 ring-white/20 settings-focused"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onAddPlaylist(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button
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
                  <section className="space-y-4">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">Mevcut Listeler</h3>
                    <div className="space-y-2">
                      {playlists.map((pl, i) => (
                        <div
                          key={pl.id}
                          className={cn(
                            "flex items-center justify-between p-4 transition-all",
                            uiMode === 'modern' && "rounded-xl bg-white/5",
                            uiMode === 'classic' && "rounded-none bg-zinc-900 border-l-4 border-zinc-700",
                            uiMode === 'minimalist' && "rounded-none bg-transparent border-b border-white/10",
                            settingsArea === 'content' && settingsFocus === 110 + i && "bg-white/10 ring-2 ring-white/20 settings-focused"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-sm truncate max-w-[200px]">{pl.name}</span>
                            <span className="text-[10px] text-zinc-500">{pl.channels.length} Kanal</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => onRefreshPlaylist(pl.id)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeletePlaylist(pl.id)}
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
                  <section className="space-y-4">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">EPG Kaynağı</h3>
                    <input
                      type="text"
                      defaultValue={epgUrl}
                      placeholder="EPG XML URL"
                      className={cn(
                        "w-full bg-white/5 border-2 border-transparent px-4 py-3 text-white transition-all outline-none",
                        uiMode === 'modern' && "rounded-xl",
                        uiMode === 'classic' && "rounded-none",
                        uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                        settingsArea === 'content' && settingsFocus === 120 && "bg-white/10 border-white ring-4 ring-white/20 settings-focused"
                      )}
                      onBlur={(e) => onUpdateEPG(e.target.value)}
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
                  className="space-y-8 pb-20"
                >
                  {/* Akıllı VOD / Sinema Modu */}
                  <section className="space-y-4">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">Sinema Deneyimi</h3>
                    <button
                      onClick={() => setCinemaModeEnabled(!cinemaModeEnabled)}
                      className={cn(
                        "w-full p-4 flex items-center justify-between transition-all border-2",
                        uiMode === 'modern' && "rounded-2xl",
                        uiMode === 'classic' && "rounded-none",
                        uiMode === 'minimalist' && "rounded-none border-0",
                        cinemaModeEnabled ? "bg-white/10 border-white text-white" : "bg-white/5 border-transparent text-zinc-500",
                        settingsArea === 'content' && settingsFocus === 0 && "ring-4 ring-white scale-105 z-10 settings-focused"
                      )}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span className="font-bold">Akıllı VOD (Sinema Modu)</span>
                        </div>
                        <span className="text-[10px] opacity-50 text-left">Film ve diziler için TMDB destekli zengin içerik sayfasını aktif eder</span>
                      </div>
                      <div className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        cinemaModeEnabled ? "bg-green-500" : "bg-zinc-700"
                      )}>
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          cinemaModeEnabled ? "left-7" : "left-1"
                        )} />
                      </div>
                    </button>
                  </section>

                  {/* TMDB Entegrasyonu */}
                  <section className="space-y-4">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">Veri Kaynakları</h3>
                    <button
                      onClick={() => setTmdbEnabled(!tmdbEnabled)}
                      className={cn(
                        "w-full p-4 flex items-center justify-between transition-all border-2",
                        uiMode === 'modern' && "rounded-2xl",
                        uiMode === 'classic' && "rounded-none",
                        uiMode === 'minimalist' && "rounded-none border-0",
                        tmdbEnabled ? "bg-white/10 border-white text-white" : "bg-white/5 border-transparent text-zinc-500",
                        settingsArea === 'content' && settingsFocus === 10 && "ring-4 ring-white scale-105 z-10 settings-focused"
                      )}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-400" />
                          <span className="font-bold">TMDB Entegrasyonu</span>
                        </div>
                        <span className="text-[10px] opacity-50 text-left">Film afişleri ve detayları için TMDB veritabanını kullanır</span>
                      </div>
                      <div className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        tmdbEnabled ? "bg-blue-500" : "bg-zinc-700"
                      )}>
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          tmdbEnabled ? "left-7" : "left-1"
                        )} />
                      </div>
                    </button>
                  </section>

                  {/* API Anahtarları */}
                  <section className="space-y-4">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">API Yapılandırması</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Key className="w-3 h-3" />
                          TMDB API Key
                        </label>
                        <input
                          type="password"
                          value={tmdbApiKey}
                          onChange={(e) => setTmdbApiKey(e.target.value)}
                          placeholder="TMDB API Anahtarınızı girin"
                          className={cn(
                            "w-full bg-white/5 border-2 border-transparent px-4 py-3 text-white transition-all outline-none",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                            settingsArea === 'content' && settingsFocus === 1 && "bg-white/10 border-white ring-4 ring-white/20 settings-focused"
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          Gemini API Key
                        </label>
                        <input
                          type="password"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="Gemini API Anahtarınızı girin"
                          className={cn(
                            "w-full bg-white/5 border-2 border-transparent px-4 py-3 text-white transition-all outline-none",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                            settingsArea === 'content' && settingsFocus === 2 && "bg-white/10 border-white ring-4 ring-white/20 settings-focused"
                          )}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Diğer Ayarlar */}
                  <section className="space-y-4">
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] px-1">Gelişmiş</h3>
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
                          placeholder="https://proxy.example.com/?url="
                          className={cn(
                            "w-full bg-white/5 border-2 border-transparent px-4 py-3 text-white transition-all outline-none",
                            uiMode === 'modern' && "rounded-xl",
                            uiMode === 'classic' && "rounded-none",
                            uiMode === 'minimalist' && "rounded-none border-0 bg-zinc-900",
                            settingsArea === 'content' && settingsFocus === 3 && "bg-white/10 border-white ring-4 ring-white/20 settings-focused"
                          )}
                        />
                      </div>

                      <button
                        onClick={() => setVoiceControlEnabled(!voiceControlEnabled)}
                        className={cn(
                          "w-full p-4 flex items-center justify-between transition-all border-2",
                          uiMode === 'modern' && "rounded-2xl",
                          uiMode === 'classic' && "rounded-none",
                          uiMode === 'minimalist' && "rounded-none border-0",
                          voiceControlEnabled ? "bg-white/10 border-white text-white" : "bg-white/5 border-transparent text-zinc-500",
                          settingsArea === 'content' && settingsFocus === 4 && "ring-4 ring-white scale-105 z-10 settings-focused"
                        )}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <Mic className="w-4 h-4" />
                            <span className="font-bold">Sesli Kontrol</span>
                          </div>
                          <span className="text-[10px] opacity-50 text-left">Sesli komutlarla kanal değiştirme ve arama</span>
                        </div>
                        <div className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          voiceControlEnabled ? "bg-green-500" : "bg-zinc-700"
                        )}>
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            voiceControlEnabled ? "left-7" : "left-1"
                          )} />
                        </div>
                      </button>
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
                  className="space-y-8 pb-20"
                >
                  <section className="flex flex-col items-center justify-center space-y-8 py-10 text-center">
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
                          <QRCodeSVG 
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
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
