/**
 * Axios — drop-in replacement class.
 *
 * Every public method and property mirrors the official Axios interface so
 * existing code that imports `axios` can swap the module with zero changes.
 *
 *   axios(config)
 *   axios(url[, config])
 *   axios.request
 *   axios.get / .post / .put / .patch / .delete / .head / .options
 *   axios.purge / .link / .unlink
 *   axios.postForm / .putForm / .patchForm
 *   axios.create([defaults])
 *   axios.all / axios.spread
 *   axios.defaults
 *   axios.interceptors.request / .response
 *   axios.getUri
 */
'use strict';

const mergeConfig        = require('./core/mergeConfig');
const defaults           = require('./core/defaults');
const InterceptorManager = require('./core/InterceptorManager');
const AxiosError         = require('./core/AxiosError');
const CanceledError      = require('./core/CanceledError');
const CancelToken        = require('./core/CancelToken');
const AxiosHeaders       = require('./core/AxiosHeaders');
const dispatchRequest    = require('./core/dispatchRequest');
const { buildURL, buildFullPath } = require('./core/buildURL');
const toFormData         = require('./helpers/toFormData');
const formDataToJSON     = require('./helpers/formDataToJSON');
const { isFunction, isPlainObject, merge, forEach } = require('./helpers/utils');

/**
 * The Axios constructor — instances hold `defaults` + `interceptors` and the
 * `request()` method (also exposed as a callable factory by `Axios.create`).
 *
 * @param {Object} [instanceConfig] - Instance-level defaults.
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig || {};
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager(),
  };
}

// ── Core request method ──────────────────────────────────────────

/**
 * Dispatch a request.
 *
 * @param {String|Object} configOrUrl
 * @param {Object} [config]
 * @returns {Promise}
 */
Axios.prototype.request = function request(configOrUrl, config) {
  return this._request(configOrUrl, config);
};

/**
 * @private
 */
Axios.prototype._request = function _request(configOrUrl, config) {
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof configOrUrl === 'string') {
    config = config || {};
    config.url = configOrUrl;
  } else {
    config = configOrUrl || {};
  }

  config = mergeConfig(this.defaults, config);

  const { paramsSerializer } = config;

  if (paramsSerializer != null) {
    if (isFunction(paramsSerializer)) {
      config.paramsSerializer = { serialize: paramsSerializer };
    }
  }

  // Set config.method
  config.method = (config.method || this.defaults.method || 'get').toLowerCase();

  // Flatten headers (common + per-method), matching Axios' AxiosHeaders.concat
  let contextHeaders = config.headers && merge(config.headers.common, config.headers[config.method]);

  config.headers && forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    (method) => {
      delete config.headers[method];
    },
  );

  config.headers = AxiosHeaders.concat(contextHeaders, config.headers);

  // filter out skipped interceptors
  const requestInterceptorChain = [];
  let synchronousRequestInterceptors = true;

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (isFunction(interceptor.runWhen) && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  const responseInterceptorChain = [];

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  let promise;
  let i = 0;
  let len;

  if (!synchronousRequestInterceptors) {
    const chain = [dispatchRequest.bind(this), undefined];
    chain.unshift.apply(chain, requestInterceptorChain);
    chain.push.apply(chain, responseInterceptorChain);
    len = chain.length;

    promise = Promise.resolve(config);

    while (i < len) {
      promise = promise.then(chain[i++], chain[i++]);
    }

    return promise;
  }

  // Synchronous interceptor chain
  len = requestInterceptorChain.length;

  let newConfig = config;

  i = 0;

  while (i < len) {
    const onFulfilled = requestInterceptorChain[i++];
    const onRejected = requestInterceptorChain[i++];
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected && onRejected.call(this, error);
      break;
    }
  }

  try {
    promise = dispatchRequest.call(this, newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  i = 0;
  len = responseInterceptorChain.length;

  while (i < len) {
    promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
  }

  return promise;
};

// ── getUri (returns the built URL without dispatching) ──────────

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  const fullPath = buildFullPath(config.baseURL, config.url);
  return buildURL(fullPath, config.params, config.paramsSerializer);
};

// ── HTTP method aliases ───────────────────────────────────────────

const HTTP_METHODS = ['delete', 'get', 'head', 'options'];
const HTTP_METHODS_WITH_DATA = ['post', 'put', 'patch'];

/**
 * Attach the Axios method aliases to a target (the prototype, or a created
 * instance). All methods dispatch through `this.request`.
 */
function attachMethods(target) {
  HTTP_METHODS.forEach(function forEachMethodNoData(method) {
    target[method] = function (url, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        url,
        data: (config || {}).data,
      }));
    };
  });

  HTTP_METHODS_WITH_DATA.forEach(function forEachMethodWithData(method) {
    function generateHTTPMethod(isForm) {
      return function httpMethod(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          headers: isForm ? { 'Content-Type': 'multipart/form-data' } : {},
          url,
          data,
        }));
      };
    }

    target[method] = generateHTTPMethod(false);
    target[method + 'Form'] = generateHTTPMethod(true);
  });
}

attachMethods(Axios.prototype);

// Keep the shorthand lists exported for the instance factory.
Axios.HTTP_METHODS = HTTP_METHODS;
Axios.HTTP_METHODS_WITH_DATA = HTTP_METHODS_WITH_DATA;
Axios.attachMethods = attachMethods;

// ── create() — factory for new instances ─────────────────────────

Axios.create = function create(instanceConfig) {
  const ctx = new Axios(mergeConfig(defaults, instanceConfig || {}));

  // Wrap request so it's a plain callable (matches Axios.create API)
  const req = ctx.request.bind(ctx);

  // Copy Axios.prototype to the instance (bound to the instance context)
  Object.keys(Axios.prototype).forEach(function forEachMethod(prop) {
    const method = Axios.prototype[prop];
    req[prop] = function () {
      return method.apply(ctx, arguments);
    };
  });

  // Copy context to instance
  req.defaults = ctx.defaults;
  req.interceptors = ctx.interceptors;

  // Factory for creating new instances off of this one
  req.create = function createFrom(instanceConfig) {
    return Axios.create(mergeConfig(ctx.defaults, instanceConfig || {}));
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

// ── form helpers (Axios 1.x) ─────────────────────────────────────

Axios.toFormData = toFormData;

Axios.formToJSON = function formToJSON(formData) {
  return formDataToJSON(formData) || {};
};

// ── Exports ──────────────────────────────────────────────────────

Axios.AxiosHeaders = AxiosHeaders;
Axios.AxiosError = AxiosError;
Axios.CanceledError = CanceledError;
Axios.Cancel = CanceledError;
Axios.CancelToken = CancelToken;
Axios.mergeConfig = mergeConfig;
Axios.defaults = defaults;

// isPlainObject is re-exported for parity with axios' internal utils surface
Axios.isPlainObject = isPlainObject;

module.exports = Axios;
