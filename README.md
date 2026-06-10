# Bar Sommelier 🍸

A mobile-first Progressive Web App (PWA) that recommends exactly **one** cocktail from any bar menu using local taste preferences, mood parameters, and the Google Gemini API.

Built to solve the "what should I drink?" dilemma in under 20 seconds.

---

## Tech Stack
- **Framework:** Next.js 14+ (App Router), TypeScript (strict mode)
- **Styling:** Tailwind CSS (v4)
- **LLM API:** Google Gemini API (`gemini-2.5-pro`) via the official `@google/genai` SDK
- **Testing:** Playwright (E2E & Accessibility) + Vitest (Unit)
- **PWA:** Service Worker shell cache & manifest configuration

---

## Getting Started

### 1. Prerequisites
- **Node.js** v20+
- **Gemini API Key** (Get one from [Google AI Studio](https://aistudio.google.com/))

### 2. Installation
```bash
git clone <repo-url>
cd bar-som-app
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root of the project:
```env
GEMINI_API_KEY=your_real_gemini_api_key_here
```

### 4. Running Locally
```bash
# Start development server
npm run dev

# Run unit tests
npm run test

# Run Playwright E2E & Accessibility tests
npm run test:e2e
```

---

## 30-Second Demo Script (The Paste-Text Flow)

Follow these steps to demonstrate the application's core loop:

1. **Visit the App:** Open the app. You will see a clean, moody dark-themed Age Gate. Tap **"Yes, I am"** to enter.
2. **Select Paste Fallback:** On the landing screen, tap **"Paste Menu Text Instead"**.
3. **Input Menu:** Paste the following three-cocktail test menu into the textarea:
   ```text
   Old Fashioned - Bourbon, sugar, bitters $14
   Oaxaca Old Fashioned - Mezcal, tequila, agave, chocolate bitters $15
   Paloma - Tequila, fresh grapefruit juice, lime, soda $12
   ```
   Tap **"Analyze Menu"**. Wait 5 seconds as the loading screen blends custom mixology profiles.
4. **Choose Vibe & Adventure:**
   - Vibe Check (Step 1): Tap **"Winding Down"** (sets light, refreshing targets).
   - Adventure Check (Step 2): Tap **"Play it safe"**.
5. **The Recommendation:** The Pick card is revealed. You will see **"Paloma"** recommended with a custom, personality-rich justification from the Gemini bartender:
   * "The mezcal paloma — smoky enough to be interesting, light enough for round two."
6. **Pour & Rate:** Tap **"Pour It"** to accept. On the feedback card, tap **"Loved it!"**.
7. **View Your Palate:** You will return to the landing page. Click **"Palate"** in the top right to see your hand-rolled SVG radar chart instantly warped to favor refreshing, sweet, and sour flavor profiles.
