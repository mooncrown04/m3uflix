export interface M3UChannel {
  id: string;
  tvgId?: string;
  name: string;
  logo?: string;
  url: string;
  group?: string;
}

export function parseM3U(content: string): M3UChannel[] {
  const lines = content.split('\n');
  const channels: M3UChannel[] = [];
  const seenUrls = new Set<string>();
  let currentChannel: Partial<M3UChannel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Extract name, logo, group and tvg-id
      const nameMatch = line.match(/,(.*)$/);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);

      currentChannel.name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
      currentChannel.logo = logoMatch ? logoMatch[1] : undefined;
      currentChannel.group = groupMatch ? groupMatch[1] : 'General';
      currentChannel.tvgId = tvgIdMatch ? tvgIdMatch[1] : undefined;
      currentChannel.id = Math.random().toString(36).substr(2, 9);
    } else if (line.startsWith('http')) {
      currentChannel.url = line;
      if (currentChannel.name && currentChannel.url && !seenUrls.has(currentChannel.url)) {
        channels.push(currentChannel as M3UChannel);
        seenUrls.add(currentChannel.url);
      }
      currentChannel = {};
    }
  }

  return channels;
}
