const GEMINI_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

function geminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

type GeminiRawResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

async function doGeminiRequest(
  apiKey: string,
  url: string,
  body: unknown,
): Promise<{ status: number; json: GeminiRawResponse; raw: string }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let json: GeminiRawResponse = {};
  try {
    json = JSON.parse(raw) as GeminiRawResponse;
  } catch {
    // leave json as {} — caller checks candidates length
  }

  return { status: response.status, json, raw };
}

/**
 * Calls Gemini, retrying with the next model in GEMINI_MODELS on 429
 * (rate limited) or 503 (overloaded), matching Go's callGemini fallback.
 * Returns the extracted text of the first candidate/part and which model
 * produced it.
 */
export async function callGemini(
  apiKey: string,
  body: unknown,
): Promise<{ text: string; model: string }> {
  let lastError: Error | undefined;

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    const { status, json, raw } = await doGeminiRequest(apiKey, geminiUrl(model), body);

    if (status === 429 || status === 503) {
      const reason = status === 503 ? 'overloaded' : 'rate limited';
      lastError = new Error(`model ${model} ${reason}: ${raw.slice(0, 200)}`);
      if (i < GEMINI_MODELS.length - 1) continue;
      throw new Error(`semua model Gemini sedang sibuk: ${lastError.message}`);
    }

    if (status !== 200) {
      throw new Error(`gemini status ${status}: ${raw.slice(0, 200)}`);
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('respons kosong dari Gemini');
    }

    return { text, model };
  }

  throw new Error(`semua model Gemini sedang sibuk: ${lastError?.message ?? 'unknown'}`);
}
