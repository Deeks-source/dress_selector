import { ClothingItem, ClothingCategory, ChatMessage } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

export const analyzeClothingImage = async (base64Image: string): Promise<any[]> => {
  const prompt = `Analyze this image and identify all distinct clothing items. 
  Format your response as a RAW JSON array of objects (no markdown blocks).
  Fields: name, category, silhouette, color, hexColor, material, pattern, style, season, description, box_2d (array of 4 numbers [ymin, xmin, ymax, xmax] scaled 0-1000).`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000", 
        "X-Title": "StyleMind App"
      },
      body: JSON.stringify({
        model: "google/gemma-4-26b-a4b-it:free",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: base64Image.startsWith('data') ? base64Image : `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`OpenRouter Error (${response.status}):`, err);
      throw new Error(`OpenRouter Error ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]) throw new Error("Invalid OpenRouter response");
    
    const content = data.choices[0].message.content;
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("OpenRouter Vision Error:", e);
    return [];
  }
};

export const getChatStylistResponse = async (
  wardrobe: ClothingItem[],
  history: ChatMessage[],
  userMessage: string,
  userMemory: string[] = [],
  language: string = 'en'
): Promise<{ text: string; itemIds?: string[] } | null> => {
  const contextPrompt = `You are a stylish best friend. 
  WARDROBE: ${JSON.stringify(wardrobe.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color })))}.
  Format JSON: {"text": "message", "itemIds": ["id1"]}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [
          { role: "system", content: contextPrompt },
          ...history.map(msg => ({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text })),
          { role: "user", content: userMessage }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`OpenRouter Chat Error (${response.status}):`, err);
      return null;
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    console.error("OpenRouter Chat Error:", e);
    return null;
  }
};

export const extractStyleMemory = async (history: ChatMessage[], latestMessage: string): Promise<string[]> => {
  const prompt = `Analyze the conversation and extract key user style preferences or profile facts (e.g., "likes blue", "size M", "prefers casual"). 
  Return as a RAW JSON array of strings. Only return new, concrete facts.`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [
          { role: "system", content: prompt },
          ...history.slice(-4).map(msg => ({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text })),
          { role: "user", content: latestMessage }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`OpenRouter Memory Error (${response.status}):`, err);
      return [];
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    return [];
  }
};
