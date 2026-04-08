# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.0.8]: https://github.com/amsaid/axios-fetch/releases/tag/v0.0.8
[0.0.7]: https://github.com/amsaid/axios-fetch/releases/tag/v0.0.7
[0.0.6]: https://github.com/amsaid/axios-fetch/releases/tag/v0.0.6
[0.0.5]: https://github.com/amsaid/axios-fetch/releases/tag/v0.0.5
