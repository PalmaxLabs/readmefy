/**
 * api.js
 * Handles all communication with OpenRouter and the Readmefy backend proxy.
 *
 * Flow:
 *   1. POST to https://readmefy.xyz/api/generate (proxy endpoint)
 *   2. If that fails → fallback directly to OpenRouter API
 *   3. If primary model fails → try fallback model
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const READMEFY_ENDPOINT = 'https://readmefy.xyz/api/generate';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const MODELS = {
  primary: 'google/gemini-2.0-flash-001',
  fallback: 'meta-llama/llama-3.1-8b-instruct',
};

const DEFAULT_TIMEOUT_MS = 60_000; // 60 seconds

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds the AI prompt from project metadata and user preferences.
 *
 * @param {object} opts
 * @param {import('./analyzer.js').ProjectInfo} opts.info - Analyzed project data
 * @param {string[]} opts.sections - Sections to include
 * @param {'professional'|'friendly'|'minimal'} opts.tone - Writing tone
 * @param {'generate'|'improve'|'regenerate'} opts.mode - Generation mode
 * @param {string} [opts.extraContext] - Optional extra context from user
 * @param {string} [opts.existingReadme] - Content of existing README (for improve mode)
 * @returns {string} The full prompt string
 */
export function buildPrompt({ info, sections, tone, mode, extraContext = '', existingReadme = '' }) {
  const stack = [
    ...info.detectedFrameworks,
    info.language !== 'JavaScript' ? info.language : null,
    ...info.detectedStyling,
  ].filter(Boolean).join(', ') || info.runtime;

  const scriptsBlock = Object.entries(info.scripts)
    .slice(0, 10)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  const depsBlock = [...info.dependencies.slice(0, 12), ...info.devDependencies.slice(0, 6)]
    .join(', ');

  const sectionList = sections
    .map(s => `- ${s.charAt(0).toUpperCase() + s.slice(1)}`)
    .join('\n');

  const toneGuide = {
    professional: 'Use a formal, precise, professional tone. Focus on clarity and structure.',
    friendly: 'Use a friendly, approachable tone suited for open-source communities. Be welcoming but concise.',
    minimal: 'Be extremely minimal and concise. Only include what is strictly necessary. No fluff.',
  }[tone] || 'Use a professional tone.';

  let systemPrompt = `You are a technical writer who specializes in writing clean, high-quality README.md files for software projects.
Your output must be ONLY the raw Markdown content of the README.md — no explanation, no preamble, no code fences wrapping the entire output.
${toneGuide}
Rules:
- Use proper Markdown formatting (headings, code blocks, lists)
- Use backticks for all inline code and code blocks with language hints
- Keep installation instructions practical and runnable
- Be concise: no filler sentences, no excessive praise
- Do NOT use emojis
- Do NOT wrap the entire output in a code block
- Do NOT add a section titled "Conclusion" or "Summary"
- Do NOT add any text after the last section`;

  let userPrompt = '';

  if (mode === 'improve' && existingReadme) {
    userPrompt = `Improve the following README.md for the project described below.
Enhance clarity, fix formatting issues, add missing information, and expand thin sections.
Keep the existing structure where it is good; only restructure what is clearly wrong.

PROJECT METADATA:
- Name: ${info.name}
- Description: ${info.description || 'Not provided'}
- Stack: ${stack}
- Package manager: ${info.packageManager}
- License: ${info.license || 'Not specified'}
${extraContext ? `- Extra context: ${extraContext}` : ''}

SECTIONS TO ENSURE ARE PRESENT:
${sectionList}

EXISTING README:
${existingReadme.slice(0, 4000)}
`;
  } else {
    userPrompt = `Generate a complete README.md for the following project.

PROJECT METADATA:
- Name: ${info.name}
- Description: ${info.description || 'A software project'}
- Stack / Framework: ${stack}
- Language: ${info.language}
- Runtime: ${info.runtime}
- Package manager: ${info.packageManager}
- Version: ${info.version || 'N/A'}
- Author: ${info.author || 'N/A'}
- License: ${info.license || 'MIT'}
${info.detectedDatabase.length > 0 ? `- Database/ORM: ${info.detectedDatabase.join(', ')}` : ''}
${info.detectedTesting.length > 0 ? `- Testing: ${info.detectedTesting.join(', ')}` : ''}
${info.hasDocker ? '- Docker: yes' : ''}
${info.hasCi ? '- CI/CD: yes' : ''}
${info.isMonorepo ? '- Monorepo: yes' : ''}

AVAILABLE SCRIPTS:
${scriptsBlock || '  (none detected)'}

MAIN DEPENDENCIES:
${depsBlock || '(none detected)'}

SECTIONS TO INCLUDE (in this order):
${sectionList}

${extraContext ? `EXTRA CONTEXT FROM DEVELOPER:\n${extraContext}` : ''}

Generate the README.md now.`;
  }

  return { systemPrompt, userPrompt };
}

// ─── Fetch helper with timeout ────────────────────────────────────────────────

/**
 * fetch() wrapper with a timeout.
 */
async function fetchWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── OpenRouter direct call ───────────────────────────────────────────────────

/**
 * Calls OpenRouter API directly.
 * Tries primary model → fallback model on failure.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {string} apiKey
 * @param {object} [opts]
 * @param {(chunk: string) => void} [opts.onChunk] - Called for each streamed text chunk
 * @returns {Promise<string>} Generated README content
 */
