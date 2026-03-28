import { M3UChannel } from './utils/m3uParser';
import { EPGData } from './utils/epgParser';

export interface Playlist {
  id: string;
  name: string;
  url: string;
  epgUrl?: string;
}

export type UIMode = 'modern' | 'classic' | 'minimalist' | 'bento';
export type SortBy = 'default' | 'name' | 'number' | 'added';
export type LogoStyle = 'default' | 'mooncrown' | 'mooncrown-gold' | 'mooncrown-silver' | 'mooncrown-neon' | 'mooncrown-glass' | 'mooncrown-fire' | 'minimal' | 'neon' | 'retro' | 'glitch';
export type Top10Style = 'original' | 'filled' | 'neon' | 'retro' | 'minimal' | 'theme';

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
  playbackProgress?: Record<string, { currentTime: number; duration: number }>;
  epgData?: EPGData | null;
  now: Date;
  isGrid?: boolean;
  top10Style?: Top10Style;
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
  onToggleMini?: (channel: M3UChannel) => void;
  handlePressStart: (channelId: string) => void;
  handlePressEnd: () => void;
  customProxyUrl?: string;
  style?: React.CSSProperties;
  channels: M3UChannel[];
  top10Style?: Top10Style;
}
