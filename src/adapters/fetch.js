/**
 * Fetch Adapter — the bridge between Axios config objects and native fetch().
 *
 * Responsibilities:
 *  1. Build the Request URL (baseURL + url + params)
 *  2. Resolve authentication (Basic auth → Authorization header)
 *  3. Fetch XSRF token from cookies when appropriate
 *  4. Execute fetch() with the correct options
 *  5. Handle timeout via AbortController
 *  6. Dispatch onUploadProgress / onDownloadProgress (real-time via streams)
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

// ── Polyfills for Node.js < 16 ──────────────────────────────────
// btoa/atob are global in browsers and Node.js >= 16
if (typeof globalThis.btoa === 'undefined' && typeof Buffer !== 'undefined') {
  globalThis.btoa = function btoa(str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
}
if (typeof globalThis.atob === 'undefined' && typeof Buffer !== 'undefined') {
  globalThis.atob = function atob(str) {
    return Buffer.from(str, 'base64').toString('binary');
  };
}

// ── Environment detection ───────────────────────────────────────
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const nodeVersion = isNode ? parseInt(process.versions.node.split('.')[0], 10) : 0;

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
    // Flatten Axios-style headers (common + method-specific + direct keys)
    const requestHeaders = flattenHeaders(config.headers, config.method);

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
    // XSRF only works in browsers with document.cookie access
    if (isNode) {
      // Silently skip in Node.js (no cookies to read)
    } else if (
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

    // decompress (Note: fetch auto-decompresses; this is a no-op in most environments)
    if (config.decompress === false) {
      // Fetch API doesn't support manual decompress; warn in Node.js
      if (isNode && nodeVersion >= 18) {
        console.warn('[sd-axios-fetch] decompress: false is not supported by the Fetch API. Response will be auto-decompressed.');
      }
    }

    // ── Execute ──────────────────────────────────────────────────
    request = new Request(fullPath, fetchOptions);

    const startTime = Date.now();

    // ── Upload progress tracking ─────────────────────────────────
    let uploadProgressPromise = null;
    if (typeof config.onUploadProgress === 'function' && body && typeof body === 'string') {
      // For string bodies, we can track upload progress via ReadableStream
      const bodyBytes = new TextEncoder().encode(body);
      const total = bodyBytes.length;
      let loaded = 0;

      const stream = new ReadableStream({
        start(controller) {
          // Send in chunks (16KB at a time)
          const chunkSize = 16 * 1024;
          let offset = 0;

          function push() {
            if (offset >= bodyBytes.length) {
              controller.close();
              return;
            }
            const chunk = bodyBytes.slice(offset, offset + chunkSize);
            offset += chunk.length;
            loaded = offset;

            // Report progress
            config.onUploadProgress({
              loaded,
              total,
              progress: total ? loaded / total : 0,
              bytes: chunk.length,
              rate: 0,
              estimated: 0,
              lengthComputable: true,
              upload: true,
            });

            controller.enqueue(chunk);
            // Use setTimeout to allow progress events to fire
            setTimeout(push, 0);
          }

          push();
        },
      });

      fetchOptions.body = stream;
      uploadProgressPromise = Promise.resolve();
    }

    fetch(request)
      .then(function handleResponse(response) {
        if (timeoutId) clearTimeout(timeoutId);

        // ── Construct raw AxiosResponse shape ──────────────────────
        const resHeaders = responseHeadersToObject(response.headers);

        // ── Download progress tracking via ReadableStream ──────────
        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

        // For progress tracking, we need to read the stream manually
        if (typeof config.onDownloadProgress === 'function' && response.body && typeof response.body.getReader === 'function') {
          return trackDownloadProgress(response, config, resHeaders, startTime, request, settle, resolve, reject);
        }

        // Fallback: no progress tracking, read body directly
        return readResponseBody(response, config, resHeaders, startTime, request, settle, resolve, reject);
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

        // Network / other fetch errors — improve error code detection
        reject(classifyNetworkError(err, config, request));
      });

    // If we created an upload progress stream, wait for it before fetch
    if (uploadProgressPromise) {
      uploadProgressPromise.catch(() => {}); // ignore errors here
    }
  });
};

/**
 * Track download progress by reading the response body as a ReadableStream.
 */
