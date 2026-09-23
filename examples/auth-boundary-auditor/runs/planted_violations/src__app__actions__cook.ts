'use server';
// M4.6 draft — "Cooked it" plus a swap suggestion, as a server action.
import { callAnthropic } from '@/lib/llm/anthropic';
import { DEFAULT_LLM_CONFIG } from '@/lib/llm/config';

export async function suggestSwap(householdId: string, ingredient: string) {
  const result = await callAnthropic({
    config: DEFAULT_LLM_CONFIG,
    stage: DEFAULT_LLM_CONFIG.stages.ideas,
    stablePrefix: `household ${householdId}`,
    userMessage: `Suggest a swap for ${ingredient}`,
  });
  return result;
}
