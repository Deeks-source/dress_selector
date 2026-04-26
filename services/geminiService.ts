
import { ClothingItem, ChatMessage, PriceTier } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODEL = "gemma-4-31b-it";
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

/**
 * Robustly extracts and parses the first JSON object or array found in a string.
 * Uses a stack-based bracket matcher to correctly handle nested structures and
 * any conversational text the model may add before or after the JSON.
 */
const parseJSONContent = (text: string) => {
  if (!text) return null;

  // Find the first occurrence of [ or {
  const startMatch = text.match(/[\[\{]/);
  if (!startMatch) {
    console.error("Raw text from AI:", text);
    throw new Error("No JSON structure ( [ or { ) found in response");
  }

  const startIndex = startMatch.index!;
  const opener = text[startIndex];
  const closer = opener === '[' ? ']' : '}';
  
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    // Handle strings to avoid miscounting brackets inside quotes
    if (char === '"' && !escape) {
      inString = !inString;
    }
    if (char === '\\' && inString) {
      escape = !escape;
    } else {
      escape = false;
    }

    if (!inString) {
      if (char === opener) depth++;
      else if (char === closer) depth--;

      // Once depth returns to 0, we found the exact matching closing bracket
      if (depth === 0) {
        const jsonCandidate = text.substring(startIndex, i + 1);
        try {
          return JSON.parse(jsonCandidate);
        } catch (e) {
          console.error("Failed to parse extracted segment:", jsonCandidate);
          throw e;
        }
      }
    }
  }

  // Fallback
  const lastIndex = text.lastIndexOf(closer);
  if (lastIndex > startIndex) {
    return JSON.parse(text.substring(startIndex, lastIndex + 1));
  }

  throw new Error("Incomplete JSON structure found in response");
};

/**
 * Extracts all top-level { } JSON objects found in a string and returns them as an array.
 * Used when the model returns multiple objects instead of a wrapping array.
 */
const extractJSONObjects = (text: string): any[] => {
  const results: any[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '{') {
      let depth = 0;
      let inString = false;
      let escape = false;
      const start = i;
      for (; i < text.length; i++) {
        const char = text[i];
        if (char === '"' && !escape) inString = !inString;
        if (char === '\\' && inString) { escape = !escape; } else { escape = false; }
        if (!inString) {
          if (char === '{') depth++;
          else if (char === '}') depth--;
          if (depth === 0) {
            try {
              results.push(JSON.parse(text.substring(start, i + 1)));
            } catch (_) { /* skip malformed block */ }
            i++;
            break;
          }
        }
      }
    } else {
      i++;
    }
  }
  return results;
};

/**
 * Parses the model's markdown numbered list format into clothing objects.
 * Used when the model returns a bullet-point list instead of JSON.
 * Example input: "1. **Blue T-shirt**:\n   * Name: Blue T-shirt\n   * Category: Tops\n   ..."
 */
const parseMarkdownClothingList = (text: string): any[] => {
  const items: any[] = [];
  // Split on numbered list entries like "1.  ", "2.  " etc.
  const sections = text.split(/\n?\d+\.\s+/);

  for (const section of sections.slice(1)) {
    const item: any = {};

    // Extract name from **Bold Header**
    const nameMatch = section.match(/\*\*(.+?)\*\*/);
    if (nameMatch) item.name = nameMatch[1].replace(/:$/, '').trim();

    // Extract each field by label
    const fields: [string, string][] = [
      ['name',        'Name'],
      ['category',    'Category'],
      ['silhouette',  'Silhouette'],
      ['color',       'Color'],
      ['hexColor',    'HexColor|Hex Color|Hex'],
      ['material',    'Material'],
      ['pattern',     'Pattern'],
      ['style',       'Style'],
      ['season',      'Season'],
      ['description', 'Description'],
    ];
    for (const [key, labels] of fields) {
      const re = new RegExp(`(?:${labels}):\\s*(.+?)(?=\\n|$)`, 'i');
      const m = section.match(re);
      if (m) item[key] = m[1].replace(/\(.*?\)/g, '').replace(/\*+/g, '').trim();
    }

    // Extract bounding box [ymin, xmin, ymax, xmax]
    const boxMatch = section.match(/\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]/);
    item.box_2d = boxMatch
      ? [+boxMatch[1], +boxMatch[2], +boxMatch[3], +boxMatch[4]]
      : null;

    // Normalise category to lowercase singular
    if (item.category) {
      const c = item.category.toLowerCase();
      if (c.includes('top') || c.includes('shirt') || c.includes('hoodie') ||
          c.includes('jacket') || c.includes('blouse') || c.includes('sweater')) {
        item.category = 'top';
      } else if (c.includes('bottom') || c.includes('pant') || c.includes('jean') ||
                 c.includes('skirt') || c.includes('short')) {
        item.category = 'bottom';
      } else if (c.includes('shoe') || c.includes('sneaker') || c.includes('boot')) {
        item.category = 'shoes';
      } else if (c.includes('dress')) {
        item.category = 'dress';
      } else if (c.includes('outerwear') || c.includes('coat')) {
        item.category = 'outerwear';
      }
    }

    if (item.name) items.push(item);
  }

  return items;
};

