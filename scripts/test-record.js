import { readFileSync, existsSync } from 'fs';
import { ethers } from 'ethers';
import 'dotenv/config';

const { PRIVATE_KEY, BASE_RPC_URL = 'https://mainnet.base.org' } = process.env;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not set in .env');
  process.exit(1);
}

if (!existsSync('deployed.json')) {
  console.error('❌ deployed.json not found. Run deploy.js first.');
  process.exit(1);
}

const { address, abi } = JSON.parse(readFileSync('deployed.json', 'utf8'));
console.log(`📋 Contract: ${address}`);

// Connect
const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(address, abi, wallet);

// Record a test finding
console.log('📝 Recording test finding...');
const contentHash = ethers.keccak256(ethers.toUtf8Bytes('Test finding content from deploy verification'));

const tx = await contract.recordFinding(
  'test',
  'Test finding from deploy script',
  contentHash,
  'https://x.com/AriaLinkwell'
);

console.log(`📤 TX sent: ${tx.hash}`);
const receipt = await tx.wait();
console.log(`✅ Confirmed in block ${receipt.blockNumber} (gas: ${receipt.gasUsed.toString()})`);

// Read back
const total = await contract.totalFindings();
console.log(`\n📊 Total findings: ${total}`);

const latest = await contract.getLatestFindings(1);
if (latest.length > 0) {
  const f = latest[0];
  console.log(`\n🔍 Latest finding:`);
  console.log(`   Category: ${f.category}`);
  console.log(`   Summary: ${f.summary}`);
  console.log(`   Timestamp: ${new Date(Number(f.timestamp) * 1000).toISOString()}`);
  console.log(`   Content Hash: ${f.contentHash}`);
  console.log(`   Tweet URL: ${f.tweetUrl}`);
}

console.log('\n✅ All checks passed!');
