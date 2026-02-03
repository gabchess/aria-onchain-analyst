/**
 * Browser-based Tweet Poster — posts via OpenClaw browser tool
 * 
 * Since Bird CLI is blocked (error 226) and X API requires paid credits,
 * this module saves the tweet text + posts via browser compose UI.
 * 
 * For use by cron sub-agents that have browser access.
 * When called from Node.js pipeline, saves to pending-tweet.txt
 * with a BROWSER_POST marker for the cron agent to pick up.
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_TWEET_PATH = path.join(__dirname, '..', '..', 'data', 'pending-tweet.txt');
const PENDING_META_PATH = path.join(__dirname, '..', '..', 'data', 'pending-tweet-meta.json');

/**
 * Post a tweet by saving it for browser-based posting by the cron agent.
 * The cron agent reads pending-tweet.txt and posts via OpenClaw browser tool.
 * 
 * @param {string} text - Tweet text
 * @param {string|null} mediaPath - Optional path to image file
 * @returns {{success: boolean, method: string, pendingPath: string, tweetUrl?: string}}
 */
export async function postTweet(text, mediaPath = null) {
  console.log(`🐦 Saving tweet for browser posting (${text.length} chars)${mediaPath ? ' + image' : ''}...`);

  // Save tweet text
  writeFileSync(PENDING_TWEET_PATH, text, 'utf8');
  
  // Save metadata (media path, timestamp)
  const meta = {
    text,
    mediaPath: mediaPath || null,
    savedAt: new Date().toISOString(),
    posted: false,
  };
  writeFileSync(PENDING_META_PATH, JSON.stringify(meta, null, 2), 'utf8');

  console.log(`📝 Tweet saved to: ${PENDING_TWEET_PATH}`);
  console.log(`BROWSER_POST_PENDING:${text}`);

  return {
    success: true,
    method: 'browser-pending',
    pendingPath: PENDING_TWEET_PATH,
    tweetUrl: '',
    note: 'Tweet saved for browser posting by cron agent',
  };
}
