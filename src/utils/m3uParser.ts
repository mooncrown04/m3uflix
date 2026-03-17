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
  const channelsMap = new Map<string, M3UChannel>();
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
      const url = line;
      const name = currentChannelInfo.name || 'Unknown Channel';
      
      if (channelsMap.has(name)) {
        const existing = channelsMap.get(name)!;
        if (!existing.urls.includes(url)) {
          existing.urls.push(url);
        }
      } else {
        channelsMap.set(name, {
          id: Math.random().toString(36).substr(2, 9),
          name,
          logo: currentChannelInfo.logo,
          group: currentChannelInfo.group,
          tvgId: currentChannelInfo.tvgId,
          urls: [url]
        });
      }
      currentChannelInfo = {};
    }
  }

  return Array.from(channelsMap.values());
}
