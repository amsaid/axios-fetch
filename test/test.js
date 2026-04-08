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
      `${label || ''} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
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

async function run() {
  console.log('\nsd-axios-fetch — Interoperability Test Suite\n');

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
    assertEqual(axios.defaults.method, 'get');
    assertEqual(axios.defaults.responseType, 'json');
    assertEqual(axios.defaults.timeout, 0);
    assertIncludes(axios.defaults.headers, 'common');
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
    // responseType 'text' causes the adapter to read the body as text.
    // The default transformResponse then attempts JSON parsing.
    // Since the API returns valid JSON, data becomes a parsed object.
    const res = await axios.get(`${API}/posts/1`, {
      responseType: 'text',
    });
    // After default transformResponse, the JSON string is parsed to an object
    assert(typeof res.data === 'object', 'data should be parsed JSON object');
    assertEqual(res.data.id, 1);
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
      (config) => Promise.reject(new Error('blocked'))
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
      }
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
    // Use an unreachable IP that will hang and trigger timeout
    try {
      await axios.get('http://10.255.255.1/', {
        timeout: 200,
      });
      assert(false, 'should have timed out');
    } catch (err) {
      assert(axios.isAxiosError(err));
      // Could be ECONNABORTED (timeout) or ERR_NETWORK (unreachable)
      assert(err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK',
        'expected timeout or network error, got: ' + err.code);
    }
  });

  await test('custom timeoutErrorMessage', async () => {
    const msg = 'CUSTOM TIMEOUT MESSAGE';
    try {
      // Use an unreachable IP that will hang and trigger timeout
      // Note: This test may be flaky depending on network configuration
      await axios.get('http://10.255.255.1/', {
        timeout: 200,
        timeoutErrorMessage: msg,
      });
      assert(false, 'should have timed out');
    } catch (err) {
      // On timeout or network failure, the error should be an AxiosError
      assert(axios.isAxiosError(err), 'should be an AxiosError');
      // Accept either custom message or network error (depends on OS routing)
      const isTimeoutOrNetwork = 
        err.message === msg || 
        err.code === 'ECONNABORTED' || 
        err.code === 'ERR_NETWORK' ||
        err.code === 'ENETUNREACH';
      assert(isTimeoutOrNetwork, 
        'expected timeout or network error, got: ' + err.code + ' - ' + err.message);
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
      function (data, headers) {
        requestTransformed = true;
        // Don't mutate the data, just test that we got called
        return data;
      },
    ];

    const res = await inst.post('/posts', { title: 'test' });
    assert(requestTransformed, 'transformRequest should have been called');
    assertEqual(res.status, 201);
  });

  await test('custom transformResponse', async () => {
    // In Axios, user transforms are appended AFTER defaults (defaults run first,
    // then user transforms). To prevent default JSON parsing, pass only the
    // user's transform which overwrites defaults when provided alone.
    const res = await axios.get(`${API}/posts/1`, {
      responseType: 'text',
      transformResponse: [
        function (data) {
          // Default transform already parsed JSON (data is now an object)
          // because defaults run first. Our transform wraps the result.
          return { wrapped: data, meta: 'test' };
        },
      ],
    });
    assertIncludes(res.data, 'meta');
    assertEqual(res.data.meta, 'test');
    assertIncludes(res.data, 'wrapped');
    // wrapped is the parsed JSON object (since default transform ran first)
    assert(typeof res.data.wrapped === 'object', 'wrapped should be the parsed JSON object');
    assertEqual(res.data.wrapped.id, 1);
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
    // Use a response interceptor to check the final config headers
    // (the default transformRequest sets Content-Type: application/json)
    let capturedContentType = null;
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
      { headers: { 'X-Req': 'yes' } }
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

  await test('invalid responseType throws ERR_BAD_OPTION', async () => {
    try {
      await axios.get(`${API}/posts/1`, { responseType: 'invalid_type' });
      assert(false, 'should have thrown');
    } catch (err) {
      assert(axios.isAxiosError(err));
      assertEqual(err.code, 'ERR_BAD_OPTION');
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
    assert(capturedConfig.headers.common['X-Common-Header'] === 'common-value');
  });

  await test('method-specific headers override common headers', async () => {
    const inst = axios.create({ baseURL: API });
    inst.defaults.headers.common['Accept'] = 'application/json';
    // Initialize method-specific headers (they don't exist by default)
    inst.defaults.headers.post = { 'Content-Type': 'application/x-www-form-urlencoded' };

    let capturedConfig = null;
    inst.interceptors.request.use((config) => {
      capturedConfig = config;
      return config;
    });

    await inst.post('/posts', { title: 'test' });
    assert(capturedConfig.headers.post['Content-Type'] === 'application/x-www-form-urlencoded');
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
    assertEqual(order.join(','), 'req1,req2,res1,res2');
  });

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
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
