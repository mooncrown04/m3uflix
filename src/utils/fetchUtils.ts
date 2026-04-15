import { Capacitor } from '@capacitor/core';

export const getProxiedUrl = (url: string, customProxyUrl?: string) => {
  if (Capacitor.isNativePlatform()) {
    return url;
  }
  if (customProxyUrl) {
    return `${customProxyUrl}${encodeURIComponent(url)}`;
  }
  return `/api/proxy?url=${encodeURIComponent(url)}`;
};

export const fetchWithProxy = async (url: string, customProxyUrl?: string) => {
  return fetch(getProxiedUrl(url, customProxyUrl));
};
