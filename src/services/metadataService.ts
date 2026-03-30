import { GoogleGenAI, Type } from "@google/genai";
import { fetchTMDBData, getTMDBImageUrl } from "./tmdbService";

export interface MediaMetadata {
  title: string;
  year?: string;
  rating?: string;
  genre?: string[];
  director?: string;
  cast?: string[];
  tmdbCast?: { id: number; name: string; character: string; profile_path?: string }[];
  summary?: string;
  posterUrl?: string;
  backdropUrl?: string;
  imdbScore?: string;
  duration?: string;
  tmdbId?: number;
  mediaType?: 'movie' | 'tv';
  tmdbDirector?: { id: number; name: string; profile_path?: string };
}

const getGeminiApiKey = () => {
  return localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY || '';
};

const metadataCache: Record<string, MediaMetadata> = JSON.parse(localStorage.getItem('media_metadata_cache') || '{}');

const saveCache = () => {
  localStorage.setItem('media_metadata_cache', JSON.stringify(metadataCache));
};

export async function fetchMediaMetadata(title: string, group?: string, type?: string): Promise<MediaMetadata | null> {
  // Only fetch extra metadata for VOD content (marked as type="video" in M3U)
  if (type !== 'video') {
    return { title };
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  
  const ai = new GoogleGenAI({ apiKey });

  const cacheKey = `${title}_${group || ''}`;
  if (metadataCache[cacheKey]) {
    return metadataCache[cacheKey];
  }

  try {
    // 1. Try TMDb first for posters and ratings
    const tmdbData = await fetchTMDBData(title);
    
    let metadata: MediaMetadata = {
      title: title,
    };

    if (tmdbData) {
      metadata = {
        title: tmdbData.title || tmdbData.name || title,
        year: (tmdbData.release_date || tmdbData.first_air_date || '').split('-')[0],
        imdbScore: tmdbData.vote_average?.toFixed(1),
        summary: tmdbData.overview,
        posterUrl: getTMDBImageUrl(tmdbData.poster_path || '') || undefined,
        backdropUrl: getTMDBImageUrl(tmdbData.backdrop_path || '', 'original') || undefined,
        cast: tmdbData.cast?.map(c => c.name),
        tmdbCast: tmdbData.cast,
        genre: tmdbData.genres?.map(g => g.name),
        tmdbId: tmdbData.id,
        mediaType: tmdbData.media_type,
        tmdbDirector: tmdbData.director
      };
    }

    // 2. If TMDb summary is missing or we want more detail, use Gemini
    if (!metadata.summary || !metadata.cast || !metadata.director) {
      const prompt = `Provide detailed metadata for the following movie or TV series: "${title}" (Category: ${group || 'General'}). 
      Return the information in Turkish. 
      Include IMDb score, release year, genres, director, main cast members, and a short summary.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              year: { type: Type.STRING },
              imdbScore: { type: Type.STRING },
              genre: { type: Type.ARRAY, items: { type: Type.STRING } },
              director: { type: Type.STRING },
              cast: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING },
              duration: { type: Type.STRING }
            },
            required: ["title", "summary"]
          }
        }
      });

      const geminiData = JSON.parse(response.text);
      
      // Merge Gemini data into metadata, preferring TMDb for poster/rating if available
      metadata = {
        ...metadata,
        title: metadata.title || geminiData.title,
        year: metadata.year || geminiData.year,
        imdbScore: metadata.imdbScore || geminiData.imdbScore,
        genre: metadata.genre || geminiData.genre,
        director: geminiData.director,
        cast: metadata.cast || geminiData.cast,
        summary: metadata.summary || geminiData.summary,
        duration: geminiData.duration
      };
    }

    metadataCache[cacheKey] = metadata;
    saveCache();
    return metadata;
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return null;
  }
}
