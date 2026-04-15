import { M3UChannel } from './utils/m3uParser';
export type { M3UChannel };
import { EPGData } from './utils/epgParser';
export type { EPGData };

export interface Playlist {
  id: string;
  name: string;
  url: string;
  epgUrl?: string;
  channels?: M3UChannel[];
}

export type UIMode = 'modern' | 'classic' | 'minimalist' | 'bento';
export type LayoutMode = 'scroll' | 'fixed-focus';
export type SortBy = 'default' | 'name' | 'number' | 'added';
export type LogoStyle = 'default' | 'mooncrown' | 'mooncrown-gold' | 'mooncrown-silver' | 'mooncrown-neon' | 'mooncrown-glass' | 'mooncrown-fire' | 'minimal' | 'neon' | 'retro' | 'glitch';
export type Top10Style = 'original' | 'filled' | 'neon' | 'theme' | 'outline-theme';
export type FocusEffect = 'default' | 'glow' | 'pulse' | 'border' | 'scale';

export type NavContext = 'browse' | 'player' | 'channel-menu' | 'settings' | 'channel-detail' | 'exit-confirm' | 'advanced-epg' | 'voice-search' | 'pin-lock' | 'quick-settings' | 'epg-timeline' | 'number-input' | 'remote-pairing' | 'actor-detail' | 'quick-switch' | 'sports-dashboard' | 'translation-settings';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

export interface ChannelRowProps {
  title: string;
  rowIndex: number;
  channels: M3UChannel[];
  onSelect: (channel: M3UChannel) => void;
  onDetail?: (channel: M3UChannel) => void;
  onFocus: (row: number, col: number) => void;
  onToggleFavorite: (channelId: string) => void;
  onDeleteChannel: (channelId: string) => void;
  onLongPress: (channelId: string, category: string) => void;
  favorites: string[];
  multiSessions?: Record<string, string[]>;
  canliChannels?: string[];
  filmChannels?: string[];
  diziChannels?: string[];
  activeRow: number;
  activeCol: number;
  orientation: 'landscape' | 'portrait';
  previewChannelId: string | null;
  themeColor: string;
  deviceType: 'pc' | 'tv' | 'tablet' | 'phone';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleMini?: (channel: M3UChannel) => void;
  customProxyUrl?: string;
  uiMode: UIMode;
  layoutMode?: LayoutMode;
  playbackProgress?: Record<string, { currentTime: number; duration: number }>;
  epgData?: EPGData | null;
  now: Date;
  isGrid?: boolean;
  top10Style?: Top10Style;
  focusEffect?: FocusEffect;
  channelNumbers?: Record<string, string>;
}

export interface ChannelCardProps {
  channel: M3UChannel;
  rowIndex: number;
  colIndex: number;
  activeRow: number;
  activeCol: number;
  previewChannelId: string | null;
  favorites: string[];
  multiSessions: Record<string, string[]>;
  canliChannels: string[];
  filmChannels: string[];
  diziChannels: string[];
  pressingId: string | null;
  title: string;
  themeColor: string;
  deviceType: 'pc' | 'tv' | 'tablet' | 'phone';
  orientation: 'landscape' | 'portrait';
  uiMode: UIMode;
  playbackProgress: Record<string, { currentTime: number; duration: number }>;
  epgData: EPGData | null;
  now: Date;
  onFocus: (row: number, col: number) => void;
  onSelect: (channel: M3UChannel) => void;
  onDetail?: (channel: M3UChannel) => void;
  onDeleteChannel: (channelId: string) => void;
  onLongPress?: (channelId: string, category: string) => void;
  onToggleMini?: (channel: M3UChannel) => void;
  handlePressStart: (channelId: string) => void;
  handlePressEnd: () => void;
  customProxyUrl?: string;
  layoutMode?: LayoutMode;
  style?: React.CSSProperties;
  channels: M3UChannel[];
  top10Style?: Top10Style;
  focusEffect?: FocusEffect;
  channelNumbers?: Record<string, string>;
}

export interface WatcherRule {
  id: string;
  keyword: string;
  type: 'title' | 'category' | 'general';
  createdAt: number;
  isActive: boolean;
}

export interface WatcherNotification {
  id: string;
  ruleId: string;
  programTitle: string;
  channelName: string;
  channelId: string;
  startTime: Date;
  timestamp: number;
}

export interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string; // e.g., '1. Yarı', 'İY', '2. Yarı', 'MS'
  minute: number;
  league: string;
  channelId?: string; // If we can match it to a channel
}

export interface LiveSubtitle {
  id: string;
  text: string;
  originalText?: string;
  timestamp: number;
}

export interface ProgramSummary {
  id: string;
  title: string;
  summary: string[];
  timestamp: number;
}
