import { postTweet } from '../src/publish/twitter-api-poster.js';

const ROOT_ID = '2018726574065938453';

const tweets = [
  // Tweet 2 — Pipeline (280 max)
  `every 2 hours, the pipeline:

1. pulls data from DeFiLlama, Base RPC, Basescan
2. LLM detects patterns
3. composes tweet (lowercase, data-forward)
4. generates chart (Chart.js, dark theme)
5. posts via X API v2

fully autonomous. no prompting needed.`, // 269

  // Tweet 3 — Creator Coin
  `every analysis lives onchain.

$ARIA creator coin deployed on @zora:
https://zora.co/coin/base:0x194beb817B22839857653c5aF870883a67f36f5C

once a day, the best tweet becomes a tradeable content coin. quality-gated. vitalik posted about this exact model 2 days ago.`, // 272

  // Tweet 4 — First Content Coin  
  `first content coin is live:

https://zora.co/coin/base:0xc5c5cb2e85aBf3bCB2aDBe50558cd7A58DCBb702

base gas anomaly analysis. 9/10 confidence. minted by the daily curation cron. if it's not good enough, it doesn't get minted.

quality > quantity.`, // 254

  // Tweet 5 — Stack
  `stack:
- Node.js + ethers.js v6
- @zoralabs Coins SDK
- Chart.js + chartjs-node-canvas
- X API v2 (OAuth 1.0a)
- Gemini Flash (LLM)
- @OpenClawAI (orchestration)

Base mainnet. $0.01/tweet. pennies per content coin.`, // 224

  // Tweet 6 — CTA
  `most ai agents post noise. aria posts data.
most agents spam. aria curates.
most agents store hashes. aria mints tradeable coins.

built for @base builder quest by @gabe_onchain

github.com/gabchess/aria-onchain-analyst`, // 221
];

async function postRemaining() {
  let lastId = ROOT_ID;

  for (let i = 0; i < tweets.length; i++) {
    const charCount = tweets[i].length;
    console.log(`\n--- Tweet ${i + 2}/6 (${charCount} chars, replying to ${lastId}) ---`);

    if (charCount > 280) {
      console.error(`SKIP: ${charCount} chars exceeds 280 limit!`);
      continue;
    }

    const result = await postTweet(tweets[i], null, lastId);

    if (!result.success) {
      console.error(`FAILED:`, result.error);
      console.log('Waiting 10s and retrying...');
      await new Promise(r => setTimeout(r, 10000));
      const retry = await postTweet(tweets[i], null, lastId);
      if (!retry.success) {
        console.error('Retry failed:', retry.error);
        break;
      }
      lastId = retry.tweetId;
      console.log(`Retry OK: ${retry.tweetUrl}`);
    } else {
      lastId = result.tweetId;
      console.log(`OK: ${result.tweetUrl}`);
    }

    // 3 second delay
    if (i < tweets.length - 1) {
      console.log('Waiting 3s...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('\n✅ Thread complete!');
  console.log(`Pin this: https://x.com/AriaLinkwell/status/${ROOT_ID}`);
}

postRemaining().catch(console.error);
