/**
 * Grammar fixer — cleans up and structures prompts before sending.
 * Uses Gemini Flash (free) or Claude CLI (haiku) as a quick pass.
 */

const GRAMMAR_PROMPT = `You are a grammar and clarity assistant. Fix the grammar, spelling, and punctuation of the following text. Structure it clearly if it's messy. Keep the same meaning and tone — don't make it formal, just correct. Do NOT add quotes around your response. Return ONLY the fixed text, nothing else.`;

export async function fixGrammar(text, settings) {
  if (!text.trim()) return text;

  // Try Gemini first (free + fast)
  if (settings.apiKeys?.gemini) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.apiKeys.gemini}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: GRAMMAR_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text }] }],
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const fixed = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (fixed) return fixed.trim();
      }
    } catch {
      // Fall through to Claude CLI
    }
  }

  // Fallback: Claude CLI (haiku — fast)
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: GRAMMAR_PROMPT,
        messages: text,
        model: 'haiku',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.response) return data.response.trim();
    }
  } catch {
    // Fall through
  }

  // No AI available — return original
  return text;
}
