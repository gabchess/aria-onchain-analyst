/**
 * Post the V2 Build Thread for @AriaLinkwell
 * Documents the full autonomous onchain analyst pipeline
 */
import { postTweet } from '../src/publish/twitter-api-poster.js';

const tweets = [
  // Tweet 1 — Hook
  `built an autonomous onchain data analyst for @base in 5 days.

she monitors 3 data sources, writes analysis, generates charts, posts tweets, and mints her best work as tradeable @zora content coins.

no human in the loop. here's how it works 🧵`,

  // Tweet 2 — Data Pipeline
  `every 2 hours, the pipeline runs:

1. pulls real-time data from DeFiLlama, Base RPC, and Basescan API
2. feeds it to an LLM for pattern detection
3. composes a tweet in aria's voice (lowercase, data-forward, opinionated)
4. generates a chart (Chart.js, dark theme)
5. posts via X API v2`,

  // Tweet 3 — Creator Coin
  `the twist: every analysis lives onchain.

deployed $ARIA creator coin on @zora (Base mainnet):
https://zora.co/coin/base:0x194beb817B22839857653c5aF870883a67f36f5C

once a day, the best analysis gets minted as a content coin. tradeable. quality-gated.

vitalik literally posted about this model 2 days ago.`,

  // Tweet 4 — First Content Coin
  `first content coin is live. a base gas anomaly analysis:

https://zora.co/coin/base:0xc5c5cb2e85aBf3bCB2aDBe50558cd7A58DCBb702

9/10 confidence score. minted automatically by the daily curation cron. if it's not good enough, it doesn't get minted. quality > quantity.`,

  // Tweet 5 — Stack
  `stack:
- Node.js + ethers.js v6
- Zora Coins SDK (content coins)
- Chart.js + chartjs-node-canvas
- X API v2 (OAuth 1.0a)
- Gemini Flash (analysis LLM)
- OpenClaw (orchestration)

all on Base mainnet. $0.01 per tweet. pennies per content coin.`,

  // Tweet 6 — Philosophy + CTA
  `most ai agents post noise. aria posts data.

most agents spam. aria curates.

most agents record hashes onchain. aria mints tradeable content coins.

built for @base builder quest by @gabe_onchain

repo: github.com/gabchess/aria-onchain-analyst`,
];

async function postThread() {
  console.log(`📝 Posting V2 thread (${tweets.length} tweets)...\n`);

  let lastId = null;

  for (let i = 0; i < tweets.length; i++) {
    console.log(`\n--- Tweet ${i + 1}/${tweets.length} ---`);
    console.log(tweets[i].substring(0, 80) + '...');

    const result = await postTweet(tweets[i], null, lastId);

    if (!result.success) {
      console.error(`❌ Tweet ${i + 1} failed:`, result.error);
      console.log('Stopping thread here.');
      break;
    }

    console.log(`✅ Posted: ${result.tweetUrl}`);
    lastId = result.tweetId;

    if (i === 0) {
      console.log(`\n🎯 THREAD ROOT ID: ${lastId}`);
      console.log(`   PIN THIS: https://x.com/AriaLinkwell/status/${lastId}`);
    }

    // Small delay between tweets to be nice to the API
    if (i < tweets.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n✅ Thread posted!');
  console.log(`First tweet: https://x.com/AriaLinkwell/status/${lastId ? tweets[0] : 'FAILED'}`);
}

postThread().catch(console.error);
