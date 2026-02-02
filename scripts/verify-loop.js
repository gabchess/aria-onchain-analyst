/**
 * T18: Verification Script — proves the autonomous loop works
 *
 * Checks:
 * 1. Contract deployed and has findings onchain
 * 2. runs.json has successful pipeline entries
 * 3. @AriaLinkwell tweets exist (via Bird CLI or just checks runs data)
 * 4. Data pipeline components are functional
 *
 * Pass: All checks green after at least one successful loop run
 */
import { readFileSync, existsSync } from 'fs';
import { ethers } from 'ethers';
import { getProvider, getWallet } from '../src/utils/provider.js';

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
const WARN = '⚠️ WARN';
let passes = 0;
let fails = 0;
let warnings = 0;

function check(name, passed, detail) {
  if (passed === 'warn') {
    console.log(`  ${WARN} ${name}: ${detail}`);
    warnings++;
  } else if (passed) {
    console.log(`  ${PASS} ${name}${detail ? ': ' + detail : ''}`);
    passes++;
  } else {
    console.log(`  ${FAIL} ${name}${detail ? ': ' + detail : ''}`);
    fails++;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  🔍 Aria Onchain Analyst — Verification');
  console.log(`  ⏰ ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════\n');

  // ── 1. Contract Deployment ──
  console.log('📋 Contract Deployment:');
  const deployedPath = 'deployed.json';
  const hasDeployed = existsSync(deployedPath);
  check('deployed.json exists', hasDeployed);

  let deployed = null;
  if (hasDeployed) {
    deployed = JSON.parse(readFileSync(deployedPath, 'utf8'));
    check('Contract address present', !!deployed.address, deployed.address);
    check('ABI present', deployed.abi?.length > 0, `${deployed.abi?.length} entries`);
  }

  // ── 2. Onchain State ──
  console.log('\n⛓️  Onchain State:');
  if (deployed?.address && deployed?.abi) {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(deployed.address, deployed.abi, provider);

      const totalFindings = await contract.totalFindings();
      const count = Number(totalFindings);
      check('Contract responds', true, `totalFindings() = ${count}`);
      check('Has findings onchain', count > 0, `${count} finding(s) recorded`);

      if (count > 0) {
        const latest = await contract.getLatestFindings(Math.min(count, 3));
        check('Can read findings', latest.length > 0, `Retrieved ${latest.length} finding(s)`);

        // Show latest finding
        if (latest.length > 0) {
          const f = latest[0];
          console.log(`\n  📊 Latest finding:`);
          console.log(`     Category: ${f.category}`);
          console.log(`     Summary: ${f.summary}`);
          console.log(`     Tweet: ${f.tweetUrl || '(no tweet URL)'}`);
          console.log(`     Time: ${new Date(Number(f.timestamp) * 1000).toISOString()}`);
        }
      }

      // Check analyst address matches wallet
      try {
        const analyst = await contract.analyst();
        const wallet = getWallet();
        check('Analyst is our wallet', analyst.toLowerCase() === wallet.address.toLowerCase(),
          `${analyst.slice(0, 10)}...`);
      } catch {
        check('Analyst check', 'warn', 'Could not verify analyst address');
      }
    } catch (err) {
      check('Contract connection', false, err.message.slice(0, 80));
    }
  } else {
    check('Contract connection', false, 'No deployed.json');
  }

  // ── 3. Pipeline Runs ──
  console.log('\n🔄 Pipeline Runs:');
  const runsPath = 'data/runs.json';
  const hasRuns = existsSync(runsPath);
  check('runs.json exists', hasRuns);

  if (hasRuns) {
    const runs = JSON.parse(readFileSync(runsPath, 'utf8'));
    check('Has run entries', runs.length > 0, `${runs.length} total run(s)`);

    const successful = runs.filter(r => r.status === 'success');
    const failed = runs.filter(r => r.status === 'error');
    const skipped = runs.filter(r => r.status === 'skipped');

    check('Successful runs', successful.length > 0, `${successful.length} successful`);

    if (failed.length > 0) {
      check('Failed runs', 'warn', `${failed.length} failed`);
    }
    if (skipped.length > 0) {
      console.log(`  ℹ️  ${skipped.length} skipped (low confidence — normal)`);
    }

    // Show run stats
    if (successful.length > 0) {
      const avgDuration = successful.reduce((sum, r) => sum + (r.durationMs || 0), 0) / successful.length;
      console.log(`\n  📈 Stats:`);
      console.log(`     Total runs: ${runs.length}`);
      console.log(`     Success rate: ${((successful.length / runs.length) * 100).toFixed(0)}%`);
      console.log(`     Avg duration: ${(avgDuration / 1000).toFixed(1)}s`);

      // Tweet posting stats
      const tweeted = successful.filter(r => r.steps?.tweet?.success);
      const pendingBrowser = successful.filter(r => r.steps?.tweet?.method === 'pending-browser');
      console.log(`     Tweets posted (Bird CLI): ${tweeted.length}`);
      console.log(`     Tweets via browser: ${pendingBrowser.length}`);
      console.log(`     Onchain recordings: ${successful.filter(r => r.steps?.onchain?.success).length}`);

      // Latest run
      const lastRun = runs[runs.length - 1];
      console.log(`\n  🕐 Latest run:`);
      console.log(`     Time: ${lastRun.startedAt}`);
      console.log(`     Status: ${lastRun.status}`);
      console.log(`     Duration: ${((lastRun.durationMs || 0) / 1000).toFixed(1)}s`);
      if (lastRun.insight) {
        console.log(`     Insight: ${lastRun.insight.summary}`);
        console.log(`     TX: ${lastRun.insight.txHash}`);
      }
    }
  }

  // ── 4. Source Files ──
  console.log('\n📁 Source Files:');
  const requiredFiles = [
    'src/index.js',
    'src/config.js',
    'src/utils/provider.js',
    'src/monitor/defi-tvl.js',
    'src/monitor/chain-stats.js',
    'src/monitor/stablecoin-flows.js',
    'src/monitor/index.js',
    'src/analyze/insight-generator.js',
    'src/analyze/index.js',
    'src/publish/tweet-composer.js',
    'src/publish/bird-poster.js',
    'src/publish/onchain-recorder.js',
    'contracts/AnalyticsRegistry.sol',
    'scripts/deploy.js',
    'scripts/run-pipeline.ps1',
    '.env',
  ];

  let filesPassed = 0;
  for (const f of requiredFiles) {
    if (existsSync(f)) {
      filesPassed++;
    } else {
      check(`File: ${f}`, false, 'MISSING');
    }
  }
  check(`Source files`, filesPassed === requiredFiles.length,
    `${filesPassed}/${requiredFiles.length} present`);

  // ── 5. Environment ──
  console.log('\n🔑 Environment:');
  const envPath = '.env';
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    const requiredVars = ['PRIVATE_KEY', 'BASE_RPC_URL', 'OPENROUTER_API_KEY'];
    for (const v of requiredVars) {
      const hasVar = envContent.includes(`${v}=`) && !envContent.includes(`${v}=your_`);
      check(`ENV: ${v}`, hasVar, hasVar ? 'configured' : 'missing or placeholder');
    }
  } else {
    check('.env file', false, 'MISSING');
  }

  // ── 6. Basescan Verification ──
  console.log('\n🔗 Links:');
  if (deployed?.address) {
    console.log(`  📜 Contract: https://basescan.org/address/${deployed.address}`);
    console.log(`  🐦 Twitter: https://x.com/AriaLinkwell`);
    console.log(`  📦 GitHub: https://github.com/gabchess/aria-onchain-analyst`);
  }

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════');
  console.log(`  Results: ${passes} passed, ${fails} failed, ${warnings} warnings`);
  if (fails === 0) {
    console.log('  🎉 ALL CHECKS PASSED — System is operational!');
  } else {
    console.log(`  ⚠️  ${fails} check(s) need attention`);
  }
  console.log('═══════════════════════════════════════════');

  process.exit(fails > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
