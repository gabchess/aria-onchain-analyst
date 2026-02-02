/**
 * T15: Bird CLI Poster — posts tweets via Bird CLI as @AriaLinkwell
 *
 * Uses Bird CLI with chrome-profile-dir for @AriaLinkwell's cookies.
 * Note: OpenClaw browser must NOT be running (cookie DB locked).
 * The pipeline caller should stop/start the browser around this call.
 * Clears AUTH_TOKEN/CT0 env to prevent posting as @gabe_onchain.
 *
 * UPDATE 2026-02-02: Added 15s timeout + graceful failure.
 * Twitter blocks new accounts with error 226 ("looks automated").
 * Pipeline continues even if tweet fails — onchain recording still works.
 * The tweet text is saved in run data for manual/browser posting.
 */
import { execSync } from 'child_process';

const CHROME_PROFILE = 'C:\\Users\\gavaf\\.openclaw\\browser\\openclaw\\user-data\\Default';
const BIRD_CONFIG = 'C:\\Users\\gavaf\\.openclaw\\agents\\main\\secrets\\aria-bird-config.json5';

export function postTweet(text) {
  console.log(`🐦 Posting tweet (${text.length} chars)...`);

  // Try config-based approach first (doesn't need browser stopped)
  const methods = [
    { name: 'config', cmd: `bird tweet "${esc(text)}" --config "${BIRD_CONFIG}"` },
    { name: 'chrome-profile', cmd: `bird tweet "${esc(text)}" --chrome-profile-dir "${CHROME_PROFILE}"` },
  ];

  for (const method of methods) {
    try {
      console.log(`   Trying ${method.name}...`);
      const output = execSync(method.cmd, {
        encoding: 'utf8',
        timeout: 15000, // 15s hard timeout — fail fast
        env: { ...process.env, AUTH_TOKEN: '', CT0: '' },
      });

      const urlMatch = output.match(/https:\/\/x\.com\/\S+/);
      const tweetUrl = urlMatch ? urlMatch[0] : '';
      console.log(`✅ Tweet posted via ${method.name}${tweetUrl ? ': ' + tweetUrl : ''}`);

      return { success: true, tweetUrl, method: method.name, output: output.trim() };
    } catch (err) {
      const msg = err.message || '';
      // Check for known blockers
      if (msg.includes('226') || msg.includes('automated')) {
        console.log(`   ⚠️ ${method.name}: Twitter anti-automation block (226)`);
      } else if (msg.includes('TIMEDOUT') || msg.killed) {
        console.log(`   ⚠️ ${method.name}: Timed out`);
      } else {
        console.log(`   ⚠️ ${method.name}: ${msg.slice(0, 100)}`);
      }
    }
  }

  // All methods failed
  console.log(`❌ Tweet failed — all methods blocked. Tweet text saved for manual posting.`);
  console.log(`   📝 Tweet: "${text}"`);

  return {
    success: false,
    tweetUrl: '',
    error: 'All posting methods blocked (likely error 226 — new account anti-automation)',
    savedText: text,
  };
}

function esc(text) {
  return text.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}
