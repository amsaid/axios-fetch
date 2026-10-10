# sd-axios-fetch

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/amsaid/axios-fetch)

A zero-dependency, drop-in replacement for **[Axios](https://github.com/axios/axios)** built entirely on the native **Fetch API**. Swap the import and go — no code changes needed.

- **~96 KB** single-file bundle (UMD + ESM, unminified)
- **Zero dependencies** — uses only native `fetch`, `AbortController`, `Request`, `Headers`, `ReadableStream`
- **Axios 1.x API compatible** — `request`, `get`, `post`, `put`, `patch`, `delete`, `head`, `options`, `postForm`/`putForm`/`patchForm`, `create`, interceptors, `AxiosHeaders`, `CancelToken`, `AbortController`, `all`/`spread`, transforms, timeout, progress, `mergeConfig`, `toFormData`/`formToJSON`
- **107 passing interoperability tests**
- **Real-time progress tracking** — upload and download progress via `ReadableStream`
- **TypeScript types** included (`dist/sd-axios-fetch.d.ts`, strict-mode clean)

---

## Install

```bash
npm install sd-axios-fetch
```

Or drop the bundle into a `<script>` tag:

```html
<script src="dist/sd-axios-fetch.js"></script>
<script>
  axios.get('/api/users').then(res => console.log(res.data));
</script>
```

---

## Quick Start — Drop-In Replacement

```js
// Before:
import axios from 'axios';

// After (literally just change the import):
import axios from 'sd-axios-fetch';

// Everything else stays exactly the same:
const { data } = await axios.get('/api/users');

await axios.post('/api/users', { name: 'Z' }, {
  headers: { Authorization: 'Bearer token' },
});

const instance = axios.create({ baseURL: 'https://api.example.com' });
instance.get('/users');
```

---

## API Reference

### Core Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `axios(config)` | `AxiosPromise` | Request with full config object |
| `axios(url, config?)` | `AxiosPromise` | Shorthand: URL + optional config |
| `axios.request(config)` | `AxiosPromise` | Generic request method |
| `axios.get(url, config?)` | `AxiosPromise` | GET request |
| `axios.post(url, data?, config?)` | `AxiosPromise` | POST request |
| `axios.put(url, data?, config?)` | `AxiosPromise` | PUT request |
| `axios.patch(url, data?, config?)` | `AxiosPromise` | PATCH request |
| `axios.delete(url, config?)` | `AxiosPromise` | DELETE request |
| `axios.head(url, config?)` | `AxiosPromise` | HEAD request |
| `axios.options(url, config?)` | `AxiosPromise` | OPTIONS request |
| `axios.postForm(url, data?, config?)` | `AxiosPromise` | POST as `multipart/form-data` |
| `axios.putForm / axios.patchForm` | `AxiosPromise` | Multipart PUT / PATCH |

### Instance Creation

```js
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { 'X-App': 'my-app' },
});

api.get('/users');          // → https://api.example.com/users
api.request({ url: '/x' }); // request() is available on instances too
const child = api.create({ timeout: 1000 });
```

Instances carry `defaults`, `interceptors`, `getUri`, `create` and every method alias — just like Axios.

### Interceptors

```js
axios.interceptors.request.use((config) => {
  // Axios 1.x style: config.headers is an AxiosHeaders instance
  config.headers.set('Authorization', `Bearer ${token}`);
  return config;
}, (error) => Promise.reject(error));

axios.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) redirectToLogin();
    return Promise.reject(error);
  }
);

// Eject / clear
const id = axios.interceptors.request.use(fn);
axios.interceptors.request.eject(id);
axios.interceptors.request.clear();

// Axios 1.x options
axios.interceptors.request.use(fn, null, { synchronous: true, runWhen: (cfg) => !!cfg.token });
```

> **Order (Axios parity):** request interceptors run in **reverse** registration order (LIFO); response interceptors run in registration order (FIFO).

### Headers — `AxiosHeaders`

```js
const { data } = await axios.get('/api/users', {
  headers: { 'X-Token': 'abc' },
});

// Response headers are an AxiosHeaders instance
res.headers.get('content-type');       // case-insensitive
res.headers['content-type'];           // direct access
res.headers.has('cache-control');
res.headers.get('Cache-Control', true); // parsed token map

const h = new axios.AxiosHeaders({ Accept: 'application/json' });
h.set('X-A', '1').set('X-B', '2');
h.delete('X-A');
h.concat(otherHeaders);
h.normalize(true);                     // → Content-Type: ...
h.toJSON();
```

`response.config.headers` contains the headers that were actually sent (as an `AxiosHeaders` instance) — auth/XSRF-injected headers are excluded, matching Axios.

### Error Handling

```js
axios.get('/api/not-found')
  .catch((err) => {
    console.log(err.isAxiosError);       // true
    console.log(err.response.status);    // 404
    console.log(err.response.data);      // response body
    console.log(err.code);               // 'ERR_BAD_REQUEST'
    console.log(err.status);             // 404
    console.log(err.toJSON());

    // Error code constants
    if (err.code === axios.AxiosError.ERR_BAD_REQUEST) { /* ... */ }
  });
```

Error codes: `ERR_BAD_OPTION`, `ERR_BAD_OPTION_VALUE`, `ERR_BAD_REQUEST`, `ERR_BAD_RESPONSE`,
`ERR_NETWORK`, `ERR_CANCELED`, `ECONNABORTED`, `ETIMEDOUT`, plus the network-specific
`ECONNREFUSED`, `ENOTFOUND`, `ENETUNREACH`, `EHOSTUNREACH`.

### Cancellation

**AbortController (recommended):**
```js
const controller = new AbortController();
axios.get('/api/data', { signal: controller.signal });
controller.abort();
// → CanceledError { code: 'ERR_CANCELED', __CANCEL__: true }
```

**CancelToken (legacy):**
```js
const source = axios.CancelToken.source();
axios.get('/api/data', { cancelToken: source.token });
source.cancel('Operation cancelled');
// → throws CanceledError
```

Both are *composed* with `timeout`: you can pass `signal` **and** `timeout` and the timeout
will still fire. `CancelToken#toAbortSignal()` lets you bridge the two APIs.

### Timeout

```js
await axios.get('/slow', {
  timeout: 5000,
  timeoutErrorMessage: 'Custom!',
});
// → AxiosError { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' }

// Axios 1.x: opt into ETIMEDOUT via transitional options
await axios.get('/slow', {
  timeout: 5000,
  transitional: { clarifyTimeoutError: true },
});
// → AxiosError { code: 'ETIMEDOUT' }
```

### Transforms

`transformRequest` / `transformResponse` follow Axios semantics: a per-request transform
**replaces** the default chain. `this` is the request config, the second argument is the
`AxiosHeaders` instance (`status` is the third for responses), and **async transforms are
supported** (the chain is awaited).

```js
await axios.post('/api/data', { a: 1 }, {
  transformRequest: [async (data, headers) => {
    headers.set('X-Custom', 'value');
    return JSON.stringify(data);
  }],
  transformResponse: [(data) => ({ ...JSON.parse(data), _processed: true })],
});
```

### `transitional`

```js
{
  silentJSONParsing: true,   // ignore malformed JSON (default)
  forcedJSONParsing: true,   // try to parse even when responseType is unset
  clarifyTimeoutError: false // use ETIMEDOUT instead of ECONNABORTED
}
```

### Progress

```js
await axios.post('/upload', formData, {
  onUploadProgress: ({ loaded, total, progress, rate, estimated, upload }) => { /* ... */ },
  onDownloadProgress: ({ loaded, total, progress, rate, estimated, download }) => { /* ... */ },
});
```

Both callbacks receive Axios-shaped `AxiosProgressEvent` objects. Upload progress works for
**string, JSON, Blob, File and FormData** bodies (via a streamed body); download progress
works for every `responseType`.

### Response Type

```js
await axios.get('/api/data', { responseType: 'json' });        // default, auto-parses
await axios.get('/api/data', { responseType: 'text' });        // raw string (no parse)
await axios.get('/api/data', { responseType: 'arraybuffer' }); // ArrayBuffer
await axios.get('/api/data', { responseType: 'blob' });        // Blob
await axios.get('/api/data', { responseType: 'formData' });    // FormData
await axios.get('/api/data', { responseType: 'stream' });      // ReadableStream
```

### URL helpers

```js
const inst = axios.create({ baseURL: 'https://api.example.com' });

inst.getUri({ url: '/users', params: { page: 2, tags: ['a', 'b'] } });
// → https://api.example.com/users?page=2&tags[]=a&tags[]=b

// Absolute URLs are never prefixed with baseURL
inst.getUri({ url: 'https://other.com/x' }); // → https://other.com/x
```

`paramsSerializer` accepts both a function and the Axios 1.x object form:

```js
axios.get('/x', {
  params: { a: 1 },
  paramsSerializer: {
    serialize: (params) => new URLSearchParams(params).toString(),
    encode: (value) => encodeURIComponent(value),
  },
});
```

### Concurrent Requests

```js
const [users, posts] = await axios.all([
  axios.get('/users'),
  axios.get('/posts'),
]);

const fn = axios.spread((a, b) => a + b);
fn([1, 2]);  // → 3
```

### Static Utilities

| Export | Description |
|--------|-------------|
| `axios.request` / `axios.getUri` | Dispatch / build a URL without dispatching |
| `axios.isCancel(error)` | Check if an error was caused by cancellation |
| `axios.isAxiosError(error)` | Check if an error is an `AxiosError` |
| `axios.all(promises)` / `axios.spread(fn)` | `Promise.all` / argument spreading |
| `axios.toFormData(obj, fd?, options?)` | Convert an object to `FormData` |
| `axios.formToJSON(formData)` | Convert `FormData` to a plain object |
| `axios.mergeConfig(a, b)` | Axios-compatible config merge (does **not** inject defaults) |
| `axios.Axios` / `axios.AxiosInstance` | Class + instance types |
| `axios.AxiosError` | Error class + error-code constants |
| `axios.AxiosHeaders` | Header container class |
| `axios.CancelToken` / `axios.CanceledError` / `axios.Cancel` | Cancellation |
| `axios.VERSION` | Library version |

---

## Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | — | Request URL |
| `method` | `string` | `'get'` | HTTP method |
| `baseURL` | `string` | — | Prepended to *relative* `url`s only |
| `headers` | `object` | `{ Accept: 'application/json, text/plain, */*' }` | Custom headers |
| `params` | `object` | — | URL query parameters |
| `paramsSerializer` | `function \| {serialize, encode, indexes}` | — | Custom params serializer |
| `data` | `any` | — | Request body |
| `timeout` | `number` | `0` | Request timeout in ms |
| `timeoutErrorMessage` | `string` | — | Custom timeout message |
| `withCredentials` | `boolean` | `false` | Send cookies (sets `credentials: 'include'`) |
| `withXSRFToken` | `boolean \| function` | — | Control XSRF token injection |
| `responseType` | `string` | `'json'` | `json`, `text`, `arraybuffer`, `blob`, `formData`, `stream` |
| `auth` | `object` | — | `{ username, password }` for Basic auth |
| `signal` | `AbortSignal` | — | AbortController signal |
| `cancelToken` | `CancelToken` | — | Axios CancelToken |
| `validateStatus` | `function \| null` | `status => status >= 200 && status < 300` | Status validation |
| `transformRequest` | `function[]` | `[autoJSON]` | Request body transformers (replaces defaults) |
| `transformResponse` | `function[]` | `[autoJSONParse]` | Response data transformers (replaces defaults) |
| `transitional` | `object` | see above | JSON-parsing / timeout behaviour |
| `maxContentLength` | `number` | `-1` | Max response body size (bytes) |
| `maxBodyLength` | `number` | `-1` | Max request body size (bytes) |
| `onUploadProgress` | `function` | — | Upload progress callback |
| `onDownloadProgress` | `function` | — | Download progress callback |
| `xsrfCookieName` | `string` | `'XSRF-TOKEN'` | XSRF cookie name |
| `xsrfHeaderName` | `string` | `'X-XSRF-TOKEN'` | XSRF header name |
| `maxRedirects` | `number` | `5` | `0` → manual, `-1` → follow |
| `mode` | `string` | — | Fetch `mode` (`'cors'`, `'same-origin'`) |
| `cache` | `string` | — | Fetch `cache` mode |
| `referrer` / `referrerPolicy` | `string` | — | Fetch referrer options |
| `integrity` | `string` | — | Subresource integrity |
| `keepalive` | `boolean` | — | Fetch `keepalive` |

---

## Response Object

```js
{
  data: {},                  // response body (parsed according to responseType)
  status: 200,               // HTTP status code
  statusText: 'OK',
  headers: AxiosHeaders,     // case-insensitive .get()/has()/delete()
  config: {},                // the request config that produced this response
  request: {},               // the native Request object
}
```

`request`/`config` also carry the non-standard `_startTime` and `_elapsed` (ms) helpers.

---

## Axios 1.x Parity Notes

Recent work closed the remaining gaps with Axios 1.x:

- **`axios.request()`**, instance `request()`, instance `create()`, `postForm`/`putForm`/`patchForm`
- **`AxiosHeaders`** class (case-insensitive `get`/`has`/`delete`, `normalize`, `concat`, `toJSON`, `setContentType`)
- **Absolute URLs** are no longer mangled by `baseURL`
- **`mergeConfig`** follows Axios exactly: it does not inject defaults and *replaces* transforms
- **`transformRequest`/`transformResponse`** run through a dedicated `dispatchRequest` pipeline (error-path transforms included); async transforms are supported
- **Timeout + `signal` + `cancelToken`** are composed into one signal (previously a `signal` disabled `timeout`)
- **`responseType: 'stream'`** returns a `ReadableStream`
- **`maxContentLength` / `maxBodyLength`** are enforced
- **`transitional`** options, `withXSRFToken`, error-code constants, `ERR_BAD_OPTION_VALUE`
- **Interceptor options** `{ synchronous, runWhen }`; `CancelToken#toAbortSignal()`; `subscribe()` returns an unsubscribe function
- **`toFormData`/`formToJSON`** understand nested keys (`a[b][c]`, `a[]`), Blob and meta tokens

Still intentionally different from upstream Axios:

- This library defaults `responseType` to `'json'` (Axios leaves it `undefined`); behaviour is identical.
- `async` transforms are **awaited** (upstream leaves the Promise in place).
- `Set-Cookie` (and other duplicate) response headers are preserved as arrays.

---

## Known Limitations

### HTTP Agents & Proxies

- **Not supported**: The Fetch API does not support custom HTTP/HTTPS agents like Node's `http.Agent`. For proxies or custom TLS, use environment variables (`HTTP_PROXY`, `HTTPS_PROXY`) or stick with Axios.

### Redirect Handling

- **Partial**: `maxRedirects` maps to Fetch's `redirect` mode:
  - `maxRedirects: 0` → `redirect: 'manual'` (opaque response)
  - `maxRedirects: -1`/default → `redirect: 'follow'`
  - Fetch does not expose the redirect count or a custom limit (typically 20).

### Response Compression

- **Auto-only**: Fetch transparently decompresses gzip/deflate/brotli. `decompress: false` cannot disable it.

### XSRF Tokens

- **Browser-only**: `xsrfCookieName`/`xsrfHeaderName` require `document.cookie`. In Node the XSRF check is skipped.

### Streaming

- `responseType: 'stream'` returns a **web `ReadableStream`** (what the Fetch API provides), not a Node.js `stream.Readable`.

---

## Browser Support

| Runtime | Version |
|---------|---------|
| Chrome | 62+ |
| Firefox | 60+ |
| Safari | 12+ |
| Edge | 16+ |
| Node.js | 18+ (native `fetch`) |

---

## Build & Test

```bash
node build.mjs     # produces dist/sd-axios-fetch.js + dist/sd-axios-fetch.mjs
npm test           # runs the interoperability suite
npm run lint       # eslint src/ test/
```

---

## License

MIT
