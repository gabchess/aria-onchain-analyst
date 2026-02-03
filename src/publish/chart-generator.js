/**
 * Chart Generator — creates data viz PNGs for tweet attachments
 * Uses Chart.js + chartjs-node-canvas for server-side rendering
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const WIDTH = 800;
const HEIGHT = 400;
const BG_COLOR = '#1a1a2e';

const chartCanvas = new ChartJSNodeCanvas({
  width: WIDTH,
  height: HEIGHT,
  backgroundColour: BG_COLOR,
});

/**
 * Generate a chart from insight data
 * @param {Object} snapshot - Current data snapshot
 * @param {Object} insight - LLM insight with category
 * @returns {string|null} Path to generated chart PNG, or null if no chart fits
 */
export async function generateChart(snapshot, insight) {
  const category = insight.category;
  let chartConfig = null;

  // TVL / Protocol charts — bar chart of top protocols
  if (['tvl', 'protocol'].includes(category) && snapshot.defiTvl?.protocols) {
    const protocols = snapshot.defiTvl.protocols.slice(0, 8);
    chartConfig = {
      type: 'bar',
      data: {
        labels: protocols.map(p => p.name),
        datasets: [{
          label: 'TVL ($M)',
          data: protocols.map(p => (p.tvl / 1e6).toFixed(1)),
          backgroundColor: '#00d4ff',
          borderColor: '#00d4ff',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: makeOptions('Base DeFi — Top Protocols by TVL'),
    };
  }

  // Stablecoin charts — bar chart of stablecoin supply
  if (category === 'stablecoin' && snapshot.stablecoins) {
    const stables = Object.entries(snapshot.stablecoins)
      .filter(([k]) => k !== 'total' && k !== 'timestamp')
      .map(([name, val]) => ({ name: name.toUpperCase(), value: typeof val === 'object' ? val.supply : val }))
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value);

    if (stables.length > 0) {
      chartConfig = {
        type: 'bar',
        data: {
          labels: stables.map(s => s.name),
          datasets: [{
            label: 'Supply ($M)',
            data: stables.map(s => (s.value / 1e6).toFixed(1)),
            backgroundColor: '#4ade80',
            borderColor: '#4ade80',
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: makeOptions('Base Stablecoin Supply'),
      };
    }
  }

  // Chain stats — bar chart if we have tx data
  if (category === 'chain' && snapshot.chainStats) {
    // Use whatever numeric data is available
    const stats = snapshot.chainStats;
    const items = [];
    if (stats.txCount) items.push({ label: 'TX Count', value: stats.txCount });
    if (stats.gasPrice) items.push({ label: 'Gas (gwei)', value: stats.gasPrice });
    if (stats.blockNumber) items.push({ label: 'Block #', value: stats.blockNumber });

    if (items.length >= 2) {
      chartConfig = {
        type: 'bar',
        data: {
          labels: items.map(i => i.label),
          datasets: [{
            label: 'Base Chain Stats',
            data: items.map(i => i.value),
            backgroundColor: '#f472b6',
            borderColor: '#f472b6',
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: makeOptions('Base L2 — Chain Snapshot'),
      };
    }
  }

  // Fallback: if we have defiTvl data regardless of category, use it
  if (!chartConfig && snapshot.defiTvl?.protocols?.length > 0) {
    const protocols = snapshot.defiTvl.protocols.slice(0, 8);
    chartConfig = {
      type: 'bar',
      data: {
        labels: protocols.map(p => p.name),
        datasets: [{
          label: 'TVL ($M)',
          data: protocols.map(p => (p.tvl / 1e6).toFixed(1)),
          backgroundColor: '#00d4ff',
          borderColor: '#00d4ff',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: makeOptions('Base DeFi — Protocol TVL Snapshot'),
    };
  }

  if (!chartConfig) {
    console.log('📊 No chartable data for this insight category');
    return null;
  }

  try {
    const buffer = await chartCanvas.renderToBuffer(chartConfig);
    const dataDir = new URL('../../data/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    const chartPath = `${dataDir}/tweet-chart.png`;
    writeFileSync(chartPath, buffer);
    console.log(`📊 Chart generated: ${chartPath} (${buffer.length} bytes)`);
    return chartPath;
  } catch (err) {
    console.error(`📊 Chart generation failed: ${err.message}`);
    return null;
  }
}

function makeOptions(title) {
  return {
    plugins: {
      title: {
        display: true,
        text: title,
        color: '#ffffff',
        font: { size: 16, weight: 'bold' },
      },
      legend: { display: false },
    },
    scales: {
      x: { ticks: { color: '#cccccc' }, grid: { color: '#2a2a4a' } },
      y: { ticks: { color: '#cccccc' }, grid: { color: '#2a2a4a' }, beginAtZero: true },
    },
  };
}
