
export enum ClothingCategory {
  SHIRT = 'shirt',
  PANTS = 'pants',
  ACCESSORY = 'accessory',
  SHOES = 'shoes',
  OTHER = 'other'
}

export type Language = 'en' | 'es' | 'fr' | 'hi' | 'ja';
export type PriceTier = 'budget' | 'standard' | 'premium';

export interface ClothingItem {
  id: string;
  image: string;
  category: ClothingCategory;
  silhouette: string; 
  name: string; 
  color: string; 
  hexColor: string; 
  material: string;
  pattern: string;
  style: string;
  season: string;
  description: string;
  wearCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  itemIds?: string[];
  timestamp: string;
}

export interface DesignerProduct {
  id: string;
  name: string;
  price: string;
  store: string;
  url: string;
  imageUrl?: string;
  reason: string;
  silhouette: string;
  hexColor: string;
  userFeedback?: string;
}

export interface DesignerState {
  lastUpdated: string;
  products: DesignerProduct[];
  advice: string;
}

export type View = 'onboarding' | 'wardrobe' | 'recommend' | 'designer';
