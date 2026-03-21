import { GoogleGenAI, Type } from "@google/genai";

export interface MediaMetadata {
  title: string;
  year?: string;
  rating?: string;
  genre?: string[];
  director?: string;
  cast?: string[];
  summary?: string;
  posterUrl?: string;
  imdbScore?: string;
  duration?: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const metadataCache: Record<string, MediaMetadata> = JSON.parse(localStorage.getItem('media_metadata_cache') || '{}');

const saveCache = () => {
  localStorage.setItem('media_metadata_cache', JSON.stringify(metadataCache));
};

export async function fetchMediaMetadata(title: string, group?: string): Promise<MediaMetadata | null> {
  const cacheKey = `${title}_${group || ''}`;
  if (metadataCache[cacheKey]) {
    return metadataCache[cacheKey];
  }

  try {
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

    const metadata = JSON.parse(response.text) as MediaMetadata;
    metadataCache[cacheKey] = metadata;
    saveCache();
    return metadata;
  } catch (error) {
    console.error("Error fetching metadata from Gemini:", error);
    return null;
  }
}
