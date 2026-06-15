import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
} catch (err) {
  console.error("Failed to initialize GoogleGenAI:", err);
}

// API endpoint for Gemini summary
app.post("/api/gemini-summary", async (req, res) => {
  try {
    const { schema, sampleData, rowCount } = req.body;
    
    if (!ai) {
      return res.status(500).json({ 
        error: "Gemini API is not initialized. Please configure your GEMINI_API_KEY in the Secrets panel." 
      });
    }

    const prompt = `
      You are an expert data analysis assistant. A user has uploaded a dataset.
      The system has extracted its schema and some sample rows.
      
      Here is the directory of columns and detected data types (schema):
      ${JSON.stringify(schema, null, 2)}
      
      Total rows in dataset: ${rowCount}
      
      Sample records from the dataset (up to 10 rows):
      ${JSON.stringify(sampleData, null, 2)}
      
      Your goal is to provide a highly professional, scannable, and actionable analysis in Thai (ภาษาไทย).
      
      Please structure your output using exactly these markdown headers:
      
      ### 📊 ภาพรวมข้อมูล (Executive Summary)
      Provide a brief 2-3 sentence overview of what this dataset appears to represent, who it concerns, and its overall size. Be precise and clean.
      
      ### 🎯 ข้อมูลเชิงลึกและหมวดหมู่เด่น (Key Insights & Major Categories)
      Based on the columns, data types, and sample data:
      - Point out the largest category, most frequent values, or potential correlations you can infer.
      - What are the main entities?
      - Which partner, division, or item appears most prominently if visible?
      
      ### 📈 แนวโน้มและข้อเสนอแนะเชิงกลยุทธ์ (Data Trends & Actionable Recommendations)
      Provide 2-3 specific, high-value, logical trends or strategic recommendations for further action or exploration based on these columns.
      
      Strict guidelines:
      - Reply ONLY in Thai.
      - Do not include any fake or simulated telemetry like "Core active nodes" or terminal codes. Keep it completely natural and clean.
      - Use rich, clear markdown formatting (bullet points, bold text).
      - Do not hallucinate values that are not present or highly implied. Focus on the actual column names (e.g. "${Object.keys(schema || {}).join(", ")}") and the samples provided.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Gemini proxy error:", error);
    res.status(500).json({ error: error.message || "Something went wrong during Gemini API execution." });
  }
});

// Vite middleware for development or serving compiled build
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

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
