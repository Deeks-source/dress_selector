
import { GoogleGenAI, Type } from "@google/genai";
import { ClothingItem, ClothingCategory, ChatMessage, DesignerProduct, PriceTier } from "../types";

export const analyzeClothingImage = async (base64Image: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const prompt = `Analyze this image and identify all distinct clothing items.
  Format as JSON array with: name, category, silhouette, color, hexColor, material, pattern, style, season, description, box_2d.`;

  try {
    const response = await ai.models.generateContent({
      model,
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
    return [];
  }
};

export const getChatStylistResponse = async (
  wardrobe: ClothingItem[],
  history: ChatMessage[],
  userMessage: string,
  language: string = 'en'
): Promise<{ text: string; itemIds?: string[] } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const contextPrompt = `You are a stylish best friend. WARDROBE: ${JSON.stringify(wardrobe.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color })))}.
  Format JSON: {"text": "message", "itemIds": ["id1"]}`;

  const contents = [
    { role: 'user', parts: [{ text: contextPrompt }] },
    ...history.map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: msg.text }] })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  try {
    const response = await ai.models.generateContent({
      model,
      contents: contents as any,
      config: { responseMimeType: "application/json" }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (e) {
    return null;
  }
};

export const getShoppingSuggestions = async (
  wardrobe: ClothingItem[],
  location: string | null,
  previousFeedback: string[],
  priceTier: PriceTier,
  language: string = 'en'
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview'; 

  const styleSummary = wardrobe.map(i => `${i.color} ${i.style} ${i.category}`).join(', ');

  const prompt = `Act as a Professional Fashion Procurement Agent. Find 10 products that complement this wardrobe: ${styleSummary}.
  
  CRITICAL ACCURACY CONSTRAINTS:
  1. ATOMIC PAIRING: The 'imageUrl' and 'url' MUST be a verified pair. The image MUST be the main product image from the EXACT 'url' provided. 
  2. NO MISMATCHES: Do not use a generic category image with a specific product link. If you cannot find the direct image for the specific link, skip that item.
  3. PRICE RANGE: Strictly follow "${priceTier}" pricing for ${location || 'Global'}.
  4. LINK VALIDITY: Return ONLY direct Product Detail Pages (PDP). NO search results, NO homepages, NO blogs.
  
  JSON STRUCTURE:
  {
    "advice": "Trend advice based on current fashion week trends.",
    "products": [
      {
        "id": "unique_string",
        "name": "Exact Product Name as it appears on the store",
        "price": "Price with Currency",
        "store": "Brand/Retailer Name",
        "url": "DIRECT_PRODUCT_URL",
        "imageUrl": "DIRECT_IMAGE_OF_THIS_EXACT_PRODUCT",
        "reason": "Why this specific item is the perfect missing piece for their closet.",
        "silhouette": "tee/jeans/hoodie/sneakers/boots/jacket",
        "hexColor": "Dominant product color hex"
      }
    ]
  }`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });

    return response.text ? JSON.parse(response.text) : null;
  } catch (e) {
    console.error("Designer Pro Error:", e);
    return null;
  }
};
