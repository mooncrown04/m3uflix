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
  type?: string;
  isMultiView?: boolean;
  sessionName?: string;
  sessionChannels?: string[];
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

  // Pre-compile regex for performance
  const epgRegex = /(?:x-tvg-url|url-tvg)="([^"]+)"/;
  const nameRegex = /,(.*)$/;
  
  // Attribute regexes
  const attrRegexes = {
    logo: /tvg-logo="([^"]+)"/,
    group: /group-title="([^"]+)"/,
    tvgId: /tvg-id="([^"]+)"/,
    tvgName: /tvg-name="([^"]+)"/,
    tvgNumber: /tvg-number="([^"]+)"/,
    channel: /channel="([^"]+)"/,
    genre: /tvg-genre="([^"]+)"/,
    actor: /tvg-actor="([^"]+)"/,
    description: /tvg-description="([^"]+)"/,
    year: /tvg-year="([^"]+)"/,
    language: /tvg-langue="([^"]+)"/,
    type: /type="([^"]+)"/
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTM3U')) {
      const epgMatch = line.match(epgRegex);
      if (epgMatch) epgUrl = epgMatch[1];
    } else if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(nameRegex);
      currentChannelInfo.name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
      
      // Only run attribute regexes if the line contains them to save time
      if (line.includes('="')) {
        currentChannelInfo.logo = line.match(attrRegexes.logo)?.[1];
        currentChannelInfo.group = line.match(attrRegexes.group)?.[1] || 'General';
        currentChannelInfo.tvgId = line.match(attrRegexes.tvgId)?.[1] || line.match(attrRegexes.channel)?.[1];
        currentChannelInfo.tvgName = line.match(attrRegexes.tvgName)?.[1];
        const numMatch = line.match(attrRegexes.tvgNumber)?.[1];
        currentChannelInfo.tvgNumber = numMatch ? parseInt(numMatch, 10) : undefined;
        currentChannelInfo.channel = line.match(attrRegexes.channel)?.[1];
        currentChannelInfo.genre = line.match(attrRegexes.genre)?.[1];
        currentChannelInfo.actor = line.match(attrRegexes.actor)?.[1];
        currentChannelInfo.description = line.match(attrRegexes.description)?.[1];
        currentChannelInfo.year = line.match(attrRegexes.year)?.[1];
        currentChannelInfo.language = line.match(attrRegexes.language)?.[1];
        currentChannelInfo.type = line.match(attrRegexes.type)?.[1];
      } else {
        currentChannelInfo.group = 'General';
      }
    } else if (line.startsWith('#EXTGRP:')) {
      currentChannelInfo.group = line.replace('#EXTGRP:', '').trim();
    } else if (line.startsWith('http')) {
      const url = line;
      const name = currentChannelInfo.name || 'Unknown Channel';
      const group = currentChannelInfo.group || 'General';
      const key = `${name}_${group}`;
      
      const existingChannel = channelMap.get(key);
      if (existingChannel) {
        if (!existingChannel.urls.includes(url)) {
          existingChannel.urls.push(url);
        }
      } else {
        // Use a deterministic ID based on the URL, name and group to prevent collisions between similar channels in different groups
        const idSource = `${url}_${name}_${group}`;
        const id = btoa(encodeURIComponent(idSource)).substring(0, 24).replace(/[^a-z0-9]/gi, '');
        
        channelMap.set(key, {
          id,
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
          type: currentChannelInfo.type,
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
