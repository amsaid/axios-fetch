/**
 * Fetch Adapter — the bridge between Axios config objects and native fetch().
 *
 * Mirrors `axios/lib/adapters/fetch.js` and adds the network-error
 * classification this library is known for.
 *
 * Responsibilities:
 *  1. Build the full URL (baseURL + url + params)
 *  2. Resolve authentication (Basic auth → Authorization header)
 *  3. Fetch the XSRF token from cookies when appropriate
 *  4. Compose the abort signal (signal + cancelToken + timeout)
 *  5. Execute fetch() with the correct options
 *  6. Dispatch onUploadProgress / onDownloadProgress via stream tracking
 *  7. Parse the response body according to responseType
 *  8. Construct an Axios-compatible response object and settle the promise
 */
'use strict';

const { buildURL, buildFullPath, isURLSameOrigin } = require('../core/buildURL');
const settle        = require('../core/settle');
const AxiosError    = require('../core/AxiosError');
const CanceledError = require('../core/CanceledError');
const AxiosHeaders  = require('../core/AxiosHeaders');
const composeSignals = require('../helpers/composeSignals');
const trackStream    = require('../helpers/trackStream');
const {
  progressEventReducer,
  progressEventDecorator,
  asyncDecorator,
} = require('../helpers/progressEventReducer');
const {
  isArrayBuffer,
  isArrayBufferView,
  isBlob,
  isFileList,
  isFormData,
  isFunction,
  isReadableStream,
  isString,
  isURLSearchParams,
  toFiniteNumber,
} = require('../helpers/utils');

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

// ── Environment detection ────────────────────────────────────────
const isFetchSupported = typeof fetch === 'function' && typeof Request === 'function' &&
  typeof Response === 'function';
const isReadableStreamSupported = isFetchSupported && typeof ReadableStream === 'function';

const DEFAULT_CHUNK_SIZE = 64 * 1024;

const test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};

/**
 * Feature-detect streaming *request* bodies (needed for onUploadProgress).
 *
 * Axios only checks whether the runtime reads the `duplex` option. Some
 * runtimes (notably Bun) ignore `duplex` but still accept a stream body, so we
 * additionally accept a runtime that keeps the stream on `request.body`.
 */
const supportsRequestStream = isReadableStreamSupported && test(() => {
  let duplexAccessed = false;

  const request = new Request('http://localhost', {
    body: new ReadableStream(),
    method: 'POST',
    get duplex() {
      duplexAccessed = true;
      return 'half';
    },
  });

  return !request.headers.has('Content-Type') &&
    (duplexAccessed || isReadableStream(request.body));
});

const supportsResponseStream = isReadableStreamSupported &&
  test(() => isReadableStream(new Response('').body));

const encodeText = isFetchSupported && (typeof TextEncoder === 'function' ?
  ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) :
  async (str) => new Uint8Array(await new Response(str).arrayBuffer()));

/**
 * Response body resolvers, one per Axios responseType.
 * Axios performs a case-insensitive lookup (`utils.findKey`); keys here are
 * already lowercased and `responseType` is lowercased before lookup.
 */
const resolvers = {
  stream: supportsResponseStream && ((res) => res.body),
};

if (isFetchSupported) {
  ['text', 'arraybuffer', 'blob', 'formdata'].forEach((type) => {
    const methodName = type === 'arraybuffer' ? 'arrayBuffer'
      : type === 'formdata' ? 'formData'
        : type;

    resolvers[type] = isFunction(Response.prototype[methodName])
      ? (res) => res[methodName]()
      : (_, config) => {
        throw new AxiosError(`Response type '${type}' is not supported`, AxiosError.ERR_NOT_SUPPORT, config);
      };
  });

  // `responseType: 'response'` yields the raw Response object (as Axios' xhr adapter does).
  resolvers.response = (res) => res;
}

/**
 * Pick the resolver for a responseType, falling back to text for unknown
 * types (`json` included — JSON parsing happens in transformResponse).
 */
function resolveResponseHandler(responseType) {
  return resolvers[responseType] || resolvers.text;
}

const VALID_RESPONSE_TYPES = ['arraybuffer', 'blob', 'document', 'json', 'text', 'stream', 'formdata', 'response', ''];

const VALID_PROTOCOLS = ['http:', 'https:', 'data:', 'blob:'];

/**
 * Read a cookie by name (browser only; no-op in Node).
 */
function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(^|;\\s*)(' + encodeURIComponent(name) + ')=([^;]*)'),
  );
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Determine the number of bytes the request body will produce.
 */
