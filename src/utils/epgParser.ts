import { getProxiedUrl } from './fetchUtils';

export interface EPGProgram {
  start: Date;
  stop: Date;
  title: string;
  description?: string;
  channelId: string;
}

export interface EPGData {
  channels: Record<string, string>; // id -> name
  programs: Record<string, EPGProgram[]>; // channelId -> programs
}

export async function fetchAndParseEPG(url: string, customProxyUrl?: string): Promise<EPGData> {
  try {
    const response = await fetch(getProxiedUrl(url, customProxyUrl));
    if (!response.ok) throw new Error('EPG fetch failed');
    const xmlText = await response.text();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const epgData: EPGData = {
      channels: {},
      programs: {}
    };

    // Parse channels
    const channels = xmlDoc.getElementsByTagName('channel');
    for (let i = 0; i < channels.length; i++) {
      const id = channels[i].getAttribute('id');
      const displayName = channels[i].getElementsByTagName('display-name')[0]?.textContent;
      if (id && displayName) {
        epgData.channels[id] = displayName;
      }
    }

    // Parse programs
    const programs = xmlDoc.getElementsByTagName('programme');
    for (let i = 0; i < programs.length; i++) {
      const channelId = programs[i].getAttribute('channel');
      const startStr = programs[i].getAttribute('start');
      const stopStr = programs[i].getAttribute('stop');
      const title = programs[i].getElementsByTagName('title')[0]?.textContent;
      const desc = programs[i].getElementsByTagName('desc')[0]?.textContent;

      if (channelId && startStr && stopStr && title) {
        const program: EPGProgram = {
          start: parseXMLTVDate(startStr),
          stop: parseXMLTVDate(stopStr),
          title,
          description: desc || undefined,
          channelId
        };

        if (!epgData.programs[channelId]) {
          epgData.programs[channelId] = [];
        }
        epgData.programs[channelId].push(program);
      }
    }

    // Sort programs by start time
    Object.keys(epgData.programs).forEach(id => {
      epgData.programs[id].sort((a, b) => a.start.getTime() - b.start.getTime());
    });

    return epgData;
  } catch (error) {
    console.error('EPG Parsing error:', error);
    throw error;
  }
}

function parseXMLTVDate(dateStr: string): Date {
  // Format: YYYYMMDDHHMMSS +HHMM
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(dateStr.substring(8, 10));
  const min = parseInt(dateStr.substring(10, 12));
  const sec = parseInt(dateStr.substring(12, 14));
  
  return new Date(year, month, day, hour, min, sec);
}
