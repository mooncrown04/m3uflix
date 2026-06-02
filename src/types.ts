import { M3UChannel } from './utils/m3uParser';
export type { M3UChannel };
import { EPGData, EPGProgram } from './utils/epgParser';
export type { EPGData, EPGProgram };

export interface Playlist {
  id: string;
  name: string;
  url: string;
  epgUrl?: string;
  channels?: M3UChannel[];
  channelCount?: number;
  lastUpdated?: number;
}

export type UIMode = 'modern' | 'classic' | 'minimalist' | 'glass' | 'bento';
export interface BentoWidget {
  id: string;
  type: 'profile' | 'weather' | 'recent' | 'favorites' | 'stats' | 'match-center';
  size: 'small' | 'medium' | 'large'; // small: 1x1, medium: 2x1 or 1x2, large: 2x2
}

export type LayoutMode = 'scroll' | 'grid' | 'bento' | 'fixed-focus';
export type SortBy = 'default' | 'name' | 'number' | 'added';
export type LogoStyle = 'default' | 'mooncrown' | 'mooncrown-gold' | 'mooncrown-silver' | 'mooncrown-neon' | 'mooncrown-glass' | 'mooncrown-fire' | 'minimal' | 'neon' | 'retro' | 'glitch';
export type Top10Style = 'original' | 'filled' | 'neon' | 'theme-original' | 'theme-filled' | 'theme-neon' | 'glass';
export type FocusEffect = 'default' | 'glow' | 'pulse' | 'border' | 'scale';
export type AmbilightMode = 'none' | 'simple' | 'advanced' | 'soft' | 'vibrant' | 'cinema';
export type LoadingStyle = 'default' | 'glow' | 'minimal' | 'fire' | 'classic' | 'pulse' | 'glitch' | 'bars' | 'orbit';

export type NavContext = 'browse' | 'player' | 'channel-menu' | 'settings' | 'channel-detail' | 'exit-confirm' | 'advanced-epg' | 'voice-search' | 'pin-lock' | 'quick-settings' | 'epg-timeline' | 'number-input' | 'remote-pairing' | 'actor-detail' | 'quick-switch' | 'sports-dashboard' | 'translation-settings';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

export interface KeyMap {
  up: string;
  down: string;
  left: string;
  right: string;
  enter: string;
  back: string;
  settings: string;
  guide: string;
  voice: string;
  miniPlayer: string;
  playPause: string;
  volumeUp: string;
  volumeDown: string;
  channelUp: string;
  channelDown: string;
}

export const DEFAULT_KEY_MAP: KeyMap = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  enter: 'Enter',
  back: 'Backspace',
  settings: 's',
  guide: 'g',
  voice: 'v',
  miniPlayer: 'm',
  playPause: 'o',
  volumeUp: 'VolumeUp',
  volumeDown: 'VolumeDown',
  channelUp: 'ChannelUp',
  channelDown: 'ChannelDown',
};

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

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  url?: string;
  category?: string;
}

export interface LeagueStanding {
  league: string;
  standings: {
    rank: number;
    team: string;
    logo?: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
    gd: number;
  }[];
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
