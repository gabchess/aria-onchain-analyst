/**
 * T13: Analysis Orchestrator — runs insight generation with confidence filter
 */
import { generateInsight } from './insight-generator.js';

const MIN_CONFIDENCE = 7;

export async function analyzeSnapshot(current, previous) {
  console.log('🧠 Generating insight from snapshot...');

  const insight = await generateInsight(current, previous);

  console.log(`   Category: ${insight.category}`);
  console.log(`   Summary: ${insight.summary}`);
  console.log(`   Confidence: ${insight.confidence}/10`);
  console.log(`   Tweet draft: ${insight.tweetDraft}`);

  if (insight.confidence < MIN_CONFIDENCE) {
    console.log(`⏭️  Skipping — confidence ${insight.confidence} < ${MIN_CONFIDENCE} threshold`);
    return null;
  }

  console.log('✅ Insight passes confidence threshold');
  return insight;
}
