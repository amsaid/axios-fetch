/**
 * sd-axios-fetch v0.0.3
 * A drop-in replacement for Axios.js built on the Fetch API.
 * (CJS / UMD bundle)  —  2026-03-31
 */
'use strict';

// ── Module registry ────────────────────────────────────────────────
const __modules = {};
const __cache = {};

function __require(id) {
  if (__cache[id]) return __cache[id].exports;
  const mod = { exports: {} };
  __cache[id] = mod;
  __modules[id](mod, mod.exports, __require);
  return mod.exports;
}

// ── src/helpers/utils.js ───────────────────────────────────────────
__modules["src/helpers/utils.js"] = function (module, exports, require) {
/**
 * Utility helpers used throughout the library.
 * Extracted so every module imports from a single source of truth.
 */
/**
 * Iterate over own enumerable string-keyed properties of an object.
 * Works with Array-Like objects too (e.g. Headers).
 */
function forEach(obj, fn) {
  if (obj === null || typeof obj === 'undefined') return;

  if (typeof obj !== 'object') {
    obj = [obj];          // wrap primitives
  }

  if (Array.isArray(obj)) {
    for (let i = 0, len = obj.length; i < len; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    const keys = Object.keys(obj);
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}

function isPlainObject(val) {
  if (typeof val !== 'object' || val === null) return false;
  if (Object.prototype.toString.call(val) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

function isArrayBuffer(val) {
  return val !== null && Object.prototype.toString.call(val) === '[object ArrayBuffer]';
}

function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

function isBlob(val) {
  return (typeof Blob !== 'undefined') && (val instanceof Blob);
}

function isFile(val) {
  return (typeof File !== 'undefined') && (val instanceof File);
}

function isStream(val) {
  return isPlainObject(val) && typeof val.pipe === 'function';
}

function isURLSearchParams(val) {
  return (typeof URLSearchParams !== 'undefined') && (val instanceof URLSearchParams);
}

function isString(val) {
  return typeof val === 'string';
}

function isFunction(val) {
  return typeof val === 'function';
}

function isUndefined(val) {
  return typeof val === 'undefined';
}

function trim(str) {
  return str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
}

function deepMerge(/* ...objects */) {
  const result = {};
  assignValue(result, arguments[0]);
  for (let i = 1; i < arguments.length; i++) {
    assignValue(result, arguments[i]);
  }
  return result;
}

function assignValue(target, source) {
  if (!source) return;
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    if (isPlainObject(srcVal)) {
      target[key] = deepMerge(target[key], srcVal);
    } else {
      target[key] = srcVal;
    }
  }
}

/**
 * Strip anything that isn't a direct own property (used for JSON).
 */
function stripUndefinedKeys(obj) {
  if (!isPlainObject(obj)) return obj;
  const out = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}

module.exports = {
  forEach,
  isPlainObject,
  isArrayBuffer,
  isFormData,
  isBlob,
  isFile,
  isStream,
  isURLSearchParams,
  isString,
  isFunction,
  isUndefined,
  trim,
  deepMerge,
  stripUndefinedKeys,
};

};

// ── src/core/AxiosError.js ───────────────────────────────────────────
__modules["src/core/AxiosError.js"] = function (module, exports, require) {
/**
 * AxiosError - Drop-in compatible error class matching Axios error structure
 */
/**
 * Creates an AxiosError that mirrors the official Axios error interface.
 *
 * @param {string|null} message        - Human-readable error message.
 * @param {string}      code           - Machine-readable error code (e.g. 'ERR_NETWORK').
 * @param {Object}      config         - The request config that caused the error.
 * @param {Object|null} request        - The underlying request object (Request instance or XMLHttpRequest).
 * @param {Object|null} response       - The response received (if any) before the error.
 */
class AxiosError extends Error {
  constructor(message, code, config, request, response) {
    super(message);

    this.name = 'AxiosError';
    this.code = code;
    this.config = config;
    this.request = request;
    this.response = response;

    // Maintain stack trace from the original error if present
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convenience factory: create a network / connection error.
   */
  static fromError(error, config, request, response) {
    const axiosError = new AxiosError(
      error.message,
      'ERR_NETWORK',
      config,
      request,
      response
    );
    axiosError.cause = error;
    return axiosError;
  }

  /**
   * Create a timeout error.
   */
  static timeout(config, request) {
    const message = config?.timeoutErrorMessage || `timeout of ${config?.timeout}ms exceeded`;
    return new AxiosError(message, 'ECONNABORTED', config, request, null);
  }

  /**
   * Create a cancel error.
   */
  static cancel(message, config, request) {
    return new AxiosError(message, 'ERR_CANCELED', config, request, null);
  }

  /**
   * Create an error for a non-2xx response.
   */
  static badStatus(status, statusText, config, request, response) {
    const message = `Request failed with status code ${status}`;
    return new AxiosError(message, 'ERR_BAD_REQUEST', config, request, response);
  }

  /**
   * Create a request configuration error.
   */
  static badConfig(message, config) {
    return new AxiosError(message, 'ERR_BAD_OPTION', config, null, null);
  }

  // ---------- static helpers matching Axios patterns ----------

  /**
   * axios.isCancel()-compatible guard.
   * Uses the `__CANCEL__` flag convention.
   */
  static isCancel(value) {
    return !!(value && value.__CANCEL__);
  }

  /**
   * axios.isAxiosError()-compatible guard.
   */
  static isAxiosError(payload) {
    return payload instanceof AxiosError;
  }

  /**
   * Convert the error to a plain JSON-serialisable object (matches Axios toJSON).
   */
  toJSON() {
    return {
      message: this.message,
      name: this.name,
      code: this.code,
      config: this.config,
      request: this._requestToJSON(this.request),
      response: this._responseToJSON(this.response),
      stack: this.stack,
    };
  }

  _requestToJSON(req) {
    if (!req) return null;
    if (typeof Request !== 'undefined' && req instanceof Request) {
      return { method: req.method, url: req.url };
    }
    return req;
  }

  _responseToJSON(res) {
    if (!res) return null;
    return {
      data: res.data,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers?.toJSON?.() ?? res.headers,
      config: res.config,
      request: this._requestToJSON(res.request),
    };
  }
}

module.exports = AxiosError;

};

// ── src/core/CanceledError.js ───────────────────────────────────────────
__modules["src/core/CanceledError.js"] = function (module, exports, require) {
/**
 * CanceledError - Dedicated class for aborted / cancelled requests.
 *
 * Axios >= 0.22 exposes `axios.CanceledError` (previously just AxiosError).
 * This class extends AxiosError with a `__CANCEL__` flag so that
 * `axios.isCancel(error)` returns true.
 */
const AxiosError = require("src/core/AxiosError.js");

class CanceledError extends AxiosError {
  constructor(message, config, request) {
    super(
      message || 'canceled',
      'ERR_CANCELED',
      config,
      request
    );
    this.name = 'CanceledError';
    this.__CANCEL__ = true;
  }
}

module.exports = CanceledError;

};

// ── src/core/CancelToken.js ───────────────────────────────────────────
__modules["src/core/CancelToken.js"] = function (module, exports, require) {
/**
 * CancelToken - Imperative cancellation token (Axios pre-v0.22 API).
 *
 * Provides `new CancelToken(executor)` where executor receives a
 * `cancel(message)` function and a `reason` getter.
 */
const CanceledError = require("src/core/CanceledError.js");

class CancelToken {
  constructor(executor) {
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    const token = this;

    // eslint-disable-next-line func-names
    this.promise.then(function (cancel) {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });

    if (typeof executor === 'function') {
      executor(function cancel(message, config, request) {
        if (token.reason) return;             // already cancelled
        token.reason = new CanceledError(message, config, request);
        resolvePromise(token.reason);
      });
    }
  }

  /**
   * Subscribe to cancellation.
   * @param {Function} listener - Called with the CanceledError.
   * @throws if already cancelled.
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }

  /**
   * Throw if this token is already cancelled.
   * Instance method (matches Axios API: token.throwIfRequested()).
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * Static: throw if token is already cancelled.
   * @param {CancelToken} token
   */
  static throwIfRequested(token) {
    if (token && token.reason) {
      throw token.reason;
    }
  }

  /**
   * Return a source object with a `token` and an `abort` function,
   * mirroring `CancelToken.source()` from Axios.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return { token, cancel };
  }
}

module.exports = CancelToken;

};

// ── src/core/InterceptorManager.js ───────────────────────────────────────────
__modules["src/core/InterceptorManager.js"] = function (module, exports, require) {
/**
 * InterceptorManager - Manages request & response interceptor stacks.
 *
 * Mirrors the Axios InterceptorManager interface exactly:
 *   - use(resolved, rejected) → id
 *   - eject(id)
 *   - forEach(fn)            → iterate over registered handlers
 *   - clear()
 */
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }

  /**
   * Add a new interceptor to the stack.
   *
   * @param {Function} resolved - Fulfulled handler  (request)fn(config) / (response)fn(response).
   * @param {Function} [rejected] - Rejected handler.
   * @returns {number} Numeric ID that can be passed to eject().
   */
  use(resolved, rejected) {
    if (typeof resolved !== 'function') {
      throw new TypeError('Interceptor resolved must be a function');
    }
    this.handlers.push({ resolved, rejected });
    return this.handlers.length - 1;
  }

  /**
   * Remove an interceptor by its ID.
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;           // Axios uses null to preserve indices
    }
  }

  /**
   * Iterate over all active (non-ejected) handlers.
   * Axios calls this internally; useful for introspection.
   *
   * @param {Function} fn - Called with each handler: fn(handler)
   */
  forEach(fn) {
    this.handlers.forEach((h) => {
      if (h !== null) fn(h);
    });
  }

  /**
   * Remove all interceptors.
   */
  clear() {
    if (this.handlers.length > 0) {
      this.handlers = [];
    }
  }
}

module.exports = InterceptorManager;

};

// ── src/core/buildURL.js ───────────────────────────────────────────
__modules["src/core/buildURL.js"] = function (module, exports, require) {
/**
 * URL & query-string utilities.
 *
 * buildURL, combineURLs, isURLSameOrigin, parseProtocol — all matching
 * Axios helper behaviour so that interceptors & defaults feel native.
 */
const { forEach, isURLSearchParams, trim } = require("src/helpers/utils.js");

/**
 * Build a full URL by appending serialized params to baseURL + url.
 *
 * @param {string}      url
 * @param {Object|null} params
 * @param {Function}    [paramsSerializer] - Custom serializer (must return string).
 * @returns {string}
 */
function buildURL(url, params, paramsSerializer) {
  if (!params) return url;

  let serializedParams;

  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    const parts = [];

    forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') return;

      if (Array.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      forEach(val, function serializeValue(v) {
        if (isDate(v)) {
          v = v.toISOString();
        } else if (isPlainObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    const hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
}

/**
 * Combine a baseURL and a request URL (mirrors Axios combineURLs).
 */
function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}

/**
 * Check if the URL has the same origin as the current page.
 * Falls back to true in Node / environments without location.
 */
function isURLSameOrigin(requestURL) {
  if (typeof location === 'undefined') return true;
  try {
    const parsed = new URL(requestURL);
    return parsed.origin === location.origin;
  } catch (_e) {
    return true;
  }
}

/**
 * Return the protocol portion of a URL string (e.g. 'http:').
 */
function parseProtocol(url) {
  const match = /^([a-z][a-z\d+\-.]*:)?\/\//i.exec(url);
  return match ? (match[1] ? match[1].toLowerCase() : 'http:') : 'http:';
}

// --- internal helpers ---

function encode(str) {
  return encodeURIComponent(str)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']');
}

function isDate(val) {
  return val !== null && Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime());
}

function isPlainObject(val) {
  if (typeof val !== 'object' || val === null) return false;
  if (Object.prototype.toString.call(val) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

module.exports = {
  buildURL,
  combineURLs,
  isURLSameOrigin,
  parseProtocol,
};

};

// ── src/core/transformData.js ───────────────────────────────────────────
__modules["src/core/transformData.js"] = function (module, exports, require) {
/**
 * transformData - Apply transformRequest / transformResponse chains.
 *
 * Mirrors Axios's synchronous data transformation pipeline.
 */
/**
 * Apply each transformer in order.
 *
 * @param {*}        data        - The data to transform.
 * @param {Array}    transformers - Array of (data, headers) ⇒ data functions.
 * @param {Object}   [headers]   - Headers object (may be mutated by transformers).
 * @returns {*} Transformed data.
 */
function transformData(data, transformers, headers) {
  if (!transformers || !transformers.length) return data;

  let result = data;
  for (const fn of transformers) {
    result = fn(result, headers);
  }
  return result;
}

module.exports = transformData;

};

// ── src/core/mergeConfig.js ───────────────────────────────────────────
__modules["src/core/mergeConfig.js"] = function (module, exports, require) {
/**
 * mergeConfig - Deep-merge Axios request configs.
 *
 * Defaults ← config1 ← config2   (later values win).
 * Matches Axios merge behaviour for every known key.
 */
const { forEach, isPlainObject, deepMerge } = require("src/helpers/utils.js");

/**
 * Keys whose values should be deeply merged (plain objects only).
 */
const DEEP_MERGE_KEYS = [
  'headers',
  'params',
  'transformRequest',
  'transformResponse',
];

/**
 * Keys whose values should be concatenated (arrays).
 */
const CONCAT_KEYS = [
  'transformRequest',
  'transformResponse',
];

const DEFAULTS = {
  method: 'get',
  timeout: 0,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  maxContentLength: -1,
  maxBodyLength: -1,
  maxRedirects: 5,
  validateStatus(status) {
    return status >= 200 && status < 300;
  },
  transformRequest: [
    function transformRequest(data, headers) {
      if (isPlainObject(data) || Array.isArray(data)) {
        // Only auto-set content-type if not already set
        const ct = headers && (
          headers['Content-Type'] || headers['content-type']
        );
        if (!ct || ct.indexOf('application/json') === 0) {
          headers['Content-Type'] = 'application/json';
        }
        return JSON.stringify(data);
      }
      return data;
    },
  ],
  transformResponse: [
    function transformResponse(data) {
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_e) { /* not json */ }
      }
      return data;
    },
  ],
  responseType: 'json',
  responseEncoding: 'utf8',
  headers: {
    common: {
      Accept: 'application/json, text/plain, */*',
    },
  },
};

function defaultTo(value, fallback) {
  return value !== undefined ? value : fallback;
}

/**
 * Merge a series of config objects, later ones taking precedence.
 *
 * @param {...Object} configs - Config objects to merge (left to right).
 * @returns {Object} Merged config.
 */
function mergeConfig(...configs) {
  let result = {};

  // Start from defaults
  result = applyTo(result, DEFAULTS);

  for (const cfg of configs) {
    if (!cfg) continue;
    result = applyTo(result, cfg);
  }

  return result;
}

/**
 * Apply a source config onto a target, respecting key-specific merge rules.
 */
function applyTo(target, source) {
  if (!isPlainObject(source)) return target;

  const result = { ...target };

  // ---- headers need special handling (common + per-method flattening) ----
  if (source.headers) {
    result.headers = mergeHeaders(result.headers, source.headers);
  }

  for (const key of Object.keys(source)) {
    if (key === 'headers') continue;           // already handled above

    if (CONCAT_KEYS.includes(key)) {
      // Concatenate arrays
      const base = Array.isArray(result[key]) ? result[key] : [];
      const src  = Array.isArray(source[key]) ? source[key] : (source[key] != null ? [source[key]] : []);
      result[key] = base.concat(src);
    } else if (DEEP_MERGE_KEYS.includes(key)) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      // Direct overwrite
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Axios-style header merging.
 * - `common` keys are baseline
 * - Method-specific keys override
 * - Instance-level keys override everything
 */
function mergeHeaders(target, source) {
  const result = {};

  // Start with common baseline
  const common = (target && target.common) || {};
  Object.assign(result, common);

  // Copy non-common, non-method keys from target (instance defaults)
  if (target) {
    forEach(target, (val, key) => {
      if (key !== 'common' && !isHttpMethod(key)) {
        result[key] = val;
      }
    });
  }

  // Apply source (per-request headers override)
  if (source) {
    if (source.common) {
      Object.assign(result, source.common);
    }
    forEach(source, (val, key) => {
      if (key !== 'common' && !isHttpMethod(key)) {
        result[key] = val;
      }
    });

    // Method-specific from source (get, post, …)
    const method = source.method ? source.method.toLowerCase() : (result.method ? result.method.toLowerCase() : '');
    if (method && source[method]) {
      Object.assign(result, source[method]);
    }
  }

  return result;
}

function isHttpMethod(key) {
  return ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'purge', 'link', 'unlink'].includes(key.toLowerCase());
}

mergeConfig.DEFAULTS = DEFAULTS;

module.exports = mergeConfig;

};

// ── src/core/settle.js ───────────────────────────────────────────
__modules["src/core/settle.js"] = function (module, exports, require) {
/**
 * settle - Resolve or reject a promise based on validateStatus.
 *
 * Matches the Axios settle helper interface exactly.
 */
const AxiosError = require("src/core/AxiosError.js");

/**
 * Resolve or reject based on validateStatus(config)(status).
 *
 * @param {Function} resolve
 * @param {Function} reject
 * @param {Object}   response - The fully-constructed AxiosResponse.
 * @param {Object}   config
 */
function settle(resolve, reject, response, config) {
  const validateStatus = config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(
      AxiosError.badStatus(
        response.status,
        response.statusText,
        config,
        response.request,
        response
      )
    );
  }
}

module.exports = settle;

};

// ── src/adapters/fetch.js ───────────────────────────────────────────
__modules["src/adapters/fetch.js"] = function (module, exports, require) {
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
const { buildURL, combineURLs } = require("src/core/buildURL.js");
const settle         = require("src/core/settle.js");
const transformData  = require("src/core/transformData.js");
const AxiosError     = require("src/core/AxiosError.js");
const CanceledError  = require("src/core/CanceledError.js");
const { isFormData, isBlob, isFile, isURLSearchParams, isString, isArrayBuffer } = require("src/helpers/utils.js");

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
    let timeoutId;
    if (config.timeout && config.timeout > 0) {
      timeoutId = setTimeout(function () {
        controller.abort();
        reject(AxiosError.timeout(config, request));
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

        if (err.name === 'AbortError') {
          // Could be timeout or explicit abort
          // Check if it was from our timeout handler
          if (config.timeout && config.timeout > 0) {
            reject(AxiosError.timeout(config, request));
          } else if (config.cancelToken) {
            reject(AxiosError.cancel(
              config.cancelToken.reason?.message || 'Request aborted',
              config,
              request
            ));
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

};

// ── src/Axios.js ───────────────────────────────────────────
__modules["src/Axios.js"] = function (module, exports, require) {
/**
 * Axios — drop-in replacement class.
 *
 * Every public method and property mirrors the official Axios interface so
 * existing code that imports `axios` can swap the module with zero changes.
 *
 *   axios(config)
 *   axios(url[, config])
 *   axios.get / .post / .put / .patch / .delete / .head / .options / .request
 *   axios.create([defaults])
 *   axios.all / axios.spread
 *   axios.defaults
 *   axios.interceptors.request / .response
 *   axios.CancelToken / axios.CanceledError / axios.AxiosError
 *   axios.isCancel / axios.isAxiosError / axios.toFormData
 */
const mergeConfig      = require("src/core/mergeConfig.js");
const InterceptorManager = require("src/core/InterceptorManager.js");
const AxiosError        = require("src/core/AxiosError.js");
const CanceledError     = require("src/core/CanceledError.js");
const CancelToken       = require("src/core/CancelToken.js");
const { buildURL, combineURLs } = require("src/core/buildURL.js");
const fetchAdapter      = require("src/adapters/fetch.js");

// ── Method helpers ──────────────────────────────────────────────

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Create a dispatch function bound to `this` (instance or default).
 * Separated out so both the constructor and Axios.prototype.request share logic.
 */
function createDispatcher(axiosInstance) {
  return function dispatchRequest(config) {
    // Allow axios(url, config) shorthand
    if (typeof config === 'string') {
      config = arguments[1] || {};
      config.url = arguments[0];
    } else {
      config = config || {};
    }

    // Coerce method to lowercase
    config.method = (config.method || axiosInstance.defaults.method || 'get').toLowerCase();

    // Merge defaults → instance defaults → per-call config
    const fullConfig = mergeConfig(axiosInstance.defaults, { headers: {} }, config);

    // ── Interceptor chain ──────────────────────────────────────
    const requestInterceptors = [];
    const responseInterceptors = [];

    // Collect instance interceptors
    axiosInstance.interceptors.request.forEach(function (h) { requestInterceptors.push(h); });
    axiosInstance.interceptors.response.forEach(function (h) { responseInterceptors.push(h); });

    let chain = [fetchAdapter, undefined];     // [fulfilled, rejected]

    // Prepend request interceptors (run in registration order)
    for (let i = requestInterceptors.length - 1; i >= 0; i--) {
      chain.unshift(requestInterceptors[i].resolved, requestInterceptors[i].rejected);
    }

    // Append response interceptors
    for (let i = 0; i < responseInterceptors.length; i++) {
      chain.push(responseInterceptors[i].resolved, responseInterceptors[i].rejected);
    }

    let promise = Promise.resolve(fullConfig);

    // Execute the chain
    while (chain.length) {
      const onFulfilled = chain.shift();
      const onRejected  = chain.shift();
      promise = promise.then(onFulfilled, onRejected);
    }

    return promise;
  };
}

/**
 * The Axios constructor — also serves as a callable interface.
 *
 * @param {Object} [instanceConfig] - Instance-level defaults.
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig || {};
  this.interceptors = {
    request:  new InterceptorManager(),
    response: new InterceptorManager(),
  };
}

// ── Core request method ──────────────────────────────────────────

Axios.prototype.request = function request(configOrUrl, config) {
  if (typeof configOrUrl === 'string') {
    config = config || {};
    config.url = configOrUrl;
  } else {
    config = configOrUrl || {};
  }

  const dispatcher = createDispatcher(this);
  return dispatcher(config);
};

// Make instances callable: instance(config) or instance(url, config)
Axios.prototype.constructor = Axios;

// ── HTTP method shorthands ───────────────────────────────────────
// Methods with a body (data): post, put, patch
const METHODS_WITH_DATA = ['post', 'put', 'patch'];

HTTP_METHODS.forEach(function forEachMethod(method) {
  if (METHODS_WITH_DATA.includes(method)) {
    // (url, data?, config?)
    Axios.prototype[method] = function (url, data, config) {
      return this.request(mergeConfig({ url, method, data }, config));
    };
  } else {
    // get, delete, head, options — (url, config?)
    Axios.prototype[method] = function (url, config) {
      return this.request(mergeConfig({ url, method }, config));
    };
  }
});

// ── create() — factory for new instances ─────────────────────────

Axios.create = function create(instanceConfig) {
  const ctx = new Axios(instanceConfig);
  // Wrap request so it's a plain function (matches Axios.create API)
  const req = ctx.request.bind(ctx);
  req.defaults  = ctx.defaults;
  req.interceptors = ctx.interceptors;

  // Re-attach method shorthands
  HTTP_METHODS.forEach(function forEachMethod(method) {
    if (METHODS_WITH_DATA.includes(method)) {
      req[method] = function (url, data, config) {
        return req(mergeConfig({ url, method, data }, config));
      };
    } else {
      req[method] = function (url, config) {
        return req(mergeConfig({ url, method }, config));
      };
    }
  });

  // Attach getUri
  req.getUri = function (config) {
    return ctx.getUri(config);
  };

  return req;
};

// ── all / spread ─────────────────────────────────────────────────

Axios.all = function all(promises) {
  return Promise.all(promises);
};

Axios.spread = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

// ── isCancel / isAxiosError ──────────────────────────────────────

Axios.isCancel = AxiosError.isCancel;
Axios.isAxiosError = AxiosError.isAxiosError;

// ── toFormData ───────────────────────────────────────────────────
// Axios 1.x exposes axios.toFormData(). We provide a lightweight shim.

Axios.toFormData = function toFormData(data, formData) {
  if (typeof FormData === 'undefined') {
    throw new Error('FormData is not supported in this environment');
  }
  const fd = formData || new FormData();

  if (!data || typeof data !== 'object') return fd;

  const append = function (key, val) {
    if (val === undefined) return;
    if (Array.isArray(val)) {
      val.forEach(function (v, i) { append(key + '[' + i + ']', v); });
    } else if (val instanceof Blob) {
      fd.append(key, val, val.name || 'blob');
    } else {
      fd.append(key, val);
    }
  };

  for (const key of Object.keys(data)) {
    append(key, data[key]);
  }

  return fd;
};

// ── formToJSON (Axios 1.x) ──────────────────────────────────────

Axios.formToJSON = function formToJSON(formData) {
  const obj = {};
  if (typeof FormData === 'undefined' || !(formData instanceof FormData)) {
    return obj;
  }
  formData.forEach(function (val, key) {
    if (obj[key]) {
      if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
      obj[key].push(val);
    } else {
      obj[key] = val;
    }
  });
  return obj;
};

// ── getUri (returns the built URL without dispatching) ──────────

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(
    config.baseURL ? combineURLs(config.baseURL, config.url) : config.url,
    config.params,
    config.paramsSerializer
  );
};

// ── Exports ──────────────────────────────────────────────────────

module.exports = Axios;

};

// ── src/index.js ───────────────────────────────────────────
__modules["src/index.js"] = function (module, exports, require) {
/**
 * sd-axios-fetch — entry point.
 *
 * `require('sd-axios-fetch')` (or the bundled dist file) returns the
 * default Axios instance plus a few statics — exactly matching the
 * shape you get from `import axios from 'axios'`.
 *
 *   const axios = require('sd-axios-fetch');
 *   // OR
 *   import axios from 'sd-axios-fetch';
 *
 *   axios.get(url).then(res => res.data);
 *   const inst = axios.create({ baseURL: 'https://api.example.com' });
 *   inst.post('/users', { name: 'Z' });
 */
const Axios = require("src/Axios.js");
const AxiosError = require("src/core/AxiosError.js");
const CanceledError = require("src/core/CanceledError.js");
const CancelToken = require("src/core/CancelToken.js");
const mergeConfig = require("src/core/mergeConfig.js");

// Create the default instance
const axios = Axios.create(mergeConfig.DEFAULTS);

// ── Statics & named exports ─────────────────────────────────────
// Attach everything that the official axios package exposes so that
// `import axios from 'sd-axios-fetch'` is a true drop-in.

axios.Axios = Axios;
axios.AxiosError = AxiosError;
axios.CanceledError = CanceledError;
axios.CancelToken = CancelToken;
axios.default = axios;          // ESM default export compat
axios.mergeConfig = mergeConfig;
axios.create = Axios.create;  // factory for new instances
axios.isCancel = AxiosError.isCancel;
axios.isAxiosError = AxiosError.isAxiosError;
axios.all = Axios.all;
axios.spread = Axios.spread;
axios.toFormData = Axios.toFormData;
axios.formToJSON = Axios.formToJSON;

module.exports = axios;

};

// ── Bootstrap ────────────────────────────────────────────
const __axios = __require("src/index.js");

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.axios = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return __axios;
});
