# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-10-10

### Fixed
- **ESM bundle regression**: `dist/sd-axios-fetch.mjs` did not cache modules in its
  internal `require`, so every `require()` instantiated a *new copy* of each module.
  Cross-module `instanceof` checks then failed — most visibly, an `AxiosHeaders`
  instance created by one copy was not recognised by another and was treated as a
  header *name*, throwing `header name must be a non-empty string` on the first
  request. The ESM `require` now uses the same module cache as the CJS bundle.
- `AxiosHeaders#set` now also recognises `AxiosHeaders` instances from a foreign copy
  (detected via `Symbol.toStringTag`), as defence in depth.
- Added an ESM-bundle regression test (107 tests total).

## [0.1.0] - 2026-10-10

A large Axios 1.x parity pass. `mergeConfig`, header handling and the request
pipeline were reworked to match `axios` exactly; several long-standing bugs were fixed.

### Added
- **Axios 1.x API surface**
  - `axios.request()` (was missing entirely), plus `request()` on created instances
  - `instance.create()` for deriving new instances
  - `postForm` / `putForm` / `patchForm` aliases (send `multipart/form-data`)
  - `axios.VERSION`, `axios.Cancel` (alias of `CanceledError`)
  - `AxiosHeaders` class: `set`/`get`/`has`/`delete`/`clear`/`normalize`/`concat`/`toJSON`,
    case-insensitive lookup, content-type/length accessors, `Symbol.iterator`
  - `responseType: 'stream'` now returns a `ReadableStream`
  - `transitional: { silentJSONParsing, forcedJSONParsing, clarifyTimeoutError }`
  - `withXSRFToken` option
  - `maxContentLength` / `maxBodyLength` are now enforced
  - `paramsSerializer` object form `{ serialize, encode, indexes }`
  - `AxiosError` code constants (`ERR_BAD_OPTION_VALUE`, `ERR_BAD_RESPONSE`, `ETIMEDOUT`, …),
    an `isAxiosError` marker and a `status` field
  - `CancelToken#toAbortSignal()`, `subscribe()` returns an unsubscribe function,
    `unsubscribe()` method
  - Interceptor options `{ synchronous, runWhen }`
  - `toFormData` supports nested keys, `[]` arrays, Blob values and meta tokens;
    `formToJSON` understands `a[b][c]` and `a[]` keys
  - `env: { FormData, Blob }` alongside `formSerializer`
- **Pipeline**
  - `core/dispatchRequest.js` — transforms now run on both the success and error paths
  - `helpers/trackStream.js`, `composeSignals.js`, `progressEventReducer.js`,
    `speedometer.js`, `throttle.js`, `toFormData.js`, `formDataToJSON.js`, `parseHeaders.js`
  - `core/AxiosURLSearchParams.js`, `core/buildFullPath.js`, `core/defaults.js`, `src/version.js`
- **Tests** — 106 interoperability tests (up from 69), including a deterministic local
  HTTP server, progress, streaming, limits and Axios 1.x feature coverage

### Fixed
- **`baseURL` no longer corrupts absolute URLs** (`http://host/x` is left untouched)
- **`onUploadProgress` actually fires** — the request was previously built before the
  tracking stream was attached, so the callback was never invoked. It now works for
  `Blob`, `File` and `FormData` bodies too
- **`timeout` now works when a `signal` is provided** (previously the abort went to an
  unused controller). `signal`, `cancelToken` and `timeout` are composed
- Aborting via `signal`/`timeout` now rejects with a `CanceledError`
- **`config.headers` is flattened to `AxiosHeaders`** after interceptors, so
  `response.config.headers.get(...)` works like Axios
- `mergeConfig` no longer injects `DEFAULTS` into every call and **replaces** (instead of
  concatenating) `transformRequest`/`transformResponse` — the default JSON transform no
  longer runs two to three times per request
- `transformResponse` runs on error responses, so `error.response.data` is parsed
- `FormData` bodies are sent as `multipart/form-data` **with a boundary** (previously the
  body was multipart-encoded but labelled `application/x-www-form-urlencoded`)
- `onDownloadProgress` no longer breaks `blob`/`formData`/`stream` response types
- `AxiosError.from()` no longer throws (`Class constructor … cannot be invoked without 'new'`)
- `mergeConfig` treats `method`/`url`/`data`/`responseType` as config2-only, matching Axios
- Absolute-URL detection, error codes (`ERR_BAD_OPTION_VALUE`, `ERR_BAD_RESPONSE`) and
  timeout messages now match Axios

### Changed
- **The TypeScript declarations were rewritten** using real ES module exports. The previous
  file did not compile (`export =` + `declare const`/`declare namespace` cannot merge);
  it is now strict-mode clean under `node`, `node16` and `nodenext` resolution
- `axios.defaults` now includes per-method header buckets and `transitional`, matching Axios
  (`responseType` still defaults to `'json'` — see README parity notes)
- Request interceptors run LIFO and response interceptors FIFO (Axios order)
- `README.md` rewritten for the new API surface and limitations
- Bundle size: ~96 KB CJS/UMD, ~96 KB ESM

### Removed
- Dead `HEADER_NAME_REGEX`/manual JSON parsing code paths superseded by the Axios pipeline

## [0.0.8] - 2026-04-08

