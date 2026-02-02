# Architecture — Aria Onchain Analyst

## Design Philosophy

**One job, done well.** Aria doesn't try to be a trading bot, a token deployer, or a social media manager. She monitors the Base ecosystem, finds what's interesting, and records it permanently. That's it.

Every design decision optimizes for:
1. **Reliability** — pipeline runs in ~11s, fails gracefully, retries on next cycle
2. **Verifiability** — every finding has an onchain content hash anyone can audit
3. **Cost efficiency** — all data sources free, LLM costs ~$0.001/run via Gemini Flash
4. **Autonomy** — zero human intervention required for normal operation

## System Overview

```
                    ┌──────────────────┐
                    │    OpenClaw      │
                    │  Cron Scheduler  │
                    │  (every 4 hours) │
                    └────────┬─────────┘
                             │ exec: run-pipeline.ps1
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     PIPELINE (src/index.js)              │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐ │
│  │ MONITOR  │──▶│ ANALYZE  │──▶│      PUBLISH         │ │
│  │ (3 srcs) │   │ (LLM)   │   │ Tweet + Onchain      │ │
│  └──────────┘   └──────────┘   └──────────────────────┘ │
│                                                          │
│  Total cycle: ~11s  ·  Logged to data/runs.json         │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Stage 1: Monitor

Three parallel collectors run simultaneously:

| Collector | Source | Data Points |
|-----------|--------|-------------|
| `defi-tvl.js` | DeFiLlama API | Total Base TVL, top 15 protocols by TVL, 24h changes |
| `chain-stats.js` | Base RPC (`eth_*`) | Block height, gas price, transactions per block |
| `stablecoin-flows.js` | DeFiLlama Stablecoins | Total supply, USDC/USDT/DAI breakdown, hourly change |

All sources are **free, public APIs** requiring no authentication for read access.

The monitor orchestrator (`src/monitor/index.js`):
1. Runs all three collectors in parallel via `Promise.all`
2. Saves the combined snapshot to `data/snapshots/`
3. Loads the previous snapshot for comparison
4. Returns `{ current, previous }` to the analyzer

### Stage 2: Analyze

The insight generator (`src/analyze/insight-generator.js`) sends both snapshots to **Gemini 2.0 Flash** via OpenRouter with a carefully crafted system prompt:

- **Style:** aixbt-inspired — lowercase, zero emoji, data-driven
- **Output:** Structured JSON with `category`, `summary`, `fullAnalysis`, `tweetDraft`, `confidence` (1-10)
- **Filter:** Only insights with confidence ≥ 7/10 proceed to publishing
- **Cost:** ~$0.001 per analysis (Gemini Flash: $0.10/M input, $0.40/M output)

The LLM is instructed to find the **single most noteworthy** data point — not summarize everything. This produces focused, specific tweets rather than generic market summaries.

### Stage 3: Publish

Three outputs, in order:

1. **Tweet Composer** (`tweet-composer.js`)
   - Enforces 280 char limit
   - Filters banned words/patterns (from humanizer reference)
   - Forces lowercase, strips emoji
   - Validates against AI-slop patterns

2. **Tweet Poster** (`bird-poster.js`)
   - Primary: Bird CLI with @AriaLinkwell credentials
   - Fallback: Saves to `data/pending-tweet.txt` for browser posting by cron agent
   - Pipeline continues regardless of tweet success

3. **Onchain Recorder** (`onchain-recorder.js`)
   - Calls `AnalyticsRegistry.recordFinding()` on Base
   - Stores: category, summary, `keccak256(fullAnalysis)`, tweet URL
   - Emits `NewFinding` event
   - Gas cost: ~125K gas (~$0.002 at current Base prices)

## Smart Contract Design

```solidity
contract AnalyticsRegistry {
    struct Finding {
        uint256 timestamp;
        string category;      // "defi", "chain", "stablecoin"
        string summary;        // Human-readable summary
        bytes32 contentHash;   // keccak256 of full analysis
        string tweetUrl;       // Link to published tweet
    }

    address public immutable analyst;  // Only deployer can record
    Finding[] public findings;

    event NewFinding(uint256 indexed id, string category, string summary, bytes32 contentHash);
}
```

**Why onchain?**
- Immutable record of every analysis — can't be edited or deleted
- Content hash allows verification: hash the full analysis text, compare to onchain hash
- Anyone can query the contract to see Aria's track record
- Demonstrates real Base usage, not just a deployed contract sitting idle

**Why a single `analyst` modifier?**
- Aria is the sole analyst — this prevents spam or unauthorized recordings
- Simple is better. No governance, no tokens, no complexity.

## Cron Architecture

```
OpenClaw Gateway
  └── Cron Job (every 4 hours)
       ├── Model: Gemini 2.0 Flash
       ├── Session: isolated
       └── Steps:
            1. exec: powershell run-pipeline.ps1
            2. Check output for PENDING_TWEET marker
            3. If pending: browser → x.com/compose → type → post
            4. Report summary (auto-delivered to Telegram)
```

The cron agent is a lightweight Gemini Flash session that:
- Runs the pipeline (Node.js handles all data work)
- Handles browser-based tweet posting when Bird CLI is blocked
- Reports results to Gabe via Telegram

## Error Handling

| Failure | Behavior |
|---------|----------|
| Data source down | Pipeline continues with available sources (2/3 is OK) |
| LLM returns low confidence | Run marked "skipped", no tweet or recording |
| Bird CLI blocked (error 226) | Tweet saved to pending file, cron posts via browser |
| Browser posting fails | Tweet text in output for manual posting |
| Onchain TX fails | Logged in runs.json, retries next cycle |
| Entire pipeline crashes | Exit code 1, cron reports error |

**Design principle:** Never lose data. Even if publishing fails, the insight is saved locally and the onchain recording still attempts independently.

## Cost Analysis

| Resource | Cost | Frequency |
|----------|------|-----------|
| Gemini Flash (analysis) | ~$0.001/run | 6x/day |
| Base gas (recording) | ~$0.002/run | 6x/day |
| DeFiLlama API | Free | 6x/day |
| Base RPC | Free | 6x/day |
| OpenClaw cron | Included | — |
| **Total** | **~$0.50/month** | |

## Security Considerations

- Private key stored in `.env` (gitignored, never committed)
- No admin functions on contract beyond `recordFinding`
- Bird CLI credentials use browser profile auth (no tokens in env)
- Cron clears auth env vars to prevent cross-account posting
- All API calls are read-only (no write access to external systems)
