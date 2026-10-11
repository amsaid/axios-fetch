/**
 * Comprehensive test suite for sd-axios-fetch.
 *
 * Demonstrates full interoperability with Axios API by testing:
 *   1. Basic HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
 *   2. Response shape (data, status, statusText, headers, config, request)
 *   3. Request config (baseURL, headers, params, timeout, responseType, auth, withCredentials)
 *   4. Instance creation (axios.create)
 *   5. Interceptors (request & response)
 *   6. Error handling (AxiosError, isAxiosError, isCancel)
 *   7. CancelToken (imperative cancellation)
 *   8. AbortController (signal-based cancellation)
 *   9. Timeout handling
 *   10. TransformRequest / TransformResponse
 *   11. axios.all / axios.spread
 *   12. axios.toFormData / axios.formToJSON
 *   13. Config merging / defaults
 *   14. getUri
 *   15. Concurrent requests
 *
 * Run:  node test/test.js
 */
'use strict';

const path = require('path');
const http = require('http');
const axios = require(path.resolve(__dirname, '..', 'dist', 'sd-axios-fetch.js'));

// ── Minimal test harness ──────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓  ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log(`  ✗  ${name}`);
    console.log(`     ${err.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error('Assertion failed: ' + (msg || 'expected truthy'));
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label || ''} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertIncludes(obj, key, label) {
  if (!(key in obj)) {
    throw new Error(`${label || 'object'} missing key "${key}". Keys: ${Object.keys(obj).join(', ')}`);
  }
}

// ── Test runner ───────────────────────────────────────────────────

const API = 'https://jsonplaceholder.typicode.com';

// ── Local test server (deterministic, offline-capable) ─────────────
// Used for timeout / progress / maxContentLength / headers tests so the
// suite does not depend on network timing.
const local = { server: null, base: '', requests: [] };

function startLocalServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        const u = new URL(req.url, 'http://localhost');
        const p = u.pathname;
        local.requests.push({ url: req.url, method: req.method, headers: req.headers, body });

        if (p === '/json') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: 7, ok: true }));
        } else if (p === '/text') {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('plain text');
        } else if (p === '/badjson') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{not json');
        } else if (p === '/echo') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'X-Echo': 'yes' });
          res.end(JSON.stringify({
            method: req.method,
            contentType: req.headers['content-type'] || null,
            authorization: req.headers.authorization || null,
            accept: req.headers.accept || null,
            intercept: req.headers['x-intercept'] || null,
            body,
          }));
        } else if (p === '/binary') {
          const buf = Buffer.from([1, 2, 3, 4, 5, 250]);
          res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': buf.length });
          res.end(buf);
        } else if (p === '/setcookie') {
          res.writeHead(200, { 'Set-Cookie': ['a=1', 'b=2'], 'Content-Type': 'application/json' });
          res.end('{"c":1}');
        } else if (p === '/big') {
          const buf = Buffer.alloc(64 * 1024, 65);
          res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': buf.length });
          res.end(buf);
        } else if (p === '/slow') {
          setTimeout(() => {
            if (res.writableEnded) return;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"slow":true}');
          }, 300);
        } else if (p.startsWith('/status/')) {
          res.writeHead(Number(p.split('/')[2]), { 'Content-Type': 'application/json' });
          res.end('{"status":true}');
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end('{"nf":true}');
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      local.server = server;
      local.base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
}

async function run() {
  console.log('\nsd-axios-fetch — Interoperability Test Suite\n');

  await startLocalServer();

  // ═══════════════════════════════════════════════════════════════
  // 1. API surface & statics
  // ═══════════════════════════════════════════════════════════════
  console.log('── API Surface & Statics ────────────────────────');

  await test('axios is a function', () => {
    assert(typeof axios === 'function', 'axios should be callable');
  });

  await test('axios has method shorthands', () => {
    ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].forEach((m) => {
      assert(typeof axios[m] === 'function', `axios.${m} should be a function`);
    });
  });

  await test('axios has interceptors', () => {
    assertIncludes(axios, 'interceptors');
    assertIncludes(axios.interceptors, 'request');
    assertIncludes(axios.interceptors, 'response');
    assert(typeof axios.interceptors.request.use === 'function');
    assert(typeof axios.interceptors.response.use === 'function');
  });

  await test('axios has static helpers', () => {
    assert(typeof axios.isCancel === 'function');
    assert(typeof axios.isAxiosError === 'function');
    assert(typeof axios.all === 'function');
    assert(typeof axios.spread === 'function');
    assert(typeof axios.create === 'function');
    assert(typeof axios.toFormData === 'function');
    assert(typeof axios.formToJSON === 'function');
    assert(typeof axios.CancelToken === 'function');
    assert(typeof axios.CanceledError !== 'undefined');
    assert(typeof axios.AxiosError !== 'undefined');
    assert(typeof axios.mergeConfig === 'function');
  });

  await test('axios has defaults', () => {
    assertIncludes(axios, 'defaults');
    assertEqual(axios.defaults.method, undefined, 'defaults.method (resolved per-request)');
    assertEqual(axios.defaults.responseType, 'json');
    assertEqual(axios.defaults.timeout, 0);
    assertIncludes(axios.defaults.headers, 'common');
    // Axios 1.x parity: per-method header buckets + transitional defaults
    ['get', 'post', 'put', 'patch', 'delete', 'head'].forEach((m) => {
      assertIncludes(axios.defaults.headers, m);
    });
    assertEqual(axios.defaults.transitional.silentJSONParsing, true);
    assertEqual(axios.defaults.transitional.forcedJSONParsing, true);
    assertEqual(axios.defaults.transitional.clarifyTimeoutError, false);
    assert(typeof axios.defaults.validateStatus === 'function');
    assert(Array.isArray(axios.defaults.transformRequest));
    assert(Array.isArray(axios.defaults.transformResponse));
  });

  await test('axios exposes axios 1.x statics', () => {
    assert(typeof axios.VERSION === 'string', 'VERSION');
    assert(typeof axios.AxiosHeaders === 'function', 'AxiosHeaders');
    assertEqual(axios.Cancel, axios.CanceledError, 'Cancel === CanceledError');
    assertEqual(typeof axios.request, 'function');
    assertEqual(typeof axios.postForm, 'function');
  });

  await test('AxiosError exposes code constants and isAxiosError marker', () => {
    assertEqual(axios.AxiosError.ERR_BAD_REQUEST, 'ERR_BAD_REQUEST');
    assertEqual(axios.AxiosError.ERR_BAD_OPTION_VALUE, 'ERR_BAD_OPTION_VALUE');
    assertEqual(axios.AxiosError.ERR_NETWORK, 'ERR_NETWORK');
    assertEqual(axios.AxiosError.ERR_CANCELED, 'ERR_CANCELED');
    assertEqual(axios.AxiosError.ETIMEDOUT, 'ETIMEDOUT');
    const err = new axios.AxiosError('x', 'ERR_NETWORK', {}, null, null);
    assertEqual(err.isAxiosError, true, 'prototype isAxiosError flag');
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. GET request
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── GET Requests ─────────────────────────────────');

  await test('simple GET returns correct response shape', async () => {
    const res = await axios.get(`${API}/posts/1`);
    assertIncludes(res, 'data');
    assertIncludes(res, 'status');
    assertIncludes(res, 'statusText');
    assertIncludes(res, 'headers');
    assertIncludes(res, 'config');
    assertEqual(res.status, 200);
    assertEqual(res.data.id, 1);
    assertEqual(res.data.userId, 1);
    assert(typeof res.data.title === 'string');
    assert(typeof res.data.body === 'string');
  });

  await test('GET with config object', async () => {
    const res = await axios({
      url: `${API}/posts/2`,
      method: 'get',
    });
    assertEqual(res.status, 200);
    assertEqual(res.data.id, 2);
  });

  await test('GET with params', async () => {
    const res = await axios.get(`${API}/posts`, {
      params: { userId: 1 },
    });
    assert(Array.isArray(res.data));
    assert(res.data.length > 0, 'should return posts');
    res.data.forEach((post) => assertEqual(post.userId, 1));
  });

  await test('GET with responseType text', async () => {
    // Axios parity: responseType 'text' disables the default JSON parse, so
    // `data` stays a raw string.
    const res = await axios.get(`${API}/posts/1`, {
      responseType: 'text',
    });
    assertEqual(typeof res.data, 'string', 'data should be a raw string');
    assertEqual(JSON.parse(res.data).id, 1);
  });

  await test('GET with responseType arraybuffer', async () => {
    const res = await axios.get(`${API}/posts/1`, {
      responseType: 'arraybuffer',
    });
    // ArrayBuffer or Uint8Array depending on runtime
    const isBuffer = res.data instanceof ArrayBuffer || (res.data && res.data.byteLength !== undefined);
    assert(isBuffer, 'data should be ArrayBuffer-like, got: ' + typeof res.data);
    assert(res.data.byteLength > 0, 'data should have content');
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. POST request
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── POST Requests ────────────────────────────────');

  await test('POST with JSON body', async () => {
    const payload = { title: 'foo', body: 'bar', userId: 1 };
    const res = await axios.post(`${API}/posts`, payload);
    assertEqual(res.status, 201);
    assertEqual(res.data.title, 'foo');
    assertEqual(res.data.body, 'bar');
    assertEqual(res.data.userId, 1);
    assert(typeof res.data.id === 'number');
  });

  await test('POST auto-serializes objects to JSON', async () => {
    const res = await axios.post(`${API}/posts`, {
      title: 'test',
      body: 'auto-serialize',
      userId: 1,
    });
    assertEqual(res.status, 201);
    assertEqual(res.data.title, 'test');
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. PUT / PATCH / DELETE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── PUT / PATCH / DELETE ────────────────────────');

  await test('PUT updates a resource', async () => {
    const res = await axios.put(`${API}/posts/1`, {
      id: 1,
      title: 'updated',
      body: 'updated body',
      userId: 1,
    });
    assertEqual(res.status, 200);
    assertEqual(res.data.title, 'updated');
    assertEqual(res.data.id, 1);
  });

  await test('PATCH partially updates a resource', async () => {
    const res = await axios.patch(`${API}/posts/1`, { title: 'patched' });
    assertEqual(res.status, 200);
    assertEqual(res.data.title, 'patched');
  });

  await test('DELETE returns 200', async () => {
    const res = await axios.delete(`${API}/posts/1`);
    assertEqual(res.status, 200);
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. HEAD / OPTIONS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── HEAD / OPTIONS ───────────────────────────────');

  await test('HEAD request succeeds', async () => {
    const res = await axios.head(`${API}/posts/1`);
    assertEqual(res.status, 200);
    // HEAD should not have a body
    assert(res.data === null || res.data === '' || res.data === undefined);
  });

  await test('OPTIONS request (CORS preflight)', async () => {
    const res = await axios.options(`${API}/posts/1`);
    assertEqual(res.status, 204);
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. Instance creation (axios.create)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Instance Creation ────────────────────────────');

  await test('create() returns callable with all methods', () => {
    const inst = axios.create({ baseURL: API });
    assert(typeof inst === 'function');
    ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].forEach((m) => {
      assert(typeof inst[m] === 'function', `inst.${m} should be a function`);
    });
    assertIncludes(inst, 'defaults');
    assertIncludes(inst, 'interceptors');
    assertEqual(inst.defaults.baseURL, API);
  });

  await test('instance GET uses baseURL', async () => {
    const inst = axios.create({ baseURL: API });
    const res = await inst.get('/posts/3');
    assertEqual(res.status, 200);
    assertEqual(res.data.id, 3);
  });

  await test('instance POST uses baseURL', async () => {
    const inst = axios.create({ baseURL: API });
    const res = await inst.post('/posts', { title: 'inst', body: 'test', userId: 2 });
    assertEqual(res.status, 201);
    assertEqual(res.data.title, 'inst');
  });

  await test('instance default headers apply', async () => {
    const inst = axios.create({
      baseURL: API,
      headers: { 'X-Custom-Header': 'test-value' },
    });
    // Verify it's in the defaults
    assertEqual(inst.defaults.headers['X-Custom-Header'], 'test-value');
  });

  await test('multiple instances are independent', async () => {
    const inst1 = axios.create({ baseURL: API, headers: { 'X-Instance': '1' } });
    const inst2 = axios.create({ baseURL: API, headers: { 'X-Instance': '2' } });
    assertEqual(inst1.defaults.headers['X-Instance'], '1');
    assertEqual(inst2.defaults.headers['X-Instance'], '2');

    const [r1, r2] = await Promise.all([
      inst1.get('/posts/1'),
      inst2.get('/posts/2'),
    ]);
    assertEqual(r1.data.id, 1);
    assertEqual(r2.data.id, 2);
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. Interceptors
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Interceptors ─────────────────────────────────');

  await test('request interceptor modifies config', async () => {
    let intercepted = false;
    const inst = axios.create({ baseURL: API });

    const id = inst.interceptors.request.use((config) => {
      intercepted = true;
      config.headers['X-Intercepted'] = 'yes';
      return config;
    });

    await inst.get('/posts/1');
    assert(intercepted, 'request interceptor should have fired');
    inst.interceptors.request.eject(id);
  });

  await test('response interceptor transforms data', async () => {
    const inst = axios.create({ baseURL: API });

    inst.interceptors.response.use((response) => {
      response.data._intercepted = true;
      return response;
    });

    const res = await inst.get('/posts/1');
    assertEqual(res.data._intercepted, true);
  });

  await test('interceptor rejection handles errors', async () => {
    const inst = axios.create({ baseURL: API });
    inst.interceptors.request.use(
      (_config) => Promise.reject(new Error('blocked')),
    );

    let caught = false;
    try {
      await inst.get('/posts/1');
    } catch (e) {
      caught = true;
      assertEqual(e.message, 'blocked');
    }
    assert(caught, 'should have caught rejected interceptor');
  });

  await test('eject removes interceptor', async () => {
    let count = 0;
    const inst = axios.create({ baseURL: API });

    const id = inst.interceptors.request.use((config) => {
      count++;
      return config;
    });

    await inst.get('/posts/1');
    assertEqual(count, 1);

    inst.interceptors.request.eject(id);
    await inst.get('/posts/1');
    // After eject, interceptor should NOT fire again
    assertEqual(count, 1);
  });

  await test('response error interceptor catches non-2xx', async () => {
    const inst = axios.create({ baseURL: API });

    let errorInterceptorFired = false;
    inst.interceptors.response.use(
      (res) => res,
      (err) => {
        errorInterceptorFired = true;
        return Promise.reject(err);
      },
    );

    try {
      await inst.get('/posts/99999');
    } catch (e) {
      // jsonplaceholder returns 404 for this
    }
    assert(errorInterceptorFired, 'error interceptor should have fired');
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. Error handling
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Error Handling ───────────────────────────────');

  await test('non-2xx status throws AxiosError', async () => {
    try {
      await axios.get(`${API}/posts/99999`);
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isAxiosError(err), 'should be an AxiosError');
      assertEqual(err.code, 'ERR_BAD_REQUEST');
      assertIncludes(err.response, 'status');
      assertIncludes(err.response, 'data');
      assertIncludes(err.response, 'headers');
      assertIncludes(err, 'config');
    }
  });

  await test('error has response attached for HTTP errors', async () => {
    try {
      await axios.get(`${API}/posts/99999`);
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isAxiosError(err));
      assert(err.response !== null, 'response should exist');
      assert(typeof err.response.status === 'number', 'status should be a number');
    }
  });

  await test('AxiosError.toJSON() returns plain object', async () => {
    try {
      await axios.get(`${API}/posts/99999`);
      assert(false);
    } catch (err) {
      const json = err.toJSON();
      assertEqual(json.name, 'AxiosError');
      assert(typeof json.message === 'string');
      assertIncludes(json, 'config');
      assertIncludes(json, 'code');
    }
  });

  await test('isAxiosError returns false for non-Axios errors', () => {
    assert(!axios.isAxiosError(new Error('plain')));
    assert(!axios.isAxiosError('string'));
    assert(!axios.isAxiosError(null));
    assert(!axios.isAxiosError(undefined));
    assert(!axios.isAxiosError(42));
  });

  await test('validateStatus custom handler prevents throwing', async () => {
    // Use a non-existent post which returns 404 from jsonplaceholder
    const res = await axios.get(`${API}/posts/99999`, {
      validateStatus: () => true,
    });
    assert(res.status >= 400, 'should have error status');
    assertIncludes(res, 'data');
    assertIncludes(res, 'headers');
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. CancelToken (imperative cancellation)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── CancelToken ──────────────────────────────────');

  await test('CancelToken.source() cancels request', async () => {
    const source = axios.CancelToken.source();
    let cancelled = false;

    // Cancel immediately before the request completes
    source.cancel('Operation cancelled by test');

    try {
      await axios.get(`${API}/posts/1`, {
        cancelToken: source.token,
      });
    } catch (err) {
      cancelled = true;
      assert(axios.isCancel(err), 'should be a cancel error');
      assertEqual(err.code, 'ERR_CANCELED');
    }
    assert(cancelled, 'request should have been cancelled');
  });

  await test('CancelToken throws if already requested', () => {
    const source = axios.CancelToken.source();
    source.cancel('reason');
    try {
      axios.CancelToken.throwIfRequested(source.token);
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isCancel(err));
    }
  });

  await test('new CancelToken(executor) works', () => {
    let cancelFn;
    const token = new axios.CancelToken(function (c) {
      cancelFn = c;
    });
    assert(typeof cancelFn === 'function');
    cancelFn('test cancel');
    assert(axios.isCancel(token.reason));
    assertEqual(token.reason.message, 'test cancel');
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. AbortController (signal-based cancellation)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── AbortController ─────────────────────────────');

  await test('AbortController signal cancels request', async () => {
    const controller = new AbortController();
    let cancelled = false;

    // Abort immediately
    controller.abort();

    try {
      await axios.get(`${API}/posts/1`, {
        signal: controller.signal,
      });
    } catch (err) {
      cancelled = true;
      assert(err.message.includes('abort') || err.code === 'ERR_CANCELED');
    }
    assert(cancelled, 'request should have been aborted');
  });

  // ═══════════════════════════════════════════════════════════════
  // 11. Timeout
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Timeout ──────────────────────────────────────');

  await test('timeout triggers ECONNABORTED error', async () => {
    try {
      await axios.get(`${local.base}/slow`, { timeout: 80 });
      assert(false, 'should have timed out');
    } catch (err) {
      assert(axios.isAxiosError(err));
      assertEqual(err.code, 'ECONNABORTED');
      assertEqual(err.message, 'timeout of 80ms exceeded');
    }
  });

  await test('custom timeoutErrorMessage', async () => {
    const msg = 'CUSTOM TIMEOUT MESSAGE';
    try {
      await axios.get(`${local.base}/slow`, { timeout: 80, timeoutErrorMessage: msg });
      assert(false, 'should have timed out');
    } catch (err) {
      assert(axios.isAxiosError(err), 'should be an AxiosError');
      assertEqual(err.code, 'ECONNABORTED');
      assertEqual(err.message, msg);
    }
  });

  await test('transitional.clarifyTimeoutError switches to ETIMEDOUT', async () => {
    try {
      await axios.get(`${local.base}/slow`, {
        timeout: 80,
        transitional: { clarifyTimeoutError: true },
      });
      assert(false, 'should have timed out');
    } catch (err) {
      assertEqual(err.code, 'ETIMEDOUT');
    }
  });

  await test('timeout still works when a signal is supplied', async () => {
    // Regression: previously a provided `signal` silently disabled `timeout`.
    const controller = new AbortController();
    try {
      await axios.get(`${local.base}/slow`, { timeout: 80, signal: controller.signal });
      assert(false, 'should have timed out');
    } catch (err) {
      assertEqual(err.code, 'ECONNABORTED');
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 12. TransformRequest / TransformResponse
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Transforms ───────────────────────────────────');

  await test('custom transformRequest', async () => {
    const inst = axios.create({ baseURL: API });
    let requestTransformed = false;

    inst.defaults.transformRequest = [
      function (data, _headers) {
        requestTransformed = true;
        // Don't mutate the data, just test that we got called
        return data;
      },
    ];

    const res = await inst.post('/posts', { title: 'test' });
    assert(requestTransformed, 'transformRequest should have been called');
    assertEqual(res.status, 201);
  });

  await test('custom transformResponse receives the raw body (replaces defaults)', async () => {
    // Axios parity: a per-request transformResponse REPLACES the default chain,
    // so it receives the raw string body.
    const res = await axios.get(`${API}/posts/1`, {
      responseType: 'text',
      transformResponse: [
        function (data) {
          return { wrapped: data, meta: 'test' };
        },
      ],
    });
    assertIncludes(res.data, 'meta');
    assertEqual(res.data.meta, 'test');
    assertIncludes(res.data, 'wrapped');
    assertEqual(typeof res.data.wrapped, 'string', 'wrapped should be the raw string');
    assertEqual(JSON.parse(res.data.wrapped).id, 1);
  });

  await test('async transforms are supported', async () => {
    const res = await axios.post(`${local.base}/echo`,
      { title: 'async' },
      {
        transformRequest: [async (data) => JSON.stringify({ ...data, added: 1 })],
        transformResponse: [async (data) => ({ ...JSON.parse(data), async: true })],
      },
    );
    const sent = JSON.parse(res.data.body);
    assertEqual(sent.title, 'async');
    assertEqual(sent.added, 1);
    assertEqual(res.data.async, true);
  });

  // ═══════════════════════════════════════════════════════════════
  // 13. axios.all / axios.spread
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── all / spread ─────────────────────────────────');

  await test('all resolves all promises', async () => {
    const results = await axios.all([
      axios.get(`${API}/posts/1`),
      axios.get(`${API}/posts/2`),
    ]);
    assert(Array.isArray(results));
    assertEqual(results.length, 2);
    assertEqual(results[0].data.id, 1);
    assertEqual(results[1].data.id, 2);
  });

  await test('spread distributes array args', async () => {
    const sum = axios.spread(function (a, b) {
      return a + b;
    });
    assertEqual(sum([10, 20]), 30);
    assertEqual(sum([1, 2, 3]), 3); // spread only uses first 2
  });

  await test('spread with all', async () => {
    const fn = axios.spread(function (res1, res2) {
      return [res1.data.id, res2.data.id];
    });
    const [id1, id2] = await axios.all([
      axios.get(`${API}/posts/1`),
      axios.get(`${API}/posts/2`),
    ]).then(fn);
    assertEqual(id1, 1);
    assertEqual(id2, 2);
  });

  // ═══════════════════════════════════════════════════════════════
  // 14. Custom headers
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Custom Headers ──────────────────────────────');

  await test('custom request headers are sent', async () => {
    const res = await axios.get(`${API}/posts/1`, {
      headers: { 'Accept': 'application/json' },
    });
    assertEqual(res.status, 200);
  });

  await test('Content-Type is set automatically for POST JSON', async () => {
    // Check that the default transformRequest sets Content-Type: application/json
    // by verifying the request succeeded (which means the body was valid JSON)
    const res = await axios.post(`${API}/posts`, { title: 'test' });
    // Check that the default transformRequest would have set Content-Type
    // by verifying the request succeeded (which means the body was valid JSON)
    assertEqual(res.status, 201);
    assertEqual(res.data.title, 'test');
    // The auto-serialization worked (body was JSON-stringified)
    assert(typeof res.data.id === 'number', 'server should assign an id');
  });

  // ═══════════════════════════════════════════════════════════════
  // 15. Config merging
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Config Merging ──────────────────────────────');

  await test('mergeConfig combines two configs', () => {
    const c = axios.mergeConfig({ baseURL: 'a', timeout: 1000 }, { timeout: 5000 });
    assertEqual(c.baseURL, 'a');
    assertEqual(c.timeout, 5000);
  });

  await test('mergeConfig deep-merges headers', () => {
    const c = axios.mergeConfig(
      { headers: { common: { Accept: 'text/html' }, 'X-Base': 'true' } },
      { headers: { 'X-Req': 'yes' } },
    );
    assertEqual(c.headers['X-Base'], 'true');
    assertEqual(c.headers['X-Req'], 'yes');
  });

  // ═══════════════════════════════════════════════════════════════
  // 16. getUri
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── getUri ───────────────────────────────────────');

  await test('getUri returns the built URL', () => {
    const inst = axios.create({ baseURL: 'https://example.com/api' });
    const uri = inst.getUri({ url: '/users', params: { page: 2 } });
    assert(uri.includes('/api/users'));
    assert(uri.includes('page=2'));
  });

  // ═══════════════════════════════════════════════════════════════
  // 17. Response headers
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Response Headers ─────────────────────────────');

  await test('response headers are returned as an object', async () => {
    const res = await axios.get(`${API}/posts/1`);
    assert(typeof res.headers === 'object');
    assert(res.headers !== null);
    // jsonplaceholder always returns some headers
    assert(Object.keys(res.headers).length > 0);
  });

  // ═══════════════════════════════════════════════════════════════
  // 18. Promise-based API compatibility
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Promise API Compatibility ───────────────────');

  await test('supports .then/.catch', async () => {
    const data = await axios.get(`${API}/posts/1`)
      .then(res => res.data)
      .catch(() => null);
    assert(data !== null);
    assertEqual(data.id, 1);
  });

  await test('supports async/await', async () => {
    const res = await axios.get(`${API}/posts/1`);
    assertEqual(res.data.id, 1);
  });

  await test('supports Promise.all with axios requests', async () => {
    const [r1, r2, r3] = await Promise.all([
      axios.get(`${API}/posts/1`),
      axios.get(`${API}/posts/2`),
      axios.get(`${API}/posts/3`),
    ]);
    assertEqual(r1.data.id, 1);
    assertEqual(r2.data.id, 2);
    assertEqual(r3.data.id, 3);
  });

  await test('supports Promise.race', async () => {
    const res = await Promise.race([
      axios.get(`${API}/posts/1`),
      axios.get(`${API}/posts/2`),
    ]);
    // Either post 1 or post 2 should win the race
    assert([1, 2].includes(res.data.id), 'should be one of the requested posts, got id: ' + res.data.id);
  });

  // ═══════════════════════════════════════════════════════════════
  // 19. Callable interface (axios(config) / axios(url, config))
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Callable Interface ───────────────────────────');

  await test('axios(config) works', async () => {
    const res = await axios({ url: `${API}/posts/1` });
    assertEqual(res.data.id, 1);
  });

  await test('axios(url, config) works', async () => {
    const res = await axios(`${API}/posts/2`, { method: 'get' });
    assertEqual(res.data.id, 2);
  });

  // ═══════════════════════════════════════════════════════════════
  // 20. Advanced scenarios
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Advanced Scenarios ───────────────────────────');

  await test('concurrent POST + GET', async () => {
    const [postRes, getRes] = await Promise.all([
      axios.post(`${API}/posts`, { title: 'concurrent', body: 'test', userId: 1 }),
      axios.get(`${API}/posts/1`),
    ]);
    assertEqual(postRes.status, 201);
    assertEqual(getRes.status, 200);
  });

  await test('chained requests (sequential)', async () => {
    const posts = await axios.get(`${API}/posts?userId=1&_limit=3`);
    assertEqual(posts.data.length, 3);
    const userId = posts.data[0].userId;
    const user = await axios.get(`${API}/users/${userId}`);
    assertEqual(user.data.id, userId);
  });

  await test('instance with interceptors and custom defaults', async () => {
    const inst = axios.create({
      baseURL: API,
      timeout: 10000,
      headers: { 'X-App': 'sd-axios-fetch-test' },
    });

    let reqCount = 0;
    inst.interceptors.request.use((config) => {
      reqCount++;
      config.metadata = { startedAt: Date.now() };
      return config;
    });

    const res = await inst.get('/posts/1');
    assertEqual(res.status, 200);
    assertEqual(reqCount, 1);
    assertIncludes(res.config, 'url');
  });

  // ═══════════════════════════════════════════════════════════════
  // 20. Edge Cases & Security
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Edge Cases & Security ────────────────────────');

  await test('empty URL throws ERR_BAD_OPTION', async () => {
    try {
      await axios.get('');
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isAxiosError(err));
      assertEqual(err.code, 'ERR_BAD_OPTION');
    }
  });

  await test('invalid responseType throws ERR_BAD_OPTION_VALUE', async () => {
    try {
      await axios.get(`${API}/posts/1`, { responseType: 'invalid_type' });
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isAxiosError(err));
      assertEqual(err.code, 'ERR_BAD_OPTION_VALUE');
    }
  });

  await test('negative timeout throws ERR_BAD_OPTION', async () => {
    try {
      await axios.get(`${API}/posts/1`, { timeout: -1000 });
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isAxiosError(err));
      assertEqual(err.code, 'ERR_BAD_OPTION');
    }
  });

  await test('headers.common are applied to all requests', async () => {
    const inst = axios.create({ baseURL: API });
    inst.defaults.headers.common['X-Common-Header'] = 'common-value';

    let capturedConfig = null;
    inst.interceptors.request.use((config) => {
      capturedConfig = config;
      return config;
    });

    await inst.get('/posts/1');
    // Axios parity: headers are flattened into an AxiosHeaders instance.
    assert(capturedConfig.headers instanceof axios.AxiosHeaders);
    assertEqual(capturedConfig.headers['X-Common-Header'], 'common-value');
    assertEqual(capturedConfig.headers.get('x-common-header'), 'common-value');
  });

  await test('method-specific headers override common headers', async () => {
    const inst = axios.create({ baseURL: API });
    inst.defaults.headers.common['Accept'] = 'application/json';
    inst.defaults.headers.post = { 'Content-Type': 'application/x-www-form-urlencoded' };

    let capturedConfig = null;
    inst.interceptors.request.use((config) => {
      capturedConfig = config;
      return config;
    });

    await inst.post('/posts', { title: 'test' });
    assertEqual(capturedConfig.headers.get('Content-Type'), 'application/x-www-form-urlencoded');
    assertEqual(capturedConfig.headers.get('Accept'), 'application/json');
  });

  await test('response.config.headers reflects the sent headers', async () => {
    const res = await axios.get(`${local.base}/json`, { headers: { 'X-Test': 'yes' } });
    assertEqual(res.config.headers.get('X-Test'), 'yes');
  });

  await test('toFormData converts object to FormData', () => {
    const data = { name: 'John', age: 30, active: true };
    const fd = axios.toFormData(data);
    assert(fd instanceof FormData);
    assertEqual(fd.get('name'), 'John');
    assertEqual(fd.get('age'), '30');
    assertEqual(fd.get('active'), 'true');
  });

  await test('formToJSON converts FormData to object', () => {
    const fd = new FormData();
    fd.append('name', 'John');
    fd.append('tags', 'a');
    fd.append('tags', 'b');

    const obj = axios.formToJSON(fd);
    assertEqual(obj.name, 'John');
    assert(Array.isArray(obj.tags));
    assertEqual(obj.tags.length, 2);
  });

  await test('getUri builds URL with params', () => {
    const inst = axios.create({ baseURL: 'https://example.com/api' });
    const uri = inst.getUri({ url: '/users', params: { page: 2, limit: 10 } });
    assert(uri.includes('/api/users'));
    assert(uri.includes('page=2'));
    assert(uri.includes('limit=10'));
  });

  await test('response includes elapsed time', async () => {
    const res = await axios.get(`${API}/posts/1`);
    assert(typeof res._elapsed === 'number');
    assert(res._elapsed >= 0);
  });

  await test('instance defaults include transforms', () => {
    const inst = axios.create();
    assert(Array.isArray(inst.defaults.transformRequest));
    assert(Array.isArray(inst.defaults.transformResponse));
    assert(inst.defaults.transformRequest.length > 0);
    assert(inst.defaults.transformResponse.length > 0);
  });

  await test('multiple interceptors run in order', async () => {
    const inst = axios.create({ baseURL: API });
    const order = [];

    inst.interceptors.request.use((config) => {
      order.push('req1');
      return config;
    });

    inst.interceptors.request.use((config) => {
      order.push('req2');
      return config;
    });

    inst.interceptors.response.use((res) => {
      order.push('res1');
      return res;
    });

    inst.interceptors.response.use((res) => {
      order.push('res2');
      return res;
    });

    await inst.get('/posts/1');
    // Axios parity: request interceptors run LIFO, response interceptors FIFO.
    assertEqual(order.join(','), 'req2,req1,res1,res2');
  });

  await test('interceptors support synchronous + runWhen options', async () => {
    const inst = axios.create({ baseURL: API });
    const order = [];

    inst.interceptors.request.use((config) => {
      order.push('a');
      return config;
    }, null, { runWhen: () => false });          // skipped

    inst.interceptors.request.use((config) => {
      order.push('sync');
      return config;
    }, null, { synchronous: true });

    await inst.get('/posts/1');
    assertEqual(order.join(','), 'sync');
  });

  // ═══════════════════════════════════════════════════════════════
  // 21. axios 1.x parity features
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Axios 1.x Parity Features ────────────────────');

  await test('axios.request(config) works', async () => {
    const res = await axios.request({ url: `${local.base}/json`, method: 'get' });
    assertEqual(res.status, 200);
    assertEqual(res.data.id, 7);
  });

  await test('instance.request() and instance.create() work', async () => {
    const inst = axios.create({ baseURL: local.base });
    assertEqual(typeof inst.request, 'function');
    assertEqual(typeof inst.create, 'function');

    const res = await inst.request({ url: '/json' });
    assertEqual(res.data.id, 7);

    const nested = inst.create({ headers: { 'X-Nested': '1' } });
    const res2 = await nested.get('/json');
    assertEqual(res2.data.id, 7);
    assertEqual(nested.defaults.headers['X-Nested'], '1');
  });

  await test('absolute URLs ignore baseURL', async () => {
    const inst = axios.create({ baseURL: 'http://127.0.0.1:1' });
    const res = await inst.get(`${local.base}/json`);
    assertEqual(res.data.id, 7);
  });

  await test('AxiosHeaders get/has/delete/normalize/concat/toJSON', () => {
    const H = axios.AxiosHeaders;
    const h = new H({ 'Content-Type': 'application/json', 'X-A': '1' });
    assertEqual(h.get('content-type'), 'application/json');
    assertEqual(h.has('X-A'), true);
    assertEqual(h.has('X-Missing'), false);
    h.set('X-B', '2');
    assertEqual(h.get('x-b'), '2');
    assertEqual(h.delete('X-A'), true);
    assertEqual(h.has('X-A'), false);

    const joined = h.toJSON();
    assertEqual(joined['Content-Type'], 'application/json');

    const merged = H.concat(new H({ A: '1' }), { B: '2' }, new H({ C: '3' }));
    assertEqual(merged.get('a'), '1');
    assertEqual(merged.get('b'), '2');
    assertEqual(merged.get('c'), '3');

    const upper = new H({ 'x-lower': 'v' }).normalize(true);
    assertEqual(upper['X-Lower'], 'v');
  });

  await test('response.headers is an AxiosHeaders with case-insensitive get()', async () => {
    const res = await axios.get(`${local.base}/echo`);
    assert(res.headers instanceof axios.AxiosHeaders);
    assertEqual(res.headers.get('x-echo'), 'yes');
    assertEqual(res.headers['x-echo'], 'yes');
  });

  await test('repeated Set-Cookie headers are preserved as an array', async () => {
    const res = await axios.get(`${local.base}/setcookie`);
    assert(Array.isArray(res.headers['set-cookie']), 'set-cookie should be an array');
    assertEqual(res.headers['set-cookie'].length, 2);
  });

  await test('responseType: stream returns a ReadableStream', async () => {
    const res = await axios.get(`${local.base}/big`, { responseType: 'stream' });
    assert(typeof res.data.getReader === 'function', 'should be a web ReadableStream');
    const reader = res.data.getReader();
    const { value } = await reader.read();
    assert(value && value.length > 0, 'should read a chunk');
    await reader.cancel();
  });

  await test('arraybuffer and blob responseTypes work', async () => {
    const ab = await axios.get(`${local.base}/binary`, { responseType: 'arraybuffer' });
    assert(ab.data instanceof ArrayBuffer, 'arraybuffer should be an ArrayBuffer');
    assertEqual(ab.data.byteLength, 6);

    const bl = await axios.get(`${local.base}/binary`, { responseType: 'blob' });
    assert(bl.data instanceof Blob, 'blob should be a Blob');
    assertEqual(bl.data.size, 6);
  });

  await test('paramsSerializer object form ({ serialize, encode })', () => {
    const inst = axios.create({ baseURL: 'https://example.com' });
    const uri = inst.getUri({
      url: '/x',
      params: { a: 1, b: 2 },
      paramsSerializer: { serialize: (p) => new URLSearchParams(p).toString() },
    });
    assertEqual(uri, 'https://example.com/x?a=1&b=2');
  });

  await test('paramsSerializer encode option is honoured', () => {
    const inst = axios.create({ baseURL: 'https://example.com' });
    const uri = inst.getUri({
      url: '/x',
      params: { q: 'a b' },
      paramsSerializer: { encode: (v) => encodeURIComponent(v) },
    });
    assertEqual(uri, 'https://example.com/x?q=a%20b');
  });

  await test('nested params are serialized like axios', () => {
    const inst = axios.create({ baseURL: 'https://example.com' });
    const uri = inst.getUri({ url: '/x', params: { a: { b: 1 }, list: [1, 2] } });
    assert(uri.includes('a%5Bb%5D=1') || uri.includes('a[b]=1'), 'nested object key: ' + uri);
    assert(uri.includes('list[]=1') && uri.includes('list[]=2'), 'array params: ' + uri);
  });

  await test('maxContentLength is enforced', async () => {
    try {
      await axios.get(`${local.base}/big`, { maxContentLength: 1024 });
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isAxiosError(err));
      assertEqual(err.code, 'ERR_BAD_RESPONSE');
      assert(err.message.includes('maxContentLength'), err.message);
    }
  });

  await test('maxBodyLength is enforced', async () => {
    try {
      await axios.post(`${local.base}/echo`, { big: 'x'.repeat(5000) }, { maxBodyLength: 100 });
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isAxiosError(err));
      assertEqual(err.code, 'ERR_BAD_REQUEST');
      assert(err.message.includes('maxBodyLength'), err.message);
    }
  });

  await test('onDownloadProgress reports loaded/total/download', async () => {
    let last = null;
    await axios.get(`${local.base}/big`, {
      onDownloadProgress: (p) => { last = p; },
    });
    assert(last, 'progress should have fired');
    assertEqual(last.loaded, 64 * 1024);
    assertEqual(last.total, 64 * 1024);
    assertEqual(last.lengthComputable, true);
    assertEqual(last.download, true);
    assert(typeof last.bytes === 'number');
  });

  await test('onUploadProgress fires for JSON bodies', async () => {
    let last = null;
    const res = await axios.post(`${local.base}/echo`, { a: 'x'.repeat(20000) }, {
      onUploadProgress: (p) => { last = p; },
    });
    assert(last, 'upload progress should have fired');
    assertEqual(last.upload, true);
    assert(last.loaded > 0, 'loaded bytes should be reported');
    assertEqual(res.data.method, 'POST');
  });

  await test('onUploadProgress fires for FormData bodies', async () => {
    let last = null;
    const fd = new FormData();
    fd.append('file', new Blob(['x'.repeat(5000)]), 'f.txt');
    const res = await axios.post(`${local.base}/echo`, fd, {
      onUploadProgress: (p) => { last = p; },
    });
    assert(last, 'upload progress should have fired');
    assertEqual(last.upload, true);
    assert(res.data.contentType.indexOf('multipart/form-data') === 0,
      'Content-Type must be multipart with boundary, got: ' + res.data.contentType);
  });

  await test('onUploadProgress fires for Blob bodies', async () => {
    let last = null;
    const blob = new Blob([new Uint8Array(8000)]);
    await axios.post(`${local.base}/echo`, blob, {
      onUploadProgress: (p) => { last = p; },
    });
    assert(last, 'upload progress should have fired');
    assertEqual(last.upload, true);
    assertEqual(last.total, 8000);
    assertEqual(last.loaded, 8000);
  });

  await test('streaming request bodies are detected', () => {
    // Guards the onUploadProgress feature flag. The check must not depend
    // solely on the runtime reading the `duplex` option — runtimes such as Bun
    // ignore `duplex` yet still accept a stream body.
    const adapter = require(path.resolve(__dirname, '..', 'src', 'adapters', 'fetch.js'));
    assertEqual(adapter.supportsRequestStream, true, 'streaming request bodies');
    assertEqual(adapter.supportsResponseStream, true, 'streaming response bodies');
  });

  await test('FormData is sent as multipart/form-data', async () => {
    const fd = new FormData();
    fd.append('x', 'y');
    const res = await axios.post(`${local.base}/echo`, fd);
    assert(res.data.contentType.indexOf('multipart/form-data') === 0, res.data.contentType);
    assert(res.data.body.includes('name="x"'));
  });

  await test('postForm() sets multipart/form-data', async () => {
    const res = await axios.postForm(`${local.base}/echo`, { a: 'b' });
    assert(res.data.contentType.indexOf('multipart/form-data') === 0, res.data.contentType);
  });

  await test('transitional.silentJSONParsing=false throws on malformed JSON', async () => {
    try {
      await axios.get(`${local.base}/badjson`, {
        transitional: { silentJSONParsing: false, forcedJSONParsing: true },
      });
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isAxiosError(err));
      assertEqual(err.code, 'ERR_BAD_RESPONSE');
    }
  });

  await test('malformed JSON is silently ignored by default', async () => {
    const res = await axios.get(`${local.base}/badjson`);
    assertEqual(res.data, '{not json');
  });

  await test('basic auth produces an Authorization header', async () => {
    const res = await axios.get(`${local.base}/echo`, {
      auth: { username: 'user', password: 'pass' },
    });
    assertEqual(res.data.authorization, 'Basic ' + Buffer.from('user:pass').toString('base64'));
  });

  await test('mergeConfig does not inject DEFAULTS', () => {
    const c = axios.mergeConfig({ baseURL: 'x' }, { timeout: 5 });
    assertEqual(c.baseURL, 'x');
    assertEqual(c.timeout, 5);
    assertEqual(c.transformRequest, undefined, 'should not inject defaults');
    assertEqual(c.headers, undefined, 'should not inject defaults');
  });

  await test('mergeConfig replaces (not concatenates) transforms', () => {
    const a = () => {};
    const b = () => {};
    const c = axios.mergeConfig({ transformRequest: [a] }, { transformRequest: [b] });
    assertEqual(c.transformRequest.length, 1);
    assertEqual(c.transformRequest[0], b);
  });

  await test('CancelToken.toAbortSignal() bridges to AbortSignal', async () => {
    const source = axios.CancelToken.source();
    const signal = source.token.toAbortSignal();
    assertEqual(signal.aborted, false);
    source.cancel('stop');
    await new Promise((r) => setTimeout(r, 0));   // listeners fire on a microtask
    assertEqual(signal.aborted, true);
  });

  await test('CancelToken subscribe() returns an unsubscribe function', () => {
    const source = axios.CancelToken.source();
    let called = 0;
    const unsub = source.token.subscribe(() => { called++; });
    unsub();
    source.cancel('nope');
    assertEqual(called, 0);
  });

  await test('axios.Cancel === axios.CanceledError', () => {
    assertEqual(axios.Cancel, axios.CanceledError);
  });

  await test('formToJSON understands nested keys', () => {
    const fd = new FormData();
    fd.append('a[b]', '1');
    fd.append('list[]', 'x');
    fd.append('list[]', 'y');
    const obj = axios.formToJSON(fd);
    assertEqual(obj.a.b, '1');
    assert(Array.isArray(obj.list));
    assertEqual(obj.list.length, 2);
  });

  await test('toFormData renders nested keys and arrays', () => {
    const fd = axios.toFormData({ a: { b: 1 }, list: ['x', 'y'] });
    assertEqual(fd.get('a[b]'), '1');
    assertEqual(fd.getAll('list[]').join(','), 'x,y');
  });

  await test('HEAD returns an empty body', async () => {
    const res = await axios.head(`${local.base}/json`);
    assertEqual(res.status, 200);
    assert(res.data === '' || res.data === null || res.data === undefined);
  });

  await test('request interceptors can use AxiosHeaders API', async () => {
    const inst = axios.create({ baseURL: local.base });
    inst.interceptors.request.use((config) => {
      config.headers.set('X-Intercept', 'value');
      return config;
    });
    const res = await inst.get('/echo');
    assertEqual(res.data.intercept, 'value');
    assertEqual(res.data.accept, 'application/json, text/plain, */*');
  });

  // ═══════════════════════════════════════════════════════════════
  // 22. ESM bundle (regression guard)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── ESM Bundle ───────────────────────────────────');

  await test('ESM bundle exposes a single module instance', async () => {
    // Regression: the ESM bundle's __require must cache modules. Without a
    // cache each require() created a new copy of AxiosHeaders, so `instanceof`
    // failed across modules and requests threw "header name must be a
    // non-empty string".
    const esm = await import(path.resolve(__dirname, '..', 'dist', 'sd-axios-fetch.mjs'));
    const esmAxios = esm.default;

    assertEqual(typeof esmAxios, 'function');
    assertEqual(esmAxios.AxiosHeaders, esm.AxiosHeaders, 'named export must be the same class');
    assertEqual(esmAxios.VERSION, axios.VERSION);

    const inst = esmAxios.create({ baseURL: local.base });
    const res = await inst.get('/json');
    assertEqual(res.status, 200);
    assertEqual(res.data.id, 7);
    assert(res.headers instanceof esmAxios.AxiosHeaders);

    // GET with default headers (the exact failing case)
    const res2 = await inst.get('/echo');
    assertEqual(res2.data.method, 'GET');
    assertEqual(res2.data.accept, 'application/json, text/plain, */*');

    // POST with auth + custom headers
    const res3 = await inst.post('/echo', { name: 'Z' }, {
      headers: { Authorization: 'Bearer token' },
    });
    assertEqual(res3.data.method, 'POST');
    assertEqual(res3.data.authorization, 'Bearer token');
    assertEqual(res3.data.contentType, 'application/json');
  });

  // ═══════════════════════════════════════════════════════════════
  // 23. Regression fixes (0.1.3)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── Regression Fixes ─────────────────────────────');

  await test('Buffer uploads send only the buffer bytes', async () => {
    const buf = Buffer.from('hello world!');
    // Buffer.from() usually returns a window into the shared 8KB pool — the
    // regression sent `buf.buffer` (the whole pool) instead of the 12 bytes.
    assert(buf.buffer.byteLength > buf.length, 'expected a pooled buffer');
    const res = await axios.post(`${local.base}/echo`, buf);
    assertEqual(res.data.body, 'hello world!', 'server must receive exactly 12 bytes');
  });

  await test('ArrayBufferView uploads send only the view slice', async () => {
    const backing = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const view = backing.subarray(3, 6); // bytes [3,4,5]
    const res = await axios.post(`${local.base}/echo`, view);
    assertEqual(res.data.body.length, 3, 'only the 3-byte slice should be sent');
  });

  await test('URL credentials are converted to Basic auth', async () => {
    const port = local.server.address().port;
    const res = await axios.get(`http://user:pass@127.0.0.1:${port}/echo`);
    assertEqual(res.data.authorization, 'Basic ' + Buffer.from('user:pass').toString('base64'));
  });

  await test('numeric-string timeout is accepted', async () => {
    const res = await axios.get(`${local.base}/json`, { timeout: '5000' });
    assertEqual(res.status, 200);
    assertEqual(res.config.timeout, 5000);
  });

  await test('invalid Request construction gets an error code', async () => {
    // An invalid HTTP method cannot be turned into a Request.
    try {
      await axios.request({ url: `${local.base}/json`, method: 'BAD METHOD' });
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isAxiosError(err));
      assert(typeof err.code === 'string', 'error should carry a code');
    }
  });

  await test('isAxiosError works across the CJS and ESM copies', async () => {
    const esm = await import(path.resolve(__dirname, '..', 'dist', 'sd-axios-fetch.mjs'));
    try {
      await axios.get(`${local.base}/nope`);
      assert(false, 'should have thrown');
    } catch (err) {
      assert(esm.isAxiosError(err), 'ESM isAxiosError must recognise a CJS AxiosError');
      assert(esm.default.isAxiosError(err));
      assert(axios.isAxiosError(err));
    }
  });

  await test('HttpStatusCode constants are exposed', () => {
    assertEqual(axios.HttpStatusCode.Ok, 200);
    assertEqual(axios.HttpStatusCode.NotFound, 404);
    assertEqual(axios.HttpStatusCode.InternalServerError, 500);
    assertEqual(axios.HttpStatusCode[404], 'NotFound');
  });

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  local.server && local.server.close();

  console.log('\n' + '═'.repeat(52));
  console.log(`  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);
  console.log('═'.repeat(52));

  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach((f) => {
      console.log(`  • ${f.name}`);
      console.log(`    ${f.err.stack || f.err.message}`);
    });
    process.exit(1);
  } else {
    console.log('\n  All tests passed! ✓\n');
  }
}

run().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
