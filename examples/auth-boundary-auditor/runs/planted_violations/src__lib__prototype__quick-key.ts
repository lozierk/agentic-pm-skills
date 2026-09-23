// Convenience accessor so the prototype page can show whether a key is configured.
export function anthropicKeyConfigured(): boolean {
  return (process.env.ANTHROPIC_API_KEY ?? '').length > 0;
}