### Added
- **Security & Input Validation**
  - URL input validation (rejects empty/non-string URLs)
  - Protocol whitelist (`http:`, `https:`, `data:`, `blob:` only; rejects `javascript:`, `file:`, etc.)
  - Header name sanitization via RFC-compliant regex
  - Header value CR/LF injection prevention
  - Timeout validation (rejects negative/non-numeric values)
  - `responseType` validation against allowed values
- **Headers**
  - `headers.common` support on `axios.create()` instances
  - Method-specific headers (`headers.get`, `headers.post`, etc.) with proper precedence
  - Set-Cookie preservation via `getSetCookie()` API (returns array for multiple cookies)
  - Duplicate header handling (converts to arrays except Set-Cookie)
  - Axios-style header merging preserving `common`/method-specific/direct structure
- **Error Handling**
  - Enhanced network error classification:
    - `ECONNABORTED` — timeout
    - `ECONNREFUSED` — connection refused
    - `ENOTFOUND` — DNS resolution failure
    - `ENETUNREACH` — network unreachable
    - `ERR_BAD_REQUEST` — SSL/certificate errors
  - `ERR_BAD_OPTION` for invalid configuration (URL, timeout, responseType)
- **Progress Tracking**
  - Real-time download progress via ReadableStream (`onDownloadProgress`)
  - Upload progress for string/JSON bodies via ReadableStream (`onUploadProgress`)
  - Progress events include `loaded`, `total`, `progress`, `bytes`, `lengthComputable`
- **Compatibility**
  - `btoa`/`atob` polyfills for Node.js < 16 using Buffer
  - Environment detection (browser vs Node.js) with feature warnings
  - `decompress: false` console warning (Fetch API limitation)
  - XSRF token support silently skipped in Node.js
- **Developer Experience**
  - ESLint v8 configuration (`.eslintrc.json`) with Node + browser globals
  - Version bump script (`scripts/version.js`)
  - Comprehensive `.gitignore`
  - `CHANGELOG.md` with Keep a Changelog format
  - `CONTRIBUTING.md` with development guidelines
- **Testing**
  - 69 interoperability tests (up from 58)
  - 11 new edge case & security tests
  - Flaky network test handling for timeout scenarios
- **Package Metadata**
  - `engines` field (`node >= 14.17`)
  - `bugs` and `homepage` URLs
  - `sideEffects: false` for tree-shaking
  - TypeScript types in conditional exports
  - `package.json` export in conditional exports
  - Expanded keywords (18 total) for npm discoverability
- **CI/CD**
  - GitHub Actions with multi-version testing (Node 18, 20, 22)
  - ESLint v8 job with file structure checks
  - Automated npm publish on version tags

### Fixed
- `axios.create()` now properly inherits from DEFAULTS (transforms, headers, etc.)
- Header flattening preserves Axios-style `headers.common` structure
- `mergeConfig` no longer deep-merges headers (uses `mergeHeaders` instead)
- Timeout error messages respect `timeoutErrorMessage` config
- Response headers preserve duplicates as arrays
- Test suite handles flaky network-dependent timeout tests

### Changed
- Build script reads version from `package.json` dynamically
- `prepublishOnly` runs both build and test
- Updated README with comprehensive limitations section
- Bundle size: 56.9 KB (CJS/UMD), 56.3 KB (ESM)

### Removed
- `node >= 14` from browserslist (Node.js not a browser)

## [0.0.7] - 2026-04-08

### Changed
- Project renamed to `sd-axios-fetch`
- Repository URL updated to `github.com/amsaid/axios-fetch`

## [0.0.6] - 2026-04-08

### Added
- Real-time download progress tracking via ReadableStream
- Upload progress tracking for string/JSON bodies
- Enhanced error code classification (ECONNREFUSED, ENOTFOUND, ENETUNREACH, etc.)
- Input validation and security hardening (URL protocol validation, header sanitization)
- Set-Cookie header preservation using `getSetCookie()` API
- `btoa`/`atob` polyfills for Node.js < 16 compatibility
- Environment detection (browser vs Node.js) with feature warnings
- `headers.common` support for instances created with `axios.create()`
- ESLint configuration for code quality
- GitHub Actions CI/CD pipeline with multi-version testing

### Fixed
- `axios.create()` now properly inherits DEFAULTS (transforms, headers, etc.)
- Header flattening now preserves Axios-style `headers.common` and method-specific headers
- Timeout error messages now respect `timeoutErrorMessage` config
- Test suite now properly handles flaky network-dependent timeout tests

### Changed
- Updated exports in package.json to include types for better TypeScript support
- Added `sideEffects: false` for better tree-shaking
- Expanded keywords and metadata for better npm discoverability

## [0.0.5] - 2026-04-07

### Added
- Initial release with full Axios API compatibility
- Zero-dependency Fetch API implementation
- TypeScript declaration file
- 58 interoperability tests
- UMD + ESM bundles

[0.1.1]: https://github.com/amsaid/axios-fetch/releases/tag/v0.1.1
[0.1.0]: https://github.com/amsaid/axios-fetch/releases/tag/v0.1.0
[0.0.8]: https://github.com/amsaid/axios-fetch/releases/tag/v0.0.8
[0.0.7]: https://github.com/amsaid/axios-fetch/releases/tag/v0.0.7
[0.0.6]: https://github.com/amsaid/axios-fetch/releases/tag/v0.0.6
[0.0.5]: https://github.com/amsaid/axios-fetch/releases/tag/v0.0.5