async function callOpenRouter(systemPrompt, userPrompt, apiKey, { onChunk } = {}) {
  const modelsToTry = [MODELS.primary, MODELS.fallback];

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const isLastAttempt = i === modelsToTry.length - 1;

    try {
      const body = {
        model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.4,
      };

      const res = await fetchWithTimeout(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://readmefy.xyz',
          'X-Title': 'Readmefy CLI',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        if (res.status === 429) {
          throw new RateLimitError(`Rate limit reached on model "${model}". Try again in a moment.`);
        }
        if (res.status === 401) {
          throw new AuthError('Invalid OpenRouter API key. Check your OPENROUTER_API_KEY environment variable.');
        }
        throw new Error(`OpenRouter API error ${res.status}: ${errText.slice(0, 200)}`);
      }

      // ── Stream response ────────────────────────────────────────────────────
      const content = await readStream(res.body, onChunk);
      return content;

    } catch (err) {
      // Don't retry on auth or rate limit errors
      if (err instanceof AuthError || err instanceof RateLimitError) throw err;

      if (!isLastAttempt) {
        // Silently try next model
        continue;
      }
      throw err;
    }
  }
}

// ─── Stream reader ────────────────────────────────────────────────────────────

/**
 * Reads a streaming SSE response from OpenRouter and returns full text.
 * Calls onChunk(text) for each received piece.
 *
 * @param {ReadableStream} body
 * @param {(chunk: string) => void} [onChunk]
 * @returns {Promise<string>}
 */
async function readStream(body, onChunk) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete last line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return fullContent;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          if (onChunk) onChunk(delta);
        }
      } catch {
        // Skip malformed SSE lines
      }
    }
  }

  return fullContent;
}

// ─── Readmefy backend proxy ───────────────────────────────────────────────────

/**
 * Calls the Readmefy.xyz backend proxy endpoint.
 * This allows users without an OpenRouter key to still use the tool.
 *
 * @param {object} payload - Project data to send
 * @returns {Promise<string>} Generated README content
 */
async function callReadmefyBackend(payload) {
  const res = await fetchWithTimeout(READMEFY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'readmefy-cli/1.0.0',
    },
    body: JSON.stringify(payload),
  }, 90_000);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Readmefy backend error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.readme) throw new Error('Readmefy backend returned empty response');
  return data.readme;
}

// ─── Main generation function ─────────────────────────────────────────────────

/**
 * Generates a README using the best available method.
 *
 * Priority:
 *   1. Readmefy backend (if reachable) — no key needed
 *   2. Direct OpenRouter API (requires OPENROUTER_API_KEY)
 *
 * @param {object} opts
 * @param {import('./analyzer.js').ProjectInfo} opts.info
 * @param {string[]} opts.sections
 * @param {'professional'|'friendly'|'minimal'} opts.tone
 * @param {'generate'|'improve'|'regenerate'} opts.mode
 * @param {string} [opts.extraContext]
 * @param {string} [opts.apiKey] - OpenRouter API key (overrides env)
 * @param {(chunk: string) => void} [opts.onChunk] - Stream callback
 * @returns {Promise<{ readme: string, source: 'backend' | 'openrouter' }>}
 */
export async function generateReadme({ info, sections, tone, mode, extraContext = '', apiKey, onChunk }) {
  const { systemPrompt, userPrompt } = buildPrompt({
    info,
    sections,
    tone,
    mode,
    extraContext,
    existingReadme: mode === 'improve' ? info.existingReadme : '',
  });

  // ── 1. Try Readmefy backend ────────────────────────────────────────────────
  try {
    const payload = {
      projectName: info.name,
      description: info.description,
      stack: [...info.detectedFrameworks, ...info.detectedStyling],
      language: info.language,
      packageManager: info.packageManager,
      scripts: info.scripts,
      dependencies: info.dependencies.slice(0, 20),
      sections,
      tone,
      mode,
      extraContext,
      existingReadme: mode === 'improve' ? (info.existingReadme || '') : '',
    };

    const readme = await callReadmefyBackend(payload);
    return { readme, source: 'backend' };
  } catch {
    // Backend unavailable or failed — fall through to direct API
  }

  // ── 2. Direct OpenRouter call ─────────────────────────────────────────────
  const resolvedKey = apiKey || process.env.OPENROUTER_API_KEY;

  if (!resolvedKey) {
    throw new ApiKeyMissingError(
      'No API key found.\n' +
      '  Set OPENROUTER_API_KEY in your environment, or create a .env file:\n\n' +
      '    OPENROUTER_API_KEY=sk-or-...\n\n' +
      '  Get a free key at: https://openrouter.ai'
    );
  }

  const readme = await callOpenRouter(systemPrompt, userPrompt, resolvedKey, { onChunk });
  return { readme, source: 'openrouter' };
}

// ─── Custom error types ───────────────────────────────────────────────────────

export class ApiKeyMissingError extends Error {
  constructor(msg) { super(msg); this.name = 'ApiKeyMissingError'; }
}

export class AuthError extends Error {
  constructor(msg) { super(msg); this.name = 'AuthError'; }
}

export class RateLimitError extends Error {
  constructor(msg) { super(msg); this.name = 'RateLimitError'; }
}
