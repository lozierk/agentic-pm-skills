/** Prototype swap endpoint: GET lists candidates, POST asks the model. */
import type { NextRequest } from 'next/server';
import { DEFAULT_LLM_CONFIG } from '@/lib/llm/config';
import { callAnthropic } from '@/lib/llm/anthropic';
import { prototypeEnabled } from '@/lib/prototype/guard';
import { loadPrototypeHousehold } from '@/lib/prototype/profiles';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!prototypeEnabled()) return new Response('not found', { status: 404 });
  const household = await loadPrototypeHousehold();
  return Response.json({ profiles: household.profiles.map((p) => p.id) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const household = await loadPrototypeHousehold();
  const result = await callAnthropic({
    config: DEFAULT_LLM_CONFIG,
    stage: DEFAULT_LLM_CONFIG.stages.ideas,
    stablePrefix: `profiles ${household.profiles.length}`,
    userMessage: `Swap for ${String(body.ingredient ?? '')}`,
  });
  return Response.json(result);
}
