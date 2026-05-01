
import { GoogleGenAI, Type } from "@google/genai";
import { ClothingItem, ClothingCategory, ChatMessage, DesignerProduct, PriceTier } from "../types";

// Using Gemini 3 Flash for high-speed styling intelligence
const STYLIST_MODEL = 'gemini-3-flash-preview';

export const analyzeClothingImage = async (base64Image: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Analyze this image and identify all distinct clothing items.
  Format as JSON array with: name, category (MUST be one of: shirt, pants, accessory, shoes, other), silhouette, color, hexColor, material, pattern, style, season, description, box_2d (array of 4 numbers [ymin, xmin, ymax, xmax] scaled 0-1000, if uncertain return null).`;

  try {
    const response = await ai.models.generateContent({
      model: STYLIST_MODEL,
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
    const text = response.text; 
    return text ? JSON.parse(text) : [];
  } catch (e) {
    console.error("AI Image Analysis Error:", e);
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

  const contextPrompt = `You are a stylish best friend and fashion expert. 
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
      model: STYLIST_MODEL,
      contents: contents as any,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.7 
      }
    });
    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("AI Stylist Error:", e);
    return null;
  }
};

export const getOutfitRecommendationForEvent = async (
  wardrobe: ClothingItem[],
  eventTitle: string,
  eventType: string,
  eventLocation: string | null,
  eventDescription: string | null,
  memory: string[] = []
): Promise<{ items: string[], reasoning: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const memoryContext = memory.length > 0 ? `\nUSER PREFERENCES/MEMORY:\n${memory.join('\n')}` : '';

  const prompt = `You are a stylish best friend and fashion expert.
  WARDROBE: ${JSON.stringify(wardrobe.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color, style: i.style }))) }.${memoryContext}
  
  Please recommend an outfit for the following event based ONLY on the items available in the user's wardrobe.
  Event Title: ${eventTitle}
  Event Type: ${eventType}
  Event Location: ${eventLocation || 'Unknown'}
  Event Description / Insights: ${eventDescription || 'None'}
  
  Format your response STRICTLY as a JSON object with the following structure:
  {
    "items": ["id1", "id2"],
    "reasoning": "A brief explanation of why this outfit works for the event..."
  }
  If no suitable outfit can be formed, you can return {"items": [], "reasoning": "I couldn't find a good combination..."}.`;

  try {
    const response = await ai.models.generateContent({
      model: STYLIST_MODEL,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.5 
      }
    });

    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      return { items: data.items || [], reasoning: data.reasoning || '' };
    }
    return { items: [], reasoning: '' };
  } catch (e) {
    console.error("AI Stylist Event Builder Error:", e);
    return { items: [], reasoning: '' };
  }
};

export const tweakEventOutfit = async (
  wardrobe: ClothingItem[],
  eventTitle: string,
  eventDescription: string | null,
  currentOutfitIds: string[],
  chatHistory: { role: string, text: string }[],
  userMessage: string,
  memory: string[] = []
): Promise<{ text: string, itemIds?: string[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const memoryContext = memory.length > 0 ? `\nUSER PREFERENCES/MEMORY:\n${memory.join('\n')}` : '';

  const prompt = `You are a fashion stylist helping to tweak an outfit for an event.
  WARDROBE: ${JSON.stringify(wardrobe.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color }))) }.
  EVENT: ${eventTitle} ${eventDescription ? `(${eventDescription})` : ''}
  CURRENT OUTFIT: ${JSON.stringify(currentOutfitIds)}${memoryContext}
  
  The user is chatting with you about this outfit. Provide a helpful response, and if they ask to change items (like "swap the pants to something else"), return the NEW full list of item IDs.
  Format STRICTLY as JSON: {"text": "Your helpful reply...", "itemIds": ["id1", "id2"]}. 
  If you aren't changing the outfit, don't include itemIds (or pass the current ones).`;

  const contents = [
    { role: 'user', parts: [{ text: prompt }] },
    ...chatHistory.map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: msg.text }] })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  try {
    const response = await ai.models.generateContent({
      model: STYLIST_MODEL,
      contents: contents as any,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.5 
      }
    });
    const text = response.text;
    return text ? JSON.parse(text) : { text: "Sorry, I couldn't process that." };
  } catch (e) {
    console.error("AI Tweak Error:", e);
    return { text: "Error connecting to AI." };
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
      model: STYLIST_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (e) {
    console.error("AI Memory Extraction Error:", e);
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
      model: STYLIST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.8
      }
    });

    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("AI Designer Error:", e);
    return null;
  }
};
