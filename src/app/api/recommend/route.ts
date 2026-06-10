import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { recommendDrink } from "@/lib/recommendation";
import { DrinkRating } from "@/lib/types";

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { menu, vibe, adventure, profile, excludeIds = [], zeroProof = false } = body;

    if (!menu || !vibe || !adventure || !profile) {
      return NextResponse.json(
        { error: "Missing required fields (menu, vibe, adventure, profile)." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Compute recommendation locally
    const { pick, runnerUp } = recommendDrink({
      menu,
      vibe,
      adventure,
      profile,
      excludeIds,
      zeroProof
    });

    if (!pick) {
      return NextResponse.json({
        pick: null,
        justification: "",
        runnerUp: null,
        runnerUpJustification: ""
      }, { headers: corsHeaders });
    }

    // 2. Call Gemini for justifications
    const ai = getAiClient();
    const systemInstruction = `You are a sharp, warm bartender friend. Your tone is confident, specific, a little playful, and never sommelier-pretentious.
Write a one-sentence justification (maximum 25 words) for why the user should drink the recommended cocktail based on their current mood, adventure setting, and taste profile.
Also write a brief, highly specific bartender customization secret or ordering tip (maximum 12 words) for the recommended cocktail (e.g. "Order with a mezcal float", "Ask for extra orange peel", "Request an olive rinse").
If a runner-up is provided, also write a justification and customization secret for it.

Here are examples of how you talk:
- Justification: "The mezcal paloma — smoky enough to be interesting, light enough for round two."
  Customization: "Ask the bartender for a smoked salt rim."
- Justification: "You always come back to bitter-and-stirred. The Black Manhattan is that, but with a twist you haven't met."
  Customization: "Ask for orange bitters instead of Angostura."

Do not use generic explanations. Highlight specific flavor interactions or vibe alignment.`;

    const promptText = `
Vibe: ${vibe}
Adventure Setting: ${adventure}
User Taste Profile affinities (0-10): ${JSON.stringify(profile.affinities)}
User Palate History: ${profile.history.slice(-5).map((h: DrinkRating) => `${h.drinkName} (${h.rating})`).join(", ") || "None yet"}
 
Recommended Drink:
- Name: ${pick.name}
- Style: ${pick.styleFamily}
- Ingredients: ${pick.ingredients.join(", ")}
- Description: ${pick.description || "N/A"}
- Flavor Vector: ${JSON.stringify(pick.flavorVector)}
 
Runner-up Drink:
${runnerUp ? `- Name: ${runnerUp.name}
- Style: ${runnerUp.styleFamily}
- Ingredients: ${runnerUp.ingredients.join(", ")}
- Description: ${runnerUp.description || "N/A"}
- Flavor Vector: ${JSON.stringify(runnerUp.flavorVector)}` : "None"}
 
Please generate justifications and customization secrets for the pick and the runner-up.
`;

    const schema = {
      type: "OBJECT",
      properties: {
        pickJustification: {
          type: "STRING",
          description: "One-sentence justification (max 25 words) for the primary recommended drink."
        },
        pickCustomization: {
          type: "STRING",
          description: "A short, specific bartender ordering tweak or customization secret (max 12 words) for the primary recommended drink."
        },
        runnerUpJustification: {
          type: "STRING",
          description: "One-sentence justification (max 25 words) for the runner-up drink (if none, return empty string)."
        },
        runnerUpCustomization: {
          type: "STRING",
          description: "A short, specific bartender ordering tweak or customization secret (max 12 words) for the runner-up drink (if none, return empty string)."
        }
      },
      required: ["pickJustification", "pickCustomization", "runnerUpJustification", "runnerUpCustomization"]
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
          { text: promptText }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
    } catch (err: unknown) {
      console.warn("gemini-2.5-pro failed or is unavailable. Falling back to gemini-2.5-flash...", err);
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: promptText }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
    }

    const responseText = response.text;
    let pickJustification = "";
    let pickCustomization = "";
    let runnerUpJustification = "";
    let runnerUpCustomization = "";

    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        pickJustification = parsed.pickJustification || "";
        pickCustomization = parsed.pickCustomization || "";
        runnerUpJustification = parsed.runnerUpJustification || "";
        runnerUpCustomization = parsed.runnerUpCustomization || "";
      } catch (err) {
        console.error("Failed to parse Gemini justification response:", responseText, err);
      }
    }

    // Fallbacks if Gemini response fails
    if (!pickJustification) {
      pickJustification = `The ${pick.name} matches your vibe perfectly tonight.`;
    }
    if (!pickCustomization) {
      pickCustomization = "Order it exactly as specified on the menu.";
    }
    if (runnerUp && !runnerUpJustification) {
      runnerUpJustification = `Alternatively, the ${runnerUp.name} is a fantastic choice.`;
    }
    if (runnerUp && !runnerUpCustomization) {
      runnerUpCustomization = "Enjoy it standard or ask your bartender's opinion.";
    }

    return NextResponse.json({
      pick,
      justification: pickJustification,
      customization: pickCustomization,
      runnerUp,
      runnerUpJustification,
      runnerUpCustomization
    }, { headers: corsHeaders });
  } catch (error: unknown) {
    console.error("Error in /api/recommend:", error);
    let errorMessage = error instanceof Error ? error.message : "An error occurred while generating recommendation.";
    let statusCode = 500;

    if (
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.includes("quota")
    ) {
      errorMessage = "Gemini API rate limit exceeded. Please wait 30-60 seconds and try again.";
      statusCode = 429;
    } else if (
      errorMessage.includes("503") ||
      errorMessage.includes("UNAVAILABLE") ||
      errorMessage.includes("demand")
    ) {
      errorMessage = "Gemini API is currently experiencing high demand. Please try again in a few moments.";
      statusCode = 503;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode, headers: corsHeaders }
    );
  }
}
