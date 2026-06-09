import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import https from "https";
import http from "http";

// Disable SSL verification globally for the proxy to handle broken IPTV SSL configs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create agents that ignore SSL errors and hostname verification
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  checkServerIdentity: () => undefined,
  keepAlive: true,
  timeout: 30000,
});

const httpAgent = new http.Agent({
  keepAlive: true,
  timeout: 30000,
});

import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  // Permissive headers for AI Studio preview
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    // Remove headers that might block iframing
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    
    next();
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.io logic for remote control
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    
    // Broadcast active user count to all clients
    io.emit("user-count", io.engine.clientsCount);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
      // Notify other users in the room (the TV app) that a remote has joined
      socket.to(roomId).emit("user-joined");
    });

    socket.on("send-command", ({ roomId, command, value }) => {
      console.log(`Command ${command} sent to room ${roomId} with value:`, value);
      io.to(roomId).emit("command-received", { command, value });
    });

    socket.on("sync-state", (data) => {
      // Find the room this socket is in (excluding its own ID)
      const rooms = Array.from(socket.rooms);
      const roomId = rooms.find(r => r !== socket.id);
      if (roomId) {
        socket.to(roomId).emit("sync-state", data);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      io.emit("user-count", io.engine.clientsCount);
    });
  });

  // Config endpoint to provide APP_URL to the client
  app.get("/api/config", (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    res.json({
      appUrl: process.env.APP_URL || `${protocol}://${host}`
    });
  });

  // Live Scores Endpoint
  app.get("/api/scores", async (req, res) => {
    const leagues = [
      { id: 'tur.1', name: 'Trendyol Süper Lig' },
      { id: 'eng.1', name: 'Premier League' },
      { id: 'esp.1', name: 'La Liga' },
      { id: 'ita.1', name: 'Serie A' },
      { id: 'ger.1', name: 'Bundesliga' },
      { id: 'uefa.champions', name: 'Champions League' }
    ];

    try {
      const results = await Promise.all(leagues.map(async (league) => {
        try {
          const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard`, {
            timeout: 5000
          });
          const data: any = await response.json();
          
          if (!data.events) return [];

          return data.events.map((event: any) => {
            const competition = event.competitions[0];
            const home = competition.competitors.find((c: any) => c.homeAway === 'home');
            const away = competition.competitors.find((c: any) => c.homeAway === 'away');
            
            // Clean up minute string (e.g. "78'" -> 78)
            let minute = 0;
            const minuteStr = event.status.displayClock || "0";
            minute = parseInt(minuteStr.replace("'", "")) || 0;

            let status = event.status.type.shortDetail;
            if (status === "HT") status = "İY";
            if (status === "FT") status = "MS";
            if (status.includes("2nd")) status = "2. Yarı";
            if (status.includes("1st")) status = "1. Yarı";

            return {
              id: event.id,
              homeTeam: home.team.shortDisplayName || home.team.displayName,
              awayTeam: away.team.shortDisplayName || away.team.displayName,
              homeScore: parseInt(home.score) || 0,
              awayScore: parseInt(away.score) || 0,
              status: status,
              minute: minute,
              league: league.name
            };
          });
        } catch (e) {
          return [];
        }
      }));

      res.json(results.flat());
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scores" });
    }
  });
  
  // Helper functions for RSS parsing and cleaning
  function cleanHtmlTags(str: string): string {
    if (!str) return "";
    return str
      .replace(/<[^>]*>/g, '') // strip HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatRssDate(dateStr: string): string {
    if (!dateStr) return 'Mevcut';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr.split(" ").slice(0, 4).join(" ") || 'Mevcut';
      }
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      
      if (diffMins < 1) return 'Az önce';
      if (diffMins < 60) return `${diffMins} dk önce`;
      if (diffHours < 24) return `${diffHours} saat önce`;
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    } catch (e) {
      return 'Günün haberi';
    }
  }

  function parseRssXml(xmlText: string, defaultSource: string = "RSS"): { id: string; title: string; source: string; time: string; url?: string; category?: string }[] {
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    let counter = 0;

    const isAtom = xmlText.includes("<entry") || xmlText.includes("<feed");

    if (isAtom) {
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      while ((match = entryRegex.exec(xmlText)) !== null && counter < 15) {
        const entryContent = match[1];
        const titleMatch = entryContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const linkMatch = entryContent.match(/<link[^>]+href=["']([^"']+)["']/i) || entryContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        const dateMatch = entryContent.match(/<published[^>]*>([\s\S]*?)<\/published>/i) || entryContent.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
        
        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "Haber";
        const url = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "";
        const dateStr = dateMatch ? dateMatch[1].trim() : "";
        
        items.push({
          id: `rss_${Date.now()}_${counter++}`,
          title: cleanHtmlTags(title),
          source: defaultSource,
          time: formatRssDate(dateStr),
          url: url,
          category: "Gündem"
        });
      }
    } else {
      let sourceName = defaultSource;
      const channelTitleMatch = xmlText.match(/<channel>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
      if (channelTitleMatch) {
        sourceName = channelTitleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
        if (sourceName.length > 25) sourceName = sourceName.substring(0, 25) + "...";
      }

      while ((match = itemRegex.exec(xmlText)) !== null && counter < 15) {
        const itemContent = match[1];
        const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        const dateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
        const categoryMatch = itemContent.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
        
        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "Haber";
        const url = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "";
        const dateStr = dateMatch ? dateMatch[1].trim() : "";
        const category = categoryMatch ? categoryMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "Spor";
        
        items.push({
          id: `rss_${Date.now()}_${counter++}_${Math.random().toString(36).substring(2, 6)}`,
          title: cleanHtmlTags(title),
          source: cleanHtmlTags(sourceName),
          time: formatRssDate(dateStr),
          url: url,
          category: cleanHtmlTags(category)
        });
      }
    }

    return items;
  }

  // Live News Endpoint with RSS support
  app.get("/api/news", async (req, res) => {
    try {
      let rssUrls: string[] = [];
      const queryUrls = req.query.urls as string;
      
      if (queryUrls) {
        rssUrls = queryUrls.split(",").map(url => url.trim()).filter(Boolean);
      } else {
        // Default high-quality Turkish sports RSS feeds
        rssUrls = [
          'https://www.trtspor.com.tr/rss.xml',
          'https://www.ntvspor.net/rss'
        ];
      }

      const parsedFeeds = await Promise.all(rssUrls.map(async (url) => {
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            timeout: 5000
          });
          if (!response.ok) return [];
          const text = await response.text();
          
          let parsedSource = "Spor";
          if (url.includes("ntvspor")) parsedSource = "NTV Spor";
          else if (url.includes("trtspor")) parsedSource = "TRT Spor";
          else if (url.includes("aspor")) parsedSource = "A Spor";
          else if (url.includes("fotomac")) parsedSource = "Fotomaç";

          return parseRssXml(text, parsedSource);
        } catch (err) {
          console.error(`Failed to fetch RSS from ${url}:`, err);
          return [];
        }
      }));

      let allNews = parsedFeeds.flat();

      // Fallback/Backup news items to ensure ticker is never empty if feeds fail
      if (allNews.length === 0) {
        allNews = [
          { id: 'n1', title: 'Türkiye genelinde sportif etkinlikler tüm hızıyla devam ediyor.', source: 'TRT Spor', time: '10 dk önce', category: 'Gündem' },
          { id: 'n2', title: 'Süper Lig transfer dönemi hazırlıkları hız kazandı.', source: 'A Spor', time: '25 dk önce', category: 'Ekonomi' },
          { id: 'n3', title: 'Yeni spor yatırımları ve tesisleri projesi duyuruldu.', source: 'Haber', time: '45 dk önce', category: 'Ekonomi' },
          { id: 'n4', title: 'Milli voleybol takımı dünya arenalarında rekor kırıyor.', source: 'TRT Spor', time: '1 saat önce', category: 'Eğitim' },
          { id: 'n5', title: 'Genç yeteneklerin keşfedileceği ulusal altyapı ligleri başlıyor.', source: 'Fanatik', time: '2 saat önce', category: 'Teknoloji' }
        ];
      }

      res.json(allNews.slice(0, 40)); // Return top 40 news items maximum
    } catch (error) {
      console.error("Failed to compile RSS news feed:", error);
      res.status(500).json({ error: "Failed to fetch live RSS news" });
    }
  });

  // League Standings Endpoint
  app.get("/api/standings", async (req, res) => {
    const leagues = [
      { id: 'tur.1', name: 'Trendyol Süper Lig' },
      { id: 'eng.1', name: 'Premier League' },
      { id: 'esp.1', name: 'La Liga' },
      { id: 'ita.1', name: 'Serie A' },
      { id: 'ger.1', name: 'Bundesliga' }
    ];

    try {
      const results = await Promise.all(leagues.map(async (league) => {
        try {
          const response = await fetch(`https://site.api.espn.com/apis/v2/sports/soccer/${league.id}/standings`, {
            timeout: 5000
          });
          const data: any = await response.json();
          
          if (!data.children || !data.children[0] || !data.children[0].standings) return null;

          const entries = data.children[0].standings.entries.map((item: any) => {
            const stats = item.stats || [];
            return {
              rank: item.stats.find((s: any) => s.name === 'rank')?.value || 0,
              team: item.team.displayName,
              logo: item.team.logos?.[0]?.href,
              played: stats.find((s: any) => s.name === 'gamesPlayed')?.value || 0,
              wins: stats.find((s: any) => s.name === 'wins')?.value || 0,
              draws: stats.find((s: any) => s.name === 'ties')?.value || 0,
              losses: stats.find((s: any) => s.name === 'losses')?.value || 0,
              points: stats.find((s: any) => s.name === 'points')?.value || 0,
              gd: stats.find((s: any) => s.name === 'pointDifferential')?.value || 0
            };
          });

          return {
            league: league.name,
            standings: entries
          };
        } catch (e) {
          return null;
        }
      }));

      res.json(results.filter(r => r !== null));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch standings" });
    }
  });

  // Weather Proxy Endpoint
  app.get("/api/weather", async (req, res) => {
    const city = req.query.city as string;
    if (!city) {
      return res.status(400).json({ error: "City parameter is required" });
    }

    try {
      // 1. Geocode
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl, { timeout: 5000 });
      const geoData: any = await geoRes.json();

      if (geoData.results && geoData.results.length > 0) {
        const { latitude, longitude } = geoData.results[0];
        // 2. Fetch weather
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const weatherRes = await fetch(weatherUrl, { timeout: 5000 });
        const weatherData: any = await weatherRes.json();

        return res.json({
          temp: Math.round(weatherData.current_weather.temperature),
          code: weatherData.current_weather.weathercode,
          isDay: weatherData.current_weather.is_day,
          city: city
        });
      }

      res.status(404).json({ error: "City not found" });
    } catch (error: any) {
      console.error("Weather proxy error:", error.message || error);
      // Fallback weather data so the widget never crashes or stays blank
      const hash = city.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const tempFallback = 15 + (hash % 15); // Stable pseudo-random temperature between 15°C and 30°C
      res.json({
        temp: tempFallback,
        code: 0, // Clear sky
        isDay: 1,
        city: city,
        isFallback: true
      });
    }
  });

  // CORS Proxy Endpoint
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "URL parameter is required" });
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      };

      // Add Referer and Origin based on target URL only if it's not a storage provider (to avoid SSRF/spoofing protection filters)
      const isStorageProvider = targetUrl.includes("dropbox.com") || 
                               targetUrl.includes("dropboxusercontent.com") ||
                               targetUrl.includes("github") ||
                               targetUrl.includes("google") ||
                               targetUrl.includes("gitlab");

      if (!isStorageProvider) {
        try {
          const url = new URL(targetUrl);
          headers['Referer'] = url.origin + '/';
          headers['Origin'] = url.origin;
        } catch (e) {
          // ignore
        }
      }

      if (req.headers['range']) {
        headers['Range'] = req.headers['range'] as string;
      }

      // Use a longer timeout and ignore SSL errors (globally handled by NODE_TLS_REJECT_UNAUTHORIZED = "0")
      const response = await fetch(targetUrl, { 
        timeout: 30000,
        headers,
        redirect: 'follow'
      });
      
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      const contentRange = response.headers.get("content-range");
      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      const acceptRanges = response.headers.get("accept-ranges");
      if (acceptRanges) {
        res.setHeader("Accept-Ranges", acceptRanges);
      }

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Cache-Control", "no-cache");

      if (response.status === 206) {
        res.status(206);
      } else {
        res.status(response.status);
      }

      // Stream the response body
      if (response.body) {
        response.body.pipe(res);
      } else {
        res.status(502).json({ error: "Empty response body" });
      }
    } catch (error: any) {
      const errorMessage = error.message || error;
      console.error("Proxy error:", errorMessage);
      
      if (!res.headersSent) {
        // Provide more specific error messages for common IPTV failures
        let status = 502;
        let details = errorMessage;
        
        if (errorMessage.includes("ENOTFOUND")) {
          details = "Sunucu adresi bulunamadı. Yayın linki geçersiz veya alan adı süresi dolmuş olabilir.";
        } else if (errorMessage.includes("ECONNREFUSED")) {
          details = "Sunucu bağlantıyı reddetti. Yayın sunucusu kapalı veya port kısıtlaması var.";
        } else if (errorMessage.includes("ECONNRESET") || errorMessage.includes("socket hang up")) {
          details = "Bağlantı sunucu tarafından kesildi (Sunucu yoğunluğu veya IP engellemesi).";
        } else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
          details = "Sunucu yanıt vermedi (Zaman aşımı). İnternet hızınızı kontrol edin.";
        } else if (errorMessage.includes("EHOSTUNREACH")) {
          details = "Yayın sunucusuna ulaşılamıyor. Ağ rotası bulunamadı.";
        } else if (errorMessage.includes("certificate") || errorMessage.includes("SSL")) {
          details = "SSL/Sertifika hatası. Güvenli bağlantı kurulamadı.";
        } else {
          details = `Bağlantı hatası: ${errorMessage}`;
        }

        res.status(status).json({ 
          error: "Yayın yüklenemedi",
          details: details,
          originalError: errorMessage
        });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
