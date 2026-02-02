# Atomic Task Breakdown — Vibecoding Queue

Each task is small, well-defined, with binary pass/fail criteria.
Tasks are ordered by dependency. Complete them in sequence.

---

## Phase 1: Project Setup + Contract (R1)

### T1: Initialize project
- Create package.json with name "aria-onchain-analyst", type "module"
- Install dependencies: ethers, solc, dotenv
- Create .env.example with: PRIVATE_KEY, BASE_RPC_URL, OPENROUTER_API_KEY, BASESCAN_API_KEY, BIRD_AUTH_TOKEN, BIRD_CT0
- Create .gitignore (node_modules, .env, data/*.json)
- **Pass:** `npm install` succeeds, .env.example has all vars listed

### T2: Write AnalyticsRegistry contract
- Create contracts/AnalyticsRegistry.sol (Solidity 0.8.19)
- Struct Finding: timestamp, category, summary, contentHash, tweetUrl
- Functions: recordFinding, totalFindings, getLatestFindings, getFindingsByCategory
- Event: NewFinding(id, category, summary, contentHash)
- Modifier: onlyAnalyst (only deployer can record)
- immutable analyst address set in constructor
- **Pass:** File exists, valid Solidity syntax

### T3: Write compile + deploy script
- Create scripts/deploy.js
- Reads .env for PRIVATE_KEY and BASE_RPC_URL
- Compiles AnalyticsRegistry.sol using solc
- Deploys to Base via ethers.js ContractFactory
- Saves { address, txHash, deployer, timestamp } to deployed.json
- Prints contract address on success
- **Pass:** Running `node scripts/deploy.js` on Base testnet deploys successfully (or mainnet with real ETH)

### T4: Write test-record script
- Create scripts/test-record.js
- Reads deployed.json for contract address
- Calls recordFinding("test", "Test finding from deploy script", keccak256("test"), "https://x.com/test")
- Reads back totalFindings() and prints it
- **Pass:** totalFindings() returns 1 after running

### T5: Deploy to Base mainnet
- Run deploy.js with real wallet on Base mainnet
- Save contract address to deployed.json
- Run test-record.js to verify
- **Pass:** Contract visible on basescan.org, test finding recorded

---

## Phase 2: Data Monitoring (R2)

### T6: Create config module
- Create src/config.js
- Loads .env via dotenv
- Exports: BASE_RPC_URL, PRIVATE_KEY, OPENROUTER_API_KEY, BIRD_AUTH_TOKEN, BIRD_CT0, CONTRACT_ADDRESS
- Validates all required vars are present (throws if missing)
- **Pass:** `node -e "import './src/config.js'"` runs without error when .env is set

### T7: Create Base provider utility
- Create src/utils/provider.js
- Exports getProvider() returning ethers.JsonRpcProvider for Base
- Exports getWallet() returning ethers.Wallet connected to provider
- **Pass:** `getProvider().getBlockNumber()` returns a number > 40000000

### T8: Build DeFi TVL monitor
- Create src/monitor/defi-tvl.js
- Exports fetchBaseTVL() that calls DeFiLlama /protocols
- Filters to Base chain, returns top 10 by TVL
- Returns { totalTvl, protocols: [{ name, tvl, category, change_1d }] }
- **Pass:** Returns totalTvl > 3000000000 (Base has $4B+)

### T9: Build chain stats monitor
- Create src/monitor/chain-stats.js
- Exports fetchChainStats() using ethers.js provider
- Returns { blockNumber, gasPrice (gwei), txCount (from latest block), timestamp }
- **Pass:** Returns blockNumber > 40000000, gasPrice > 0

### T10: Build stablecoin monitor
- Create src/monitor/stablecoin-flows.js
- Exports fetchStablecoins() from DeFiLlama stablecoins endpoint
- Filters to Base, returns { totalUSD, breakdown: { USDC, USDT, DAI, ... } }
- **Pass:** Returns totalUSD > 4000000000

### T11: Build monitor orchestrator
- Create src/monitor/index.js
- Exports collectSnapshot() that runs T8 + T9 + T10 in parallel
- Returns combined snapshot object with all data + timestamp
- Saves snapshot to data/last-snapshot.json
- Loads previous snapshot from data/last-snapshot.json for comparison
- **Pass:** Returns a complete snapshot with all three data sources

---

## Phase 3: Analysis Engine (R3)

### T12: Build insight generator
- Create src/analyze/insight-generator.js
- Exports generateInsight(currentSnapshot, previousSnapshot)
- Calls OpenRouter API (Gemini Flash) with structured prompt
- Prompt includes: current data, previous data, instruction to find most interesting insight
- Parses response into { category, summary, fullAnalysis, tweetDraft, confidence }
- **Pass:** Returns valid insight object with all fields, confidence is 1-10

### T13: Build analysis orchestrator
- Create src/analyze/index.js
- Exports analyzeSnapshot(current, previous)
- Calls insight-generator, validates output
- Returns null if confidence < 7
- **Pass:** Given sample data, returns insight or null

---

## Phase 4: Publishing (R4 + R5)

### T14: Build tweet composer
- Create src/publish/tweet-composer.js
- Exports composeTweet(insight)
- Takes insight.tweetDraft, validates length <= 280
- Checks against banned words list (from humanizer-reference.md)
- Truncates or adjusts if needed
- **Pass:** Output is <= 280 chars, contains no banned words

### T15: Build Bird CLI poster
- Create src/publish/bird-poster.js
- Exports postTweet(text)
- Runs Bird CLI via child_process: `bird tweet <text> --auth-token <token> --ct0 <ct0>`
- Parses output for tweet URL
- Returns { success, tweetUrl, error }
- **Pass:** Successfully posts a test tweet to @AriaLinkwell

### T16: Build onchain recorder
- Create src/publish/onchain-recorder.js
- Exports recordOnchain(finding)
- Loads contract from deployed.json, calls recordFinding()
- finding = { category, summary, fullAnalysis (hashed), tweetUrl }
- Returns { success, txHash, findingId }
- **Pass:** Transaction succeeds on Base, finding stored in contract

---

## Phase 5: Autonomous Loop (R6)

### T17: Build main loop
- Create src/index.js
- Pipeline: collectSnapshot → analyzeSnapshot → composeTweet → postTweet → recordOnchain
- Each step logged with timestamp
- If any step fails, logs error and exits cleanly
- Saves run result to data/runs.json
- **Pass:** `node src/index.js` runs full pipeline end-to-end successfully

### T18: Create verification script
- Create scripts/verify-loop.js
- Checks: contract has findings, @AriaLinkwell has tweets, runs.json has entries
- Prints pass/fail for each check
- **Pass:** All checks pass after one successful loop run

---

## Phase 6: Go Live (R7 + R10)

### T19: Set up Aria's X profile
- Bio, avatar image, banner
- Pin a tweet explaining what Aria does
- Follow relevant Base ecosystem accounts
- **Pass:** Profile looks professional, bio mentions "autonomous data analyst on Base"

### T20: Create OpenClaw cron job
- Schedule every 4 hours: exec `node src/index.js` from project directory
- Deliver results to Telegram
- **Pass:** Cron fires, runs loop, delivers finding to Gabe

### T21: Let agent run 24-48 hours
- Monitor for errors
- Fix any issues that arise
- Accumulate findings
- **Pass:** At least 4 findings recorded onchain, 4 tweets posted

---

## Phase 7: Documentation + Video (R8 + R9)

### T22: Write README.md
- Project overview, architecture diagram (ASCII), setup instructions
- Link to contract on Basescan
- Link to @AriaLinkwell
- **Pass:** A judge can understand what this is in 2 minutes of reading

### T23: Write ARCHITECTURE.md + BUILDING.md
- Detailed system design with data flow
- Build process narrative (decisions, trade-offs)
- **Pass:** Documents explain why we made each technical choice

### T24: Build thread on X
- @AriaLinkwell posts a thread documenting the build process
- Include screenshots, contract links, data examples
- **Pass:** Thread has 5+ tweets with real content

### T25: Create video (Remotion + HeyGen)
- HeyGen: Generate Aria avatar speaking segments
- Remotion: Animated architecture + data visualizations
- Composite into 60-90 second video
- **Pass:** Video plays, shows real data, avatar speaks clearly

### T26: Submit to BBQ
- Reply to @0xEricBrown's post with link to @AriaLinkwell
- Include links to GitHub, video, contract
- **Pass:** Submission visible in BBQ thread before Feb 8 11:59 PM EST
