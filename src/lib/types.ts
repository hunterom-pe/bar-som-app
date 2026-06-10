export type FlavorDimension =
  | "boozy"        // spirit-forward strength
  | "sweet"
  | "sour"         // citrus/acid
  | "bitter"
  | "smoky"
  | "herbal"
  | "fruity"
  | "creamy"
  | "spicy"
  | "refreshing";  // light/effervescent/sessionable

export type StyleFamily =
  | "old-fashioned" | "martini" | "sour" | "highball" | "tiki"
  | "negroni" | "spritz" | "flip-or-cream" | "hot" | "shot" | "other";

export interface ParsedDrink {
  id: string;                 // generated
  name: string;
  description?: string;       // as printed on menu
  price?: string;             // keep as string, menus are messy ("14", "$14", "14.5")
  ingredients: string[];      // best-effort extraction
  baseSpirits: string[];      // e.g. ["mezcal"], ["gin"]
  styleFamily: StyleFamily;
  flavorVector: Record<FlavorDimension, number>; // 0–10 each, assigned by Gemini during parsing
  abvCategory: "low" | "standard" | "strong" | "zero"; // include zero-proof support from day one
  confidence: number;         // 0–1, parser's confidence this is a real drink (not a heading/food item)
}

export interface ParsedMenu {
  drinks: ParsedDrink[];
  barName?: string;           // if visible on the menu
  warnings: string[];         // e.g. "image was blurry, some items may be missing"
}

export interface TasteProfile {
  affinities: Record<FlavorDimension, number>; // running averages, 0–10, start neutral at 5
  ratingsCount: number;
  history: DrinkRating[];
  stylesTried: StyleFamily[];
}

export interface DrinkRating {
  drinkName: string;
  styleFamily: StyleFamily;
  flavorVector: Record<FlavorDimension, number>;
  rating: "loved" | "fine" | "nope";
  vibe: Vibe;
  timestamp: string;
}

export type Vibe = "winding-down" | "celebrating" | "date-night" | "one-and-done";
export type Adventure = "safe" | "surprise" | "new-territory";

export interface MenuSearch {
  id: string;
  barName: string;
  menuText: string;
  imageBase64: string | null;
  drinks: ParsedDrink[];
  timestamp: string;
}
