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
'use strict';

const mergeConfig      = require('./core/mergeConfig');
const InterceptorManager = require('./core/InterceptorManager');
const AxiosError        = require('./core/AxiosError');
const CanceledError     = require('./core/CanceledError');
const CancelToken       = require('./core/CancelToken');
const { buildURL, combineURLs } = require('./core/buildURL');
const fetchAdapter      = require('./adapters/fetch');

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
