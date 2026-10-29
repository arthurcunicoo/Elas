// Bounded requests to documented public Overpass instances. No client-supplied URLs.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const MAX_BYTES = 8 * 1024 * 1024;
class UpstreamError extends Error {
  constructor(code, retryable, status = null) {
    super(code); this.name = 'UpstreamError'; this.retryable = retryable; this.status = status;
  }
}
export async function readBoundedJson(response, limit = MAX_BYTES) {
  if (Number(response.headers.get('content-length') || 0) > limit) {
    await response.body?.cancel(); throw new UpstreamError('response_too_large', false);
  }
  if (!response.body) throw new UpstreamError('empty_response', true);
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0, body = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) throw new UpstreamError('response_too_large', false);
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  try { return JSON.parse(body); }
  catch { throw new UpstreamError('invalid_json', false); }
}
export async function fetchOsmPayload(query, transport = fetch, { pause = ms => new Promise(resolve => setTimeout(resolve, ms)), random = Math.random } = {}) {
  for (let i = 0; i < ENDPOINTS.length; i++) {
    const endpoint = ENDPOINTS[i];
    try {
      const response = await transport(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Accept: 'application/json',
          'User-Agent': 'ELAS-na-Cidade/1.1' },
        // The documented browser/API form uses one encoded data field.
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        // Do not move a 406/429 request to another instance to evade its quota.
        throw new UpstreamError('http_error', response.status === 408 || response.status >= 500, response.status);
      }
      const payload = await readBoundedJson(response);
      if (!payload || !Array.isArray(payload.elements) || payload.remark)
        throw new UpstreamError('incomplete_response', false);
      return { payload, endpoint };
    } catch (error) {
      const retryable = error instanceof UpstreamError ? error.retryable : true;
      console.warn(JSON.stringify({ event: 'overpass_request_failed', endpoint,
        code: error instanceof UpstreamError ? error.message : 'network_or_timeout',
        status: error instanceof UpstreamError ? error.status : null,
        failureName: error instanceof Error ? error.name : 'unknown' }));
      if (!retryable || i === ENDPOINTS.length - 1) throw error;
      await pause(500 * 2 ** i + Math.floor(random() * 250));
    }
  }
  throw new UpstreamError('unavailable', false);
}
