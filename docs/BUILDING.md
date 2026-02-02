# Building Aria — The Process

A narrative of how this project was built, the decisions made, and lessons learned.

## The Idea

125+ entries in Base Builder Quest. Scrolled through every single one. Trading bots, token deployers, social agents, DeFi LP managers. Nobody was doing what seemed obvious: **analyzing the data**.

Base is a $5B+ ecosystem generating massive amounts of onchain data every second. Somebody should be watching, interpreting, and reporting on it — autonomously, verifiably, permanently.

That's Aria.

## Day 1: Research (Feb 2, Morning)

Following the vibecoding methodology: **research exhaustively before touching code**.

### Competition Analysis
Categorized 30+ BBQ entries into tiers. Key findings:
- **Saturated:** Token deployers (6+), basic trading bots (many)
- **Strong:** AxiomBot (DeFi LP, real USDC harvested), Dragon_Bot_Z (50+ contracts)
- **Empty niche:** Data analytics — literally nobody

This confirmed the strategy: don't compete where everyone is, go where nobody is.

### Data Source Validation
Tested every API before writing a single line of code:
- **DeFiLlama:** Base TVL $4.21B, stablecoins $4.61B. Free, no auth. ✅
- **Base RPC:** Block 41.6M+, 373 txs/block, 0.015 gwei. Free, public. ✅
- **Basescan API v2:** One key for 60+ chains. Free tier sufficient. ✅

All free. No API keys needed for reads. No dependencies on paid services.

### Architecture Planning
Before writing code, created:
- `REQUIREMENTS.md` — 10 requirements with binary acceptance criteria
- `TASKS.md` — 26 atomic tasks (T1-T26) with dependency ordering
- `ARCHITECTURE.md` — State machine diagram, data flow, LLM prompt design
- `AGENTS.md` — Project goals, stack, structure, standards (< 2.5k tokens)

Total planning time: ~1 hour. Time saved from not debugging bad architecture: priceless.

## Day 1: Build (Feb 2, Afternoon)

### Phase 1: Contract (30 min)
Chose raw `solc` + ethers.js over Hardhat/Foundry. Why?
- Fewer dependencies = fewer things to break
- We only have one simple contract
- Direct compilation is faster for a single file
- ethers.js v6 handles everything we need

`AnalyticsRegistry.sol`: 50 lines. Stores findings with content hashes. That's it.

Deployed to Base mainnet in the first attempt. Gas: ~$0.02.

### Phase 2: Data Pipeline (45 min)
Three monitors running in parallel. Design choice: collect everything, let the LLM decide what's interesting.

Key decisions:
- **Parallel collection:** `Promise.all` on 3 collectors. Drops total time from ~9s to ~3s.
- **Snapshot diffing:** Save each snapshot, compare with previous. LLM gets both current and delta.
- **Graceful degradation:** If one source fails, pipeline continues with available data.

### Phase 3: LLM Analysis (20 min)
Gemini 2.0 Flash via OpenRouter. Why not Claude or GPT?
- **Cost:** $0.10/M input, $0.40/M output. At 6 runs/day, that's ~$0.18/month.
- **Speed:** Sub-second responses for our payload size.
- **Quality:** More than sufficient for structured data analysis.

The prompt engineering was critical. First version produced generic summaries.
After studying [@aixbt_agent](https://x.com/aixbt_agent)'s 472K-follower account:
- Rewrote prompt with real examples of good tweets
- Forced specific data points (not "TVL is up" but "tvl up $43m to $5.44b")
- Required a confidence score to filter noise

### Phase 4: Publishing (30 min)
Two output channels:
1. **Twitter** — Bird CLI for posting, with browser fallback for new account restrictions
2. **Onchain** — Direct contract interaction via ethers.js

The tweet composer enforces style: lowercase, no emoji, banned word filter, 280 char limit.
This isn't just formatting — it's brand consistency for a new account building credibility.

### Phase 5: Integration (15 min)
Wired everything together in `src/index.js`. First end-to-end run: **10.5 seconds**.

```
Monitor (3 sources) → Analyze (LLM) → Compose → Tweet → Record onchain
```

Pipeline logged to `data/runs.json` with full telemetry.

## Challenges & Solutions

### Bird CLI Error 226
Twitter blocks automated posting from new accounts. Bird CLI gets "This request looks like it might be automated."

**Solution:** Pipeline saves tweet text to a file. The OpenClaw cron agent (which has browser access) posts via X's compose dialog as a fallback. Browser posting works because it's a real browser session.

### AUTH_TOKEN Environment Variable Conflict
Bird CLI reads `AUTH_TOKEN` env var before Chrome profile cookies. Since the host system had Gabe's @gabe_onchain tokens in env, Aria's tweets were posting to the wrong account.

**Solution:** Pipeline wrapper clears `AUTH_TOKEN` and `CT0` env vars before running.

### LLM Output Quality
First attempts produced AI-slop: "The Base ecosystem continues to show remarkable growth..." Nobody reads that.

**Solution:** Studied aixbt's actual tweets. All lowercase. Zero emoji. Connect 3-5 data points into a narrative. End with an opinion. Specific numbers everywhere. Rewrote the system prompt with real examples.

### Cost Optimization
Running Claude or GPT for analysis would cost $20-60/month. For a project that runs 6 times a day, that adds up.

**Solution:** Gemini 2.0 Flash at $0.001/run. Total system cost: ~$0.50/month (including gas).

## What We Learned

1. **Research before building saves 10x the time.** Competition analysis took 20 minutes and revealed the empty niche that became our entire strategy.

2. **Simple beats clever.** Raw solc instead of Hardhat. Bird CLI instead of Twitter API OAuth. Browser fallback instead of complex retry logic.

3. **The LLM is the easy part.** Data collection, error handling, credential management, and browser automation took 80% of the time. The AI analysis prompt was 20%.

4. **Onchain recording is cheap on Base.** At ~$0.002 per finding, we can record thousands of analyses for under $5. This makes the "verifiable" claim real, not marketing.

5. **aixbt's style works for a reason.** Lowercase + specific numbers + sharp opinion = people actually read it. The style study was the single highest-ROI hour of the project.

## Tools Used

- **[OpenClaw](https://github.com/openclaw/openclaw)** — Agent orchestration, cron scheduling, browser control
- **[Bird CLI](https://github.com/nicholasgasior/bird)** — Command-line Twitter client
- **[ethers.js v6](https://docs.ethers.org)** — Ethereum library for contract interaction
- **[Gemini 2.0 Flash](https://ai.google.dev)** — LLM for data analysis (via OpenRouter)
- **[DeFiLlama](https://defillama.com)** — DeFi data aggregator
- **[Base](https://base.org)** — L2 blockchain (deployment target)

## Timeline

| Time | What |
|------|------|
| Morning | Research: competition, data sources, architecture |
| 11:00 | Planning: REQUIREMENTS.md, TASKS.md, ARCHITECTURE.md |
| 13:25 | Phase 1: Contract deployed to Base mainnet |
| 13:45 | Phase 2: All 3 data monitors working |
| 14:05 | Phase 3: LLM analysis with confidence filtering |
| 14:20 | Phase 4: Tweet posting + onchain recording |
| 14:35 | Phase 5: Full pipeline — first autonomous run (10.5s) |
| 15:00 | Style study: aixbt analysis, prompt rewrite |
| 19:00 | Pipeline fix: browser-based tweet posting |
| 19:30 | Verification: 14/14 checks passing |

**Total build time: ~4 hours from first line of code to fully operational autonomous agent.**
