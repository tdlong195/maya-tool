import { GoogleGenAI } from "@google/genai";

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const isGeminiConfigured = () => Boolean(getApiKey().trim());
