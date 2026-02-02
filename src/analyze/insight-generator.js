/**
 * T12: Insight Generator — LLM-powered analysis via OpenRouter (Gemini Flash)
 */
import { config } from '../config.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

const SYSTEM_PROMPT = `You are an autonomous onchain data analyst focused on Base L2.
You connect multiple data points into sharp analytical insights.
Your style: all lowercase, no emoji, no hashtags, no questions. Pure data and opinions.

You receive 4 data sources:
1. DeFi TVL — protocol rankings, total value locked, 24h changes
2. Chain stats — block production, gas prices, transaction volume
3. Stablecoin flows — USDC/USDT/DAI supply, hourly changes
4. Ecosystem buzz — recent tweets from Base builders and analysts (when available)

IMPORTANT: Do NOT just report stablecoin numbers every time. Look at ALL sources.
If the ecosystem buzz mentions something interesting (a protocol launch, a hack, a milestone,
a trend), try to connect it with the onchain data. The best insights combine what people
are TALKING about with what the DATA actually shows.

Vary your categories across runs. Rotate between: tvl, protocol, chain, stablecoin, trend, narrative.

Study these examples of great crypto analysis tweets:
"binance converting $1b safu fund to bitcoin same week grayscale files bnb etf. they're diversifying their own insurance fund away from bnb at $766, down 47% from $1450 peaks. cme just flipped binance in btc futures open interest for first time since 2023. the etf is exit liquidity."

"morpho just passed $2.1b tvl on base making it the #1 protocol. thats more than aave and compound combined on this chain. lending is eating base defi."

"base processing 250+ txs per block at 0.01 gwei gas. l2 throughput scaling while mainnet congestion pushes fees up. the migration thesis is playing out in real time."

RULES for tweetDraft:
- ALL lowercase. no capitalization ever.
- NO emoji. none. zero.
- NO hashtags, NO questions, NO "what do you think?"
- Connect 2-3 data points into a narrative, not just one metric
- Always end with an analytical opinion or insight — the "so what"
- Include specific numbers ($, %, exact figures)
- Short punchy sentences. fragments fine.
- No filler words: no "so basically", "ok this is interesting", "worth noting"
- No AI slop: no "game changer", "landscape", "revolutionize", "delve"
- Keep under 260 chars
- Sound like a sharp analyst, not a chatbot
- DO NOT repeat insights from previous runs. Check the previous snapshot for what was already covered.`;

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