/**
 * Core helper to call the Gemma API directly via URL (no library needed).
 */
const callGemma = async (contents: any, responseMimeType?: string, tools?: any[]) => {
  // NOTE: system_instruction removed — it caused the model to echo constraints
  // and produce chain-of-thought reasoning that broke JSON parsing.
  const body: any = { contents };
  
  if (responseMimeType) {
    body.generationConfig = { responseMimeType };
  }
  
  if (tools) {
    body.tools = tools;
  }

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemma API Error (${response.status}):`, errorText);
    throw new Error(`Gemma API Error ${response.status}`);
  }

  const data = await response.json();
  if (!data.candidates || !data.candidates[0]) {
    throw new Error("Invalid response from Gemma API");
  }

  return data.candidates[0].content.parts[0].text;
};

// ─── RESPONSE PARSERS ───────────────────────────────────────────────────────

/**
 * For chat: finds the LAST { } object with a real 'text' field (not the echoed template).
 * The model echoes {"text":"message"} early, then writes the real answer at the end.
 */
const findLastValidChatJSON = (raw: string): { text: string; itemIds?: string[] } | null => {
  const all = extractJSONObjects(raw);
  // Walk from end to start — the real answer is always last
  // Skip placeholders: "message", "...", or anything under 10 chars
  for (let i = all.length - 1; i >= 0; i--) {
    const obj = all[i];
    if (obj.text && typeof obj.text === 'string' && obj.text.length >= 10 && obj.text !== 'message') {
      return obj;
    }
  }
  return null;
};

/**
 * For chat: parses the markdown bullet format the model sometimes uses.
 * Handles lines like:  *   Text: "..."  and  *   ItemIds: `[...]`
 */
/**
 * Universal chat response parser — works regardless of which label the model uses.
 * 1. Finds itemIds by their consistent array-of-alphanumeric-IDs pattern.
 * 2. Finds the message text by looking for any labeled quoted string (Message/Text/Recommendation/etc.)
 *    or falling back to the longest meaningful quoted string in the response.
 */
const parseSmartChatResponse = (raw: string): { text: string; itemIds?: string[] } | null => {
  // Step 1: Find itemIds — always ["id1","id2"] with short alphanumeric IDs
  let itemIds: string[] = [];
  const idMatch = raw.match(/\["[a-z0-9]{5,15}"(?:,\s*"[a-z0-9]{5,15}")*\]/i);
  if (idMatch) {
    try { itemIds = JSON.parse(idMatch[0]); } catch { }
  }

  // Step 2: Scan line by line — collect ALL quoted strings ≥20 chars that look like sentences.
  // The model always writes the final formatted answer last, so the last valid one wins.
  let messageText = '';
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.replace(/\r/g, '').trim();
    // Match any "quoted text" on this line (at least 20 chars, must be a sentence with spaces)
    const m = line.match(/"(.{20,})"/);
    if (m && m[1].includes(' ') && m[1] !== '...' && !m[1].includes('itemIds') && !m[1].includes('"text"')) {
      messageText = m[1]; // keep updating — last valid quoted string wins
    }
  }

  if (!messageText) return null;
  return { text: messageText.trim(), ...(itemIds.length && { itemIds }) };
};

/**
 * For memory: finds the LAST [ ] array in the text (skips template examples).
 */
const findLastJSONArray = (raw: string): any[] => {
  const results: any[] = [];
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === '[') {
      let depth = 0, inStr = false, esc = false;
      const start = i;
      for (; i < raw.length; i++) {
        const c = raw[i];
        if (c === '"' && !esc) inStr = !inStr;
        if (c === '\\' && inStr) { esc = !esc; } else { esc = false; }
        if (!inStr) {
          if (c === '[') depth++;
          else if (c === ']') depth--;
          if (depth === 0) {
            try { results.push(JSON.parse(raw.substring(start, i + 1))); } catch { }
            i++; break;
          }
        }
      }
    } else { i++; }
  }
  return results.length > 0 ? results[results.length - 1] : [];
};

// ─── ORIGINAL PROMPTS PRESERVED EXACTLY ────────────────────────────────────

export const analyzeClothingImage = async (base64Image: string): Promise<any[]> => {
  const prompt = `Analyze this image and identify all distinct clothing items.
  Format as JSON array with: name, category, silhouette, color, hexColor, material, pattern, style, season, description, box_2d (array of 4 numbers [ymin, xmin, ymax, xmax] scaled 0-1000, if uncertain return null).`;

  try {
    const contents = [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
        { text: prompt }
      ]
    }];
    
    const text = await callGemma(contents, "application/json");
    console.log("[Gemma Vision] Raw response:", text);

    // Pass 1: Try standard JSON parse
    try {
      const parsed = parseJSONContent(text);
      // Validate it's an array of clothing OBJECTS, not an array of numbers (e.g. a bounding box)
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
        console.log("[Gemma Vision] Parsed as JSON array:", parsed);
        return parsed;
      }
      if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null && parsed.name) {
        console.log("[Gemma Vision] Parsed as single JSON object:", [parsed]);
        return [parsed];
      }
    } catch (_) { /* fall through */ }

    // Pass 2: Extract { } objects scattered in text
    const objects = extractJSONObjects(text);
    if (objects.length > 0 && objects[0].name) {
      console.log("[Gemma Vision] Extracted { } objects:", objects);
      return objects;
    }

    // Pass 3: Model returned markdown list — parse it directly
    const mdItems = parseMarkdownClothingList(text);
    console.log("[Gemma Vision] Parsed from markdown:", mdItems);
    return mdItems;
  } catch (e) {
    console.error("Gemma Vision Error:", e);
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
  USER PREFERENCES/PROFILE FACTS: ${JSON.stringify(userMemory)}
  WARDROBE: ${JSON.stringify(wardrobe.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color })))}.
  Format JSON: {"text": "message", "itemIds": ["id1"]}`;

  // Context as first user turn (Gemma has no system role) → model reply → history → new user message
  const contents = [
    { role: 'user',  parts: [{ text: contextPrompt }] },
    { role: 'model', parts: [{ text: '{"text":"Understood! I\'m your stylish best friend. How can I help?","itemIds":[]}' }] },
    ...history.map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: msg.text }] })),
    { role: 'user',  parts: [{ text: userMessage }] }
  ];

  try {
    const text = await callGemma(contents, "application/json");
    console.log("[Gemma Chat] Raw response:", text);

    // Try 1: clean JSON object (happy path)
    const fromJSON = findLastValidChatJSON(text);
    if (fromJSON) {
      console.log("[Gemma Chat] Parsed from JSON:", fromJSON);
      return fromJSON;
    }

    // Try 2: universal smart parser (handles any label: Message/Text/Recommendation/etc.)
    const fromSmart = parseSmartChatResponse(text);
    if (fromSmart) {
      console.log("[Gemma Chat] Parsed from smart parser:", fromSmart);
      return fromSmart;
    }

    console.warn("[Gemma Chat] Could not parse response:", text);
    return null;
  } catch (e) {
    console.error("Gemma Chat Error:", e);
    return null;
  }
};

