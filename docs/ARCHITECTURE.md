# Architecture — Aria Onchain Analyst

## State Machine: Autonomous Loop

```
                    ┌──────────────┐
                    │    START     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   MONITOR    │── fail ──► LOG_ERROR ──► EXIT(1)
                    │              │
                    │ • DeFi TVL   │
                    │ • Chain stats│
                    │ • Stablecoins│
                    └──────┬───────┘
                           │ success (snapshot)
                    ┌──────▼───────┐
                    │   COMPARE    │
                    │              │
                    │ Load prev    │── no prev ──► Use current only
                    │ snapshot     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   ANALYZE    │── fail ──► LOG_ERROR ──► EXIT(1)
                    │              │
                    │ LLM insight  │── confidence < 7 ──► LOG_SKIP ──► EXIT(0)
                    │ generation   │
                    └──────┬───────┘
                           │ confidence >= 7
                    ┌──────▼───────┐
                    │   COMPOSE    │
                    │              │
                    │ Format tweet │── too long ──► TRUNCATE
                    │ Check slop   │── slop found ──► REGENERATE (1x)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    TWEET     │── fail ──► LOG_ERROR ──► SKIP_TWEET
                    │              │               │
                    │ Bird CLI     │               │ (still record onchain)
                    └──────┬───────┘               │
                           │ success (tweetUrl)    │
                    ┌──────▼───────────────────────▼┐
                    │   RECORD ONCHAIN              │── fail ──► LOG_ERROR ──► EXIT(1)
                    │                               │
                    │ AnalyticsRegistry.recordFinding│
                    └──────┬────────────────────────┘
                           │ success (txHash, findingId)
                    ┌──────▼───────┐
                    │     LOG      │
                    │              │
                    │ Save to      │
                    │ runs.json    │
                    │ findings.json│
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   EXIT(0)    │
                    └──────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
│                                                                  │
│  DeFiLlama API          Base RPC            Stablecoins API     │
│  (TVL, protocols)       (blocks, gas)       (USDC, USDT flows)  │
└────────┬────────────────────┬─────────────────────┬─────────────┘
         │                    │                     │
         └────────────┬───────┴─────────────────────┘
                      │
              ┌───────▼────────┐
              │   SNAPSHOT     │  JSON object with all data
              │   BUILDER      │  + timestamp + prev snapshot
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │   LLM ANALYSIS │  Gemini Flash via OpenRouter
              │                │  Prompt: "Find most interesting insight"
              │   Input: both  │  Output: category, summary, analysis,
              │   snapshots    │          tweetDraft, confidence
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │   TWEET        │  Bird CLI → @AriaLinkwell
              │   COMPOSER     │  Validate: ≤280 chars, no slop
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │   ONCHAIN      │  ethers.js → AnalyticsRegistry
              │   RECORDER     │  Store: category, summary, hash, URL
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │   OUTPUTS      │
              │                │
              │  • Tweet live on X          │
              │  • Finding stored on Base   │
              │  • Local log updated        │
              └────────────────┘
```

## API Endpoints Used

| API | Endpoint | Data | Auth |
|-----|----------|------|------|
| DeFiLlama | GET https://api.llama.fi/protocols | All protocols (filter Base) | None |
| DeFiLlama | GET https://api.llama.fi/v2/chains | All chains TVL | None |
| DeFiLlama | GET https://stablecoins.llama.fi/stablecoinchains | Stablecoin supply | None |
| Base RPC | JSON-RPC https://mainnet.base.org | Blocks, gas, txs | None |
| OpenRouter | POST https://openrouter.ai/api/v1/chat/completions | LLM analysis | API Key |
| Bird CLI | CLI exec | Tweet posting | auth_token + ct0 |
| Base Contract | AnalyticsRegistry.recordFinding() | Onchain storage | Wallet key |

## LLM Prompt Design

```
System: You are a professional onchain data analyst specializing in Base L2.
You analyze ecosystem data and identify the single most interesting insight.
Your analysis style: conversational, data-driven, no hype. Like explaining
to a smart friend over coffee.

User: Here is the current Base ecosystem snapshot:
{current_snapshot_json}

Previous snapshot (for comparison):
{previous_snapshot_json}

Analyze this data and return a JSON object:
{
  "category": "tvl|whale|trend|anomaly|bridge|protocol|stablecoin",
  "summary": "One-line finding (< 100 chars)",
  "fullAnalysis": "2-3 sentence detailed analysis",
  "tweetDraft": "Ready-to-post tweet (< 280 chars, conversational style)",
  "confidence": 1-10 (how interesting/noteworthy is this finding?)
}

Rules for tweetDraft:
- Conversational tone (lowercase ok, fragments ok)
- Must include at least one specific number/metric
- No AI slop (no "🚀", "game changer", "landscape", "revolutionize")
- No generic questions ("what do you think?")
- Natural transitions ("so basically...", "ok this is interesting...")
```

## Gas Budget
- Wallet: 0.01 ETH on Base
- Gas per recordFinding: ~100k gas × 0.015 gwei = ~0.0000015 ETH
- Budget for ~6,500 recordings (way more than needed)
- Deploy cost: ~500k gas = ~0.0000075 ETH

## Error Handling Strategy
- **API failures:** Retry once with 2s delay, then skip with warning
- **LLM failures:** Log and exit (don't publish garbage)
- **Tweet failures:** Log but still record onchain (finding is still valid)
- **Tx failures:** Log with full error, check nonce, retry once
- **All errors:** Write to data/errors.json for debugging
