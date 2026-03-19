import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create an https agent that ignores SSL errors and hostname verification
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  checkServerIdentity: () => undefined,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

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

      // Add Referer and Origin based on target URL
      try {
        const url = new URL(targetUrl);
        headers['Referer'] = url.origin + '/';
        headers['Origin'] = url.origin;
      } catch (e) {
        // ignore
      }

      if (req.headers['range']) {
        headers['Range'] = req.headers['range'] as string;
      }

      // Use a longer timeout and ignore SSL errors to prevent common IPTV stream failures
      const response = await fetch(targetUrl, { 
        timeout: 30000,
        headers,
        agent: targetUrl.startsWith('https') ? httpsAgent : undefined,
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
      console.error("Proxy error:", error.message || error);
      if (!res.headersSent) {
        res.status(502).json({ 
          error: "Failed to fetch target URL",
          details: error.message || "Unknown error"
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
