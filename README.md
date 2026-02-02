# 🔗 Aria — Autonomous Onchain Data Analyst

An AI agent that monitors the Base L2 ecosystem, identifies trends and anomalies,
tweets analysis via [@AriaLinkwell](https://x.com/AriaLinkwell), and records every
finding onchain with a verifiable audit trail.

**Built for [Base Builder Quest BBQ](https://x.com/0xEricBrown/status/2018082458143699035) 🦞**

## What Makes Aria Different

In a sea of token deployers and trading bots, Aria is the **only data analyst agent**.
She doesn't deploy tokens or execute trades — she analyzes the Base ecosystem and
shares real insights that humans can actually use.

Every finding is:
- 📊 **Data-driven** — real metrics from DeFiLlama, Base RPC, and stablecoin flows
- 🐦 **Tweeted** — posted to X autonomously (no human approval)
- ⛓️ **Recorded onchain** — permanently stored in the AnalyticsRegistry contract on Base
- 🔍 **Verifiable** — content hash stored onchain, anyone can verify

## Architecture

```
DeFiLlama + Base RPC + Stablecoins
              │
        ┌─────▼──────┐
        │  MONITOR    │  Collect ecosystem snapshot
        └─────┬──────┘
              │
        ┌─────▼──────┐
        │  ANALYZE    │  LLM identifies most interesting insight
        └─────┬──────┘
              │
        ┌─────▼──────┐
        │  PUBLISH    │  Tweet via Bird CLI + record on Base
        └────────────┘
```

## Live Links

- **X:** [@AriaLinkwell](https://x.com/AriaLinkwell)
- **Contract:** [AnalyticsRegistry on Basescan](https://basescan.org/address/TBD)
- **Wallet:** `0x4a0Ebb9A7815B1d93Df495f6313288DfE25fA753`

## Tech Stack

- **Runtime:** Node.js + ethers.js v6
- **Chain:** Base L2 (chainId 8453)
- **Data:** DeFiLlama API, Base RPC, Stablecoin flows
- **Analysis:** Gemini Flash via OpenRouter
- **Tweeting:** Bird CLI (autonomous, no human review)
- **Orchestration:** OpenClaw agent framework
- **Video:** Remotion + HeyGen Avatar IV

## Setup

```bash
git clone https://github.com/gabchess/aria-onchain-analyst
cd aria-onchain-analyst
npm install
cp .env.example .env
# Fill in your .env values
node scripts/deploy.js    # Deploy contract
node src/index.js         # Run one analysis cycle
```

## How It Works

1. **Monitor** — Fetches Base TVL ($4.2B+), top protocols, gas prices, stablecoin supply
2. **Compare** — Loads previous snapshot, identifies changes
3. **Analyze** — LLM examines data, finds the most interesting insight
4. **Tweet** — Posts analysis in conversational style (no AI slop)
5. **Record** — Stores finding onchain with content hash for verifiability

Runs every 4 hours, fully autonomous. No human in the loop.

## License

MIT
