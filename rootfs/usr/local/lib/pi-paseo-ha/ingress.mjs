// HA supplies this header after authenticating the browser. Never interpolate
// an arbitrary forwarded path into compiled JavaScript or pairing links.
export function ingressPrefix(value) {
  return typeof value === 'string' && /^\/api\/hassio_ingress\/[A-Za-z0-9_-]{16,128}$/.test(value) ? value : '';
}

export function pairUrl(value, prefix = '') {
  if (typeof value !== 'string' || !/^\/paseo-web\/#\S+$/.test(value) || /[\\\x00-\x20\x7f]/.test(value)) {
    throw Object.assign(new Error('Invalid pairing URL'), { code: 'PAIRING_ORIGIN_INVALID' });
  }
  return ingressPrefix(prefix) + value;
}

// Expo Router embeds the base URL in its routing and dynamic chunk loader,
// as well as HTML asset paths. Rewrite all three at the same boundary. Never
// persist the per-session Ingress path in the shared release on disk.
export async function ingressResponse(response, prefix, method = 'GET') {
  const headers = new Headers(response.headers);
  headers.set('Vary', 'Accept-Encoding, X-Ingress-Path');
  headers.set('Cache-Control', 'private, no-store');
  prefix = ingressPrefix(prefix);
  if (prefix && /text\/html|javascript|text\/css|application\/json/.test(headers.get('content-type') || '')) {
    if (headers.has('content-encoding')) throw new Error('Expected uncompressed client');
    const body = (await response.text()).replaceAll('/paseo-web', prefix + '/paseo-web');
    headers.delete('content-length'); headers.delete('etag');
    return new Response(method === 'HEAD' ? null : body, { status: response.status, headers });
  }
  return new Response(method === 'HEAD' ? null : response.body, { status: response.status, headers });
}
