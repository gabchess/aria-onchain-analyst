/**
 * T11: Monitor Orchestrator — collects all data sources into one snapshot
 *
 * 4 data sources:
 * 1. DeFiLlama — TVL, top protocols
 * 2. Base RPC — block height, gas, tx count
 * 3. Stablecoins — supply, USDC/USDT/DAI breakdown
 * 4. X Ecosystem — recent tweets from Based Intelligence list (qualitative context)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fetchBaseTVL } from './defi-tvl.js';
import { fetchChainStats } from './chain-stats.js';
import { fetchStablecoins } from './stablecoin-flows.js';
import { fetchEcosystemBuzz } from './x-ecosystem.js';

const DATA_DIR = new URL('../../data/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const SNAPSHOT_PATH = `${DATA_DIR}/last-snapshot.json`;

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadPreviousSnapshot() {
  try {
    return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export async function collectSnapshot() {
  console.log('📡 Collecting ecosystem snapshot...');

  const [defi, chain, stablecoins, xBuzz] = await Promise.allSettled([
    fetchBaseTVL(),
    fetchChainStats(),
    fetchStablecoins(),
    fetchEcosystemBuzz(),
  ]);

  const snapshot = {
    timestamp: new Date().toISOString(),
    defi: defi.status === 'fulfilled' ? defi.value : { error: defi.reason?.message },
    chain: chain.status === 'fulfilled' ? chain.value : { error: chain.reason?.message },
    stablecoins: stablecoins.status === 'fulfilled' ? stablecoins.value : { error: stablecoins.reason?.message },
    ecosystem: xBuzz.status === 'fulfilled' ? xBuzz.value : { error: xBuzz.reason?.message },
  };

  // Count successes (X buzz is optional — count core sources separately)
  const coreSources = [defi, chain, stablecoins];
  const coreOk = coreSources.filter(s => s.status === 'fulfilled').length;
  const hasXBuzz = xBuzz.status === 'fulfilled' && xBuzz.value?.tweets?.length > 0;
  console.log(`✅ Snapshot collected: ${coreOk}/3 core sources + ${hasXBuzz ? 'X buzz ✓' : 'X buzz ✗ (non-fatal)'}`);

  if (coreOk === 0) throw new Error('All core data sources failed');

  // Save and load previous
  ensureDataDir();
  const previous = loadPreviousSnapshot();
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  return { current: snapshot, previous };
}
