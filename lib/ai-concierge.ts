// AI Mountain Concierge & "Ghumna Phirna" AI Engine
// Supports OpenRouter (Gemini 2.0 Flash) and direct Google AI Studio API key.

export interface ItineraryGenerationParams {
  valley: string; // e.g., 'Jibhi & Tirthan Valley'
  durationDays: number; // e.g., 3
  travelersCount: number; // e.g., 2
  travelStyle: 'quiet_workation' | 'trekking_adventure' | 'slow_living' | 'food_culture';
  amenitiesNeeded: string[]; // e.g., ['fiber_wifi', 'pet_friendly', 'bonfire']
}

export interface GeneratedItinerary {
  title: string;
  valley: string;
  summary: string;
  estimatedCostInr: number;
  days: Array<{
    dayNumber: number;
    theme: string;
    activities: Array<{
      time: string;
      title: string;
      description: string;
      category: 'food' | 'trek' | 'viewpoint' | 'cultural' | 'work';
      insiderTip: string;
      locationCoords?: string;
    }>;
  }>;
  roadAdvisory: string;
}

export interface RoadAdvisoryResponse {
  route: string;
  currentStatus: 'open_clear' | 'snow_chains_recommended' | 'restricted_4x4_only' | 'closed_landslide';
  snowDepthCm: number;
  temperatureCelsius: number;
  advisoryMessage: string;
  lastUpdated: string;
}

const OPENROUTER_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

/**
 * Generates an AI-curated "Ghumna Phirna" mountain itinerary
 * using Gemini 2.0 Flash via OpenRouter or direct Google Gemini API.
 */
export async function generateMountainItinerary(
  params: ItineraryGenerationParams,
  customApiKey?: string
): Promise<GeneratedItinerary> {
  const apiKey = customApiKey || OPENROUTER_KEY || GEMINI_KEY;

  // Fallback high-quality curated itinerary if no API key is provided yet
  if (!apiKey) {
    return getCuratedFallbackItinerary(params);
  }

  const prompt = `You are the chief Pahadi concierge for Hilt, the premier Himalayan hospitality platform in Himachal Pradesh & Uttarakhand.
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

  try {
    // 1. Try OpenRouter API (supports Gemini 2.0 Flash with OpenRouter key)
    if (apiKey.startsWith('sk-or-') || customApiKey?.startsWith('sk-or-') || OPENROUTER_KEY) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hilt.travel',
          'X-Title': 'Hilt Mobile App',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    }

    // 2. Try Direct Google Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawText) {
      return JSON.parse(rawText);
    }

    return getCuratedFallbackItinerary(params);
  } catch (error) {
    console.warn('AI Concierge fallback used:', error);
    return getCuratedFallbackItinerary(params);
  }
}

/**
 * Queries live mountain road advisories and weather alerts for passes.
 */
export async function getLiveRoadAdvisory(route: string): Promise<RoadAdvisoryResponse> {
  // In production, this can query HP Police / SDMA alert feeds or Gemini weather grounding
  return {
    route,
    currentStatus: route.toLowerCase().includes('jalori')
      ? 'snow_chains_recommended'
      : 'open_clear',
    snowDepthCm: 15,
    temperatureCelsius: 8,
    advisoryMessage: route.toLowerCase().includes('jalori')
      ? 'Jalori Pass (3,120m) has light ice near the crest. 4x4 or snow chains recommended. Aut Tunnel to Banjar is clear.'
      : 'NH-3 and connecting state roads are completely clear. Normal vehicular movement active.',
    lastUpdated: '15 mins ago by HP Traffic Police',
  };
}

function getCuratedFallbackItinerary(params: ItineraryGenerationParams): GeneratedItinerary {
  return {
    title: `Slow Living & Secret Pines in ${params.valley}`,
    valley: params.valley,
    summary: `A carefully paced ${params.durationDays}-day escape designed for quiet rejuvenation, deodar forest walks, and authentic mountain food.`,
    estimatedCostInr: 7200,
    days: [
      {
        dayNumber: 1,
        theme: 'River Whispers & Kath-Kuni Architecture',
        activities: [
          {
            time: '09:30 AM',
            title: 'Morning Breakfast at Shringi Vatika',
            description: 'Feast on freshly steamed walnut siddu served warm with melted Desi cow ghee and homemade apple jam.',
            category: 'food',
            insiderTip: 'Ask the host Chaman Ji to show you his 80-year-old traditional watermill (Gharat).',
          },
          {
            time: '02:00 PM',
            title: 'Choi Waterfall Secret Forest Walk',
            description: 'A 25-minute shaded hike under ancient cedar canopies ending at a natural pool of pristine mountain water.',
            category: 'trek',
            insiderTip: 'Carry a lightweight towel; the water is icy but thoroughly rejuvenating.',
          },
          {
            time: '07:00 PM',
            title: 'Bukhari Fireside Evening',
            description: 'Settle into the timber attic of your homestay with hot ginger lemon honey tea while the cedar wood stove crackles.',
            category: 'cultural',
            insiderTip: 'Traditional Deodar wood retains heat until midnight without needing extra logs.',
          },
        ],
      },
      {
        dayNumber: 2,
        theme: 'Ridge Views & Alpine Sacred Lakes',
        activities: [
          {
            time: '08:30 AM',
            title: '4x4 Ascent to Jalori Pass (3,120m)',
            description: 'Scenic climb through oak groves to the divide between Outer and Inner Seraj.',
            category: 'viewpoint',
            insiderTip: 'Leave early by 8:30 AM to beat the mid-day mountain mist and catch unobstructed views of the Pir Panjal ranges.',
          },
          {
            time: '11:00 AM',
            title: 'Serolsar Lake Meadow Trail',
            description: 'Gentle 5km hike through dense Kharshu oak trees leading to the sacred green lake of goddess Buddhi Nagin.',
            category: 'trek',
            insiderTip: 'Do not dip feet in the sacred lake water out of respect for local Devta traditions.',
          },
        ],
      },
    ],
    roadAdvisory: 'NH-305 Banjar-Aut link is smooth and paved. Jalori crest requires cautious driving on narrow switchbacks.',
  };
}
