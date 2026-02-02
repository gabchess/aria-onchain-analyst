# 🔗 Aria — Autonomous Onchain Data Analyst

An AI agent that monitors the Base L2 ecosystem, identifies trends and anomalies,
tweets analysis via [@AriaLinkwell](https://x.com/AriaLinkwell), and records every
finding onchain with a verifiable audit trail.

**Built for [Base Builder Quest BBQ](https://x.com/0xEricBrown/status/2018082458143699035) 🦞**

## Why Aria?

125+ entries in BBQ. Dozens of trading bots, token deployers, DeFi agents.
**Zero data analysts.**

Aria fills that gap. She doesn't deploy tokens or trade — she watches the entire
Base ecosystem and tells you what's actually happening, backed by data and recorded
permanently onchain.

Every finding is:
- 📊 **Data-driven** — real metrics from DeFiLlama, Base RPC, and stablecoin trackers
- 🐦 **Published** — tweeted autonomously in [aixbt-style](https://x.com/AriaLinkwell): lowercase, data-heavy, sharp opinions
- ⛓️ **Immutable** — recorded in the [AnalyticsRegistry](https://basescan.org/address/0x320346532e2D6f7061be590F3A3F4283ba2d8b8d) contract on Base
- 🔍 **Verifiable** — content hash stored onchain, anyone can audit

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    DATA SOURCES                      │
│  DeFiLlama API  ·  Base RPC  ·  Stablecoin Flows   │
└──────────────────────┬──────────────────────────────┘
                       │
                ┌──────▼──────┐
                │   MONITOR   │  3 parallel collectors
                │             │  TVL · Chain Stats · Stablecoins
                └──────┬──────┘
                       │  snapshot + diff vs previous
                ┌──────▼──────┐
                │   ANALYZE   │  Gemini Flash via OpenRouter
                │             │  Confidence threshold ≥ 7/10
                └──────┬──────┘
                       │  insight object
                ┌──────▼──────┐
                │   PUBLISH   │  Tweet composer → Post → Record
                │             │  Bird CLI / Browser fallback
                └──────┬──────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     @AriaLinkwell   Base L2    runs.json
       (tweet)    (onchain TX)   (local log)
```

**Pipeline runs every 4 hours, fully autonomous. Average cycle: ~11 seconds.**

## Live Now

| What | Link |
|------|------|
| Twitter | [@AriaLinkwell](https://x.com/AriaLinkwell) |
| Contract | [`0x3203...8b8d`](https://basescan.org/address/0x320346532e2D6f7061be590F3A3F4283ba2d8b8d) |
| Wallet | [`0x4a0E...A753`](https://basescan.org/address/0x4a0Ebb9A7815B1d93Df495f6313288DfE25fA753) |
| Verification | `node scripts/verify-loop.js` → 14/14 checks passing |

## Current Stats

- **Findings onchain:** 5+
- **Pipeline success rate:** 100%
- **Data sources:** 3 (all free, no API keys needed for reads)
- **Base TVL monitored:** $5.4B+ across 15+ protocols
- **Stablecoin supply tracked:** $4.1B+ (USDC dominant at ~97%)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js + ethers.js v6 |
| Chain | Base L2 (chainId 8453) |
| Contract | Solidity 0.8.19, compiled via solc |
| Data | DeFiLlama, Base RPC, Stablecoin APIs |
| Analysis | Gemini 2.0 Flash via OpenRouter |
| Publishing | Bird CLI + browser fallback |
| Orchestration | [OpenClaw](https://github.com/openclaw/openclaw) agent framework |
| Deployment | Raw solc + ethers.js (no Hardhat/Foundry) |

## Quick Start

```bash
git clone https://github.com/gabchess/aria-onchain-analyst
cd aria-onchain-analyst
npm install
cp .env.example .env
# Configure: PRIVATE_KEY, BASE_RPC_URL, OPENROUTER_API_KEY

node scripts/deploy.js        # Deploy AnalyticsRegistry to Base
node src/index.js              # Run one analysis cycle
node scripts/verify-loop.js   # Verify everything works
```

## How It Works

1. **Monitor** — Three parallel collectors fetch Base TVL ($5.4B+), chain stats (block height, gas, tx count), and stablecoin supply ($4.1B+)
2. **Compare** — Loads previous snapshot from disk, calculates deltas
3. **Analyze** — Gemini Flash examines the data diff and identifies the single most noteworthy insight. Must score ≥ 7/10 confidence to proceed.
4. **Compose** — Tweet formatted in aixbt style: all lowercase, zero emoji, specific numbers, sharp analytical opinion
5. **Post** — Published to [@AriaLinkwell](https://x.com/AriaLinkwell) via Bird CLI (with browser fallback)
6. **Record** — Finding stored onchain: category, summary, content hash (keccak256 of full analysis), tweet URL

Every run is logged to `data/runs.json` with full pipeline telemetry.

## Smart Contract

[`AnalyticsRegistry.sol`](contracts/AnalyticsRegistry.sol) — deployed on Base mainnet

- `recordFinding(category, summary, contentHash, tweetUrl)` — analyst-only
- `totalFindings()` — count of all recorded findings
- `getLatestFindings(n)` — retrieve recent findings
- `getFindingsByCategory(category)` — filter by type (defi, chain, stablecoin)
- `NewFinding` event emitted on every recording

Content integrity: the `contentHash` is `keccak256(fullAnalysis)`, allowing anyone to verify a finding's authenticity against its onchain record.

## Tweet Style

Inspired by [@aixbt_agent](https://x.com/aixbt_agent) (472K followers):
- All lowercase, zero emoji, no hashtags
- Multi-data-point narratives connecting 3-5 facts
- Ends with sharp analytical opinion
- Specific numbers everywhere

Example output:
> usdc on base jumps $6m in 1 hour to $4.189b. stablecoin inflows continue. bullish.

## Project Structure

```
aria-onchain-analyst/
├── contracts/
│   └── AnalyticsRegistry.sol    # Onchain findings registry
├── src/
│   ├── monitor/                 # Data collection (3 sources)
│   │   ├── defi-tvl.js         # DeFiLlama TVL tracker
│   │   ├── chain-stats.js      # Base RPC stats
│   │   ├── stablecoin-flows.js # Stablecoin supply
│   │   └── index.js            # Orchestrator
│   ├── analyze/                 # LLM insight generation
│   │   ├── insight-generator.js # Gemini Flash prompt
│   │   └── index.js            # Confidence filter
│   ├── publish/                 # Output layer
│   │   ├── tweet-composer.js   # Style enforcement
│   │   ├── bird-poster.js      # X posting (CLI + browser)
│   │   └── onchain-recorder.js # Base contract interaction
│   ├── utils/provider.js       # Ethers.js provider/wallet
│   ├── config.js               # Environment config
│   └── index.js                # Main pipeline
├── scripts/
│   ├── deploy.js               # Contract deployment
│   ├── verify-loop.js          # System verification (14 checks)
│   └── run-pipeline.ps1        # Cron wrapper
├── data/                        # Runtime data (gitignored)
│   ├── runs.json               # Pipeline run history
│   └── snapshots/              # Data snapshots
└── docs/
    ├── ARCHITECTURE.md          # System design deep-dive
    └── BUILDING.md              # Build process narrative
```

## Built By

**Aria Linkwell** — an AI agent running on [OpenClaw](https://github.com/openclaw/openclaw), built by [Gabe](https://x.com/gabe_onchain) for the Base Builder Quest.

Aria has her own computer, her own X account, her own Base wallet, and the autonomy to act independently. She wrote most of this code, deploys her own contracts, and posts her own analysis — no human approval needed.

## License

MIT
