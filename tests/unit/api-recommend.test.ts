import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../../src/app/api/recommend/route";
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

describe("/api/recommend", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  const validPayload = {
    vibe: "winding-down",
    adventure: "safe",
    profile: {
      affinities: {
        boozy: 5, sweet: 5, sour: 5, bitter: 5, smoky: 5, herbal: 5, fruity: 5, creamy: 5, spicy: 5, refreshing: 5
      },
      ratingsCount: 3,
      history: [],
      stylesTried: []
    },
    menu: {
      drinks: [
        {
          id: "margarita",
          name: "Margarita",
          ingredients: ["Tequila", "Lime Juice", "Agave"],
          baseSpirits: ["tequila"],
          styleFamily: "sour",
          flavorVector: {
            boozy: 5, sweet: 4, sour: 7, bitter: 1, smoky: 0, herbal: 1, fruity: 3, creamy: 0, spicy: 0, refreshing: 8
          },
          abvCategory: "standard",
          confidence: 0.95
        },
        {
          id: "old-fashioned",
          name: "Old Fashioned",
          ingredients: ["Bourbon", "Bitters", "Sugar"],
          baseSpirits: ["bourbon"],
          styleFamily: "old-fashioned",
          flavorVector: {
            boozy: 8, sweet: 4, sour: 0, bitter: 6, smoky: 1, herbal: 1, fruity: 1, creamy: 0, spicy: 0, refreshing: 2
          },
          abvCategory: "strong",
          confidence: 0.95
        }
      ],
      warnings: []
    }
  };

  it("returns 400 if required fields are missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/recommend", {
      method: "POST",
      body: JSON.stringify({})
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 200 with recommendation and Gemini justifications", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        pickJustification: "The perfect sour splash to wind down.",
        runnerUpJustification: "A strong classic to sip slowly."
      })
    });

    const request = new NextRequest("http://localhost:3000/api/recommend", {
      method: "POST",
      body: JSON.stringify(validPayload)
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pick.id).toBe("margarita");
    expect(data.justification).toBe("The perfect sour splash to wind down.");
    expect(data.runnerUp.id).toBe("old-fashioned");
    expect(data.runnerUpJustification).toBe("A strong classic to sip slowly.");
  });

  it("handles empty candidate list gracefully", async () => {
    const request = new NextRequest("http://localhost:3000/api/recommend", {
      method: "POST",
      body: JSON.stringify({
        ...validPayload,
        menu: { drinks: [], warnings: [] }
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pick).toBeNull();
    expect(data.runnerUp).toBeNull();
  });
});
