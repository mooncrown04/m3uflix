import { GoogleGenAI, Type } from "@google/genai";
import { M3UChannel } from "../utils/m3uParser";

export interface AISearchResult {
  category?: string;
  searchQuery?: string;
  explanation: string;
  suggestedChannels?: string[]; // Names of channels
  actions?: {
    volume?: number; // 0-100
    sleepTimer?: number; // minutes
    mute?: boolean;
    unmute?: boolean;
    addWatcher?: {
      keyword: string;
      type: 'title' | 'category' | 'general';
    };
    showSportsDashboard?: boolean;
    toggleTranslation?: boolean;
    toggleSummary?: boolean;
  };
}

export async function performAISearch(
  query: string,
  categories: string[],
  apiKey: string
): Promise<AISearchResult> {
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `
    Sen bir IPTV asistanısın. Kullanıcının doğal dildeki isteklerini analiz edip uygun kategori, arama terimleri ve sistem komutlarını belirlemelisin.
    
    Mevcut Kategoriler: ${categories.join(", ")}
    
    Görevlerin:
    1. İçerik Arama: Kullanıcı bir şey izlemek istediğinde uygun kategoriyi ve arama terimini belirle.
    2. Sistem Kontrolü: Kullanıcı ses seviyesi, susturma veya uyku zamanlayıcısı gibi komutlar verdiğinde bunları 'actions' objesi içinde belirt.
    3. AI Gözcü (Watcher): Kullanıcı bir şeyi takip etmeni veya haber vermeni istediğinde (örn: "maç başlayınca haber ver", "bilim kurgu filmlerini izle") 'addWatcher' aksiyonunu kullan.
    4. Canlı Skorlar: Kullanıcı maç sonuçlarını, canlı skorları veya o anki maçları sorduğunda (örn: "maç sonuçları", "canlı skorları göster", "bugün hangi maçlar var") 'showSportsDashboard' aksiyonunu true yap.
    5. Canlı Çeviri: Kullanıcı yabancı bir kanalı tercüme etmeni veya altyazı açmanı istediğinde (örn: "bu kanalı tercüme et", "altyazıları aç", "çeviriyi başlat") 'toggleTranslation' aksiyonunu true yap.
    6. Program Özeti (Özet Geç): Kullanıcı o anki programın özetini istediğinde (örn: "özet geç", "ne konuşuluyor", "programın özeti") 'toggleSummary' aksiyonunu true yap.
    
    Kurallar:
    - Ses seviyesi (volume) 0-100 arası bir sayı olmalıdır.
    - Uyku zamanlayıcısı (sleepTimer) dakika cinsinden bir sayı olmalıdır.
    - addWatcher için 'keyword' kullanıcının takip etmek istediği terimdir. 'type' ise 'title', 'category' veya 'general' olabilir.
    - Kullanıcıya ne yaptığını açıklayan kısa, samimi bir cümle yaz.
    
    Yanıtını JSON formatında vermelisin.
    Örnek Yanıtlar:
    - "Sesi %20 yap": {"explanation": "Sesi senin için %20 seviyesine getirdim.", "actions": {"volume": 20}}
    - "Canlı skorları göster": {"explanation": "Hemen canlı skor panelini açıyorum.", "actions": {"showSportsDashboard": true}}
    - "10 dakika sonra kapat": {"explanation": "Tamamdır, 10 dakika sonra uyku moduna geçeceğiz.", "actions": {"sleepTimer": 10}}
    - "Bana spor kanallarını bul": {"category": "SPOR", "searchQuery": "spor", "explanation": "İşte senin için seçtiğim spor kanalları."}
    - "Maç başlayınca haber ver": {"explanation": "Tamamdır, maçları senin için takip etmeye başladım!", "actions": {"addWatcher": {"keyword": "maç", "type": "title"}}}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "Eşleşen kategori adı" },
            searchQuery: { type: Type.STRING, description: "Arama terimi" },
            explanation: { type: Type.STRING, description: "Kullanıcıya gösterilecek açıklama" },
            suggestedChannels: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Önerilen kanal isimleri"
            },
            actions: {
              type: Type.OBJECT,
              properties: {
                volume: { type: Type.NUMBER, description: "Ses seviyesi (0-100)" },
                sleepTimer: { type: Type.NUMBER, description: "Uyku zamanlayıcısı (dakika)" },
                mute: { type: Type.BOOLEAN },
                unmute: { type: Type.BOOLEAN },
                addWatcher: {
                  type: Type.OBJECT,
                  properties: {
                    keyword: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["title", "category", "general"] }
                  }
                },
                showSportsDashboard: { type: Type.BOOLEAN },
                toggleTranslation: { type: Type.BOOLEAN },
                toggleSummary: { type: Type.BOOLEAN }
              }
            }
          },
          required: ["explanation"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("AI Search Error:", error);
    return {
      explanation: "Üzgünüm, şu an yardımcı olamıyorum. Lütfen normal aramayı dene."
    };
  }
}

export async function suggestRepairExplanation(
  failedChannelName: string,
  alternatives: string[],
  apiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Kullanıcı "${failedChannelName}" kanalını izlemeye çalıştı ama yayın açılmadı. 
    Sistem şu alternatifleri buldu: ${alternatives.join(", ")}.
    
    Kullanıcıya bu kanalın şu an çalışmadığını ama bu alternatifleri deneyebileceğini söyleyen, 
    çok kısa, samimi ve yardımcı bir cümle yaz. 
    Örn: "Bu kanal şu an nazlanıyor ama senin için 3 tane canavar gibi alternatif buldum!"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        maxOutputTokens: 100
      }
    });

    return response.text || "Bu kanal şu an çalışmıyor, alternatifleri deneyebilirsin.";
  } catch (error) {
    console.error("AI Repair Explanation Error:", error);
    return "Bu kanal şu an çalışmıyor, alternatifleri senin için listeledim.";
  }
}
