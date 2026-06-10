import { z } from "zod";

export const FlavorDimensionSchema = z.enum([
  "boozy", "sweet", "sour", "bitter", "smoky", "herbal", "fruity", "creamy", "spicy", "refreshing"
]);

export const StyleFamilySchema = z.enum([
  "old-fashioned", "martini", "sour", "highball", "tiki",
  "negroni", "spritz", "flip-or-cream", "hot", "shot", "other"
]);

export const ParsedDrinkSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.string().optional(),
  ingredients: z.array(z.string()),
  baseSpirits: z.array(z.string()),
  styleFamily: StyleFamilySchema,
  flavorVector: z.object({
    boozy: z.number().min(0).max(10),
    sweet: z.number().min(0).max(10),
    sour: z.number().min(0).max(10),
    bitter: z.number().min(0).max(10),
    smoky: z.number().min(0).max(10),
    herbal: z.number().min(0).max(10),
    fruity: z.number().min(0).max(10),
    creamy: z.number().min(0).max(10),
    spicy: z.number().min(0).max(10),
    refreshing: z.number().min(0).max(10),
  }),
  abvCategory: z.enum(["low", "standard", "strong", "zero"]),
  confidence: z.number().min(0).max(1)
});

export const ParsedMenuSchema = z.object({
  drinks: z.array(ParsedDrinkSchema),
  barName: z.string().optional(),
  warnings: z.array(z.string())
});

export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    barName: { type: "STRING", description: "Name of the bar if visible on the menu, otherwise omit." },
    warnings: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Any parsing warnings, like blurry text or incomplete descriptions."
    },
    drinks: {
      type: "ARRAY",
      description: "List of all parsed items/drinks from the menu.",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING", description: "Unique generated short id, e.g. of, margarita-1, etc." },
          name: { type: "STRING", description: "Name of the item." },
          description: { type: "STRING", description: "The description of the item as printed on the menu." },
          price: { type: "STRING", description: "The price of the item, e.g. '14', '$16.50', '15'." },
          ingredients: { type: "ARRAY", items: { type: "STRING" }, description: "Best effort list of ingredients." },
          baseSpirits: { type: "ARRAY", items: { type: "STRING" }, description: "Base spirits or key components, e.g. ['mezcal', 'tequila'], ['gin']." },
          styleFamily: {
            type: "STRING",
            enum: ["old-fashioned", "martini", "sour", "highball", "tiki", "negroni", "spritz", "flip-or-cream", "hot", "shot", "other"],
            description: "The primary style family this drink belongs to (use 'other' if not a standard cocktail style)."
          },
          flavorVector: {
            type: "OBJECT",
            properties: {
              boozy: { type: "INTEGER", description: "Spirit-forward strength from 0 to 10." },
              sweet: { type: "INTEGER", description: "Sweetness level from 0 to 10." },
              sour: { type: "INTEGER", description: "Citrus/acid sourness from 0 to 10." },
              bitter: { type: "INTEGER", description: "Bitterness from 0 to 10." },
              smoky: { type: "INTEGER", description: "Smokiness/woodiness from 0 to 10." },
              herbal: { type: "INTEGER", description: "Herbal/botanical elements from 0 to 10." },
              fruity: { type: "INTEGER", description: "Fruity elements from 0 to 10." },
              creamy: { type: "INTEGER", description: "Creamy/dairy/egg texture from 0 to 10." },
              spicy: { type: "INTEGER", description: "Spicy heat or baking spices from 0 to 10." },
              refreshing: { type: "INTEGER", description: "Lightness/effervescence/sessionability from 0 to 10." }
            },
            required: ["boozy", "sweet", "sour", "bitter", "smoky", "herbal", "fruity", "creamy", "spicy", "refreshing"],
            description: "Flavor profiles scored 0-10 based on standard mixology logic."
          },
          abvCategory: {
            type: "STRING",
            enum: ["low", "standard", "strong", "zero"],
            description: "ABV category: zero for non-alcoholic/food, low for vermouth/sherry-based (e.g. spritz), standard for typical drinks (1.5-2oz base spirits), strong for heavy hitters (e.g. Old Fashioned, Negroni)."
          },
          confidence: { type: "NUMBER", description: "Confidence score 0.0 to 1.0 that this is a valid menu item." }
        },
        required: ["id", "name", "ingredients", "baseSpirits", "styleFamily", "flavorVector", "abvCategory", "confidence"]
      }
    }
  },
  required: ["drinks", "warnings"]
};
