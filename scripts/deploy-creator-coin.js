/**
 * Deploy the $ARIA Creator Coin on Zora (Base mainnet)
 * 
 * This is a one-time deployment that creates Aria's profile-level token.
 * After this, content coins (per-analysis) will be backed by this creator coin.
 */
import { createCoin, createCoinCall, CreateConstants } from '@zoralabs/coins-sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

async function deployCreatorCoin() {
  console.log('🪙 Deploying $ARIA Creator Coin on Zora (Base mainnet)...\n');

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`Wallet: ${account.address}`);

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
  console.log(`ETH Balance: ${ethBalance.toFixed(6)} ETH`);

  if (ethBalance < 0.001) {
    console.error('❌ Insufficient ETH for gas. Need at least 0.001 ETH.');
    process.exit(1);
  }

  // Metadata hosted on GitHub (raw URL)
  const metadataUri = 'https://raw.githubusercontent.com/gabchess/aria-onchain-analyst/master/data/creator-coin-metadata.json';
  console.log(`\n📝 Metadata URI: ${metadataUri}`);

  // Step 2: Get calldata from Zora API
  console.log('\n📦 Getting deployment calldata...');

  const coinArgs = {
    creator: account.address,
    name: 'Aria Linkwell',
    symbol: 'ARIA',
    metadata: { type: 'RAW_URI', uri: metadataUri },
    currency: CreateConstants.ContentCoinCurrencies.ETH,
    chainId: base.id,
    startingMarketCap: CreateConstants.StartingMarketCaps.LOW,
    skipMetadataValidation: true,
  };

  console.log('\n📦 Getting deployment calldata...');
  const callResult = await createCoinCall(coinArgs);

  console.log(`\n📍 Predicted coin address: ${callResult.predictedCoinAddress}`);
  console.log(`📝 Transaction target: ${callResult.calls[0].to}`);
  console.log(`💰 Value: ${callResult.calls[0].value} wei`);

  console.log('\n🚀 Sending transaction...');

  const result = await createCoin({
    call: coinArgs,
    walletClient,
    publicClient,
  });

  console.log('\n✅ Creator Coin Deployed!');
  console.log(`  TX Hash: ${result.hash}`);
  console.log(`  Coin Address: ${result.address}`);
  console.log(`  Basescan: https://basescan.org/tx/${result.hash}`);
  console.log(`  Zora: https://zora.co/coin/base:${result.address}`);

  if (result.deployment) {
    console.log('\n  Deployment Details:');
    console.log(`    Pool: ${result.deployment.poolAddress || 'N/A'}`);
    console.log(`    Creator: ${result.deployment.creator || 'N/A'}`);
  }

  return result;
}

deployCreatorCoin().catch(err => {
  console.error('\n❌ Deployment failed:', err.message);
  if (err.cause) console.error('Cause:', err.cause);
  console.error(err.stack?.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});
