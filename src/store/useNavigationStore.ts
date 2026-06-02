import { create } from 'zustand';
import { NavContext } from '../types';

interface NavigationState {
  settingsArea: 'sections' | 'content' | 'tabs' | 'none';
  settingsSection: number;
  settingsFocus: number;
  activeSettingsTab: number;
  activeTab: string;
  sidebarFocus: number;
  navContext: NavContext;
  activeRow: number;
  activeCol: number;
  detailFocus: number;
  channelMenuFocus: number;
  quickSettingsFocus: number;
  quickSwitchFocus: number;
  showSettings: boolean;
  showQuickSettings: boolean;
  showEPGTimeline: boolean;
  showCommandPalette: boolean;
  showDeviceInfo: boolean;
  showQuickSwitch: boolean;
  showSportsDashboard: boolean;
  showRemotePairingModal: boolean;
  installPrompt: any;
  
  // Actions
  setSettingsArea: (area: 'sections' | 'content' | 'tabs' | 'none' | ((prev: any) => any)) => void;
  setSettingsSection: (section: number | ((prev: number) => number)) => void;
  setSettingsFocus: (focus: number | ((prev: number) => number)) => void;
  setActiveSettingsTab: (tab: number | ((prev: number) => number)) => void;
  setActiveTab: (tab: string | ((prev: string) => string)) => void;
  setSidebarFocus: (focus: number | ((prev: number) => number)) => void;
  setNavContext: (context: NavContext | ((prev: NavContext) => NavContext)) => void;
  setActiveRow: (row: number | ((prev: number) => number)) => void;
  setActiveCol: (col: number | ((prev: number) => number)) => void;
  setDetailFocus: (focus: number | ((prev: number) => number)) => void;
  setChannelMenuFocus: (focus: number | ((prev: number) => number)) => void;
  setQuickSettingsFocus: (focus: number | ((prev: number) => number)) => void;
  setQuickSwitchFocus: (focus: number | ((prev: number) => number)) => void;
  setShowSettings: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowQuickSettings: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowEPGTimeline: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowCommandPalette: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowDeviceInfo: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowQuickSwitch: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowSportsDashboard: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowRemotePairingModal: (show: boolean | ((prev: boolean) => boolean)) => void;
  setInstallPrompt: (prompt: any) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  settingsArea: 'none',
  settingsSection: 0,
  settingsFocus: 0,
  activeSettingsTab: 0,
  activeTab: 'Tümü',
  sidebarFocus: 0,
  navContext: 'browse',
  activeRow: 0,
  activeCol: 0,
  detailFocus: 0,
  channelMenuFocus: 0,
  quickSettingsFocus: 0,
  quickSwitchFocus: 0,
  showSettings: false,
  showQuickSettings: false,
  showEPGTimeline: false,
  showCommandPalette: false,
  showDeviceInfo: false,
  showQuickSwitch: false,
  showSportsDashboard: false,
  showRemotePairingModal: false,
  installPrompt: null,

  setSettingsArea: (area) => set((state) => ({ settingsArea: typeof area === 'function' ? area(state.settingsArea) : area })),
  setSettingsSection: (section) => set((state) => ({ settingsSection: typeof section === 'function' ? section(state.settingsSection) : section })),
  setSettingsFocus: (focus) => set((state) => ({ settingsFocus: typeof focus === 'function' ? focus(state.settingsFocus) : focus })),
  setActiveSettingsTab: (tab) => set((state) => ({ activeSettingsTab: typeof tab === 'function' ? tab(state.activeSettingsTab) : tab })),
  setActiveTab: (tab) => set((state) => ({ activeTab: typeof tab === 'function' ? tab(state.activeTab) : tab })),
  setSidebarFocus: (focus) => set((state) => ({ sidebarFocus: typeof focus === 'function' ? focus(state.sidebarFocus) : focus })),
  setNavContext: (context) => set((state) => ({ navContext: typeof context === 'function' ? context(state.navContext) : context })),
  setActiveRow: (row) => set((state) => ({ 
    activeRow: typeof row === 'function' ? row(state.activeRow) : row 
  })),
  setActiveCol: (col) => set((state) => ({ 
    activeCol: typeof col === 'function' ? col(state.activeCol) : col 
  })),
  setDetailFocus: (detailFocus) => set((state) => ({ 
    detailFocus: typeof detailFocus === 'function' ? detailFocus(state.detailFocus) : detailFocus 
  })),
  setChannelMenuFocus: (channelMenuFocus) => set((state) => ({ 
    channelMenuFocus: typeof channelMenuFocus === 'function' ? channelMenuFocus(state.channelMenuFocus) : channelMenuFocus 
  })),
  setQuickSettingsFocus: (quickSettingsFocus) => set((state) => ({ 
    quickSettingsFocus: typeof quickSettingsFocus === 'function' ? quickSettingsFocus(state.quickSettingsFocus) : quickSettingsFocus 
  })),
  setQuickSwitchFocus: (quickSwitchFocus) => set((state) => ({ 
    quickSwitchFocus: typeof quickSwitchFocus === 'function' ? quickSwitchFocus(state.quickSwitchFocus) : quickSwitchFocus 
  })),
  setShowSettings: (show) => set((state) => ({ showSettings: typeof show === 'function' ? show(state.showSettings) : show })),
  setShowQuickSettings: (show) => set((state) => ({ showQuickSettings: typeof show === 'function' ? show(state.showQuickSettings) : show })),
  setShowEPGTimeline: (show) => set((state) => ({ showEPGTimeline: typeof show === 'function' ? show(state.showEPGTimeline) : show })),
  setShowCommandPalette: (show) => set((state) => ({ showCommandPalette: typeof show === 'function' ? show(state.showCommandPalette) : show })),
  setShowDeviceInfo: (show) => set((state) => ({ showDeviceInfo: typeof show === 'function' ? show(state.showDeviceInfo) : show })),
  setShowQuickSwitch: (show) => set((state) => ({ showQuickSwitch: typeof show === 'function' ? show(state.showQuickSwitch) : show })),
  setShowSportsDashboard: (show) => set((state) => ({ showSportsDashboard: typeof show === 'function' ? show(state.showSportsDashboard) : show })),
  setShowRemotePairingModal: (show) => set((state) => ({ showRemotePairingModal: typeof show === 'function' ? show(state.showRemotePairingModal) : show })),
  setInstallPrompt: (installPrompt) => set({ installPrompt }),
}));
