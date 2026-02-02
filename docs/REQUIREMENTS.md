# Requirements — Aria Onchain Analyst

## R1: Smart Contract (AnalyticsRegistry)
**Description:** Deploy a Solidity contract on Base that stores analysis findings permanently onchain.
**Acceptance Criteria:**
- [ ] Contract compiles with solc 0.8.19 without errors
- [ ] Contract deploys to Base mainnet successfully
- [ ] `recordFinding(category, summary, contentHash, tweetUrl)` stores data and emits event
- [ ] `totalFindings()` returns correct count
- [ ] `getLatestFindings(n)` returns last n findings
- [ ] Only the deployer wallet can call recordFinding (onlyAnalyst modifier)
- [ ] Contract address is verified on Basescan

## R2: Data Monitoring Module
**Description:** Fetch current Base ecosystem data from free APIs.
**Acceptance Criteria:**
- [ ] Fetches Base TVL and top 10 protocols from DeFiLlama (GET /protocols, filter Base)
- [ ] Fetches Base chain stats (block number, gas price, tx count) from RPC
- [ ] Fetches Base stablecoin supply from DeFiLlama stablecoins endpoint
- [ ] Returns a structured JSON snapshot of all data
- [ ] Handles API errors gracefully (retry once, then skip with warning)
- [ ] Completes all fetches in under 10 seconds
- [ ] Caches previous snapshot for comparison (saves to data/last-snapshot.json)

## R3: Analysis Engine
**Description:** Use LLM to analyze ecosystem data and generate insights.
**Acceptance Criteria:**
- [ ] Receives current snapshot + previous snapshot as input
- [ ] Calls Gemini Flash via OpenRouter API with structured prompt
- [ ] Returns: category, summary, fullAnalysis, tweetDraft, confidence (1-10)
- [ ] Only proceeds to publish if confidence >= 7
- [ ] Handles LLM API errors gracefully (log and skip)
- [ ] Response is parsed and validated (all required fields present)

## R4: Tweet Publishing
**Description:** Post analysis tweets via Bird CLI autonomously.
**Acceptance Criteria:**
- [ ] Composes tweet from LLM output (< 280 chars)
- [ ] Posts via Bird CLI using --auth-token and --ct0 flags
- [ ] Returns tweet URL on success
- [ ] Handles Bird CLI errors (expired cookies, rate limits)
- [ ] Logs every tweet attempt (success or failure) to data/tweet-log.json
- [ ] No AI slop patterns in output (validated against banned words list)

## R5: Onchain Recording
**Description:** Record each published finding to the AnalyticsRegistry contract.
**Acceptance Criteria:**
- [ ] Calls recordFinding() with category, summary, keccak256(fullAnalysis), tweetUrl
- [ ] Transaction succeeds on Base (tx hash returned)
- [ ] Gas usage is reasonable (< 200k gas per recording)
- [ ] Handles tx failures gracefully (insufficient gas, nonce issues)
- [ ] Logs tx hash to data/findings.json

## R6: Autonomous Loop
**Description:** Wire all modules into a single autonomous execution cycle.
**Acceptance Criteria:**
- [ ] Runs: monitor → analyze → tweet → record as a single pipeline
- [ ] Exits cleanly if any step fails (with appropriate logging)
- [ ] Can be triggered via: `node src/index.js` (single run)
- [ ] Saves run metadata to data/runs.json (timestamp, status, finding id)
- [ ] Total execution time < 30 seconds per cycle

## R7: OpenClaw Cron Integration
**Description:** Schedule autonomous loop as an OpenClaw cron job.
**Acceptance Criteria:**
- [ ] Cron job runs every 4 hours (6 runs/day)
- [ ] Uses Gemini Flash model for cost efficiency
- [ ] Results delivered to Telegram
- [ ] First 24 hours of operation produce at least 4 findings
- [ ] No human intervention needed after setup

## R8: Documentation
**Description:** Comprehensive documentation for BBQ judging.
**Acceptance Criteria:**
- [ ] README.md with project overview, architecture diagram, setup instructions
- [ ] ARCHITECTURE.md with detailed system design
- [ ] BUILDING.md with build process narrative
- [ ] All docs are clear enough for a judge to understand in 2 minutes

## R9: Video Documentation (Remotion + HeyGen)
**Description:** Programmatic video explaining the build.
**Acceptance Criteria:**
- [ ] Aria avatar speaks (HeyGen Avatar IV from our image)
- [ ] Architecture diagram animated (Remotion)
- [ ] Shows real data flowing through pipeline
- [ ] 60-90 seconds total length
- [ ] Professional quality (judges can tell this is polished)

## R10: X Presence (@AriaLinkwell)
**Description:** Active social presence demonstrating autonomous operation.
**Acceptance Criteria:**
- [ ] Profile set up (bio, avatar, banner)
- [ ] At least 10 autonomous tweets posted before submission
- [ ] Tweets contain real Base data insights (not generic)
- [ ] Build thread documenting the process
- [ ] Visible transaction history on Basescan linked from tweets

## Priority Order
1. R1 (Contract) — Foundation, everything depends on this
2. R2 (Monitoring) — Data is the core value
3. R3 (Analysis) — Makes data useful
4. R4 (Tweeting) — Makes it visible
5. R5 (Onchain Recording) — Makes it verifiable
6. R6 (Autonomous Loop) — Ties it together
7. R10 (X Presence) — Judging requirement
8. R7 (Cron) — Hands-off operation
9. R8 (Docs) — Judging criteria
10. R9 (Video) — Polish/bonus points
