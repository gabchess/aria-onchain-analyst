/**
 * X Ecosystem Monitor — reads pre-fetched tweets from Based Intelligence list
 *
 * Adds qualitative context to the pipeline: what are Base builders/analysts
 * actually talking about? This prevents the LLM from only seeing numbers
 * and always defaulting to stablecoin commentary.
 *
 * The cron agent pre-fetches the X list via browser snapshot and saves
 * to data/x-ecosystem-feed.json BEFORE running the pipeline.
 * This module just reads that file.
 *
 * If the file is missing or stale (>5h), the pipeline continues without it.
 */
import { readFileSync, existsSync } from 'fs';

const FEED_PATH = new URL('../../data/x-ecosystem-feed.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const MAX_AGE_MS = 5 * 60 * 60 * 1000; // 5 hours — slightly more than cron interval

export async function fetchEcosystemBuzz() {
  console.log('   🐦 Loading Base ecosystem buzz from pre-fetched feed...');

  try {
    if (!existsSync(FEED_PATH)) {
      console.log('   ⚠️ No pre-fetched X feed found (data/x-ecosystem-feed.json)');
      return { source: 'x-list', tweets: [], error: 'No feed file' };
    }

    const feed = JSON.parse(readFileSync(FEED_PATH, 'utf8'));

    // Check freshness
    if (feed.fetchedAt) {
      const ageMs = Date.now() - new Date(feed.fetchedAt).getTime();
      if (ageMs > MAX_AGE_MS) {
        console.log(`   ⚠️ X feed is stale (${(ageMs / 3600000).toFixed(1)}h old)`);
        return { source: 'x-list', tweets: [], error: 'Feed too old' };
      }
    }

    const count = feed.tweets?.length || 0;
    if (count === 0) {
      console.log('   ⚠️ X feed is empty');
      return { source: 'x-list', tweets: [], error: 'Empty feed' };
    }

    console.log(`   ✅ Got ${count} recent tweets from Based Intelligence list`);
    return feed;
  } catch (err) {
    console.log(`   ⚠️ X feed read failed (non-fatal): ${(err.message || '').slice(0, 60)}`);
    return { source: 'x-list', tweets: [], error: err.message };
  }
}
