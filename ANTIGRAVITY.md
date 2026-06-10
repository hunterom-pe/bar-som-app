# Antigravity Architecture & Guidelines

Welcome to the Bar Sommelier developer documentation. This guide details the internal system architecture, recommendation mathematics, and Gemini API integration.

## Project Structure

```
├── public/                  # Static assets (PWA manifest, service worker, PWA icons)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── parse-menu/  # Gemini menu OCR / parsing endpoint
│   │   │   └── recommend/   # Bartender-ism justification generator
│   │   ├── layout.tsx       # Root layout setting up viewport and PWA metadata
│   │   ├── globals.css      # Custom dark/moody styling and animations
│   │   └── page.tsx         # Main single-page interface
│   ├── components/
│   │   └── PalateChart.tsx  # Hand-rolled SVG radar chart
│   └── lib/
│       ├── types.ts         # TypeScript definitions
│       ├── schemas.ts       # Zod and Gemini response schemas
│       ├── recommendation.ts# Pure scoring algorithm
│       ├── profile-store.ts # LocalStorage state persistence
│       └── image.ts         # Client-side image compressor
└── tests/
    ├── unit/                # Vitest unit tests (recommendation scoring, profile, route mock tests)
    └── e2e/                 # Playwright E2E and axe accessibility tests
```

---

## Canonical Data Models

### Flavor Dimensions
All user preferences and cocktail profiles map onto 10 flavor dimensions, scored **0 to 10**:
- `boozy`: Spirit-forward intensity.
- `sweet`: Sweetness level.
- `sour`: Sourness/acidity (citrus).
- `bitter`: Bitterness (e.g. Campari, amaro, bitters).
- `smoky`: Oak, peat, or mezcal smoke.
- `herbal`: Botanic, herbal, or gin juniper.
- `fruity`: Fruit flavors.
- `creamy`: Egg whites, cream, or dairy texture.
- `spicy`: Heat or baking spices.
- `refreshing`: Lightness, effervescence, or sessionability.

---

## Pure Functions Rule (`lib/recommendation.ts`)

> [!IMPORTANT]
> To keep the core recommendation system testable, maintainable, and mathematically sound, **[recommendation.ts](file:///Users/hunter/.gemini/antigravity/scratch/bar-som-app/src/lib/recommendation.ts) must remain a pure function with zero I/O.**
> It must not read/write to `localStorage`, call API endpoints, or touch the browser DOM. All inputs (parsed menu, vibe, adventure mode, taste profile) must be passed explicitly as arguments.

### Recommendation Math
1. **Profile Blending (Cold Start):**
   If a user has rated `< 3` drinks, their profile is blended with a canonical vibe-based profile to handle cold-starts:
   $$ A_{\text{blended}} = w \cdot A_{\text{user}} + (1 - w) \cdot A_{\text{vibe}} $$
   where $w = \text{ratingsCount} / 3$.
2. **Cosine Similarity:**
   Calculates the alignment between user affinities ($A$) and drink flavor vector ($V$):
   $$ \text{similarity} = \frac{A \cdot V}{\|A\| \|V\|} $$
3. **Vibe Modulation:**
   Post-similarity scores are modulated based on vibe (e.g. `winding-down` penalizes strong drinks and boosts zero/low-ABV and refreshing drinks, while `date-night` penalizes extreme smoky/spicy outliers).
4. **Adventure Filters:**
   - `safe`: Pure sorted score.
   - `surprise`: Perturbs similarity with random noise.
   - `new-territory`: Penalizes already tried style families by `-0.5` to prioritize untried drink styles.

---

## API Endpoints

### 1. `POST /api/parse-menu`
- **Purpose:** Extracts drinks from base64 images or menu text fallbacks.
- **LLM Model:** `gemini-2.5-pro` using native structured JSON schemas (`responseSchema`).
- **Validation:** Zod parses and validates the response object structure before returning.

### 2. `POST /api/recommend`
- **Purpose:** Receives vibe selection and profile details, computes recommendations locally, and triggers Gemini to write a one-sentence justification.
- **LLM Model:** `gemini-2.5-pro` with custom system instructions designed for the bartender friend's tone:
  - *"The mezcal paloma — smoky enough to be interesting, light enough for round two."*
  - Caps at ~25 words.

---

## Image Compression Policy

Always compress and downscale images client-side before uploading to keep network payloads small. The application utilizes a 2D canvas compressor in `src/lib/image.ts` which downscales the image to a maximum edge of `1600px` and outputs a JPEG at `80%` quality.
