/**
 * T16: Onchain Recorder — stores findings on Base via AnalyticsRegistry
 */
import { readFileSync } from 'fs';
import { ethers } from 'ethers';
import { getWallet } from '../utils/provider.js';

export async function recordOnchain(finding) {
  console.log('⛓️  Recording finding onchain...');

  // Load contract
  const deployed = JSON.parse(readFileSync('deployed.json', 'utf8'));
  const wallet = getWallet();
  const contract = new ethers.Contract(deployed.address, deployed.abi, wallet);

  // Hash the full analysis for content integrity
  const contentHash = ethers.keccak256(
    ethers.toUtf8Bytes(finding.fullAnalysis || finding.summary)
  );

  const tx = await contract.recordFinding(
    finding.category,
    finding.summary.slice(0, 200), // Contract may have string limits
    contentHash,
    finding.tweetUrl || ''
  );

  console.log(`📤 TX sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block ${receipt.blockNumber} (gas: ${receipt.gasUsed.toString()})`);

  // Get the finding ID from event logs
  const event = receipt.logs.find(l => {
    try {
      return contract.interface.parseLog(l)?.name === 'NewFinding';
    } catch { return false; }
  });

  const findingId = event
    ? contract.interface.parseLog(event).args[0].toString()
    : 'unknown';

  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    findingId,
    contractAddress: deployed.address,
  };
}
