/**
 * T14: Tweet Composer — validates and cleans tweet text
 */

const BANNED_WORDS = [
  'game changer', 'landscape', 'delve', 'revolutionize', 'meticulous',
  'game-changer', 'groundbreaking', 'unprecedented', 'paradigm',
  'synergy', 'leverage', 'holistic', 'robust', 'seamless',
  'cutting-edge', 'innovative', 'transformative', 'disruptive',
];

// aixbt style: NO emoji at all
const BANNED_EMOJI = ['🚀', '💎', '🌙', '📈', '🔥', '👀', '👁️', '🕵️', '😅', '🤯', '💝', '🧩', '♟️'];

const MAX_LENGTH = 280;

export function composeTweet(insight) {
  let text = insight.tweetDraft;

  // Check banned words
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      console.warn(`⚠️  Banned word found: "${word}" — removing`);
      text = text.replace(new RegExp(word, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
    }
  }

  // Check banned emoji
  for (const emoji of BANNED_EMOJI) {
    if (text.includes(emoji)) {
      text = text.replaceAll(emoji, '').trim();
    }
  }

  // Force lowercase (aixbt style)
  text = text.toLowerCase();

  // Truncate if too long
  if (text.length > MAX_LENGTH) {
    text = text.slice(0, MAX_LENGTH - 3).replace(/\s+\S*$/, '') + '...';
  }

  return text;
}
