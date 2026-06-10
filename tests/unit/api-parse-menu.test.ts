import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../../src/app/api/parse-menu/route";
import { NextRequest } from "next/server";

// Mock @google/genai
const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent
      };
    }
  };
});

describe("/api/parse-menu", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  it("returns 400 if both image and text are missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/parse-menu", {
      method: "POST",
      body: JSON.stringify({})
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Either image");
  });

  it("returns 200 with parsed menu on valid Gemini response", async () => {
    const mockParsedMenu = {
      barName: "The Local",
      warnings: [],
      drinks: [
        {
          id: "margarita",
          name: "Margarita",
          description: "Classic lime margarita",
          price: "$14",
          ingredients: ["Tequila", "Lime Juice", "Agave"],
          baseSpirits: ["tequila"],
          styleFamily: "sour",
          flavorVector: {
            boozy: 5, sweet: 4, sour: 7, bitter: 1, smoky: 0, herbal: 1, fruity: 3, creamy: 0, spicy: 0, refreshing: 8
          },
          abvCategory: "standard",
          confidence: 0.95
        }
      ]
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockParsedMenu)
    });

    const request = new NextRequest("http://localhost:3000/api/parse-menu", {
      method: "POST",
      body: JSON.stringify({ text: "Margarita - Tequila, lime, agave - $14" })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.barName).toBe("The Local");
    expect(data.drinks[0].name).toBe("Margarita");
  });

  it("returns 422 if Gemini response is malformed JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "this is not JSON"
    });

    const request = new NextRequest("http://localhost:3000/api/parse-menu", {
      method: "POST",
      body: JSON.stringify({ text: "some menu" })
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toBe("Couldn't read that menu — try the paste option?");
  });

  it("returns 422 if Gemini response fails Zod validation (e.g. missing fields)", async () => {
    const invalidMenu = {
      drinks: [
        {
          name: "Broken Drink" // Missing id, ingredients, styleFamily, flavorVector, confidence, abvCategory
        }
      ]
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(invalidMenu)
    });

    const request = new NextRequest("http://localhost:3000/api/parse-menu", {
      method: "POST",
      body: JSON.stringify({ text: "some menu" })
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toBe("Couldn't read that menu — try the paste option?");
  });
});
