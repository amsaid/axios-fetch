/**
 * Fetch Adapter — the bridge between Axios config objects and native fetch().
 *
 * Responsibilities:
 *  1. Build the Request URL (baseURL + url + params)
 *  2. Resolve authentication (Basic auth → Authorization header)
 *  3. Fetch XSRF token from cookies when appropriate
 *  4. Execute fetch() with the correct options
 *  5. Handle timeout via AbortController
 *  6. Dispatch onUploadProgress / onDownloadProgress (best-effort)
 *  7. Parse response body according to responseType
 *  8. Construct an Axios-compatible response object
 *  9. Return a Promise that resolves/rejects via settle()
 */
'use strict';

const { buildURL, combineURLs } = require('../core/buildURL');
const settle         = require('../core/settle');
const transformData  = require('../core/transformData');
const AxiosError     = require('../core/AxiosError');
const CanceledError  = require('../core/CanceledError');
const { isFormData, isBlob, isFile, isURLSearchParams, isString, isArrayBuffer } = require('../helpers/utils');

/**
 * Read a cookie by name (browser only; no-op in Node).
 */
function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(^|;\\s*)(' + encodeURIComponent(name) + ')=([^;]*)')
  );
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Dispatch a request using the Fetch API.
 *
 * @param {Object} config - Fully-merged Axios config.
 * @returns {Promise<Object>} AxiosResponse-shaped object.
 */
