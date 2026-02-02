/**
 * T8: DeFi TVL Monitor — fetches Base ecosystem TVL from DeFiLlama
 */

const LLAMA_PROTOCOLS = 'https://api.llama.fi/protocols';

export async function fetchBaseTVL() {
  const res = await fetch(LLAMA_PROTOCOLS);
  if (!res.ok) throw new Error(`DeFiLlama protocols API: ${res.status}`);

  const protocols = await res.json();

  // Filter to protocols that have TVL on Base
  const baseProtocols = protocols
    .filter(p => p.chains?.includes('Base') && p.chainTvls?.Base > 0)
    .map(p => ({
      name: p.name,
      tvl: p.chainTvls.Base,
      category: p.category || 'unknown',
      change_1d: p.change_1d ?? null,
      change_7d: p.change_7d ?? null,
    }))
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 10);

  const totalTvl = baseProtocols.reduce((sum, p) => sum + p.tvl, 0);

  return {
    totalTvl,
    topProtocolCount: baseProtocols.length,
    protocols: baseProtocols,
    source: 'defillama',
    fetchedAt: new Date().toISOString(),
  };
}
