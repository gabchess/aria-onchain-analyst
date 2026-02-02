# AGENTS.md — Aria Onchain Analyst

## Project Goal
Autonomous onchain data analyst agent that monitors Base L2, identifies trends/anomalies,
tweets analysis via @AriaLinkwell, and records every finding onchain via AnalyticsRegistry contract.

**Competition:** Base Builder Quest BBQ — 5 ETH prize, deadline Feb 8 2026 11:59 PM EST.

## Tech Stack
- **Runtime:** Node.js (ES modules)
- **Chain:** Base L2 (chainId 8453, RPC: https://mainnet.base.org)
- **Smart contract:** Solidity 0.8.19, compiled with solc npm, deployed via ethers.js v6
- **Data APIs:** DeFiLlama (free), Basescan/Etherscan API v2 (free), CoinGecko (free)
- **Tweeting:** Bird CLI with --auth-token/--ct0 flags
- **Analysis:** LLM via OpenRouter (Gemini Flash for cost efficiency)
- **Video:** Remotion + HeyGen Avatar IV (for documentation)

## Project Structure
```
aria-onchain-analyst/
├── AGENTS.md                    # This file
├── README.md                    # Public-facing documentation
├── package.json
├── .env.example                 # Required env vars template
├── contracts/
│   └── AnalyticsRegistry.sol
├── scripts/
│   ├── deploy.js                # Compile + deploy to Base
│   ├── verify.js                # Verify on Basescan
│   └── test-record.js           # Test recording a finding
├── src/
│   ├── index.js                 # Main autonomous loop entry point
│   ├── config.js                # All config (RPC, keys, wallet)
│   ├── monitor/
│   │   ├── index.js             # Orchestrates all monitors
│   │   ├── defi-tvl.js          # DeFiLlama Base TVL + protocols
│   │   ├── chain-stats.js       # Base block/gas/tx stats
│   │   ├── whale-tracker.js     # Large USDC/ETH transfers
│   │   └── stablecoin-flows.js  # Stablecoin supply changes
│   ├── analyze/
│   │   ├── index.js             # Orchestrates analysis pipeline
│   │   └── insight-generator.js # LLM-powered analysis
│   ├── publish/
│   │   ├── tweet-composer.js    # Formats insight into tweet
│   │   ├── bird-poster.js       # Posts via Bird CLI
│   │   └── onchain-recorder.js  # Records to AnalyticsRegistry
│   └── utils/
│       ├── wallet.js            # Wallet loading + signing
│       ├── provider.js          # ethers.js Base provider
│       └── logger.js            # Structured logging
├── data/
│   └── findings.json            # Local cache of findings
└── docs/
    ├── ARCHITECTURE.md
    └── BUILDING.md
```

## Coding Standards
- ES modules (import/export)
- Async/await everywhere (no callbacks)
- Each module exports a single main function
- Error handling: try/catch with structured logging
- Config via .env + config.js (never hardcode secrets)
- Keep functions small and testable

## Key Constraints
- Wallet has 0.01 ETH on Base (use gas efficiently)
- Bird CLI cookies may expire (handle gracefully, log warning)
- DeFiLlama has no rate limit but be respectful (cache responses)
- Basescan free tier: 5 calls/sec
- LLM analysis: use Gemini Flash ($0.13/M in) to keep costs near zero
- All tweets must follow anti-slop style guide (no AI clichés)

## What Worked
(Updated after each session)

## What Failed
(Updated after each session)

## Lessons Learned
(Updated after each session)
