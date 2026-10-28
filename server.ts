import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper for lazy Gemini AI instance
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  // API Route: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', system: 'Universal Estimating & Valuation Rate Analysis Engine' });
  });

  // API Route: Serve Markdown Spec Docs directly to UI
  app.get('/api/docs/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(process.cwd(), 'docs', filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.json({ success: true, filename, content });
    } else {
      res.status(404).json({ success: false, error: 'Document not found' });
    }
  });

  // API Route: Gemini AI Assistant Chat
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, context } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          reply: `[UEV Assistant (Offline Mode)] I received your query: \"${message}\". Set process.env.GEMINI_API_KEY to activate full AI estimation intelligence. In general, rate analysis item coefficients follow labor / material / equipment (L/M/E) ratios defined by your selected norms catalog.`
        });
      }

      const prompt = `You are the UEV AI Assistant, an expert construction cost estimator and quantity surveyor familiar with international practice (FIDIC, NRM, CSI MasterFormat, local standard methods of measurement).
Context provided: ${JSON.stringify(context || {})}
User question: ${message}

Provide a precise, professional answer including references to standard item codes, unit rates, material lead/lift allowances, or contract and procurement guidelines where applicable. State any assumptions about currency, region and measurement standard.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      res.json({ reply: response.text });
    } catch (err: any) {
      console.error('Gemini chat error:', err);
      res.status(500).json({
        reply: 'Sorry, I encountered an error consulting the AI model. Please verify your Gemini API key.'
      });
    }
  });

  // API Route: AI Norm Suggestion based on project task
  app.post('/api/ai/recommend-norms', async (req, res) => {
    try {
      const { taskDescription } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          suggestions: [
            { code: "03.30", title: "Cast-in-place Concrete C25/30 (1:2:4)", confidence: 0.95 },
            { code: "03.21", title: "Reinforcement Steel Cutting & Binding", confidence: 0.92 },
            { code: "04.20", title: "Brick Masonry 1:3 Mortar", confidence: 0.88 }
          ]
        });
      }

      const prompt = `Given the following construction task description: \"${taskDescription}\", suggest 3 to 5 matching standard norm / item codes, titles, and typical unit specifications in JSON format array. Output JSON only.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      res.json({ rawAI: response.text });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware in Development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UEV Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
