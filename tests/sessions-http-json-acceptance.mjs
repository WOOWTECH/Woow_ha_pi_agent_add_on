// Real HTTP acceptance for the sessions JSON response path. Uses only owned,
// synthetic session files and removes its one private fixture directory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export async function verifySessionsHttpJson({ baseUrl, agentDir, piWebRoot, minimumSessions = 24 }) {
  const sessionsRoot = path.resolve(agentDir, 'sessions');
  fs.mkdirSync(sessionsRoot, { recursive: true, mode: 0o700 });
  const fixtureDir = fs.mkdtempSync(path.join(sessionsRoot, 'rc6-http-json-gzip-'));
  try {
    assert.equal(path.dirname(fs.realpathSync(fixtureDir)), fs.realpathSync(sessionsRoot), 'fixture stays directly in the owned sessions tree');
    const sessionManagerModule = path.join(piWebRoot, 'node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.js');
    const { SessionManager } = await import(pathToFileURL(sessionManagerModule).href);
    const token = randomUUID();
    const expectedIds = new Set();
    for (let index = 0; index < minimumSessions; index += 1) {
      const id = `http-gzip-${token}-${index}`;
      const session = SessionManager.create(agentDir, fixtureDir, { id });
      session.appendSessionInfo(`Synthetic compression acceptance session ${index} ${'n'.repeat(96)}`);
      session.appendMessage({ role: 'user', content: [{ type: 'text', text: `Synthetic HTTP response payload ${index} ${'x'.repeat(192)}` }] });
      expectedIds.add(id);
    }

    const target = new URL('/api/sessions?force=1', baseUrl);
    const response = await new Promise((resolve, reject) => {
      const request = http.request(target, { method: 'GET', headers: { accept: 'application/json', 'accept-encoding': 'gzip' }, timeout: 15000 }, result => {
        const chunks = [];
        result.on('data', chunk => chunks.push(chunk));
        result.on('end', () => resolve({ status: result.statusCode, headers: result.headers, body: Buffer.concat(chunks) }));
      });
      request.on('error', reject).on('timeout', () => request.destroy(new Error('sessions endpoint timed out'))).end();
    });
    assert.equal(response.status, 200, 'the live HTTP sessions endpoint responds');
    assert.match(response.headers['content-type'] ?? '', /^application\/json\b/i);
    const encodings = String(response.headers['content-encoding'] ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    assert.deepEqual(encodings, ['gzip'], 'the oversized JSON response has exactly one gzip encoding');
    const decoded = gunzipSync(response.body);
    assert.ok(decoded.byteLength > 8192, 'synthetic session list is large enough to cross the compression threshold');
    const payload = JSON.parse(decoded.toString('utf8'));
    assert.ok(Array.isArray(payload.sessions), 'the response is decoded JSON, not a gzip byte stream labelled as JSON');
    const returnedIds = new Set(payload.sessions.map(session => session.id));
    for (const id of expectedIds) assert.ok(returnedIds.has(id), `HTTP response includes synthetic session ${id}`);
    return { status: response.status, encoding: encodings[0], sessions: expectedIds.size,
      decodedBytes: decoded.byteLength, returnedSyntheticSessions: expectedIds.size };
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
}
