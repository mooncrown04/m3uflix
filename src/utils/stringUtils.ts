export const cleanChannelName = (name: string): string => {
  return name
    .replace(/\[.*?\]/g, '') // Remove [TR], [EN] etc.
    .replace(/\(.*?\)/g, '') // Remove (HD), (4K) etc.
    .replace(/\b(HD|4K|FHD|SD|UHD|MULTI|TR|EN|DE|FR)\b/gi, '') // Remove loose tags
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special chars
    .toLowerCase()
    .trim();
};
