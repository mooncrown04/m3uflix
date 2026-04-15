import { M3UChannel } from './m3uParser';

/**
 * Normalizes a channel name for comparison.
 * Removes common suffixes like HD, SD, 4K, FHD, etc.
 * and special characters.
 */
export function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*(hd|sd|4k|fhd|hevc|raw|uhd|vip|tr|turk|yedek|backup)\s*/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Finds potential alternative channels for a failed channel.
 */
export function findRepairAlternatives(
  targetChannel: M3UChannel,
  allChannels: M3UChannel[]
): M3UChannel[] {
  if (!targetChannel || !allChannels.length) return [];

  const normalizedTarget = normalizeChannelName(targetChannel.name);
  
  // 1. Find channels with the same normalized name but different IDs/URLs
  const alternatives = allChannels.filter(ch => {
    if (ch.id === targetChannel.id) return false;
    
    const normalizedCh = normalizeChannelName(ch.name);
    
    // Exact normalized match
    if (normalizedCh === normalizedTarget) return true;
    
    // Substring match (e.g. "TRT 1" matches "TRT 1 HD")
    if (normalizedCh.includes(normalizedTarget) || normalizedTarget.includes(normalizedCh)) {
      // Only if they are reasonably similar in length to avoid "FOX" matching "FOX CRIME"
      const diff = Math.abs(normalizedCh.length - normalizedTarget.length);
      return diff < 5;
    }
    
    return false;
  });

  // 2. Sort by similarity (exact normalized matches first)
  return alternatives
    .sort((a, b) => {
      const normA = normalizeChannelName(a.name);
      const normB = normalizeChannelName(b.name);
      
      const isExactA = normA === normalizedTarget;
      const isExactB = normB === normalizedTarget;
      
      if (isExactA && !isExactB) return -1;
      if (!isExactA && isExactB) return 1;
      
      return 0;
    })
    .slice(0, 5); // Return top 5
}
