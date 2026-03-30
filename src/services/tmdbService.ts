const getApiKey = () => {
  return localStorage.getItem('tmdb_api_key') || process.env.VITE_TMDB_API_KEY || '';
};

const BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBData {
  id: number;
  media_type?: 'movie' | 'tv';
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  name?: string;
  title?: string;
  genres?: { id: number; name: string }[];
  cast?: { id: number; name: string; character: string; profile_path?: string }[];
  director?: { id: number; name: string; profile_path?: string };
}

export interface TMDBTrailer {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface ActorDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string;
  place_of_birth: string;
  profile_path: string;
}

export interface ActorMovie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  release_date?: string;
  first_air_date?: string;
  character: string;
}

const cache = new Map<string, TMDBData>();
const actorCache = new Map<number, ActorDetails>();
const actorMoviesCache = new Map<number, ActorMovie[]>();

export async function fetchTMDBData(name: string, type: 'movie' | 'tv' | 'auto' = 'auto'): Promise<TMDBData | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  
  const cacheKey = `${name}_${type}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    // Clean name (remove common IPTV suffixes like HD, FHD, 4K, etc.)
    const cleanName = name.replace(/\b(HD|FHD|4K|UHD|SD|TR|EN|DE|FR|IT|ES|PT|RU|AR|HE|HI|ZH|JA|KO)\b/gi, '').trim();
    
    let searchType = type;
    if (type === 'auto') {
      // Simple heuristic: if it has "S01E01" or similar, it's a TV show
      searchType = /S\d{2}E\d{2}/i.test(name) ? 'tv' : 'movie';
    }

    const searchUrl = `${BASE_URL}/search/${searchType}?api_key=${apiKey}&query=${encodeURIComponent(cleanName)}&language=tr-TR`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      
      // Fetch credits for cast
      const creditsUrl = `${BASE_URL}/${searchType}/${result.id}/credits?api_key=${apiKey}&language=tr-TR`;
      const creditsResponse = await fetch(creditsUrl);
      const creditsData = await creditsResponse.json();
      
      const director = creditsData.crew?.find((c: any) => c.job === 'Director');
      
      const tmdbData: TMDBData = {
        ...result,
        media_type: searchType as 'movie' | 'tv',
        cast: creditsData.cast?.slice(0, 10).map((c: any) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path
        })),
        director: director ? {
          id: director.id,
          name: director.name,
          profile_path: director.profile_path
        } : undefined
      };
      
      cache.set(cacheKey, tmdbData);
      return tmdbData;
    }
  } catch (error) {
    console.error('Error fetching TMDb data:', error);
  }

  return null;
}

export async function fetchActorDetails(actorId: number): Promise<ActorDetails | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  if (actorCache.has(actorId)) return actorCache.get(actorId)!;

  try {
    const url = `${BASE_URL}/person/${actorId}?api_key=${apiKey}&language=tr-TR`;
    const response = await fetch(url);
    const data = await response.json();
    actorCache.set(actorId, data);
    return data;
  } catch (error) {
    console.error('Error fetching actor details:', error);
    return null;
  }
}

export async function fetchActorMovies(actorId: number): Promise<ActorMovie[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  if (actorMoviesCache.has(actorId)) return actorMoviesCache.get(actorId)!;

  try {
    const url = `${BASE_URL}/person/${actorId}/combined_credits?api_key=${apiKey}&language=tr-TR`;
    const response = await fetch(url);
    const data = await response.json();
    const movies = data.cast?.slice(0, 12) || [];
    actorMoviesCache.set(actorId, movies);
    return movies;
  } catch (error) {
    console.error('Error fetching actor movies:', error);
    return [];
  }
}

export async function fetchTMDBTrailers(id: number, type: 'movie' | 'tv'): Promise<TMDBTrailer[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const url = `${BASE_URL}/${type}/${id}/videos?api_key=${apiKey}&language=tr-TR`;
    const response = await fetch(url);
    const data = await response.json();
    
    // If no Turkish trailers, try English
    if (!data.results || data.results.length === 0) {
      const enUrl = `${BASE_URL}/${type}/${id}/videos?api_key=${apiKey}&language=en-US`;
      const enResponse = await fetch(enUrl);
      const enData = await enResponse.json();
      return enData.results?.filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer') || [];
    }

    return data.results?.filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer') || [];
  } catch (error) {
    console.error('Error fetching trailers:', error);
    return [];
  }
}

export async function fetchTMDBSimilar(id: number, type: 'movie' | 'tv'): Promise<TMDBData[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const url = `${BASE_URL}/${type}/${id}/similar?api_key=${apiKey}&language=tr-TR&page=1`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results?.slice(0, 12) || [];
  } catch (error) {
    console.error('Error fetching similar content:', error);
    return [];
  }
}

export function getTMDBImageUrl(path: string, size: 'w500' | 'original' = 'w500') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
