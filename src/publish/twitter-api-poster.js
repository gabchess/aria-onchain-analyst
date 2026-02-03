/**
 * Twitter API v2 Poster — replaces Bird CLI
 * Uses OAuth 1.0a + X API v2 endpoint for posting tweets
 * Supports text tweets and media (image) uploads
 * 
 * Free tier: 500 posts/month, media upload supported
 */
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load API keys from secrets
const SECRETS_PATH = path.join(__dirname, '..', '..', '..', '..', '.openclaw', 'agents', 'main', 'secrets', 'aria-twitter-api-keys.json');

let keys;
try {
  keys = JSON.parse(readFileSync(SECRETS_PATH, 'utf8')).oauth1;
} catch (e) {
  // Fallback: try absolute path
  try {
    keys = JSON.parse(readFileSync('C:\\Users\\gavaf\\.openclaw\\agents\\main\\secrets\\aria-twitter-api-keys.json', 'utf8')).oauth1;
  } catch (e2) {
    console.error('❌ Failed to load Twitter API keys:', e2.message);
    keys = { apiKey: '', apiKeySecret: '', accessToken: '', accessTokenSecret: '' };
  }
}

const oauth = OAuth({
  consumer: { key: keys.apiKey, secret: keys.apiKeySecret },
  signature_method: 'HMAC-SHA1',
  hash_function(baseString, key) {
    return crypto.createHmac('sha1', key).update(baseString).digest('base64');
  },
});

const token = { key: keys.accessToken, secret: keys.accessTokenSecret };

/**
 * Upload media (image) to Twitter
 * Uses v1.1 media upload endpoint (still required for v2 tweets with media)
 * @param {string} filePath - Path to image file
 * @returns {Promise<string>} media_id string
 */
async function uploadMedia(filePath) {
  const imageData = readFileSync(filePath);
  const base64Data = imageData.toString('base64');
  
  // Determine media type
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
  const mediaType = mimeTypes[ext] || 'image/png';

  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
  
  // Build form data manually
  const boundary = '----FormBoundary' + crypto.randomBytes(16).toString('hex');
  const formParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="media_data"\r\n\r\n${base64Data}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="media_category"\r\n\r\ntweet_image\r\n`,
    `--${boundary}--\r\n`
  ];
  const body = formParts.join('');

  const requestData = { url: uploadUrl, method: 'POST' };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...authHeader,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Media upload failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  console.log(`📸 Media uploaded: ${data.media_id_string} (${(imageData.length / 1024).toFixed(1)}KB)`);
  return data.media_id_string;
}

/**
 * Post a tweet via X API v2
 * @param {string} text - Tweet text (max 280 chars)
 * @param {string|null} mediaPath - Optional path to image file
 * @param {string|null} replyToId - Optional tweet ID to reply to (for threads)
 * @returns {Promise<{success: boolean, tweetId?: string, tweetUrl?: string, method: string, error?: string}>}
 */
export async function postTweet(text, mediaPath = null, replyToId = null) {
  console.log(`🐦 Posting tweet via X API v2 (${text.length} chars)${mediaPath ? ' + image' : ''}...`);

  if (!keys.apiKey || !keys.accessToken) {
    console.error('❌ Twitter API keys not configured');
    return { success: false, method: 'api-v2', error: 'API keys not configured' };
  }

  try {
    // Upload media if provided
    let mediaId = null;
    if (mediaPath) {
      try {
        mediaId = await uploadMedia(mediaPath);
      } catch (mediaErr) {
        console.log(`   ⚠️ Media upload failed: ${mediaErr.message.slice(0, 100)}`);
        console.log('   Posting without image...');
      }
    }

    // Build tweet payload
    const tweetUrl = 'https://api.twitter.com/2/tweets';
    const payload = { text };
    if (mediaId) {
      payload.media = { media_ids: [mediaId] };
    }
    if (replyToId) {
      payload.reply = { in_reply_to_tweet_id: replyToId };
    }

    const requestData = { url: tweetUrl, method: 'POST' };
    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

    const response = await fetch(tweetUrl, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`API error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    const tweetId = data.data?.id;
    const url = tweetId ? `https://x.com/AriaLinkwell/status/${tweetId}` : '';

    console.log(`✅ Tweet posted via API v2: ${url}`);
    return { success: true, tweetId, tweetUrl: url, method: 'api-v2' };

  } catch (err) {
    console.error(`❌ Tweet failed: ${err.message}`);
    return { success: false, method: 'api-v2', error: err.message };
  }
}
