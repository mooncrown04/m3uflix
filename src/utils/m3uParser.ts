export interface M3UChannel {
  id: string;
  tvgId?: string;
  tvgName?: string;
  tvgNumber?: number;
  channel?: string;
  name: string;
  logo?: string;
  urls: string[];
  group?: string;
  genre?: string;
  actor?: string;
  description?: string;
  year?: string;
  language?: string;
}

export interface M3UParseResult {
  channels: M3UChannel[];
  epgUrl?: string;
}

export function parseM3U(content: string): M3UParseResult {
  const lines = content.split('\n');
  const channelMap = new Map<string, M3UChannel>();
  let currentChannelInfo: Partial<M3UChannel> = {};
  let epgUrl: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTM3U')) {
      const epgMatch = line.match(/x-tvg-url="([^"]+)"/);
      if (epgMatch) {
        epgUrl = epgMatch[1];
      }
    } else if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.*)$/);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
      const tvgNameMatch = line.match(/tvg-name="([^"]+)"/);
      const tvgNumberMatch = line.match(/tvg-number="([^"]+)"/);
      const channelAttrMatch = line.match(/channel="([^"]+)"/);
      const genreMatch = line.match(/tvg-genre="([^"]+)"/);
      const actorMatch = line.match(/tvg-actor="([^"]+)"/);
      const descriptionMatch = line.match(/tvg-description="([^"]+)"/);
      const yearMatch = line.match(/tvg-year="([^"]+)"/);
      const languageMatch = line.match(/tvg-langue="([^"]+)"/);

      currentChannelInfo.name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
      currentChannelInfo.logo = logoMatch ? logoMatch[1] : undefined;
      currentChannelInfo.group = groupMatch ? groupMatch[1] : 'General';
      currentChannelInfo.tvgId = tvgIdMatch ? tvgIdMatch[1] : (channelAttrMatch ? channelAttrMatch[1] : undefined);
      currentChannelInfo.tvgName = tvgNameMatch ? tvgNameMatch[1] : undefined;
      currentChannelInfo.tvgNumber = tvgNumberMatch ? parseInt(tvgNumberMatch[1], 10) : undefined;
      currentChannelInfo.channel = channelAttrMatch ? channelAttrMatch[1] : undefined;
      currentChannelInfo.genre = genreMatch ? genreMatch[1] : undefined;
      currentChannelInfo.actor = actorMatch ? actorMatch[1] : undefined;
      currentChannelInfo.description = descriptionMatch ? descriptionMatch[1] : undefined;
      currentChannelInfo.year = yearMatch ? yearMatch[1] : undefined;
      currentChannelInfo.language = languageMatch ? languageMatch[1] : undefined;
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
          tvgName: currentChannelInfo.tvgName,
          tvgNumber: currentChannelInfo.tvgNumber,
          channel: currentChannelInfo.channel,
          genre: currentChannelInfo.genre,
          actor: currentChannelInfo.actor,
          description: currentChannelInfo.description,
          year: currentChannelInfo.year,
          language: currentChannelInfo.language,
          urls: [url]
        });
      }
      
      currentChannelInfo = {};
    }
  }

  const channels = Array.from(channelMap.values());
  console.log(`Parsed ${channels.length} unique channels from M3U content.`);
  return { channels, epgUrl };
}
