import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface AiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * POSTs JSON to the AI service. Never throws: callers decide whether to fall
 * back (ML features) or surface the error (LLM features).
 */
export async function callAiService<T>(path: string, payload: unknown, timeoutMs = 8_000): Promise<AiResult<T>> {
  try {
    const response = await fetch(`${env.aiServiceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.aiServiceApiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = (await response.json().catch(() => undefined)) as
      | (T & { error?: { message?: string } })
      | undefined;
    if (!response.ok) {
      logger.warn('AI service returned an error', { path, status: response.status });
      return { ok: false, status: response.status, error: body?.error?.message };
    }
    return { ok: true, status: response.status, data: body as T };
  } catch (error) {
    logger.warn('AI service unreachable', { path, error: (error as Error).message });
    return { ok: false, status: 502 };
  }
}
