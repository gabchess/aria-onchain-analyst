/**
 * Content Coin Minter — Mints a Zora content coin for top-quality analyses
 * 
 * Each content coin is an ERC-20 token on Base representing a single analysis.
 * Backed by ETH. People can trade it — good analyses gain value.
 * Creator (Aria) earns 50% of the 1% trading fee.
 * 
 * Called by the daily "best tweet" cron, not every pipeline run.
 */
import { createCoin, createCoinCall, CreateConstants } from '@zoralabs/coins-sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '..', '.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const CREATOR_COIN_ADDRESS = '0x194beb817B22839857653c5aF870883a67f36f5C';

// Log directory for minted coins
const COINS_LOG_DIR = resolve(__dirname, '..', '..', 'data', 'coins');

/**
 * Mint a content coin for a specific analysis/tweet.
 * 
 * @param {object} params
 * @param {string} params.tweetText - The tweet/analysis text
 * @param {string} params.tweetUrl - URL of the posted tweet  
 * @param {string} params.category - Analysis category (defi_tvl, gas_anomaly, etc.)
 * @param {number} params.confidence - Confidence score (1-10)
 * @param {string} [params.chartPath] - Optional path to chart image
 * @returns {object} {success, coinAddress, txHash, zoraUrl}
 */
export async function mintContentCoin({ tweetText, tweetUrl, category, confidence, chartPath }) {
  console.log(`\n🪙 Minting content coin for analysis (confidence: ${confidence}/10)...`);

  // Setup wallet
  const account = privateKeyToAccount(PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC),
  });

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC),
  });

  // Check ETH balance
  const balance = await publicClient.getBalance({ address: account.address });
  const ethBalance = Number(balance) / 1e18;
  console.log(`  ETH Balance: ${ethBalance.toFixed(6)} ETH`);

  if (ethBalance < 0.0005) {
    console.warn('⚠️ Low ETH balance — skipping content coin mint');
    return { success: false, reason: 'insufficient_eth', ethBalance };
  }

  // Create coin name from category + truncated text
  const shortText = tweetText.substring(0, 40).replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const coinName = `Aria: ${shortText}`;
  // Symbol: category abbreviation + timestamp
  const timestamp = Date.now().toString(36).toUpperCase();
  const symbolPrefix = category.substring(0, 4).toUpperCase();
  const coinSymbol = `A${symbolPrefix}${timestamp.slice(-4)}`;

  // Build metadata
  const metadata = {
    name: coinName,
    symbol: coinSymbol,
    description: `Onchain analysis by Aria Linkwell (@AriaLinkwell).\n\n${tweetText}\n\nCategory: ${category}\nConfidence: ${confidence}/10\nTweet: ${tweetUrl || 'N/A'}`,
    image: 'https://raw.githubusercontent.com/gabchess/aria-onchain-analyst/master/assets/aria-avatar.png',
    external_url: tweetUrl || 'https://x.com/AriaLinkwell',
    properties: {
      creator: 'Aria Linkwell',
      platform: 'Base',
      type: 'content_coin',
      category,
      confidence,
      tweet_url: tweetUrl || '',
      minted_at: new Date().toISOString(),
    },
  };

  // Host metadata on GitHub by saving to data/coins/ and using raw URL
  // For now, use a data URI approach via the Zora API
  const metadataJson = JSON.stringify(metadata);
  // Push to GitHub raw isn't instant, so use inline JSON hosted approach
  // The Zora API accepts https:// URIs — we'll save locally and reference via raw GitHub
  const metadataFileName = `coin-${Date.now()}.json`;
  const metadataFilePath = resolve(COINS_LOG_DIR, metadataFileName);

  // Ensure coins directory exists
  if (!existsSync(COINS_LOG_DIR)) {
    mkdirSync(COINS_LOG_DIR, { recursive: true });
  }
  writeFileSync(metadataFilePath, metadataJson);

  // Use GitHub raw URL for metadata
  const metadataUri = `https://raw.githubusercontent.com/gabchess/aria-onchain-analyst/master/data/coins/${metadataFileName}`;

  console.log(`  Coin Name: ${coinName}`);
  console.log(`  Symbol: ${coinSymbol}`);
  console.log(`  Metadata: ${metadataUri}`);

  try {
    const coinArgs = {
      creator: account.address,
      name: coinName,
      symbol: coinSymbol,
      metadata: { type: 'RAW_URI', uri: metadataUri },
      currency: CreateConstants.ContentCoinCurrencies.ETH,
      chainId: base.id,
      startingMarketCap: CreateConstants.StartingMarketCaps.LOW,
      skipMetadataValidation: true,
    };

    console.log('  Getting calldata...');
    const callResult = await createCoinCall(coinArgs);
    console.log(`  Predicted address: ${callResult.predictedCoinAddress}`);

    console.log('  Sending transaction...');
    const result = await createCoin({
      call: coinArgs,
      walletClient,
      publicClient,
    });

    const coinData = {
      success: true,
      coinAddress: result.address,
      txHash: result.hash,
      zoraUrl: `https://zora.co/coin/base:${result.address}`,
      basescanUrl: `https://basescan.org/tx/${result.hash}`,
      coinName,
      coinSymbol,
      category,
      confidence,
      tweetUrl,
      tweetText,
      mintedAt: new Date().toISOString(),
    };

    // Save coin record
    const logPath = resolve(COINS_LOG_DIR, 'minted-coins.json');
    let existingCoins = [];
    if (existsSync(logPath)) {
      try { existingCoins = JSON.parse(readFileSync(logPath, 'utf8')); } catch {}
    }
    existingCoins.push(coinData);
    writeFileSync(logPath, JSON.stringify(existingCoins, null, 2));

    console.log(`\n✅ Content Coin Minted!`);
    console.log(`  Address: ${result.address}`);
    console.log(`  TX: ${result.hash}`);
    console.log(`  Zora: ${coinData.zoraUrl}`);

    return coinData;

  } catch (error) {
    console.error(`\n❌ Content coin mint failed: ${error.message}`);
    return { success: false, reason: error.message };
  }
}
