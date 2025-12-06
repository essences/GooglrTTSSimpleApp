import { MODEL_PRICING, USD_TO_JPY, TOKENS_PER_SECOND } from '../config/constants.js';

export function calculateCostDetails(usage, script, durationSeconds, modelName) {
  const pricing = MODEL_PRICING[modelName];
  if (!pricing) return null;

  const inputTokens = extractInputTokens(usage, script);
  const outputTokens = extractOutputTokens(usage, durationSeconds, script);

  const usdInput = (inputTokens / 1_000_000) * pricing.inputUsdPerMillion;
  const usdOutput = (outputTokens / 1_000_000) * pricing.outputUsdPerMillion;
  const usdTotal = usdInput + usdOutput;

  return {
    usd: usdTotal,
    jpy: usdTotal * USD_TO_JPY,
    inputTokens,
    outputTokens,
    usdBreakdown: { input: usdInput, output: usdOutput }
  };
}

export function extractInputTokens(usage, script) {
  if (!usage && script) return estimateInputTokensFromScript(script);
  if (usage?.promptTokenCount) return usage.promptTokenCount;
  if (usage?.inputTokenCount) return usage.inputTokenCount;
  if (Array.isArray(usage?.promptTokensDetails)) {
    return usage.promptTokensDetails.reduce((sum, item) => sum + (item.tokenCount || 0), 0);
  }
  return estimateInputTokensFromScript(script);
}

export function extractOutputTokens(usage, durationSeconds, script) {
  if (usage?.candidatesTokenCount) return usage.candidatesTokenCount;
  if (usage?.outputTokenCount) return usage.outputTokenCount;
  if (Array.isArray(usage?.candidatesTokensDetails)) {
    return usage.candidatesTokensDetails.reduce((sum, item) => sum + (item.tokenCount || 0), 0);
  }

  const effectiveDuration = durationSeconds && durationSeconds > 0
    ? durationSeconds
    : estimateDurationSecondsFromScript(script);

  return Math.round(effectiveDuration * TOKENS_PER_SECOND);
}

export function estimateInputTokensFromScript(script) {
  if (!script) return 0;
  return Math.max(1, Math.round(script.length * 1.2));
}

export function estimateDurationSecondsFromScript(script) {
  if (!script) return 5;
  return Math.max(5, script.length / 6);
}

export function formatUsd(value) {
  if (value < 0.0001) {
    return `$${value.toFixed(6)}`;
  }
  if (value < 0.01) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(3)}`;
}

export function formatYenFromUsd(value) {
  return Math.round(value * USD_TO_JPY).toLocaleString('ja-JP');
}

export function formatCostDisplay(costInfo) {
  if (!costInfo || !Number.isFinite(costInfo.usd)) {
    return '--';
  }
  const yenText = `約${formatYenFromUsd(costInfo.usd)}円`;
  return `${formatUsd(costInfo.usd)} (${yenText})`;
}

export function formatTokenCount(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }
  return value.toLocaleString('ja-JP');
}

export function aggregateSectionCost(sections) {
  if (!Array.isArray(sections) || sections.length === 0) return null;

  let usd = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  sections.forEach((section) => {
    if (!section?.cost) return;
    usd += section.cost.usd || 0;
    inputTokens += section.cost.inputTokens || 0;
    outputTokens += section.cost.outputTokens || 0;
  });

  if (usd === 0 && inputTokens === 0 && outputTokens === 0) {
    return null;
  }

  return {
    usd,
    jpy: usd * USD_TO_JPY,
    inputTokens,
    outputTokens
  };
}
