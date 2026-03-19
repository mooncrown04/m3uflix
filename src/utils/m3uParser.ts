export interface M3UChannel {
  id: string;
  tvgId?: string;
  name: string;
  logo?: string;
  urls: string[];
  group?: string;
}

export function parseM3U(content: string): M3UChannel[] {
  const lines = content.split('\n');
  const channelMap = new Map<string, M3UChannel>();
  let currentChannelInfo: Partial<M3UChannel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.*)$/);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);

      currentChannelInfo.name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
      currentChannelInfo.logo = logoMatch ? logoMatch[1] : undefined;
      currentChannelInfo.group = groupMatch ? groupMatch[1] : 'General';
      currentChannelInfo.tvgId = tvgIdMatch ? tvgIdMatch[1] : undefined;
    } else if (line.startsWith('http')) {
      const url = line.trim();
      const name = currentChannelInfo.name || 'Unknown Channel';
      const group = currentChannelInfo.group || 'General';
      const key = `${name}_${group}`;
      
      const existingChannel = channelMap.get(key);
      if (existingChannel) {
        if (!existingChannel.urls.includes(url)) {
          existingChannel.urls.push(url);
        }
      } else {
        channelMap.set(key, {
          id: Math.random().toString(36).substr(2, 9),
          name,
          logo: currentChannelInfo.logo,
          group,
          tvgId: currentChannelInfo.tvgId,
          urls: [url]
        });
      }
      
      currentChannelInfo = {};
    }
  }

  const channels = Array.from(channelMap.values());
  console.log(`Parsed ${channels.length} unique channels from M3U content.`);
  return channels;
}
