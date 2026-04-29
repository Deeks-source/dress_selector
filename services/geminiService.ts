
import { GoogleGenAI, Type } from "@google/genai";
import { ClothingItem, ClothingCategory, ChatMessage, DesignerProduct, PriceTier } from "../types";

// Official Gemma 4 31B Instruction model for high-quality reasoning and style analysis
const GEMMA_MODEL = 'gemma-4-31b-it';

export const analyzeClothingImage = async (base64Image: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Analyze this image and identify all distinct clothing items.
  Format as JSON array with: name, category, silhouette, color, hexColor, material, pattern, style, season, description, box_2d (array of 4 numbers [ymin, xmin, ymax, xmax] scaled 0-1000, if uncertain return null).`;

  try {
    const response = await ai.models.generateContent({
      model: GEMMA_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });
    // Accessing .text property directly as per @google/genai documentation
    const text = response.text; 
    return text ? JSON.parse(text) : [];
  } catch (e) {
    console.error("Gemma Image Analysis Error:", e);
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const contextPrompt = `You are a stylish best friend and fashion expert powered by Gemma 2. 
  USER PREFERENCES/PROFILE FACTS: ${JSON.stringify(userMemory)}
  WARDROBE: ${JSON.stringify(wardrobe.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color })))}.
  
  Your goal is to provide personalized, high-fashion styling advice. 
  
  Format strictly as JSON: {"text": "Your message here", "itemIds": ["id1", "id2"]}`;

  const contents = [
    { role: 'user', parts: [{ text: contextPrompt }] },
    ...history.map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: msg.text }] })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  try {
    const response = await ai.models.generateContent({
      model: GEMMA_MODEL,
      contents: contents as any,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.7 
      }
    });
    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("Gemma Stylist Error:", e);
    return null;
  }
};

export const extractStyleMemory = async (
  history: ChatMessage[],
  userMessage: string
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Analyze this user chat sequence and extract any new, permanent facts about their style preferences, physical traits, lifestyle, sizing, or dislikes.
  Focus on high-fidelity extraction of style identity.
  Return a JSON array of strings. Empty array [] if no new facts.
  
  Chat History:
  ${history.slice(-4).map(h => `${h.role}: ${h.text}`).join('\n')}
  User: ${userMessage}
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMMA_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (e) {
    console.error("Gemma Memory Extraction Error:", e);
    return [];
  }
};

export const getShoppingSuggestions = async (
  wardrobe: ClothingItem[],
  location: string | null,
  previousFeedback: string[],
  priceTier: PriceTier,
  language: string = 'en'
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const styleSummary = wardrobe.map(i => `${i.color} ${i.style} ${i.category}`).join(', ');

  const prompt = `Act as an Elite Fashion Consultant. Based on this wardrobe: ${styleSummary}, suggest 5 items that would elevate the user's style.
  
  Strictly follow "${priceTier}" pricing for ${location || 'Global'}.
  
  JSON STRUCTURE:
  {
    "advice": "Trend advice based on current high-fashion industry insights.",
    "products": [
      {
        "id": "unique_string",
        "name": "Product Name",
        "price": "Price with Currency",
        "store": "Brand/Retailer Name",
        "url": "https://example.com/product",
        "imageUrl": "https://images.unsplash.com/photo-1543087332-61d0630b9ecc?q=80&w=800",
        "reason": "Expert reasoning for this recommendation.",
        "silhouette": "tee/jeans/hoodie/sneakers/boots/jacket",
        "hexColor": "Hex color"
      }
    ]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: GEMMA_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.8
      }
    });

    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("Gemma Designer Error:", e);
    return null;
  }
};
