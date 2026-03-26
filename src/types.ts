import { M3UChannel } from './utils/m3uParser';
import { EPGData } from './utils/epgParser';

export interface Playlist {
  id: string;
  name: string;
  url: string;
  epgUrl?: string;
}

export type UIMode = 'modern' | 'classic' | 'minimalist' | 'bento';
export type LogoStyle = 'default' | 'mooncrown' | 'minimal' | 'neon' | 'retro' | 'glitch';

export interface ChannelRowProps {
  title: string;
  channels: M3UChannel[];
  onSelect: (channel: M3UChannel) => void;
  onFocus: (row: number, col: number) => void;
  onToggleFavorite: (channelId: string) => void;
  onDeleteChannel: (channelId: string) => void;
  onLongPress: (channelId: string, category: string) => void;
  favorites: string[];
  multiSessions?: Record<string, string[]>;
  canliChannels?: string[];
  filmChannels?: string[];
  diziChannels?: string[];
  rowIndex: number;
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
}

export interface ChannelCardProps {
  channel: M3UChannel;
  colIndex: number;
  rowIndex: number;
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
  onDeleteChannel: (channelId: string) => void;
  onToggleMini?: (channel: M3UChannel) => void;
  handlePressStart: (channelId: string) => void;
  handlePressEnd: () => void;
  customProxyUrl?: string;
  style?: React.CSSProperties;
  channels: M3UChannel[];
}
