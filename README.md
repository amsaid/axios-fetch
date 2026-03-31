# sd-axios-fetch

A zero-dependency, drop-in replacement for **[Axios](https://github.com/axios/axios)** built entirely on the native **Fetch API**. Swap the import and go — no code changes needed.

- **45 KB** single-file bundle (UMD + ESM)
- **Zero dependencies** — uses only native `fetch`, `AbortController`, `Request`, `Headers`
- **Full Axios API compatibility** — `get`, `post`, `put`, `patch`, `delete`, `head`, `options`, `create`, interceptors, `CancelToken`, `AbortController`, `axios.all` / `axios.spread`, transforms, timeout, etc.
- **TypeScript types** included (`dist/sd-axios-fetch.d.ts`)
- **58 passing interoperability tests** against real APIs

---

## Install

```bash
npm install sd-sd-axios-fetch
```

Or drop the bundled file directly into a `<script>` tag:

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
| `axios.get(url, config?)` | `AxiosPromise` | GET request |
| `axios.post(url, data?, config?)` | `AxiosPromise` | POST request |
| `axios.put(url, data?, config?)` | `AxiosPromise` | PUT request |
| `axios.patch(url, data?, config?)` | `AxiosPromise` | PATCH request |
| `axios.delete(url, config?)` | `AxiosPromise` | DELETE request |
| `axios.head(url, config?)` | `AxiosPromise` | HEAD request |
| `axios.options(url, config?)` | `AxiosPromise` | OPTIONS request |
| `axios.request(config)` | `AxiosPromise` | Generic request method |

### Instance Creation

```js
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { 'X-App': 'my-app' },
});

api.get('/users');     // → https://api.example.com/users
api.post('/users', {});
```

### Interceptors

```js
// Request interceptor
axios.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
}, error => Promise.reject(error));

// Response interceptor
axios.interceptors.response.use(
  response => response.data,  // unwrap data
  error => {
    if (error.response?.status === 401) redirectToLogin();
    return Promise.reject(error);
  }
);

// Eject
const id = axios.interceptors.request.use(fn);
axios.interceptors.request.eject(id);
```

### Error Handling

```js
axios.get('/api/not-found')
  .catch(err => {
    console.log(err.isAxiosError);       // true
    console.log(err.response.status);    // 404
    console.log(err.response.data);      // response body
    console.log(err.code);               // 'ERR_BAD_REQUEST'
    console.log(err.toJSON());           // plain object
  });
```

### Cancellation

**CancelToken (Axios pre-v0.22):**
```js
const source = axios.CancelToken.source();

source.cancel('Operation cancelled');
axios.get('/api/data', { cancelToken: source.token });
// → throws CanceledError with __CANCEL__ = true
```

**AbortController (modern):**
```js
const controller = new AbortController();

controller.abort();
axios.get('/api/data', { signal: controller.signal });
// → throws error with code 'ERR_CANCELED'
```

### Timeout

```js
axios.get('/api/slow', {
  timeout: 5000,                    // 5 second timeout
  timeoutErrorMessage: 'Custom!',   // custom message
});
// → AxiosError { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' }
```

### Transforms

```js
axios.get('/api/data', {
  transformRequest: [(data, headers) => {
    headers['X-Custom'] = 'value';
    return JSON.stringify(data);
  }],
  transformResponse: [(data) => {
    // post-process response data
    return { ...data, _processed: true };
  }],
});
```

### Config Merging

```js
const merged = axios.mergeConfig(defaults, userConfig);
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

### Response Type

```js
await axios.get('/api/data', { responseType: 'json' });        // default, auto-parses
await axios.get('/api/data', { responseType: 'text' });        // raw string
await axios.get('/api/data', { responseType: 'arraybuffer' }); // ArrayBuffer
await axios.get('/api/data', { responseType: 'blob' });        // Blob
```

### Static Utilities

| Export | Description |
|--------|-------------|
| `axios.isCancel(error)` | Check if error was caused by cancellation |
| `axios.isAxiosError(error)` | Check if an error is an AxiosError |
| `axios.toFormData(obj, fd?)` | Convert object to FormData |
| `axios.formToJSON(formData)` | Convert FormData to plain object |
| `axios.getUri(config)` | Build the URL without dispatching |
| `axios.CancelToken` | Imperative cancellation token class |
| `axios.CanceledError` | Dedicated cancellation error class |
| `axios.AxiosError` | Base error class |
| `axios.mergeConfig` | Deep config merging utility |

---

## Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | — | Request URL |
| `method` | `string` | `'get'` | HTTP method |
| `baseURL` | `string` | — | Prepended to `url` |
| `headers` | `object` | `{ Accept: 'application/json' }` | Custom headers |
| `params` | `object` | — | URL query parameters |
| `paramsSerializer` | `function` | — | Custom params serializer |
| `data` | `any` | — | Request body (POST/PUT/PATCH) |
| `timeout` | `number` | `0` | Request timeout in ms |
| `timeoutErrorMessage` | `string` | — | Custom timeout message |
| `withCredentials` | `boolean` | `false` | Send cookies (sets `credentials: 'include'`) |
| `responseType` | `string` | `'json'` | `json`, `text`, `arraybuffer`, `blob`, `formData` |
| `auth` | `object` | — | `{ username, password }` for Basic auth |
| `signal` | `AbortSignal` | — | AbortController signal for cancellation |
| `cancelToken` | `CancelToken` | — | Axios CancelToken for cancellation |
| `validateStatus` | `function` | `status => status >= 200 && status < 300` | Status code validation |
| `transformRequest` | `function[]` | `[autoJSON]` | Request body transformers |
| `transformResponse` | `function[]` | `[autoJSONParse]` | Response data transformers |
| `xsrfCookieName` | `string` | `'XSRF-TOKEN'` | XSRF cookie name |
| `xsrfHeaderName` | `string` | `'X-XSRF-TOKEN'` | XSRF header name |
| `maxRedirects` | `number` | `5` | Maximum redirect count |
| `mode` | `string` | — | Fetch `mode` (`'cors'`, `'same-origin'`) |
| `cache` | `string` | — | Fetch `cache` mode |
| `referrer` | `string` | — | Fetch `referrer` |
| `referrerPolicy` | `string` | — | Fetch `referrerPolicy` |
| `onUploadProgress` | `function` | — | Upload progress callback |
| `onDownloadProgress` | `function` | — | Download progress callback |

---

## Response Object

```js
{
  data: {},           // response body (parsed)
  status: 200,        // HTTP status code
  statusText: 'OK',   // HTTP status text
  headers: {          // response headers (capitalized keys)
    'Content-Type': 'application/json',
    'Cache-Control': 'max-age=3600',
  },
  config: {},         // the request config that produced this response
  request: {},        // the Request object (native fetch)
}
```

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 62+ |
| Firefox | 60+ |
| Safari | 12+ |
| Edge | 16+ |
| Node.js | 18+ (native `fetch`) |

---

## Build

```bash
node build.mjs     # produces dist/sd-axios-fetch.js + dist/sd-axios-fetch.mjs
npm test           # runs 58 interoperability tests
```

---

## License

MIT