module.exports = function fetchAdapter(config) {
  return new Promise(function dispatchFetchRequest(resolve, reject) {
    let request;
    let signal;
    let timeoutId;

    // ── Build URL ────────────────────────────────────────────────
    let fullPath = buildURL(
      config.baseURL ? combineURLs(config.baseURL, config.url) : config.url,
      config.params,
      config.paramsSerializer
    );

    if (!fullPath) {
      reject(AxiosError.badConfig('"url" is required', config));
      return;
    }

    // ── Headers ──────────────────────────────────────────────────
    // Work on a shallow copy so we don't mutate the frozen defaults
    const requestHeaders = { ...config.headers };

    // Flatten content-type convenience
    if (config.contentType) {
      requestHeaders['Content-Type'] = config.contentType;
      delete config.contentType;
    }

    // Remove content-type for FormData (browser sets boundary automatically)
    if (isFormData(config.data)) {
      delete requestHeaders['Content-Type'];
      delete requestHeaders['content-type'];
    }

    // ── XSRF ─────────────────────────────────────────────────────
    if (
      (config.withCredentials || isURLSameOrigin(fullPath)) &&
      config.xsrfCookieName &&
      config.xsrfHeaderName
    ) {
      const xsrfValue = readCookie(config.xsrfCookieName);
      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // ── Basic Auth ───────────────────────────────────────────────
    if (config.auth) {
      const username = config.auth.username || '';
      const password = config.auth.password || '';
      requestHeaders['Authorization'] = 'Basic ' + btoa(username + ':' + password);
    }

    // ── Request body ─────────────────────────────────────────────
    let body = config.data;

    // Apply transformRequest chain
    body = transformData(body, config.transformRequest, requestHeaders);

    // Stringify non-string body if not already a supported type
    if (body !== undefined && body !== null && !isFormData(body) && !isBlob(body) && !isFile(body) && !isURLSearchParams(body) && !isArrayBuffer(body) && typeof body !== 'string') {
      body = JSON.stringify(body);
    }

    // ── Abort / cancel signal ────────────────────────────────────
    const controller = new AbortController();

    // 1) Prefer explicit signal (AbortController / AbortSignal)
    if (config.signal) {
      signal = config.signal;
    } else if (config.cancelToken) {
      // 2) Axios CancelToken → wire to AbortController
      config.cancelToken.throwIfRequested();
      config.cancelToken.subscribe(function (cancel) {
        controller.abort(cancel);
        reject(cancel);       // reject the outer promise
      });
      signal = controller.signal;
    } else {
      signal = controller.signal;
    }

    // ── Timeout ──────────────────────────────────────────────────
    if (config.timeout && config.timeout > 0) {
      timeoutId = setTimeout(function () {
        controller.abort();
      }, config.timeout);
    }

    // ── fetch options ────────────────────────────────────────────
    const fetchMethod = config.method ? config.method.toUpperCase() : 'GET';
    const fetchOptions = {
      method: fetchMethod,
      headers: normalizeHeadersForFetch(requestHeaders),
      signal,
    };

    // GET/HEAD requests MUST NOT have a body (Node.js fetch / undici enforces this)
    if (body !== undefined && body !== null && body !== '' && fetchMethod !== 'GET' && fetchMethod !== 'HEAD') {
      fetchOptions.body = body;
    }

    // withCredentials
    if (config.withCredentials) {
      fetchOptions.credentials = 'include';
    }

    // redirect policy
    if (config.maxRedirects === 0) {
      fetchOptions.redirect = 'manual';
    } else if (config.maxRedirects === -1) {
      fetchOptions.redirect = 'follow';
    }

    // cache mode (mirrors Axios cache option)
    if (config.cache !== undefined) {
      fetchOptions.cache = config.cache;
    }

    // mode (cors / same-origin / navigate)
    if (config.mode) {
      fetchOptions.mode = config.mode;
    }

    // referrer
    if (config.referrer) {
      fetchOptions.referrer = config.referrer;
    }

    // referrerPolicy
    if (config.referrerPolicy) {
      fetchOptions.referrerPolicy = config.referrerPolicy;
    }

    // ── Execute ──────────────────────────────────────────────────
    request = new Request(fullPath, fetchOptions);

    const startTime = Date.now();

    fetch(request)
      .then(function handleResponse(response) {
        if (timeoutId) clearTimeout(timeoutId);

        // ── Construct raw AxiosResponse shape ──────────────────────
        const resHeaders = responseHeadersToObject(response.headers);

        // Read body based on responseType
        let responsePromise;

        switch (config.responseType) {
          case 'arraybuffer':
            responsePromise = response.arrayBuffer();
            break;
          case 'blob':
            responsePromise = response.blob();
            break;
          case 'formData':
            responsePromise = response.formData();
            break;
          case 'text':
          case '':
            responsePromise = response.text();
            break;
          case 'json':
          default:
            // Default: try text then parse (matches Axios behaviour)
            responsePromise = response.text();
            break;
        }

        return responsePromise.then(function (responseData) {
          // ── Download progress (best-effort) ─────────────────────
          if (typeof config.onDownloadProgress === 'function') {
            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            const loaded = isBlob(responseData) ? responseData.size : (typeof responseData === 'string' ? responseData.length : (responseData.byteLength || 0));
            config.onDownloadProgress({
              loaded,
              total,
              progress: total ? loaded / total : 0,
              lengthComputable: !!total,
              // Axios-compat fields
              event: { lengthComputable: !!total, loaded, total },
            });
          }

          // ── transformResponse ────────────────────────────────────
          let data = responseData;

          // For 'json' (default), parse text → JSON before running transforms
          if (config.responseType === 'json' || (config.responseType === undefined || config.responseType === '')) {
            if (isString(data)) {
              try { data = JSON.parse(data); } catch (_e) { /* keep as string */ }
            }
          }

          // Skip transformResponse for binary types (arraybuffer, blob, formData)
          const skipTransforms = (
            config.responseType === 'arraybuffer' ||
            config.responseType === 'blob' ||
            config.responseType === 'formData'
          );

          if (!skipTransforms) {
            data = transformData(data, config.transformResponse, resHeaders);
          }

          const elapsed = Date.now() - startTime;

          const axiosResponse = {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: resHeaders,
            config,
            request,
            // Extra meta — non-standard but useful & harmless
            _startTime: startTime,
            _elapsed: elapsed,
          };

          settle(resolve, reject, axiosResponse, config);
        });
      })
      .catch(function handleError(err) {
        if (timeoutId) clearTimeout(timeoutId);

        // ── Normalise error types ──────────────────────────────────
        if (err instanceof CanceledError || AxiosError.isCancel(err)) {
          reject(err);
          return;
        }

        if (err.name === 'AbortError' || err.type === 'aborted' || err.code === 'ERR_ABORTED') {
          const elapsed = Date.now() - startTime;
          if (config.timeout > 0 && elapsed >= config.timeout - 5) {
            const message = config.timeoutErrorMessage || `timeout of ${config.timeout}ms exceeded`;
            reject(new AxiosError(message, 'ECONNABORTED', config, request, null));
          } else {
            reject(AxiosError.cancel('Request aborted', config, request));
          }
          return;
        }

        // Network / other fetch errors
        reject(AxiosError.fromError(err, config, request, null));
      });
  });
};

// ── Internal helpers ────────────────────────────────────────────────

function isURLSameOrigin(url) {
  if (typeof location === 'undefined') return true;
  try {
    const parsed = new URL(url);
    return parsed.origin === location.origin;
  } catch (_e) {
    return true;
  }
}

/**
 * Convert a Headers instance into a plain object (Axios-style).
 * Keys are normalised to Capitalized-Header-Name form.
 */
function responseHeadersToObject(headers) {
  const obj = {};

  // The forEach on Headers yields lowercase keys in browsers
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    headers.forEach(function (value, key) {
      obj[formatHeaderName(key)] = value;
    });
  } else {
    // Node http.IncomingHeaders – already a plain object
    for (const key of Object.keys(headers || {})) {
      obj[formatHeaderName(key)] = headers[key];
    }
  }

  return obj;
}

/**
 * Capitalise header names the way Axios does: Content-Type, Accept, etc.
 */
function formatHeaderName(str) {
  return str
    .split('-')
    .map(function (seg) { return seg.charAt(0).toUpperCase() + seg.slice(1); })
    .join('-');
}

/**
 * Convert a plain header object to a fetch-compatible structure.
 * Fetch accepts plain objects natively in modern browsers/Node ≥18.
 */
function normalizeHeadersForFetch(headers) {
  if (!headers) return {};
  const out = {};
  for (const key of Object.keys(headers)) {
    if (headers[key] != null) {
      out[key] = headers[key];
    }
  }
  return out;
}
