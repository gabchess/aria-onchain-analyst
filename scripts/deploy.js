import { readFileSync, writeFileSync, existsSync } from 'fs';
import { ethers } from 'ethers';
import solc from 'solc';
import 'dotenv/config';

const { PRIVATE_KEY, BASE_RPC_URL = 'https://mainnet.base.org' } = process.env;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not set in .env');
  process.exit(1);
}

// Read contract source
const contractPath = 'contracts/AnalyticsRegistry.sol';
if (!existsSync(contractPath)) {
  console.error(`❌ Contract not found: ${contractPath}`);
  process.exit(1);
}
const source = readFileSync(contractPath, 'utf8');

// Compile with solc
console.log('📝 Compiling AnalyticsRegistry.sol...');
const input = JSON.stringify({
  language: 'Solidity',
  sources: {
    'AnalyticsRegistry.sol': { content: source }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object']
      }
    },
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
});

const output = JSON.parse(solc.compile(input));

// Check for errors
if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error('❌ Compilation errors:');
    errors.forEach(e => console.error(e.formattedMessage));
    process.exit(1);
  }
  // Print warnings
  output.errors.filter(e => e.severity === 'warning').forEach(w => {
    console.warn('⚠️', w.formattedMessage.trim());
  });
}

const contract = output.contracts['AnalyticsRegistry.sol']['AnalyticsRegistry'];
const abi = contract.abi;
const bytecode = '0x' + contract.evm.bytecode.object;

console.log(`✅ Compiled! ABI has ${abi.length} entries, bytecode is ${bytecode.length} chars`);

// Connect to Base
console.log(`🔗 Connecting to ${BASE_RPC_URL}...`);
const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const network = await provider.getNetwork();
console.log(`📡 Chain: ${network.name} (${network.chainId})`);

const balance = await provider.getBalance(wallet.address);
console.log(`💰 Deployer: ${wallet.address} (${ethers.formatEther(balance)} ETH)`);

if (balance === 0n) {
  console.error('❌ Wallet has no ETH for gas!');
  process.exit(1);
}

// Deploy
console.log('🚀 Deploying AnalyticsRegistry...');
const factory = new ethers.ContractFactory(abi, bytecode, wallet);
const deployed = await factory.deploy();
await deployed.waitForDeployment();

const address = await deployed.getAddress();
const txHash = deployed.deploymentTransaction().hash;

console.log(`✅ Deployed!`);
console.log(`   Address: ${address}`);
console.log(`   TX Hash: ${txHash}`);
console.log(`   Deployer: ${wallet.address}`);

// Save deployment info
const deployInfo = {
  address,
  txHash,
  deployer: wallet.address,
  chainId: Number(network.chainId),
  timestamp: new Date().toISOString(),
  abi
};

writeFileSync('deployed.json', JSON.stringify(deployInfo, null, 2));
console.log('💾 Saved to deployed.json');
console.log(`\n🔍 View on Basescan: https://basescan.org/address/${address}`);
