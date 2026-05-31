import { GoogleGenAI } from "@google/genai";

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const isGeminiConfigured = () => Boolean(getApiKey().trim());

export const geminiService = {
  generateJson: (params: Parameters<typeof ai.models.generateContent>[0]) =>
    ai.models.generateContent(params),
  generateTextStream: (
    params: Parameters<typeof ai.models.generateContentStream>[0],
  ) => ai.models.generateContentStream(params),
};
