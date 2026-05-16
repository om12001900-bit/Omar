import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Gemini Initialization
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Strategic Advice Endpoint
app.post("/api/strategy/advice", async (req, res) => {
  try {
    const { goals, projects, hieas, userInput } = req.body;

    const context = `
      You are an expert Strategic Vision Advisor for a platform called O.V.9.
      The user is managing their strategic vision.
      
      Current Goals: ${JSON.stringify(goals)}
      Current Projects: ${JSON.stringify(projects)}
      Current Strategic Entities (Hieas): ${JSON.stringify(hieas)}
      
      User Question: ${userInput}
      
      Provide strategic, high-level advice in Arabic. Be professional, inspiring, and concise. 
      Help the user connect their tactical projects to their long-term vision.
      Format the output in Markdown.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: context,
    });

    res.json({ text: response.text });
  } catch (err: unknown) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: "فشل في الحصول على نصيحة استراتيجية حالياً." });
  }
});

async function startServer() {
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