function trackDownloadProgress(response, config, resHeaders, startTime, request, settle, resolve, reject) {
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;
  const chunks = [];

  const reader = response.body.getReader();

  function read() {
    return reader.read().then(({ done, value }) => {
      if (done) {
        // Combine chunks
        let responseData;
        if (config.responseType === 'arraybuffer') {
          responseData = concatChunks(chunks, loaded);
        } else {
          const decoder = new TextDecoder();
          responseData = decoder.decode(concatChunks(chunks, loaded));
        }

        // Final progress event
        if (typeof config.onDownloadProgress === 'function') {
          config.onDownloadProgress({
            loaded,
            total,
            progress: total ? loaded / total : 1,
            bytes: 0,
            rate: 0,
            estimated: 0,
            lengthComputable: !!total,
            event: { lengthComputable: !!total, loaded, total },
          });
        }

        // Process the response data
        return processResponseData(responseData, response, config, resHeaders, startTime, request, settle, resolve, reject);
      }

      // Accumulate chunk
      chunks.push(value);
      loaded += value.length;

      // Dispatch progress event
      if (typeof config.onDownloadProgress === 'function') {
        config.onDownloadProgress({
          loaded,
          total,
          progress: total ? loaded / total : 0,
          bytes: value.length,
          rate: 0,
          estimated: 0,
          lengthComputable: !!total,
          event: { lengthComputable: !!total, loaded, total },
        });
      }

      return read();
    });
  }

  return read().catch(function handleError(err) {
    if (err instanceof CanceledError || AxiosError.isCancel(err)) {
      reject(err);
      return;
    }
    reject(classifyNetworkError(err, config, request));
  });
}

/**
 * Concatenate Uint8Array chunks into a single ArrayBuffer or string.
 */
function concatChunks(chunks, totalLength) {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}

/**
 * Read response body without progress tracking (fast path).
 */
function readResponseBody(response, config, resHeaders, startTime, request, settle, resolve, reject) {
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
      responsePromise = response.text();
      break;
  }

  return responsePromise.then(function (responseData) {
    return processResponseData(responseData, response, config, resHeaders, startTime, request, settle, resolve, reject);
  });
}

/**
 * Process response data and settle the request.
 */
function processResponseData(responseData, response, config, resHeaders, startTime, request, settle, resolve, reject) {
  // ── transformResponse ────────────────────────────────────
  let data = responseData;

  // For 'json' (default), parse text → JSON before running transforms
  if (config.responseType === 'json' || (config.responseType === undefined || config.responseType === '')) {
    if (isString(data)) {
      try { data = JSON.parse(data); } catch (_e) { /* keep as string */ }
    }
  } else if (config.responseType === 'arraybuffer' && responseData instanceof ArrayBuffer) {
    // Already an ArrayBuffer, no transformation needed
    data = responseData;
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
}

/**
 * Classify network errors into more specific Axios error codes.
 */
function classifyNetworkError(err, config, request) {
  const message = err.message || err.toString();

  // Timeout detection (check both message and elapsed time)
  if (message.includes('timed out') || 
      message.includes('ETIMEDOUT') || 
      message.includes('fetch failed') && err.cause?.code === 'UND_ERR_SOCKET') {
    return new AxiosError(
      config.timeoutErrorMessage || `timeout of ${config.timeout}ms exceeded`,
      'ECONNABORTED',
      config,
      request,
      null
    );
  }

  // Connection refused
  if (message.includes('ECONNREFUSED') || message.includes('connection refused')) {
    return new AxiosError('connect ECONNREFUSED', 'ECONNREFUSED', config, request, null);
  }

  // DNS resolution failure
  if (message.includes('ENOTFOUND') || message.includes('getaddrinfo') || message.includes('dns')) {
    return new AxiosError('getaddrinfo ENOTFOUND', 'ENOTFOUND', config, request, null);
  }

  // Network unreachable
  if (message.includes('ENETUNREACH') || message.includes('network unreachable')) {
    return new AxiosError('network is unreachable', 'ENETUNREACH', config, request, null);
  }

  // Certificate/SSL errors
  if (message.includes('CERT_') || message.includes('certificate') || message.includes('ssl')) {
    return new AxiosError(message, 'ERR_BAD_REQUEST', config, request, null);
  }

  // Generic network error
  return AxiosError.fromError(err, config, request, null);
}

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

/**
 * Flatten Axios-style headers into a plain object.
 *
 * Axios supports three levels of headers:
 *   1. headers.common — applied to all methods
 *   2. headers[method] — applied to a specific method
 *   3. headers['Header-Name'] — direct header assignment
 *
 * This function merges them in order: common → method-specific → direct.
 *
 * @param {Object} headers - Axios headers object (may contain common/method keys).
 * @param {string} [method] - HTTP method (lowercase).
 * @returns {Object} Flattened headers ready for fetch.
 */
function flattenHeaders(headers, method) {
  if (!headers) return {};

  const result = {};
  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  // 1. Start with 'common' headers
  if (headers.common && typeof headers.common === 'object') {
    Object.assign(result, headers.common);
  }

  // 2. Apply method-specific headers
  if (method) {
    const methodKey = method.toLowerCase();
    if (headers[methodKey] && typeof headers[methodKey] === 'object') {
      Object.assign(result, headers[methodKey]);
    }
  }

  // 3. Apply direct headers (skip 'common' and HTTP method keys)
  for (const key of Object.keys(headers)) {
    if (key === 'common') continue;
    if (HTTP_METHODS.includes(key.toLowerCase())) continue;
    if (headers[key] != null) {
      result[key] = headers[key];
    }
  }

  return result;
}
