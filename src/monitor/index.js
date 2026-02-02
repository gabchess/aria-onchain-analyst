/**
 * T11: Monitor Orchestrator — collects all data sources into one snapshot
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fetchBaseTVL } from './defi-tvl.js';
import { fetchChainStats } from './chain-stats.js';
import { fetchStablecoins } from './stablecoin-flows.js';

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

  const [defi, chain, stablecoins] = await Promise.allSettled([
    fetchBaseTVL(),
    fetchChainStats(),
    fetchStablecoins(),
  ]);

  const snapshot = {
    timestamp: new Date().toISOString(),
    defi: defi.status === 'fulfilled' ? defi.value : { error: defi.reason?.message },
    chain: chain.status === 'fulfilled' ? chain.value : { error: chain.reason?.message },
    stablecoins: stablecoins.status === 'fulfilled' ? stablecoins.value : { error: stablecoins.reason?.message },
  };

  // Count successes
  const sources = [defi, chain, stablecoins];
  const ok = sources.filter(s => s.status === 'fulfilled').length;
  console.log(`✅ Snapshot collected: ${ok}/${sources.length} sources succeeded`);

  if (ok === 0) throw new Error('All data sources failed');

  // Save and load previous
  ensureDataDir();
  const previous = loadPreviousSnapshot();
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  return { current: snapshot, previous };
}
