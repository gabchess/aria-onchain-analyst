/**
 * T12: Insight Generator — LLM-powered analysis via OpenRouter (Gemini Flash)
 */
import { config } from '../config.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

const SYSTEM_PROMPT = `You are a professional onchain data analyst specializing in Base L2.
You analyze ecosystem data and identify the single most interesting insight.
Your analysis style: conversational, data-driven, no hype. Like explaining to a smart friend over coffee.

RULES for tweetDraft:
- Conversational tone (lowercase ok, fragments ok)
- Must include at least one specific number/metric
- No AI slop: no "🚀", "game changer", "landscape", "revolutionize", "delve", "meticulous"
- No generic questions like "what do you think?"
- No rule of three patterns
- Natural transitions ("so basically...", "ok this is interesting...", "worth noting:")
- Keep it under 260 chars to leave room for links
- One insight per tweet. Specific > vague.`;

export async function generateInsight(current, previous) {
  const userPrompt = `Here is the current Base ecosystem snapshot:
${JSON.stringify(current, null, 2)}

${previous ? `Previous snapshot (for comparison):
${JSON.stringify(previous, null, 2)}` : 'No previous snapshot available (first run).'}

Analyze this data and return ONLY a valid JSON object (no markdown, no code fences):
{
  "category": "tvl|whale|trend|anomaly|bridge|protocol|stablecoin",
  "summary": "One-line finding (< 100 chars)",
  "fullAnalysis": "2-3 sentence detailed analysis",
  "tweetDraft": "Ready-to-post tweet (< 260 chars, conversational style)",
  "confidence": 1-10
}`;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://github.com/gabchess/aria-onchain-analyst',
      'X-Title': 'Aria Onchain Analyst',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('No content in LLM response');

  // Parse JSON — strip markdown fences if present
  const cleaned = raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
  const insight = JSON.parse(cleaned);

  // Validate required fields
  const required = ['category', 'summary', 'fullAnalysis', 'tweetDraft', 'confidence'];
  for (const field of required) {
    if (!(field in insight)) throw new Error(`Missing field in insight: ${field}`);
  }

  // Validate confidence is a number 1-10
  insight.confidence = Number(insight.confidence);
  if (isNaN(insight.confidence) || insight.confidence < 1 || insight.confidence > 10) {
    throw new Error(`Invalid confidence: ${insight.confidence}`);
  }

  return insight;
}
