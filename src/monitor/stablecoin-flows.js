/**
 * T10: Stablecoin Monitor — Base stablecoin supply from DeFiLlama
 */

const LLAMA_STABLECOINS = 'https://stablecoins.llama.fi/stablecoins?includePrices=true';
const LLAMA_STABLECOIN_CHAINS = 'https://stablecoins.llama.fi/stablecoinchains';

export async function fetchStablecoins() {
  // Get per-chain totals
  const chainsRes = await fetch(LLAMA_STABLECOIN_CHAINS);
  if (!chainsRes.ok) throw new Error(`DeFiLlama stablecoin chains: ${chainsRes.status}`);
  const chains = await chainsRes.json();

  const base = chains.find(c => c.name === 'Base');
  if (!base) throw new Error('Base not found in stablecoin chains data');

  // Get individual stablecoin data for breakdown
  const stableRes = await fetch(LLAMA_STABLECOINS);
  if (!stableRes.ok) throw new Error(`DeFiLlama stablecoins: ${stableRes.status}`);
  const { peggedAssets } = await stableRes.json();

  // Get top stablecoins on Base
  const baseStables = peggedAssets
    .filter(s => s.chainCirculating?.Base)
    .map(s => {
      const circulating = s.chainCirculating.Base;
      const usd = circulating.current?.peggedUSD || 0;
      return {
        name: s.name,
        symbol: s.symbol,
        circulating: usd,
      };
    })
    .filter(s => s.circulating > 0)
    .sort((a, b) => b.circulating - a.circulating)
    .slice(0, 8);

  return {
    totalUSD: base.totalCirculatingUSD?.peggedUSD || 0,
    breakdown: baseStables,
    source: 'defillama-stablecoins',
    fetchedAt: new Date().toISOString(),
  };
}
