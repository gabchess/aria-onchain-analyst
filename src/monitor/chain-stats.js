/**
 * T9: Chain Stats Monitor — Base block data via RPC
 */
import { getProvider } from '../utils/provider.js';
import { ethers } from 'ethers';

export async function fetchChainStats() {
  const provider = getProvider();

  const [block, feeData] = await Promise.all([
    provider.getBlock('latest'),
    provider.getFeeData(),
  ]);

  return {
    blockNumber: block.number,
    timestamp: block.timestamp,
    blockTime: new Date(block.timestamp * 1000).toISOString(),
    txCount: block.transactions.length,
    gasPrice: parseFloat(ethers.formatUnits(feeData.gasPrice || 0n, 'gwei')),
    baseFeePerGas: block.baseFeePerGas
      ? parseFloat(ethers.formatUnits(block.baseFeePerGas, 'gwei'))
      : null,
    source: 'base-rpc',
    fetchedAt: new Date().toISOString(),
  };
}
