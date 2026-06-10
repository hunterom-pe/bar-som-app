import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { ParsedMenuSchema, GEMINI_RESPONSE_SCHEMA } from "@/lib/schemas";

// Initialize Gemini client lazily
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
    const { image, text } = body;

    if (!image && !text) {
      return NextResponse.json(
        { error: "Either image (base64) or text must be provided." },
        { status: 400, headers: corsHeaders }
      );
    }

    const ai = getAiClient();
    let contents: Array<string | { text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (image) {
      // Base64 image flow
      // Strip base64 metadata prefix if present
      const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
      let mimeType = "image/jpeg";
      let base64Data = image;

      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }

      contents = [
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        },
        {
          text: "Parse this menu image. Extract every menu item and drink into the response schema. For each item: generate a short unique ID, identify base ingredients/spirits, assign a style family (or 'other'), score flavor dimensions 0-10 based on its profile, and categorize the ABV."
        }
      ];
    } else {
      // Raw text fallback flow
      contents = [
        {
          text: `Parse this menu text. Extract every menu item and drink into the response schema. For each item: generate a short unique ID, identify base ingredients/spirits, assign a style family (or 'other'), score flavor dimensions 0-10 based on its profile, and categorize the ABV.
          
          Menu text:
          ${text}`
        }
      ];
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA
        }
      });
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota") ||
        errMsg.includes("limit")
      ) {
        console.warn("gemini-2.5-pro rate limited or disabled. Falling back to gemini-2.5-flash...");
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: GEMINI_RESPONSE_SCHEMA
          }
        });
      } else {
        throw err;
      }
    }

    const responseText = response.text;
    if (!responseText) {
      return NextResponse.json(
        { error: "Couldn't read that menu — try the paste option?" },
        { status: 422, headers: corsHeaders }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(responseText);
    } catch (err) {
      console.error("Failed to parse Gemini response as JSON:", responseText, err);
      return NextResponse.json(
        { error: "Couldn't read that menu — try the paste option?" },
        { status: 422, headers: corsHeaders }
      );
    }

    // Validate structure using Zod
    const validationResult = ParsedMenuSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      console.error("Zod Validation failure on Gemini response:", validationResult.error.format());
      return NextResponse.json(
        { error: "Couldn't read that menu — try the paste option?" },
        { status: 422, headers: corsHeaders }
      );
    }

    return NextResponse.json(validationResult.data, { headers: corsHeaders });
  } catch (error: unknown) {
    console.error("Error in /api/parse-menu:", error);
    let errorMessage = error instanceof Error ? error.message : "An error occurred while parsing the menu.";
    let statusCode = 500;

    if (
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.includes("quota")
    ) {
      errorMessage = "Gemini API rate limit exceeded. Please wait 30-60 seconds and try again.";
      statusCode = 429;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode, headers: corsHeaders }
    );
  }
}
