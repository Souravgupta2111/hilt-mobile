// Ghumna Phirna trip planner — Gemini 2.5 Flash Lite via OpenRouter,
// Google Gemini direct as fallback. No mock data: throws when unconfigured
// or the provider fails.

export interface ItineraryGenerationParams {
  valley: string; // e.g., 'Jibhi & Tirthan Valley'
  durationDays: number; // e.g., 3
  travelersCount: number; // e.g., 2
  travelStyle: 'quiet_workation' | 'trekking_adventure' | 'slow_living' | 'food_culture';
  amenitiesNeeded: string[]; // e.g., ['fiber_wifi', 'pet_friendly', 'bonfire']
}

export interface GeneratedActivity {
  time: string;
  title: string;
  description: string;
  category: 'food' | 'trek' | 'viewpoint' | 'cultural' | 'work';
  insiderTip: string;
  locationCoords?: string;
}

export interface GeneratedDay {
  dayNumber: number;
  theme: string;
  activities: GeneratedActivity[];
}

export interface GeneratedItinerary {
  title: string;
  valley: string;
  summary: string;
  estimatedCostInr: number;
  days: GeneratedDay[];
  roadAdvisory: string;
}

export interface RoadAdvisoryResponse {
  route: string;
  currentStatus: 'open_clear' | 'snow_chains_recommended' | 'restricted_4x4_only' | 'closed_landslide' | 'unknown_verify_locally';
  snowDepthCm: number | null;
  temperatureCelsius: number | null;
  advisoryMessage: string;
  lastUpdated: string;
}

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const OPENROUTER_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
// Same model family, served through OpenRouter (where the credits live).
const OPENROUTER_MODEL = 'google/gemini-2.5-flash-lite';

function buildPrompt(params: ItineraryGenerationParams): string {
  return `You are the chief Pahadi concierge for Hilt, the premier Himalayan hospitality platform in Himachal Pradesh & Uttarakhand.
Generate a structured, authentic ${params.durationDays}-day mountain itinerary in ${params.valley} for ${params.travelersCount} travelers with style "${params.travelStyle}".
Include local culinary staples (e.g., steamed walnut siddu with cow ghee, grilled Tirthan river trout, Madra), secret trails away from tourist crowds, and exact local timings.
Return ONLY valid raw JSON with this exact structure:
{
  "title": "...",
  "valley": "${params.valley}",
  "summary": "...",
  "estimatedCostInr": 8500,
  "days": [
    {
      "dayNumber": 1,
      "theme": "...",
      "activities": [
        {
          "time": "09:00 AM",
          "title": "...",
          "description": "...",
          "category": "food" | "trek" | "viewpoint" | "cultural" | "work",
          "insiderTip": "..."
        }
      ]
    }
  ],
  "roadAdvisory": "..."
}`;
}

/** Gemini sometimes wraps JSON in fences — extract the object safely. */
function parseItineraryJson(raw: string): GeneratedItinerary {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI returned an unusable response. Try again.');
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as GeneratedItinerary;
  if (!parsed.title || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error('AI returned an incomplete plan. Try again.');
  }
  return {
    ...parsed,
    estimatedCostInr: Number(parsed.estimatedCostInr) || 0,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 45000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function generateViaGemini(prompt: string, key: string): Promise<GeneratedItinerary> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('Gemini took too long. Try again.');
    throw new Error('Could not reach Gemini. Check your connection.');
  }
  if (!res.ok) {
    throw new Error(`Gemini request failed (${res.status}).`);
  }
  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini returned an empty response.');
  return parseItineraryJson(rawText);
}

async function generateViaOpenRouter(prompt: string, valley: string): Promise<GeneratedItinerary> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hilt.travel',
          'X-Title': 'Hilt Mobile App',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      }
    );
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('AI took too long. Try again.');
    throw new Error('Could not reach the AI service. Check your connection.');
  }
  if (!res.ok) {
    throw new Error(`AI request failed (${res.status}).`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI returned an empty response.');
  const parsed = parseItineraryJson(content);
  if (!parsed.valley) parsed.valley = valley;
  return parsed;
}

/**
 * Generates a mountain itinerary with Gemini 2.5 Flash Lite via OpenRouter
 * (where the credits live). Falls back to Google Gemini direct only when no
 * OpenRouter key is configured. Throws on failure — callers show the error.
 */
export async function generateMountainItinerary(
  params: ItineraryGenerationParams,
  customApiKey?: string
): Promise<GeneratedItinerary> {
  const prompt = buildPrompt(params);

  // Explicit override key: route by its shape.
  if (customApiKey) {
    if (customApiKey.startsWith('sk-or-')) return generateViaOpenRouter(prompt, params.valley);
    return generateViaGemini(prompt, customApiKey);
  }

  if (OPENROUTER_KEY) return generateViaOpenRouter(prompt, params.valley);
  if (GEMINI_KEY) return generateViaGemini(prompt, GEMINI_KEY);
  throw new Error('AI planner is not configured. Add EXPO_PUBLIC_OPENROUTER_API_KEY.');
}

/**
 * Road status is not invented locally. Returns an explicit
 * verify-locally advisory so the UI never shows fake snow depths.
 */
export async function getLiveRoadAdvisory(route: string): Promise<RoadAdvisoryResponse> {
  return {
    route,
    currentStatus: 'unknown_verify_locally',
    snowDepthCm: null,
    temperatureCelsius: null,
    advisoryMessage:
      'Live pass telemetry is unavailable in this build. Verify Jalori / Rohtang status with HP Traffic Police before departure.',
    lastUpdated: new Date().toISOString(),
  };
}
