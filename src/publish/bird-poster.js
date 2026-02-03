/**
 * T15: Tweet Poster — saves tweet for browser posting by cron agent
 *
 * Bird CLI is blocked (error 226 — new account anti-automation).
 * This module saves the tweet to a pending file that the cron agent
 * reads and posts via OpenClaw browser tool (already logged into X).
 *
 * Flow: Pipeline saves tweet → outputs PENDING_TWEET marker → cron agent posts via browser
 */
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

const PENDING_TWEET_PATH = new URL('../../data/pending-tweet.txt', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const CHROME_PROFILE = 'C:\\Users\\gavaf\\.openclaw\\browser\\openclaw\\user-data\\Default';

export function postTweet(text, mediaPath = null) {
  console.log(`🐦 Posting tweet (${text.length} chars)${mediaPath ? ' + chart image' : ''}...`);

  // Build media flag
  const mediaFlag = mediaPath ? ` --media "${mediaPath}"` : '';

  // Try Bird CLI first (may work once error 226 cooldown expires)
  try {
    const output = execSync(`bird tweet "${esc(text)}"${mediaFlag} --chrome-profile-dir "${CHROME_PROFILE}"`, {
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, AUTH_TOKEN: '', CT0: '' },
    });

    const urlMatch = output.match(/https:\/\/x\.com\/\S+/);
    const tweetUrl = urlMatch ? urlMatch[0] : '';
    console.log(`✅ Tweet posted via Bird CLI${tweetUrl ? ': ' + tweetUrl : ''}`);

    // Clean up pending file since we succeeded
    try { writeFileSync(PENDING_TWEET_PATH, ''); } catch {}

    return { success: true, tweetUrl, method: 'bird-cli', output: output.trim() };
  } catch (err) {
    console.log(`   ⚠️ Bird CLI failed: ${(err.message || '').slice(0, 80)}`);
  }

  // Bird CLI failed — save for browser posting by cron agent
  writeFileSync(PENDING_TWEET_PATH, text, 'utf8');
  console.log(`📝 Tweet saved to: ${PENDING_TWEET_PATH}`);
  console.log(`PENDING_TWEET:${text}`);

  return {
    success: false,
    tweetUrl: '',
    method: 'pending-browser',
    error: 'Bird CLI blocked — tweet saved for browser posting',
    savedText: text,
    pendingPath: PENDING_TWEET_PATH,
  };
}

function esc(text) {
  return text.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}