async function getBodyLength(body) {
  if (body == null) return 0;

  if (isBlob(body)) return body.size;

  if (isFormData(body) || isFileList(body)) {
    const _request = new Request('http://localhost', { method: 'POST', body });
    return (await _request.arrayBuffer()).byteLength;
  }

  if (isArrayBufferView(body) || isArrayBuffer(body)) return body.byteLength;

  if (isURLSearchParams(body)) body = body + '';

  if (isString(body)) return (await encodeText(body)).byteLength;
}

async function resolveBodyLength(headers, body) {
  const contentLength = headers.getContentLength
    ? parseInt(headers.getContentLength(), 10) : NaN;

  return isNaN(contentLength) ? getBodyLength(body) : contentLength;
}

/**
 * Convert a native `Headers` instance into an AxiosHeaders instance,
 * preserving repeated `Set-Cookie` values as an array where possible.
 */
function responseHeadersToAxiosHeaders(headers) {
  const result = new AxiosHeaders();

  if (isString(headers)) {
    const parseHeaders = require('../helpers/parseHeaders');
    return AxiosHeaders.from(parseHeaders(headers));
  }

  if (!headers) return result;

  if (isFunction(headers.getSetCookie)) {
    const setCookies = headers.getSetCookie();
    if (setCookies.length > 0) {
      result.set('set-cookie', setCookies.length === 1 ? setCookies[0] : setCookies, true);
    }
  }

  if (typeof headers.forEach === 'function' && !Array.isArray(headers)) {
    headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') return;
      result.set(key, value, true);
    });
  } else {
    for (const key of Object.keys(headers)) {
      result.set(key, headers[key], true);
    }
  }

  return result;
}

/**
 * Dispatch a request using the Fetch API.
 *
 * @param {Object} config - Fully-merged Axios config (already transformed).
 * @returns {Promise<Object>} AxiosResponse-shaped object.
 */
