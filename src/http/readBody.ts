import { HttpRequestError } from './errors';

const MAX_BODY_BYTES = 64 * 1024;
const JSON_CONTENT_TYPE = /^application\/json(?:\s*;|$)/i;

export async function readJsonBody(request: Request): Promise<unknown | undefined> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_BODY_BYTES) {
    throw new HttpRequestError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
  }

  if (!request.body) return undefined;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new HttpRequestError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (length === 0) return undefined;

  const contentType = request.headers.get('content-type');
  if (!contentType || !JSON_CONTENT_TYPE.test(contentType)) {
    throw new HttpRequestError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json.',
    );
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new HttpRequestError(400, 'INVALID_JSON', 'Request body is not valid JSON.');
  }
}
