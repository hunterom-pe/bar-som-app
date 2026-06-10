import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

test.describe("Spec E2E & Accessibility Flow", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock /api/parse-menu
    await page.route("**/api/parse-menu", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          barName: "The Mock Tail",
          drinks: [
            {
              id: "margarita",
              name: "Margarita",
              description: "Tequila, lime, agave",
              price: "$14",
              ingredients: ["Tequila", "Lime", "Agave"],
              baseSpirits: ["tequila"],
              styleFamily: "sour",
              flavorVector: {
                boozy: 5, sweet: 4, sour: 7, bitter: 1, smoky: 0, herbal: 1, fruity: 3, creamy: 0, spicy: 0, refreshing: 8
              },
              abvCategory: "standard",
              confidence: 0.95
            },
            {
              id: "virgin-mojito",
              name: "Virgin Mojito",
              description: "Mint, lime, soda, sugar",
              price: "$8",
              ingredients: ["Mint", "Lime", "Soda", "Sugar"],
              baseSpirits: [],
              styleFamily: "highball",
              flavorVector: {
                boozy: 0, sweet: 6, sour: 6, bitter: 1, smoky: 0, herbal: 6, fruity: 3, creamy: 0, spicy: 0, refreshing: 9
              },
              abvCategory: "zero",
              confidence: 0.95
            }
          ],
          warnings: []
        })
      });
    });

    // 2. Mock /api/recommend
    await page.route("**/api/recommend", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          pick: {
            id: "margarita",
            name: "Margarita",
            description: "Tequila, lime, agave",
            price: "$14",
            ingredients: ["Tequila", "Lime", "Agave"],
            baseSpirits: ["tequila"],
            styleFamily: "sour",
            flavorVector: {
              boozy: 5, sweet: 4, sour: 7, bitter: 1, smoky: 0, herbal: 1, fruity: 3, creamy: 0, spicy: 0, refreshing: 8
            },
            abvCategory: "standard",
            confidence: 0.95
          },
          justification: "A crisp, refreshing classic to lift the spirits.",
          runnerUp: {
            id: "virgin-mojito",
            name: "Virgin Mojito",
            description: "Mint, lime, soda, sugar",
            price: "$8",
            ingredients: ["Mint", "Lime", "Soda", "Sugar"],
            baseSpirits: [],
            styleFamily: "highball",
            flavorVector: {
              boozy: 0, sweet: 6, sour: 6, bitter: 1, smoky: 0, herbal: 6, fruity: 3, creamy: 0, spicy: 0, refreshing: 9
            },
            abvCategory: "zero",
            confidence: 0.95
          },
          runnerUpJustification: "A refreshing mocktail alternative."
        })
      });
    });
  });

  test("runs full paste flow, rates drink, and checks profile", async ({ page }) => {
    // Navigate to homepage
    await page.goto("/");

    // --- SCREEN 0: Age Gate ---
    await expect(page.locator("text=Are you 21 or older?").or(page.locator("text=Are you of legal drinking age?"))).toBeVisible();
    await page.click("text=Yes, I am");

    // --- SCREEN 1: Landing ---
    await expect(page.locator("text=Decide in Seconds")).toBeVisible();
    
    // Inject axe-core and verify landing page accessibility
    await injectAxe(page);
    await checkA11y(page);

    // Verify Landing Page visual layout
    if (!process.env.CI) {
      await expect(page).toHaveScreenshot("landing.png");
    }

    // Transition to Paste Text Flow
    await page.click("text=Paste Menu Text Instead");

    // --- SCREEN 2: Paste Menu ---
    await page.fill("textarea", "Margarita - Tequila, lime, agave - $14\nVirgin Mojito - Mint, lime, soda - $8");
    await page.click("button:has-text('Analyze Menu')");

    // --- SCREEN 3: Mood Questions (Step 1 - Vibe) ---
    await expect(page.locator("text=What's the vibe tonight?")).toBeVisible();
    await checkA11y(page);
    
    // Tap "Winding Down"
    await page.click("text=Winding Down");

    // --- SCREEN 4: Mood Questions (Step 2 - Adventure) ---
    await expect(page.locator("text=How adventurous?")).toBeVisible();
    
    // Verify Mood Questions visual layout
    if (!process.env.CI) {
      await expect(page).toHaveScreenshot("mood-questions.png");
    }
    
    // Tap "Play it safe"
    await page.click("text=Play it safe");

    // --- SCREEN 5: Recommendation (The Pick) ---
    await expect(page.locator("text=Here is your drink")).toBeVisible();
    await expect(page.locator("h2:has-text('Margarita')")).toBeVisible();
    await expect(page.locator("text=A crisp, refreshing classic to lift the spirits.")).toBeVisible();
    
    await checkA11y(page);
    
    // Verify Recommendation visual layout
    if (!process.env.CI) {
      await expect(page).toHaveScreenshot("recommendation.png");
    }

    // Accept drink
    await page.click("button:has-text('Pour It')");

    // --- SCREEN 6: Rating ---
    await expect(page.locator("text=How was the Margarita?")).toBeVisible();
    await page.click("text=Loved it!");

    // Wait for auto redirect back to Landing page (about 2 seconds)
    await page.waitForSelector("text=Decide in Seconds", { timeout: 4000 });

    // --- SCREEN 7: Taste Profile ---
    await page.click("button:has-text('Palate')");
    await expect(page.locator("text=Your Palate")).toBeVisible();
    await expect(page.locator("text=Drinks Rated")).toBeVisible();
    
    // Verify local storage was updated
    const profileData = await page.evaluate(() => localStorage.getItem("spec_profile_v1"));
    expect(profileData).not.toBeNull();
    const parsedProfile = JSON.parse(profileData!);
    expect(parsedProfile.ratingsCount).toBe(1);
    expect(parsedProfile.history[0].drinkName).toBe("Margarita");
    expect(parsedProfile.history[0].rating).toBe("loved");
  });
});