async function fetchAdapter(config) {
  if (!isFetchSupported) {
    throw new AxiosError(
      'Fetch API is not supported by this environment',
      AxiosError.ERR_NOT_SUPPORT,
      config,
    );
  }

  // ── Input validation & security ────────────────────────────────────
  const fullPath = buildFullPath(config.baseURL, config.url);

  if (!fullPath || !isString(fullPath)) {
    throw AxiosError.badConfig('"url" must be a non-empty string', config);
  }

  // Reject URLs with dangerous protocols
  try {
    const parsed = new URL(fullPath, 'http://base');
    if (!VALID_PROTOCOLS.includes(parsed.protocol.toLowerCase())) {
      throw AxiosError.badConfig(`Unsupported protocol: ${parsed.protocol}`, config);
    }
  } catch (e) {
    if (e && e.isAxiosError) throw e;
    // If URL parsing fails, continue and let fetch() handle it
  }

  // Validate / coerce timeout (axios accepts numeric strings like '30')
  if (config.timeout != null) {
    const timeout = toFiniteNumber(config.timeout);
    if (timeout === null || timeout < 0) {
      throw AxiosError.badConfig('"timeout" must be a non-negative number', config);
    }
    config.timeout = timeout;
  }

  // Validate responseType
  let responseType = config.responseType ? String(config.responseType).toLowerCase() : '';

  if (responseType && !VALID_RESPONSE_TYPES.includes(responseType)) {
    throw new AxiosError(
      'Unknown response type: ' + config.responseType,
      AxiosError.ERR_BAD_OPTION_VALUE,
      config,
    );
  }

  // Work on a copy: auth / XSRF / FormData header fix-ups must not leak into
  // `response.config.headers` (upstream axios applies them to a detached copy).
  const headers = AxiosHeaders.concat(config.headers);

  let data = config.data;

  // Build the final URL with params
  let url = buildURL(fullPath, config.params, config.paramsSerializer);

  // Fetch forbids credentials embedded in the URL, so lift them into Basic auth
  // (this is what Axios' http adapter does).
  let urlCredentials = null;
  try {
    const parsed = new URL(url, 'http://localhost');
    if (parsed.username || parsed.password) {
      urlCredentials = {
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
      };
      parsed.username = '';
      parsed.password = '';
      url = parsed.toString();
    }
  } catch (_e) { /* leave the URL untouched */ }

  // ── HTTP basic authentication ──────────────────────────────────────
  const auth = config.auth || urlCredentials;
  if (auth) {
    headers.set('Authorization', 'Basic ' +
      btoa((auth.username || '') + ':' + (auth.password ? unescape(encodeURIComponent(auth.password)) : '')),
    );
  }

  // Let the runtime set the multipart boundary. If we keep the
  // `application/x-www-form-urlencoded` header that dispatchRequest adds, the
  // FormData body would be sent with a multipart boundary but the wrong type.
  if (isFormData(data)) {
    headers.setContentType(undefined);
  }

  // ── XSRF token (browser only) ─────────────────────────────────────
  if (typeof document !== 'undefined' && typeof document.cookie !== 'undefined') {
    let withXSRFToken = config.withXSRFToken;

    if (withXSRFToken && isFunction(withXSRFToken)) {
      withXSRFToken = withXSRFToken(config);
    }

    if (withXSRFToken || (withXSRFToken !== false && isURLSameOrigin(url))) {
      const xsrfValue = config.xsrfHeaderName && config.xsrfCookieName &&
        readCookie(config.xsrfCookieName);

      if (xsrfValue) {
        headers.set(config.xsrfHeaderName, xsrfValue);
      }
    }
  }

  // ── Abort / cancellation / timeout (composed) ─────────────────────
  const composedSignal = composeSignals(
    [config.signal, config.cancelToken && config.cancelToken.toAbortSignal()],
    config.timeout,
  );

  const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
    composedSignal.unsubscribe();
  });

  let requestContentLength;
  let request;

  try {
    const wantsUploadProgress = config.onUploadProgress && supportsRequestStream &&
      config.method !== 'get' && config.method !== 'head';
    const wantsBodyLength = (config.maxBodyLength === undefined ? -1 : config.maxBodyLength) > -1;

    if ((wantsUploadProgress || wantsBodyLength) && data != null) {
      requestContentLength = await resolveBodyLength(headers, data);
    }

    if (wantsUploadProgress && requestContentLength !== 0) {
      const _request = new Request('http://localhost', { method: 'POST', body: data, duplex: 'half' });

      const contentTypeHeader = _request.headers.get('content-type');

      if (isFormData(data) && contentTypeHeader) {
        headers.setContentType(contentTypeHeader);
      }

      if (_request.body) {
        const [onProgress, flush] = progressEventDecorator(
          requestContentLength,
          progressEventReducer(asyncDecorator(config.onUploadProgress)),
        );

        data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
      }
    }

    if (wantsBodyLength && requestContentLength > config.maxBodyLength) {
      throw new AxiosError(
        'Request body larger than maxBodyLength limit: ' + requestContentLength + ' > ' + config.maxBodyLength,
        AxiosError.ERR_BAD_REQUEST,
        config,
      );
    }

    let withCredentials = config.withCredentials;
    if (!isString(withCredentials)) {
      withCredentials = withCredentials ? 'include' : 'omit';
    }

    const fetchOptions = buildFetchOptions(config, data, headers, withCredentials);

    try {
      request = new Request(url, Object.assign(fetchOptions, {
        signal: composedSignal,
        method: config.method ? config.method.toUpperCase() : 'GET',
        headers: headers.normalize().toJSON(),
        body: data,
        duplex: 'half',
        credentials: 'credentials' in Request.prototype ? withCredentials : undefined,
      }));
    } catch (requestError) {
      // Invalid URL / headers / method / body type — a config problem, not a
      // network failure. Give it a code instead of a bare AxiosError.
      throw AxiosError.from(requestError, AxiosError.ERR_BAD_REQUEST, config, null);
    }

    config.request = request;

    const startTime = Date.now();
    config.startTime = startTime;

    let response = await fetch(request);

    const isStreamResponse = supportsResponseStream && (responseType === 'stream' || responseType === 'response');

    const maxContentLength = config.maxContentLength === -1 ? -1 : config.maxContentLength;

    // Wrap the body when we need progress events, a stream response (so the
    // caller can unsubscribe), or byte-limit enforcement.
    if (supportsResponseStream && (config.onDownloadProgress || isStreamResponse || maxContentLength > -1)) {
      const options = {};
      ['status', 'statusText', 'headers'].forEach((prop) => {
        options[prop] = response[prop];
      });

      const responseContentLength = parseInt(response.headers.get('content-length'), 10);
      const total = isNaN(responseContentLength) ? null : responseContentLength;

      const [onProgress, flush] = config.onDownloadProgress && progressEventDecorator(
        total,
        progressEventReducer(asyncDecorator(config.onDownloadProgress), true),
      ) || [];

      const guardedProgress = (onProgress || maxContentLength > -1) && ((loaded) => {
        if (maxContentLength > -1 && loaded > maxContentLength) {
          throw new AxiosError(
            'maxContentLength size of ' + maxContentLength + ' exceeded',
            AxiosError.ERR_BAD_RESPONSE,
            config,
          );
        }
        onProgress && onProgress(loaded);
      });

      response = new Response(
        trackStream(response.body, DEFAULT_CHUNK_SIZE, guardedProgress, () => {
          flush && flush();
          unsubscribe && unsubscribe();
        }),
        options,
      );
    }

    responseType = responseType || 'text';

    const responseData = await resolveResponseHandler(responseType)(response, config);

    !isStreamResponse && unsubscribe && unsubscribe();

    const axiosResponse = {
      data: responseData,
      headers: responseHeadersToAxiosHeaders(response.headers),
      status: response.status,
      statusText: response.statusText,
      config,
      request,
      // Non-standard extras (harmless additions)
      _startTime: startTime,
      _elapsed: Date.now() - startTime,
    };

    return await new Promise((resolve, reject) => {
      settle(resolve, reject, axiosResponse);
    });
  } catch (err) {
    unsubscribe && unsubscribe();

    // Timeout / cancellation surfaced through the composed signal. This must
    // be checked before `err.isAxiosError` because the abort reason *is* an
    // AxiosError (ETIMEDOUT / CanceledError).
    if (composedSignal && composedSignal.reason instanceof AxiosError) {
      const reason = composedSignal.reason;
      if (reason.code === AxiosError.ETIMEDOUT) {
        throw AxiosError.timeout(config, config.request || request, config.timeoutErrorMessage);
      }
      throw reason;
    }

    if (err && err.isAxiosError) throw err;

    if (err instanceof CanceledError || AxiosError.isCancel(err)) throw err;

    if (err && err.name === 'AbortError') {
      throw new CanceledError(null, config, config.request || request);
    }

    if (err && err.name === 'TypeError' && /fetch/i.test(err.message)) {
      const axiosError = new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, config.request);
      axiosError.cause = err.cause || err;
      throw classifyNetworkError(axiosError, err, config);
    }

    throw classifyNetworkError(AxiosError.from(err, err && err.code, config, config.request), err, config);
  }
}

