/**
 * T15: Bird CLI Poster — posts tweets via Bird CLI as @AriaLinkwell
 *
 * Uses Bird CLI with chrome-profile-dir for @AriaLinkwell's cookies.
 * Note: OpenClaw browser must NOT be running (cookie DB locked).
 * The pipeline caller should stop/start the browser around this call.
 * Clears AUTH_TOKEN/CT0 env to prevent posting as @gabe_onchain.
 */
import { execSync } from 'child_process';

const CHROME_PROFILE = 'C:\\Users\\gavaf\\.openclaw\\browser\\openclaw\\user-data\\Default';

export function postTweet(text) {
  console.log(`🐦 Posting tweet (${text.length} chars)...`);

  try {
    const escaped = text.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const cmd = `bird tweet "${escaped}" --chrome-profile-dir "${CHROME_PROFILE}"`;

    const output = execSync(cmd, {
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, AUTH_TOKEN: '', CT0: '' },
    });

    // Try to extract tweet URL from output
    const urlMatch = output.match(/https:\/\/x\.com\/\S+/);
    const tweetUrl = urlMatch ? urlMatch[0] : '';

    console.log(`✅ Tweet posted${tweetUrl ? ': ' + tweetUrl : ''}`);

    return {
      success: true,
      tweetUrl,
      output: output.trim(),
    };
  } catch (err) {
    console.error(`❌ Tweet failed: ${err.message}`);
    return {
      success: false,
      tweetUrl: '',
      error: err.message,
    };
  }
}
