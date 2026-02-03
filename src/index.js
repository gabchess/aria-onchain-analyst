/**
 * T17: Main Loop — Aria Onchain Analyst autonomous pipeline
 *
 * Pipeline: collectSnapshot → analyzeSnapshot → composeTweet → postTweet → recordOnchain
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { collectSnapshot } from './monitor/index.js';
import { analyzeSnapshot } from './analyze/index.js';
import { composeTweet } from './publish/tweet-composer.js';
import { postTweet } from './publish/twitter-api-poster.js';
import { generateChart } from './publish/chart-generator.js';
import { recordOnchain } from './publish/onchain-recorder.js';

const DATA_DIR = new URL('../data/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const RUNS_PATH = `${DATA_DIR}/runs.json`;

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadRuns() {
  try {
    return JSON.parse(readFileSync(RUNS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveRun(run) {
  ensureDataDir();
  const runs = loadRuns();
  runs.push(run);
  writeFileSync(RUNS_PATH, JSON.stringify(runs, null, 2));
}

async function main() {
  const startTime = Date.now();
  console.log('═══════════════════════════════════════');
  console.log('  🔗 Aria Onchain Analyst — Run Start');
  console.log(`  ⏰ ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════\n');

  const run = {
    startedAt: new Date().toISOString(),
    status: 'running',
    steps: {},
  };

  try {
    // Step 1: Collect data
    const { current, previous } = await collectSnapshot();
    run.steps.monitor = { success: true, sources: 3 };

    // Step 2: Analyze
    const insight = await analyzeSnapshot(current, previous);
    if (!insight) {
      run.status = 'skipped';
      run.reason = 'Low confidence insight';
      run.completedAt = new Date().toISOString();
      run.durationMs = Date.now() - startTime;
      saveRun(run);
      console.log('\n⏭️  Run complete — no noteworthy insight this cycle');
      return;
    }
    run.steps.analyze = { success: true, category: insight.category, confidence: insight.confidence };

    // Step 3: Compose tweet
    const tweetText = composeTweet(insight);
    run.steps.compose = { success: true, length: tweetText.length };

    // Step 3.5: Generate chart image if possible
    let chartPath = null;
    try {
      chartPath = await generateChart(current, insight);
      run.steps.chart = { success: !!chartPath, path: chartPath };
    } catch (err) {
      console.log(`📊 Chart generation skipped: ${err.message}`);
      run.steps.chart = { success: false, error: err.message };
    }

    // Step 4: Post tweet via X API v2 (with chart if available)
    const tweetResult = await postTweet(tweetText, chartPath);
    run.steps.tweet = tweetResult;
    insight.tweetUrl = tweetResult.tweetUrl || '';

    // Step 5: Record onchain (even if tweet failed)
    const onchainResult = await recordOnchain(insight);
    run.steps.onchain = onchainResult;

    // Done
    run.status = 'success';
    run.insight = {
      category: insight.category,
      summary: insight.summary,
      tweetText,
      tweetUrl: tweetResult.tweetUrl || '',
      txHash: onchainResult.txHash,
      findingId: onchainResult.findingId,
    };

  } catch (err) {
    run.status = 'error';
    run.error = err.message;
    console.error(`\n❌ Pipeline error: ${err.message}`);
  }

  run.completedAt = new Date().toISOString();
  run.durationMs = Date.now() - startTime;
  saveRun(run);

  console.log('\n═══════════════════════════════════════');
  console.log(`  Status: ${run.status.toUpperCase()}`);
  console.log(`  Duration: ${(run.durationMs / 1000).toFixed(1)}s`);
  if (run.insight) {
    console.log(`  Finding: ${run.insight.summary}`);
    console.log(`  TX: ${run.insight.txHash}`);
  }
  console.log('═══════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