export const extractStyleMemory = async (
  history: ChatMessage[],
  userMessage: string
): Promise<string[]> => {
  const prompt = `Analyze this user chat sequence and extract any new, permanent facts about their style preferences, physical traits, lifestyle, sizing, or dislikes.
  If they mention they "hate the color yellow" or "work in a corporate office", that's a key fact!
  Return a JSON array of strings containing the facts. If no clear facts exist, return an empty array [].
  
  Chat History:
  ${history.slice(-4).map(h => `${h.role}: ${h.text}`).join('\n')}
  User: ${userMessage}
  `;

  try {
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const text = await callGemma(contents, "application/json");
    console.log("[Gemma Memory] Raw response:", text);
    // Use the LAST array found — model may reason before the real answer
    const parsed = findLastJSONArray(text);
    console.log("[Gemma Memory] Parsed result:", parsed);
    return Array.isArray(parsed) ? parsed.filter((v: any) => typeof v === 'string') : [];
  } catch (e) {
    console.error("Gemma Memory Error:", e);
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
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const text = await callGemma(contents, "application/json", [{ googleSearch: {} }]);
    console.log("[Gemma Shopping] Raw response:", text);
    const parsed = parseJSONContent(text);
    console.log("[Gemma Shopping] Parsed result:", parsed);
    return parsed;
  } catch (e) {
    console.error("Gemma Shopping Error:", e);
    try {
      const text = await callGemma([{ role: 'user', parts: [{ text: prompt }] }], "application/json");
      console.log("[Gemma Shopping Fallback] Raw response:", text);
      const parsed = parseJSONContent(text);
      console.log("[Gemma Shopping Fallback] Parsed result:", parsed);
      return parsed;
    } catch (innerE) {
      return null;
    }
  }
};
