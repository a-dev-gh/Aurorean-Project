/**
 * AI abstraction layer.
 * Supports: mock, claude-cli, gemini
 * Each provider takes the same input and returns the same output.
 */

const MOCK_RESPONSES = [
  "I've analyzed the request. Here's my assessment:\n\n**Confidence:** High\n**Risk:** Low\n\nI'll break this down into actionable steps for you.",
  "Based on my review, I recommend the following approach:\n\n1. Start with the core structure\n2. Add the key functionality\n3. Test edge cases\n\nShall I elaborate on any of these?",
  "I've scanned the relevant areas. Here are my findings:\n\n- The current implementation looks solid\n- There are a few areas for improvement\n- No critical issues detected\n\n**Confidence:** Medium\n**Risk:** Low",
  "Good question. Let me think about this systematically.\n\nThe best approach here would be to:\n- Keep the existing pattern\n- Extend it with the new requirements\n- Validate against the project standards\n\nWant me to generate a detailed plan?",
  "I've completed the analysis. Here's a summary:\n\n**Status:** Ready for implementation\n**Dependencies:** None blocking\n**Estimated complexity:** Medium\n\nI can proceed when you give the go-ahead.",
];

function getMockResponse(agent, messages) {
  // Pick a response based on message count for variety
  const idx = messages.length % MOCK_RESPONSES.length;
  const base = MOCK_RESPONSES[idx];

  return `*${agent.name} responding*\n\n${base}`;
}

async function callClaudeCLI(agent, messages, model, settings) {
  // Build conversation context
  const history = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const body = {
    systemPrompt: agent.systemPrompt,
    messages: history,
    model: model === 'auto' ? agent.model : model,
    projectFolder: settings.projectFolder || undefined,
  };

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude CLI error: ${err}`);
  }

  const data = await res.json();
  return data.response;
}

async function callGemini(agent, messages, model, apiKey) {
  if (!apiKey) throw new Error('Gemini API key not configured. Go to Settings to add it.');

  const modelId = model === 'auto' ? 'gemini-2.0-flash' : model;

  const contents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: agent.systemPrompt }] },
        contents,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}

/**
 * Send a message to an agent and get a response.
 * @param {Object} params
 * @param {Object} params.agent - The agent definition
 * @param {Array} params.messages - Conversation history [{role, content}]
 * @param {Object} params.settings - App settings (aiProvider, aiModel, apiKeys)
 * @returns {Promise<string>} The agent's response text
 */
export async function sendMessage({ agent, messages, settings }) {
  const { aiProvider, aiModel, apiKeys } = settings;

  switch (aiProvider) {
    case 'claude-cli':
      return callClaudeCLI(agent, messages, aiModel, settings);

    case 'gemini':
      return callGemini(agent, messages, aiModel, apiKeys?.gemini);

    case 'mock':
    default:
      // Simulate a small delay for realism
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
      return getMockResponse(agent, messages);
  }
}