/**
 * Fetch-only options mapped from the Axios config (mode, cache, redirect…).
 */
function buildFetchOptions(config, data, headers, withCredentials) {
  const options = {};

  if (withCredentials === 'include') {
    options.credentials = 'include';
  }

  if (config.maxRedirects === 0) {
    options.redirect = 'manual';
  } else if (config.maxRedirects === -1) {
    options.redirect = 'follow';
  }

  if (config.cache !== undefined) options.cache = config.cache;
  if (config.mode) options.mode = config.mode;
  if (config.referrer) options.referrer = config.referrer;
  if (config.referrerPolicy) options.referrerPolicy = config.referrerPolicy;
  if (config.integrity) options.integrity = config.integrity;
  if (config.keepalive !== undefined) options.keepalive = config.keepalive;

  // GET/HEAD requests MUST NOT have a body (fetch/undici enforce this)
  const method = (config.method || 'get').toUpperCase();

  if (data !== undefined && data !== null && data !== '' && method !== 'GET' && method !== 'HEAD') {
    options.body = data;
  }

  return options;
}

/**
 * Enrich a network error with a more specific code when we can tell what
 * happened (this is an improvement over upstream Axios).
 */
function classifyNetworkError(axiosError, err, config) {
  const cause = err && (err.cause || err);
  const code = cause && cause.code;

  switch (code) {
    case 'ECONNREFUSED':
    case 'ERR_CONNECTION_REFUSED':
      axiosError.code = 'ECONNREFUSED';
      axiosError.message = 'connect ECONNREFUSED';
      break;
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      axiosError.code = 'ENOTFOUND';
      axiosError.message = 'getaddrinfo ENOTFOUND';
      break;
    case 'ENETUNREACH':
      axiosError.code = 'ENETUNREACH';
      axiosError.message = 'network is unreachable';
      break;
    case 'EHOSTUNREACH':
      axiosError.code = 'EHOSTUNREACH';
      axiosError.message = 'connect EHOSTUNREACH';
      break;
    case 'ETIMEDOUT':
    case 'UND_ERR_CONNECT_TIMEOUT':
    case 'UND_ERR_HEADERS_TIMEOUT':
      axiosError.code = 'ECONNABORTED';
      axiosError.message = `timeout of ${config.timeout}ms exceeded`;
      break;
    case 'UND_ERR_SOCKET':
      axiosError.message = 'socket hang up';
      break;
    case 'CERT_HAS_EXPIRED':
    case 'DEPTH_ZERO_SELF_SIGNED_CERT':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
      axiosError.code = 'ERR_BAD_REQUEST';
      break;
    default:
      break;
  }

  return axiosError;
}

module.exports = fetchAdapter;
module.exports.supportsRequestStream = supportsRequestStream;
module.exports.supportsResponseStream = supportsResponseStream;
module.exports.isFetchSupported = isFetchSupported;
